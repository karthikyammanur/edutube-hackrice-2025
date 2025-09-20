import * as React from 'react';
import { motion, type SVGMotionProps } from 'framer-motion';

type AnimatedPlusIconProps = SVGMotionProps<SVGSVGElement> & {
  size?: number;
  strokeWidth?: number;
  color?: string;
};

export function AnimatedPlusIcon({
  size = 32,
  strokeWidth = 2.2,
  color = 'currentColor',
  ...rest
}: AnimatedPlusIconProps): JSX.Element {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial="hidden"
      animate="visible"
      whileHover="hover"
      {...rest}
    >
      <motion.line
        x1="12" y1="5" x2="12" y2="19"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        variants={{
          hidden: { pathLength: 0 },
          visible: { pathLength: 1, transition: { duration: 0.5, ease: 'easeOut' } },
          hover: { scale: 1.06 },
        }}
        style={{ originX: 0.5, originY: 0.5 }}
      />
      <motion.line
        x1="5" y1="12" x2="19" y2="12"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        variants={{
          hidden: { pathLength: 0 },
          visible: { pathLength: 1, transition: { duration: 0.5, ease: 'easeOut', delay: 0.08 } },
          hover: { scale: 1.06 },
        }}
        style={{ originX: 0.5, originY: 0.5 }}
      />
    </motion.svg>
  );
}

export type { AnimatedPlusIconProps };


