import React from 'react';

const features: Array<{ title: string; description: string; icon: string }> = [
	{
		title: 'AI-powered search',
		description: 'Find key moments and concepts from any lecture.',
		icon: '🔍',
	},
	{
		title: 'Automatic notes',
		description: 'Receive clear, structured summaries for each lecture.',
		icon: '📝',
	},
	{
		title: 'Custom quizzes',
		description: 'Test your knowledge with auto-generated quizzes.',
		icon: '✅',
	},
];

export default function Features(): JSX.Element {
	return (
		<div>
			<h2 id="features-heading" className="text-2xl sm:text-3xl font-semibold text-text text-center">
				Features
			</h2>
			<ul className="mt-10 grid gap-6 sm:grid-cols-3">
				{features.map((f) => (
					<li key={f.title} className="rounded-2xl border border-border bg-white p-6 shadow-sm hover:shadow-md transition">
						<div className="mb-3 h-10 w-10 rounded-xl bg-surface border border-border flex items-center justify-center">
							<span aria-hidden className="text-blue-600 text-xl">{f.icon}</span>
						</div>
						<h3 className="font-medium text-text">{f.title}</h3>
						<p className="text-subtext mt-1 text-sm">{f.description}</p>
					</li>
				))}
			</ul>
		</div>
	);
}


