import React from 'react';

export default function SocialProof(): JSX.Element {
	return (
		<section aria-labelledby="testimonials-heading" className="mx-auto max-w-7xl">
			<h2 id="testimonials-heading" className="text-2xl sm:text-3xl font-semibold text-text text-center">
				What students are saying
			</h2>
			<div className="mt-8 grid gap-6 sm:grid-cols-2">
				<figure className="rounded-2xl border border-border bg-white p-6">
					<blockquote className="text-subtext">EduTube Notes has made studying so much easier. The summaries are concise and to the point.</blockquote>
					<figcaption className="mt-4 font-medium text-text">John D.</figcaption>
				</figure>
				<figure className="rounded-2xl border border-border bg-white p-6">
					<blockquote className="text-subtext">I love how quickly I can review key concepts from my lectures. Game changer!</blockquote>
					<figcaption className="mt-4 font-medium text-text">Sarah L.</figcaption>
				</figure>
			</div>
		</section>
	);
}


