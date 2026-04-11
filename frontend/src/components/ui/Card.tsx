import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}

export default function Card({ children, className, glow }: CardProps) {
  return (
    <div
      className={cn(
        'glass rounded-2xl p-6',
        glow && 'glow-sm',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mb-5', className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h3 className={cn('text-lg font-semibold text-[var(--text-primary)]', className)}>
      {children}
    </h3>
  );
}
