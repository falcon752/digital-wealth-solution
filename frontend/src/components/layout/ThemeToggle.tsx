'use client';
import { useTheme } from 'next-themes';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(frame);
  }, []);
  if (!mounted) return <div className={`h-10 w-10 ${className}`} />;

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={`inline-flex h-10 w-10 items-center justify-center rounded-md text-cd-text transition-colors hover:bg-cd-raised ${className}`}
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <Sun size={19} strokeWidth={1.75} />
      ) : (
        <Moon size={19} strokeWidth={1.75} />
      )}
    </button>
  );
}
