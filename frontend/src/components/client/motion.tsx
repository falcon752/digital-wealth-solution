'use client';

/**
 * Motion for the client dashboard: balances that count up, a price that flashes when it moves,
 * steps that flip or slide into each other, and an animated success mark. Everything falls back to
 * a plain fade (or no motion) when the device asks for reduced motion.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Money } from './ui';

/* ─── Counting numbers ──────────────────────────────────────────────────── */

/** Eases from the previous value to `value` (from 0 the first time). Reduced motion: jumps. */
export function useCountUp(value: number, duration = 900) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(reduce ? value : 0);

  useEffect(() => {
    if (reduce || !Number.isFinite(value)) {
      setShown(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(origin + (value - origin) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      from.current = value;
    };
  }, [value, duration, reduce]);

  return shown;
}

/** Money that counts up to its value. */
export function AnimatedMoney({ value, ...props }: React.ComponentProps<typeof Money>) {
  const shown = useCountUp(value);
  return <Money value={props.hidden ? value : shown} {...props} />;
}

/* ─── Price tick ────────────────────────────────────────────────────────── */

/** Wraps a price: briefly tints it green or red when it rises or falls. */
export function PriceTick({ value, children, className }: { value: number; children: ReactNode; className?: string }) {
  const previous = useRef(value);
  const [direction, setDirection] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (previous.current && value && value !== previous.current) {
      setDirection(value > previous.current ? 'up' : 'down');
      const timer = setTimeout(() => setDirection(null), 1200);
      previous.current = value;
      return () => clearTimeout(timer);
    }
    previous.current = value;
  }, [value]);

  return (
    <span
      className={cn(
        'rounded-sm transition-colors duration-700',
        direction === 'up' && 'bg-cd-positive/15 text-cd-positive',
        direction === 'down' && 'bg-cd-negative/15 text-cd-negative',
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ─── Steps ─────────────────────────────────────────────────────────────── */

const FLIP: Variants = {
  enter: (dir: number) => ({ rotateY: dir > 0 ? 75 : -75, opacity: 0 }),
  center: { rotateY: 0, opacity: 1, transition: { duration: 0.18, ease: 'easeOut' } },
  exit: (dir: number) => ({ rotateY: dir > 0 ? -75 : 75, opacity: 0, transition: { duration: 0.14, ease: 'easeIn' } }),
};

const SLIDE: Variants = {
  enter: (dir: number) => ({ x: dir > 0 ? 28 : -28, opacity: 0 }),
  center: { x: 0, opacity: 1, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: (dir: number) => ({ x: dir > 0 ? -28 : 28, opacity: 0, transition: { duration: 0.16, ease: 'easeIn' } }),
};

const FADE: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.15 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

/**
 * Shows one step at a time. Change `stepKey` to move on; `direction` 1 = forward, -1 = back.
 * `effect`: 'flip' (like turning a card over) or 'slide'.
 */
export function StepStage({ stepKey, direction = 1, effect = 'slide', children, className }: {
  stepKey: string;
  direction?: number;
  effect?: 'flip' | 'slide';
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const variants = reduce ? FADE : effect === 'flip' ? FLIP : SLIDE;
  return (
    <div className={cn('relative', className)} style={effect === 'flip' && !reduce ? { perspective: 1400 } : undefined}>
      <AnimatePresence mode="wait" custom={direction} initial={false}>
        <motion.div
          key={stepKey}
          custom={direction}
          variants={variants}
          initial="enter"
          animate="center"
          exit="exit"
          style={effect === 'flip' && !reduce ? { transformStyle: 'preserve-3d' } : undefined}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** A step bar ("Method → Asset → Address → Confirm"): done steps can be clicked to go back. */
export function StepBar({ steps, current, onSelect, className }: {
  steps: { key: string; label: string }[];
  current: string;
  onSelect?: (key: string) => void;
  className?: string;
}) {
  const index = Math.max(0, steps.findIndex((s) => s.key === current));
  return (
    <ol className={cn('flex items-center gap-1.5', className)}>
      {steps.map((step, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li key={step.key} className="flex min-w-0 flex-1 items-center gap-1.5">
            <button
              type="button"
              disabled={!done || !onSelect}
              onClick={() => onSelect?.(step.key)}
              className={cn('flex min-w-0 items-center gap-1.5 text-[12px]', active ? 'text-cd-text' : done ? 'text-cd-accent-text' : 'text-cd-faint')}
            >
              <span
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10.5px] font-medium transition-colors',
                  active ? 'bg-cd-accent text-white' : done ? 'bg-cd-accent-soft text-cd-accent-text' : 'bg-cd-raised text-cd-faint',
                )}
              >
                {done ? '✓' : i + 1}
              </span>
              <span className="truncate">{step.label}</span>
            </button>
            {i < steps.length - 1 && <span className={cn('h-px flex-1', i < index ? 'bg-cd-accent' : 'bg-cd-line')} />}
          </li>
        );
      })}
    </ol>
  );
}

/* ─── Success ───────────────────────────────────────────────────────────── */

/** An animated check in a ring, for "Submitted" screens. */
export function SuccessMark({ tone = 'positive', size = 72 }: { tone?: 'positive' | 'accent'; size?: number }) {
  const reduce = useReducedMotion();
  const color = tone === 'positive' ? 'var(--cd-positive)' : 'var(--cd-accent)';
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 72 72"
      initial={reduce ? false : { scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 18 }}
      aria-hidden
    >
      <circle cx="36" cy="36" r="34" fill={color} fillOpacity="0.12" />
      <motion.circle
        cx="36" cy="36" r="30" fill="none" stroke={color} strokeWidth="2"
        initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }}
      />
      <motion.path
        d="M23 37l9 9 17-19" fill="none" stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
        initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.35, delay: 0.35, ease: 'easeOut' }}
      />
    </motion.svg>
  );
}

/** Rows that fade up one after another when a list first appears. */
export function Stagger({ children, className, delay = 0.035 }: { children: ReactNode[]; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <div className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: i * delay, ease: 'easeOut' }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
