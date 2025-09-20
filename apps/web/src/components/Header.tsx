import React from 'react';

export default function Header(): JSX.Element {
	return (
		<nav className="flex items-center justify-between py-4" aria-label="Primary">
			<div className="flex items-center gap-2">
				<div className="h-7 w-7 rounded-md bg-text" aria-hidden="true" />
				<span className="text-lg font-semibold text-text">EduTube Notes</span>
			</div>
			<div className="hidden md:flex items-center gap-8 text-sm">
				<a className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline" href="#how-heading">How it works</a>
				<a className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline" href="#features-heading">Features</a>
			</div>
			<div className="flex items-center gap-3">
			</div>
		</nav>
	);
}


