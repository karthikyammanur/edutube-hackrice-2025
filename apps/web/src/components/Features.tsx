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
				<h2 id="features-heading" className="text-2xl sm:text-3xl font-semibold tracking-tight text-text">From upload to mastery</h2>
			</FadeIn>
			<div ref={flowRef} className="relative">
				<div className="relative mx-auto max-w-5xl">
					<div className="hidden md:block absolute left-0 right-0 top-8 h-1 rounded-full bg-border" />
					<motion.div style={{ width: lineWidth }} className="hidden md:block absolute left-0 top-8 h-1 rounded-full bg-text" />

					<div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
						<motion.div style={{ opacity: s1, scale: s1 }} className="relative flex flex-col items-start md:items-center">
							<FadeIn y={10} once>
								<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-white shadow-sm">
								<Upload className="h-6 w-6 text-text" />
								</div>
								<p className="mt-2 font-medium text-text">Upload</p>
								<p className="text-sm text-subtext">Video or link</p>
							</FadeIn>
						</motion.div>

						<motion.div style={{ opacity: s2, scale: s2 }} className="relative flex flex-col items-start md:items-center">
							<FadeIn y={10} once>
								<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-white shadow-sm">
								<FileText className="h-6 w-6 text-text" />
								</div>
								<p className="mt-2 font-medium text-text">Notes</p>
								<p className="text-sm text-subtext">Auto summaries</p>
							</FadeIn>
						</motion.div>

						<motion.div style={{ opacity: s3, scale: s3 }} className="relative flex flex-col items-start md:items-center">
							<FadeIn y={10} once>
								<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-white shadow-sm">
								<Shuffle className="h-6 w-6 text-text" />
								</div>
								<p className="mt-2 font-medium text-text">Quiz</p>
								<p className="text-sm text-subtext">Self‑test</p>
							</FadeIn>
						</motion.div>

						<motion.div style={{ opacity: s4, scale: s4 }} className="relative flex flex-col items-start md:items-center">
							<FadeIn y={10} once>
								<div className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-border bg-white shadow-sm">
								<SquareStack className="h-6 w-6 text-text" />
								</div>
								<p className="mt-2 font-medium text-text">Cards</p>
								<p className="text-sm text-subtext">Spaced review</p>
							</FadeIn>
						</motion.div>
					</div>
				</div>
			</div>
		</section>
	);
}
