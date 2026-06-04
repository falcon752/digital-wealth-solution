'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Copy, Check, ChevronRight, X } from 'lucide-react';
import { assetsAPI, depositsAPI } from '@/lib/api';
import { Asset } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Image from 'next/image';

// Helper to assign colors to crypto icons
function getAssetColor(symbol: string) {
  const colors: Record<string, string> = {
    BTC: '#F7931A', ETH: '#627EEA', DOGE: '#C2A633', LTC: '#BFBBBB',
    XRP: '#23292F', XLM: '#08B5E5', USDT: '#26A17B', USDC: '#2775CA',
    BNB: '#F3BA2F', SOL: '#14F195', ADA: '#0033AD'
  };
  return colors[symbol.toUpperCase()] || '#3b82f6';
}

const schema = z.object({
  amount: z.string().min(1, 'Enter amount').refine((v) => !isNaN(Number(v)) && Number(v) > 0, 'Must be > 0'),
  txHash: z.string().optional(),
  usdValue: z.string().optional(),
});

type DepositForm = z.infer<typeof schema>;

export default function DepositPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
          if (match) setSelectedAsset(match);
        }
      }
    }).catch(console.error);
  }, []);

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
    reset();
  };

  if (submitted) {
    return (
      <div className="flex flex-col min-h-full">
        <DashboardHeader title="Receive Crypto" />
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="glass rounded-2xl p-10 text-center max-w-md">
            <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
              <Check size={28} className="text-emerald-400" />
            </div>
            <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Deposit Submitted</h2>
            <p className="text-[var(--text-muted)] text-sm mb-6">
              Your deposit request has been submitted. The admin will verify and confirm your balance shortly.
            </p>
            <Button onClick={resetFlow}>Make Another Deposit</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full pb-20">
      {!selectedAsset ? (
        <>
          <DashboardHeader title="Receive Crypto" subtitle="Select an asset to receive" />
          <div className="flex-1 p-5">
            <h2 className="text-[18px] font-bold text-gray-900 dark:text-white mb-4 px-1">Available Assets</h2>
            <div className="space-y-3">
              {assets.map((a) => (
                <div
                  key={a.id}
                  onClick={() => setSelectedAsset(a)}
                  className="flex items-center p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 bg-gray-50 dark:bg-gray-700 flex items-center justify-center border border-gray-100 dark:border-gray-600">
                    <img 
                      src={`https://assets.coincap.io/assets/icons/${a.symbol.toLowerCase()}@2x.png`} 
                      alt={a.symbol} 
                      className="w-full h-full object-cover" 
                      onError={(e) => {
                        e.currentTarget.onerror = null; 
                        e.currentTarget.src = `https://ui-avatars.com/api/?name=${a.symbol[0]}&background=${getAssetColor(a.symbol).replace('#','')}&color=fff&rounded=true&bold=true`;
                      }}
                    />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="font-bold text-[16px] text-gray-900 dark:text-white">{a.name}</p>
                    <p className="text-[13px] font-medium text-gray-500 dark:text-gray-400 mt-0.5">{a.network || a.symbol}</p>
                  </div>
                  <ChevronRight size={20} className="text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 flex flex-col">
          {/* Custom Header for Step 2 */}
          <div className="flex items-center justify-between px-5 h-16 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
            <button onClick={() => setSelectedAsset(null)} className="p-2 -ml-2 text-[#2d68d8] hover:text-blue-700 transition-colors">
              <X size={20} strokeWidth={2.5} />
            </button>
            <h1 className="text-[17px] font-bold text-gray-900 dark:text-white">Receive {selectedAsset.name}</h1>
            <div className="w-10"></div> {/* Spacer for exact centering */}
          </div>

          <div className="flex-1 p-5 max-w-md mx-auto w-full space-y-6">
            
            {/* Screenshot Card UI */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-none dark:border dark:border-gray-700/50 flex flex-col items-center border border-gray-50">
              
              <div className="flex items-center justify-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-full bg-[#fef4ed] dark:bg-orange-900/20 flex items-center justify-center overflow-hidden shrink-0">
                  <img 
                    src={`https://assets.coincap.io/assets/icons/${selectedAsset.symbol.toLowerCase()}@2x.png`} 
                    alt={selectedAsset.symbol} 
                    className="w-6 h-6 object-cover" 
                    onError={(e) => {
                      e.currentTarget.onerror = null; 
                      e.currentTarget.src = `https://ui-avatars.com/api/?name=${selectedAsset.symbol[0]}&background=${getAssetColor(selectedAsset.symbol).replace('#','')}&color=fff&rounded=true&bold=true`;
                    }}
                  />
                </div>
                <div>
                  <h3 className="font-bold text-[16px] text-gray-900 dark:text-white">{selectedAsset.network || selectedAsset.name} Network</h3>
                </div>
              </div>
              
              <p className="text-[14px] font-medium text-[#8f9bb3] dark:text-gray-400 mb-8 text-center">Scan QR code to receive</p>
              
              {selectedAsset.qrCodeImage ? (
                <div className="bg-white p-2 rounded-2xl mb-8">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`http://localhost:5000${selectedAsset.qrCodeImage}`}
                    alt="Wallet QR Code"
                    className="w-48 h-48 object-contain"
                  />
                </div>
              ) : (
                <div className="w-48 h-48 bg-gray-50 dark:bg-gray-700 rounded-2xl mb-8 flex items-center justify-center text-gray-400 text-sm font-medium">
                  No QR Code
                </div>
              )}

              <div className="w-full bg-[#f4f6fa] dark:bg-gray-900/50 rounded-[14px] p-2 flex items-center justify-between gap-3">
                <div className="flex-1 overflow-hidden">
                  <p className="text-[13px] font-medium text-gray-600 dark:text-gray-300 truncate w-full pl-3">
                    {selectedAsset.walletAddress}
                  </p>
                </div>
                <button
                  onClick={copyAddress}
                  className="bg-[#2d68d8] text-white px-5 py-2.5 rounded-[10px] text-[14px] font-bold flex items-center gap-2 hover:bg-blue-700 transition-colors shrink-0"
                >
                  {copied ? <Check size={16} strokeWidth={2.5} /> : <Copy size={16} strokeWidth={2.5} />}
                  Copy
                </button>
              </div>
            </div>

            {/* Submission Form below */}
            <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
              <h3 className="text-[16px] font-bold text-gray-900 dark:text-white mb-5">Confirm Deposit</h3>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <Input
                  label="Amount sent"
                  type="number"
                  step="any"
                  placeholder="0.00"
                  error={errors.amount?.message}
                  {...register('amount')}
                />
                
                <Input
                  label="USD Value (optional)"
                  type="number"
                  step="any"
                  placeholder="Estimated USD value"
                  error={errors.usdValue?.message}
                  {...register('usdValue')}
                />
                
                <Input
                  label="Transaction Hash (optional)"
                  placeholder="0x..."
                  error={errors.txHash?.message}
                  {...register('txHash')}
                />

                <Button type="submit" className="w-full bg-[#1e3a8a] text-white mt-2" size="lg" loading={isSubmitting}>
                  Submit Details
                </Button>
              </form>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}
