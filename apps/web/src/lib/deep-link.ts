/**
 * Deep Link Support Utilities
 * Handles URL parsing and management for video timestamps and navigation
 */

import React from 'react';

export interface DeepLinkState {
  videoId?: string;
  timestamp?: number;
  page?: string;
}

export class DeepLinkManager {
  /**
   * Parse current URL hash for video state
   * Supports formats: #upload?videoId=abc123&t=125 or #t=125
   */
  static parseCurrentHash(): DeepLinkState {
    const hash = window.location.hash;
    const result: DeepLinkState = {};
    
    // Parse page (e.g., #upload, #quiz, #flashcards)
    const pageMatch = hash.match(/^#([^?]+)/);
    if (pageMatch) {
      result.page = pageMatch[1];
    }
    
    // Parse video ID
    const videoIdMatch = hash.match(/[?&]videoId=([^&]+)/);
    if (videoIdMatch) {
      result.videoId = videoIdMatch[1];
    }
    
    // Parse timestamp (supports t=123 format)
    const timestampMatch = hash.match(/[?&#]t=(\d+)/);
    if (timestampMatch) {
      result.timestamp = parseInt(timestampMatch[1], 10);
    }
    
    return result;
  }
  
  /**
   * Update URL with video state
   * Preserves existing parameters while updating specific ones
   */
  static updateUrl(updates: Partial<DeepLinkState>, replace = true): void {
    const current = this.parseCurrentHash();
    const merged = { ...current, ...updates };
    
    let newHash = '#';
    
    // Add page
    if (merged.page) {
      newHash += merged.page;
    }
    
    // Add query parameters
    const params: string[] = [];
    if (merged.videoId) {
      params.push(`videoId=${merged.videoId}`);
    }
    if (merged.timestamp !== undefined) {
      params.push(`t=${Math.floor(merged.timestamp)}`);
    }
    
    if (params.length > 0) {
      newHash += '?' + params.join('&');
    }
    
    // Update URL
    const method = replace ? 'replaceState' : 'pushState';
    window.history[method](null, '', newHash);
  }
  
  /**
   * Format timestamp as MM:SS string
   */
  static formatTimestamp(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  /**
   * Parse MM:SS timestamp to seconds
   */
  static parseTimestamp(timestamp: string): number {
    const parts = timestamp.split(':').map(p => parseInt(p, 10));
    if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    }
    return 0;
  }
  
  /**
   * Create deep link URL for sharing
   */
  static createShareLink(videoId: string, timestamp?: number, page = 'upload'): string {
    const baseUrl = window.location.origin + window.location.pathname;
    let hash = `#${page}?videoId=${videoId}`;
    
    if (timestamp !== undefined) {
      hash += `&t=${Math.floor(timestamp)}`;
    }
    
    return baseUrl + hash;
  }
  
  /**
   * Listen for hash changes and execute callback
   */
  static onHashChange(callback: (state: DeepLinkState) => void): () => void {
    const handler = () => {
      const state = this.parseCurrentHash();
      callback(state);
    };
    
    window.addEventListener('hashchange', handler);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('hashchange', handler);
    };
  }
  
  /**
   * Navigate to a specific video and timestamp
   */
  static navigateToVideo(videoId: string, timestamp?: number, page = 'upload'): void {
    this.updateUrl({
      page,
      videoId,
      timestamp
    }, false); // Use pushState for navigation
  }
  
  /**
   * Generate YouTube-style deep link hash (for compatibility)
   * Format: #t=1m23s or #t=83s
   */
  static createYouTubeStyleHash(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    
    if (minutes > 0) {
      return `#t=${minutes}m${remainingSeconds}s`;
    } else {
      return `#t=${remainingSeconds}s`;
    }
  }
  
  /**
   * Parse YouTube-style timestamp (supports both #t=1m23s and #t=83 formats)
   */
  static parseYouTubeStyleTimestamp(hash: string): number {
    // Standard format: #t=123
    const standardMatch = hash.match(/[&#]t=(\d+)$/);
    if (standardMatch) {
      return parseInt(standardMatch[1], 10);
    }
    
    // YouTube format: #t=1m23s
    const youtubeMatch = hash.match(/[&#]t=(?:(\d+)m)?(\d+)s/);
    if (youtubeMatch) {
      const minutes = youtubeMatch[1] ? parseInt(youtubeMatch[1], 10) : 0;
      const seconds = parseInt(youtubeMatch[2], 10);
      return minutes * 60 + seconds;
    }
    
    return 0;
  }
}

// Hook for React components to use deep link state
export function useDeepLink() {
  const [state, setState] = React.useState<DeepLinkState>(DeepLinkManager.parseCurrentHash);
  
  React.useEffect(() => {
    const cleanup = DeepLinkManager.onHashChange(setState);
    return cleanup;
  }, []);
  
  const updateUrl = React.useCallback((updates: Partial<DeepLinkState>, replace = true) => {
    DeepLinkManager.updateUrl(updates, replace);
  }, []);
  
  const navigateToVideo = React.useCallback((videoId: string, timestamp?: number, page = 'upload') => {
    DeepLinkManager.navigateToVideo(videoId, timestamp, page);
  }, []);
  
  return {
    state,
    updateUrl,
    navigateToVideo,
    formatTimestamp: DeepLinkManager.formatTimestamp,
    createShareLink: DeepLinkManager.createShareLink
  };
}

export default DeepLinkManager;