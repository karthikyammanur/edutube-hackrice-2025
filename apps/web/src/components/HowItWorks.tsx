import React from 'react';

export default function HowItWorks(): JSX.Element {
	return (
		<div>
			<h2 id="how-heading" className="text-2xl sm:text-3xl font-semibold text-text text-center">
				How it works
			</h2>
			<dl className="mt-10 grid gap-8 sm:grid-cols-3" aria-label="Steps to use EduTube Notes">
				<div className="text-center">
					<div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-surface border border-border flex items-center justify-center">
						<span aria-hidden className="text-blue-600 text-xl">↑</span>
					</div>
					<dt className="font-medium text-text">Upload a lecture</dt>
					<dd className="text-subtext mt-1">Add your lecture or presentation video.</dd>
				</div>
				<div className="text-center">
					<div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-surface border border-border flex items-center justify-center">
						<span aria-hidden className="text-blue-600 text-xl">📝</span>
					</div>
					<dt className="font-medium text-text">Get notes & quiz</dt>
					<dd className="text-subtext mt-1">AI generates clean notes and practice questions.</dd>
				</div>
				<div className="text-center">
					<div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-surface border border-border flex items-center justify-center">
						<span aria-hidden className="text-blue-600 text-xl">🔎</span>
					</div>
					<dt className="font-medium text-text">Search & review</dt>
					<dd className="text-subtext mt-1">Search for topics in the video.</dd>
				</div>
			</dl>
		</div>
	);
}


