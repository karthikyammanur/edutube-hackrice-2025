/**
 * VideoPlayerManager - Fix pause/unpause conflicts and seeking issues
 * Implementation follows prompts.txt specifications exactly
 * CRITICAL: Zero tolerance for auto-pause bugs
 */

import videojs from 'video.js';
import type Player from 'video.js/dist/types/player';

export interface VideoPlayerManagerOptions {
  videoId: string;
  containerId: string;
  onReady?: (player: Player) => void;
  onTimeUpdate?: (currentTime: number) => void;
  onSeek?: (time: number) => void;
  startTime?: number;
}

export class VideoPlayerManager {
  private videoId: string;
  private containerId: string;
  private player: Player | null = null;
  private isInitialized = false;
  private pendingSeek: number | null = null;
  private duration: number | null = null;
  private onReady?: (player: Player) => void;
  private onTimeUpdate?: (currentTime: number) => void;
  private onSeek?: (time: number) => void;

  constructor(options: VideoPlayerManagerOptions) {
    this.videoId = options.videoId;
    this.containerId = options.containerId;
    this.onReady = options.onReady;
    this.onTimeUpdate = options.onTimeUpdate;
    this.onSeek = options.onSeek;
    this.pendingSeek = options.startTime || null;
    
    console.log(`🎬 [VIDEO-MANAGER] Initializing for video: ${this.videoId}`);
    this.init();
  }

