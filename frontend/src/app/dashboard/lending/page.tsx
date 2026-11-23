'use client';

/**
 * Borrow against crypto or put it to work, in two steps. Step 1 is a calculator laid out like the
 * Convert page (grey fields with the asset on the left and a large light amount on the right, the
 * LTV and APR pickers, one full-width action). Step 2 follows Anchorage's review screen: a title,
 * then label/value lists split by thin lines, the contact fields and the confirm button.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { assetsAPI, loansAPI, earnsAPI } from '@/lib/api';
import { cn, formatCurrency } from '@/lib/utils';
import { Asset } from '@/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { ActionButton, AssetIcon, AssetName, Card, PageHeader, Tabs, formatAmount } from '@/components/client/ui';
import { ArrowDown, ArrowLeft, Check, ChevronDown, Coins, Loader2, Search, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

const INPUT = 'h-11 w-full rounded-md border border-transparent bg-cd-input px-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';
const AMOUNT_INPUT = 'cd-num w-full bg-transparent text-right text-[26px] font-light leading-tight text-cd-text placeholder:text-cd-faint focus:outline-none [appearance:textfield] sm:text-[30px] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none';

/** The asset button on the left of a grey amount field. */
function AssetButton({ asset, onClick }: { asset: Asset | null; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex shrink-0 items-center gap-2.5 rounded-md py-1 pr-1.5 text-left transition-opacity hover:opacity-80">
      {asset ? <AssetIcon symbol={asset.symbol} size={28} /> : <span className="h-7 w-7 rounded-full bg-cd-raised" />}
      <span className="min-w-0">
        <span className="block text-[15px] font-medium leading-tight text-cd-text">{asset?.symbol?.toUpperCase() || 'Select'}</span>
        {asset?.name && <span className="block max-w-[110px] truncate text-[12px] leading-tight text-cd-muted sm:max-w-[160px]">{asset.name}</span>}
      </span>
      <ChevronDown size={16} strokeWidth={1.75} className="text-cd-muted" />
    </button>
  );
}

/** A grey field: the asset on the left, the amount (input or figure) on the right with its USD value under it. */
function AmountField({ label, asset, onPick, usd, children }: { label: string; asset: Asset | null; onPick: () => void; usd: number; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-[13px] text-cd-muted">{label}</p>
      <div className="flex items-center justify-between gap-3 rounded-md bg-cd-input px-3.5 py-3 sm:px-4">
        <AssetButton asset={asset} onClick={onPick} />
        <div className="min-w-0 flex-1 text-right">
          {children}
          <p className="cd-num mt-0.5 text-[12.5px] text-cd-muted">≈ {formatCurrency(usd)}</p>
        </div>
      </div>
    </div>
  );
}

/** A label/value row; `stacked` puts the label in a fixed column like Anchorage's review screen. */
function Row({ label, children, stacked = false }: { label: string; children: ReactNode; stacked?: boolean }) {
  if (stacked) {
    return (
      <div className="grid grid-cols-[minmax(0,120px)_minmax(0,1fr)] gap-4 py-2.5 sm:grid-cols-[170px_minmax(0,1fr)]">
        <span className="text-[13.5px] text-cd-muted">{label}</span>
        <div className="cd-num min-w-0 break-words text-[14px] text-cd-text">{children}</div>
      </div>
    );
  }
  return (
    <div className="flex items-start justify-between gap-4 border-t border-cd-line py-3.5 first:border-t-0">
      <span className="text-[13.5px] text-cd-muted">{label}</span>
      <span className="cd-num text-right text-[14px] text-cd-text">{children}</span>
    </div>
  );
}

/** A group of review rows, separated from the next by a thin line. */
function Group({ children }: { children: ReactNode }) {
  return <div className="border-t border-cd-line py-3 first:border-t-0 first:pt-0">{children}</div>;
}

/** A figure in the review list: the amount with its unit set smaller, and the USD value underneath. */
function Figure({ amount, symbol, sub }: { amount: string; symbol?: string; sub?: ReactNode }) {
  return (
    <div>
      <p className="text-[18px] font-light leading-tight text-cd-text">
        {amount} {symbol && <span className="text-[13px] font-normal">{symbol}</span>}
      </p>
      {sub && <p className="mt-1 text-[13px] text-cd-muted">{sub}</p>}
    </div>
  );
}

