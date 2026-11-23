'use client';

/**
 * Create a crypto deposit, in Anchorage's step style: pick the asset, enter the amount in US
 * dollars (the asset amount is worked out underneath), then continue to the address step.
 */
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDownToLine, Check, ChevronDown } from 'lucide-react';
import { assetsAPI } from '@/lib/api';
import { Asset } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, AssetIcon, Card, PageHeader } from '@/components/client/ui';
import { cn } from '@/lib/utils';

const INPUT = 'h-11 w-full rounded-md border border-transparent bg-cd-input px-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';

export default function DepositPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Asset | null>(null);
  const [dropOpen, setDropOpen] = useState(false);
  const [usdAmount, setUsdAmount] = useState('');
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    Promise.all([assetsAPI.list(), assetsAPI.prices()])
      .then(([listRes, pricesRes]) => {
        const list: Asset[] = listRes.data.assets;
        setAssets(list);
        if (list.length) setSelected(list[0]);
        setPrices(pricesRes.data.prices || {});
      })
      .catch(console.error);
  }, []);

  // close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropOpen(false);
      }
    }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const cryptoAmount = (() => {
    const usd = parseFloat(usdAmount);
    if (!selected || !usd || usd <= 0) return '0.00000000';
    const price = prices[selected.symbol.toUpperCase()];
    if (!price) return '0.00000000';
    return (usd / price).toFixed(8);
  })();

  function handleContinue() {
    if (!selected || !usdAmount || parseFloat(usdAmount) <= 0) return;
    const params = new URLSearchParams({
      assetId: selected.id,
      symbol: selected.symbol,
      name: selected.name,
      network: selected.network || selected.symbol + ' Network',
      walletAddress: selected.walletAddress || '',
      qrCodeImage: selected.qrCodeImage || '',
      usdAmount,
      cryptoAmount,
    });
    router.push(`/dashboard/crypto/deposit/confirm?${params.toString()}`);
  }

  const usdValue = parseFloat(usdAmount);
  const canContinue = !!selected && !!usdAmount && usdValue > 0;

  return (
    <div className="min-h-full">
      <DashboardHeader title="Deposit crypto" backHref="/dashboard/crypto" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="mx-auto w-full max-w-[600px]">
          <PageHeader icon={ArrowDownToLine} title="Create new deposit" titleOnPhone={false} meta={['Choose an asset and the amount you will send']} />

          <Card className="mt-6 lg:mt-8">
            <div className="space-y-5">
              {/* Asset */}
              <div ref={dropRef} className="relative">
                <p className="mb-1.5 text-[13px] text-cd-muted">Asset</p>
                <button
                  type="button"
                  onClick={() => setDropOpen((o) => !o)}
                  aria-expanded={dropOpen}
                  className={cn(INPUT, 'flex items-center justify-between gap-3 text-left', dropOpen && 'border-cd-accent')}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    {selected && <AssetIcon symbol={selected.symbol} size={22} />}
                    {selected ? (
                      <span className="truncate">
                        {selected.symbol}
                        <span className="mx-1.5 text-cd-faint">|</span>
                        {selected.name}
                      </span>
                    ) : (
                      <span className="text-cd-faint">Select asset</span>
                    )}
                  </span>
                  <ChevronDown size={17} className={cn('shrink-0 text-cd-muted transition-transform', dropOpen && 'rotate-180')} />
                </button>

                {dropOpen && (
                  <div className="absolute inset-x-0 top-full z-20 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-cd-line bg-cd-raised py-1 shadow-lg">
                    {assets.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => { setSelected(a); setDropOpen(false); }}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[14px] text-cd-text hover:bg-cd-band"
                      >
                        <AssetIcon symbol={a.symbol} size={22} />
                        <span className="min-w-0 flex-1 truncate">
                          {a.symbol}
                          <span className="mx-1.5 text-cd-faint">|</span>
                          {a.name}
                          {a.network && a.network !== a.name && <span className="ml-2 text-[12px] text-cd-muted">{a.network}</span>}
                        </span>
                        {selected?.id === a.id && <Check size={16} className="shrink-0 text-cd-text" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Amount */}
              <div>
                <p className="mb-1.5 text-[13px] text-cd-muted">Amount</p>
                <div className="flex h-11 items-center rounded-md border border-transparent bg-cd-input px-3.5 focus-within:border-cd-accent">
                  <span className="mr-2 text-[14px] text-cd-muted">$</span>
                  <input
                    type="number"
                    min="0"
                    value={usdAmount}
                    onChange={(e) => setUsdAmount(e.target.value)}
                    placeholder="0.00"
                    className="cd-num min-w-0 flex-1 bg-transparent text-[14px] text-cd-text placeholder:text-cd-faint focus:outline-none"
                  />
                  <span className="ml-2 text-[13px] text-cd-muted">USD</span>
                </div>
                {selected && (
                  <p className="cd-num mt-2 text-[13px] text-cd-muted">
                    ≈ {cryptoAmount} {selected.symbol}
                  </p>
                )}
              </div>
            </div>
          </Card>

          <ActionButton variant="primary" onClick={handleContinue} disabled={!canContinue} className="mt-6 h-11 w-full">
            Continue
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
