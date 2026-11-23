'use client';

/**
 * The pop-up panel the dashboard's actions open in: from the right on a computer (like Anchorage's
 * wallet panel), from the bottom on a phone. The page behind is dimmed and stays where it was.
 * Escape or the X closes it; the backdrop closes it only when `dismissible` (so a half-filled form
 * or a security-code step isn't lost by a stray tap).
 */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/** True from 640px wide (the sheet comes from the right there, from the bottom below). */
function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia('(min-width: 640px)');
    const update = () => setWide(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return wide;
}

export function Sheet({ open, onClose, title, subtitle, icon, onBack, footer, children, dismissible = false, width = 'md' }: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Shows a back arrow in the header. */
  onBack?: () => void;
  /** Pinned under the content (e.g. the main button). */
  footer?: ReactNode;
  children: ReactNode;
  dismissible?: boolean;
  width?: 'md' | 'lg';
}) {
  const reduce = useReducedMotion();
  const wide = useIsWide();
  const panel = useRef<HTMLDivElement>(null);
  const hidden = wide ? { x: '100%', y: 0 } : { y: '100%', x: 0 };

  // Escape closes; the page behind doesn't scroll while the sheet is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = setTimeout(() => panel.current?.focus(), 50);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true">
          <motion.div
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={dismissible ? onClose : undefined}
          />
          <motion.div
            ref={panel}
            tabIndex={-1}
            className={cn(
              'cd-sheet absolute flex flex-col bg-cd-card text-cd-text shadow-2xl outline-none',
              // Phone: from the bottom, rounded top, up to most of the screen.
              'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-2xl',
              // Computer: a full-height panel on the right.
              'sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:rounded-none sm:border-l sm:border-cd-line',
              width === 'lg' ? 'sm:w-[560px]' : 'sm:w-[480px]',
            )}
            initial={reduce ? { opacity: 0 } : hidden}
            animate={reduce ? { opacity: 1 } : { y: 0, x: 0 }}
            exit={reduce ? { opacity: 0 } : hidden}
            transition={{ type: 'spring', stiffness: 380, damping: 38 }}
          >
            {/* Phone grabber */}
            <div className="flex justify-center pt-2.5 sm:hidden">
              <span className="h-1 w-10 rounded-full bg-cd-line-strong" />
            </div>

            <div className="flex items-start gap-3 border-b border-cd-line px-5 pb-4 pt-3 sm:pt-5">
              {onBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className="-ml-1.5 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-cd-muted hover:bg-cd-raised hover:text-cd-text"
                  aria-label="Back"
                >
                  <ArrowLeft size={18} strokeWidth={1.75} />
                </button>
              )}
              {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
              <div className="min-w-0 flex-1">
                {title && <h2 className="truncate text-[18px] font-medium leading-tight text-cd-text">{title}</h2>}
                {subtitle && <p className="mt-1 text-[13px] text-cd-muted">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="-mr-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-cd-muted hover:bg-cd-raised hover:text-cd-text"
                aria-label="Close"
              >
                <X size={18} strokeWidth={1.75} />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">{children}</div>

            {footer && <div className="border-t border-cd-line px-5 py-4 pb-[max(16px,env(safe-area-inset-bottom))]">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
