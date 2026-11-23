'use client';

/**
 * Buy crypto through an outside provider or exchange. Laid out like the Convert page: the asset and
 * a large USD amount in grey fields, the wallet the coins will land in, the provider tiles, then a
 * short label/value summary above one full-width action that opens the provider in a new tab.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowUpRight, Check, CheckCircle2, ChevronDown, Copy, X, Zap } from 'lucide-react';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { assetsAPI } from '@/lib/api';
import { Asset } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { ActionButton, AssetIcon, AssetName, Card, PageHeader, Tabs, formatPrice } from '@/components/client/ui';

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

function PlatformLogo({ item }: { item: Platform }) {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-cd-raised">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.icon} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

/** Convert and Buy share the Trade section; these tabs move between them. */
function TradeTabs({ value }: { value: 'swap' | 'buy' }) {
  const router = useRouter();
  return (
    <Tabs
      className="mt-6"
      tabs={[{ value: 'swap', label: 'Convert' }, { value: 'buy', label: 'Buy' }]}
      value={value}
      onChange={(next) => { if (next !== value) router.push(`/dashboard/${next}`); }}
    />
  );
}

/** A small dialog in the dashboard's colours: a sheet from the bottom on a phone, centred on a computer. */
function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-[85vh] w-full flex-col rounded-t-xl border border-cd-line bg-cd-card sm:max-w-[440px] sm:rounded-lg">
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <h2 className="text-[16px] font-medium text-cd-text">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 rounded-md p-2 text-cd-muted hover:bg-cd-raised hover:text-cd-text">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="overflow-y-auto px-2 pb-3">{children}</div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[13px] text-cd-muted">{children}</p>;
}

function PlatformGrid({ items, provider, setProvider }: { items: Platform[]; provider: ProviderId; setProvider: (id: ProviderId) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((item) => {
        const active = item.id === provider;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setProvider(item.id)}
            aria-pressed={active}
            className={cn(
              'flex min-w-0 items-center gap-2.5 rounded-md border px-3 py-2.5 text-left transition-colors',
              active ? 'border-cd-accent bg-cd-accent-soft' : 'border-cd-line hover:bg-cd-raised',
            )}
          >
            <PlatformLogo item={item} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-medium text-cd-text">{item.id}</span>
              <span className="block truncate text-[12px] text-cd-muted">{item.type === 'provider' ? 'Card or bank' : 'Exchange login'}</span>
            </span>
            {active && <CheckCircle2 size={16} strokeWidth={1.75} className="hidden shrink-0 text-cd-accent-text sm:block" />}
          </button>
        );
      })}
    </div>
  );
}

function DetailRow({ label, children, strong = false }: { label: string; children: ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-t border-cd-line py-3.5 first:border-t-0">
      <span className="text-[13.5px] text-cd-muted">{label}</span>
      <span className={cn('cd-num text-right text-[14px] text-cd-text', strong && 'font-medium')}>{children}</span>
    </div>
  );
}

