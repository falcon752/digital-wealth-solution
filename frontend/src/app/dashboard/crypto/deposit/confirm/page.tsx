'use client';

/**
 * Second step of a crypto deposit: the address to send to (copyable, with the QR code when one is
 * set), the amount as a label / value list, then the transaction ID and an optional proof image.
 */
import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Copy, Check, Info, Loader2, Paperclip } from 'lucide-react';
import toast from 'react-hot-toast';
import Image from 'next/image';
import api from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, AssetIcon, Card } from '@/components/client/ui';
import { formatCurrency } from '@/lib/utils';

const INPUT = 'h-11 w-full rounded-md border border-transparent bg-cd-input px-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';

/** One label / value line of a details list. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-cd-line py-3.5 last:border-b-0">
      <span className="shrink-0 text-[13.5px] text-cd-muted">{label}</span>
      <div className="min-w-0 text-right text-[14px] text-cd-text">{children}</div>
    </div>
  );
}

export default function DepositConfirmPage() {
  const router = useRouter();
  const params = useSearchParams();

  const assetId = params.get('assetId') ?? '';
  const symbol = params.get('symbol') ?? '';
  const name = params.get('name') ?? '';
  const network = params.get('network') ?? `${symbol} Network`;
  const walletAddress = params.get('walletAddress') ?? '';
  const qrCodeImage = params.get('qrCodeImage') ?? '';
  const cryptoAmount = params.get('cryptoAmount') ?? '';

  const [txHash, setTxHash] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  }

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const form = new FormData();
      form.append('assetId', assetId);
      form.append('amount', cryptoAmount);
      form.append('usdValue', params.get('usdAmount') ?? '0');
      if (txHash.trim()) form.append('txHash', txHash.trim());
      if (proofFile) form.append('proofImage', proofFile);

      await api.post('/deposits', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.success('Deposit submitted for review!');
      router.push('/dashboard/crypto/deposits');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        'Failed to submit deposit';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  const apiBase =
    typeof window !== 'undefined'
      ? process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000'
      : 'http://localhost:5000';

  const qrSrc = qrCodeImage
    ? qrCodeImage.startsWith('http')
      ? qrCodeImage
      : `${apiBase}${qrCodeImage}`
    : null;

  const usdAmount = Number(params.get('usdAmount') ?? 0);

  return (
    <div className="min-h-full">
      <DashboardHeader title={`Deposit ${symbol}`} backHref="/dashboard/crypto/deposit" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="mx-auto w-full max-w-[600px]">
          <div className="flex items-center gap-3.5">
            {symbol && <AssetIcon symbol={symbol} size={36} />}
            <div className="min-w-0">
              <h1 className="text-[22px] font-normal leading-tight text-cd-text sm:text-[24px]">
                Confirm {name} ({symbol}) deposit
              </h1>
              <p className="mt-0.5 text-[13.5px] text-cd-muted">{network}</p>
            </div>
          </div>

          <Card className="mt-6">
            {qrSrc && (
              <div className="mb-5 flex flex-col items-center">
                <div className="rounded-lg bg-white p-2.5">
                  <Image src={qrSrc} alt="QR Code" width={176} height={176} className="h-44 w-44 object-contain" />
                </div>
                <p className="mt-2.5 text-[13px] text-cd-muted">Scan the QR code to send to this address</p>
              </div>
            )}

            <p className="mb-1.5 text-[13px] text-cd-muted">Deposit address</p>
            <div className="flex items-center gap-2 rounded-md bg-cd-input py-1.5 pl-3.5 pr-1.5">
              <p className="min-w-0 flex-1 break-all py-1.5 font-mono text-[13.5px] text-cd-text">
                {walletAddress || <span className="font-sans text-cd-faint">No address configured</span>}
              </p>
              <button
                type="button"
                onClick={handleCopy}
                className="flex h-8 shrink-0 items-center gap-1.5 rounded px-2.5 text-[13px] font-medium text-cd-accent-text hover:bg-cd-accent-soft"
              >
                {copied ? <Check size={15} /> : <Copy size={15} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="mt-3">
              <Row label="Amount to deposit">
                <span className="cd-num">{cryptoAmount} <span className="text-[12px] text-cd-muted">{symbol}</span></span>
                {usdAmount > 0 && <p className="cd-num mt-0.5 text-[12.5px] text-cd-muted">≈ {formatCurrency(usdAmount)} USD</p>}
              </Row>
              <Row label="Asset">
                {symbol}
                {name && name.toUpperCase() !== symbol.toUpperCase() && <><span className="mx-1.5 text-cd-faint">|</span>{name}</>}
              </Row>
              <Row label="Network">{network}</Row>
            </div>

            <div className="mt-3 flex gap-3 rounded-md bg-cd-raised px-3.5 py-3 text-[13px] leading-relaxed text-cd-muted">
              <Info size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-cd-text" />
              <p>
                Send {cryptoAmount ? `${cryptoAmount} ${symbol}` : symbol} to the address above, then enter the
                transaction ID so we can match your deposit.
              </p>
            </div>
          </Card>

          <Card className="mt-5">
            <div className="space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-[13px] text-cd-muted">Transaction ID</span>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="Enter transaction ID"
                  className={`${INPUT} font-mono placeholder:font-sans`}
                />
              </label>

              <div>
                <p className="mb-1.5 text-[13px] text-cd-muted">Proof of payment</p>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className={`${INPUT} flex items-center gap-2.5 text-left`}
                >
                  <Paperclip size={16} strokeWidth={1.75} className="shrink-0 text-cd-muted" />
                  <span className={`truncate ${proofFile ? 'text-cd-text' : 'text-cd-faint'}`}>
                    {proofFile ? proofFile.name : 'Choose an image'}
                  </span>
                </button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1.5 text-[12px] text-cd-faint">Upload a screenshot of the payment (optional)</p>
              </div>
            </div>
          </Card>

          <ActionButton variant="primary" onClick={handleSubmit} disabled={submitting} className="mt-6 h-11 w-full">
            {submitting && <Loader2 size={16} className="animate-spin" />}
            {submitting ? 'Submitting…' : 'Confirm deposit'}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
