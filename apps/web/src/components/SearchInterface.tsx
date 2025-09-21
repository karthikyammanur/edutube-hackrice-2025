import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VideoPlayerRef } from './VideoPlayer';
import { DeepLinkManager } from '../lib/deep-link';

export interface SearchResult {
  videoId: string;
  videoTitle: string;
  startSec: number;
  endSec: number;
  text: string;
  confidence?: number;
  timestamp: string; // MM:SS format
  deepLink: string; // #t=123 format
  embeddingScope?: string;
}

export interface SearchResponse {
  query: string;
  videoId: string;
  videoTitle: string;
  resultsCount: number;
  searchTime: string;
  hits: SearchResult[];
  summary?: string;
}

export interface SearchInterfaceProps {
  videoId: string;
  videoPlayerRef: React.RefObject<VideoPlayerRef>;
  onResultClick?: (result: SearchResult) => void;
  className?: string;
  placeholder?: string;
  showSummary?: boolean;
  maxResults?: number;
}

export const SearchInterface: React.FC<SearchInterfaceProps> = ({
  videoId,
  videoPlayerRef,
  onResultClick,
  className = '',
  placeholder = 'Search within this video...',
  showSummary = false,
  maxResults = 10
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim() || !videoId) return;
    
    setIsSearching(true);
    setError('');
    
    try {
      console.log(`🔍 [SEARCH-INTERFACE] Searching for: "${searchQuery}" in video ${videoId}`);
      
      const response = await fetch('/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          videoId,
          query: searchQuery.trim(),
          limit: maxResults,
          summarize: showSummary
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const searchResults = await response.json() as SearchResponse;
      console.log(`✅ [SEARCH-INTERFACE] Found ${searchResults.resultsCount} results`);
      
      setResults(searchResults);
      setShowResults(true);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      console.error('❌ [SEARCH-INTERFACE] Search failed:', err);
      setError(errorMessage);
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleResultClick = (result: SearchResult) => {
    console.log(`📍 [SEARCH-INTERFACE] Seeking to timestamp: ${result.timestamp} (${result.startSec}s) and starting playback`);
    
    // Seek video player to timestamp and start playing
    if (videoPlayerRef.current) {
      // First seek to the timestamp
      videoPlayerRef.current.seekTo(result.startSec);
      
      // Then start playing the video
      // Small delay to ensure seek completes before playing
      setTimeout(() => {
        if (videoPlayerRef.current) {
          videoPlayerRef.current.play();
          console.log('▶️ [SEARCH-INTERFACE] Started video playback');
        }
      }, 100);
    }
    
    // Update URL with deep link
    DeepLinkManager.updateUrl({
      videoId,
      timestamp: result.startSec,
      page: 'upload'
    });
    
    // Call custom handler if provided
    onResultClick?.(result);
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(query);
  };
  
  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setShowResults(false);
    setError('');
    searchInputRef.current?.focus();
  };
  
  return (
    <div className={`search-interface ${className}`}>
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            disabled={isSearching}
            className="w-full px-4 py-3 pr-12 rounded-lg border text-sm focus:outline-none focus:ring-2 transition-colors"
            style={{
              borderColor: 'var(--border-primary)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)'
            } as React.CSSProperties}
          />
          
          {/* Search Button */}
          <button
            type="submit"
            disabled={!query.trim() || isSearching}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 rounded-md hover:bg-opacity-80 transition-colors disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--text-inverse)'
            }}
          >
            {isSearching ? (
              <div className="animate-spin h-4 w-4 border-2 border-transparent border-t-current rounded-full"></div>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            )}
          </button>
          
          {/* Clear Button */}
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-12 top-1/2 transform -translate-y-1/2 p-1 rounded-md hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        
        {/* Search Options */}
        <div className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          Press Enter to search • Click results to jump to timestamp and autoplay
        </div>
      </form>
      
      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-4 p-3 rounded-lg border"
          style={{
            borderColor: 'var(--accent-danger)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--accent-danger)'
          }}
        >
          <div className="flex items-center gap-2">
            <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        </motion.div>
      )}
      
      {/* Search Results */}
      <AnimatePresence>
        {showResults && results && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="search-results"
          >
            {/* Results Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {results.resultsCount} result{results.resultsCount !== 1 ? 's' : ''} for "{results.query}"
              </div>
              <button
                onClick={() => setShowResults(false)}
                className="text-xs hover:opacity-70 transition-opacity"
                style={{ color: 'var(--text-secondary)' }}
              >
                Hide Results
              </button>
            </div>
            
            {/* Summary (if available) */}
            {results.summary && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-4 p-4 rounded-lg border"
                style={{
                  borderColor: 'var(--border-primary)',
                  backgroundColor: 'var(--bg-secondary)'
                }}
              >
                <div className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  AI Summary
                </div>
                <div className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {results.summary}
                </div>
              </motion.div>
            )}
            
            {/* Results List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.hits.map((result, index) => (
                <motion.div
                  key={`${result.startSec}-${index}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleResultClick(result)}
                  className="search-result-item p-3 rounded-lg border cursor-pointer hover:shadow-sm transition-all group"
                  style={{
                    borderColor: 'var(--border-primary)',
                    backgroundColor: 'var(--bg-primary)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Timestamp Badge */}
                    <div
                      className="flex-shrink-0 px-2 py-1 rounded text-xs font-mono"
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--text-inverse)'
                      }}
                    >
                      {result.timestamp}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div 
                        className="text-sm leading-relaxed group-hover:underline transition-all"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {result.text}
                      </div>
                      
                      {/* Metadata */}
                      <div className="mt-1 flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>{result.startSec}s - {result.endSec}s</span>
                        {result.confidence && (
                          <>
                            <span>•</span>
                            <span>Confidence: {Math.round(result.confidence * 100)}%</span>
                          </>
                        )}
                        {result.embeddingScope && (
                          <>
                            <span>•</span>
                            <span>{result.embeddingScope}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Play Icon */}
                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <svg className="h-5 w-5" style={{ color: 'var(--accent-primary)' }} fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
            
            {/* No Results */}
            {results.resultsCount === 0 && (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">🔍</div>
                <div className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  No results found
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Try different keywords or check if the video has finished processing
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchInterface;