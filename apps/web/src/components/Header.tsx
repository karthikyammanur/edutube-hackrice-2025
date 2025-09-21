import React from 'react';

export default function Header(): JSX.Element {
	return (
		<nav className="flex items-center justify-between py-4" aria-label="Primary">
			<div className="flex items-center gap-2">
				<img src="/assets/edutube.png" alt="EduTube logo" className="h-13 w-12	 rounded-sm object-contain" />
				<span className="text-lg font-semibold text-text">EduTube Notes</span>
			</div>
			
			<div className="flex items-center gap-3">
			</div>
		</nav>
	);
}


