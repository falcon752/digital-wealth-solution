'use client';

import { useEffect, useState } from 'react';
import { assetsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Asset } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { ArrowDown, X, ChevronDown, Check, ChevronLeft, Search, Info } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

// Helper for crypto icons
function getAssetColor(symbol: string) {
  const colors: Record<string, string> = {
    BTC: '#F7931A', ETH: '#627EEA', DOGE: '#C2A633', LTC: '#BFBBBB',
    XRP: '#23292F', XLM: '#08B5E5', USDT: '#26A17B', USDC: '#2775CA',
    BNB: '#F3BA2F', SOL: '#14F195', ADA: '#0033AD'
  };
  return colors[symbol.toUpperCase()] || '#3b82f6';
}

function AssetIcon({ symbol }: { symbol: string }) {
  return (
    <img 
      src={`https://assets.coincap.io/assets/icons/${symbol.toLowerCase()}@2x.png`} 
      alt={symbol} 
      className="w-6 h-6 rounded-full object-cover shrink-0" 
      onError={(e) => {
        e.currentTarget.onerror = null; 
        e.currentTarget.src = `https://ui-avatars.com/api/?name=${symbol[0]}&background=${getAssetColor(symbol).replace('#','')}&color=fff&rounded=true&bold=true`;
      }}
    />
  );
}

