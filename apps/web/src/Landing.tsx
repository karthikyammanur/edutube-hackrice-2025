import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import Features from './components/Features';
import FinalCTA from './components/FinalCTA';
import Footer from './components/Footer';

export default function Landing(): JSX.Element {
	return (
		<div className="min-h-dvh bg-background">
			<a
				className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 bg-white text-text px-3 py-2 rounded-md shadow"
				href="#main"
			>
				Skip to content
			</a>
			<header className="border-b border-border/80 bg-white">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<Header />
				</div>
			</header>
			<main id="main">
				<section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
					<Hero />
				</section>
				<section aria-labelledby="how-heading" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
					<HowItWorks />
				</section>
				<section aria-labelledby="features-heading" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
					<Features />
				</section>
				<section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
					<FinalCTA />
				</section>
			</main>
			<footer className="border-t border-border/80 bg-white">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
					<Footer />
				</div>
			</footer>
		</div>
	);
}


