import React from 'react';

type ModalProps = {
	open: boolean;
	onClose: () => void;
	title: string;
	children: React.ReactNode;
};

export default function Modal({ open, onClose, title, children }: ModalProps): JSX.Element | null {
	React.useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent): void => {
			if (e.key === 'Escape') onClose();
		};
		document.addEventListener('keydown', onKey);
		return () => document.removeEventListener('keydown', onKey);
	}, [open, onClose]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<button aria-label="Close" onClick={onClose} className="fixed inset-0 bg-black/60 cursor-default" />
			<div role="dialog" aria-modal="true" aria-labelledby="modal-title" className="relative z-10 w-full max-w-2xl rounded-2xl border p-6 shadow-xl" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-primary)'}}>
				<div className="flex items-start justify-between">
					<h2 id="modal-title" className="text-xl font-semibold text-text">{title}</h2>
					<button onClick={onClose} className="ml-4 rounded-md p-2 text-subtext hover:text-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-text" aria-label="Close dialog">✕</button>
				</div>
				<div className="mt-4 text-subtext">{children}</div>
			</div>
		</div>
	);
}


