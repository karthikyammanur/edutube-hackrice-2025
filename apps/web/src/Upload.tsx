import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedPlusIcon } from './components/animate-ui/icons/plus';
import { Files, FolderItem, FolderTrigger, FolderContent, SubFiles, FileItem } from './components/animate-ui/components/radix/files';

function SectionCard(props: { children: React.ReactNode; className?: string; ariaLabel?: string }): JSX.Element {
	return (
		<section
			aria-label={props.ariaLabel}
			className={`rounded-2xl border border-border bg-white p-6 ${props.className ?? ''}`.trim()}
		>
			{props.children}
		</section>
	);
}

export default function Upload(): JSX.Element {
	return (
		<div className="min-h-dvh bg-background">
			<header className="sticky top-0 z-40 border-b border-border/80 bg-background">
				<div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
					<a href="#" className="text-lg font-semibold text-text">EduTube Notes</a>
					<a href="#" className="text-slate-600 hover:text-slate-900 underline-offset-4 hover:underline">Back to home</a>
				</div>
			</header>
            <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10" aria-labelledby="upload-heading">
				<h1 id="upload-heading" className="sr-only">Upload lecture</h1>
                <div className="grid gap-8 items-start lg:grid-cols-[320px_1fr]">
                    {/* Sidebar */}
                    <aside aria-label="Workspace navigation" className="lg:sticky lg:top-20 self-start">
                        <div className="rounded-2xl border border-border bg-white p-4">
                            <Files defaultOpen={["root"]}>
                                <FolderItem value="root">
                                    <FolderTrigger>Uploaded Video</FolderTrigger>
                                    <FolderContent>
                                        <SubFiles>
                                            <FileItem>Summary</FileItem>
                                            <FileItem>Quiz</FileItem>
                                            <FileItem>Flashcards</FileItem>
                                        </SubFiles>
                                    </FolderContent>
                                </FolderItem>
                            </Files>
                        </div>
                    </aside>

                    {/* Main upload area */}
                    <SectionCard ariaLabel="Lecture upload" className="">
						<p className="text-lg font-medium text-text">Lecture Upload</p>
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            transition={{ type: 'spring', stiffness: 120, damping: 14 }}
                            className="mt-4 rounded-2xl border-2 border-dashed border-border p-12 sm:p-12 min-h-[360px] max-w-md w-full mx-auto flex flex-col items-center justify-center text-center transition-colors"
                        >
                            <div className="h-16 w-16 rounded-xl bg-surface border border-border flex items-center justify-center text-text" aria-hidden>
                                <motion.div whileHover={{ scale: 1.08 }}>
                                    <AnimatedPlusIcon size={32} />
                                </motion.div>
                            </div>
							<p className="mt-6 font-medium text-text">Drag & drop your lecture video</p>
							<p className="text-subtext text-sm mt-1">MP4, WebM up to 1GB</p>
							<div className="mt-6">
								<label className="inline-flex items-center px-5 py-3 rounded-xl bg-text text-background font-medium hover:bg-primaryHover transition cursor-pointer focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-text">
									<input type="file" className="sr-only" aria-label="Browse files" />
									<span>Browse Files</span>
								</label>
							</div>
                        </motion.div>
                        <p className="mt-6 text-subtext text-sm">After upload, ask AI questions, get summaries, quizzes and flash cards — all without leaving this screen.</p>
					</SectionCard>
				</div>
			</main>
		</div>
	);
}


