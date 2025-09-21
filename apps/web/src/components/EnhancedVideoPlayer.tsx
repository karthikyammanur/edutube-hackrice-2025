/**
 * Enhanced VideoPlayer using VideoPlayerManager to fix pause/unpause bugs
 * Implementation follows prompts.txt specifications
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import type Player from 'video.js/dist/types/player';
import VideoPlayerManager from './VideoPlayerManager';
import 'video.js/dist/video-js.css';

export interface EnhancedVideoPlayerProps {
  videoId: string;
  onReady?: (player: Player) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onSeek?: (time: number) => void;
  className?: string;
  startTime?: number; // Deep link support
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  fluid?: boolean;
  responsive?: boolean;
  aspectRatio?: string;
  playbackRates?: number[];
}

export interface EnhancedVideoPlayerRef {
  seekTo: (time: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  play: () => void;
  pause: () => void;
  getPlayer: () => Player | null;
  getManager: () => VideoPlayerManager | null;
}

export const EnhancedVideoPlayer = React.forwardRef<EnhancedVideoPlayerRef, EnhancedVideoPlayerProps>((props, ref) => {
  const {
    videoId,
    onReady,
    onTimeUpdate,
    onSeek,
    className = '',
    startTime,
    ...otherProps
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const managerRef = useRef<VideoPlayerManager | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [containerId] = useState(() => `video-player-${Math.random().toString(36).substr(2, 9)}`);

  // Expose manager methods through ref
  React.useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      managerRef.current?.seekToTime(time);
    },
    getCurrentTime: () => {
      return managerRef.current?.getCurrentTime() ?? 0;
    },
    getDuration: () => {
      return managerRef.current?.getDuration() ?? 0;
    },
    play: () => {
      managerRef.current?.play();
    },
    pause: () => {
      managerRef.current?.pause();
    },
    getPlayer: () => {
      return managerRef.current?.getPlayer() ?? null;
    },
    getManager: () => {
      return managerRef.current;
    }
  }));

  // Initialize VideoPlayerManager
  const initializeManager = useCallback(async () => {
    if (!videoId || !containerRef.current) return;

    try {
      setIsLoading(true);
      setError('');
      
      console.log(`🎬 [ENHANCED-PLAYER] Initializing for video: ${videoId}`);
      
      // Dispose existing manager
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }

      // Set container ID
      containerRef.current.id = containerId;

      // Create new manager
      managerRef.current = new VideoPlayerManager({
        videoId,
        containerId,
        startTime,
        onReady: (player) => {
          console.log('✅ [ENHANCED-PLAYER] Manager ready');
          setIsLoading(false);
          onReady?.(player);
        },
        onTimeUpdate: (currentTime) => {
          onTimeUpdate?.(currentTime);
        },
        onSeek: (time) => {
          onSeek?.(time);
        }
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize video player';
      console.error('❌ [ENHANCED-PLAYER] Manager initialization failed:', err);
      setError(errorMessage);
      setIsLoading(false);
    }
  }, [videoId, containerId, startTime, onReady, onTimeUpdate, onSeek]);

  // Initialize on mount and videoId change
  useEffect(() => {
    initializeManager();

    // Cleanup on unmount
    return () => {
      if (managerRef.current) {
        managerRef.current.dispose();
        managerRef.current = null;
      }
    };
  }, [initializeManager]);

  // Handle startTime changes
  useEffect(() => {
    if (managerRef.current && typeof startTime === 'number' && startTime > 0) {
      console.log(`⏰ [ENHANCED-PLAYER] Seeking to updated start time: ${startTime}s`);
      managerRef.current.seekToTime(startTime);
    }
  }, [startTime]);

  if (isLoading) {
    return (
      <div className={`enhanced-video-player-loading ${className}`}>
        <div className="flex items-center justify-center h-64 rounded-lg border" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-transparent border-t-current rounded-full mx-auto mb-4" style={{color: 'var(--accent-primary)'}}></div>
            <p style={{color: 'var(--text-primary)'}}>Initializing video player...</p>
            <p className="text-xs mt-2" style={{color: 'var(--text-muted)'}}>Using enhanced player manager</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`enhanced-video-player-error ${className}`}>
        <div className="flex items-center justify-center h-64 rounded-lg border" style={{borderColor: 'var(--accent-danger)', backgroundColor: 'var(--bg-secondary)'}}>
          <div className="text-center p-6">
            <div className="mb-4">
              <svg className="h-12 w-12 mx-auto" style={{color: 'var(--accent-danger)'}} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium mb-2" style={{color: 'var(--accent-danger)'}}>Enhanced Video Player Error</h3>
            <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>{error}</p>
            <button
              onClick={initializeManager}
              className="mr-2 px-4 py-2 rounded-lg border text-sm hover:opacity-80 transition-opacity"
              style={{borderColor: 'var(--border-primary)', color: 'var(--text-primary)', backgroundColor: 'var(--bg-primary)'}}
            >
              Retry
            </button>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 rounded-lg border text-sm hover:opacity-80 transition-opacity"
              style={{borderColor: 'var(--accent-danger)', color: 'var(--accent-danger)', backgroundColor: 'var(--bg-primary)'}}
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`enhanced-video-player-container ${className}`}>
      <div
        ref={containerRef}
        className="video-manager-container"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '0.5rem',
          overflow: 'hidden',
          position: 'relative'
        }}
      />
      
      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-2 text-xs" style={{color: 'var(--text-muted)'}}>
          Enhanced Player • Manager ID: {containerId} • Video ID: {videoId}
        </div>
      )}
    </div>
  );
});

EnhancedVideoPlayer.displayName = 'EnhancedVideoPlayer';

export default EnhancedVideoPlayer;