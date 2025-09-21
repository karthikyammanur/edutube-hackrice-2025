import React from 'react';
import { FadeIn } from './components/animate-ui/primitives/core/fade-in';
import { motion } from 'framer-motion';
import { apiFetch } from './lib';
import { useStudyMaterials } from './hooks/use-study-materials';

type Flashcard = {
	topic: string;
	question: string;
	answer: string;
	difficulty: 'easy' | 'medium' | 'hard';
};

const fallbackDeck: Flashcard[] = [
	{
		topic: 'Sample Topic',
		question: 'Upload and process a video to see dynamic flashcards here!',
		answer: 'Click "Upload a video" in the header to get started.',
		difficulty: 'easy',
	},
];

export default function Flashcards(): JSX.Element {
    const [index, setIndex] = React.useState<number>(0);
    const [showAnswer, setShowAnswer] = React.useState<boolean>(false);
    const [deck, setDeck] = React.useState<Flashcard[]>(fallbackDeck);
    const [videoTitle, setVideoTitle] = React.useState<string>('');
    
    const { studyMaterials, loading, error, fetchStudyMaterials } = useStudyMaterials();
    
    // State to track URL hash changes
    const [currentHash, setCurrentHash] = React.useState(window.location.hash);
    
    // Listen for hash changes
    React.useEffect(() => {
        const handleHashChange = () => {
            setCurrentHash(window.location.hash);
        };
        
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);
    
    // Get video ID from URL hash
    const videoId = React.useMemo(() => {
        const hash = currentHash;
        const queryStart = hash.indexOf('?');
        if (queryStart === -1) return null;
        
        const params = new URLSearchParams(hash.substring(queryStart + 1));
        return params.get('videoId');
    }, [currentHash]);

    React.useEffect(() => {
        async function loadFlashcards() {
            if (!videoId) {
                // If no videoId, reset to fallback deck
                setDeck(fallbackDeck);
                setVideoTitle('');
                return;
            }
            
            try {
                // Check video status first
                const video = await apiFetch(`/videos/${videoId}/status`);
                setVideoTitle(video.title || 'Lecture Video');
                
                if (video.status !== 'ready') {
                    console.log('Video not ready, status:', video.status);
                    // Reset to fallback while video is processing
                    setDeck([{
                        topic: 'Processing',
                        question: `Video is ${video.status}. Please wait for processing to complete.`,
                        answer: 'Flashcards will be available once the video has been fully processed.',
                        difficulty: 'easy' as const
                    }]);
                    return;
                }
                
                // Use shared context to get study materials
                const materials = await fetchStudyMaterials(videoId, {
                    limits: { cards: 10 },
                    length: 'medium'
                });
                
                if (materials?.flashcardsByTopic) {
                    // Flatten flashcards from all topics with validation
                    const allCards: Flashcard[] = [];
                    const errors: string[] = [];
                    
                    Object.entries(materials.flashcardsByTopic).forEach(([topicName, cards]) => {
                        cards.forEach((card: any, index: number) => {
                            if (!card.question || !card.answer || 
                                card.question.trim() === '' || card.answer.trim() === '') {
                                errors.push(`Flashcard ${index + 1} in ${topicName}: incomplete data (missing question or answer)`);
                            } else {
                                allCards.push({
                                    topic: card.topic || topicName || 'General',
                                    question: card.question.trim(),
                                    answer: card.answer.trim(),
                                    difficulty: card.difficulty || 'medium'
                                });
                            }
                        });
                    });
                    
                    if (allCards.length > 0) {
                        setDeck(allCards);
                        // Reset index when new deck is loaded
                        setIndex(0);
                        setShowAnswer(false);
                        
                        if (errors.length > 0) {
                            console.warn('Some flashcards had issues:', errors);
                        }
                    } else {
                        console.log('No valid flashcards found in study materials');
                        setDeck([{
                            topic: 'No Content',
                            question: 'No flashcards could be generated from this video.',
                            answer: 'This may be due to insufficient content or processing issues. Try uploading a different video.',
                            difficulty: 'easy' as const
                        }]);
                        
                        if (errors.length > 0) {
                            console.error('Flashcard validation errors:', errors);
                        }
                    }
                } else {
                    console.log('No flashcardsByTopic found in materials');
                    setDeck([{
                        topic: 'No Content',
                        question: 'Study materials are not available for this video.',
                        answer: 'Please try refreshing the page or contact support if this issue persists.',
                        difficulty: 'easy' as const
                    }]);
                }
            } catch (err: any) {
                console.error('Error loading flashcards or video:', err);
                setDeck([{
                    topic: 'Error',
                    question: 'Failed to load flashcards.',
                    answer: `Error: ${err.message || 'Unknown error occurred'}. Please try refreshing the page.`,
                    difficulty: 'easy' as const
                }]);
            }
        }
        
        loadFlashcards();
    }, [videoId, fetchStudyMaterials]);

    // Safe card access with proper bounds checking
    const safeIndex = Math.max(0, Math.min(index, deck.length - 1));
    const card = deck.length > 0 ? deck[safeIndex] : fallbackDeck[0];

    // Navigation functions as specified in prompts.txt
    function navigateFlashcard(direction: 'next' | 'prev', currentIndex: number, totalCards: number): number {
        if (direction === 'next') {
            // If at last card, loop to first
            return currentIndex >= totalCards - 1 ? 0 : currentIndex + 1;
        } else if (direction === 'prev') {
            // If at first card, loop to last
            return currentIndex <= 0 ? totalCards - 1 : currentIndex - 1;
        }
        return currentIndex;
    }

    function updateFlashcardCounter(currentIndex: number, totalCards: number): string {
        // Display format: "X / Y" where X is current position (1-based)
        return `${currentIndex + 1} / ${totalCards}`;
    }

    React.useEffect(() => {
        const onKey = (e: KeyboardEvent): void => {
            // Prevent default behavior for space and enter to avoid page scrolling
            if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                setShowAnswer((v) => !v);
            }
            
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                setIndex(navigateFlashcard('next', index, deck.length));
            }
            
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                setIndex(navigateFlashcard('prev', index, deck.length));
            }
        };
        
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [index, deck.length]);

    React.useEffect(() => {
        setShowAnswer(false);
    }, [index]);

    return (
        <div className="min-h-dvh" style={{backgroundColor: 'var(--bg-primary)'}}>
            <header className="sticky top-0 z-40 navbar" style={{borderBottomColor: 'var(--border-color)'}}>
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <a href="#" className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>EduTube Notes</a>
                    <nav className="text-sm"><a href="#upload" className="nav-link underline-offset-4 hover:underline">Back to upload</a></nav>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl sm:text-3xl font-semibold" style={{color: 'var(--text-primary)'}}>
                        Flashcards
                        {videoTitle && <span className="text-lg font-normal ml-2" style={{color: 'var(--text-secondary)'}}>• {videoTitle}</span>}
                    </h1>
                    {videoId && (
                        <a 
                            href={`#upload?videoId=${videoId}`}
                            className="text-sm nav-link underline-offset-4 hover:underline"
                        >
                            Back to video
                        </a>
                    )}
                </div>
                
                {loading && (
                    <div className="mt-10 flex flex-col items-center justify-center min-h-[50vh]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: 'var(--accent-primary)'}}></div>
                        <p className="mt-4" style={{color: 'var(--text-secondary)'}}>Loading flashcards...</p>
                    </div>
                )}
                
                {error && (
                    <div className="mt-10 flex flex-col items-center justify-center min-h-[50vh]">
                        <div className="max-w-md text-center">
                            <p className="mb-4" style={{color: 'var(--accent-danger)'}}>{error}</p>
                            <a 
                                href="#upload"
                                className="btn inline-flex items-center px-4 py-2 rounded-lg transition"
                            >
                                Go to Upload Page
                            </a>
                        </div>
                    </div>
                )}
                
                {!loading && !error && (
                    <div className="mt-10 flex flex-col items-center justify-center min-h-[70vh]">
                        <FadeIn once y={10} className="w-full flex items-center justify-center">
                            <div style={{ perspective: '1000px' }}>
                                <motion.div
                                    animate={{ rotateY: showAnswer ? 180 : 0 }}
                                    transition={{ duration: 0.5, ease: 'easeInOut' }}
                                    className="flashcard relative rounded-2xl text-center w-[360px] h-[360px] sm:w-[420px] sm:h-[420px] lg:w-[520px] lg:h-[520px] p-8"
                                    style={{ transformStyle: 'preserve-3d' as any }}
                                >
                                    <div
                                        className="absolute inset-0 flex items-center justify-center px-6"
                                        style={{ backfaceVisibility: 'hidden' as any }}
                                    >
                                        <p className="text-2xl sm:text-3xl lg:text-4xl font-medium leading-snug" style={{color: 'var(--text-primary)'}}>
                                            {card.question}
                                        </p>
                                    </div>
                                    <div
                                        className="absolute inset-0 flex items-center justify-center px-6"
                                        style={{ backfaceVisibility: 'hidden' as any, transform: 'rotateY(180deg)' }}
                                    >
                                        <p className="text-xl sm:text-2xl lg:text-3xl leading-snug" style={{color: 'var(--text-primary)'}}>
                                            {card.answer}
                                        </p>
                                    </div>
                                    <span className="invisible">.</span>
                                </motion.div>
                            </div>
                        </FadeIn>
                        <div className="mt-6 flex items-center gap-3">
                            <button 
                                onClick={() => setIndex(navigateFlashcard('prev', index, deck.length))} 
                                className="inline-flex items-center px-5 py-3 rounded-xl transition" 
                                style={{
                                    backgroundColor: 'var(--bg-secondary)', 
                                    color: 'var(--text-primary)', 
                                    borderColor: 'var(--border-color)', 
                                    borderWidth: '1px', 
                                    borderStyle: 'solid', 
                                    boxShadow: 'var(--shadow-sm)'
                                }} 
                                onMouseEnter={(e) => {(e.target as HTMLElement).style.boxShadow = 'var(--shadow-md)';}} 
                                onMouseLeave={(e) => {(e.target as HTMLElement).style.boxShadow = 'var(--shadow-sm)';}}
                            >
                                Prev
                            </button>
                            <button 
                                onClick={() => setShowAnswer((v) => !v)} 
                                className="inline-flex items-center px-5 py-3 rounded-xl transition" 
                                style={{
                                    backgroundColor: 'var(--bg-secondary)', 
                                    color: 'var(--text-primary)', 
                                    borderColor: 'var(--border-color)', 
                                    borderWidth: '1px', 
                                    borderStyle: 'solid', 
                                    boxShadow: 'var(--shadow-sm)'
                                }} 
                                onMouseEnter={(e) => {(e.target as HTMLElement).style.boxShadow = 'var(--shadow-md)';}} 
                                onMouseLeave={(e) => {(e.target as HTMLElement).style.boxShadow = 'var(--shadow-sm)';}}
                            >
                                {showAnswer ? 'Hide answer' : 'Show answer'}
                            </button>
                            <button 
                                onClick={() => setIndex(navigateFlashcard('next', index, deck.length))} 
                                className="inline-flex items-center px-5 py-3 rounded-xl transition" 
                                style={{
                                    backgroundColor: 'var(--bg-secondary)', 
                                    color: 'var(--text-primary)', 
                                    borderColor: 'var(--border-color)', 
                                    borderWidth: '1px', 
                                    borderStyle: 'solid', 
                                    boxShadow: 'var(--shadow-sm)'
                                }} 
                                onMouseEnter={(e) => {(e.target as HTMLElement).style.boxShadow = 'var(--shadow-md)';}} 
                                onMouseLeave={(e) => {(e.target as HTMLElement).style.boxShadow = 'var(--shadow-sm)';}}
                            >
                                Next
                            </button>
                        </div>
                        <p className="flashcard-counter mt-3 text-sm" style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '0.5rem',
                            backgroundColor: 'var(--bg-secondary)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)'
                        }}>
                            {updateFlashcardCounter(safeIndex, deck.length)}
                        </p>
                    </div>
                )}
            </main>
        </div>
    );
}
