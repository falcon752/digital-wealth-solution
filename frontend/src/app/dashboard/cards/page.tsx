'use client';

/**
 * The client's Wyoming LLC card. Without a card it shows the application: a quiet eligibility
 * notice, the form with the fee as a label/value list, and a live preview of the card beside it.
 * With a card it follows the account page: the title with the card's actions on the right, the card
 * and its status on the left, its details and benefits on the right.
 */
import { useState, useEffect, type ReactNode } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import toast from 'react-hot-toast';
import { APP_TIMEZONE, cn } from '@/lib/utils';
import { ActionButton, Card, PageHeader, Skeleton, StatusPill } from '@/components/client/ui';
import { CreditCard, CheckCircle2, ChevronDown, Clock, ShieldCheck, CircleDollarSign, Globe, Lock, Copy, Info, Eye, EyeOff, Loader2, PowerOff, RefreshCw, Trash2, X } from 'lucide-react';

const INPUT = 'h-11 w-full rounded-md border border-transparent bg-cd-input px-3.5 text-[14px] text-cd-text placeholder:text-cd-faint focus:border-cd-accent focus:outline-none';

const BENEFITS = [
  { title: 'Fraud Protection', description: '24/7 monitoring for suspicious activity', icon: ShieldCheck },
  { title: 'Cashback Rewards', description: 'Earn up to 2% on all purchases', icon: CircleDollarSign },
  { title: 'Global Acceptance', description: 'Use your card worldwide with no foreign fees', icon: Globe },
  { title: 'Secure Transactions', description: 'Enhanced security with chip technology', icon: Lock },
];

