'use client';

import { useEffect, useState } from 'react';
import { X, Shield, TrendingUp, Gift, Lock, Bell, Sparkles } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getRandomTip, AppTip } from '@/lib/tips';

const ICONS: Record<AppTip['icon'], typeof Shield> = {
  shield: Shield,
  'trending-up': TrendingUp,
  gift: Gift,
  lock: Lock,
  bell: Bell,
  sparkles: Sparkles,
};

const SESSION_KEY = 'dws_welcome_popup_shown';

export default function WelcomePopup() {
  const { user } = useAuth();
  const [tip, setTip] = useState<AppTip | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(SESSION_KEY) === user.id) return;

    setTip(getRandomTip());
    const timer = setTimeout(() => setVisible(true), 700);
    sessionStorage.setItem(SESSION_KEY, user.id);
    return () => clearTimeout(timer);
  }, [user]);

  if (!visible || !tip) return null;

  const Icon = ICONS[tip.icon];

  const close = () => setVisible(false);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/40 animate-in fade-in duration-200"
      onClick={close}
    >
      <div
        className="w-full sm:max-w-sm bg-cd-card rounded-t-[32px] sm:rounded-xl p-6 pb-safe shadow-2xl animate-in slide-in-from-bottom-full duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 rounded-xl bg-cd-accent-soft flex items-center justify-center">
            <Sparkles size={20} className="text-cd-accent-text" />
          </div>
          <button onClick={close} className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1">
            <X size={22} />
          </button>
        </div>

        <h2 className="text-[19px] font-semibold text-cd-text mb-1">
          Welcome back{user?.firstName ? `, ${user.firstName}` : ''}!
        </h2>
        <p className="text-[14px] text-cd-muted mb-5">
          We&apos;re glad to have you here. Here&apos;s a quick tip for today.
        </p>

        <div className="flex items-start gap-3 bg-cd-raised rounded-xl p-4 mb-6">
          <div className="w-9 h-9 rounded-lg bg-cd-card border border-cd-line flex items-center justify-center shrink-0">
            <Icon size={18} className="text-cd-accent-text" />
          </div>
          <div>
            <div className="text-[14px] font-semibold text-cd-text mb-0.5">{tip.title}</div>
            <div className="text-[13px] text-cd-muted leading-relaxed">{tip.message}</div>
          </div>
        </div>

        <button
          onClick={close}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[15px] transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
}
