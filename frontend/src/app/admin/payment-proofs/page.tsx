'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ExternalLink, Eye, FileText, MailCheck, MailWarning, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { paymentProofAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import { PaymentProof } from '@/types';

type Filter = 'pending' | 'approved' | 'declined' | 'all';

const EXPLORER = 'https://livenet.xrpl.org';

function tone(status: string) {
  if (status === 'approved' || status === 'verified') return 'bg-emerald-50 text-emerald-700';
  if (status === 'declined' || status === 'failed') return 'bg-red-50 text-red-700';
  if (status === 'pending' || status === 'pending_network' || status === 'manual_review') return 'bg-amber-50 text-amber-700';
  return 'bg-gray-100 text-gray-700';
}

function account(proof: PaymentProof) {
  return proof.userId && typeof proof.userId === 'object' ? proof.userId : null;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString() : '-';
}

export default function AdminPaymentProofsPage() {
  const [proofs, setProofs] = useState<PaymentProof[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('pending');
  const [search, setSearch] = useState('');
  const [reviewing, setReviewing] = useState<PaymentProof | null>(null);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [screenshotType, setScreenshotType] = useState('');
  const [screenshotLoading, setScreenshotLoading] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [activateAccount, setActivateAccount] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await paymentProofAPI.adminList();
      setProofs(response.data.proofs);
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Failed to load payment proofs'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Load the private screenshot for the proof being reviewed.
  useEffect(() => {
    if (!reviewing) return;
    let url: string | null = null;
    let cancelled = false;
    setScreenshotUrl(null);
    setScreenshotLoading(true);
    paymentProofAPI.adminScreenshot(reviewing.id)
      .then((response) => {
        if (cancelled) return;
        url = URL.createObjectURL(response.data);
        setScreenshotType(reviewing.screenshot.mimeType);
        setScreenshotUrl(url);
      })
      .catch(() => { if (!cancelled) toast.error('Could not load the screenshot'); })
      .finally(() => { if (!cancelled) setScreenshotLoading(false); });
    return () => { cancelled = true; if (url) URL.revokeObjectURL(url); };
  }, [reviewing?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const counts = useMemo(() => ({
    all: proofs.length,
    pending: proofs.filter((proof) => proof.status === 'pending').length,
    approved: proofs.filter((proof) => proof.status === 'approved').length,
    declined: proofs.filter((proof) => proof.status === 'declined').length,
  }), [proofs]);

  const visible = useMemo(() => proofs.filter((proof) => {
    const query = search.toLowerCase();
    const matches = filter === 'all' || proof.status === filter;
    return matches && (!query || `${proof.fullName} ${proof.email} ${proof.senderAddress} ${proof.transactionHash || ''}`.toLowerCase().includes(query));
  }), [proofs, filter, search]);

  const open = (proof: PaymentProof) => {
    setReviewing(proof);
    setAdminNote(proof.adminNote || '');
    setActivateAccount(true);
  };

  const review = async (status: 'approved' | 'declined') => {
    if (!reviewing) return;
    if (status === 'declined' && !adminNote.trim()) {
      toast.error('Enter the reason for declining. It is sent to the client.');
      return;
    }
    setSaving(true);
    try {
      const response = await paymentProofAPI.adminReview(reviewing.id, {
        status, adminNote: adminNote.trim() || undefined, activateAccount,
      });
      const next: PaymentProof = response.data.proof;
      setProofs((current) => current.map((proof) => (proof.id === next.id ? next : proof)));
      setReviewing(next);
      const emailed = response.data.emailDelivery?.success;
      const acct = response.data.account;
      if (status === 'declined') {
        toast.success(emailed ? 'Declined. The client has been emailed the reason.' : 'Declined, but the client email failed. The attempt is recorded.');
      } else if (acct?.activated) {
        toast.success(`Approved and account activated.${emailed ? ' Confirmation email sent.' : ' The client email failed.'}`);
      } else if (acct?.linked) {
        toast.success(`Approved and recorded on the account.${emailed ? ' Confirmation email sent.' : ' The client email failed.'}`);
      } else {
        toast.success(`Approved.${emailed ? ' Confirmation email sent.' : ' The client email failed.'} It is applied when they create an account with this email.`);
      }
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Unable to review payment proof'));
    } finally {
      setSaving(false);
    }
  };

  const linked = reviewing ? account(reviewing) : null;
  const amountMismatch = reviewing?.expected?.amount
    ? Math.abs(Number(reviewing.amount) - Number(reviewing.expected.amount)) / Number(reviewing.expected.amount) > 0.02
    : false;

  return (
    <div className="min-h-full bg-[#f9f9fb] pb-20 dark:bg-[#050505]">
      <DashboardHeader title="Payment Proofs" subtitle={'Onboarding fee payments sent with "I have made this payment"'} logo="dwp" />
      <main className="mx-auto max-w-7xl space-y-5 p-4 md:p-6">
        {loading ? <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" /></div> : (
          <>
            <section className="grid gap-3 sm:grid-cols-4">
              {(['pending', 'approved', 'declined', 'all'] as Filter[]).map((item) => (
                <button key={item} type="button" onClick={() => setFilter(item)} className={`border px-4 py-4 text-left ${filter === item ? 'border-blue-300 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30' : 'border-gray-200 bg-white dark:border-gray-800 dark:bg-[#101010]'}`}>
                  <p className="text-xs font-semibold capitalize text-gray-500">{item}</p>
                  <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{counts[item]}</p>
                </button>
              ))}
            </section>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, email, address or hash" className="h-11 w-full max-w-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-[#101010] dark:text-white" />
            <section className="overflow-hidden border border-gray-200 bg-white dark:border-gray-800 dark:bg-[#101010]">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-[#181818]">
                    <tr><th className="px-4 py-3">Client</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Wallet</th><th className="px-4 py-3">Account</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Submitted</th><th className="px-4 py-3 text-right">Review</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {visible.map((proof) => (
                      <tr key={proof.id} className="text-sm">
                        <td className="px-4 py-4"><p className="font-semibold text-gray-900 dark:text-white">{proof.fullName}</p><p className="text-xs text-gray-500">{proof.email}</p></td>
                        <td className="px-4 py-4 font-semibold text-gray-900 dark:text-white">{proof.amount} {proof.asset}</td>
                        <td className="px-4 py-4 text-gray-700 dark:text-gray-300">{proof.walletUsed}</td>
                        <td className="px-4 py-4 text-xs">{account(proof) ? <span className="text-emerald-700">Has account</span> : <span className="text-gray-500">No account yet</span>}</td>
                        <td className="px-4 py-4"><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold capitalize ${tone(proof.status)}`}>{proof.status}</span></td>
                        <td className="px-4 py-4 text-xs text-gray-500">{formatDate(proof.createdAt)}</td>
                        <td className="px-4 py-4 text-right"><button type="button" onClick={() => open(proof)} className="rounded-md p-2 text-blue-600 hover:bg-blue-50" title="Review payment proof"><Eye size={17} /></button></td>
                      </tr>
                    ))}
                    {!visible.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-gray-500">No payment proofs match this view.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </main>

      <Modal isOpen={Boolean(reviewing)} onClose={() => setReviewing(null)} title="Review payment proof" size="xl">
        {reviewing && (
          <div className="space-y-5">
            <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
              <dl className="divide-y divide-gray-100 border-y border-gray-100 text-sm dark:divide-gray-800 dark:border-gray-800">
                {([
                  ['Name', reviewing.fullName],
                  ['Email', reviewing.email],
                  ['Account', linked ? `${linked.firstName} ${linked.lastName} · ${(linked.onboardingStatus || '').replaceAll('_', ' ')}` : 'No DWP account with this email yet'],
                  ['Amount sent', `${reviewing.amount} ${reviewing.asset}`],
                  ['Expected', reviewing.expected?.amount ? `${reviewing.expected.amount} ${reviewing.asset} ($${reviewing.expected.feeUsd?.toLocaleString()} at the time)` : '-'],
                  ['Wallet / exchange', reviewing.walletUsed],
                  ['Submitted', formatDate(reviewing.createdAt)],
                ] as [string, string][]).map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[130px_1fr] gap-3 py-2.5"><dt className="text-gray-500">{label}</dt><dd className="break-words font-medium text-gray-900 dark:text-white">{value}</dd></div>
                ))}
                <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5"><dt className="text-gray-500">Sent from</dt><dd className="min-w-0"><a href={`${EXPLORER}/accounts/${encodeURIComponent(reviewing.senderAddress)}`} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 break-all font-mono text-xs text-blue-600 hover:underline">{reviewing.senderAddress}<ExternalLink size={12} className="mt-0.5 shrink-0" /></a></dd></div>
                <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5"><dt className="text-gray-500">Transaction</dt><dd className="min-w-0">{reviewing.transactionHash ? <a href={`${EXPLORER}/transactions/${reviewing.transactionHash}`} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1 break-all font-mono text-xs text-blue-600 hover:underline">{reviewing.transactionHash}<ExternalLink size={12} className="mt-0.5 shrink-0" /></a> : <span className="text-gray-500">Not provided</span>}</dd></div>
                {reviewing.ledgerCheck?.state && (
                  <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5"><dt className="text-gray-500">Ledger check</dt><dd><span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold capitalize ${tone(reviewing.ledgerCheck.state)}`}>{reviewing.ledgerCheck.state.replace('_', ' ')}</span>{reviewing.ledgerCheck.failureReason && <p className="mt-1 text-xs text-red-600">{reviewing.ledgerCheck.failureReason}</p>}</dd></div>
                )}
                {reviewing.note && <div className="grid grid-cols-[130px_1fr] gap-3 py-2.5"><dt className="text-gray-500">Client note</dt><dd className="whitespace-pre-wrap text-gray-900 dark:text-white">{reviewing.note}</dd></div>}
              </dl>

              <div>
                <p className="mb-2 text-sm font-semibold text-gray-800 dark:text-gray-200">Screenshot</p>
                <div className="flex min-h-48 items-center justify-center border border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-[#181818]">
                  {screenshotLoading ? <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                    : !screenshotUrl ? <p className="text-xs text-gray-500">Not available</p>
                    : screenshotType.startsWith('image/') && !screenshotType.includes('hei') ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <a href={screenshotUrl} target="_blank" rel="noreferrer"><img src={screenshotUrl} alt="Transaction screenshot" className="max-h-96 w-full object-contain" /></a>
                    ) : (
                      <a href={screenshotUrl} target="_blank" rel="noreferrer" download={reviewing.screenshot.originalName || 'payment-proof'} className="flex flex-col items-center gap-2 p-6 text-sm font-semibold text-blue-600"><FileText size={32} />Open file</a>
                    )}
                </div>
                {screenshotUrl && <a href={screenshotUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline">Open full size <ExternalLink size={12} /></a>}
              </div>
            </div>

            <p className="border-l-2 border-blue-500 pl-3 text-xs leading-5 text-gray-600 dark:text-gray-400">Check the sending address on the XRP Ledger explorer (link above) for a payment of about {reviewing.expected?.amount || reviewing.amount} {reviewing.asset} to {reviewing.expected?.destinationAddress || 'the official address'} before approving.{amountMismatch && <strong className="text-amber-700"> The amount the client entered differs from the expected amount by more than 2%.</strong>}</p>

            {reviewing.status === 'pending' ? (
              <div className="space-y-3">
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200">Note to the client <span className="font-normal text-gray-500">(required to decline; included in the email)</span>
                  <textarea rows={3} value={adminNote} onChange={(event) => setAdminNote(event.target.value)} className="mt-1.5 w-full border border-gray-200 bg-transparent p-3 text-sm dark:border-gray-700" placeholder="e.g. We could not find this payment on the ledger." />
                </label>
                {linked && (
                  <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300"><input type="checkbox" checked={activateAccount} onChange={(event) => setActivateAccount(event.target.checked)} />Also activate the client&apos;s account when approving</label>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => review('approved')} loading={saving} className="bg-emerald-600! text-white"><CheckCircle2 size={15} /> Approve Payment</Button>
                  <Button variant="outline" onClick={() => review('declined')} loading={saving} className="border-red-200 text-red-600"><XCircle size={15} /> Decline</Button>
                </div>
              </div>
            ) : (
              <div className={`p-4 text-sm ${tone(reviewing.status)}`}>
                <p className="font-semibold capitalize">{reviewing.status} {reviewing.reviewedAt ? `on ${formatDate(reviewing.reviewedAt)}` : ''}{reviewing.reviewedBy && typeof reviewing.reviewedBy === 'object' ? ` by ${reviewing.reviewedBy.firstName} ${reviewing.reviewedBy.lastName}` : ''}</p>
                {reviewing.adminNote && <p className="mt-1">Note: {reviewing.adminNote}</p>}
                {reviewing.status === 'approved' && !reviewing.onboardingPaymentId && <p className="mt-1">Waiting for the client to create an account with this email. The payment is applied automatically when they do.</p>}
              </div>
            )}

            <section>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Emails</h3>
              <div className="mt-2 divide-y divide-gray-100 border border-gray-100 px-3 dark:divide-gray-800 dark:border-gray-800">
                {reviewing.emailDeliveries.map((entry, index) => (
                  <div key={`${entry.template}-${index}`} className="flex items-center justify-between gap-4 py-2 text-xs">
                    <span className="flex items-center gap-2 text-gray-800 dark:text-gray-200">{entry.success ? <MailCheck size={14} className="text-emerald-600" /> : <MailWarning size={14} className="text-amber-600" />}{entry.template.replaceAll('_', ' ')}</span>
                    <span className="text-gray-500">{formatDate(entry.attemptedAt)}</span>
                  </div>
                ))}
                {!reviewing.emailDeliveries.length && <p className="py-2 text-xs text-gray-500">No emails recorded.</p>}
              </div>
            </section>
          </div>
        )}
      </Modal>
    </div>
  );
}
