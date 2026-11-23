'use client';

/**
 * Deposit, as a guided flow: first "How would you like to deposit?" (USDT or other crypto), then the
 * USDT network or the asset, then the deposit address (copyable, with a QR code), and last the form
 * for telling us what was sent. Each step flips into the next and back again; with reduced motion
 * the steps simply cross-fade. ?asset=SYM opens the address of that asset straight away.
 */
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { AnimatePresence, motion, useReducedMotion, type Variants } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, Check, ChevronRight, Copy, Info, Loader2, Search, ShieldCheck,
} from 'lucide-react';
import { assetsAPI, depositsAPI, apiBase } from '@/lib/api';
import { Asset } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, AssetIcon, AssetName, Card, EmptyState, PageHeader, Skeleton, shortId } from '@/components/client/ui';
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

/* ─── Flow ──────────────────────────────────────────────────────────────── */

type Step = 'method' | 'asset' | 'address' | 'confirm';
type Method = 'usdt' | 'crypto';

const STEPS: { key: Step; label: string }[] = [
  { key: 'method', label: 'Method' },
  { key: 'asset', label: 'Asset' },
  { key: 'address', label: 'Address' },
  { key: 'confirm', label: 'Confirm' },
];

const isUsdt = (a: Asset) => /^USDT/i.test(a.symbol) || /tether/i.test(a.name);

/** "TRC20", "ERC20"… the token standard people know from their exchange, from the asset's network. */
function tokenStandard(a: Asset) {
  const n = `${a.network || ''} ${a.symbol}`.toLowerCase();
  if (/trc|tron/.test(n)) return 'TRC20';
  if (/bep|bsc|bnb|binance/.test(n)) return 'BEP20';
  if (/erc|ethereum|eth\b/.test(n)) return 'ERC20';
  if (/sol/.test(n)) return 'SPL';
  if (/polygon|matic/.test(n)) return 'Polygon';
  if (/arbitrum/.test(n)) return 'Arbitrum';
  return a.network || a.name;
}

const NETWORK_HINT: Record<string, string> = {
  TRC20: 'Tron network. Low fees, offered by most exchanges.',
  ERC20: 'Ethereum network. Widely supported, higher network fees.',
  BEP20: 'BNB Smart Chain. Low fees.',
  SPL: 'Solana network. Very low fees.',
};

/** One flip: the old step turns away, the new one turns in from the other side (~300ms in all). */
function stepVariants(reduce: boolean): Variants {
  if (reduce) {
    return {
      enter: { opacity: 0 },
      center: { opacity: 1, transition: { duration: 0.12 } },
      exit: { opacity: 0, transition: { duration: 0.08 } },
    };
  }
  return {
    enter: (dir: number) => ({ opacity: 0, rotateY: dir * 70, x: dir * 28 }),
    center: { opacity: 1, rotateY: 0, x: 0, transition: { duration: 0.16, ease: [0.2, 0.8, 0.2, 1] } },
    exit: (dir: number) => ({ opacity: 0, rotateY: dir * -70, x: dir * -28, transition: { duration: 0.14, ease: [0.4, 0, 1, 1] } }),
  };
}

