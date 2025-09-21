import React from 'react';
import { FadeIn } from './animate-ui/primitives/core/fade-in';

type Feature = {
  title: string;
  copy: string;
  tag?: string;
};

const FEATURES: Feature[] = [
  {
    title: 'Upload video',
    copy: 'Drop a lecture or paste a link. We prep your workspace in seconds so you can start learning right away.',
    tag: 'Start',
  },
  {
    title: 'Summary',
    copy: 'Get clean, structured notes with timestamps to skim quicker and revisit what matters most.',
    tag: 'Notes',
  },
  {
    title: 'Quiz',
    copy: 'Generated questions help you self‑test immediately—no context switching needed.',
    tag: 'Practice',
  },
  {
    title: 'Flashcards',
    copy: 'Key terms become cards for spaced review so concepts actually stick.',
    tag: 'Review',
  },
];

export default function AlternatingFeatures(): JSX.Element {
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-20 space-y-12 sm:space-y-16">
      {FEATURES.map((f, idx) => {
        const isEven = idx % 2 === 0;
        return (
          <div key={f.title} className={`grid items-center gap-8 sm:gap-10 lg:gap-12 ${isEven ? 'lg:grid-cols-[1.1fr_1fr]' : 'lg:grid-cols-[1fr_1.1fr]'} lg:grid-cols-2`}>
            {/* Text */}
            <FadeIn once y={10} className={`${isEven ? '' : 'lg:order-2'}`}>
              {f.tag && (
                <p className="text-xs uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>{f.tag}</p>
              )}
              <h3 className="mt-2 text-2xl sm:text-3xl font-semibold" style={{color: 'var(--text-primary)'}}>{f.title}</h3>
              <p className="mt-3 max-w-prose" style={{color: 'var(--text-secondary)'}}>{f.copy}</p>
            </FadeIn>
            {/* Media placeholder */}
            <FadeIn once y={10} className={`${isEven ? '' : 'lg:order-1'}`}>
              <div className="aspect-video w-full rounded-2xl border grid place-items-center" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)'}}>
                <span>Demo clip coming soon</span>
              </div>
            </FadeIn>
          </div>
        );
      })}
    </div>
  );
}


