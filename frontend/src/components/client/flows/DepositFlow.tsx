'use client';

/**
 * Deposit, as a guided flow: "How would you like to deposit?" (USDT or other crypto), then the USDT
 * network or the asset, then the deposit address (copyable, with a QR code), then the form for
 * telling us what was sent, and a success screen. Each step flips into the next and back again.
 * In the sheet the title, back arrow and main button live in the sheet's chrome; on the page they
 * are printed inline. `params.asset` (a symbol) opens that asset's address straight away.
 */
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { motion, useReducedMotion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowRight, Check, ChevronRight, Copy, Info, Search, ShieldCheck } from 'lucide-react';
import { assetsAPI, depositsAPI, apiBase } from '@/lib/api';
import { Asset } from '@/types';
import { notifyBalancesChanged, type FlowProps, type SheetHeader } from '../actions';
import { SuccessMark } from '../motion';
import { AssetIcon, AssetName, Card, EmptyState, shortId } from '../ui';
import { Field, FlowButton, FlowStepBar, FlowFrame, FlowSkeleton, INPUT, Notice, Row, scrollFlowTop, useFlowHeader, useStableCallback } from './TransferKit';
import { cn } from '@/lib/utils';

const schema = z.object({
  amount: z.string().min(1, 'Enter amount').refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be > 0'),
  txHash: z.string().optional(),
  usdValue: z.string().optional(),
});

type DepositForm = z.infer<typeof schema>;

type Step = 'method' | 'asset' | 'address' | 'confirm' | 'done';
type Method = 'usdt' | 'crypto';

const FORM_ID = 'dwp-deposit-confirm';

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
        'cd-card group flex w-full flex-col rounded-lg border border-cd-line p-5 text-left transition-[border-color,background-color] duration-200 dark:border-cd-line',
        disabled ? 'cursor-not-allowed opacity-55' : 'hover:border-cd-accent focus-visible:border-cd-accent focus-visible:outline-none',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {visual}
        <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-cd-raised text-cd-muted transition-colors duration-200', !disabled && 'group-hover:bg-cd-accent group-hover:text-white')}>
          <ArrowRight size={16} strokeWidth={1.75} />
        </span>
      </div>
      <p className="mt-4 text-[16.5px] font-medium text-cd-text">{title}</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-cd-muted">{text}</p>
      <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-cd-line pt-3.5">{footer}</div>
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