export default function LendingPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  
  const [collateralAsset, setCollateralAsset] = useState<Asset | null>(null);
  const [loanAsset, setLoanAsset] = useState<Asset | null>(null);
  const [collateralAmount, setCollateralAmount] = useState('1');
  
  const ltv = 0.5; // 50%
  const apr = 0.15; // 15% fixed
  
  const [modalType, setModalType] = useState<'collateral' | 'loan' | null>(null);
  const [search, setSearch] = useState('');
  const [payoutAddress, setPayoutAddress] = useState('');
  const [email, setEmail] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    assetsAPI.list().then(res => {
      const data = res.data.assets || [];
      setAssets(data);
      if (data.length > 0) {
        setCollateralAsset(data.find((a: Asset) => a.symbol === 'BTC') || data[0]);
        setLoanAsset(data.find((a: Asset) => a.symbol === 'USDT') || data.find((a: Asset) => a.symbol === 'USDC') || data[0]);
      }
    });
    assetsAPI.prices().then(res => setPrices(res.data.prices || {}));
  }, []);

  // calculations
  const colPrice = collateralAsset ? (prices[collateralAsset.symbol] || 0) : 0;
  const colUsd = (Number(collateralAmount) || 0) * colPrice;
  const loanUsd = colUsd * ltv;
  const loanPrice = loanAsset ? (prices[loanAsset.symbol] || 1) : 1;
  const loanAmount = loanPrice > 0 ? loanUsd / loanPrice : 0;

  // Confirm step calculations
  const monthlyInterest = (loanAmount * apr) / 12;
  const originationFee = loanAmount * 0.01; // Example 1%
  const marginCallPrice = colPrice > 0 ? (loanUsd / 0.8) / (Number(collateralAmount) || 1) : 0; // Margin call if LTV hits 80%

  const handleConfirm = async () => {
    if (!payoutAddress) return toast.error('Please enter a payout address');
    if (!termsAccepted) return toast.error('Please accept the terms');
    
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      toast.success('Loan request submitted successfully!');
      router.push('/dashboard');
    }, 1500);
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full pb-20 bg-gray-50 dark:bg-gray-900">
      <DashboardHeader title={step === 1 ? "Crypto Lending" : "Confirm Loan"} />

      {/* STEP 1: CALCULATOR */}
      {step === 1 && (
        <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full">
          <h1 className="text-[32px] md:text-[40px] font-bold text-gray-900 dark:text-white leading-tight mb-8">
            Borrow, earn,<br />trade, save
          </h1>

          <div className="bg-white dark:bg-gray-800 rounded-[28px] p-2 shadow-sm border border-gray-100 dark:border-gray-700/50">
            {/* Tabs */}
            <div className="flex bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-1 mb-4">
              <button className="flex-1 py-2.5 rounded-xl bg-white dark:bg-gray-800 shadow-sm text-sm font-bold text-gray-900 dark:text-white">Borrow</button>
              <button className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">Earn</button>
            </div>

            {/* Collateral Input */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 mb-2">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Collateral</div>
              <div className="flex items-center justify-between gap-4">
                <input 
                  type="number" 
                  value={collateralAmount}
                  onChange={(e) => setCollateralAmount(e.target.value)}
                  className="bg-transparent text-[24px] font-bold text-gray-900 dark:text-white w-full focus:outline-none"
                  placeholder="0.00"
                />
                <button 
                  onClick={() => setModalType('collateral')}
                  className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 shrink-0 hover:bg-gray-50 transition-colors"
                >
                  {collateralAsset && <AssetIcon symbol={collateralAsset.symbol} />}
                  <span className="font-bold text-gray-900 dark:text-white">{collateralAsset?.symbol}</span>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
              </div>
              <div className="text-sm font-medium text-gray-500 mt-2">
                ~{formatCurrency(colUsd)}
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex justify-center -my-3 z-10">
              <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center justify-center text-gray-400">
                <ArrowDown size={16} />
              </div>
            </div>

            {/* Loan Output */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 mt-2 mb-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Loan</div>
              <div className="flex items-center justify-between gap-4">
                <div className="text-[24px] font-bold text-gray-900 dark:text-white truncate">
                  {loanAmount.toFixed(2)}
                </div>
                <button 
                  onClick={() => setModalType('loan')}
                  className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 shrink-0 hover:bg-gray-50 transition-colors"
                >
                  {loanAsset && <AssetIcon symbol={loanAsset.symbol} />}
                  <span className="font-bold text-gray-900 dark:text-white">{loanAsset?.symbol}</span>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>
              </div>
              <div className="text-sm font-medium text-gray-500 mt-2">
                ~{formatCurrency(loanUsd)}
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-2 mb-4">
              <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-1 text-sm font-medium text-gray-500">
                  LTV <Info size={14} />
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-gray-900 dark:text-white">
                  50% <ChevronDown size={14} />
                </div>
              </div>
              <div className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-1 text-sm font-medium text-gray-500">
                  APR <Info size={14} />
                </div>
                <div className="flex items-center gap-1 text-sm font-bold text-gray-900 dark:text-white">
                  15% <ChevronDown size={14} />
                </div>
              </div>
            </div>

            <Button 
              className="w-full mt-2 py-4 text-lg rounded-2xl bg-blue-600! hover:bg-blue-700! text-white! shadow-lg shadow-blue-600/30!"
              onClick={() => {
                if (Number(collateralAmount) > 0) setStep(2);
                else toast.error('Please enter a collateral amount');
              }}
            >
              Get loan
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: CONFIRM */}
      {step === 2 && (
        <div className="flex-1 p-4 md:p-6 max-w-md mx-auto w-full">
          <div className="flex items-center gap-3 mb-6">
            <button onClick={() => setStep(1)} className="p-2 -ml-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
              <ChevronLeft size={24} className="text-gray-900 dark:text-white" />
            </button>
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">Confirm your loan</h1>
          </div>

          <div className="space-y-6">
            {/* Pairs */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <X size={24} className="text-gray-400" />
                <div>
                  <div className="text-xs font-medium text-gray-500">Your Collateral</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white">{collateralAsset?.symbol}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {loanAsset && <AssetIcon symbol={loanAsset.symbol} />}
                <div>
                  <div className="text-xs font-medium text-gray-500">Your loan</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {loanAsset?.symbol}
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white leading-none">TRX</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Details List */}
            <div className="space-y-4 py-4 border-y border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1 text-gray-500">Loan-to-Value <Info size={14} /></span>
                <span className="font-bold text-gray-900 dark:text-white">50%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1 text-gray-500">APR <Info size={14} /></span>
                <span className="font-bold text-gray-900 dark:text-white">Fixed 15%</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1 text-gray-500">Duration <Info size={14} /></span>
                <span className="font-bold text-gray-900 dark:text-white">Unlimited</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1 text-gray-500">Monthly interest <Info size={14} /></span>
                <span className="font-bold text-gray-900 dark:text-white">{monthlyInterest.toFixed(6)} {loanAsset?.symbol}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1 text-gray-500">Origination fee <Info size={14} /></span>
                <span className="font-bold text-gray-900 dark:text-white">{originationFee.toFixed(6)} {loanAsset?.symbol}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-1 text-gray-500">Margin call <Info size={14} /></span>
                <span className="font-bold text-gray-900 dark:text-white">{marginCallPrice.toFixed(2)} {collateralAsset?.symbol}/USD</span>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-4">
              <div>
                <label className="flex justify-between items-center text-sm font-medium text-gray-500 mb-2">
                  <span className="flex items-center gap-1">Your {loanAsset?.symbol} payout address <Info size={14} /></span>
                </label>
                <Input 
                  type="text" 
                  placeholder={`Enter your ${loanAsset?.symbol || 'wallet'} address`} 
                  value={payoutAddress}
                  onChange={(e) => setPayoutAddress(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div>
                <label className="flex justify-between items-center text-sm font-medium text-gray-500 mb-2">
                  <span className="flex items-center gap-1">Email <Info size={14} /></span>
                  <span className="text-blue-600 cursor-pointer">Verify with Phone</span>
                </label>
                <Input 
                  type="email" 
                  placeholder="example@domain.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              <div className="flex items-start gap-3 pt-2">
                <input 
                  type="checkbox" 
                  id="terms" 
                  className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <label htmlFor="terms" className="text-sm text-gray-500">
                  I've read and agree to the Platform's <a href="#" className="text-blue-600 hover:underline">Terms of Use</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                </label>
              </div>
            </div>

            <Button 
              className="w-full mt-2 py-4 text-lg rounded-2xl bg-blue-600! hover:bg-blue-700! text-white! shadow-lg shadow-blue-600/30!"
              onClick={handleConfirm}
              loading={isSubmitting}
            >
              Confirm
            </Button>
          </div>
        </div>
      )}

      {/* Asset Selector Modal */}
      {modalType && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-gray-100 dark:bg-gray-900 animate-in slide-in-from-bottom-full duration-300">
          <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Choose asset</h2>
            <button onClick={() => setModalType(null)} className="p-2 -mr-2 text-gray-400 hover:text-gray-600">
              <X size={24} />
            </button>
          </div>
          
          <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search crypto" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 text-[15px] py-3 pl-10 pr-4 rounded-xl focus:outline-none border border-gray-100 dark:border-gray-700"
              />
            </div>
            <div className="text-sm font-medium text-gray-500 mt-4 px-1">Crypto assets</div>
          </div>

          <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-800 pb-safe">
            {filteredAssets.map((asset) => {
              const isSelected = modalType === 'collateral' 
                ? collateralAsset?.symbol === asset.symbol 
                : loanAsset?.symbol === asset.symbol;
                
              return (
                <div 
                  key={asset.id} 
                  onClick={() => {
                    if (modalType === 'collateral') setCollateralAsset(asset);
                    else setLoanAsset(asset);
                    setModalType(null);
                    setSearch('');
                  }}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <AssetIcon symbol={asset.symbol} />
                    <div className="flex flex-col">
                      <span className="font-bold text-gray-900 dark:text-white">{asset.symbol}</span>
                      <span className="text-sm text-gray-500">{asset.name}</span>
                    </div>
                  </div>
                  {isSelected && <Check size={20} className="text-blue-600" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
