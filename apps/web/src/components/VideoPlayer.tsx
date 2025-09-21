import React, { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';
import 'video.js/dist/video-js.css';

export interface VideoPlayerProps {
  videoId: string;
  onReady?: (player: Player) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onSeek?: (time: number) => void;
  className?: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  fluid?: boolean;
  responsive?: boolean;
  aspectRatio?: string;
  playbackRates?: number[];
  // Deep link support
  startTime?: number; // Start at specific timestamp
}

export interface VideoPlayerRef {
  seekTo: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  play: () => void;
  pause: () => void;
  getPlayer: () => Player | null;
}

export const VideoPlayer = React.forwardRef<VideoPlayerRef, VideoPlayerProps>((props, ref) => {
  const {
    videoId,
    onReady,
    onTimeUpdate,
    onSeek,
    className = '',
    autoplay = false,
    muted = false,
    controls = true,
    fluid = true,
    responsive = true,
    aspectRatio = '16:9',
    playbackRates = [0.5, 1, 1.25, 1.5, 2],
    startTime
  } = props;

  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<Player | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [streamUrl, setStreamUrl] = useState<string>('');

  // Expose player methods through ref
  React.useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (playerRef.current) {
        playerRef.current.currentTime(time);
        onSeek?.(time);
      }
    },
    getCurrentTime: () => {
      return playerRef.current?.currentTime() ?? 0;
    },
    getDuration: () => {
      return playerRef.current?.duration() ?? 0;
    },
    play: () => {
      playerRef.current?.play();
    },
    pause: () => {
      playerRef.current?.pause();
    },
    getPlayer: () => playerRef.current
  }));

  // Fetch streaming URL
  useEffect(() => {
    if (!videoId) return;

    const fetchStreamUrl = async () => {
      try {
        setIsLoading(true);
        setError('');
        
        console.log(`🎥 [VIDEO-PLAYER] Fetching stream URL for video: ${videoId}`);
        
        const response = await fetch(`/videos/${videoId}/stream`);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const data = await response.json();
        console.log(`✅ [VIDEO-PLAYER] Stream URL fetched successfully`);
        
        setStreamUrl(data.streamUrl);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load video';
        console.error('❌ [VIDEO-PLAYER] Failed to fetch stream URL:', err);
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStreamUrl();
  }, [videoId]);

  // Initialize Video.js player (only when streamUrl changes)
  useEffect(() => {
    if (!videoRef.current || !streamUrl || playerRef.current) return;

    console.log('🎬 [VIDEO-PLAYER] Initializing Video.js player...');

    const videoElement = document.createElement('video-js');
    videoElement.classList.add('vjs-big-play-centered');
    videoRef.current.appendChild(videoElement);

    const player = videojs(videoElement, {
      autoplay,
      controls,
      responsive,
      fluid,
      aspectRatio,
      muted,
      playbackRates,
      sources: [{
        src: streamUrl,
        type: 'video/mp4'
      }],
      // Video.js options for better seeking
      preload: 'metadata',
      // Enable seeking to any position
      seekButtons: {
        forward: 10,
        back: 10
      },
      // Better quality settings
      html5: {
        vhs: {
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
          overrideNative: true
        }
      }
    });

    playerRef.current = player;

    // Set up event handlers
    player.ready(() => {
      console.log('✅ [VIDEO-PLAYER] Player ready');
      onReady?.(player);
    });

    player.on('timeupdate', () => {
      const currentTime = player.currentTime() || 0;
      onTimeUpdate?.(currentTime);
    });

    player.on('seeked', () => {
      const currentTime = player.currentTime() || 0;
      console.log(`⏩ [VIDEO-PLAYER] Seeked to: ${currentTime}s`);
      onSeek?.(currentTime);
    });

    player.on('error', () => {
      const error = player.error();
      console.error('❌ [VIDEO-PLAYER] Player error:', error);
      setError(error?.message || 'Video playback error');
    });

    player.on('loadstart', () => {
      console.log('📡 [VIDEO-PLAYER] Loading started');
    });

    player.on('canplay', () => {
      console.log('▶️ [VIDEO-PLAYER] Video can start playing');
    });

    player.on('loadedmetadata', () => {
      const duration = player.duration();
      console.log(`📊 [VIDEO-PLAYER] Metadata loaded, duration: ${duration}s`);
    });

    // Cleanup
    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        console.log('🧹 [VIDEO-PLAYER] Disposing player');
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [streamUrl]); // Removed all other dependencies that were causing reinitializations

  // Handle startTime separately to avoid reinitializing the player
  useEffect(() => {
    if (playerRef.current && startTime && startTime > 0) {
      const player = playerRef.current;
      
      const handleReady = () => {
        console.log(`⏰ [VIDEO-PLAYER] Seeking to start time: ${startTime}s`);
        player.currentTime(startTime);
      };

      if (player.readyState() >= 1) {
        // Player is already ready
        handleReady();
      } else {
        // Wait for player to be ready
        player.ready(handleReady);
      }
    }
  }, [startTime]); // Only re-run when startTime changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current && !playerRef.current.isDisposed()) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, []);

  if (isLoading) {
    return (
      <div className={`video-player-loading ${className}`}>
        <div className="flex items-center justify-center h-64 rounded-lg border" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-transparent border-t-current rounded-full mx-auto mb-4" style={{color: 'var(--accent-primary)'}}></div>
            <p style={{color: 'var(--text-primary)'}}>Loading video player...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`video-player-error ${className}`}>
        <div className="flex items-center justify-center h-64 rounded-lg border" style={{borderColor: 'var(--accent-danger)', backgroundColor: 'var(--bg-secondary)'}}>
          <div className="text-center p-6">
            <div className="mb-4">
              <svg className="h-12 w-12 mx-auto" style={{color: 'var(--accent-danger)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2" style={{color: 'var(--accent-danger)'}}>Video Player Error</h3>
            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 rounded-lg border text-sm hover:opacity-80 transition-opacity"
              style={{borderColor: 'var(--border-primary)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)'}}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`video-player-container ${className}`}>
      <div
        ref={videoRef}
        className="video-js-container"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '0.5rem',
          overflow: 'hidden'
        }}
      />
      
      {/* Custom controls overlay for additional functionality */}
      <div className="video-player-overlay absolute top-2 right-2 flex gap-2 opacity-0 hover:opacity-100 transition-opacity">
        {/* Additional controls can be added here */}
      </div>
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;