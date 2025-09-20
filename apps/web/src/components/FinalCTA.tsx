import React from 'react';

export default function FinalCTA(): JSX.Element {
	return (
		<div id="cta" className="rounded-2xl border border-border bg-surface p-8 text-center">
			<h2 className="text-2xl sm:text-3xl font-semibold text-text">
				Turn lectures into study notes today.
			</h2>
			<div className="mt-6">
				<a
					href="#upload"
					className="inline-flex items-center px-5 py-3 rounded-xl bg-text text-background font-medium hover:bg-primaryHover transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-text"
				>
					Upload Lecture
				</a>
			</div>
		</div>
	);
}


