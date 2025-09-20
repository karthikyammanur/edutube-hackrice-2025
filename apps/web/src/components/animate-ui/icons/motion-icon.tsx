import * as React from 'react';
import { motion, type SVGMotionProps } from 'framer-motion';

type MotionIconProps = SVGMotionProps<SVGSVGElement> & {
  size?: number;
};

export function MotionIcon({ size = 24, children, ...rest }: MotionIconProps): JSX.Element {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      {children}
    </motion.svg>
  );
}

export type { MotionIconProps };


