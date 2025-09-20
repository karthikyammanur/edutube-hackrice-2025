import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import Features from './components/Features';
import AlternatingFeatures from './components/AlternatingFeatures';
// Removed star background for minimal look

export default function Landing(): JSX.Element {
	return (
		<div className="relative min-h-dvh bg-background">
			<a
				className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-text bg-surface text-text px-3 py-2 rounded-md shadow"
				href="#main"
			>
				Skip to content
			</a>
			<header className="sticky top-0 z-40 border-b border-border/80 bg-background">
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
