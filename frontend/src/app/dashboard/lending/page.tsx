'use client';

import { useEffect, useState } from 'react';
import { assetsAPI, loansAPI, earnsAPI } from '@/lib/api';
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
  const [activeTab, setActiveTab] = useState<'borrow' | 'earn'>('borrow');
  const [assets, setAssets] = useState<Asset[]>([]);
  const [prices, setPrices] = useState<Record<string, number>>({});
  
  // Borrow state
  const [collateralAsset, setCollateralAsset] = useState<Asset | null>(null);
  const [loanAsset, setLoanAsset] = useState<Asset | null>(null);
  const [collateralAmount, setCollateralAmount] = useState('1');
  
  // New LTV & APR states
  const [ltv, setLtv] = useState(0.5); // Default 50%
  const [aprOption, setAprOption] = useState({ apr: 0.1195, label: '11.95%', liqLtv: '80% Liq. LTV', term: 'Unlimited' });
  const apr = aprOption.apr;
  
  // Earn state
  const [earnAsset, setEarnAsset] = useState<Asset | null>(null);
  const [earnAmount, setEarnAmount] = useState('9800');

  const earnApy = 0.05; // 5%
  
  const [modalType, setModalType] = useState<'collateral' | 'loan' | 'earn' | 'ltv' | 'apr' | null>(null);
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
        const stablecoin = data.find((a: Asset) => a.symbol === 'USDT') || data.find((a: Asset) => a.symbol === 'USDC') || data[0];
        setLoanAsset(stablecoin);
        setEarnAsset(stablecoin);
      }
    });
    assetsAPI.prices().then(res => setPrices(res.data.prices || {}));
  }, []);

  // Borrow calculations
  const colPrice = collateralAsset ? (prices[collateralAsset.symbol] || 0) : 0;
  const colUsd = (Number(collateralAmount) || 0) * colPrice;
  const loanUsd = colUsd * ltv;
  const loanPrice = loanAsset ? (prices[loanAsset.symbol] || 1) : 1;
  const loanAmount = loanPrice > 0 ? loanUsd / loanPrice : 0;

  const monthlyInterest = (loanAmount * apr) / 12;
  const originationFee = loanAmount * 0.01; // Example 1%
  const marginCallPrice = colPrice > 0 ? (loanUsd / 0.8) / (Number(collateralAmount) || 1) : 0; // Margin call if LTV hits 80%

  // Earn calculations
  const earnPriceValue = earnAsset ? (prices[earnAsset.symbol] || 1) : 1;
  const earnUsd = (Number(earnAmount) || 0) * earnPriceValue;
  const earnYearlyReward = (Number(earnAmount) || 0) * earnApy;
  const earnMonthlyReward = earnYearlyReward / 12;
  const earnTotal1Year = (Number(earnAmount) || 0) + earnYearlyReward;

  const handleConfirmBorrow = async () => {
    if (!payoutAddress) return toast.error('Please enter a payout address');
    if (!email) return toast.error('Please enter your contact email');
    if (!termsAccepted) return toast.error('Please accept the terms');
    if (!collateralAsset || !loanAsset) return toast.error('Please select assets');
    
    setIsSubmitting(true);
    
    try {
      await loansAPI.create({
        collateralAsset: collateralAsset.symbol,
        collateralAmount: Number(collateralAmount),
        loanAsset: loanAsset.symbol,
        loanAmount,
        ltv,
        apr,
        monthlyInterest,
        originationFee,
        payoutAddress,
        contactEmail: email
      });
      
      toast.success('Loan request submitted successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to submit loan request');
      setIsSubmitting(false);
    }
  };

  const handleConfirmEarn = async () => {
    if (!email) return toast.error('Please enter your contact email');
    if (!termsAccepted) return toast.error('Please accept the terms');
    if (!earnAsset) return toast.error('Please select an asset');
    
    setIsSubmitting(true);
    
    try {
      await earnsAPI.create({
        asset: earnAsset.symbol,
        amount: Number(earnAmount),
        apy: earnApy,
        monthlyReward: earnMonthlyReward,
        term: 'Unlimited',
        contactEmail: email
      });

      toast.success('Saving deposit started successfully!');
      router.push('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Failed to start saving deposit');
      setIsSubmitting(false);
    }
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) || 
    a.symbol.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex flex-col min-h-full pb-20 bg-gray-50 dark:bg-gray-900">
      <DashboardHeader title={step === 1 ? (activeTab === 'borrow' ? "Crypto Lending" : "Crypto Saving") : (activeTab === 'borrow' ? "Confirm Loan" : "Confirm Saving")} />

      {/* STEP 1: CALCULATOR */}
      {step === 1 && (
        <div className="flex-1 p-4 md:p-6 max-w-2xl mx-auto w-full">
          <h1 className="text-[32px] md:text-[40px] font-semibold text-gray-900 dark:text-white leading-tight mb-8">
            Borrow, earn,<br />trade, <span className="font-light italic">save</span>
          </h1>

          <div className="bg-white dark:bg-gray-800 rounded-[28px] p-2 shadow-sm border border-gray-100 dark:border-gray-700/50">
            {/* Tabs */}
            <div className="flex bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-1 mb-4">
              <button 
                onClick={() => setActiveTab('borrow')}
                className={`flex-1 py-2.5 rounded-xl shadow-sm text-sm font-bold transition-colors ${activeTab === 'borrow' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >Borrow</button>
              <button 
                onClick={() => setActiveTab('earn')}
                className={`flex-1 py-2.5 rounded-xl shadow-sm text-sm font-bold transition-colors ${activeTab === 'earn' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-white'}`}
              >Earn</button>
            </div>

            {activeTab === 'borrow' ? (
              <>
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
                  <div 
                    onClick={() => setModalType('ltv')}
                    className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-500">
                      LTV <Info size={14} />
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-gray-900 dark:text-white">
                      {ltv * 100}% <ChevronDown size={14} />
                    </div>
                  </div>
                  <div 
                    onClick={() => setModalType('apr')}
                    className="flex-1 bg-gray-50 dark:bg-gray-900/50 rounded-xl p-3 flex justify-between items-center cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-1 text-sm font-medium text-gray-500">
                      APR <Info size={14} />
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold text-gray-900 dark:text-white">
                      {aprOption.label} <ChevronDown size={14} />
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
              </>
            ) : (
              <>
                {/* Earn Input */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-4 mb-4 mt-2">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Your deposit</div>
                  <div className="flex items-center justify-between gap-4">
                    <input 
                      type="number" 
                      value={earnAmount}
                      onChange={(e) => setEarnAmount(e.target.value)}
                      className="bg-transparent text-[24px] font-bold text-gray-900 dark:text-white w-full focus:outline-none"
                      placeholder="0.00"
                    />
                    <button 
                      onClick={() => setModalType('earn')}
                      className="flex items-center gap-2 bg-white dark:bg-gray-800 px-3 py-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 shrink-0 hover:bg-gray-50 transition-colors"
                    >
                      {earnAsset && <AssetIcon symbol={earnAsset.symbol} />}
                      <span className="font-bold text-gray-900 dark:text-white">{earnAsset?.symbol}</span>
                      <ChevronDown size={16} className="text-gray-400" />
                    </button>
                  </div>
                  <div className="text-sm font-medium text-gray-500 mt-2">
                    ~{formatCurrency(earnUsd)}
                  </div>
                </div>

                {/* Earn Stats */}
                <div className="space-y-4 px-2 mb-6">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 border-b border-dashed border-gray-400 pb-0.5">5% APY</span>
                    <span className="font-medium text-gray-900 dark:text-white">{earnTotal1Year.toFixed(2)} {earnAsset?.symbol} in 1 year</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 border-b border-dashed border-gray-400 pb-0.5">Earn term</span>
                    <span className="font-medium text-gray-900 dark:text-white">Unlimited</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 border-b border-dashed border-gray-400 pb-0.5">Interest accrual</span>
                    <span className="font-medium text-gray-900 dark:text-white">Daily</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-500 border-b border-dashed border-gray-400 pb-0.5">Monthly reward</span>
                    <span className="font-medium text-gray-900 dark:text-white">{earnMonthlyReward.toFixed(2)} {earnAsset?.symbol}</span>
                  </div>
                </div>

                <Button 
                  className="w-full mt-2 py-4 text-lg rounded-2xl bg-blue-600! hover:bg-blue-700! text-white! shadow-lg shadow-blue-600/30!"
                  onClick={() => {
                    if (Number(earnAmount) > 0) setStep(2);
                    else toast.error('Please enter a deposit amount');
                  }}
                >
                  Start earning
                </Button>
              </>
            )}
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
            <h1 className="text-[24px] font-bold text-gray-900 dark:text-white">
              {activeTab === 'borrow' ? "Confirm your loan" : "Confirm your saving"}
            </h1>
          </div>

          {activeTab === 'borrow' ? (
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
                  <span className="font-bold text-gray-900 dark:text-white">{ltv * 100}%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1 text-gray-500">APR <Info size={14} /></span>
                  <span className="font-bold text-gray-900 dark:text-white">{aprOption.label}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="flex items-center gap-1 text-gray-500">Duration <Info size={14} /></span>
                  <span className="font-bold text-gray-900 dark:text-white">{aprOption.term}</span>
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
                onClick={handleConfirmBorrow}
                loading={isSubmitting}
              >
                Confirm
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <p className="text-gray-500 dark:text-gray-400 text-[15px]">
                Don't just hold, but make daily profits on your cryptocurrency.
              </p>

              <div className="flex items-center gap-3 py-2">
                {earnAsset && <AssetIcon symbol={earnAsset.symbol} />}
                <div>
                  <div className="text-xs font-medium text-gray-500">Your deposit</div>
                  <div className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    {earnAmount} {earnAsset?.symbol}
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white leading-none">TRX</span>
                  </div>
                </div>
              </div>

              {/* Details List */}
              <div className="space-y-4 py-4 border-y border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Annual percentage yield</span>
                  <span className="font-bold text-gray-900 dark:text-white">5%</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Monthly Reward</span>
                  <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                    {earnMonthlyReward.toFixed(2)} {earnAsset?.symbol}
                    <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-red-500 text-white leading-none">TRX</span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Yearly Reward</span>
                  <span className="font-bold text-gray-900 dark:text-white flex items-center gap-1">
                    {earnYearlyReward.toFixed(2)} {earnAsset?.symbol}
                    <span className="px-1 py-0.5 rounded text-[8px] font-bold bg-red-500 text-white leading-none">TRX</span>
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Earn term</span>
                  <span className="font-bold text-gray-900 dark:text-white">Unlimited</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500">Interest accumulation period</span>
                  <span className="font-bold text-gray-900 dark:text-white">Daily</span>
                </div>
              </div>

              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="flex justify-between items-center text-sm font-medium text-gray-500 mb-2">
                    <span className="flex items-center gap-1">Email <Info size={14} /></span>
                  </label>
                  <Input 
                    type="email" 
                    placeholder="example@domain.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-xl bg-gray-50 dark:bg-gray-900/50"
                  />
                  <div className="mt-2 text-sm text-blue-600 cursor-pointer font-medium">Verify with Phone</div>
                </div>

                <Button 
                  className="w-full py-4 text-[15px] font-medium rounded-2xl bg-white! dark:bg-gray-800! text-gray-900! dark:text-white! border! border-gray-200! dark:border-gray-700! hover:bg-gray-50! dark:hover:bg-gray-700!"
                  onClick={() => toast.success('Verification link sent to email')}
                >
                  Verify
                </Button>

                <Button 
                  className="w-full py-4 text-[15px] font-bold rounded-2xl bg-blue-600! hover:bg-blue-700! text-white!"
                  onClick={handleConfirmEarn}
                  loading={isSubmitting}
                >
                  Confirm
                </Button>

                <div className="flex items-start gap-3 pt-2">
                  <input 
                    type="checkbox" 
                    id="terms-earn" 
                    className="mt-1 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <label htmlFor="terms-earn" className="text-sm text-gray-500">
                    I've read and agree to the Platform's <a href="#" className="text-blue-600 hover:underline">Terms of Use</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Asset Selector Modal */}
      {(modalType === 'collateral' || modalType === 'loan' || modalType === 'earn') && (
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
                : modalType === 'earn' ? earnAsset?.symbol === asset.symbol : loanAsset?.symbol === asset.symbol;
                
              return (
                <div 
                  key={asset.id} 
                  onClick={() => {
                    if (modalType === 'collateral') setCollateralAsset(asset);
                    else if (modalType === 'earn') setEarnAsset(asset);
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

      {/* LTV & APR Modals */}
      {(modalType === 'ltv' || modalType === 'apr') && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 animate-in fade-in duration-200" onClick={() => setModalType(null)}>
          <div 
            className="w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-[32px] sm:rounded-2xl flex flex-col animate-in slide-in-from-bottom-full duration-300 pb-safe"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex justify-between items-center p-6 mb-2">
              <h2 className="text-[20px] font-medium text-gray-900 dark:text-white">
                {modalType === 'ltv' ? 'Choose LTV' : 'Choose APR'}
              </h2>
              <button onClick={() => setModalType(null)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            {/* List */}
            <div className="flex flex-col pb-8 px-2">
              {modalType === 'ltv' && [0.5, 0.65, 0.8, 0.9].map((val) => (
                <div 
                  key={val}
                  onClick={() => { setLtv(val); setModalType(null); }}
                  className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <span className="text-[17px] text-gray-900 dark:text-white">{val * 100}%</span>
                  {ltv === val && <Check size={20} className="text-blue-600" />}
                </div>
              ))}

              {modalType === 'apr' && [
                { apr: 0.1195, label: '11.95%', liqLtv: '80% Liq. LTV', term: 'Unlimited' },
                { apr: 0.15, label: '15%', liqLtv: '95% Liq. LTV', term: 'Unlimited' },
                { apr: 0.14, label: '14%', liqLtv: '95% Liq. LTV', term: '30 days' },
              ].map((opt, idx) => (
                <div 
                  key={idx}
                  onClick={() => { setAprOption(opt); setModalType(null); }}
                  className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  <div className="flex flex-col gap-1">
                    <span className="text-[17px] text-gray-900 dark:text-white">{opt.label}</span>
                    <span className="text-[15px] text-gray-400">{opt.liqLtv}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[17px] text-gray-900 dark:text-white">{opt.term}</span>
                    {aprOption.apr === opt.apr && <Check size={20} className="text-blue-600" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
