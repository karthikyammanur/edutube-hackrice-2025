import React from 'react';

export default function Quiz(): JSX.Element {
	return (
		<div className="min-h-dvh bg-background">
			<header className="sticky top-0 z-40 border-b border-border/80 bg-background">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
					<a href="#" className="text-lg font-semibold text-text">EduTube Notes</a>
					<nav className="text-sm"><a href="#upload" className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline">Back to upload</a></nav>
				</div>
			</header>
			<main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
				<h1 className="text-2xl sm:text-3xl font-semibold text-text">Practice Quiz</h1>
				<div className="mt-6 space-y-4">
					<div className="rounded-2xl border border-border bg-white p-6">
						<p className="font-medium text-text">1) What is photosynthesis primarily used for?</p>
						<ul className="mt-3 space-y-2">
							<li><label className="flex items-center gap-3"><input type="radio" name="q1" className="h-4 w-4"/> <span className="text-subtext">Energy storage in plants</span></label></li>
							<li><label className="flex items-center gap-3"><input type="radio" name="q1" className="h-4 w-4"/> <span className="text-subtext">Nitrogen fixation</span></label></li>
							<li><label className="flex items-center gap-3"><input type="radio" name="q1" className="h-4 w-4"/> <span className="text-subtext">Protein synthesis</span></label></li>
						</ul>
					</div>
					<div className="rounded-2xl border border-border bg-white p-6">
						<p className="font-medium text-text">2) Which organelle performs photosynthesis?</p>
						<ul className="mt-3 space-y-2">
							<li><label className="flex items-center gap-3"><input type="radio" name="q2" className="h-4 w-4"/> <span className="text-subtext">Mitochondria</span></label></li>
							<li><label className="flex items-center gap-3"><input type="radio" name="q2" className="h-4 w-4"/> <span className="text-subtext">Chloroplast</span></label></li>
							<li><label className="flex items-center gap-3"><input type="radio" name="q2" className="h-4 w-4"/> <span className="text-subtext">Ribosome</span></label></li>
						</ul>
					</div>
					<div className="pt-2">
					<button className="inline-flex items-center px-5 py-3 rounded-xl bg-text text-background font-medium hover:bg-primaryHover transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-text">Submit answers</button>
					</div>
				</div>
			</main>
		</div>
	);
}