export default function BuyCryptoPage() {
  const [amount, setAmount] = useState('150');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [provider, setProvider] = useState<ProviderId>('MoonPay');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  useEffect(() => {
    assetsAPI.list().then((res) => {
      const list = res.data.assets || [];
      setAssets(list);
      if (list[0]) setSelectedAssetId(list[0].id);
    }).catch(console.error);
    assetsAPI.prices().then((res) => setPrices(res.data.prices || {})).catch(console.error);
  }, []);

  const selectedAsset = useMemo(
    () => assets.find((asset) => asset.id === selectedAssetId) || assets[0],
    [assets, selectedAssetId],
  );
  const currentPrice = selectedAsset ? prices[selectedAsset.symbol.toUpperCase()] || 0 : 0;
  const estimatedAmount = currentPrice > 0 ? (parseFloat(amount || '0') / currentPrice).toFixed(8) : '0.00000000';
  const usdValue = parseFloat(amount || '0');

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
  };

  const symbol = selectedAsset?.symbol?.toUpperCase() || '';

  return (
    <div className="min-h-full">
      <DashboardHeader title="Buy" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="mx-auto w-full max-w-[600px]">
          <PageHeader
            icon={Zap}
            title="Buy crypto"
            titleOnPhone={false}
            meta={['Pay by card or bank through a trusted provider']}
          />

          <TradeTabs value="buy" />

          <Card className="mt-5" bodyClassName="p-4 sm:p-6">
            {/* Asset */}
            <FieldLabel>Asset</FieldLabel>
            <button
              type="button"
              onClick={() => setIsAssetModalOpen(true)}
              className="flex w-full items-center gap-3 rounded-md bg-cd-input px-3.5 py-3 text-left transition-colors hover:bg-cd-raised sm:px-4"
            >
              {selectedAsset ? <AssetIcon symbol={selectedAsset.symbol} size={30} /> : <span className="h-[30px] w-[30px] rounded-full bg-cd-raised" />}
              <span className="min-w-0 flex-1">
                {selectedAsset ? (
                  <AssetName symbol={symbol} name={selectedAsset.name} network={selectedAsset.network} />
                ) : (
                  <span className="text-[14px] text-cd-faint">Select asset</span>
                )}
              </span>
              <ChevronDown size={17} strokeWidth={1.75} className="shrink-0 text-cd-muted" />
            </button>

            {/* Amount */}
            <div className="mt-5">
              <FieldLabel>Amount</FieldLabel>
              <label className="flex items-center gap-2 rounded-md bg-cd-input px-3.5 py-3 sm:px-4">
                <span className="text-[26px] font-light text-cd-muted sm:text-[30px]">$</span>
                <input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  aria-label="Amount in US dollars"
                  className="cd-num min-w-0 flex-1 bg-transparent text-[26px] font-light leading-tight text-cd-text placeholder:text-cd-faint focus:outline-none [appearance:textfield] sm:text-[30px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  placeholder="0"
                />
                <span className="text-[14px] text-cd-muted">USD</span>
              </label>
              <p className="cd-num mt-2 px-1 text-[12.5px] text-cd-muted">≈ {estimatedAmount} {symbol}</p>
            </div>

            {/* Destination */}
            <div className="mt-5">
              <FieldLabel>Destination address</FieldLabel>
              <div className="flex items-center justify-between gap-3 rounded-md bg-cd-input px-3.5 py-3 sm:px-4">
                <span className="min-w-0 truncate font-mono text-[13px] text-cd-text">
                  {selectedAsset?.walletAddress || <span className="font-sans text-cd-faint">No address available</span>}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedAsset?.walletAddress) {
                      navigator.clipboard.writeText(selectedAsset.walletAddress);
                      toast.success('Address copied!');
                    }
                  }}
                  className="flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-cd-accent-text hover:underline"
                >
                  <Copy size={14} strokeWidth={1.75} />
                  Copy
                </button>
              </div>
            </div>

            {/* Providers */}
            <div className="mt-6">
              <FieldLabel>Payment provider</FieldLabel>
              <PlatformGrid items={PURCHASE_PROVIDERS} provider={provider} setProvider={setProvider} />
            </div>
            <div className="mt-5">
              <FieldLabel>Or buy on an exchange</FieldLabel>
              <PlatformGrid items={EXCHANGES} provider={provider} setProvider={setProvider} />
            </div>

            {/* Summary */}
            <div className="mt-6 border-t border-cd-line pt-1">
              <DetailRow label="Price">{selectedAsset ? `${formatPrice(currentPrice)} / ${symbol}` : '—'}</DetailRow>
              <DetailRow label="You pay">{formatCurrency(usdValue || 0)}</DetailRow>
              <DetailRow label="You'll receive (est.)" strong>{estimatedAmount} {symbol}</DetailRow>
            </div>

            <ActionButton variant="primary" onClick={openProvider} className="mt-5 h-12 w-full text-[15px]">
              Continue to {provider}
              <ArrowUpRight size={17} strokeWidth={1.75} />
            </ActionButton>
            <p className="mt-3 text-center text-[12px] text-cd-faint">Opens {provider} in a new tab.</p>
          </Card>
        </div>
      </div>

      <Sheet open={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title="Select asset">
        <ul>
          {assets.map((asset) => (
            <li key={asset.id}>
              <button
                type="button"
                onClick={() => {
                  setSelectedAssetId(asset.id);
                  setIsAssetModalOpen(false);
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-cd-raised"
              >
                <AssetIcon symbol={asset.symbol} size={30} />
                <span className="min-w-0 flex-1">
                  <AssetName symbol={asset.symbol.toUpperCase()} name={asset.name} network={asset.network} />
                </span>
                {selectedAssetId === asset.id && <Check size={17} className="shrink-0 text-cd-accent-text" />}
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </div>
  );
}
