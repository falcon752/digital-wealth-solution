'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { KeyRound, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { accessAPI } from '@/lib/api';

function AccessGatePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') || '/';

  const [mode, setMode] = useState<'code' | 'request'>('code');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch('/gate/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Invalid access code');
        return;
      }
      toast.success('Access granted!');
      router.push(next);
      router.refresh();
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    setSubmitting(true);
    try {
      await accessAPI.request({ name: name.trim(), email: email.trim(), reason: reason.trim() || undefined });
      toast.success('Request submitted! You will be emailed a code if approved.');
      setName('');
      setEmail('');
      setReason('');
      setMode('code');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to submit request';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-900 to-blue-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-900/40">
          <KeyRound size={36} className="text-white" strokeWidth={2} />
        </div>
        <h1 className="text-3xl font-semibold text-(--text-primary)">Restricted Access</h1>
        <p className="text-(--text-muted) text-sm mt-2 max-w-xs mx-auto">
          {mode === 'code'
            ? 'This site requires an access code. Enter yours below to continue.'
            : "Don't have a code yet? Request access below."}
        </p>
      </div>

      <div className="bg-white dark:bg-[#101010] border border-gray-200 dark:border-gray-700/50 rounded-2xl shadow-sm p-8">
        {mode === 'code' ? (
          <form onSubmit={handleVerify} className="space-y-4">
            <Input
              label="Access Code"
              placeholder="XXXXXXXX"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={8}
            />
            <Button type="submit" className="w-full mt-2 bg-blue-600! hover:bg-blue-700! shadow-blue-600/30! text-white" size="lg" loading={submitting}>
              Unlock
            </Button>
            <div className="text-center text-sm text-(--text-muted) pt-4 border-t border-gray-100 dark:border-gray-700/50 mt-4">
              Don&apos;t have a code?{' '}
              <button type="button" onClick={() => setMode('request')} className="text-blue-600 hover:text-blue-500 font-semibold transition-colors">
                Request Access
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRequest} className="space-y-4">
            <Input label="Full Name" placeholder="Jane Doe" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email Address" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Input label="Reason (optional)" placeholder="Why are you requesting access?" value={reason} onChange={(e) => setReason(e.target.value)} />
            <Button type="submit" className="w-full mt-2 bg-blue-600! hover:bg-blue-700! shadow-blue-600/30! text-white" size="lg" loading={submitting}>
              <Send size={16} /> Submit Request
            </Button>
            <div className="text-center text-sm text-(--text-muted) pt-4 border-t border-gray-100 dark:border-gray-700/50 mt-4">
              Already have a code?{' '}
              <button type="button" onClick={() => setMode('code')} className="text-blue-600 hover:text-blue-500 font-semibold transition-colors">
                Enter it here
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AccessGatePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
      </div>
    }>
      <AccessGatePageContent />
    </Suspense>
  );
}
