import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatedPlusIcon } from './components/animate-ui/icons/plus';
import { Files, FolderItem, FolderTrigger, FolderContent, SubFiles, FileItem } from './components/animate-ui/components/radix/files';
import { apiFetch, apiFetchRaw } from './lib';
import { BackendStatus } from './components/BackendStatus';
import { useStudyMaterials } from './hooks/use-study-materials';
import VideoPlayer, { type VideoPlayerRef } from './components/VideoPlayer';
import SearchInterface from './components/SearchInterface';
import { DeepLinkManager, useDeepLink } from './lib/deep-link';

function SectionCard(props: { children: React.ReactNode; className?: string; ariaLabel?: string }): JSX.Element {
	return (
		<section
			aria-label={props.ariaLabel}
			className={`rounded-2xl border card p-6 ${props.className ?? ''}`.trim()}
		>
			{props.children}
		</section>
	);
}

export default function Upload(): JSX.Element {
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<string>('');
    const [lastVideoId, setLastVideoId] = useState<string>('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [videoReady, setVideoReady] = useState(false);
    const [videoUrl, setVideoUrl] = useState<string>('');
    const [videoError, setVideoError] = useState<string>('');
    const [currentVideoTime, setCurrentVideoTime] = useState<number>(0);
    
    const { fetchStudyMaterials } = useStudyMaterials();
    const videoPlayerRef = React.useRef<VideoPlayerRef>(null);
    const { state: deepLinkState, updateUrl } = useDeepLink();
    
    // Parse timestamp from URL hash using DeepLinkManager
    const parseTimestampFromHash = (): number => {
        return deepLinkState.timestamp || 0;
    };
    
    // Update URL with current timestamp using DeepLinkManager
    const updateUrlWithTimestamp = (time: number) => {
        updateUrl({
            videoId: lastVideoId,
            timestamp: time,
            page: 'upload'
        });
    };
    
    // Function to get video duration from file
    const getVideoDuration = (file: File): Promise<number> => {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                resolve(video.duration);
            };
            
            video.onerror = () => {
                window.URL.revokeObjectURL(video.src);
                reject(new Error('Failed to load video metadata'));
            };
            
            video.src = window.URL.createObjectURL(file);
        });
    };
    
    // Load video ID from URL hash if present
    React.useEffect(() => {
        const hashVideoId = new URLSearchParams(window.location.hash.split('?')[1] || '').get('videoId');
        if (hashVideoId && !lastVideoId) {
            setLastVideoId(hashVideoId);
            checkVideoStatus(hashVideoId);
        }
    }, []);
    
    // Handle deep linking - listen for hash changes
    React.useEffect(() => {
        const handleHashChange = () => {
            const timestamp = parseTimestampFromHash();
            if (timestamp > 0 && videoPlayerRef.current) {
                console.log(`🔗 [DEEP-LINK] Seeking to timestamp: ${timestamp}s`);
                videoPlayerRef.current.seekTo(timestamp);
            }
        };
        
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [videoReady]);

    async function checkVideoStatus(videoId: string) {
        try {
            const video = await apiFetch(`/videos/${videoId}/status`);
            setStatus(`Video status: ${video.status}`);
            
            if (video.status === 'ready') {
                setVideoReady(true);
                setIsProcessing(false);
                setStatus('✅ Video processed and ready! Video player will load automatically.');
                
                // Clear any previous errors
                setVideoError('');
            } else if (video.status === 'indexing') {
                setIsProcessing(true);
                setStatus('🔄 Processing video... This may take a few minutes.');
                // Poll again in 5 seconds
                setTimeout(() => checkVideoStatus(videoId), 5000);
            } else if (video.status === 'failed') {
                setStatus('❌ Video processing failed. Please try uploading again.');
                setIsProcessing(false);
            } else {
                setStatus(`Video status: ${video.status}`);
            }
        } catch (err: any) {
            console.error('Error checking video status:', err);
            setStatus(`Error checking status: ${err?.message || String(err)}`);
        }
    }

    async function handleFileSelected(file: File) {
        console.log('📁 [UPLOAD-FRONTEND] File selected:', {
            name: file.name,
            size: file.size,
            type: file.type
        });
        
        try {
            setIsUploading(true);
            setVideoReady(false);
            
            // Capture video duration before uploading
            setStatus('Reading video duration...');
            console.log('⏱️ [UPLOAD-FRONTEND] Capturing video duration...');
            
            const duration = await getVideoDuration(file);
            console.log(`✅ [UPLOAD-FRONTEND] Video duration captured: ${duration} seconds`);
            
            setStatus('Requesting signed upload URL...');
            
            console.log('📡 [UPLOAD-FRONTEND] Requesting signed upload URL from API...');
            
            // 1) Ask API for signed upload URL + pre-create video metadata
            const { videoId, url, objectName } = await apiFetch('/videos/upload-url', {
                method: 'POST',
                body: JSON.stringify({ 
                    fileName: file.name, 
                    contentType: file.type || 'video/mp4',
                    durationSec: duration
                })
            });
            
            console.log('✅ [UPLOAD-FRONTEND] Received upload URL and video ID:', videoId);
            setLastVideoId(videoId);
            
            // Update URL with video ID for navigation
            window.history.replaceState(null, '', `#upload?videoId=${videoId}`);

            // 2) PUT the file to GCS signed URL
            setStatus('Uploading to cloud storage...');
            console.log('☁️ [UPLOAD-FRONTEND] Starting file upload to GCS...');
            
            const uploadStartTime = Date.now();
            const uploadResponse = await fetch(url, { 
                method: 'PUT', 
                body: file, 
                headers: { 'Content-Type': file.type || 'video/mp4' } 
            });
            
            if (!uploadResponse.ok) {
                throw new Error(`GCS upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
            }
            
            const uploadDuration = Date.now() - uploadStartTime;
            console.log(`✅ [UPLOAD-FRONTEND] File uploaded to GCS successfully in ${uploadDuration}ms`);
            setStatus('✅ File uploaded to cloud storage successfully!');

            // 3) Notify API to trigger TwelveLabs indexing
            setStatus('Starting video processing...');
            await apiFetch('/videos', {
                method: 'POST',
                body: JSON.stringify({ id: videoId, title: file.name })
            });

            setStatus('Upload complete. Starting processing...');
            setIsUploading(false);
            setIsProcessing(true);
            
            // Start polling video status
            setTimeout(() => checkVideoStatus(videoId), 2000);
        } catch (err: any) {
            setStatus(`Error: ${err?.message || String(err)}`);
            setIsUploading(false);
            setIsProcessing(false);
        }
    }


	return (
		<div className="min-h-dvh" style={{backgroundColor: 'var(--bg-primary)'}}>
			<header className="sticky top-0 z-40 border-b navbar" style={{borderColor: 'var(--border-color)'}}>
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
					<a href="#" className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>EduTube Notes</a>
					<div className="flex items-center gap-4">
						<a href="#" className="nav-link underline-offset-4 hover:underline">Back to home</a>
					</div>
				</div>
			</header>
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10" aria-labelledby="upload-heading">
				<h1 id="upload-heading" className="sr-only">Upload lecture</h1>
                <BackendStatus />
                <div className="grid gap-8 items-start lg:grid-cols-[320px_1fr]">
                    {/* Sidebar */}
                    <aside aria-label="Workspace navigation" className="lg:sticky lg:top-20 self-start">
                        <div className="rounded-2xl border p-4" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-primary)'}}>
                            <Files defaultOpen={["root"]}>
                                <FolderItem value="root">
                                    <FolderTrigger>
                                        {lastVideoId ? 'Video Ready' : 'Uploaded Video'}
                                    </FolderTrigger>
                                    <FolderContent>
                                        <SubFiles>
                                            <FileItem 
                                                onClick={() => { 
                                                    if (lastVideoId) {
                                                        window.location.hash = `#summary?videoId=${lastVideoId}`;
                                                    }
                                                }}
                                                style={{ 
                                                    opacity: videoReady ? 1 : 0.5,
                                                    cursor: videoReady ? 'pointer' : 'not-allowed'
                                                }}
                                            >
                                                Summary {videoReady ? '✅' : '⏳'}
                                            </FileItem>
                                            <FileItem 
                                                onClick={() => { 
                                                    if (lastVideoId) {
                                                        console.log('📚 [UPLOAD-FRONTEND] Navigating to flashcards for video:', lastVideoId);
                                                        window.location.hash = `#flashcards?videoId=${lastVideoId}`;
                                                    }
                                                }}
                                                style={{ 
                                                    opacity: videoReady ? 1 : 0.5,
                                                    cursor: videoReady ? 'pointer' : 'not-allowed'
                                                }}
                                            >
                                                Flashcards {videoReady ? '✅' : '⏳'}
                                            </FileItem>
                                            <FileItem 
                                                onClick={() => { 
                                                    if (lastVideoId) {
                                                        console.log('🎯 [UPLOAD-FRONTEND] Navigating to quiz for video:', lastVideoId);
                                                        window.location.hash = `#quiz?videoId=${lastVideoId}`;
                                                    }
                                                }}
                                                style={{ 
                                                    opacity: videoReady ? 1 : 0.5,
                                                    cursor: videoReady ? 'pointer' : 'not-allowed'
                                                }}
                                            >
                                                Quiz {videoReady ? '✅' : '⏳'}
                                            </FileItem>

                                        </SubFiles>
                                    </FolderContent>
                                </FolderItem>
                            </Files>
                        </div>
                    </aside>

                    {/* Main upload area */}
                    <SectionCard ariaLabel="Lecture upload" className="">
						<p className="text-lg font-medium" style={{color: 'var(--text-primary)'}}>Lecture Upload</p>
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                            className="mt-4 rounded-2xl border-2 border-dashed p-12 sm:p-12 min-h-[360px] max-w-md w-full mx-auto flex flex-col items-center justify-center text-center transition-colors"
                            style={{borderColor: 'var(--border-primary)'}}
                        >
                            <div className="h-16 w-16 rounded-xl border flex items-center justify-center" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-primary)', color: 'var(--text-primary)'}} aria-hidden>
                                <motion.div whileHover={{ scale: 1.08 }}>
                                    <AnimatedPlusIcon size={32} />
                                </motion.div>
                            </div>
							<p className="mt-6 font-medium" style={{color: 'var(--text-primary)'}}>Drag & drop your lecture video</p>
							<p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>MP4, WebM up to 1GB</p>
							<div className="mt-6">
								<label className="inline-flex items-center px-5 py-3 rounded-xl font-medium transition cursor-pointer focus-visible:outline focus-visible:outline-offset-2" style={{backgroundColor: 'var(--accent-primary)', color: 'var(--text-inverse)', outlineColor: 'var(--accent-primary)'}}>
                                    <input
                                        type="file"
                                        className="sr-only"
                                        aria-label="Browse files"
                                        accept="video/*"
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleFileSelected(f);
                                        }}
                                        disabled={isUploading}
                                    />
									<span>Browse Files</span>
								</label>
							</div>
                        </motion.div>
                        <p className="mt-6 text-sm" style={{color: 'var(--text-secondary)'}}>After upload, ask AI questions, get summaries, quizzes and flash cards — all without leaving this screen.</p>
                        {status && (
                            <div className="mt-4 p-3 rounded-lg card">
                                <p className="text-sm" role="status" style={{color: 'var(--text-primary)'}}>
                                    {status}
                                </p>
                                {lastVideoId && (
                                    <p className="text-xs mt-1" style={{color: 'var(--text-muted)'}}>
                                        Video ID: {lastVideoId}
                                    </p>
                                )}
                                {(isUploading || isProcessing) && (
                                    <div className="mt-2 w-full rounded-full h-1" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                                        <div className="h-1 rounded-full animate-pulse" style={{width: '60%', backgroundColor: 'var(--accent-primary)'}}></div>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {/* Video Player Section */}
                        {videoReady && lastVideoId && (
                            <div className="mt-8">
                                <div className="video-player-container">
                                    <VideoPlayer
                                        ref={videoPlayerRef}
                                        videoId={lastVideoId}
                                        startTime={parseTimestampFromHash()}
                                        onTimeUpdate={(time) => {
                                            setCurrentVideoTime(time);
                                        }}
                                        onSeek={(time) => {
                                            updateUrlWithTimestamp(time);
                                            setCurrentVideoTime(time);
                                        }}
                                        onReady={(player) => {
                                            console.log('🎬 [UPLOAD] Video player ready');
                                        }}
                                        className="rounded-lg border"
                                        controls={true}
                                        fluid={true}
                                        responsive={true}
                                        aspectRatio="16:9"
                                        playbackRates={[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2]}
                                        muted={false}
                                        autoplay={false}
                                    />
                                    
                                    {/* Video Progress Info */}
                                    <div className="mt-2 text-sm flex justify-between items-center" style={{color: 'var(--text-secondary)'}}>
                                        <span>
                                            Current: {Math.floor(currentVideoTime / 60)}:{(Math.floor(currentVideoTime % 60)).toString().padStart(2, '0')}
                                        </span>
                                        <span>
                                            Video ID: {lastVideoId}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}
                        
                        {/* Search Interface Section */}
                        {videoReady && lastVideoId && (
                            <div className="mt-8">
                                <SectionCard ariaLabel="Video Search">
                                    <h3 className="text-lg font-medium mb-4" style={{color: 'var(--text-primary)'}}>
                                        🔍 Search Video Content
                                    </h3>
                                    <SearchInterface
                                        videoId={lastVideoId}
                                        videoPlayerRef={videoPlayerRef}
                                        placeholder="Search for specific topics, keywords, or concepts..."
                                        showSummary={true}
                                        maxResults={15}
                                        onResultClick={(result) => {
                                            console.log(`📍 [UPLOAD] Jumped to: ${result.timestamp} - "${result.text.slice(0, 50)}..."`);
                                        }}
                                        className="search-interface-container"
                                    />
                                </SectionCard>
                            </div>
                        )}

					</SectionCard>
				</div>
			</main>
		</div>
	);
}


