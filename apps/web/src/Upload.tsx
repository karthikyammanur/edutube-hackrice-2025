import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AnimatedPlusIcon } from './components/animate-ui/icons/plus';
import { Files, FolderItem, FolderTrigger, FolderContent, SubFiles, FileItem } from './components/animate-ui/components/radix/files';
import { apiFetch, apiFetchRaw } from './lib';
import { BackendStatus } from './components/BackendStatus';

function SectionCard(props: { children: React.ReactNode; className?: string; ariaLabel?: string }): JSX.Element {
	return (
		<section
			aria-label={props.ariaLabel}
			className={`rounded-2xl border border-border bg-white p-6 ${props.className ?? ''}`.trim()}
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
    
    // Load video ID from URL hash if present
    React.useEffect(() => {
        const hashVideoId = new URLSearchParams(window.location.hash.split('?')[1] || '').get('videoId');
        if (hashVideoId && !lastVideoId) {
            setLastVideoId(hashVideoId);
            checkVideoStatus(hashVideoId);
        }
    }, []);

    async function checkVideoStatus(videoId: string) {
        try {
            const video = await apiFetch(`/videos/${videoId}/status`);
            setStatus(`Video status: ${video.status}`);
            
            if (video.status === 'ready') {
                setVideoReady(true);
                setIsProcessing(false);
                setStatus('✅ Video processed and ready! You can now generate study materials.');
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
            setStatus('Requesting signed upload URL...');
            
            console.log('📡 [UPLOAD-FRONTEND] Requesting signed upload URL from API...');
            
            // 1) Ask API for signed upload URL + pre-create video metadata
            const { videoId, url, objectName } = await apiFetch('/videos/upload-url', {
                method: 'POST',
                body: JSON.stringify({ fileName: file.name, contentType: file.type || 'video/mp4' })
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

    async function generateStudyMaterials() {
        if (!lastVideoId) {
            console.log('❌ [UPLOAD-FRONTEND] No video ID available for study materials generation');
            return;
        }
        
        console.log('🚀 [UPLOAD-FRONTEND] Starting study materials generation for video:', lastVideoId);
        
        try {
            setStatus('🔄 Generating study materials...');
            console.log('📡 [UPLOAD-FRONTEND] Sending request to /study/generate');
            
            const startTime = Date.now();
            const result = await apiFetch('/study/generate', {
                method: 'POST',
                body: JSON.stringify({ 
                    videoId: lastVideoId,
                    limits: { hits: 12, cards: 8, questions: 8 },
                    length: 'medium'
                })
            });
            
            const duration = Date.now() - startTime;
            console.log(`✅ [UPLOAD-FRONTEND] Study materials generated successfully in ${duration}ms`);
            console.log('📊 [UPLOAD-FRONTEND] Generated materials:', result);
            
            setStatus('✅ Study materials generated! Navigate to flashcards, quiz, or summary.');
        } catch (err: any) {
            console.error('❌ [UPLOAD-FRONTEND] Error generating study materials:', err);
            setStatus(`Error generating study materials: ${err?.message || String(err)}`);
        }
    }
	return (
		<div className="min-h-dvh bg-background">
			<header className="sticky top-0 z-40 border-b border-border/80 bg-background">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
					<a href="#" className="text-lg font-semibold text-text">EduTube Notes</a>
					<div className="flex items-center gap-4">
						<a href="#" className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline">Back to home</a>
					</div>
				</div>
			</header>
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10" aria-labelledby="upload-heading">
				<h1 id="upload-heading" className="sr-only">Upload lecture</h1>
                <BackendStatus />
                <div className="grid gap-8 items-start lg:grid-cols-[320px_1fr]">
                    {/* Sidebar */}
                    <aside aria-label="Workspace navigation" className="lg:sticky lg:top-20 self-start">
                        <div className="rounded-2xl border border-border bg-white p-4">
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
                                            {videoReady && (
                                                <FileItem 
                                                    onClick={generateStudyMaterials}
                                                    style={{ 
                                                        backgroundColor: '#f0f9ff',
                                                        fontWeight: 'medium'
                                                    }}
                                                >
                                                    🔄 Generate Materials
                                                </FileItem>
                                            )}
                                        </SubFiles>
                                    </FolderContent>
                                </FolderItem>
                            </Files>
                        </div>
                    </aside>

                    {/* Main upload area */}
                    <SectionCard ariaLabel="Lecture upload" className="">
						<p className="text-lg font-medium text-text">Lecture Upload</p>
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                            className="mt-4 rounded-2xl border-2 border-dashed border-border p-12 sm:p-12 min-h-[360px] max-w-md w-full mx-auto flex flex-col items-center justify-center text-center transition-colors"
                        >
                            <div className="h-16 w-16 rounded-xl bg-surface border border-border flex items-center justify-center text-text" aria-hidden>
                                <motion.div whileHover={{ scale: 1.08 }}>
                                    <AnimatedPlusIcon size={32} />
                                </motion.div>
                            </div>
							<p className="mt-6 font-medium text-text">Drag & drop your lecture video</p>
							<p className="text-subtext text-sm mt-1">MP4, WebM up to 1GB</p>
							<div className="mt-6">
								<label className="inline-flex items-center px-5 py-3 rounded-xl bg-text text-background font-medium hover:bg-primaryHover transition cursor-pointer focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-text">
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
                        <p className="mt-6 text-subtext text-sm">After upload, ask AI questions, get summaries, quizzes and flash cards — all without leaving this screen.</p>
                        {status && (
                            <div className="mt-4 p-3 rounded-lg bg-slate-50 border border-slate-200">
                                <p className="text-sm text-slate-700" role="status">
                                    {status}
                                </p>
                                {lastVideoId && (
                                    <p className="text-xs text-slate-500 mt-1">
                                        Video ID: {lastVideoId}
                                    </p>
                                )}
                                {(isUploading || isProcessing) && (
                                    <div className="mt-2 w-full bg-slate-200 rounded-full h-1">
                                        <div className="bg-blue-500 h-1 rounded-full animate-pulse" style={{width: '60%'}}></div>
                                    </div>
                                )}
                            </div>
                        )}
					</SectionCard>
				</div>
			</main>
		</div>
	);
}


