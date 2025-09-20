import React from 'react';

export default function Hero(): JSX.Element {
	return (
		<div className="grid lg:grid-cols-2 gap-10 items-center">
			<div>
				<h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-text mb-4">
					Boost productivity with smart lecture summaries
				</h1>
				<p className="text-lg text-subtext max-w-xl">
					Upload your lecture recordings and get structured notes and quizzes in seconds.
				</p>
				<div className="mt-8">
					<a
						id="upload"
						href="#upload"
						className="inline-flex items-center px-5 py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
					>
						Upload Lecture
					</a>
				</div>
			</div>
			<div>
				<div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
					<img
						className="rounded-xl w-full h-auto"
						src="/assets/hero-mock.png"
						alt="Lecture video with notes and quiz preview"
					/>
				</div>
			</div>
		</div>
	);
}


