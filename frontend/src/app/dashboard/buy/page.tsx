'use client';

import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { assetsAPI } from '@/lib/api';
import { Asset } from '@/types';
import { ArrowUpRight, CheckCircle2, ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

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
    <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 bg-gray-50 dark:bg-[#1f1f1f] flex items-center justify-center border border-gray-100 dark:border-gray-700 shadow-sm">
      <img
        src={item.icon}
        alt={item.id}
        className="w-full h-full object-cover"
      />
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

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-[#f4f5f8] dark:bg-[#050505]">
      <DashboardHeader title="Buy Crypto" backHref="/dashboard/wallet" logo="dwp" />

      <div className="flex-1 p-4 mt-6">
        <div className="w-full max-w-md mx-auto">
          <section className="bg-white dark:bg-[#101010] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-5">Buy crypto</h2>
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Asset</p>
                <button
                  onClick={() => setIsAssetModalOpen(true)}
                  className="w-full flex items-center justify-between rounded-xl bg-[#f4f5f8] dark:bg-[#242424] px-4 py-3 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAsset?.name || 'Select asset'}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{selectedAsset?.symbol || 'Asset'}</p>
                  </div>
                  <ChevronDown size={18} className="text-gray-400" />
                </button>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Destination Address</p>
                <div className="flex items-center justify-between rounded-xl bg-[#f4f5f8] dark:bg-[#242424] px-4 py-3">
                  <span className="text-sm font-medium text-gray-900 dark:text-white truncate pr-4 font-mono">
                    {selectedAsset?.walletAddress || 'No address available'}
                  </span>
                  <button
                    onClick={() => {
                      if (selectedAsset?.walletAddress) {
                        navigator.clipboard.writeText(selectedAsset.walletAddress);
                        toast.success('Address copied!');
                      }
                    }}
                    className="text-[#2d68d8] dark:text-blue-400 hover:text-[#2d68d8]/80 text-sm font-semibold transition"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Amount</p>
                <div className="flex items-center rounded-xl bg-[#f4f5f8] dark:bg-[#242424] px-4 py-3">
                  <span className="text-gray-400 mr-2">$</span>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    className="w-full bg-transparent text-3xl font-semibold text-gray-900 dark:text-white outline-none"
                    placeholder="0"
                  />
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Estimated {estimatedAmount} {selectedAsset?.symbol}</p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Exchange Provider</p>
                <div className="grid grid-cols-2 gap-2">
                  {PURCHASE_PROVIDERS.map((item) => {
                    const active = item.id === provider;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setProvider(item.id)}
                        className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
                          active ? 'border-[#2d68d8] bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <PlatformLogo item={item} />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.id}</p>
                            <p className="text-[11px] capitalize text-gray-500 dark:text-gray-400">{item.type}</p>
                          </div>
                        </div>
                        {active && <CheckCircle2 size={16} className="text-[#2d68d8]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Exchange</p>
                <div className="grid grid-cols-2 gap-2">
                  {EXCHANGES.map((item) => {
                    const active = item.id === provider;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setProvider(item.id)}
                        className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left transition ${
                          active ? 'border-[#2d68d8] bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <PlatformLogo item={item} />
                          <div>
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.id}</p>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400">Exchange login</p>
                          </div>
                        </div>
                        {active && <CheckCircle2 size={16} className="text-[#2d68d8]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button onClick={openProvider} className="w-full h-14 bg-[#2d68d8] hover:bg-blue-700 text-white">
                Continue to {provider}
                <ArrowUpRight size={17} />
              </Button>
            </div>
          </section>
        </div>
      </div>

      <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title="Select Asset">
        <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
          {assets.map((asset) => (
            <button
              key={asset.id}
              onClick={() => {
                setSelectedAssetId(asset.id);
                setIsAssetModalOpen(false);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              <div>
                <span className="block font-semibold text-sm text-gray-900 dark:text-white">{asset.name}</span>
                <span className="block text-xs text-gray-500 dark:text-gray-400">{asset.symbol}</span>
              </div>
              {selectedAssetId === asset.id && <CheckCircle2 size={18} className="text-blue-500" />}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
}
