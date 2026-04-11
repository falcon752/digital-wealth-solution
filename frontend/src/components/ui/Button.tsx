import { cn } from '@/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => {
    const base =
      'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-50 disabled:pointer-events-none';

    const variants = {
      primary:
        'bg-brand-600 hover:bg-brand-500 text-white shadow-lg hover:shadow-brand-600/40 hover:scale-[1.02] active:scale-[0.98]',
      secondary:
        'bg-brand-500/15 hover:bg-brand-500/25 text-brand-400 border border-brand-500/30 hover:border-brand-500/60 hover:scale-[1.02]',
      ghost:
        'hover:bg-brand-500/10 text-[var(--text-muted)] hover:text-brand-400',
      danger:
        'bg-red-600 hover:bg-red-500 text-white hover:scale-[1.02] active:scale-[0.98]',
      outline:
        'border border-[var(--border-color)] hover:border-brand-500/50 text-[var(--text-primary)] hover:bg-brand-500/5',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-sm',
      lg: 'px-7 py-3.5 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(base, variants[variant], sizes[size], className)}
        {...props}
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
