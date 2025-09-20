import * as React from 'react';
import { motion, type SpringOptions } from 'framer-motion';

type Star = {
  id: number;
  left: number;
  top: number;
  size: number;
  duration: number;
  delay: number;
};

type StarsBackgroundProps = React.ComponentProps<'div'> & {
  factor?: number; // density factor (stars per pixel ~ factor)
  speed?: number; // base speed (lower is slower)
  transition?: SpringOptions;
  starColor?: string;
  pointerEvents?: boolean;
};

export function StarsBackground({
  factor = 0.05,
  speed = 50,
  transition = { stiffness: 50, damping: 20 },
  starColor = '#ffffff',
  pointerEvents = true,
  style,
  className,
  ...rest
}: StarsBackgroundProps): JSX.Element {
  const [stars, setStars] = React.useState<Star[]>([]);
  const containerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = containerRef.current ?? document.documentElement;
    const width = el.clientWidth;
    const height = el.clientHeight;
    const area = width * height;
    const count = Math.max(40, Math.floor((area / 10000) * factor));
    const next: Star[] = Array.from({ length: count }).map((_, i) => {
      const size = Math.random() < 0.85 ? Math.random() * 1.5 + 0.5 : Math.random() * 2.2 + 1.3;
      const duration = (Math.random() * 0.6 + 0.7) * (100 / speed);
      const delay = Math.random() * duration;
      return {
        id: i + 1,
        left: Math.random() * 100,
        top: Math.random() * 100,
        size,
        duration,
        delay,
      };
    });
    setStars(next);
  }, [factor, speed]);

  return (
    <div
      ref={containerRef}
      aria-hidden
      className={[
        'pointer-events-none fixed inset-0 z-0',
        pointerEvents ? '' : 'pointer-events-none',
        className ?? '',
      ].join(' ')}
      style={style}
      {...rest}
    >
      {stars.map((star) => (
        <motion.span
          key={star.id}
          initial={{ opacity: 0.2 }}
          animate={{
            opacity: [0.2, 0.8, 0.2],
            y: [0, -6, 0],
          }}
          transition={{
            duration: star.duration,
            delay: star.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            position: 'absolute',
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: star.size,
            height: star.size,
            borderRadius: 9999,
            background: starColor,
            boxShadow: `0 0 ${Math.max(2, star.size * 2)}px ${starColor}`,
          }}
        />
      ))}
    </div>
  );
}

export type { StarsBackgroundProps };