export default function DepositFlow({ variant, params, setHeader, close }: FlowProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<Step>('method');
  const [method, setMethod] = useState<Method | null>(null);
  const [dir, setDir] = useState(1);
  const [submittedAmount, setSubmittedAmount] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const preselect: string | undefined = params?.asset;

  const { register, handleSubmit, formState: { errors }, reset } = useForm<DepositForm>({
    resolver: zodResolver(schema),
  });

  useEffect(() => {
    assetsAPI.list().then((res) => {
      const fetchedAssets: Asset[] = res.data.assets || [];
      setAssets(fetchedAssets);
      if (preselect) {
        const match = fetchedAssets.find((a) => a.symbol.toUpperCase() === String(preselect).toUpperCase());
        if (match) {
          setSelectedAsset(match);
          // A preselected asset skips the chooser and opens its address.
          setMethod(isUsdt(match) ? 'usdt' : 'crypto');
          setStep('address');
        }
      }
    }).catch(console.error).finally(() => setAssetsLoaded(true));
  }, [preselect]);

  const usdtAssets = assets.filter(isUsdt);
  const otherAssets = assets.filter((a) => !isUsdt(a));
  /** With a single USDT network there is nothing to pick: USDT goes straight to its address. */
  const usdtDirect = method === 'usdt' && usdtAssets.length === 1;

  const goTo = (next: Step, direction: 1 | -1) => {
    setDir(direction);
    setStep(next);
    scrollFlowTop(rootRef.current, !reduceMotion);
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

  const back = useStableCallback(() => {
    if (step === 'confirm') goTo('address', -1);
    else if (step === 'address') goTo(usdtDirect || !method ? 'method' : 'asset', -1);
    else goTo('method', -1);
  });

  const jump = (target: string) => {
    goTo((target === 'asset' && usdtDirect ? 'method' : target) as Step, -1);
  };

  const copyAddress = async () => {
    if (!selectedAsset) return;
    try {
      await navigator.clipboard.writeText(selectedAsset.walletAddress);
      setCopied(true);
      toast.success('Address copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy. Select the address and copy it by hand.');
    }
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
      setSubmittedAmount(data.amount);
      notifyBalancesChanged();
      goTo('done', 1);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to submit deposit';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetFlow = useStableCallback(() => {
    setSelectedAsset(null);
    setMethod(null);
    setSubmittedAmount('');
    reset();
    goTo('method', -1);
  });

  const toConfirm = useStableCallback(() => goTo('confirm', 1));
  const onClose = useStableCallback(() => close());

  const network = selectedAsset ? selectedAsset.network || selectedAsset.name : '';
  const networkLabel = selectedAsset
    ? `${network}${isUsdt(selectedAsset) && tokenStandard(selectedAsset) !== network ? ` (${tokenStandard(selectedAsset)})` : ''}`
    : '';
  const assetDoneLabel = selectedAsset
    ? method === 'usdt' ? `USDT · ${tokenStandard(selectedAsset)}` : selectedAsset.symbol
    : 'Asset';

  /* ─── Header and footer for the current step ─── */

  let header: SheetHeader = {};
  if (!assetsLoaded) {
    header = { title: 'Deposit', subtitle: 'Loading the supported assets…' };
  } else if (step === 'method') {
    header = { title: 'Deposit', subtitle: 'How would you like to deposit?' };
  } else if (step === 'asset') {
    header = {
      title: method === 'usdt' ? 'Choose the USDT network' : 'Choose an asset',
      subtitle: method === 'usdt' ? 'Pick the same network your wallet or exchange will send on.' : 'Which asset would you like to deposit?',
      onBack: back,
    };
  } else if (step === 'address' && selectedAsset) {
    header = {
      title: `Deposit ${selectedAsset.symbol}`,
      subtitle: `${networkLabel} network`,
      icon: <AssetIcon symbol={selectedAsset.symbol} size={variant === 'sheet' ? 28 : 36} />,
      onBack: back,
      footer: (
        <div>
          <FlowButton onClick={toConfirm}>
            I&apos;ve sent it, continue
            <ArrowRight size={16} strokeWidth={1.75} />
          </FlowButton>
          <p className="mt-2 text-center text-[12.5px] text-cd-muted">Next, tell us the amount so we can match your transfer.</p>
        </div>
      ),
    };
  } else if (step === 'confirm' && selectedAsset) {
    header = {
      title: 'Confirm deposit',
      subtitle: 'Tell us what you sent so we can credit it quickly.',
      icon: <AssetIcon symbol={selectedAsset.symbol} size={variant === 'sheet' ? 28 : 36} />,
      onBack: back,
      footer: <FlowButton type="submit" form={FORM_ID} loading={isSubmitting}>Submit details</FlowButton>,
    };
  } else if (step === 'done') {
    header = {
      title: 'Deposit',
      footer: (
        <div className="flex flex-col gap-2">
          <FlowButton onClick={onClose}>Done</FlowButton>
          <FlowButton variant="ghost" onClick={resetFlow}>Make another deposit</FlowButton>
        </div>
      ),
    };
  }

  useFlowHeader(variant, setHeader, header, `${assetsLoaded}|${step}|${method}|${selectedAsset?.id}|${isSubmitting}`);

  const steps = [
    { key: 'method', label: 'Method' },
    { key: 'asset', label: step === 'method' || step === 'asset' ? 'Asset' : assetDoneLabel },
    { key: 'address', label: 'Address' },
    { key: 'confirm', label: 'Confirm' },
  ];
  const stepBar = assetsLoaded && step !== 'done'
    ? <FlowStepBar steps={steps} current={step} onSelect={jump} />
    : undefined;

  const listed = method === 'usdt' ? usdtAssets : otherAssets;
  const q = search.trim().toLowerCase();
  const shown = q
    ? listed.filter((a) => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q) || (a.network || '').toLowerCase().includes(q))
    : listed;
  const usdtNetworks = Array.from(new Set(usdtAssets.map(tokenStandard)));
  const stripAssets = otherAssets.slice(0, 5);

  return (
    <FlowFrame variant={variant} header={header} stepBar={stepBar} stepKey={assetsLoaded ? step : 'loading'} direction={dir} rootRef={rootRef}>
      {!assetsLoaded && <FlowSkeleton />}

      {assetsLoaded && step === 'method' && (
        <>
          <div className={cn('grid gap-3.5', variant === 'page' && 'sm:grid-cols-2 sm:gap-4')}>
            <MethodCard
              title="USDT (stablecoin)"
              text="A dollar-pegged token, so 1 USDT stays worth about $1. The simplest way to fund your account in dollars."
              disabled={usdtAssets.length === 0}
              onClick={() => chooseMethod('usdt')}
              visual={<AssetIcon symbol="USDT" size={42} />}
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
                  {stripAssets.length === 0 ? <AssetIcon symbol="BTC" size={42} /> : stripAssets.map((a, i) => (
                    <span key={a.id} className="relative rounded-full ring-[3px] ring-cd-card" style={{ marginLeft: i === 0 ? 0 : -8, zIndex: stripAssets.length - i }}>
                      <AssetIcon symbol={a.symbol} size={36} />
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
          <div className="mt-4">
            <Notice icon={ShieldCheck}>Every deposit is checked by our operations team on the network before it is credited to your account.</Notice>
          </div>
        </>
      )}

      {assetsLoaded && step === 'asset' && (
        <>
          <Card bodyClassName="p-2 sm:p-3">
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
                      className="flex w-full items-center gap-3.5 rounded-md border-b border-cd-line px-3 py-3.5 text-left transition-colors last:border-b-0 hover:bg-cd-raised/60"
                    >
                      <AssetIcon symbol={method === 'usdt' ? 'USDT' : a.symbol} size={30} />
                      <div className="min-w-0 flex-1">
                        {method === 'usdt' ? (
                          <>
                            <p className="flex flex-wrap items-center gap-x-2 text-[14px] font-medium text-cd-text">
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
            <div className="mt-4">
              <Notice>USDT sent on a different network from the one you pick here cannot be credited and may be lost.</Notice>
            </div>
          )}
        </>
      )}

      {assetsLoaded && step === 'address' && selectedAsset && (
        <Card>
          <div className="mb-5 flex flex-col items-center">
            <div className="rounded-lg bg-white p-2.5">
              {selectedAsset.qrCodeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${apiBase}${selectedAsset.qrCodeImage}`} alt="Wallet QR code" className="h-40 w-40 object-contain" />
              ) : (
                <QRCodeSVG value={selectedAsset.walletAddress} size={160} level="M" role="img" aria-label={`QR code of the ${selectedAsset.symbol} deposit address`} />
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
            <Row label="Network">{networkLabel}</Row>
            <Row label="Memo / tag">
              {selectedAsset.memo ? (
                <span className="inline-flex items-center gap-2">
                  <span className="break-all font-mono text-[13.5px]">{selectedAsset.memo}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(selectedAsset.memo!).then(() => toast.success('Memo copied!')).catch(() => {});
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

          <div className="mt-3">
            <Notice icon={Info}>
              Send only {selectedAsset.symbol} on the {network} network to this address
              {selectedAsset.memo ? ', and include the memo above' : ''}.
            </Notice>
          </div>
        </Card>
      )}

      {assetsLoaded && step === 'confirm' && selectedAsset && (
        <>
          <Card bodyClassName="px-4 py-1 sm:px-5">
            <Row label="Asset">
              <span className="inline-flex items-center gap-2"><AssetIcon symbol={selectedAsset.symbol} size={18} />{selectedAsset.symbol}</span>
            </Row>
            <Row label="Network">{network}</Row>
            <Row label="Sent to"><span className="font-mono text-[13px]" title={selectedAsset.walletAddress}>{shortId(selectedAsset.walletAddress, 8, 6)}</span></Row>
          </Card>

          <Card title="Transfer details" className="mt-4" bodyClassName="px-4 pb-4 sm:px-5 sm:pb-5">
            <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <Field label="Amount sent" error={errors.amount?.message}>
                <div className="flex h-11 items-center rounded-md border border-transparent bg-cd-input px-3.5 focus-within:border-cd-accent">
                  <input
                    type="number"
                    step="any"
                    inputMode="decimal"
                    placeholder="0.00"
                    className="cd-num min-w-0 flex-1 bg-transparent text-[14px] text-cd-text placeholder:text-cd-faint focus:outline-none"
                    {...register('amount')}
                  />
                  <span className="ml-2 text-[13px] text-cd-muted">{selectedAsset.symbol}</span>
                </div>
              </Field>
              <Field label="USD value (optional)" error={errors.usdValue?.message}>
                <input type="number" step="any" inputMode="decimal" placeholder="Estimated USD value" className={cn(INPUT, 'cd-num')} {...register('usdValue')} />
              </Field>
              <Field label="Transaction hash (optional)" error={errors.txHash?.message}>
                <input placeholder="0x..." autoCapitalize="off" autoCorrect="off" spellCheck={false} className={cn(INPUT, 'font-mono placeholder:font-sans')} {...register('txHash')} />
              </Field>
              {/* Enter in a field submits; the visible button is in the footer. */}
              <button type="submit" className="hidden" tabIndex={-1} aria-hidden />
            </form>
          </Card>
          <p className="mt-3 text-center text-[12.5px] leading-relaxed text-cd-muted">
            Your balance updates once our team confirms the transfer on the {network} network.
          </p>
        </>
      )}

      {step === 'done' && (
        <div className="flex flex-col items-center pt-4 text-center">
          <SuccessMark />
          <h3 className="mt-5 text-[22px] font-normal text-cd-text">Deposit submitted</h3>
          <p className="mt-2 max-w-[340px] text-[14px] leading-relaxed text-cd-muted">
            Your deposit request has been submitted. The admin will verify and confirm your balance shortly.
          </p>
          {selectedAsset && (
            <Card className="mt-6 w-full text-left" bodyClassName="px-4 py-1 sm:px-5">
              <Row label="Asset">
                <span className="inline-flex items-center gap-2"><AssetIcon symbol={selectedAsset.symbol} size={18} />{selectedAsset.symbol}</span>
              </Row>
              {submittedAmount && <Row label="Amount"><span className="cd-num">{submittedAmount} {selectedAsset.symbol}</span></Row>}
              <Row label="Network">{network}</Row>
              <Row label="Status"><span className="text-cd-warning">Awaiting confirmation</span></Row>
            </Card>
          )}
        </div>
      )}
    </FlowFrame>
  );
}

