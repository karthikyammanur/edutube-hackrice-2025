import React from 'react';
import { FadeIn } from './components/animate-ui/primitives/core/fade-in';
import { Mic, Send, Search } from 'lucide-react';
import { apiFetch } from './lib';
import { useStudyMaterials } from './hooks/use-study-materials';

type SummaryData = {
  overview?: string;
  keyConcepts?: Array<{ term: string; definition: string }>;
  formulas?: string[];
  cautions?: string[];
  title?: string;
};

type SearchResult = {
  startSec: number;
  endSec: number;
  text: string;
  confidence: number;
};

export default function Summary(): JSX.Element {
  const [summaryData, setSummaryData] = React.useState<SummaryData | null>(null);
  const [videoTitle, setVideoTitle] = React.useState<string>('');
  const [searchQuery, setSearchQuery] = React.useState<string>('');
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);
  const [chatQuery, setChatQuery] = React.useState<string>('');
  
  // Use shared study materials hook like Flashcards component
  const { studyMaterials, loading, error, fetchStudyMaterials } = useStudyMaterials();
  
  // Get video ID from URL hash
  const videoId = React.useMemo(() => {
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    return params.get('videoId');
  }, [window.location.hash]);

  React.useEffect(() => {
    async function loadSummary() {
      if (!videoId) {
        setSummaryData({
          title: 'No Video Selected',
          overview: 'Please upload a video first to see its summary.'
        });
        return;
      }
      
      try {
        // Check video status first
        const video = await apiFetch(`/videos/${videoId}/status`);
        setVideoTitle(video.title || 'Lecture Video');
        
        if (video.status !== 'ready') {
          setSummaryData({
            title: video.title || 'Processing',
            overview: `Video is ${video.status}. Please wait for processing to complete before study materials will be available.`
          });
          return;
        }
        
        // Use shared context to get study materials (same as Flashcards)
        const materials = await fetchStudyMaterials(videoId, {
          limits: { hits: 20 },
          length: 'long'
        });
        
        if (materials?.summary) {
          setSummaryData({
            title: video.title || 'Lecture Summary',
            overview: materials.summary,
            keyConcepts: materials.keyConcepts || [], // Future enhancement
            formulas: materials.formulas || [], // Future enhancement
            cautions: materials.cautions || [] // Future enhancement
          });
        } else {
          setSummaryData({
            title: video.title || 'No Summary',
            overview: 'Summary not available. Study materials may still be generating.'
          });
        }
      } catch (err: any) {
        console.error('Error loading summary:', err);
        setSummaryData({
          title: 'Error',
          overview: `Error loading summary: ${err.message}`
        });
      }
    }
    
    loadSummary();
  }, [videoId, fetchStudyMaterials]);

  async function handleSearch(query: string) {
    if (!videoId || !query.trim()) return;
    
    try {
      setSearchLoading(true);
      const results = await apiFetch('/search', {
        method: 'POST',
        body: JSON.stringify({
          videoId,
          query: query.trim(),
          limit: 5,
          summarize: false
        })
      });
      
      setSearchResults(results.hits || []);
    } catch (err: any) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleChatSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!chatQuery.trim()) return;
    
    // Use search for now - in a full implementation this would be a chat endpoint
    handleSearch(chatQuery);
    setChatQuery('');
  }
  return (
    <div className="min-h-dvh" style={{backgroundColor: 'var(--bg-primary)'}}>
      <header className="sticky top-0 z-40 navbar" style={{borderBottomColor: 'var(--border-color)'}}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href="#" className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>EduTube Notes</a>
            {videoTitle && <span className="text-sm" style={{color: 'var(--text-secondary)'}}>• {videoTitle}</span>}
          </div>
          <nav className="flex items-center gap-4 text-sm">
            {videoId && (
              <a href={`#upload?videoId=${videoId}`} className="nav-link underline-offset-4 hover:underline">Back to video</a>
            )}
            <a href="#upload" className="nav-link underline-offset-4 hover:underline">Upload New</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-10 pb-40">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl sm:text-3xl font-semibold" style={{color: 'var(--text-primary)'}}>
            {summaryData?.title || videoTitle || 'Lecture Summary'}
          </h1>
          {videoId && (
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Search in video..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchQuery)}
                className="px-3 py-1 rounded-lg text-sm"
                style={{backgroundColor: 'var(--input-bg)', color: 'var(--text-primary)', borderColor: 'var(--input-border)', borderWidth: '1px', borderStyle: 'solid'}}
                onFocus={(e) => (e.target as HTMLElement).style.borderColor = 'var(--input-focus)'}
                onBlur={(e) => (e.target as HTMLElement).style.borderColor = 'var(--input-border)'}
              />
              <button 
                onClick={() => handleSearch(searchQuery)}
                disabled={searchLoading}
                className="btn p-2 rounded-lg transition disabled:opacity-50"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: 'var(--accent-primary)'}}></div>
            <span className="ml-3" style={{color: 'var(--text-secondary)'}}>Loading summary...</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <a 
              href="#upload"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-text text-background hover:bg-primaryHover transition"
            >
              Go to Upload Page
            </a>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium text-text mb-4">Search Results for "{searchQuery}"</h2>
            <div className="space-y-3">
              {searchResults.map((result, i) => (
                <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-600 mb-1">
                    {Math.floor(result.startSec / 60)}:{(result.startSec % 60).toString().padStart(2, '0')} - {Math.floor(result.endSec / 60)}:{(result.endSec % 60).toString().padStart(2, '0')}
                  </p>
                  <p style={{color: 'var(--text-secondary)'}}>{result.text}</p>
                  <div className="mt-2 text-xs text-blue-500">
                    Confidence: {(result.confidence * 100).toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !error && summaryData && (
          <div className="mt-8 space-y-8">
            <FadeIn once y={8} className="rounded-2xl border border-border bg-white p-6">
              <h2 className="text-lg font-medium text-text">Overview</h2>
              <p className="mt-3 text-subtext whitespace-pre-wrap">
                {summaryData.overview || 'This is an AI-generated summary of the lecture content. The summary will appear here after the video is processed and study materials are generated.'}
              </p>
            </FadeIn>

            {summaryData.keyConcepts && summaryData.keyConcepts.length > 0 && (
              <FadeIn once y={8} className="rounded-2xl border p-6" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-primary)'}}>
                <h2 className="text-lg font-medium" style={{color: 'var(--text-primary)'}}>Key Concepts</h2>
                <ul className="mt-3 list-disc pl-5 space-y-2 text-subtext">
                  {summaryData.keyConcepts.map((concept, i) => (
                    <li key={i}>
                      <span className="font-medium text-text">{concept.term}:</span> {concept.definition}
                    </li>
                  ))}
                </ul>
              </FadeIn>
            )}

            {summaryData.formulas && summaryData.formulas.length > 0 && (
              <FadeIn once y={8} className="rounded-2xl border border-border bg-white p-6">
                <h2 className="text-lg font-medium text-text">Formulas</h2>
                <ul className="mt-3 list-disc pl-5 space-y-2 text-subtext">
                  {summaryData.formulas.map((formula, i) => (
                    <li key={i} className="font-mono text-sm">{formula}</li>
                  ))}
                </ul>
              </FadeIn>
            )}

            {summaryData.cautions && summaryData.cautions.length > 0 && (
              <FadeIn once y={8} className="rounded-2xl border border-border bg-white p-6">
                <h2 className="text-lg font-medium text-text">Cautions and Misconceptions</h2>
                <ul className="mt-3 list-disc pl-5 space-y-2 text-subtext">
                  {summaryData.cautions.map((caution, i) => (
                    <li key={i}>{caution}</li>
                  ))}
                </ul>
              </FadeIn>
            )}
          </div>
        )}
        {/* Floating chat assistant bubble */}
        {videoId && (
          <div className="fixed inset-x-0 bottom-8 z-50 px-4 sm:px-6 lg:px-8">
            <form
              aria-label="Lecture assistant chat"
              className="mx-auto max-w-3xl"
              onSubmit={handleChatSubmit}
            >
              <div className="flex items-center gap-2 rounded-full border px-4 py-2 shadow-lg" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-primary)'}}>
                <label htmlFor="chat-input" className="sr-only">Ask about the notes</label>
                <input
                  id="chat-input"
                  type="text"
                  placeholder="Ask about the notes..."
                  value={chatQuery}
                  onChange={(e) => setChatQuery(e.target.value)}
                  className="w-full bg-transparent px-1 py-2 focus-visible:outline-none"
                  style={{color: 'var(--text-primary)'}}
                  disabled={searchLoading}
                />
                <button
                  type="submit"
                  disabled={searchLoading || !chatQuery.trim()}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 transition focus-visible:outline focus-visible:outline-2 disabled:opacity-50"
                  style={{backgroundColor: 'var(--accent-primary)', color: 'var(--text-inverse)', outlineColor: 'var(--accent-primary)'}}
                  onMouseEnter={(e) => {if (!(e.target as HTMLButtonElement).disabled) (e.target as HTMLElement).style.backgroundColor = 'var(--accent-hover)';}}
                  onMouseLeave={(e) => {(e.target as HTMLElement).style.backgroundColor = 'var(--accent-primary)';}}
                  aria-label="Send"
                >
                  {searchLoading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{borderColor: 'var(--text-inverse)'}}></div>
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{searchLoading ? 'Searching...' : 'Send'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}


