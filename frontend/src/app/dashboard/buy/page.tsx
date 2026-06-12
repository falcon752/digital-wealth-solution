'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { assetsAPI, depositsAPI } from '@/lib/api';
import { Asset } from '@/types';
import { ArrowUpRight, Building2, CheckCircle2, ChevronDown, Copy, CreditCard, Landmark, Smartphone, WalletCards } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';

type ProviderType = 'provider' | 'exchange';
type ProviderId = 'MoonPay' | 'Transak' | 'Simplex' | 'Ramp' | 'Coinbase' | 'Gemini' | 'Uphold';
type PaymentMethod = 'Card' | 'Apple Pay' | 'Bank Transfer' | 'Google Pay';

const PROVIDERS: Array<{ id: ProviderId; type: ProviderType; url: string }> = [
  { id: 'MoonPay', type: 'provider', url: 'https://www.moonpay.com/buy' },
  { id: 'Transak', type: 'provider', url: 'https://global.transak.com/' },
  { id: 'Simplex', type: 'provider', url: 'https://simplex.com/buy' },
  { id: 'Ramp', type: 'provider', url: 'https://app.ramp.network/buy' },
  { id: 'Coinbase', type: 'exchange', url: 'https://www.coinbase.com/buy' },
  { id: 'Gemini', type: 'exchange', url: 'https://exchange.gemini.com/deposit' },
  { id: 'Uphold', type: 'exchange', url: 'https://wallet.uphold.com/dashboard' },
];

const PAYMENT_METHODS: Array<{ id: PaymentMethod; icon: typeof CreditCard }> = [
  { id: 'Card', icon: CreditCard },
  { id: 'Apple Pay', icon: Smartphone },
  { id: 'Bank Transfer', icon: Landmark },
  { id: 'Google Pay', icon: WalletCards },
];

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
  return PROVIDERS.find((p) => p.id === provider)?.url || '#';
}

export default function BuyCryptoPage() {
  const router = useRouter();
  const [amount, setAmount] = useState('150');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [providerReference, setProviderReference] = useState('');
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [provider, setProvider] = useState<ProviderId>('MoonPay');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Card');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [hasOpenedProvider, setHasOpenedProvider] = useState(false);

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
  const selectedProvider = PROVIDERS.find((item) => item.id === provider) || PROVIDERS[0];
  const currentPrice = selectedAsset ? prices[selectedAsset.symbol.toUpperCase()] || 0 : 0;
  const estimatedAmount = currentPrice > 0 ? (parseFloat(amount || '0') / currentPrice).toFixed(8) : '0.00000000';
  const amountToSubmit = parseFloat(cryptoAmount || estimatedAmount || '0');
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
    setHasOpenedProvider(true);
  };

  const copyWallet = async () => {
    if (!selectedAsset?.walletAddress) return;
    await navigator.clipboard.writeText(selectedAsset.walletAddress);
    toast.success('Wallet address copied');
  };

  const submitDeposit = async () => {
    if (!selectedAsset) return;
    if (!amountToSubmit || amountToSubmit <= 0) {
      toast.error('Enter the crypto amount purchased or transferred');
      return;
    }

    setSubmitting(true);
    try {
      await depositsAPI.create({
        assetId: selectedAsset.id,
        amount: amountToSubmit,
        usdValue: usdValue > 0 ? usdValue : undefined,
        txHash: txHash || undefined,
        sourceType: selectedProvider.type,
        provider,
        paymentMethod,
        providerReference: providerReference || undefined,
      });
      toast.success('Deposit request submitted for admin review');
      router.push('/dashboard/crypto/deposits');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to submit deposit';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-[#f4f5f8] dark:bg-[#181818]">
      <DashboardHeader title="Buy Crypto" />

      <div className="flex-1 p-4 mt-6">
        <div className="w-full max-w-3xl mx-auto grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <section className="bg-white dark:bg-[#2c2c2c] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5">
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
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Provider or Exchange</p>
                <div className="grid grid-cols-2 gap-2">
                  {PROVIDERS.map((item) => {
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
                          {item.type === 'exchange' ? <Building2 size={17} className="text-gray-500" /> : <CreditCard size={17} className="text-gray-500" />}
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
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Payment Method</p>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_METHODS.map(({ id, icon: Icon }) => {
                    const active = id === paymentMethod;
                    return (
                      <button
                        key={id}
                        onClick={() => setPaymentMethod(id)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-semibold transition ${
                          active ? 'border-[#2d68d8] bg-blue-50 text-[#2d68d8] dark:bg-blue-900/20' : 'border-gray-200 text-gray-700 dark:border-gray-700 dark:text-gray-200'
                        }`}
                      >
                        <Icon size={17} />
                        {id}
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

          <section className="bg-white dark:bg-[#2c2c2c] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Destination Wallet</p>
                <div className="rounded-xl bg-[#f4f5f8] dark:bg-[#242424] p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{selectedAsset?.symbol || 'Asset'} wallet address</p>
                  <p className="font-mono text-xs text-gray-900 dark:text-gray-100 break-all">{selectedAsset?.walletAddress || 'No wallet configured'}</p>
                  <button onClick={copyWallet} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#2d68d8]">
                    <Copy size={13} /> Copy address
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
                <Input
                  label="Crypto Amount Received"
                  type="number"
                  step="any"
                  placeholder={estimatedAmount}
                  value={cryptoAmount}
                  onChange={(event) => setCryptoAmount(event.target.value)}
                />
                <Input
                  label="Transaction Hash (optional)"
                  placeholder="Blockchain transaction hash"
                  value={txHash}
                  onChange={(event) => setTxHash(event.target.value)}
                />
                <Input
                  label="Provider Reference (optional)"
                  placeholder="Order ID or exchange reference"
                  value={providerReference}
                  onChange={(event) => setProviderReference(event.target.value)}
                />
              </div>

              <Button
                onClick={submitDeposit}
                loading={submitting}
                disabled={!selectedAsset || !hasOpenedProvider}
                className="w-full h-12 bg-green-600 hover:bg-green-700 text-white"
              >
                Confirm Deposit
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
