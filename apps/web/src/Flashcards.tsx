import React from 'react';
import { FadeIn } from './components/animate-ui/primitives/core/fade-in';
import { motion } from 'framer-motion';
import { apiFetch } from './lib';

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
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string>('');
    const [videoTitle, setVideoTitle] = React.useState<string>('');
    
    // Get video ID from URL hash
    const videoId = React.useMemo(() => {
        const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
        return params.get('videoId');
    }, [window.location.hash]);

    React.useEffect(() => {
        async function loadFlashcards() {
            if (!videoId) {
                setLoading(false);
                return;
            }
            
            try {
                setLoading(true);
                setError('');
                
                // Check video status first
                const video = await apiFetch(`/videos/${videoId}/status`);
                setVideoTitle(video.title || 'Lecture Video');
                
                if (video.status !== 'ready') {
                    setError(`Video not ready. Status: ${video.status}. Please wait for processing to complete.`);
                    setLoading(false);
                    return;
                }
                
                // Try to get study materials (flashcards)
                try {
                    const studyMaterials = await apiFetch(`/study/generate`, {
                        method: 'POST',
                        body: JSON.stringify({ 
                            videoId,
                            limits: { cards: 10 },
                            length: 'medium'
                        })
                    });
                    
                    if (studyMaterials.flashcards && studyMaterials.flashcards.length > 0) {
                        setDeck(studyMaterials.flashcards);
                    } else {
                        setError('No flashcards available for this video. Try generating study materials first.');
                    }
                } catch (err: any) {
                    // If study materials aren't generated yet, show helpful message
                    if (err.message.includes('404') || err.message.includes('not found')) {
                        setError('Study materials not generated yet. Go back to upload page and click "Generate Materials".');
                    } else {
                        setError(`Error loading flashcards: ${err.message}`);
                    }
                }
            } catch (err: any) {
                setError(`Error loading video: ${err.message}`);
            } finally {
                setLoading(false);
            }
        }
        
        loadFlashcards();
    }, [videoId]);

    const card = deck[(index % deck.length + deck.length) % deck.length];

    React.useEffect(() => {
        const onKey = (e: KeyboardEvent): void => {
            if (e.key === 'ArrowRight') setIndex((i) => i + 1);
            if (e.key === 'ArrowLeft') setIndex((i) => i - 1);
            if (e.key.toLowerCase() === ' ' || e.key.toLowerCase() === 'enter') setShowAnswer((v) => !v);
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, []);

    React.useEffect(() => {
        setShowAnswer(false);
    }, [index]);

    return (
        <div className="min-h-dvh bg-background">
            <header className="sticky top-0 z-40 border-b border-border/80 bg-background">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
                    <a href="#" className="text-lg font-semibold text-text">EduTube Notes</a>
                    <nav className="text-sm"><a href="#upload" className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline">Back to upload</a></nav>
                </div>
            </header>
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl sm:text-3xl font-semibold text-text">
                        Flashcards
                        {videoTitle && <span className="text-lg text-slate-600 font-normal ml-2">• {videoTitle}</span>}
                    </h1>
                    {videoId && (
                        <a 
                            href={`#upload?videoId=${videoId}`}
                            className="text-sm text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline"
                        >
                            Back to video
                        </a>
                    )}
                </div>
                
                {loading && (
                    <div className="mt-10 flex flex-col items-center justify-center min-h-[50vh]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-text"></div>
                        <p className="mt-4 text-slate-600">Loading flashcards...</p>
                    </div>
                )}
                
                {error && (
                    <div className="mt-10 flex flex-col items-center justify-center min-h-[50vh]">
                        <div className="max-w-md text-center">
                            <p className="text-red-600 mb-4">{error}</p>
                            <a 
                                href="#upload"
                                className="inline-flex items-center px-4 py-2 rounded-lg bg-text text-background hover:bg-primaryHover transition"
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
                                    className="relative rounded-2xl border border-border bg-white text-center w-[360px] h-[360px] sm:w-[420px] sm:h-[420px] lg:w-[520px] lg:h-[520px] p-8"
                                    style={{ transformStyle: 'preserve-3d' as any }}
                                >
                                    <div
                                        className="absolute inset-0 flex items-center justify-center px-6"
                                        style={{ backfaceVisibility: 'hidden' as any }}
                                    >
                                        <p className="text-2xl sm:text-3xl lg:text-4xl font-medium text-text leading-snug">
                                            {card.question}
                                        </p>
                                    </div>
                                    <div
                                        className="absolute inset-0 flex items-center justify-center px-6"
                                        style={{ backfaceVisibility: 'hidden' as any, transform: 'rotateY(180deg)' }}
                                    >
                                        <p className="text-xl sm:text-2xl lg:text-3xl text-text leading-snug">
                                            {card.answer}
                                        </p>
                                    </div>
                                    <span className="invisible">.</span>
                                </motion.div>
                            </div>
                        </FadeIn>
                        <div className="mt-6 flex items-center gap-3">
                            <button onClick={() => setIndex((i) => i - 1)} className="inline-flex items-center px-5 py-3 rounded-xl border border-border bg-surface text-text hover:shadow-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-text">Prev</button>
                            <button onClick={() => setShowAnswer((v) => !v)} className="inline-flex items-center px-5 py-3 rounded-xl border border-border bg-surface text-text hover:shadow-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-text">
                                {showAnswer ? 'Hide answer' : 'Show answer'}
                            </button>
                            <button onClick={() => setIndex((i) => i + 1)} className="inline-flex items-center px-5 py-3 rounded-xl bg-text text-background hover:bg-primaryHover transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-text">Next</button>
                        </div>
                        <p className="mt-3 text-xs text-subtext">{index + 1} / {deck.length}</p>
                    </div>
                )}
            </main>
        </div>
    );
}
