'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Eye, MailCheck, MailWarning, RefreshCw, Save, Settings2, ShieldCheck, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { onboardingAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import { OnboardingConfig, OnboardingPayment } from '@/types';

type Filter = 'all' | 'under_review' | 'confirmed' | 'rejected';

function paymentUser(payment: OnboardingPayment) {
  return typeof payment.userId === 'string'
    ? { firstName: '', lastName: '', email: payment.email, onboardingStatus: undefined }
    : payment.userId;
}

function statusTone(status: string) {
  if (status === 'confirmed' || status === 'account_active' || status === 'verified') return 'bg-emerald-50 text-emerald-700';
  if (status === 'rejected' || status === 'failed') return 'bg-red-50 text-red-700';
  if (status === 'under_review' || status === 'pending_network') return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-700';
}

export default function AdminOnboardingPaymentsPage() {
  const [tab, setTab] = useState<'payments' | 'configuration'>('payments');
  const [payments, setPayments] = useState<OnboardingPayment[]>([]);
  const [config, setConfig] = useState<OnboardingConfig | null>(null);
  const [reviewing, setReviewing] = useState<OnboardingPayment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [filter, setFilter] = useState<Filter>('under_review');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [paymentsResponse, configResponse] = await Promise.all([
        onboardingAPI.adminPayments(), onboardingAPI.getConfig(),
      ]);
      setPayments(paymentsResponse.data.payments);
      setConfig(configResponse.data.config);
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to load onboarding payments'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => ({
    all: payments.length,
    under_review: payments.filter((payment) => payment.status === 'under_review').length,
    confirmed: payments.filter((payment) => payment.status === 'confirmed').length,
    rejected: payments.filter((payment) => payment.status === 'rejected').length,
  }), [payments]);

  const visiblePayments = useMemo(() => payments.filter((payment) => {
    const user = paymentUser(payment);
    const matchesFilter = filter === 'all' || payment.status === filter;
    const query = search.toLowerCase();
    return matchesFilter && (!query || `${user.firstName} ${user.lastName} ${user.email} ${payment.transactionReference}`.toLowerCase().includes(query));
  }), [payments, filter, search]);

  const replacePayment = (next: OnboardingPayment) => {
    const populatedUser = reviewing && typeof reviewing.userId !== 'string' ? reviewing.userId : null;
    const normalized = typeof next.userId === 'string' && populatedUser
      ? { ...next, userId: populatedUser }
      : next;
    setPayments((current) => current.map((payment) => payment.id === normalized.id ? normalized : payment));
    setReviewing(normalized);
  };

  const reverify = async () => {
    if (!reviewing) return;
    setSaving(true);
    try {
      const response = await onboardingAPI.adminReverify(reviewing.id);
      replacePayment(response.data.payment);
      toast.success('Transaction verification refreshed');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to recheck transaction'));
    } finally {
      setSaving(false);
    }
  };

  const review = async (status: 'confirmed' | 'rejected') => {
    if (!reviewing) return;
    if (status === 'rejected' && !rejectionReason.trim()) {
      toast.error('Enter a rejection reason');
      return;
    }
    setSaving(true);
    try {
      const response = await onboardingAPI.adminReview(reviewing.id, {
        status, rejectionReason: status === 'rejected' ? rejectionReason.trim() : undefined,
      });
      replacePayment(response.data.payment);
      setRejectionReason('');
      toast.success(status === 'confirmed' ? 'Payment confirmed; account activation is still pending' : 'Payment rejected');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to review payment'));
    } finally {
      setSaving(false);
    }
  };

  const activate = async () => {
    if (!reviewing) return;
    setSaving(true);
    try {
      const response = await onboardingAPI.adminActivate(reviewing.id);
      replacePayment(response.data.payment);
      await load();
      setReviewing(null);
      toast.success('Account activated and client notified');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to activate account'));
    } finally {
      setSaving(false);
    }
  };

  const saveConfig = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!config) return;
    setSaving(true);
    try {
      const response = await onboardingAPI.adminUpdateConfig({
        feeUsd: Number(config.feeUsd), renewalFeeUsd: Number(config.renewalFeeUsd),
        coverageMonths: Number(config.coverageMonths), asset: config.asset,
        network: config.network, assetAmount: config.assetAmount,
        destinationAddress: config.destinationAddress,
        destinationTag: config.destinationTag == null ? null : Number(config.destinationTag),
        quoteValidUntil: new Date(config.quoteValidUntil).toISOString(),
      });
      setConfig(response.data.config);
      toast.success('Active onboarding quote updated');
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to update onboarding quote'));
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (change: Partial<OnboardingConfig>) => setConfig((current) => current ? { ...current, ...change } : current);
  const reviewingUser = reviewing ? paymentUser(reviewing) : null;
  const accountActive = reviewingUser?.onboardingStatus === 'account_active';

  return (
    <div className="min-h-full bg-[#f9f9fb] pb-20 dark:bg-[#050505]">
      <DashboardHeader title="Onboarding Payments" subtitle="Verify transactions, confirm payments, and activate eligible accounts" logo="dwp" />
      <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
        <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-[#181818]">
          <button type="button" onClick={() => setTab('payments')} className={`flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold ${tab === 'payments' ? 'bg-white text-blue-600 shadow-sm dark:bg-[#101010]' : 'text-gray-500'}`}><ShieldCheck size={16} /> Payments</button>
          <button type="button" onClick={() => setTab('configuration')} className={`flex h-9 items-center gap-2 rounded-md px-4 text-sm font-semibold ${tab === 'configuration' ? 'bg-white text-blue-600 shadow-sm dark:bg-[#101010]' : 'text-gray-500'}`}><Settings2 size={16} /> Quote Configuration</button>
        </div>

        {loading ? <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div> : tab === 'payments' ? (
          <>
            <section className="grid gap-3 sm:grid-cols-4">
              {(['under_review', 'confirmed', 'rejected', 'all'] as Filter[]).map((item) => <button key={item} type="button" onClick={() => setFilter(item)} className={`border px-4 py-4 text-left ${filter === item ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30' : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-[#101010]'}`}><p className="text-xs font-semibold capitalize text-gray-500">{item.replace('_', ' ')}</p><p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{counts[item]}</p></button>)}
            </section>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search client, email, or transaction hash" className="h-11 w-full max-w-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-[#101010] dark:text-white" />
            <section className="overflow-hidden border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#101010]">
              <div className="overflow-x-auto"><table className="w-full text-left"><thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-[#181818]"><tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Quote</th><th className="px-4 py-3">Network Check</th><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Email</th><th className="px-4 py-3 text-right">Review</th></tr></thead><tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {visiblePayments.map((payment) => { const user = paymentUser(payment); const lastEmail = payment.emailDeliveries.at(-1); return <tr key={payment.id} className="text-sm"><td className="px-4 py-4"><p className="font-semibold text-gray-900 dark:text-white">{user.firstName} {user.lastName}</p><p className="text-xs text-gray-500">{user.email}</p></td><td className="px-4 py-4"><p className="font-semibold text-gray-900 dark:text-white">{payment.assetAmount} {payment.asset}</p><p className="text-xs text-gray-500">${payment.feeUsd.toLocaleString()}</p></td><td className="px-4 py-4"><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold capitalize ${statusTone(payment.verification.state)}`}>{payment.verification.state.replace('_', ' ')}</span></td><td className="px-4 py-4"><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold capitalize ${statusTone(payment.status)}`}>{payment.status.replace('_', ' ')}</span></td><td className="px-4 py-4">{lastEmail?.success ? <MailCheck size={18} className="text-emerald-600" /> : <MailWarning size={18} className="text-amber-600" />}</td><td className="px-4 py-4 text-right"><button type="button" onClick={() => { setReviewing(payment); setRejectionReason(payment.rejectionReason || ''); }} className="rounded-md p-2 text-blue-600 hover:bg-blue-50" title="Review payment"><Eye size={17} /></button></td></tr>; })}
                {!visiblePayments.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-500">No onboarding payments match this view.</td></tr>}
              </tbody></table></div>
            </section>
          </>
        ) : config ? (
          <form onSubmit={saveConfig} className="max-w-3xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-[#101010]">
            <div className="mb-6"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active payment quote</h2><p className="mt-1 text-sm text-gray-500">Clients can submit only while this quote is valid. Changes affect new payments; existing records retain their original snapshot.</p></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Initial fee (USD)<input type="number" min="0" required value={config.feeUsd} onChange={(event) => updateConfig({ feeUsd: Number(event.target.value) })} className="mt-1.5 h-11 w-full border border-gray-200 bg-transparent px-3 dark:border-gray-700" /></label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Renewal fee (USD)<input type="number" min="0" required value={config.renewalFeeUsd} onChange={(event) => updateConfig({ renewalFeeUsd: Number(event.target.value) })} className="mt-1.5 h-11 w-full border border-gray-200 bg-transparent px-3 dark:border-gray-700" /></label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Coverage (months)<input type="number" min="1" max="120" required value={config.coverageMonths} onChange={(event) => updateConfig({ coverageMonths: Number(event.target.value) })} className="mt-1.5 h-11 w-full border border-gray-200 bg-transparent px-3 dark:border-gray-700" /></label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">XRP amount<input required value={config.assetAmount} onChange={(event) => updateConfig({ assetAmount: event.target.value })} className="mt-1.5 h-11 w-full border border-gray-200 bg-transparent px-3 dark:border-gray-700" /></label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Asset<input required readOnly value={config.asset} className="mt-1.5 h-11 w-full border border-gray-200 bg-gray-50 px-3 dark:border-gray-700 dark:bg-[#181818]" /></label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Network<input required value={config.network} onChange={(event) => updateConfig({ network: event.target.value })} className="mt-1.5 h-11 w-full border border-gray-200 bg-transparent px-3 dark:border-gray-700" /></label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 sm:col-span-2">Official XRP destination<input required value={config.destinationAddress} onChange={(event) => updateConfig({ destinationAddress: event.target.value.trim() })} className="mt-1.5 h-11 w-full border border-gray-200 bg-transparent px-3 font-mono text-sm dark:border-gray-700" /></label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Destination tag (optional)<input type="number" min="0" value={config.destinationTag ?? ''} onChange={(event) => updateConfig({ destinationTag: event.target.value ? Number(event.target.value) : null })} className="mt-1.5 h-11 w-full border border-gray-200 bg-transparent px-3 dark:border-gray-700" /></label>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Quote valid until<input type="datetime-local" required value={new Date(config.quoteValidUntil).toISOString().slice(0, 16)} onChange={(event) => event.target.value && updateConfig({ quoteValidUntil: new Date(event.target.value).toISOString() })} className="mt-1.5 h-11 w-full border border-gray-200 bg-transparent px-3 dark:border-gray-700" /></label>
            </div>
            <Button type="submit" loading={saving} className="mt-6 bg-blue-600! text-white"><Save size={16} /> Save Active Quote</Button>
          </form>
        ) : null}
      </main>

      <Modal isOpen={!!reviewing} onClose={() => setReviewing(null)} title="Review Onboarding Payment" size="lg">
        {reviewing && reviewingUser && <div className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2"><div className="bg-gray-50 p-3 dark:bg-[#181818]"><p className="text-xs text-gray-500">Client</p><p className="mt-1 font-semibold text-gray-900 dark:text-white">{reviewingUser.firstName} {reviewingUser.lastName}</p><p className="text-xs text-gray-500">{reviewingUser.email}</p></div><div className="bg-gray-50 p-3 dark:bg-[#181818]"><p className="text-xs text-gray-500">Account status</p><p className="mt-1 font-semibold capitalize text-gray-900 dark:text-white">{reviewingUser.onboardingStatus?.replaceAll('_', ' ') || '-'}</p></div></div>
          <dl className="divide-y divide-gray-100 border-y border-gray-100 text-sm dark:divide-gray-800 dark:border-gray-800"><div className="grid grid-cols-[130px_1fr] gap-3 py-3"><dt className="text-gray-500">Transaction</dt><dd className="break-all font-mono text-xs text-gray-900 dark:text-white">{reviewing.transactionReference}</dd></div><div className="grid grid-cols-[130px_1fr] gap-3 py-3"><dt className="text-gray-500">Destination</dt><dd className="break-all font-mono text-xs text-gray-900 dark:text-white">{reviewing.destinationAddress}</dd></div><div className="grid grid-cols-[130px_1fr] gap-3 py-3"><dt className="text-gray-500">Quote</dt><dd className="font-semibold text-gray-900 dark:text-white">{reviewing.assetAmount} {reviewing.asset} (${reviewing.feeUsd.toLocaleString()})</dd></div><div className="grid grid-cols-[130px_1fr] gap-3 py-3"><dt className="text-gray-500">Verification</dt><dd><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold capitalize ${statusTone(reviewing.verification.state)}`}>{reviewing.verification.state.replace('_', ' ')}</span>{reviewing.verification.failureReason && <p className="mt-2 text-xs text-red-600">{reviewing.verification.failureReason}</p>}</dd></div></dl>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={reverify} loading={saving}><RefreshCw size={15} /> Recheck Ledger</Button>{reviewing.status === 'under_review' && <Button onClick={() => review('confirmed')} disabled={!['verified', 'legacy_manual'].includes(reviewing.verification.state)} loading={saving} className="bg-emerald-600! text-white"><CheckCircle2 size={15} /> Confirm Payment</Button>}{reviewing.status === 'confirmed' && !accountActive && <Button onClick={activate} loading={saving} className="bg-blue-600! text-white"><ShieldCheck size={15} /> Activate Account</Button>}</div>
          {reviewing.status === 'under_review' && <div className="space-y-2"><label className="text-sm font-semibold text-gray-800 dark:text-gray-200">Rejection reason</label><textarea rows={3} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} className="w-full border border-gray-200 bg-transparent p-3 text-sm dark:border-gray-700" placeholder="Explain what the client needs to correct" /><Button variant="outline" onClick={() => review('rejected')} loading={saving} className="border-red-200 text-red-600"><XCircle size={15} /> Reject Payment</Button></div>}
          <section><h3 className="text-sm font-semibold text-gray-900 dark:text-white">History</h3><div className="mt-2 divide-y divide-gray-100 border border-gray-100 px-3 dark:divide-gray-800 dark:border-gray-800">{reviewing.statusHistory.map((entry, index) => <div key={`${entry.status}-${index}`} className="flex justify-between gap-4 py-3 text-xs"><span className="font-semibold capitalize text-gray-800 dark:text-gray-200">{entry.status.replaceAll('_', ' ')}</span><span className="text-gray-500">{new Date(entry.changedAt).toLocaleString()}</span></div>)}</div></section>
          <section><h3 className="text-sm font-semibold text-gray-900 dark:text-white">Email delivery</h3><div className="mt-2 divide-y divide-gray-100 border border-gray-100 px-3 dark:divide-gray-800 dark:border-gray-800">{reviewing.emailDeliveries.map((delivery, index) => <div key={`${delivery.template}-${index}`} className="flex items-start justify-between gap-4 py-3 text-xs"><div><p className="font-semibold text-gray-800 dark:text-gray-200">{delivery.template.replaceAll('_', ' ')}</p>{delivery.error && <p className="mt-1 text-red-600">{delivery.error}</p>}</div><span className={delivery.success ? 'text-emerald-600' : 'text-red-600'}>{delivery.success ? 'Submitted' : 'Failed'}</span></div>)}{!reviewing.emailDeliveries.length && <p className="py-3 text-xs text-gray-500">No email attempts recorded.</p>}</div></section>
        </div>}
      </Modal>
    </div>
  );
}
