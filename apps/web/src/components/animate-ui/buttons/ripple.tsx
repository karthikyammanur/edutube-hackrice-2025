import * as React from 'react';
import { motion, type HTMLMotionProps, type Transition } from 'framer-motion';
import { cn } from '@/lib/utils';

type CommonProps = {
  hoverScale?: number;
  tapScale?: number;
  rippleColor?: string; // CSS color or var
  rippleScale?: number;
  transition?: Transition;
  children?: React.ReactNode;
};

type ButtonAsButton = CommonProps & Omit<HTMLMotionProps<'button'>, 'onPointerDown' | 'children'> & {
  as?: 'button';
};
type ButtonAsLink = CommonProps & Omit<HTMLMotionProps<'a'>, 'onPointerDown' | 'children'> & {
  as: 'a';
};

type RippleButtonProps = ButtonAsButton | ButtonAsLink;

type Ripple = { id: number; x: number; y: number };

export function RippleButton(props: RippleButtonProps): JSX.Element {
  const {
    as = 'button',
    className,
    style,
    children,
    hoverScale = 1.03,
    tapScale = 0.98,
    rippleColor = 'var(--ripple-button-ripple-color, rgba(255,255,255,0.35))',
    rippleScale = 10,
    transition = { duration: 0.6, ease: 'easeOut' },
    ...rest
  } = props as RippleButtonProps & { as: 'button' | 'a' };

  const [ripples, setRipples] = React.useState<Ripple[]>([]);
  const idRef = React.useRef(0);
  const containerRef = React.useRef<HTMLButtonElement | HTMLAnchorElement | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    // Only primary clicks/taps
    if (e.button !== 0) return;
    const target = containerRef.current;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++idRef.current;
    setRipples((prev) => [...prev, { id, x, y }]);
    window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, (transition.duration ? transition.duration * 1000 : 600) + 50);
  };

  const Comp: any = as === 'a' ? motion.a : motion.button;

  return (
    <Comp
      ref={containerRef}
      className={cn(
        'relative inline-flex items-center justify-center overflow-hidden select-none',
        'rounded-xl px-5 py-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-text',
        'transition-colors',
        className,
      )}
      style={style}
      whileHover={{ scale: hoverScale }}
      whileTap={{ scale: tapScale }}
      onPointerDown={onPointerDown}
      {...(rest as any)}
    >
      {/* Ripples overlay */}
      <span aria-hidden className="pointer-events-none absolute inset-0">
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ opacity: 0.35, scale: 0 }}
            animate={{ opacity: 0, scale: rippleScale }}
            transition={transition}
            style={{
              position: 'absolute',
              left: r.x,
              top: r.y,
              width: 20,
              height: 20,
              translateX: '-50%',
              translateY: '-50%',
              borderRadius: 9999,
              background: rippleColor,
            }}
          />
        ))}
      </span>
      {/* Content */}
      <span className="relative z-10 inline-flex items-center">{children}</span>
    </Comp>
  );
}

export type { RippleButtonProps };


