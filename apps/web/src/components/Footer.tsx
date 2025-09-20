import React from 'react';

export default function Footer(): JSX.Element {
	return (
		<div className="py-8 text-sm text-subtext">
			<div className="grid gap-6 sm:grid-cols-4">
				<div>
					<p className="font-medium text-text">About</p>
					<ul className="mt-3 space-y-2">
						<li><a className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline" href="#">Company</a></li>
						<li><a className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline" href="#">Blog</a></li>
					</ul>
				</div>
				<div>
					<p className="font-medium text-text">Support</p>
					<ul className="mt-3 space-y-2">
						<li><a className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline" href="#">Help center</a></li>
						<li><a className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline" href="#">Contact us</a></li>
					</ul>
				</div>
				<div>
					<p className="font-medium text-text">Legal</p>
					<ul className="mt-3 space-y-2">
						<li><a className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline" href="#">Privacy</a></li>
						<li><a className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline" href="#">Terms of service</a></li>
					</ul>
				</div>
				<div>
					<p className="font-medium text-text">Social</p>
					<ul className="mt-3 space-y-2">
						<li><a className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline" href="#">Twitter</a></li>
						<li><a className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline" href="#">GitHub</a></li>
					</ul>
				</div>
			</div>
			<p className="mt-8 text-center">© {new Date().getFullYear()} EduTube Notes</p>
		</div>
	);
}


