import React from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { FadeIn } from './animate-ui/primitives/core/fade-in';
import { Upload, FileText, Shuffle, SquareStack } from 'lucide-react';

export default function Features(): JSX.Element {
	const flowRef = React.useRef<HTMLDivElement | null>(null);
	const { scrollYProgress } = useScroll({
		target: flowRef,
		offset: ['start 80%', 'end 20%'],
	});

	const lineWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);
	const s1 = useTransform(scrollYProgress, [0.0, 0.2], [0.5, 1], { clamp: true });
	const s2 = useTransform(scrollYProgress, [0.2, 0.45], [0.5, 1], { clamp: true });
	const s3 = useTransform(scrollYProgress, [0.45, 0.7], [0.5, 1], { clamp: true });
	const s4 = useTransform(scrollYProgress, [0.7, 1.0], [0.5, 1], { clamp: true });

	return (
		<section aria-label="Study flow" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
			<FadeIn y={8} once className="mb-6 sm:mb-8 text-center">
				<h2 id="features-heading" className="text-2xl sm:text-3xl font-semibold tracking-tight" style={{color: 'var(--text-primary)'}}>From upload to mastery</h2>
			</FadeIn>
			<div ref={flowRef} className="relative">
				<div className="relative mx-auto max-w-5xl">
					<div className="hidden md:block absolute left-0 right-0 top-8 h-1 rounded-full" style={{backgroundColor: 'var(--border-primary)'}} />
					<motion.div style={{ width: lineWidth, backgroundColor: 'var(--text-primary)' }} className="hidden md:block absolute left-0 top-8 h-1 rounded-full" />

					<div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
						<motion.div style={{ opacity: s1, scale: s1 }} className="relative flex flex-col items-start md:items-center">
							<FadeIn y={10} once>
								<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border shadow-sm" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
									<Upload className="h-6 w-6" style={{color: 'var(--text-primary)'}} />
								</div>
								<p className="mt-2 font-medium" style={{color: 'var(--text-primary)'}}>Upload</p>
								<p className="text-sm" style={{color: 'var(--text-secondary)'}}>Video or link</p>
							</FadeIn>
						</motion.div>

						<motion.div style={{ opacity: s2, scale: s2 }} className="relative flex flex-col items-start md:items-center">
							<FadeIn y={10} once>
								<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border shadow-sm" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
									<FileText className="h-6 w-6" style={{color: 'var(--text-primary)'}} />
								</div>
								<p className="mt-2 font-medium" style={{color: 'var(--text-primary)'}}>Notes</p>
								<p className="text-sm" style={{color: 'var(--text-secondary)'}}>Auto summaries</p>
							</FadeIn>
						</motion.div>

						<motion.div style={{ opacity: s3, scale: s3 }} className="relative flex flex-col items-start md:items-center">
							<FadeIn y={10} once>
								<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border shadow-sm" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
									<Shuffle className="h-6 w-6" style={{color: 'var(--text-primary)'}} />
								</div>
								<p className="mt-2 font-medium" style={{color: 'var(--text-primary)'}}>Quiz</p>
								<p className="text-sm" style={{color: 'var(--text-secondary)'}}>Self‑test</p>
							</FadeIn>
						</motion.div>

						<motion.div style={{ opacity: s4, scale: s4 }} className="relative flex flex-col items-start md:items-center">
							<FadeIn y={10} once>
								<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border shadow-sm" style={{borderColor: 'var(--border-primary)', backgroundColor: 'var(--bg-secondary)'}}>
									<SquareStack className="h-6 w-6" style={{color: 'var(--text-primary)'}} />
								</div>
								<p className="mt-2 font-medium" style={{color: 'var(--text-primary)'}}>Cards</p>
								<p className="text-sm" style={{color: 'var(--text-secondary)'}}>Spaced review</p>
							</FadeIn>
						</motion.div>
					</div>
				</div>
			</div>
		</section>
	);
}
