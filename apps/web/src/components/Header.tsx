import React from 'react';

export default function Header(): JSX.Element {
	return (
		<nav className="flex items-center justify-between py-4" aria-label="Primary">
			<div className="flex items-center gap-2">
				<div className="h-7 w-7 rounded-md" style={{backgroundColor: 'var(--accent-primary)'}} aria-hidden="true" />
				<span className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>EduTube Notes</span>
			</div>
			<div className="hidden md:flex items-center gap-8 text-sm">
				<a className="nav-link underline-offset-4 hover:underline" href="#how-heading">How it works</a>
				<a className="nav-link underline-offset-4 hover:underline" href="#features-heading">Features</a>
				<a className="nav-link underline-offset-4 hover:underline" href="#upload">Upload Video</a>
			</div>
			<div className="flex items-center gap-3">
				<a 
					href="#upload"
					className="btn inline-flex items-center px-4 py-2 rounded-lg transition focus-visible:outline focus-visible:outline-2"
					style={{backgroundColor: 'var(--accent-primary)', color: 'var(--text-inverse)', borderColor: 'var(--accent-primary)'}}
				>
					Get Started
				</a>
			</div>
		</nav>
	);
}


