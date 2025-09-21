import React from 'react';
import { RippleButton } from './animate-ui/buttons/ripple';

function UploadIcon(): JSX.Element {
	return (
		<svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 mr-2 rotate-180"><path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v8.586l2.293-2.293a1 1 0 1 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 1 1 1.414-1.414L11 12.586V4a1 1 0 0 1 1-1ZM5 19a1 1 0 1 0 0 2h14a1 1 0 1 0 0-2H5Z"/></svg>
	);
}

export default function Hero(): JSX.Element {
	return (
		<div className="max-w-4xl">
			<h1 className="mt-4 text-4xl font-medium leading-tight sm:text-5xl">
				Turn lectures into{" "}
				<span style={{ fontFamily: '"Playfair Display", serif' }} className="text-primary text-[1em] align-baseline leading-tight">
					smart
				</span>{" "}
				notes, interactive{" "}
				<span style={{ fontFamily: '"Playfair Display", serif' }} className="underline decoration-primary/30 underline-offset-4 text-[1em] align-baseline leading-tight">
					quizzes
				</span>
				, and flipping{" "}
				<span style={{ fontFamily: '"Playfair Display", serif' }} className="bg-surface px-2 py-0.5 rounded text-[1em] align-baseline leading-tight">
					flashcards
				</span>
				 — all on one screen.
			</h1>
			<p className="mt-4 text-base md:text-lg text-subtext max-w-3xl">
				Upload any lecture video and ask questions, get summaries, test yourself, and review key terms without switching tabs.
			</p>
			<div className="mt-8 flex flex-wrap items-center gap-3">
				<RippleButton
					as="a"
					href="#upload"
					className="bg-text text-background hover:bg-primaryHover"
					style={{ ['--ripple-button-ripple-color' as any]: 'rgba(0,0,0,0.25)' }}
				>
					<UploadIcon />
					Upload a video
				</RippleButton>
			</div>

		</div>
	);
}

