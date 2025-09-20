import * as React from 'react';
import { motion, type HTMLMotionProps } from 'framer-motion';

type FadeInProps = Omit<HTMLMotionProps<'div'>, 'initial' | 'animate' | 'whileInView' | 'transition'> & {
  y?: number;
  duration?: number;
  delay?: number;
  fade?: boolean;
  once?: boolean;
};

export function FadeIn({
  children,
  className,
  style,
  y = 8,
  duration = 0.4,
  delay = 0,
  fade = true,
  once = false,
  ...rest
}: FadeInProps): JSX.Element {
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: fade ? 0 : 1, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount: 0.2 }}
      transition={{ duration, delay, ease: 'easeOut' }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export type { FadeInProps };


