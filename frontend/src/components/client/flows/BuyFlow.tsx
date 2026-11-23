'use client';

/**
 * Buy crypto through an outside provider or exchange, step by step:
 *   Asset    — a searchable list with live prices (skipped when `params.asset` names one).
 *   Amount   — a large dollar amount with quick amounts and the coins it buys at the live price.
 *   Provider — payment providers (card or bank, amount and address pre-filled) and exchanges.
 *   Review   — what will be bought and where the coins will land, then the hand-off, which opens
 *              the provider in a new tab exactly as the old Buy page did.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { ArrowUpRight, ChevronRight, Copy, Zap } from 'lucide-react';
import { assetsAPI } from '@/lib/api';
import type { Asset } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import type { FlowProps } from '../actions';
import { ActionButton, AssetIcon, AssetName, Skeleton, formatPrice, shortId } from '../ui';
import { PriceTick, StepBar, StepStage } from '../motion';
import { AssetPickerList, DetailList, DetailRow, FlowFrame, LiveDot, Notice, useLatest } from './trade-shared';

type Step = 'asset' | 'amount' | 'provider' | 'review';
type ProviderType = 'provider' | 'exchange';
type ProviderId = 'MoonPay' | 'Transak' | 'Simplex' | 'Ramp' | 'Coinbase' | 'Gemini' | 'Uphold' | 'Kraken';
type Platform = { id: ProviderId; type: ProviderType; url: string; icon: string };

const PURCHASE_PROVIDERS: Platform[] = [
  { id: 'MoonPay', type: 'provider', url: 'https://www.moonpay.com/buy', icon: '/provider-icons/moonpay.svg' },
  { id: 'Transak', type: 'provider', url: 'https://global.transak.com/', icon: '/provider-icons/transak.svg' },
  { id: 'Simplex', type: 'provider', url: 'https://simplex.com/buy', icon: '/provider-icons/simplex.svg' },
  { id: 'Ramp', type: 'provider', url: 'https://app.ramp.network/buy', icon: '/provider-icons/ramp.svg' },
];

const EXCHANGES: Platform[] = [
  { id: 'Coinbase', type: 'exchange', url: 'https://www.coinbase.com/buy', icon: '/provider-icons/coinbase.svg' },
  { id: 'Gemini', type: 'exchange', url: 'https://exchange.gemini.com/deposit', icon: '/provider-icons/gemini.svg' },
  { id: 'Uphold', type: 'exchange', url: 'https://wallet.uphold.com/dashboard', icon: '/provider-icons/uphold.svg' },
  { id: 'Kraken', type: 'exchange', url: 'https://www.kraken.com/sign-in', icon: '/provider-icons/kraken.svg' },
];

const ALL_PLATFORMS = [...PURCHASE_PROVIDERS, ...EXCHANGES];

function providerUrl(provider: ProviderId, asset: Asset, amount: string) {
  const symbol = asset.symbol.toUpperCase();
  const walletAddress = asset.walletAddress;

  if (provider === 'MoonPay') {
    return `https://www.moonpay.com/buy?currencyCode=${symbol.toLowerCase()}&baseCurrencyCode=usd&baseCurrencyAmount=${amount}&walletAddress=${encodeURIComponent(walletAddress)}`;
  }
  if (provider === 'Transak') {
    return `https://global.transak.com/?fiatCurrency=USD&cryptoCurrencyCode=${symbol}&fiatAmount=${amount}&walletAddress=${encodeURIComponent(walletAddress)}`;
  }
  if (provider === 'Simplex') {
    return `https://simplex.com/buy?currency=${symbol}&fiat=USD&amount=${amount}&wallet=${encodeURIComponent(walletAddress)}`;
  }
  if (provider === 'Ramp') {
    return `https://app.ramp.network/buy?hostApiKey=default&cryptoAsset=${symbol}&fiatCurrency=USD&defaultAmount=${amount}&userAddress=${encodeURIComponent(walletAddress)}`;
  }
  return ALL_PLATFORMS.find((p) => p.id === provider)?.url || '#';
}

const TYPE_TEXT: Record<ProviderType, { label: string; detail: string }> = {
  provider: { label: 'Card or bank', detail: 'Amount and address pre-filled' },
  exchange: { label: 'Exchange login', detail: 'Buy there, send to your address' },
};

const QUICK_AMOUNTS = [100, 500, 1000];
const PRICE_REFRESH_MS = 20_000;

const PROGRESS = [
  { key: 'asset', label: 'Asset' },
  { key: 'amount', label: 'Amount' },
  { key: 'provider', label: 'Provider' },
  { key: 'review', label: 'Review' },
];

function HeaderIcon() {
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-cd-accent-soft text-cd-accent-text">
      <Zap size={16} strokeWidth={1.75} />
    </span>
  );
}

function PlatformLogo({ item, size = 36 }: { item: Platform; size?: number }) {
  return (
    <span className="flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-cd-raised" style={{ width: size, height: size }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.icon} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

function PlatformTiles({ items, provider, onSelect }: { items: Platform[]; provider: ProviderId; onSelect: (id: ProviderId) => void }) {
  return (
    <div className="space-y-2" role="radiogroup">
      {items.map((item) => {
        const active = item.id === provider;
        return (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(item.id)}
            className={cn(
              'flex w-full items-center gap-3 rounded-md border-[1.5px] px-3.5 py-3 text-left transition-colors',
              active ? 'border-cd-accent bg-cd-accent-soft' : 'border-cd-line hover:border-cd-line-strong hover:bg-cd-raised',
            )}
          >
            <PlatformLogo item={item} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-[14px] font-medium text-cd-text">
                {item.id}
                <span className="rounded-sm bg-cd-raised px-1.5 py-px text-[10.5px] font-medium uppercase tracking-[0.05em] text-cd-muted">{TYPE_TEXT[item.type].label}</span>
              </span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-cd-muted">{TYPE_TEXT[item.type].detail}</span>
            </span>
            <span
              className={cn(
                'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
                active ? 'border-cd-accent' : 'border-cd-line-strong',
              )}
              aria-hidden
            >
              {active && <span className="h-2 w-2 rounded-full bg-cd-accent" />}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function BuyFlow(flow: FlowProps) {
  const { params, close } = flow;

  const [amount, setAmount] = useState('150');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [provider, setProvider] = useState<ProviderId>('MoonPay');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>(params?.asset ? 'amount' : 'asset');
  const [direction, setDirection] = useState(1);
  const [error, setError] = useState('');
  const [opened, setOpened] = useState<ProviderId | null>(null);

  const go = useCallback((next: Step, dir = 1) => {
    setDirection(dir);
    setError('');
    setStep(next);
  }, []);

  useEffect(() => {
    assetsAPI.list().then((res) => {
      const list: Asset[] = res.data.assets || [];
      setAssets(list);
      const wanted = params?.asset
        ? list.find((a) => a.symbol.toUpperCase() === String(params.asset).toUpperCase() || a.id === params.asset)
        : undefined;
      if (params?.asset && !wanted) setStep('asset');
      const first = wanted || list[0];
      if (first) setSelectedAssetId(first.id);
    }).catch(console.error).finally(() => setLoading(false));
    assetsAPI.prices().then((res) => setPrices(res.data.prices || {})).catch(console.error);
    // Only on open: the parameter chooses the starting asset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live prices while the flow is open (the server caches them, so this is cheap).
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      assetsAPI.prices().then((res) => {
        const next = res.data?.prices;
        if (next && Object.keys(next).length) setPrices(next);
      }).catch(() => {});
    }, PRICE_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || assets[0],
    [assets, selectedAssetId],
  );
  const currentPrice = selectedAsset ? prices[selectedAsset.symbol.toUpperCase()] || 0 : 0;
  const estimatedAmount = currentPrice > 0 ? (parseFloat(amount || '0') / currentPrice).toFixed(8) : '0.00000000';
  const usdValue = parseFloat(amount || '0');
  const symbol = selectedAsset?.symbol?.toUpperCase() || '';
  const platform = ALL_PLATFORMS.find((p) => p.id === provider) || PURCHASE_PROVIDERS[0];

  const openProvider = () => {
    if (!selectedAsset) {
      toast.error('Select an asset first');
      return;
    }
    if (!usdValue || usdValue <= 0) {
      toast.error('Enter a valid USD amount');
      return;
    }

    window.open(providerUrl(provider, selectedAsset, amount), '_blank', 'noopener,noreferrer');
    setOpened(provider);
  };

  const copyAddress = () => {
    if (selectedAsset?.walletAddress) {
      navigator.clipboard.writeText(selectedAsset.walletAddress);
      toast.success('Address copied!');
    }
  };

  const fromAmount = () => {
    if (!selectedAsset) return setError('Select an asset first');
    if (!usdValue || usdValue <= 0) return setError('Enter a valid USD amount');
    go('provider');
  };

  const back = () => {
    if (step === 'review') go('provider', -1);
    else if (step === 'provider') go('amount', -1);
    else if (step === 'amount') go('asset', -1);
  };

  const run = useLatest({ openProvider, fromAmount, back, close, toReview: () => { setOpened(null); go('review'); } });

  /* ─── Header and footer for each step ─── */
  const header = useMemo(() => {
    const big = 'h-12 w-full text-[15px]';
    if (step === 'asset') {
      return { title: 'Buy crypto', subtitle: 'Choose the asset to buy', icon: <HeaderIcon /> };
    }
    if (step === 'amount') {
      return {
        title: symbol ? `Buy ${symbol}` : 'Buy',
        subtitle: 'How much would you like to spend?',
        onBack: () => run.current.back(),
        footer: (
          <ActionButton variant="primary" onClick={() => run.current.fromAmount()} disabled={loading} className={big}>Continue</ActionButton>
        ),
      };
    }
    if (step === 'provider') {
      return {
        title: 'Choose how to pay',
        subtitle: 'You finish the purchase on the provider’s site',
        onBack: () => run.current.back(),
        footer: <ActionButton variant="primary" onClick={() => run.current.toReview()} className={big}>Continue with {provider}</ActionButton>,
      };
    }
    return {
      title: 'Review purchase',
      subtitle: `${symbol} through ${provider}`,
      onBack: () => run.current.back(),
      footer: (
        <div>
          <div className={opened ? 'flex gap-2.5' : ''}>
            {opened && <ActionButton variant="outline" onClick={() => run.current.close()} className="h-12 flex-1 text-[15px]">Done</ActionButton>}
            <ActionButton variant="primary" onClick={() => run.current.openProvider()} className={opened ? 'h-12 flex-1 text-[15px]' : big}>
              {opened ? 'Open again' : `Continue to ${provider}`}
              <ArrowUpRight size={17} strokeWidth={1.75} />
            </ActionButton>
          </div>
          <p className="mt-2.5 text-center text-[12px] text-cd-faint">Opens {provider} in a new tab.</p>
        </div>
      ),
    };
  }, [step, symbol, provider, loading, opened, run]);

  const headerKey = `${step}|${symbol}|${provider}|${loading}|${opened || ''}`;

  /* ─── Steps ─── */

  const assetStep = loading ? (
    <div className="space-y-3">
      <Skeleton className="h-11 w-full" />
      {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
    </div>
  ) : (
    <AssetPickerList
      assets={assets}
      selectedId={selectedAsset?.id}
      onSelect={(id) => { setSelectedAssetId(id); go('amount'); }}
      priceOf={(asset) => prices[asset.symbol.toUpperCase()] || 0}
    />
  );

  const amountWidth = `${Math.max(1, amount.length) + 0.4}ch`;

  const amountStep = selectedAsset && (
    <div>
      {/* The chosen asset; tap to change */}
      <button
        type="button"
        onClick={() => go('asset', -1)}
        className="flex w-full items-center gap-3 rounded-md bg-cd-input px-3.5 py-3 text-left transition-colors hover:bg-cd-raised"
      >
        <AssetIcon symbol={selectedAsset.symbol} size={30} />
        <span className="min-w-0 flex-1">
          <AssetName symbol={symbol} name={selectedAsset.name} network={selectedAsset.network} />
        </span>
        <span className="flex shrink-0 items-center gap-0.5 text-[13px] font-medium text-cd-accent-text">
          Change <ChevronRight size={15} strokeWidth={1.75} />
        </span>
      </button>

      {/* Big dollar amount */}
      <div className="mt-8 flex flex-col items-center text-center">
        <label className="flex max-w-full items-baseline justify-center text-cd-text">
          <span className={cn('text-[40px] font-normal leading-none', usdValue > 0 ? 'text-cd-text' : 'text-cd-faint')}>$</span>
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              const next = e.target.value.replace(/[^0-9.]/g, '');
              if ((next.match(/\./g) || []).length > 1) return;
              setAmount(next);
              setError('');
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') fromAmount(); }}
            aria-label="Amount in US dollars"
            placeholder="0"
            style={{ width: amountWidth }}
            className="cd-num min-w-[1.4ch] max-w-[11ch] bg-transparent text-left text-[48px] font-normal leading-none text-cd-text placeholder:text-cd-faint focus:outline-none"
          />
        </label>
        <p className="mt-1 text-[12px] uppercase tracking-[0.08em] text-cd-muted">USD</p>
        <p className="cd-num mt-3 text-[14px] text-cd-muted">
          ≈ <span className="text-cd-text">{estimatedAmount}</span> {symbol}
        </p>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2">
        {QUICK_AMOUNTS.map((value) => {
          const active = usdValue === value;
          return (
            <button
              key={value}
              type="button"
              onClick={() => { setAmount(String(value)); setError(''); }}
              aria-pressed={active}
              className={cn(
                'cd-num h-10 rounded-full border-[1.5px] text-[14px] font-medium transition-colors',
                active ? 'border-cd-accent bg-cd-accent-soft text-cd-accent-text' : 'border-cd-line text-cd-text hover:bg-cd-raised',
              )}
            >
              ${value.toLocaleString('en-US')}
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex items-center justify-between gap-3 rounded-md border border-cd-line px-4 py-3 text-[13px]">
        <span className="flex items-center gap-2 text-cd-muted">Price <LiveDot /></span>
        <PriceTick value={currentPrice} className="cd-num -mx-1 px-1 text-cd-text">
          {currentPrice ? `${formatPrice(currentPrice)} / ${symbol}` : '—'}
        </PriceTick>
      </div>

      {error && <Notice className="mt-4">{error}</Notice>}
    </div>
  );

  const providerStep = (
    <div>
      <p className="mb-2.5 text-[12px] font-medium uppercase tracking-[0.06em] text-cd-muted">Payment providers</p>
      <PlatformTiles items={PURCHASE_PROVIDERS} provider={provider} onSelect={setProvider} />
      <p className="mb-2.5 mt-6 text-[12px] font-medium uppercase tracking-[0.06em] text-cd-muted">Or buy on an exchange</p>
      <PlatformTiles items={EXCHANGES} provider={provider} onSelect={setProvider} />
    </div>
  );

  const reviewStep = selectedAsset && (
    <div>
      <div className="flex flex-col items-center rounded-lg bg-cd-input px-4 py-5 text-center">
        <div className="flex items-center gap-2">
          <AssetIcon symbol={selectedAsset.symbol} size={28} />
          <PlatformLogo item={platform} size={28} />
        </div>
        <p className="cd-num mt-3 text-[28px] font-normal leading-tight text-cd-text">{formatCurrency(usdValue || 0)}</p>
        <p className="cd-num mt-1 text-[13.5px] text-cd-muted">≈ {estimatedAmount} {symbol}</p>
      </div>

      <DetailList className="mt-5">
        <DetailRow label="Asset">{selectedAsset.name ? `${symbol} · ${selectedAsset.name}` : symbol}</DetailRow>
        {selectedAsset.network && <DetailRow label="Network">{selectedAsset.network}</DetailRow>}
        <DetailRow label="Price">
          <PriceTick value={currentPrice} className="-mx-1 px-1">{currentPrice ? `${formatPrice(currentPrice)} / ${symbol}` : '—'}</PriceTick>
        </DetailRow>
        <DetailRow label="You pay">{formatCurrency(usdValue || 0)}</DetailRow>
        <DetailRow label="You'll receive (est.)" strong>{estimatedAmount} {symbol}</DetailRow>
        <DetailRow label="Pay with" hint={TYPE_TEXT[platform.type].label}>{provider}</DetailRow>
        <DetailRow label="Destination">
          {selectedAsset.walletAddress ? (
            <span className="inline-flex items-center gap-2">
              <span className="font-mono text-[13px]">{shortId(selectedAsset.walletAddress, 8, 6)}</span>
              <button type="button" onClick={copyAddress} aria-label="Copy address" className="rounded p-1 text-cd-accent-text hover:bg-cd-raised">
                <Copy size={14} strokeWidth={1.75} />
              </button>
            </span>
          ) : (
            <span className="text-cd-faint">No address available</span>
          )}
        </DetailRow>
      </DetailList>

      <p className="mt-4 text-[12.5px] leading-relaxed text-cd-muted">
        {platform.type === 'provider'
          ? `${provider} opens with the amount and your ${symbol} address filled in. It shows its own fees and the final amount before you pay.`
          : `${provider} opens its own site. Buy ${symbol} on your account there, then send it to the destination address above.`}
      </p>

      {opened && (
        <Notice tone="positive" className="mt-4">
          {opened} opened in a new tab. Finish your purchase there.
        </Notice>
      )}
    </div>
  );

  return (
    <FlowFrame flow={flow} headerKey={headerKey} header={header}>
      <StepBar steps={PROGRESS} current={step} onSelect={(key) => go(key as Step, -1)} className="mb-5" />
      <StepStage stepKey={step} direction={direction}>
        {step === 'asset' && assetStep}
        {step === 'amount' && (amountStep || <Skeleton className="h-40 w-full" />)}
        {step === 'provider' && providerStep}
        {step === 'review' && reviewStep}
      </StepStage>
    </FlowFrame>
  );
}
