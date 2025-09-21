import React from 'react';
import { apiFetch } from '../lib';

type VideoState = {
  id: string | null;
  status: 'uploaded' | 'indexing' | 'ready' | 'failed' | null;
  title: string | null;
  isProcessing: boolean;
  error: string | null;
};

type VideoContextType = {
  videoState: VideoState;
  setVideoId: (id: string) => void;
  checkVideoStatus: (id: string) => Promise<void>;
  clearVideo: () => void;
};

const VideoContext = React.createContext<VideoContextType | null>(null);

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [videoState, setVideoState] = React.useState<VideoState>({
    id: null,
    status: null,
    title: null,
    isProcessing: false,
    error: null,
  });

  const checkVideoStatus = React.useCallback(async (id: string) => {
    try {
      setVideoState(prev => ({ ...prev, isProcessing: true, error: null }));
      
      const video = await apiFetch(`/videos/${id}/status`);
      
      setVideoState(prev => ({
        ...prev,
        id,
        status: video.status,
        title: video.title,
        isProcessing: video.status === 'indexing',
        error: null,
      }));

      // Continue polling if still processing
      if (video.status === 'indexing') {
        setTimeout(() => checkVideoStatus(id), 5000);
      }
    } catch (err: any) {
      setVideoState(prev => ({
        ...prev,
        error: err.message,
        isProcessing: false,
      }));
    }
  }, []);

  const setVideoId = React.useCallback((id: string) => {
    setVideoState(prev => ({ ...prev, id }));
    checkVideoStatus(id);
  }, [checkVideoStatus]);

  const clearVideo = React.useCallback(() => {
    setVideoState({
      id: null,
      status: null,
      title: null,
      isProcessing: false,
      error: null,
    });
  }, []);

  return (
    <VideoContext.Provider value={{ videoState, setVideoId, checkVideoStatus, clearVideo }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideo() {
  const context = React.useContext(VideoContext);
  if (!context) {
    throw new Error('useVideo must be used within a VideoProvider');
  }
  return context;
}

// Hook to get video ID from URL hash
export function useVideoIdFromHash() {
  const [videoId, setVideoId] = React.useState<string | null>(null);

  React.useEffect(() => {
    function updateVideoId() {
      const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
      const id = params.get('videoId');
      setVideoId(id);
    }

    updateVideoId();
    
    // Listen for hash changes
    window.addEventListener('hashchange', updateVideoId);
    return () => window.removeEventListener('hashchange', updateVideoId);
  }, []);

  return videoId;
}