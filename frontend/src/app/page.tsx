import Link from 'next/link';
import ThemeToggle from '@/components/layout/ThemeToggle';
import {
  Shield, Zap, Lock, ArrowRight, ChevronRight, Globe,
  TrendingUp, Users, CheckCircle, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen hero-bg dot-grid">
      {/* ── Navbar ─────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 glass border-b border-[var(--border-color)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-600/40">
              <Shield size={18} className="text-white" />
            </div>
            <span className="font-bold text-[var(--text-primary)]">
              Digital Wealth <span className="text-brand-400">Solution</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="text-sm font-medium text-[var(--text-muted)] hover:text-brand-400 transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:scale-105 shadow-lg shadow-brand-600/30"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 glass border border-brand-500/30 px-4 py-2 rounded-full text-xs font-semibold text-brand-400 mb-8">
          <Zap size={12} />
          Secure · Transparent · Reliable
        </div>
        <h1 className="text-5xl md:text-7xl font-black text-[var(--text-primary)] mb-6 leading-tight">
          Manage Your
          <br />
          <span className="gradient-text">Crypto Assets</span>
          <br />
          With Confidence
        </h1>
        <p className="text-lg md:text-xl text-[var(--text-muted)] max-w-2xl mx-auto mb-10">
          A centralized platform for secure crypto deposits and withdrawals.
          Full transparency, manual admin verification, and robust security at every step.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/register"
            className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-8 py-4 rounded-2xl transition-all hover:scale-105 shadow-xl shadow-brand-600/40 text-base"
          >
            Create Account <ArrowRight size={18} />
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 glass border border-[var(--border-color)] hover:border-brand-500/40 text-[var(--text-primary)] font-semibold px-8 py-4 rounded-2xl transition-all hover:scale-105 text-base"
          >
            Sign In <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Supported Assets', value: '10+', icon: Globe },
            { label: 'Active Users', value: '500+', icon: Users },
            { label: 'Transactions', value: '2K+', icon: TrendingUp },
            { label: 'Uptime', value: '99.9%', icon: Zap },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="glass rounded-2xl p-5 text-center">
              <div className="w-10 h-10 rounded-xl bg-brand-600/15 flex items-center justify-center mx-auto mb-3">
                <Icon size={20} className="text-brand-400" />
              </div>
              <p className="text-2xl font-black text-[var(--text-primary)]">{value}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ───────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-4">
            How It <span className="gradient-text">Works</span>
          </h2>
          <p className="text-[var(--text-muted)] max-w-xl mx-auto">
            A simple, transparent process for all your crypto transactions
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Deposit Flow */}
          <div className="glass rounded-2xl p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <ArrowDownToLine size={20} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Deposit Process</h3>
            </div>
            <div className="space-y-4">
              {[
                'Select your crypto asset',
                'Get the platform wallet address & QR code',
                'Send funds to that address externally',
                'Submit your transaction hash for verification',
                'Admin confirms – balance is updated',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-600/20 text-brand-400 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-[var(--text-muted)]">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Withdraw Flow */}
          <div className="glass rounded-2xl p-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center">
                <ArrowUpFromLine size={20} className="text-brand-400" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Withdrawal Process</h3>
            </div>
            <div className="space-y-4">
              {[
                'Submit withdrawal request with amount & destination wallet',
                'Verify your identity via OTP sent to your email',
                'Optional 2FA confirmation for extra security',
                'Admin reviews and approves the request',
                'Funds sent externally – balance updated',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-600/20 text-brand-400 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-[var(--text-muted)]">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-4">
            Built for <span className="gradient-text">Security</span>
          </h2>
          <p className="text-[var(--text-muted)] max-w-xl mx-auto">
            Every feature is designed with your security in mind
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Lock,
              title: 'Two-Factor Authentication',
              desc: 'TOTP-based 2FA for sensitive actions including withdrawals and account changes.',
            },
            {
              icon: Shield,
              title: 'Anti-Phishing Protection',
              desc: 'Set a custom phrase shown in all platform communications to verify authenticity.',
            },
            {
              icon: CheckCircle,
              title: 'OTP Withdrawal Verification',
              desc: 'Every withdrawal requires a one-time code sent to your registered email.',
            },
            {
              icon: TrendingUp,
              title: 'Activity Logging',
              desc: 'All logins, deposits, withdrawals and admin actions are recorded for audit.',
            },
            {
              icon: Users,
              title: 'Manual Admin Verification',
              desc: 'All transactions are reviewed and confirmed by the admin before processing.',
            },
            {
              icon: Zap,
              title: 'Secure Architecture',
              desc: 'JWT auth, bcrypt hashing, rate limiting, and CORS protection built-in.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="glass rounded-2xl p-6 hover:glow-sm transition-all hover:border-brand-500/30 group">
              <div className="w-11 h-11 rounded-xl bg-brand-600/15 flex items-center justify-center mb-4 group-hover:bg-brand-600/25 transition-colors">
                <Icon size={22} className="text-brand-400" />
              </div>
              <h3 className="font-bold text-[var(--text-primary)] mb-2">{title}</h3>
              <p className="text-sm text-[var(--text-muted)] leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="glass rounded-3xl p-12 text-center glow-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-brand-600/10 to-transparent pointer-events-none rounded-3xl" />
          <h2 className="text-3xl md:text-4xl font-black text-[var(--text-primary)] mb-4 relative">
            Ready to Get <span className="gradient-text">Started?</span>
          </h2>
          <p className="text-[var(--text-muted)] mb-8 max-w-lg mx-auto relative">
            Create your free account and start managing your crypto portfolio with confidence.
          </p>
          <Link
            href="/register"
            className="relative inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white font-semibold px-10 py-4 rounded-2xl transition-all hover:scale-105 shadow-xl shadow-brand-600/40 text-base"
          >
            Create Free Account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-[var(--border-color)] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-brand-600 flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            <span className="font-bold text-sm text-[var(--text-primary)]">
              Digital Wealth Solution
            </span>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} Digital Wealth Solution. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
