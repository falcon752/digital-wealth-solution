'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import Modal from '@/components/ui/Modal';
import { CreditCard, CheckCircle2, Clock, ShieldCheck, CircleDollarSign, Globe, Lock, Copy, Info, Eye, EyeOff, PowerOff, Trash2 } from 'lucide-react';

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
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function getValidThru(date?: string) {
  if (!date) return 'Pending';
  const validThru = new Date(date);
  validThru.setFullYear(validThru.getFullYear() + 3);
  return new Intl.DateTimeFormat('en-US', {
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
  const TRC20_WALLET = 'TGtr9dCWPv7JigAktnHRsQb4hyYat1RaYg';

  useEffect(() => {
    if (user) {
      setCardHolderName(`${user.firstName} ${user.lastName}`);
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
    if (!user || (user.balance ?? 0) < 1000000) {
      toast.error('Accredited Investors Only. Minimum balance of $1,000,000 required.');
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
      const res = await api.put(`/cards/${card.id}/disable`);
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
      await api.delete(`/cards/${card.id}`);
      toast.success('Card deleted successfully');
      setCard(null);
    } catch (error) {
      toast.error('Failed to delete card');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#050505]">
        <DashboardHeader title="Cards" logo="dwp" />
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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

    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#050505] pb-20">
        <DashboardHeader title="Your Card" logo="dwp" />
        
        <div className="p-4 flex-1 flex flex-col items-center mt-6">
          <div className="w-full max-w-sm aspect-[1.586/1] rounded-2xl p-6 relative overflow-hidden shadow-xl bg-gradient-to-br from-gray-800 to-gray-900 text-white">
            {/* Card Background elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
            
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium tracking-widest text-gray-300">Wyoming LLC</span>
                <CreditCard size={24} className="text-gray-300 opacity-80" />
              </div>
              
              <div className="space-y-4">
                <div className="text-2xl font-mono tracking-widest text-gray-200">
                  {hideInfo ? '•••• •••• •••• ••••' : card.cardNumber}
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Card Holder</div>
                    <div className="font-medium tracking-wide uppercase">{hideInfo ? '••••••••••••' : card.cardHolderName}</div>
                  </div>
                  <div className="font-semibold italic text-lg opacity-80">
                    {card.cardType}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm mt-5 bg-white dark:bg-[#101010] rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Card Information</h3>
            <div className="grid grid-cols-2 gap-3">
              {cardInfo.map((item) => (
                <div key={item.label} className="rounded-xl bg-gray-50 dark:bg-[#101010] px-4 py-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">
                    {item.label}
                  </div>
                  <div className={`mt-1 text-sm font-semibold text-gray-900 dark:text-white break-words ${item.mono ? 'font-mono' : ''}`}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full max-w-sm mt-4 flex gap-3">
            <button
              onClick={() => setHideInfo(!hideInfo)}
              className="flex-[2] flex items-center justify-center gap-2 py-3 bg-white dark:bg-[#101010] border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              {hideInfo ? <Eye size={18} /> : <EyeOff size={18} />}
              {hideInfo ? 'Show Info' : 'Hide Info'}
            </button>
            <button
              onClick={handleDisableCard}
              disabled={card.status === 'disabled' || card.status === 'rejected'}
              className="flex-[2] flex items-center justify-center gap-2 py-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl text-sm font-medium text-amber-600 dark:text-amber-400 shadow-sm hover:bg-amber-100 dark:hover:bg-amber-900/30 transition disabled:opacity-50"
            >
              <PowerOff size={18} />
              Disable
            </button>
            <button
              onClick={handleDeleteCard}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 shadow-sm hover:bg-red-100 dark:hover:bg-red-900/30 transition"
              title="Delete Card"
            >
              <Trash2 size={18} />
            </button>
          </div>

          <div className="w-full max-w-sm mt-6 bg-white dark:bg-[#101010] rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-center">Card Status</h3>
            
            {isPending && (
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
                  <Clock size={32} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Under Review</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Your card application is currently being processed. This usually takes 1-2 business days.
                  </p>
                </div>
              </div>
            )}

            {isApproved && (
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-500">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Card Active</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Your digital card is active and ready to use.
                  </p>
                </div>
              </div>
            )}

            {isRejected && (
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center text-red-500">
                  <Clock size={32} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Application Rejected</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {card.adminNote || 'Unfortunately, your application could not be approved at this time.'}
                  </p>
                </div>
              </div>
            )}

            {isDisabled && (
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-900/20 flex items-center justify-center text-gray-500">
                  <PowerOff size={32} />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Card Disabled</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Your card has been disabled successfully and can no longer be used. You can delete it to apply for a new one.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Card Benefits Section */}
          <div className="w-full max-w-sm mt-8 mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-base">Card Benefits</h3>
            <div className="space-y-3">
              {[
                { title: 'Fraud Protection', description: '24/7 monitoring for suspicious activity', icon: ShieldCheck },
                { title: 'Cashback Rewards', description: 'Earn up to 2% on all purchases', icon: CircleDollarSign },
                { title: 'Global Acceptance', description: 'Use your card worldwide with no foreign fees', icon: Globe },
                { title: 'Secure Transactions', description: 'Enhanced security with chip technology', icon: Lock },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-4 bg-white dark:bg-[#101010] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0">
                    <b.icon size={20} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-900 dark:text-white">{b.title}</div>
                    <div className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{b.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Application form
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#050505] pb-20">
      <DashboardHeader title="Cards" logo="dwp" />

      <form onSubmit={handleSubmit} className="p-4 flex-1 mt-2">
        <div className="w-full max-w-sm mx-auto mb-6 bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-2xl p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <Info className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-300 text-sm mb-1">Accredited Investors Only</h3>
              <p className="text-[13px] text-blue-800 dark:text-blue-200 leading-relaxed">
                To be eligible for the Wyoming LLC MasterCard, you must have an investment portfolio / social capital of over <strong>$1,000,000</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#101010] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5 space-y-5 mx-auto max-w-sm">
          
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Card Holder Name
            </label>
            <input
              type="text"
              value={cardHolderName}
              onChange={(e) => setCardHolderName(e.target.value)}
              className="w-full bg-[#f4f5f8] dark:bg-[#101010] border-none rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Card Number
            </label>
            <input
              type="text"
              value={cardNumber}
              readOnly
              className="w-full bg-[#f4f5f8] dark:bg-[#101010] border-none rounded-xl px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-900 dark:text-white">
              Card Type
            </label>
            <select
              value={cardType}
              onChange={(e) => setCardType(e.target.value)}
              className="w-full bg-[#f4f5f8] dark:bg-[#101010] border-none rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="MasterCard">MasterCard</option>
              <option value="Visa">Visa</option>
            </select>
          </div>

          <button
            type="button"
            onClick={generateMockCardNumber}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-[#101010] border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-semibold text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
            Generate Card
          </button>

          <div className="pt-4 border-t border-gray-100 dark:border-gray-700/50">
            <p className="text-[13px] text-gray-500 dark:text-gray-400 leading-relaxed">
              The Wyoming LLC (Card) is a Decentralized concept that combines quantum security and blockchain technology and has created a new financial system.
            </p>
            <p className="text-[14px] font-semibold text-gray-900 dark:text-white mt-2">
              Activation Fee: $555.67 <span className="text-sm font-normal text-gray-500">(Accredited investors only)</span>
            </p>
          </div>

          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full py-4 text-[15px] font-semibold mt-2"
          >
            Submit Application
          </Button>

        </div>

        {/* Card Benefits Section */}
        <div className="w-full max-w-sm mx-auto mt-8 mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-base">Card Benefits</h3>
          <div className="space-y-3">
            {[
              { title: 'Fraud Protection', description: '24/7 monitoring for suspicious activity', icon: ShieldCheck },
              { title: 'Cashback Rewards', description: 'Earn up to 2% on all purchases', icon: CircleDollarSign },
              { title: 'Global Acceptance', description: 'Use your card worldwide with no foreign fees', icon: Globe },
              { title: 'Secure Transactions', description: 'Enhanced security with chip technology', icon: Lock },
            ].map((b, i) => (
              <div key={i} className="flex items-center gap-4 bg-white dark:bg-[#101010] rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700/50">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-500 shrink-0">
                  <b.icon size={20} />
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900 dark:text-white">{b.title}</div>
                  <div className="text-[12px] text-gray-500 dark:text-gray-400 mt-0.5">{b.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </form>

      <Modal isOpen={showPaymentModal} onClose={() => !isSubmitting && setShowPaymentModal(false)} title="Card Activation Fee" size="md">
        <div className="space-y-6">
          <div className="text-[15px] text-gray-600 dark:text-gray-300">
            To proceed with your MasterCard request, please complete the payment for the activation fee. This offer is available for Accredited investors only.
          </div>
          
          <div className="bg-gray-50 dark:bg-[#101010] border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-3">
            <div className="flex justify-between items-center text-[15px]">
              <span className="text-gray-600 dark:text-gray-400">Card Activation Fee (Incl. Tax)</span>
              <span className="font-semibold text-gray-900 dark:text-white">$555.67</span>
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between items-center">
              <span className="font-semibold text-gray-900 dark:text-white">Total Amount</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-500">$555.67</span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="font-semibold text-gray-900 dark:text-white text-[16px]">Payment Method</h3>
            <p className="text-[14px] text-gray-600 dark:text-gray-400">
              Payment is only accepted via <strong className="text-gray-900 dark:text-white">USDT</strong> on the <strong className="text-gray-900 dark:text-white">TRC20 network</strong>. Sending any other coin or using a different network may result in loss of funds.
            </p>
            
            <div className="mt-2">
              <label className="block text-[13px] font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Company USDT TRC20 Address</label>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  readOnly 
                  value={TRC20_WALLET}
                  className="flex-1 bg-gray-100 dark:bg-[#101010] border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-300 text-[14px] rounded-lg px-4 py-3 focus:outline-none"
                />
                <button 
                  onClick={() => copyToClipboard(TRC20_WALLET)}
                  className="p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors"
                >
                  <Copy size={18} />
                </button>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl p-4 flex gap-3">
            <div className="mt-0.5 text-blue-600 dark:text-blue-400"><Info size={18} /></div>
            <p className="text-[14px] text-blue-800 dark:text-blue-300 font-medium">
              Your card will be processed and issued within 1-2 business days after payment confirmation.
            </p>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              disabled={isSubmitting}
              className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-700 font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmPayment}
              disabled={isSubmitting}
              className="flex-[2] bg-green-600 hover:bg-green-700 disabled:opacity-70 text-white font-semibold py-3 rounded-xl transition-colors flex justify-center items-center gap-2"
            >
              {isSubmitting ? (
                <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                'Confirm Payment'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
