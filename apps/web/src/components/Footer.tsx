import React from 'react';

export default function Footer(): JSX.Element {
	return (
		<div className="py-8 text-sm text-subtext">
			<p className="mt-8 text-center">© {new Date().getFullYear()} EduTube Notes</p>
		</div>
	);
}


