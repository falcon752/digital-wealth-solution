'use client';

/**
 * The theme button. By default the site follows the device's light/dark setting ("Device"); a tap
 * cycles Device → Light → Dark → Device, for anyone who wants to override it.
 */
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

const NEXT: Record<string, string> = { system: 'light', light: 'dark', dark: 'system' };
const LABEL: Record<string, string> = { system: 'Device', light: 'Light', dark: 'Dark' };

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  if (!mounted) return <div className={`h-10 w-10 ${className}`} />;

  const current = theme && NEXT[theme] ? theme : 'system';
  const Icon = current === 'system' ? Monitor : current === 'dark' ? Moon : Sun;
  const title = `Theme: ${LABEL[current]}${current === 'system' ? ' (follows your device)' : ''}. Switch to ${LABEL[NEXT[current]]}.`;

  return (
    <button
      type="button"
      onClick={() => setTheme(NEXT[current])}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-md text-cd-text transition-colors hover:bg-cd-raised ${className}`}
      aria-label={title}
      title={title}
    >
      <Icon size={19} strokeWidth={1.75} />
    </button>
  );
}
