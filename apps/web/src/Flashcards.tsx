import React from 'react';

type Card = { term: string; definition: string };

const sample: Card[] = [
	{ term: 'Photosynthesis', definition: 'Process where plants convert light into chemical energy.' },
	{ term: 'Chlorophyll', definition: 'Pigment in plants that absorbs light for photosynthesis.' },
	{ term: 'Stomata', definition: 'Pores in leaves that allow gas exchange.' },
];

export default function Flashcards(): JSX.Element {
	const [index, setIndex] = React.useState<number>(0);
	const card = sample[index % sample.length];

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
				<div className="mt-6 flex flex-col items-center">
					<div className="w-full max-w-xl rounded-2xl border border-border bg-white p-10 text-center">
						<p className="text-sm uppercase tracking-wide text-subtext">Term</p>
						<p className="mt-2 text-2xl font-semibold text-text">{card.term}</p>
						<hr className="my-6 border-border" />
						<p className="text-subtext">{card.definition}</p>
					</div>
					<div className="mt-6 flex items-center gap-3">
					<button onClick={() => setIndex((i) => (i + sample.length - 1) % sample.length)} className="inline-flex items-center px-4 py-2 rounded-xl border border-border bg-surface text-text hover:shadow-md transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-text">Prev</button>
					<button onClick={() => setIndex((i) => (i + 1) % sample.length)} className="inline-flex items-center px-4 py-2 rounded-xl bg-text text-background hover:bg-primaryHover transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-text">Next</button>
					</div>
				</div>
			</main>
		</div>
	);
}


