'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { CreditCard, CheckCircle2, Clock } from 'lucide-react';

export default function CardsPage() {
  const { user } = useAuth();
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Application form state
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardType, setCardType] = useState('MasterCard');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      // Assuming GET /api/cards returns { cards: [...] }
      const res = await api.get('/api/cards');
      if (res.data.cards && res.data.cards.length > 0) {
        setCard(res.data.cards[0]);
      }
    } catch (error) {
      console.error('Failed to fetch card', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await api.post('/api/cards/apply', {
        cardHolderName,
        cardNumber,
        cardType
      });
      toast.success(res.data.message || 'Application submitted successfully');
      setCard(res.data.card);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to submit application');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0f172a]">
        <DashboardHeader title="Cards" />
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

    return (
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0f172a] pb-20">
        <DashboardHeader title="Your Card" />
        
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
                  {card.cardNumber}
                </div>
                <div className="flex justify-between items-end">
                  <div>
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Card Holder</div>
                    <div className="font-medium tracking-wide uppercase">{card.cardHolderName}</div>
                  </div>
                  <div className="font-bold italic text-lg opacity-80">
                    {card.cardType}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full max-w-sm mt-8 bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm">
            <h3 className="font-bold text-gray-900 dark:text-white mb-4 text-center">Card Status</h3>
            
            {isPending && (
              <div className="flex flex-col items-center text-center gap-3">
                <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-amber-500">
                  <Clock size={32} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">Under Review</h4>
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
                  <h4 className="font-bold text-gray-900 dark:text-white">Card Active</h4>
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
                  <h4 className="font-bold text-gray-900 dark:text-white">Application Rejected</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {card.adminNote || 'Unfortunately, your application could not be approved at this time.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Application form
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-[#0f172a] pb-20">
      <DashboardHeader title="Cards" />

      <form onSubmit={handleSubmit} className="p-4 flex-1 mt-2">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700/50 p-5 space-y-5">
          
          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-900 dark:text-white">
              Card Holder Name
            </label>
            <input
              type="text"
              value={cardHolderName}
              onChange={(e) => setCardHolderName(e.target.value)}
              className="w-full bg-[#f4f5f8] dark:bg-gray-900 border-none rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-900 dark:text-white">
              Card Number
            </label>
            <input
              type="text"
              value={cardNumber}
              readOnly
              className="w-full bg-[#f4f5f8] dark:bg-gray-900 border-none rounded-xl px-4 py-3.5 text-sm font-medium text-gray-500 dark:text-gray-400 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-bold text-gray-900 dark:text-white">
              Card Type
            </label>
            <select
              value={cardType}
              onChange={(e) => setCardType(e.target.value)}
              className="w-full bg-[#f4f5f8] dark:bg-gray-900 border-none rounded-xl px-4 py-3.5 text-sm font-medium text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 appearance-none"
            >
              <option value="MasterCard">MasterCard</option>
              <option value="Visa">Visa</option>
            </select>
          </div>

          <button
            type="button"
            onClick={generateMockCardNumber}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-bold text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition"
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
            <p className="text-[14px] font-bold text-gray-900 dark:text-white mt-2">
              Card Charges $0
            </p>
          </div>

          <Button
            type="submit"
            loading={isSubmitting}
            className="w-full py-4 text-[15px] font-bold mt-2"
          >
            Submit Application
          </Button>

        </div>
      </form>
    </div>
  );
}