/** Method → Asset → Address → Confirm, with done steps clickable to go back. */
function StepIndicator({ current, onJump, assetDone }: { current: Step; onJump: (step: Step) => void; assetDone?: string }) {
  const at = STEPS.findIndex((s) => s.key === current);
  return (
    <ol className="flex items-center gap-1.5 sm:gap-2" aria-label="Deposit steps">
      {STEPS.map((s, i) => {
        const done = i < at;
        const active = i === at;
        const content = (
          <>
            <span
              className={cn(
                'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition-colors duration-300',
                done && 'bg-cd-accent text-white',
                active && 'bg-cd-accent-soft text-cd-accent-text ring-1 ring-cd-accent',
                !done && !active && 'bg-cd-raised text-cd-faint',
              )}
            >
              {done ? <Check size={12} strokeWidth={2.5} /> : i + 1}
            </span>
            <span className={cn('truncate text-[12.5px] sm:text-[13px]', active ? 'text-cd-text' : done ? 'text-cd-muted' : 'text-cd-faint', !active && 'hidden sm:inline')}>
              {s.key === 'asset' && done && assetDone ? assetDone : s.label}
            </span>
          </>
        );
        return (
          <li key={s.key} className={cn('flex min-w-0 items-center gap-1.5 sm:gap-2', active && 'shrink-0')} aria-current={active ? 'step' : undefined}>
            {done ? (
              <button type="button" onClick={() => onJump(s.key)} className="flex min-w-0 items-center gap-2 rounded hover:opacity-80" title={`Back to ${s.label}`}>
                {content}
              </button>
            ) : (
              <span className="flex min-w-0 items-center gap-2">{content}</span>
            )}
            {i < STEPS.length - 1 && (
              <span className={cn('h-px w-4 shrink-0 transition-colors duration-300 sm:w-8', i < at ? 'bg-cd-accent' : 'bg-cd-line-strong')} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/** A large choice card on the first step. */
function MethodCard({ title, text, visual, footer, onClick, disabled }: {
  title: string;
  text: string;
  visual: React.ReactNode;
  footer: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      className={cn(
        'cd-card group flex w-full flex-col rounded-lg border border-cd-line p-5 text-left transition-[border-color,background-color] duration-200 dark:border-cd-line sm:p-6',
        disabled ? 'cursor-not-allowed opacity-55' : 'hover:border-cd-accent focus-visible:border-cd-accent focus-visible:outline-none',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {visual}
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cd-raised text-cd-muted transition-colors duration-200', !disabled && 'group-hover:bg-cd-accent group-hover:text-white')}>
          <ArrowRight size={16} strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-5 text-[17px] font-medium text-cd-text">{title}</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-cd-muted">{text}</p>
      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-cd-line pt-4">{footer}</div>
    </motion.button>
  );
}

function Chip({ children, tone = 'muted' }: { children: React.ReactNode; tone?: 'muted' | 'accent' }) {
  return (
    <span className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium', tone === 'accent' ? 'bg-cd-accent-soft text-cd-accent-text' : 'bg-cd-raised text-cd-muted')}>
      {children}
    </span>
  );
}

export default function DepositPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<Method | null>(null);
  const [dir, setDir] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = Boolean(useReducedMotion());

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
          if (match) {
            setSelectedAsset(match);
            // A preselected asset skips the chooser and opens its address.
            setMethod(isUsdt(match) ? 'usdt' : 'crypto');
            setStep('address');
          }
        }
      }
    }).catch(console.error).finally(() => setAssetsLoaded(true));
  }, []);

  const usdtAssets = assets.filter(isUsdt);
  const otherAssets = assets.filter((a) => !isUsdt(a));
  /** With a single USDT network there is nothing to pick: USDT goes straight to its address. */
  const usdtDirect = method === 'usdt' && usdtAssets.length === 1;

  const goTo = (next: Step, direction: 1 | -1) => {
    setDir(direction);
    setStep(next);
    rootRef.current?.closest('main')?.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const chooseMethod = (m: Method) => {
    setMethod(m);
    setSearch('');
    if (m === 'usdt' && usdtAssets.length === 1) {
      setSelectedAsset(usdtAssets[0]);
      goTo('address', 1);
    } else {
      setSelectedAsset(null);
      goTo('asset', 1);
    }
  };

  const chooseAsset = (a: Asset) => {
    setSelectedAsset(a);
    goTo('address', 1);
  };

  const back = () => {
    if (step === 'confirm') goTo('address', -1);
    else if (step === 'address') goTo(usdtDirect || !method ? 'method' : 'asset', -1);
    else goTo('method', -1);
  };

  const jump = (target: Step) => {
    if (target === 'asset' && usdtDirect) target = 'method';
    goTo(target, -1);
  };

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
    setMethod(null);
    setDir(-1);
    setStep('method');
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

  const listed = method === 'usdt' ? usdtAssets : otherAssets;
  const q = search.trim().toLowerCase();
  const shown = q
    ? listed.filter((a) => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q) || (a.network || '').toLowerCase().includes(q))
    : listed;

  const usdtNetworks = Array.from(new Set(usdtAssets.map(tokenStandard)));
  const stripAssets = otherAssets.slice(0, 6);
  const network = selectedAsset ? selectedAsset.network || selectedAsset.name : '';
  const assetDoneLabel = selectedAsset
    ? method === 'usdt' ? `USDT · ${tokenStandard(selectedAsset)}` : selectedAsset.symbol
    : undefined;
  const variants = stepVariants(reduceMotion);

  const backLabel = step === 'confirm' ? 'Address' : step === 'address' ? (usdtDirect || !method ? 'Deposit method' : method === 'usdt' ? 'USDT networks' : 'All assets') : 'Deposit method';

  return (
    <div ref={rootRef} className="min-h-full">
      <DashboardHeader title={selectedAsset && (step === 'address' || step === 'confirm') ? `Deposit ${selectedAsset.symbol}` : 'Deposit'} backHref="/dashboard" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="mx-auto w-full max-w-[640px]">
          <div className="flex min-h-[32px] items-center justify-between gap-3">
            <AnimatePresence initial={false}>
              {step !== 'method' && assetsLoaded ? (
                <motion.button
                  key="back"
                  type="button"
                  onClick={back}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 8 }}
                  transition={{ duration: 0.18 }}
                  className="inline-flex shrink-0 items-center gap-1.5 text-[13.5px] text-cd-muted hover:text-cd-text"
                >
                  <ArrowLeft size={15} strokeWidth={1.75} />
                  <span className="hidden sm:inline">{backLabel}</span>
                  <span className="sm:hidden">Back</span>
                </motion.button>
              ) : <span key="spacer" />}
            </AnimatePresence>
            {assetsLoaded && <StepIndicator current={step} onJump={jump} assetDone={assetDoneLabel} />}
          </div>

          {!assetsLoaded ? (
            <div className="mt-6 lg:mt-8">
              <Skeleton className="h-7 w-48" />
              <Skeleton className="mt-3 h-4 w-64" />
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <Skeleton className="h-[230px] rounded-lg" />
                <Skeleton className="h-[230px] rounded-lg" />
              </div>
            </div>
          ) : (
            <div className="mt-4 lg:mt-6" style={{ perspective: 1400 }}>
              <AnimatePresence mode="wait" initial={false} custom={dir}>
                <motion.div
                  key={step}
                  custom={dir}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  style={{ transformOrigin: 'center center', backfaceVisibility: 'hidden' }}
                >
                  {step === 'method' && (
                    <>
                      <PageHeader icon={ArrowDownToLine} title="Deposit" titleOnPhone={false} meta={['How would you like to deposit?']} />
                      <div className="mt-6 grid gap-4 sm:grid-cols-2">
                        <MethodCard
                          title="USDT (stablecoin)"
                          text="A dollar-pegged token, so 1 USDT stays worth about $1. The simplest way to fund your account in dollars."
                          disabled={usdtAssets.length === 0}
                          onClick={() => chooseMethod('usdt')}
                          visual={<AssetIcon symbol="USDT" size={44} />}
                          footer={usdtAssets.length === 0 ? (
                            <Chip>Not available right now</Chip>
                          ) : (
                            <>
                              <span className="mr-1 text-[12px] text-cd-muted">Networks</span>
                              {usdtNetworks.map((n) => <Chip key={n} tone="accent">{n}</Chip>)}
                            </>
                          )}
                        />
                        <MethodCard
                          title="Other crypto"
                          text="Send Bitcoin, Ethereum, XRP or another supported coin from your own wallet or exchange."
                          disabled={otherAssets.length === 0}
                          onClick={() => chooseMethod('crypto')}
                          visual={(
                            <div className="flex items-center">
                              {stripAssets.length === 0 ? <AssetIcon symbol="BTC" size={44} /> : stripAssets.map((a, i) => (
                                <span key={a.id} className="relative rounded-full ring-[3px] ring-cd-card" style={{ marginLeft: i === 0 ? 0 : -8, zIndex: stripAssets.length - i }}>
                                  <AssetIcon symbol={a.symbol} size={38} />
                                </span>
                              ))}
                            </div>
                          )}
                          footer={otherAssets.length === 0 ? (
                            <Chip>Not available right now</Chip>
                          ) : (
                            <>
                              {otherAssets.slice(0, 4).map((a) => <Chip key={a.id}>{a.symbol}</Chip>)}
                              {otherAssets.length > 4 && <Chip>+{otherAssets.length - 4} more</Chip>}
                            </>
                          )}
                        />
                      </div>
                      <div className="mt-5 flex gap-3 rounded-md bg-cd-raised px-3.5 py-3 text-[13px] leading-relaxed text-cd-muted">
                        <ShieldCheck size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-cd-text" />
                        <p>Every deposit is checked by our operations team on the network before it is credited to your account.</p>
                      </div>
                    </>
                  )}

                  {step === 'asset' && (
                    <>
                      <PageHeader
                        icon={method === 'usdt' ? undefined : ArrowDownToLine}
                        title={method === 'usdt' ? 'Choose the USDT network' : 'Choose an asset'}
                        titleOnPhone
                        meta={[method === 'usdt' ? 'Pick the same network your wallet or exchange will send on.' : 'Which asset would you like to receive?']}
                      />

                      <Card className="mt-6" bodyClassName="p-2 sm:p-3">
                        {method === 'crypto' && (
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
                        )}

                        {shown.length === 0 ? (
                          <EmptyState icon={Search} title="No assets found" text={q ? 'Try another name or symbol.' : undefined} />
                        ) : (
                          <ul>
                            {shown.map((a, i) => (
                              <motion.li
                                key={a.id}
                                initial={reduceMotion ? false : { opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.2, delay: reduceMotion ? 0 : 0.12 + Math.min(i, 8) * 0.03 }}
                              >
                                <button
                                  type="button"
                                  onClick={() => chooseAsset(a)}
                                  className="flex w-full items-center gap-3.5 rounded-md border-b border-cd-line px-3 py-3.5 text-left transition-colors last:border-b-0 hover:bg-cd-raised/60 sm:px-4"
                                >
                                  <AssetIcon symbol={method === 'usdt' ? 'USDT' : a.symbol} size={30} />
                                  <div className="min-w-0 flex-1">
                                    {method === 'usdt' ? (
                                      <>
                                        <p className="flex items-center gap-2 text-[14px] font-medium text-cd-text">
                                          USDT on {tokenStandard(a)}
                                          {a.network && tokenStandard(a) !== a.network && <span className="font-normal text-cd-muted">{a.network}</span>}
                                        </p>
                                        <p className="mt-0.5 text-[12px] text-cd-muted">{NETWORK_HINT[tokenStandard(a)] || `${a.name} on the ${a.network || a.name} network.`}</p>
                                      </>
                                    ) : (
                                      <AssetName symbol={a.symbol} name={a.name} network={a.network || a.name} />
                                    )}
                                  </div>
                                  <ChevronRight size={18} className="shrink-0 text-cd-faint" />
                                </button>
                              </motion.li>
                            ))}
                          </ul>
                        )}
                      </Card>

                      {method === 'usdt' && (
                        <div className="mt-4 flex gap-3 rounded-md bg-cd-raised px-3.5 py-3 text-[13px] leading-relaxed text-cd-muted">
                          <Info size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-cd-text" />
                          <p>USDT sent on a different network from the one you pick here cannot be credited and may be lost.</p>
                        </div>
                      )}
                    </>
                  )}

                  {step === 'address' && selectedAsset && (
                    <>
                      <div className="flex items-center gap-3.5">
                        <AssetIcon symbol={selectedAsset.symbol} size={36} />
                        <div className="min-w-0">
                          <h1 className="text-[24px] font-normal leading-tight text-cd-text">Deposit {selectedAsset.symbol}</h1>
                          <p className="mt-0.5 text-[13.5px] text-cd-muted">
                            {network} network{isUsdt(selectedAsset) && tokenStandard(selectedAsset) !== network ? ` (${tokenStandard(selectedAsset)})` : ''}
                          </p>
                        </div>
                      </div>

                      <Card className="mt-6">
                        <div className="mb-5 flex flex-col items-center">
                          <div className="rounded-lg bg-white p-2.5">
                            {selectedAsset.qrCodeImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={`${apiBase}${selectedAsset.qrCodeImage}`} alt="Wallet QR code" className="h-44 w-44 object-contain" />
                            ) : (
                              <QRCodeSVG value={selectedAsset.walletAddress} size={176} level="M" role="img" aria-label={`QR code of the ${selectedAsset.symbol} deposit address`} />
                            )}
                          </div>
                          <p className="mt-2.5 text-[13px] text-cd-muted">Scan the QR code to send to this address</p>
                        </div>

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
                          <Row label="Network">{network}{isUsdt(selectedAsset) && tokenStandard(selectedAsset) !== network ? ` (${tokenStandard(selectedAsset)})` : ''}</Row>
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
                          {Number(selectedAsset.minDeposit) > 0 && (
                            <Row label="Minimum deposit"><span className="cd-num">{selectedAsset.minDeposit} {selectedAsset.symbol}</span></Row>
                          )}
                        </div>

                        <div className="mt-3 flex gap-3 rounded-md bg-cd-raised px-3.5 py-3 text-[13px] leading-relaxed text-cd-muted">
                          <Info size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-cd-text" />
                          <p>
                            Send only {selectedAsset.symbol} on the {network} network to this address
                            {selectedAsset.memo ? ', and include the memo above' : ''}.
                          </p>
                        </div>
                      </Card>

                      <ActionButton onClick={() => goTo('confirm', 1)} variant="primary" className="mt-5 h-11 w-full">
                        I&apos;ve sent it, continue
                        <ArrowRight size={16} strokeWidth={1.75} />
                      </ActionButton>
                      <p className="mt-2.5 text-center text-[12.5px] text-cd-muted">Next, tell us the amount so we can match your transfer.</p>
                    </>
                  )}

                  {step === 'confirm' && selectedAsset && (
                    <>
                      <PageHeader title="Confirm deposit" titleOnPhone meta={['Tell us what you sent so we can credit it quickly.']} />

                      <Card className="mt-6" bodyClassName="px-4 py-1 sm:px-5">
                        <Row label="Asset">
                          <span className="inline-flex items-center gap-2"><AssetIcon symbol={selectedAsset.symbol} size={18} />{selectedAsset.symbol}</span>
                        </Row>
                        <Row label="Network">{network}</Row>
                        <Row label="Sent to"><span className="font-mono text-[13px]" title={selectedAsset.walletAddress}>{shortId(selectedAsset.walletAddress, 8, 6)}</span></Row>
                      </Card>

                      <Card title="Transfer details" className="mt-5" bodyClassName="px-4 pb-4 sm:px-5 sm:pb-5">
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
                      <p className="mt-3 text-center text-[12.5px] leading-relaxed text-cd-muted">
                        Your balance updates once our team confirms the transfer on the {network} network.
                      </p>
                    </>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
