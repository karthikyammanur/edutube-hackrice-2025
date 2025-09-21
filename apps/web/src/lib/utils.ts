import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { apiFetch } from './index';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export async function checkBackendHealth(): Promise<{ 
  healthy: boolean; 
  message: string; 
  services?: { [key: string]: boolean } 
}> {
  try {
    const health = await apiFetch('/health');
    return {
      healthy: true,
      message: 'Backend is running',
      services: health.services || {}
    };
  } catch (error: any) {
    return {
      healthy: false,
      message: error.message.includes('fetch') 
        ? 'Backend server is not running' 
        : `Backend error: ${error.message}`
    };
  }
}

export async function waitForVideoReady(videoId: string, maxWaitMs = 300000): Promise<boolean> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const video = await apiFetch(`/videos/${videoId}/status`);
      
      if (video.status === 'ready') {
        return true;
      }
      
      if (video.status === 'failed') {
        throw new Error('Video processing failed');
      }
      
      // Wait 5 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 5000));
    } catch (error) {
      console.error('Error checking video status:', error);
      throw error;
    }
  }
  
  throw new Error('Video processing timeout - took longer than expected');
}

// Format time in seconds to MM:SS format
export function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Extract video ID from various URL formats
export function extractVideoId(url: string): string | null {
  try {
    // From hash: #upload?videoId=abc123
    if (url.includes('videoId=')) {
      const match = url.match(/videoId=([^&]+)/);
      return match ? match[1] : null;
    }
    return null;
  } catch {
    return null;
  }
}