  private async init(): Promise<void> {
    try {
      console.log(`🔄 [VIDEO-MANAGER] Fetching stream URL for video: ${this.videoId}`);
      
      const response = await fetch(`/videos/${this.videoId}/stream`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      this.duration = data.durationSec;
      
      console.log(`✅ [VIDEO-MANAGER] Stream URL fetched, duration: ${this.duration}s`);
      
      // CRITICAL: Clean up any existing video elements that might cause conflicts
      this.cleanupExistingElements();
      
      // CRITICAL: Initialize player without conflicting event handlers
      await this.initializePlayer(data.streamUrl);
      
    } catch (error) {
      console.error('❌ [VIDEO-MANAGER] Initialization failed:', error);
      throw error;
    }
  }

  private cleanupExistingElements(): void {
    console.log('🧹 [VIDEO-MANAGER] Cleaning up existing video elements...');
    
    // Remove any existing video elements to prevent conflicts
    const container = document.getElementById(this.containerId);
    if (container) {
      // Remove all existing video elements
      const existingVideos = container.querySelectorAll('video, video-js');
      existingVideos.forEach(video => {
        // Clone element to remove ALL event listeners
        const newVideo = video.cloneNode(true) as HTMLElement;
        video.parentNode?.replaceChild(newVideo, video);
        // Then remove it completely
        newVideo.remove();
      });
      
      // Clear container
      container.innerHTML = '';
    }

    // CRITICAL: Remove any global video event listeners that might conflict
    const allVideos = document.querySelectorAll('video');
    allVideos.forEach(video => {
      // Clone to remove all listeners, then replace
      const newVideo = video.cloneNode(true) as HTMLVideoElement;
      video.parentNode?.replaceChild(newVideo, video);
    });

    console.log('✅ [VIDEO-MANAGER] Cleanup completed');
  }

  private async initializePlayer(streamUrl: string): Promise<void> {
    const container = document.getElementById(this.containerId);
    if (!container) {
      throw new Error(`Container with id "${this.containerId}" not found`);
    }

    // Create video element
    const videoElement = document.createElement('video-js');
    videoElement.id = 'main-video-player';
    videoElement.classList.add('vjs-big-play-centered');
    container.appendChild(videoElement);

    // CRITICAL: Initialize player with minimal conflicting options
    this.player = videojs(videoElement, {
      fluid: true,
      responsive: true,
      playsinline: true,
      preload: 'metadata',
      controls: true,
      sources: [{
        src: streamUrl,
        type: 'video/mp4'
      }],
      // Disable problematic features that might cause auto-pause
      autoplay: false,
      muted: false,
      // Better seeking performance
      html5: {
        vhs: {
          enableLowInitialPlaylist: true,
          smoothQualityChange: true
        }
      }
    });

    // CRITICAL: Wait for player to be fully ready before adding event listeners
    this.player.ready(() => {
      console.log('✅ [VIDEO-MANAGER] Player ready');
      this.isInitialized = true;
      
      // Handle any pending seek requests
      if (this.pendingSeek !== null) {
        console.log(`⏰ [VIDEO-MANAGER] Executing pending seek to: ${this.pendingSeek}s`);
        this.seekToTime(this.pendingSeek);
        this.pendingSeek = null;
      }
      
      // CRITICAL: Remove any conflicting event listeners
      this.cleanupConflictingListeners();
      
      // Set up safe event handlers
      this.setupEventHandlers();
      
      // Call ready callback
      this.onReady?.(this.player!);
    });

    console.log('🎬 [VIDEO-MANAGER] Player initialization completed');
  }

  private cleanupConflictingListeners(): void {
    if (!this.player) return;

    console.log('🧹 [VIDEO-MANAGER] Removing conflicting event listeners...');

    // CRITICAL: Remove problematic listeners that cause auto-pause
    this.player.off('loadedmetadata');
    this.player.off('canplay');
    
    // Ensure no multiple play/pause handlers by cloning video element
    const videoElement = this.player.el().querySelector('video');
    if (videoElement) {
      const newElement = videoElement.cloneNode(true) as HTMLVideoElement;
      videoElement.parentNode?.replaceChild(newElement, videoElement);
    }

    console.log('✅ [VIDEO-MANAGER] Conflicting listeners removed');
  }

  private setupEventHandlers(): void {
    if (!this.player) return;

    console.log('🔧 [VIDEO-MANAGER] Setting up safe event handlers...');

    // Time update handler
    this.player.on('timeupdate', () => {
      const currentTime = this.player?.currentTime() ?? 0;
      this.onTimeUpdate?.(currentTime);
    });

    // CRITICAL: Handle seeking without causing pause conflicts
    this.player.on('seeked', () => {
      const currentTime = this.player?.currentTime() ?? 0;
      console.log(`⏩ [VIDEO-MANAGER] Seeked to: ${currentTime}s`);
      
      // Don't auto-pause after seeking - let user control play/pause state
      // Update URL hash without causing reload
      this.updateUrlHash(currentTime);
      
      // Call seek callback
      this.onSeek?.(currentTime);
    });

    // Error handling
    this.player.on('error', () => {
      const error = this.player?.error();
      console.error('❌ [VIDEO-MANAGER] Player error:', error);
    });

    console.log('✅ [VIDEO-MANAGER] Event handlers set up');
  }

  private updateUrlHash(seconds: number): void {
    const clampedTime = Math.floor(Math.max(0, seconds));
    window.history.replaceState(null, '', `#t=${clampedTime}`);
  }

  public seekToTime(seconds: number): void {
    if (!this.isInitialized || !this.duration || !this.player) {
      // Queue seek for when player is ready
      console.log(`⏳ [VIDEO-MANAGER] Queuing seek to: ${seconds}s (player not ready)`);
      this.pendingSeek = seconds;
      return;
    }

    const clampedTime = Math.max(0, Math.min(seconds, this.duration));
    console.log(`⏩ [VIDEO-MANAGER] Seeking to: ${clampedTime}s`);

    // CRITICAL: Prevent pause during seeking
    const wasPlaying = !this.player.paused();
    
    // Perform seek
    this.player.currentTime(clampedTime);
    
    // CRITICAL: Restore play state if it was playing
    if (wasPlaying) {
      // Small delay to ensure seeking completes before resuming
      setTimeout(() => {
        if (this.player && !this.player.paused()) {
          const playPromise = this.player.play();
          if (playPromise) {
            playPromise.catch(error => {
              console.warn('⚠️ [VIDEO-MANAGER] Failed to resume playback after seek:', error);
            });
          }
        }
      }, 100);
    }

    // Update URL hash
    this.updateUrlHash(clampedTime);
  }

  // CRITICAL: Clean play method without conflicts
  public play(): Promise<void> | undefined {
    if (this.isInitialized && this.player) {
      console.log('▶️ [VIDEO-MANAGER] Play requested');
      return this.player.play();
    } else {
      console.warn('⚠️ [VIDEO-MANAGER] Play requested but player not ready');
    }
  }

  // CRITICAL: Clean pause method without conflicts
  public pause(): void {
    if (this.isInitialized && this.player) {
      console.log('⏸️ [VIDEO-MANAGER] Pause requested');
      this.player.pause();
    } else {
      console.warn('⚠️ [VIDEO-MANAGER] Pause requested but player not ready');
    }
  }

  public getCurrentTime(): number {
    return this.player?.currentTime() ?? 0;
  }

  public getDuration(): number {
    return this.duration ?? 0;
  }

  public getPlayer(): Player | null {
    return this.player;
  }

  public dispose(): void {
    console.log('🧹 [VIDEO-MANAGER] Disposing player...');
    
    if (this.player && !this.player.isDisposed()) {
      this.player.dispose();
    }
    
    this.player = null;
    this.isInitialized = false;
    this.pendingSeek = null;
    this.duration = null;
    
    console.log('✅ [VIDEO-MANAGER] Player disposed');
  }
}

// CRITICAL: Global cleanup function to remove problematic video listeners
export function cleanupGlobalVideoListeners(): void {
  console.log('🌐 [VIDEO-MANAGER] Cleaning up global video listeners...');
  
  // Remove any existing video element listeners
  const existingVideos = document.querySelectorAll('video');
  existingVideos.forEach(video => {
    // Remove all event listeners by cloning
    const newVideo = video.cloneNode(true) as HTMLVideoElement;
    video.parentNode?.replaceChild(newVideo, video);
  });
  
  console.log('✅ [VIDEO-MANAGER] Global cleanup completed');
}

// Initialize global cleanup on DOM load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', cleanupGlobalVideoListeners);
}

export default VideoPlayerManager;