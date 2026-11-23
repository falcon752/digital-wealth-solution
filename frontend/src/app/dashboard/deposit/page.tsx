'use client';

/**
 * Deposit: first a list of assets as Anchorage rows with a search field, then the chosen asset's
 * deposit address (copyable, with the QR code when one is set), its network and memo, and the form
 * for telling us what was sent.
 */
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { ArrowDownToLine, ArrowLeft, Check, ChevronRight, Copy, Info, Loader2, Search } from 'lucide-react';
import { assetsAPI, depositsAPI, apiBase } from '@/lib/api';
import { Asset } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, AssetIcon, AssetName, Card, EmptyState, PageHeader, Skeleton } from '@/components/client/ui';
import { cn } from '@/lib/utils';

const INPUT = 'h-11 w-full rounded-md border border-transparent bg-cd-input px-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';

/** A small muted label over a field, with the field's error under it. */
function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] text-cd-muted">{label}</span>
      {children}
      {error && <span className="mt-1.5 block text-[12px] text-cd-negative">{error}</span>}
    </label>
  );
}

/** One label / value line of a details list. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-cd-line py-3.5 last:border-b-0">
      <span className="shrink-0 text-[13.5px] text-cd-muted">{label}</span>
      <div className="min-w-0 text-right text-[14px] text-cd-text">{children}</div>
    </div>
  );
}

const schema = z.object({
  amount: z.string().min(1, 'Enter amount').refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be > 0'),
  txHash: z.string().optional(),
  usdValue: z.string().optional(),
});

type DepositForm = z.infer<typeof schema>;

export default function DepositPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<DepositForm>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    assetsAPI.list().then((res) => {
      const fetchedAssets = res.data.assets || [];
      setAssets(fetchedAssets);
      
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search);
        const preselectedSymbol = searchParams.get('asset');
        if (preselectedSymbol) {
          const match = fetchedAssets.find((a: Asset) => a.symbol.toUpperCase() === preselectedSymbol.toUpperCase());
          if (match) setSelectedAsset(match);
        }
      }
    }).catch(console.error).finally(() => setAssetsLoaded(true));
  }, []);

  const copyAddress = async () => {
    if (!selectedAsset) return;
    await navigator.clipboard.writeText(selectedAsset.walletAddress);
    setCopied(true);
    toast.success('Address copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const onSubmit = async (data: DepositForm) => {
    if (!selectedAsset) return;
    setIsSubmitting(true);
    try {
      await depositsAPI.create({
        assetId: selectedAsset.id,
        amount: Number(data.amount),
        txHash: data.txHash,
        usdValue: data.usdValue ? Number(data.usdValue) : undefined,
      });
      toast.success('Deposit submitted! Awaiting admin confirmation.');
      setSubmitted(true);
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.error || 'Failed to submit deposit';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFlow = () => {
    setSubmitted(false);
    setSelectedAsset(null);
    reset();
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col bg-cd-page pb-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
          <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-cd-positive/10 text-cd-positive">
            <Check size={30} strokeWidth={2.25} />
          </span>
          <h2 className="text-[24px] font-normal text-cd-text">Deposit submitted</h2>
          <p className="mt-2 max-w-[320px] text-[14px] leading-relaxed text-cd-muted">
            Your deposit request has been submitted. The admin will verify and confirm your balance shortly.
          </p>
        </div>

        <div className="mx-auto flex w-full max-w-[400px] flex-col gap-2.5 px-4">
          <ActionButton href="/dashboard" variant="primary" className="h-11 w-full">Done</ActionButton>
          <ActionButton onClick={resetFlow} variant="ghost" className="h-11 w-full">Make another deposit</ActionButton>
        </div>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const shown = q
    ? assets.filter((a) => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q) || (a.network || '').toLowerCase().includes(q))
    : assets;

  return (
    <div className="min-h-full">
      <DashboardHeader title={selectedAsset ? `Deposit ${selectedAsset.symbol}` : 'Deposit'} backHref="/dashboard" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="mx-auto w-full max-w-[600px]">
          {!selectedAsset ? (
            <>
              <PageHeader icon={ArrowDownToLine} title="Deposit" titleOnPhone={false} meta={['Which asset would you like to receive?']} />

              <Card className="mt-6 lg:mt-8" bodyClassName="p-2 sm:p-3">
                <div className="relative px-1 pb-2 pt-1">
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search an asset (i.e. BTC)"
                    className={cn(INPUT, 'pr-10')}
                  />
                  <Search size={17} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-cd-muted" />
                </div>

                {!assetsLoaded ? (
                  <div className="space-y-5 px-3 py-4">
                    {[0, 1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-3.5">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-3 w-20" /></div>
                      </div>
                    ))}
                  </div>
                ) : shown.length === 0 ? (
                  <EmptyState icon={Search} title="No assets found" text={q ? 'Try another name or symbol.' : undefined} />
                ) : (
                  <ul>
                    {shown.map((a) => (
                      <li key={a.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedAsset(a)}
                          className="flex w-full items-center gap-3.5 rounded-md border-b border-cd-line px-3 py-3.5 text-left transition-colors last:border-b-0 hover:bg-cd-raised/60 sm:px-4"
                        >
                          <AssetIcon symbol={a.symbol} size={30} />
                          <div className="min-w-0 flex-1">
                            <AssetName symbol={a.symbol} name={a.name} network={a.network || a.name} />
                          </div>
                          <ChevronRight size={18} className="shrink-0 text-cd-faint" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="mb-4 inline-flex items-center gap-1.5 text-[13.5px] text-cd-muted hover:text-cd-text"
              >
                <ArrowLeft size={15} strokeWidth={1.75} />
                All assets
              </button>

              <div className="flex items-center gap-3.5">
                <AssetIcon symbol={selectedAsset.symbol} size={36} />
                <div className="min-w-0">
                  <h1 className="text-[24px] font-normal leading-tight text-cd-text">Deposit {selectedAsset.symbol}</h1>
                  <p className="mt-0.5 text-[13.5px] text-cd-muted">{selectedAsset.network || selectedAsset.name} network</p>
                </div>
              </div>

              <Card className="mt-6">
                {selectedAsset.qrCodeImage && (
                  <div className="mb-5 flex flex-col items-center">
                    <div className="rounded-lg bg-white p-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`${apiBase}${selectedAsset.qrCodeImage}`} alt="Wallet QR code" className="h-44 w-44 object-contain" />
                    </div>
                    <p className="mt-2.5 text-[13px] text-cd-muted">Scan the QR code to send to this address</p>
                  </div>
                )}

                <p className="mb-1.5 text-[13px] text-cd-muted">Deposit address</p>
                <div className="flex items-center gap-2 rounded-md bg-cd-input py-1.5 pl-3.5 pr-1.5">
                  <p className="min-w-0 flex-1 break-all py-1.5 font-mono text-[13.5px] text-cd-text">{selectedAsset.walletAddress}</p>
                  <button
                    type="button"
                    onClick={copyAddress}
                    className="flex h-8 shrink-0 items-center gap-1.5 rounded px-2.5 text-[13px] font-medium text-cd-accent-text hover:bg-cd-accent-soft"
                  >
                    {copied ? <Check size={15} /> : <Copy size={15} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>

                <div className="mt-3">
                  <Row label="Asset">
                    {selectedAsset.symbol}
                    {selectedAsset.name.toUpperCase() !== selectedAsset.symbol.toUpperCase() && (
                      <><span className="mx-1.5 text-cd-faint">|</span>{selectedAsset.name}</>
                    )}
                  </Row>
                  <Row label="Network">{selectedAsset.network || selectedAsset.name}</Row>
                  <Row label="Memo / tag">
                    {selectedAsset.memo ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="break-all font-mono text-[13.5px]">{selectedAsset.memo}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(selectedAsset.memo!);
                            toast.success('Memo copied!');
                          }}
                          className="text-cd-accent-text hover:opacity-80"
                          aria-label="Copy memo"
                        >
                          <Copy size={15} />
                        </button>
                      </span>
                    ) : (
                      <span className="text-cd-muted">Not required</span>
                    )}
                  </Row>
                </div>

                <div className="mt-3 flex gap-3 rounded-md bg-cd-raised px-3.5 py-3 text-[13px] leading-relaxed text-cd-muted">
                  <Info size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-cd-text" />
                  <p>
                    Send only {selectedAsset.symbol} on the {selectedAsset.network || selectedAsset.name} network to this address
                    {selectedAsset.memo ? ', and include the memo above' : ''}.
                  </p>
                </div>
              </Card>

              <Card title="Confirm deposit" className="mt-5" bodyClassName="px-4 pb-4 sm:px-5 sm:pb-5">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <Field label="Amount sent" error={errors.amount?.message}>
                    <input type="number" step="any" placeholder="0.00" className={cn(INPUT, 'cd-num')} {...register('amount')} />
                  </Field>
                  <Field label="USD value (optional)" error={errors.usdValue?.message}>
                    <input type="number" step="any" placeholder="Estimated USD value" className={cn(INPUT, 'cd-num')} {...register('usdValue')} />
                  </Field>
                  <Field label="Transaction hash (optional)" error={errors.txHash?.message}>
                    <input placeholder="0x..." className={cn(INPUT, 'font-mono placeholder:font-sans')} {...register('txHash')} />
                  </Field>

                  <ActionButton type="submit" variant="primary" disabled={isSubmitting} className="mt-2 h-11 w-full">
                    {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                    Submit details
                  </ActionButton>
                </form>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
