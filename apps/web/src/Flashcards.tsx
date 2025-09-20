import React from 'react';
import { FadeIn } from './components/animate-ui/primitives/core/fade-in';
import { motion } from 'framer-motion';

type Flashcard = {
	topic: string;
	question: string;
	answer: string;
	difficulty: 'easy' | 'medium' | 'hard';
};

const deck: Flashcard[] = [
	{
		topic: 'The Fourier coefficients are calculated as follows',
		question: 'What is the formula for the coefficient aₙ?',
		answer: 'aₙ = (2/T) ∫ x(t) cos(nω₀t) dt',
		difficulty: 'easy',
	},
	{
		topic: 'The Fourier coefficients are calculated as follows',
		question: 'What is the formula for the coefficient bₙ?',
		answer: 'bₙ = (2/T) ∫ x(t) sin(nω₀t) dt',
		difficulty: 'easy',
	},
	{
		topic: 'The Fourier coefficients are calculated as follows',
		question: 'What is the formula for the coefficient c₀?',
		answer: 'c₀ = (1/T) ∫ x(t) dt',
		difficulty: 'easy',
	},
	{
		topic: 'The Fourier coefficients are calculated as follows',
		question: 'In the formula for Fourier coefficients, what does x(t) represent?',
		answer: 'The periodic signal.',
		difficulty: 'medium',
	},
	{
		topic: 'The Fourier coefficients are calculated as follows',
		question: 'In the formula for Fourier coefficients, what does T represent?',
		answer: 'The period of the signal.',
		difficulty: 'medium',
	},
	{
		topic: 'The Fourier coefficients are calculated as follows',
		question: 'In the formula for Fourier coefficients, what does ω₀ represent?',
		answer: 'The fundamental frequency.',
		difficulty: 'medium',
	},
	{
		topic: 'The Fourier coefficients are calculated as follows',
		question: 'What are the limits of integration in the formulas for aₙ, bₙ, and c₀?',
		answer: 'They are definite integrals over one period of the signal.',
		difficulty: 'hard',
	},
	{
		topic: 'The Fourier coefficients are calculated as follows',
		question: 'How do the formulas for aₙ, bₙ, and c₀ relate to the orthogonality of sine and cosine functions?',
		answer: 'The orthogonality property allows us to isolate the contribution of each harmonic component through integration.',
		difficulty: 'hard',
	},
];

export default function Flashcards(): JSX.Element {
    const [index, setIndex] = React.useState<number>(0);
    const [showAnswer, setShowAnswer] = React.useState<boolean>(false);
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
                <h1 className="text-2xl sm:text-3xl font-semibold text-text">Flashcards</h1>
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
            </main>
        </div>
    );
}