function Benefits() {
  return (
    <Card title="Card benefits">
      <ul className="px-2">
        {BENEFITS.map((b) => (
          <li key={b.title} className="flex items-center gap-3.5 border-b border-cd-line py-3.5 last:border-b-0">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-cd-accent-soft text-cd-accent-text">
              <b.icon size={17} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="text-[14px] font-medium text-cd-text">{b.title}</p>
              <p className="mt-0.5 text-[12.5px] text-cd-muted">{b.description}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/** The card itself. Its artwork keeps fixed colours so it looks like a physical card in either theme. */
function CardArt({ holder, number, type }: { holder: string; number: string; type: string }) {
  return (
    <div className="relative aspect-[1.586/1] w-full max-w-[420px] overflow-hidden rounded-xl bg-gradient-to-br from-[#2a2c31] via-[#17181b] to-[#0b0b0c] p-5 text-white shadow-lg sm:p-6">
      <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-[#5580F6]/15 blur-3xl" />
      <div className="absolute inset-0 rounded-xl ring-1 ring-inset ring-white/10" />
      <div className="relative z-10 flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[13px] font-medium tracking-[0.18em] text-white/70">WYOMING LLC</span>
          <CreditCard size={22} strokeWidth={1.5} className="text-white/60" />
        </div>
        <div>
          <span className="mb-4 block h-7 w-10 rounded-[5px] bg-gradient-to-br from-[#d9c38a] to-[#a68a4e] opacity-90" />
          <p className="font-mono text-[19px] tracking-[0.14em] text-white/90 sm:text-[22px]">{number || '•••• •••• •••• ••••'}</p>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-[10px] uppercase tracking-[0.12em] text-white/45">Card holder</p>
              <p className="truncate text-[14px] font-medium uppercase tracking-wide">{holder}</p>
            </div>
            <p className="shrink-0 text-[17px] font-semibold italic text-white/80">{type}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The dashboard's dialog: a sheet from the bottom on a phone, a centred panel on a computer. */
function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full flex-col rounded-t-xl border border-cd-line bg-cd-card sm:max-w-[520px] sm:rounded-lg">
        <div className="flex items-center justify-between border-b border-cd-line px-5 py-4">
          <h2 className="text-[16px] font-medium text-cd-text">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 rounded-md p-2 text-cd-muted hover:bg-cd-raised hover:text-cd-text">
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

type UserCard = {
  id: string;
  cardHolderName: string;
  cardNumber: string;
  cardType: string;
  status: 'pending' | 'approved' | 'rejected' | 'disabled';
  adminNote?: string | null;
  createdAt?: string;
};

type ApiErrorResponse = {
  error?: string;
};

function formatCardDate(date?: string) {
  if (!date) return 'Pending';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function getValidThru(date?: string) {
  if (!date) return 'Pending';
  const validThru = new Date(date);
  validThru.setFullYear(validThru.getFullYear() + 3);
  return new Intl.DateTimeFormat('en-US', {
    timeZone: APP_TIMEZONE,
    month: '2-digit',
    year: '2-digit',
  }).format(validThru);
}

export default function CardsPage() {
  const { user } = useAuth();
  const [card, setCard] = useState<UserCard | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Application form state
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardType, setCardType] = useState('MasterCard');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [hideInfo, setHideInfo] = useState(false);
  const [totalPortfolioValue, setTotalPortfolioValue] = useState<number>(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const TRC20_WALLET = 'TGtr9dCWPv7JigAktnHRsQb4hyYat1RaYg';

  useEffect(() => {
    if (user) {
      setCardHolderName(`${user.firstName} ${user.lastName}`);
      
      // Calculate total portfolio value (Fiat + Crypto). /users/dashboard-stats has the per-asset
      // balances; /users/balance only returns the USD figure, which counted every client's crypto as $0.
      Promise.all([
        api.get('/users/dashboard-stats'),
        api.get('/assets'),
        api.get('/assets/prices')
      ]).then(([statsRes, assetsRes, pricesRes]) => {
        const dbAssets = assetsRes.data.assets || [];
        const prices = pricesRes.data.prices || {};
        const stats = statsRes.data;
        
        const cryptoUsdValue = dbAssets.reduce((acc: number, a: any) => {
          const symbol = a.symbol.toUpperCase();
          const price = prices[symbol] || 0;
          const balanceCrypto = stats?.assetBalances?.[a.id] || 0;
          return acc + (balanceCrypto * price);
        }, 0);
        
        setTotalPortfolioValue((stats?.balance ?? user.balance ?? 0) + cryptoUsdValue);
      }).catch(console.error).finally(() => setStatsLoading(false));
    }
    generateMockCardNumber();
    fetchCard();
  }, [user]);

  const generateMockCardNumber = () => {
    // Generate a random 16 digit number starting with 4 (Visa) or 5 (MasterCard)
    const prefix = cardType === 'MasterCard' ? '5' : '4';
    const num = prefix + Math.random().toString().slice(2, 17);
    const formatted = num.match(/.{1,4}/g)?.join(' ') || '';
    setCardNumber(formatted);
  };

  useEffect(() => {
    generateMockCardNumber();
  }, [cardType]);

  const fetchCard = async () => {
    try {
      const res = await api.get('/cards');
      if (res.data.cards && res.data.cards.length > 0) {
        setCard(res.data.cards[0]);
      }
    } catch (error) {
      console.error('Failed to fetch card', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (statsLoading) {
      toast.error('Loading portfolio value, please wait...');
      return;
    }
    if (!user || totalPortfolioValue < 1000000) {
      toast.error(`Accredited Investors Only. Minimum balance of $1,000,000 required. (Current: $${totalPortfolioValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})})`);
      return;
    }
    setShowPaymentModal(true);
  };

  const confirmPayment = async () => {
    setIsSubmitting(true);
    try {
      const res = await api.post('/cards/apply', {
        cardHolderName,
        cardNumber,
        cardType
      });
      toast.success(res.data.message || 'Application submitted successfully');
      setCard(res.data.card);
      setShowPaymentModal(false);
    } catch (error: unknown) {
      const message = axios.isAxiosError<ApiErrorResponse>(error)
        ? error.response?.data?.error
        : null;
      toast.error(message || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Address copied to clipboard');
  };

  const handleDisableCard = async () => {
    if (!card) return;
    try {
      const cardId = (card as any)._id || card.id;
      const res = await api.put(`/cards/${cardId}/disable`);
      toast.success('Your card has been disabled successfully');
      setCard(res.data.card);
    } catch (error) {
      toast.error('Failed to disable card');
    }
  };

  const handleDeleteCard = async () => {
    if (!card) return;
    if (!window.confirm('Are you sure you want to permanently delete your card? You can apply for a new one after.')) return;
    try {
      const cardId = (card as any)._id || card.id;
      await api.delete(`/cards/${cardId}`);
      toast.success('Card deleted successfully');
      setCard(null);
    } catch (error) {
      toast.error('Failed to delete card');
    }
  };

  if (loading) {
    return (
      <div className="min-h-full">
        <DashboardHeader title="Cards" breadcrumb />
        <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
          <Skeleton className="hidden h-8 w-48 lg:block" />
          <Skeleton className="mx-auto mt-3 h-4 w-64 lg:mx-0" />
          <div className="mt-8 grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <Skeleton className="aspect-[1.586/1] w-full rounded-xl" />
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // If user already has a card applied
  if (card) {
    const isPending = card.status === 'pending';
    const isApproved = card.status === 'approved';
    const isRejected = card.status === 'rejected';
    const isDisabled = card.status === 'disabled';
    const cardInfo = [
      { label: 'Card Holder', value: hideInfo ? '••••••••••••' : card.cardHolderName },
      { label: 'Card Number', value: hideInfo ? '•••• •••• •••• ••••' : card.cardNumber, mono: true },
      { label: 'Card Type', value: card.cardType },
      { label: 'Status', value: card.status.charAt(0).toUpperCase() + card.status.slice(1) },
      { label: 'Issued', value: formatCardDate(card.createdAt) },
      { label: 'Valid Thru', value: hideInfo ? '••/••' : getValidThru(card.createdAt), mono: true },
    ];
    const status = isPending
      ? { icon: Clock, tone: 'bg-cd-warning/10 text-cd-warning', title: 'Under Review', text: 'Your card application is currently being processed. This usually takes 1-2 business days.' }
      : isApproved
        ? { icon: CheckCircle2, tone: 'bg-cd-positive/10 text-cd-positive', title: 'Card Active', text: 'Your digital card is active and ready to use.' }
        : isRejected
          ? { icon: Clock, tone: 'bg-cd-negative/10 text-cd-negative', title: 'Application Rejected', text: card.adminNote || 'Unfortunately, your application could not be approved at this time.' }
          : isDisabled
            ? { icon: PowerOff, tone: 'bg-cd-raised text-cd-muted', title: 'Card Disabled', text: 'Your card has been disabled successfully and can no longer be used. You can delete it to apply for a new one.' }
            : null;

    const actions = (
      <>
        <ActionButton icon={hideInfo ? Eye : EyeOff} onClick={() => setHideInfo(!hideInfo)}>
          {hideInfo ? 'Show info' : 'Hide info'}
        </ActionButton>
        <ActionButton
          variant="ghost"
          icon={PowerOff}
          onClick={handleDisableCard}
          disabled={card.status === 'disabled' || card.status === 'rejected'}
          className="border-[1.5px] border-cd-line-strong text-cd-text hover:bg-cd-raised"
        >
          Disable
        </ActionButton>
        <button
          type="button"
          onClick={handleDeleteCard}
          title="Delete card"
          aria-label="Delete card"
          className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border-[1.5px] border-cd-line-strong text-cd-negative transition-colors hover:border-cd-negative hover:bg-cd-negative/10"
        >
          <Trash2 size={17} strokeWidth={1.75} />
        </button>
      </>
    );

    return (
      <div className="min-h-full">
        <DashboardHeader title="Your Card" breadcrumb />

        <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
          <PageHeader
            icon={CreditCard}
            title="Your Card"
            titleOnPhone={false}
            meta={[card.cardType, `Issued ${formatCardDate(card.createdAt)}`]}
            actions={<div className="hidden gap-2.5 lg:flex">{actions}</div>}
          />

          <div className="mt-8 grid items-start gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
            <div className="space-y-5">
              <CardArt holder={hideInfo ? '••••••••••••' : card.cardHolderName} number={hideInfo ? '•••• •••• •••• ••••' : card.cardNumber} type={card.cardType} />

              <div className="flex justify-center gap-2.5 lg:hidden">{actions}</div>

              {status && (
                <Card bodyClassName="p-4 sm:p-5">
                  <div className="flex items-start gap-3.5">
                    <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', status.tone)}>
                      <status.icon size={19} strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-[15px] font-medium text-cd-text">{status.title}</h3>
                        <StatusPill status={card.status} />
                      </div>
                      <p className="mt-1 text-[13px] leading-relaxed text-cd-muted">{status.text}</p>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            <div className="space-y-5">
              <Card title="Card information">
                <dl className="px-2 sm:px-2">
                  {cardInfo.map((item) => (
                    <div key={item.label} className="flex items-center justify-between gap-4 border-b border-cd-line py-3.5 last:border-b-0">
                      <dt className="text-[13.5px] text-cd-muted">{item.label}</dt>
                      <dd className={cn('min-w-0 break-words text-right text-[14px] text-cd-text', item.mono && 'cd-num font-mono text-[13.5px]')}>
                        {item.label === 'Status' ? <StatusPill status={card.status} /> : item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </Card>

              <Benefits />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Application form
  return (
    <div className="min-h-full">
      <DashboardHeader title="Cards" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={CreditCard}
          title="Wyoming LLC Card"
          titleOnPhone={false}
          meta={['Accredited investors only', 'Activation fee $5,555.67']}
        />

        <div className="mt-6 flex items-start gap-3 rounded-md bg-cd-raised px-4 py-3">
          <Info size={17} strokeWidth={1.75} className="mt-0.5 shrink-0 text-cd-accent-text" />
          <p className="text-[13.5px] leading-relaxed text-cd-muted">
            <span className="font-medium text-cd-text">Accredited Investors Only.</span>{' '}
            To be eligible for the Wyoming LLC MasterCard, you must have an investment portfolio / social capital of over <span className="font-medium text-cd-text">$1,000,000</span>.
          </p>
        </div>

        <div className="mt-6 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <form onSubmit={handleSubmit} className="min-w-0">
            <Card title="Apply for a card" bodyClassName="px-4 pb-4 sm:px-5 sm:pb-5">
              <div className="space-y-4 pt-1">
                <div>
                  <label htmlFor="card-holder" className="mb-2 block text-[13px] text-cd-muted">Card holder name</label>
                  <input
                    id="card-holder"
                    type="text"
                    value={cardHolderName}
                    onChange={(e) => setCardHolderName(e.target.value)}
                    className={INPUT}
                    required
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label htmlFor="card-number" className="text-[13px] text-cd-muted">Card number</label>
                    <button
                      type="button"
                      onClick={generateMockCardNumber}
                      className="flex items-center gap-1.5 text-[13px] font-medium text-cd-accent-text hover:underline"
                    >
                      <RefreshCw size={13} strokeWidth={2} />
                      Generate card
                    </button>
                  </div>
                  <input
                    id="card-number"
                    type="text"
                    value={cardNumber}
                    readOnly
                    className={cn(INPUT, 'cd-num font-mono text-cd-muted')}
                  />
                </div>

                <div>
                  <label htmlFor="card-type" className="mb-2 block text-[13px] text-cd-muted">Card type</label>
                  <div className="relative">
                    <select
                      id="card-type"
                      value={cardType}
                      onChange={(e) => setCardType(e.target.value)}
                      className={cn(INPUT, 'appearance-none pr-10')}
                    >
                      <option value="MasterCard">MasterCard</option>
                      <option value="Visa">Visa</option>
                    </select>
                    <ChevronDown size={16} strokeWidth={1.75} className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-cd-muted" />
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-cd-line pt-1">
                <div className="flex items-center justify-between gap-4 border-b border-cd-line py-3.5">
                  <span className="text-[13.5px] text-cd-muted">Activation fee</span>
                  <span className="cd-num text-[14px] font-medium text-cd-text">$5,555.67</span>
                </div>
                <div className="flex items-start justify-between gap-4 border-b border-cd-line py-3.5">
                  <span className="text-[13.5px] text-cd-muted">Eligibility</span>
                  <span className="text-right text-[14px] text-cd-text">Portfolio over $1,000,000</span>
                </div>
              </div>

              <p className="mt-3.5 text-[12.5px] leading-relaxed text-cd-faint">
                The Wyoming LLC (Card) is a Decentralized concept that combines quantum security and blockchain technology and has created a new financial system.
              </p>

              <ActionButton type="submit" variant="primary" disabled={isSubmitting} className="mt-5 h-12 w-full text-[15px]">
                {isSubmitting && <Loader2 size={17} className="animate-spin" />}
                Submit application
              </ActionButton>
            </Card>
          </form>

          <div className="space-y-5">
            <div>
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.08em] text-cd-muted">Preview</p>
              <CardArt holder={cardHolderName || 'Card holder'} number={cardNumber} type={cardType} />
            </div>
            <Benefits />
          </div>
        </div>
      </div>

      <Sheet open={showPaymentModal} onClose={() => !isSubmitting && setShowPaymentModal(false)} title="Card activation fee">
        <div className="space-y-5">
          <p className="text-[14px] leading-relaxed text-cd-muted">
            To proceed with your MasterCard request, please complete the payment for the activation fee. This offer is available for Accredited investors only.
          </p>

          <div className="rounded-md bg-cd-raised px-4 py-1">
            <div className="flex items-center justify-between gap-4 border-b border-cd-line py-3">
              <span className="text-[13.5px] text-cd-muted">Card activation fee (incl. tax)</span>
              <span className="cd-num text-[14px] text-cd-text">$5,555.67</span>
            </div>
            <div className="flex items-center justify-between gap-4 py-3">
              <span className="text-[14px] font-medium text-cd-text">Total amount</span>
              <span className="cd-num text-[20px] font-normal text-cd-text">$5,555<span className="text-[0.62em]">.67</span></span>
            </div>
          </div>

          <div>
            <h3 className="text-[15px] font-medium text-cd-text">Payment method</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-cd-muted">
              Payment is only accepted via <strong className="font-medium text-cd-text">USDT</strong> on the <strong className="font-medium text-cd-text">TRC20 network</strong>. Sending any other coin or using a different network may result in loss of funds.
            </p>

            <label htmlFor="trc20" className="mb-2 mt-4 block text-[11px] font-medium uppercase tracking-[0.06em] text-cd-muted">Company USDT TRC20 address</label>
            <div className="flex items-center gap-2">
              <input
                id="trc20"
                type="text"
                readOnly
                value={TRC20_WALLET}
                className={cn(INPUT, 'min-w-0 flex-1 font-mono text-[13px]')}
              />
              <button
                type="button"
                onClick={() => copyToClipboard(TRC20_WALLET)}
                aria-label="Copy address"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-cd-accent-soft text-cd-accent-text transition-colors hover:bg-cd-raised"
              >
                <Copy size={17} strokeWidth={1.75} />
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md bg-cd-accent-soft px-4 py-3">
            <Info size={17} strokeWidth={1.75} className="mt-0.5 shrink-0 text-cd-accent-text" />
            <p className="text-[13.5px] leading-relaxed text-cd-text">
              Your card will be processed and issued within 1-2 business days after payment confirmation.
            </p>
          </div>

          <div className="flex gap-2.5 pt-1">
            <ActionButton onClick={() => setShowPaymentModal(false)} disabled={isSubmitting} className="h-11 flex-1">
              Cancel
            </ActionButton>
            <ActionButton variant="primary" onClick={confirmPayment} disabled={isSubmitting} className="h-11 flex-[2]">
              {isSubmitting ? <Loader2 size={17} className="animate-spin" /> : 'Confirm payment'}
            </ActionButton>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
