import { cn } from '@/lib/utils';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  positive?: boolean;
  className?: string;
}

export default function StatCard({ label, value, icon, change, positive, className }: StatCardProps) {
  return (
    <div className={cn('glass rounded-2xl p-5 flex items-start gap-4', className)}>
      <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-brand-600/15 flex items-center justify-center text-brand-400">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-[var(--text-muted)] font-medium mb-1">{label}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)] truncate">{value}</p>
        {change && (
          <p className={cn('text-xs mt-1', positive ? 'text-emerald-400' : 'text-red-400')}>
            {change}
          </p>
        )}
      </div>
    </div>
  );
}