/** The dashboard's dialog: full height from the bottom on a phone, a centred panel on a computer. */
function Sheet({ title, onClose, children, full = false }: { title: string; onClose: () => void; children: ReactNode; full?: boolean }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className={cn(
        'relative flex w-full flex-col border border-cd-line bg-cd-card sm:max-h-[80vh] sm:max-w-[440px] sm:rounded-lg',
        full ? 'h-full sm:h-auto' : 'max-h-[85vh] rounded-t-xl',
      )}>
        <div className="flex items-center justify-between px-5 pb-3 pt-4">
          <h2 className="text-[16px] font-medium text-cd-text">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 rounded-md p-2 text-cd-muted hover:bg-cd-raised hover:text-cd-text">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Terms({ id, checked, onChange }: { id: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-start gap-3">
      <input
        type="checkbox"
        id={id}
        className="mt-0.5 h-4 w-4 shrink-0 accent-cd-accent"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <label htmlFor={id} className="text-[13px] leading-relaxed text-cd-muted">
        I&apos;ve read and agree to the Platform&apos;s <a href="#" className="text-cd-accent-text hover:underline">Terms of Use</a> and <a href="#" className="text-cd-accent-text hover:underline">Privacy Policy</a>
      </label>
    </div>
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

  const earnApy = 0.25; // 25%
  
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
  const STABLECOINS = ['USDT', 'USDC'];
  const earnPriceValue = earnAsset
    ? (STABLECOINS.includes(earnAsset.symbol.toUpperCase()) ? 1 : (prices[earnAsset.symbol] || 1))
    : 1;
  const earnUsd = (Number(earnAmount) || 0) * earnPriceValue;
  const earnYearlyReward = (Number(earnAmount) || 0) * earnApy;
  const earnMonthlyReward = earnYearlyReward / 12;
  const earnDailyReward = earnYearlyReward / 365;
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

  const headerTitle = step === 1 ? (activeTab === 'borrow' ? "Crypto Lending" : "Crypto Invest") : (activeTab === 'borrow' ? "Confirm Loan" : "Confirm Invest");
  const colSymbol = collateralAsset?.symbol?.toUpperCase() || '';
  const loanSymbol = loanAsset?.symbol?.toUpperCase() || '';
  const earnSymbol = earnAsset?.symbol?.toUpperCase() || '';
  const pickerAsset = modalType === 'collateral' ? collateralAsset : modalType === 'earn' ? earnAsset : loanAsset;

  return (
    <div className="min-h-full">
      <DashboardHeader title={headerTitle} backHref="/dashboard/finance" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <div className="mx-auto w-full max-w-[600px]">

          {/* STEP 1: CALCULATOR */}
          {step === 1 && (
            <>
              <PageHeader
                icon={Coins}
                title="Borrow, invest, earn"
                titleOnPhone={false}
                meta={['Crypto-backed loans and competitive yields on your digital assets']}
              />

              <Tabs
                className="mt-6"
                tabs={[{ value: 'borrow', label: 'Borrow' }, { value: 'earn', label: 'Invest' }]}
                value={activeTab}
                onChange={setActiveTab}
              />

              <Card className="mt-5" bodyClassName="p-4 sm:p-6">
                {activeTab === 'borrow' ? (
                  <>
                    <AmountField label="Collateral" asset={collateralAsset} onPick={() => setModalType('collateral')} usd={colUsd}>
                      <input
                        type="number"
                        inputMode="decimal"
                        aria-label="Collateral amount"
                        value={collateralAmount}
                        onChange={(e) => setCollateralAmount(e.target.value)}
                        className={AMOUNT_INPUT}
                        placeholder="0.00"
                      />
                    </AmountField>

                    <div className="my-4 flex items-center gap-3" aria-hidden>
                      <span className="h-px flex-1 bg-cd-line" />
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-cd-line-strong text-cd-muted">
                        <ArrowDown size={17} strokeWidth={1.75} />
                      </span>
                      <span className="h-px flex-1 bg-cd-line" />
                    </div>

                    <AmountField label="Loan" asset={loanAsset} onPick={() => setModalType('loan')} usd={loanUsd}>
                      <p className="cd-num truncate text-[26px] font-light leading-tight text-cd-text sm:text-[30px]">{loanAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </AmountField>

                    {/* LTV and APR */}
                    <div className="mt-5 grid grid-cols-2 gap-2.5">
                      {[
                        { key: 'ltv' as const, label: 'LTV', value: `${ltv * 100}%` },
                        { key: 'apr' as const, label: 'APR', value: aprOption.label },
                      ].map((item) => (
                        <button
                          key={item.key}
                          type="button"
                          onClick={() => setModalType(item.key)}
                          className="flex h-12 items-center justify-between gap-2 rounded-md bg-cd-input px-3.5 text-left transition-colors hover:bg-cd-raised"
                        >
                          <span className="text-[13px] text-cd-muted">{item.label}</span>
                          <span className="cd-num flex items-center gap-1.5 text-[14px] font-medium text-cd-text">
                            {item.value}
                            <ChevronDown size={15} strokeWidth={1.75} className="text-cd-muted" />
                          </span>
                        </button>
                      ))}
                    </div>

                    <div className="mt-5 border-t border-cd-line pt-1">
                      <Row label="Monthly interest">{formatAmount(monthlyInterest, loanSymbol)}</Row>
                      <Row label="Duration">{aprOption.term}</Row>
                    </div>

                    <ActionButton
                      variant="primary"
                      className="mt-5 h-12 w-full text-[15px]"
                      onClick={() => {
                        if (Number(collateralAmount) > 0) setStep(2);
                        else toast.error('Please enter a collateral amount');
                      }}
                    >
                      Get loan
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <AmountField label="Your deposit" asset={earnAsset} onPick={() => setModalType('earn')} usd={earnUsd}>
                      <input
                        type="number"
                        inputMode="decimal"
                        aria-label="Deposit amount"
                        value={earnAmount}
                        onChange={(e) => setEarnAmount(e.target.value)}
                        className={AMOUNT_INPUT}
                        placeholder="0.00"
                      />
                    </AmountField>

                    <div className="mt-5 border-t border-cd-line pt-1">
                      <Row label="25% APY">{earnTotal1Year.toFixed(2)} {earnSymbol} in 1 year</Row>
                      <Row label="Earn term">Unlimited</Row>
                      <Row label="Interest accrual">Daily</Row>
                      <Row label="Monthly reward">{earnMonthlyReward.toFixed(2)} {earnSymbol}</Row>
                      <Row label="Daily reward">{earnDailyReward.toFixed(2)} {earnSymbol}</Row>
                    </div>

                    <ActionButton
                      variant="primary"
                      className="mt-5 h-12 w-full text-[15px]"
                      onClick={() => {
                        if (Number(earnAmount) > 0) setStep(2);
                        else toast.error('Please enter a deposit amount');
                      }}
                    >
                      Start earning
                    </ActionButton>
                  </>
                )}
              </Card>
            </>
          )}

          {/* STEP 2: REVIEW */}
          {step === 2 && (
            <>
              <button
                type="button"
                onClick={() => setStep(1)}
                className="-ml-1 mb-4 flex items-center gap-1.5 rounded-md px-1 py-1 text-[13.5px] text-cd-muted transition-colors hover:text-cd-text"
              >
                <ArrowLeft size={16} strokeWidth={1.75} />
                Back to {activeTab === 'borrow' ? 'loan' : 'invest'} calculator
              </button>

              <h1 className="text-[24px] font-normal leading-tight text-cd-text sm:text-[28px]">
                {activeTab === 'borrow' ? "Confirm your loan" : "Confirm your saving"}
              </h1>
              <p className="mt-2 text-[14px] text-cd-muted">
                {activeTab === 'borrow'
                  ? `Borrow ${loanSymbol} against your ${colSymbol}`
                  : "Don't just hold, but make daily profits on your cryptocurrency."}
              </p>

              <Card className="mt-6" bodyClassName="p-4 sm:p-6">
                {activeTab === 'borrow' ? (
                  <>
                    <Group>
                      <Row stacked label="Collateral">
                        <Figure amount={formatAmount(Number(collateralAmount) || 0)} symbol={colSymbol} sub={`${formatCurrency(colUsd)} @ ${formatCurrency(colPrice)}/${colSymbol}`} />
                      </Row>
                      <Row stacked label="Loan">
                        <Figure amount={formatAmount(loanAmount)} symbol={loanSymbol} sub={formatCurrency(loanUsd)} />
                      </Row>
                    </Group>
                    <Group>
                      <Row stacked label="Assets">
                        <div className="space-y-2.5">
                          {collateralAsset && (
                            <div className="flex items-center gap-2.5"><AssetIcon symbol={collateralAsset.symbol} size={22} /><AssetName symbol={colSymbol} name={collateralAsset.name} /></div>
                          )}
                          {loanAsset && (
                            <div className="flex items-center gap-2.5"><AssetIcon symbol={loanAsset.symbol} size={22} /><AssetName symbol={loanSymbol} name={loanAsset.name} /></div>
                          )}
                        </div>
                      </Row>
                    </Group>
                    <Group>
                      <Row stacked label="Loan-to-Value">{ltv * 100}%</Row>
                      <Row stacked label="APR">{aprOption.label}</Row>
                      <Row stacked label="Duration">{aprOption.term}</Row>
                      <Row stacked label="Monthly interest">{monthlyInterest.toFixed(6)} {loanAsset?.symbol}</Row>
                      <Row stacked label="Origination fee">{originationFee.toFixed(6)} {loanAsset?.symbol}</Row>
                      <Row stacked label="Margin call">{marginCallPrice.toFixed(2)} {collateralAsset?.symbol}/USD</Row>
                    </Group>

                    {/* Contact */}
                    <div className="space-y-4 border-t border-cd-line pt-5">
                      <div>
                        <label htmlFor="payout" className="mb-2 block text-[13px] text-cd-muted">Your {loanAsset?.symbol} payout address</label>
                        <input
                          id="payout"
                          type="text"
                          placeholder={`Enter your ${loanAsset?.symbol || 'wallet'} address`}
                          value={payoutAddress}
                          onChange={(e) => setPayoutAddress(e.target.value)}
                          className={cn(INPUT, 'font-mono text-[13px]')}
                        />
                      </div>

                      <div>
                        <div className="mb-2 flex items-center justify-between">
                          <label htmlFor="email" className="text-[13px] text-cd-muted">Email</label>
                          <span className="cursor-pointer text-[13px] font-medium text-cd-accent-text">Verify with Phone</span>
                        </div>
                        <input
                          id="email"
                          type="email"
                          placeholder="example@domain.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={INPUT}
                        />
                      </div>

                      <Terms id="terms" checked={termsAccepted} onChange={setTermsAccepted} />
                    </div>

                    <ActionButton variant="primary" className="mt-6 h-12 w-full text-[15px]" onClick={handleConfirmBorrow} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 size={17} className="animate-spin" />}
                      Confirm
                    </ActionButton>
                  </>
                ) : (
                  <>
                    <Group>
                      <Row stacked label="Deposit">
                        <Figure amount={String(earnAmount)} symbol={earnAsset?.symbol} sub={formatCurrency(earnUsd)} />
                      </Row>
                      {earnAsset && (
                        <Row stacked label="Asset">
                          <div className="flex items-center gap-2.5"><AssetIcon symbol={earnAsset.symbol} size={22} /><AssetName symbol={earnSymbol} name={earnAsset.name} /></div>
                        </Row>
                      )}
                    </Group>
                    <Group>
                      <Row stacked label="Annual percentage yield">25%</Row>
                      <Row stacked label="Daily reward">{earnDailyReward.toFixed(2)} {earnAsset?.symbol}</Row>
                      <Row stacked label="Monthly reward">{earnMonthlyReward.toFixed(2)} {earnAsset?.symbol}</Row>
                      <Row stacked label="Yearly reward">{earnYearlyReward.toFixed(2)} {earnAsset?.symbol}</Row>
                      <Row stacked label="Earn term">Unlimited</Row>
                      <Row stacked label="Interest accumulation period">Daily</Row>
                    </Group>

                    {/* Contact */}
                    <div className="space-y-4 border-t border-cd-line pt-5">
                      <div>
                        <label htmlFor="email-earn" className="mb-2 block text-[13px] text-cd-muted">Email</label>
                        <input
                          id="email-earn"
                          type="email"
                          placeholder="example@domain.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className={INPUT}
                        />
                        <p className="mt-2 cursor-pointer text-[13px] font-medium text-cd-accent-text">Verify with Phone</p>
                      </div>

                      <ActionButton variant="outline" className="h-11 w-full" onClick={() => toast.success('Verification link sent to email')}>
                        Verify
                      </ActionButton>

                      <Terms id="terms-earn" checked={termsAccepted} onChange={setTermsAccepted} />
                    </div>

                    <ActionButton variant="primary" className="mt-6 h-12 w-full text-[15px]" onClick={handleConfirmEarn} disabled={isSubmitting}>
                      {isSubmitting && <Loader2 size={17} className="animate-spin" />}
                      Confirm
                    </ActionButton>
                  </>
                )}
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Asset picker */}
      {(modalType === 'collateral' || modalType === 'loan' || modalType === 'earn') && (
        <Sheet title="Choose asset" onClose={() => setModalType(null)} full>
          <div className="px-5 pb-3">
            <div className="relative">
              <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-cd-faint" />
              <input
                type="text"
                placeholder="Search crypto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={cn(INPUT, 'pl-10')}
              />
            </div>
            <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.06em] text-cd-muted">Crypto assets</p>
          </div>

          <ul className="flex-1 overflow-y-auto px-2 pb-3">
            {filteredAssets.map((asset) => {
              const isSelected = pickerAsset?.symbol === asset.symbol;
              return (
                <li key={asset.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (modalType === 'collateral') setCollateralAsset(asset);
                      else if (modalType === 'earn') setEarnAsset(asset);
                      else setLoanAsset(asset);
                      setModalType(null);
                      setSearch('');
                    }}
                    className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left transition-colors hover:bg-cd-raised"
                  >
                    <AssetIcon symbol={asset.symbol} size={30} />
                    <span className="min-w-0 flex-1">
                      <AssetName symbol={asset.symbol.toUpperCase()} name={asset.name} network={asset.network} />
                    </span>
                    {isSelected && <Check size={17} className="shrink-0 text-cd-accent-text" />}
                  </button>
                </li>
              );
            })}
            {filteredAssets.length === 0 && <li className="px-3 py-8 text-center text-[13px] text-cd-muted">No assets match “{search}”</li>}
          </ul>
        </Sheet>
      )}

      {/* LTV & APR pickers */}
      {(modalType === 'ltv' || modalType === 'apr') && (
        <Sheet title={modalType === 'ltv' ? 'Choose LTV' : 'Choose APR'} onClose={() => setModalType(null)}>
          <ul className="overflow-y-auto px-2 pb-4">
            {modalType === 'ltv' && [0.35, 0.60, 0.80, 0.90].map((val) => (
              <li key={val}>
                <button
                  type="button"
                  onClick={() => { setLtv(val); setModalType(null); }}
                  className="flex w-full items-center justify-between rounded-md px-3 py-3.5 text-left transition-colors hover:bg-cd-raised"
                >
                  <span className="cd-num text-[15px] text-cd-text">{Math.round(val * 100)}%</span>
                  {ltv === val && <Check size={17} className="text-cd-accent-text" />}
                </button>
              </li>
            ))}

            {modalType === 'apr' && [
              { apr: 0.1195, label: '11.95%', liqLtv: '80% Liq. LTV', term: 'Unlimited' },
              { apr: 0.15, label: '15%', liqLtv: '95% Liq. LTV', term: 'Unlimited' },
              { apr: 0.14, label: '14%', liqLtv: '95% Liq. LTV', term: '30 days' },
            ].map((opt, idx) => (
              <li key={idx}>
                <button
                  type="button"
                  onClick={() => { setAprOption(opt); setModalType(null); }}
                  className="flex w-full items-center justify-between rounded-md px-3 py-3 text-left transition-colors hover:bg-cd-raised"
                >
                  <span>
                    <span className="cd-num block text-[15px] text-cd-text">{opt.label}</span>
                    <span className="mt-0.5 block text-[12.5px] text-cd-muted">{opt.liqLtv}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-[14px] text-cd-text">{opt.term}</span>
                    <span className="w-[17px]">{aprOption.apr === opt.apr && <Check size={17} className="text-cd-accent-text" />}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
      )}
    </div>
  );
}
