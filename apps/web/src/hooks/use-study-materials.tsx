import React, { createContext, useContext, useState, useCallback } from 'react';
import { apiFetch } from '../lib';

interface QuizQuestion {
  type: string;
  prompt: string;
  choices: { id: string; text: string }[];
  answer: string;
  explanation: string;
  topic: string;
  difficulty: string;
}

interface FlashcardItem {
  question: string;
  answer: string;
  topic: string;
  difficulty: string;
}

interface StudyMaterials {
  videoId: string;
  hits: any[];
  summary: string;
  topics: string[];
  flashcardsByTopic: Record<string, FlashcardItem[]>;
  quizByTopic: Record<string, QuizQuestion[]>;
}

interface StudyMaterialsContextType {
  studyMaterials: StudyMaterials | null;
  loading: boolean;
  error: string;
  fetchStudyMaterials: (videoId: string, options?: any) => Promise<StudyMaterials | null>;
  clearStudyMaterials: () => void;
  isGenerating: boolean;
}

const StudyMaterialsContext = createContext<StudyMaterialsContextType | null>(null);

export function StudyMaterialsProvider({ children }: { children: React.ReactNode }) {
  const [studyMaterials, setStudyMaterials] = useState<StudyMaterials | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeRequest, setActiveRequest] = useState<Promise<StudyMaterials> | null>(null);

  const fetchStudyMaterials = useCallback(async (videoId: string, options: any = {}): Promise<StudyMaterials | null> => {
    // If we already have materials for this video, return them
    if (studyMaterials?.videoId === videoId && !options.forceRefresh) {
      console.log('💰 [STUDY-CONTEXT] Using cached study materials for video:', videoId);
      return studyMaterials;
    }

    // If there's already a request in progress for this video, wait for it
    if (activeRequest && isGenerating) {
      console.log('🔄 [STUDY-CONTEXT] Waiting for ongoing request for video:', videoId);
      try {
        return await activeRequest;
      } catch (error) {
        // If the ongoing request fails, we'll create a new one below
        console.warn('⚠️ [STUDY-CONTEXT] Ongoing request failed, creating new one');
      }
    }

    try {
      console.log('🚀 [STUDY-CONTEXT] Starting study materials fetch for video:', videoId);
      setLoading(true);
      setError('');
      setIsGenerating(true);
      
      const requestPromise = apiFetch('/study/generate', {
        method: 'POST',
        body: JSON.stringify({
          videoId,
          limits: options.limits || { hits: 12, cards: 8, questions: 8 },
          length: options.length || 'medium',
          tone: options.tone || 'neutral',
          query: options.query
        })
      }) as Promise<StudyMaterials>;
      
      setActiveRequest(requestPromise);
      
      const materials = await requestPromise;
      
      console.log('✅ [STUDY-CONTEXT] Study materials fetched successfully for video:', videoId);
      setStudyMaterials(materials);
      setError('');
      
      return materials;
      
    } catch (err: any) {
      console.error('❌ [STUDY-CONTEXT] Error fetching study materials:', err);
      
      if (err.status === 429) {
        setError(`Rate limited: ${err.message || 'Please wait before trying again'}`);
      } else {
        setError(err?.message || 'Failed to fetch study materials');
      }
      
      return null;
    } finally {
      setLoading(false);
      setIsGenerating(false);
      setActiveRequest(null);
    }
  }, [studyMaterials, activeRequest, isGenerating]);

  const clearStudyMaterials = useCallback(() => {
    console.log('🗑️ [STUDY-CONTEXT] Clearing study materials cache');
    setStudyMaterials(null);
    setError('');
    setLoading(false);
    setIsGenerating(false);
    setActiveRequest(null);
  }, []);

  const contextValue: StudyMaterialsContextType = {
    studyMaterials,
    loading,
    error,
    fetchStudyMaterials,
    clearStudyMaterials,
    isGenerating
  };

  return (
    <StudyMaterialsContext.Provider value={contextValue}>
      {children}
    </StudyMaterialsContext.Provider>
  );
}

export function useStudyMaterials(): StudyMaterialsContextType {
  const context = useContext(StudyMaterialsContext);
  if (!context) {
    throw new Error('useStudyMaterials must be used within a StudyMaterialsProvider');
  }
  return context;
}