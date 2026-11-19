'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ImagePlus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { paymentProofAPI } from '@/lib/api';
import { getApiError } from '@/lib/apiError';
import { SupportedWalletLists } from '@/types';

interface PaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string;
  defaultEmail?: string;
  expectedAmount?: string;
  asset?: string;
  onSubmitted?: () => void;
}

const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPTED = 'image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf';
const fieldClass = 'w-full rounded-md border border-white/15 bg-[#2c2c2e] px-3 text-sm text-white placeholder:text-zinc-500 focus:border-[#7aa2ff] focus:outline-none [&_option]:bg-[#2c2c2e] [&_optgroup]:bg-[#2c2c2e]';
const inputClass = `mt-1.5 h-11 ${fieldClass}`;

export default function PaymentProofModal({ isOpen, onClose, defaultName = '', defaultEmail = '', expectedAmount, asset = 'XRP', onSubmitted }: PaymentProofModalProps) {
  const [fullName, setFullName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [senderAddress, setSenderAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [walletUsed, setWalletUsed] = useState('');
  const [transactionHash, setTransactionHash] = useState('');
  const [note, setNote] = useState('');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [lists, setLists] = useState<SupportedWalletLists | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => { if (defaultName) setFullName((current) => current || defaultName); }, [defaultName]);
  useEffect(() => { if (defaultEmail) setEmail((current) => current || defaultEmail); }, [defaultEmail]);

  useEffect(() => {
    if (!isOpen || lists) return;
    paymentProofAPI.wallets()
      .then((response) => setLists(response.data))
      .catch(() => toast.error('Could not load the wallet list. Please try again.'));
  }, [isOpen, lists]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const grouped = useMemo(() => (lists ? [
    { group: 'Wallets', items: lists.wallets },
    { group: 'Exchanges', items: lists.exchanges },
    { group: 'Other', items: [lists.other] },
  ] : []), [lists]);

  const pickFile = (file: File | null) => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    if (!file) { setScreenshot(null); return; }
    if (file.size > MAX_BYTES) {
      toast.error('The screenshot must be 8 MB or smaller');
      return;
    }
    setScreenshot(file);
    if (file.type.startsWith('image/') && !file.type.includes('heic') && !file.type.includes('heif')) setPreview(URL.createObjectURL(file));
  };

  const close = () => {
    onClose();
    if (done) {
      setDone(false);
      setSenderAddress(''); setAmount(''); setWalletUsed(''); setTransactionHash(''); setNote('');
      pickFile(null);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!screenshot) {
      toast.error('Upload a screenshot of the transaction as proof');
      return;
    }
    const data = new FormData();
    data.append('fullName', fullName.trim());
    data.append('email', email.trim());
    data.append('senderAddress', senderAddress.trim());
    data.append('amount', amount.trim());
    data.append('walletUsed', walletUsed);
    if (transactionHash.trim()) data.append('transactionHash', transactionHash.trim());
    if (note.trim()) data.append('note', note.trim());
    data.append('screenshot', screenshot);

    setSubmitting(true);
    try {
      await paymentProofAPI.submit(data);
      setDone(true);
      onSubmitted?.();
    } catch (error: unknown) {
      toast.error(getApiError(error, 'Could not send your payment proof. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    // Dark charcoal panel in every theme (DWP asked for pop-ups not to be plain white).
    <Modal isOpen={isOpen} onClose={close} title={done ? 'Payment proof sent' : 'I have made this payment'} size="lg" className="rounded-xl [--bg-card:#232325] [--border-color:rgba(255,255,255,0.12)] [--text-primary:#ffffff] [--text-muted:#a1a1aa]">
      {done ? (
        <div className="py-4 text-center">
          <CheckCircle2 size={44} className="mx-auto text-emerald-400" />
          <h3 className="mt-4 text-lg font-semibold text-white">Thank you, we have your payment details</h3>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-300">Our team will check the transfer and email you at <strong>{email}</strong> once it has been approved. If you have not created your account yet, use this same email so the payment is applied to it.</p>
          <Button onClick={close} className="mt-6 bg-[#2563eb]! px-8 text-white hover:bg-[#1d4ed8]!">Done</Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm leading-6 text-zinc-300">Tell us about the transfer you made and attach a screenshot of it. An administrator will review it and email you once it is approved.</p>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-zinc-100!">Full name
              <input required maxLength={120} value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} placeholder="Your full name" />
            </label>
            <label className="block text-sm font-semibold text-zinc-100!">Email address
              <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="The email for your DWP account" />
            </label>
          </div>

          <label className="block text-sm font-semibold text-zinc-100!">Address you sent the payment from
            <input required maxLength={120} value={senderAddress} onChange={(e) => setSenderAddress(e.target.value.trim())} className={`${inputClass} font-mono`} placeholder="e.g. r9bkaid… (your wallet address)" />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-zinc-100!">Amount sent ({asset})
              <input required inputMode="decimal" pattern="\d+(\.\d{1,6})?" value={amount} onChange={(e) => setAmount(e.target.value.trim())} className={inputClass} placeholder={expectedAmount ? `e.g. ${expectedAmount}` : 'e.g. 1021.94'} />
            </label>
            <label className="block text-sm font-semibold text-zinc-100!">Wallet or exchange used
              <select required value={walletUsed} onChange={(e) => setWalletUsed(e.target.value)} className={inputClass}>
                <option value="">{lists ? 'Select one' : 'Loading…'}</option>
                {grouped.map(({ group, items }) => (
                  <optgroup key={group} label={group}>
                    {items.map((name) => <option key={name} value={name}>{name}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm font-semibold text-zinc-100!">Transaction hash <span className="font-normal text-zinc-400">(optional)</span>
            <input maxLength={64} pattern="[A-Fa-f0-9]{64}" value={transactionHash} onChange={(e) => setTransactionHash(e.target.value.trim())} className={`${inputClass} font-mono`} placeholder="64-character transaction hash, if you have it" />
          </label>

          <div>
            <p className="text-sm font-semibold text-zinc-100">Screenshot of the transaction</p>
            {screenshot ? (
              <div className="mt-1.5 flex items-center gap-3 border border-white/15 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {preview ? <img src={preview} alt="Selected screenshot" className="h-16 w-16 shrink-0 object-cover" /> : <ImagePlus size={28} className="shrink-0 text-zinc-500" />}
                <div className="min-w-0 flex-1"><p className="truncate text-sm text-white">{screenshot.name}</p><p className="text-xs text-zinc-400">{(screenshot.size / 1024 / 1024).toFixed(2)} MB</p></div>
                <button type="button" onClick={() => pickFile(null)} className="rounded-md p-1.5 text-zinc-400 hover:bg-white/10" title="Remove screenshot"><X size={16} /></button>
              </div>
            ) : (
              <label className="mt-1.5 flex cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-white/15 px-4 py-6 text-center hover:border-[#7aa2ff]">
                <ImagePlus size={26} className="text-zinc-500" />
                <span className="text-sm font-semibold text-[#7aa2ff]">Upload screenshot</span>
                <span className="text-xs text-zinc-400">JPEG, PNG, WebP, HEIC or PDF, up to 8 MB</span>
                <input type="file" accept={ACCEPTED} className="sr-only" onChange={(e) => pickFile(e.target.files?.[0] || null)} />
              </label>
            )}
          </div>

          <label className="block text-sm font-semibold text-zinc-100!">Anything else we should know? <span className="font-normal text-zinc-400">(optional)</span>
            <textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} className={`mt-1.5 py-2 ${fieldClass}`} />
          </label>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="outline" onClick={close} className="flex-1">Cancel</Button>
            <Button type="submit" loading={submitting} className="flex-[2] bg-[#2563eb]! text-white hover:bg-[#1d4ed8]!">Submit payment proof</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
