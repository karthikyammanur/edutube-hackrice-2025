import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import AlternatingFeatures from './components/AlternatingFeatures';
// Removed star background for minimal look

export default function Landing(): JSX.Element {
	return (
		<div className="relative min-h-dvh" style={{backgroundColor: 'var(--bg-primary)'}}>
			<a
				className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 px-3 py-2 rounded-md"
				style={{backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: 'var(--shadow-md)'}}
				href="#main"
			>
				Skip to content
			</a>
			<header className="sticky top-0 z-40 navbar" style={{borderBottomColor: 'var(--border-color)'}}>
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<Header />
				</div>
			</header>
			<main id="main">
				<section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-8 sm:pb-10">
					<Hero />
				</section>
				<section aria-labelledby="features-heading" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 -mt-[5vh] pb-8">
					<Features />
				</section>
				<section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-16">
					<AlternatingFeatures />
				</section>
			</main>
		</div>
	);
}
