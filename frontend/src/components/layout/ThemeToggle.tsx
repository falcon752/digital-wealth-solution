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
  if (!mounted) return <div className="w-9 h-9" />;

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={`p-2 rounded-lg glass transition-all hover:scale-110 hover:glow-sm ${className}`}
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <Sun size={18} className="text-brand-400" />
      ) : (
        <Moon size={18} className="text-brand-600" />
      )}
    </button>
  );
}
