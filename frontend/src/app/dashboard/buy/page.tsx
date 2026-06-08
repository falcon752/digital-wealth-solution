'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { assetsAPI } from '@/lib/api';
import { ChevronRight, CreditCard, CheckCircle2, ChevronDown, X } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

export default function BuyCryptoPage() {
  const router = useRouter();
  const [amount, setAmount] = useState('150');
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [provider, setProvider] = useState<'MoonPay' | 'Transak' | null>(null);
  
  const [assets, setAssets] = useState<any[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [tempProvider, setTempProvider] = useState<'MoonPay' | 'Transak' | null>(null);

  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);

  useEffect(() => {
    assetsAPI.list().then(res => setAssets(res.data.assets || [])).catch(console.error);
    assetsAPI.prices().then(res => setPrices(res.data.prices || {})).catch(console.error);
  }, []);

  const handleBuy = () => {
    if (!provider) {
      setIsProviderModalOpen(true);
      return;
    }

    // Redirect to the appropriate provider
    if (provider === 'MoonPay') {
      window.open(`https://www.moonpay.com/buy?currencyCode=${selectedAsset.toLowerCase()}&baseCurrencyCode=usd&baseCurrencyAmount=${amount}`, '_blank');
    } else if (provider === 'Transak') {
      window.open(`https://global.transak.com/?fiatCurrency=USD&cryptoCurrencyCode=${selectedAsset.toUpperCase()}&fiatAmount=${amount}`, '_blank');
    }
  };

  const currentPrice = prices[selectedAsset] || 0;
  const cryptoAmount = currentPrice > 0 ? (parseFloat(amount || '0') / currentPrice).toFixed(8) : '0.00000000';

  return (
    <div className="flex flex-col min-h-screen pb-20 bg-[#f4f5f8] dark:bg-[#0f172a]">
      <DashboardHeader title={`Buy Crypto`} />

      <div className="flex-1 p-4 mt-6">
        <div className="w-full max-w-md mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-6 flex flex-col items-center">
          
          {/* Amount Input */}
          <div className="flex flex-col items-center w-full mb-8">
            <div className="flex items-center text-gray-900 dark:text-white text-5xl font-semibold mb-2">
              <span className="text-gray-400 mr-2">$</span>
              <input 
                type="number" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-transparent border-none text-gray-900 dark:text-white text-center w-[150px] focus:outline-none focus:ring-0 p-0"
                placeholder="0"
              />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
              ≈ {cryptoAmount} {selectedAsset}
            </p>

            <button 
              onClick={() => setIsAssetModalOpen(true)}
              className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition text-gray-900 dark:text-white text-[13px] font-semibold shadow-sm"
            >
              {selectedAsset} <ChevronDown size={14} />
            </button>
          </div>

          {/* Provider Selector Row */}
          <div className="w-full mb-6">
            <button 
              onClick={() => {
                setTempProvider(provider);
                setIsProviderModalOpen(true);
              }}
              className="w-full flex items-center justify-between p-4 bg-[#f4f5f8] dark:bg-gray-900 hover:bg-gray-200 dark:hover:bg-gray-800 transition rounded-2xl"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                  <CreditCard size={20} className="text-[#2d68d8]" />
                </div>
                <div className="flex flex-col items-start">
                  {provider ? (
                    <>
                      <span className="text-gray-900 dark:text-white font-semibold text-[14px]">{provider}</span>
                      <span className="text-gray-500 dark:text-gray-400 text-[12px]">Selected Provider</span>
                    </>
                  ) : (
                    <>
                      <span className="text-gray-900 dark:text-white font-semibold text-[14px]">Choose Payment Method</span>
                      <span className="text-gray-500 dark:text-gray-400 text-[12px]">Select provider</span>
                    </>
                  )}
                </div>
              </div>
              <ChevronRight size={18} className="text-gray-400" />
            </button>
          </div>

          {/* Buy Button */}
          <div className="w-full">
            <Button 
              onClick={handleBuy}
              className="w-full h-14 bg-[#2d68d8] hover:bg-blue-700 text-white font-semibold text-[16px] rounded-xl"
            >
              Buy {selectedAsset} Now
            </Button>
          </div>
        </div>
      </div>

      {/* Payment Method Modal */}
      <Modal isOpen={isProviderModalOpen} onClose={() => setIsProviderModalOpen(false)} title="Payment Method">
        <div className="space-y-3 py-2">
          
          <button 
            onClick={() => setTempProvider('Transak')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition ${tempProvider === 'Transak' ? 'border-[#3b82f6] bg-blue-50/5 dark:bg-blue-900/10' : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'}`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${tempProvider === 'Transak' ? 'border-[#3b82f6]' : 'border-gray-400'}`}>
              {tempProvider === 'Transak' && <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />}
            </div>
            <div className="flex items-center gap-3">
              <CreditCard size={20} className="text-gray-400" />
              <span className="text-gray-900 dark:text-white font-semibold text-sm">Transak</span>
            </div>
          </button>

          <button 
            onClick={() => setTempProvider('MoonPay')}
            className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition ${tempProvider === 'MoonPay' ? 'border-[#3b82f6] bg-blue-50/5 dark:bg-blue-900/10' : 'border-transparent hover:bg-gray-50 dark:hover:bg-white/5'}`}
          >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${tempProvider === 'MoonPay' ? 'border-[#3b82f6]' : 'border-gray-400'}`}>
              {tempProvider === 'MoonPay' && <div className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />}
            </div>
            <div className="flex items-center gap-3">
              <CreditCard size={20} className="text-gray-400" />
              <span className="text-gray-900 dark:text-white font-semibold text-sm">MoonPay</span>
            </div>
          </button>

          <div className="pt-4">
            <Button 
              className="w-full h-12"
              onClick={() => {
                setProvider(tempProvider);
                setIsProviderModalOpen(false);
              }}
              disabled={!tempProvider}
            >
              Confirm Payment Method
            </Button>
          </div>
        </div>
      </Modal>

      {/* Asset Selection Modal */}
      <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title="Select Asset">
        <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
          {assets.map(a => (
            <button
              key={a.symbol}
              onClick={() => {
                setSelectedAsset(a.symbol.toUpperCase());
                setIsAssetModalOpen(false);
              }}
              className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition"
            >
              <div className="flex items-center gap-3">
                <img 
                  src={`https://assets.coincap.io/assets/icons/${a.symbol.toLowerCase()}@2x.png`} 
                  alt={a.symbol} 
                  className="w-8 h-8 rounded-full object-cover" 
                  onError={(e) => {
                    e.currentTarget.src = `https://ui-avatars.com/api/?name=${a.symbol[0]}&background=3b82f6&color=fff&rounded=true&bold=true`;
                  }}
                />
                <span className="font-semibold text-sm text-gray-900 dark:text-white">{a.symbol.toUpperCase()}</span>
              </div>
              {selectedAsset === a.symbol.toUpperCase() && (
                <CheckCircle2 size={18} className="text-blue-500" />
              )}
            </button>
          ))}
        </div>
      </Modal>

    </div>
  );
}
