'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import Button from '@/components/ui/Button';
import toast from 'react-hot-toast';
import { formatDate } from '@/lib/utils';
import { Check, X, CreditCard, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import Modal from '@/components/ui/Modal';

export default function AdminCardsPage() {
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const fetchCards = () => {
    setLoading(true);
    api.get('/admin/cards', { params: { limit: 1000 } })
      .then(res => {
        setCards(res.data.cards);
        setCurrentPage(1);
      })
      .catch(() => toast.error('Failed to load cards'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCards();
  }, []);

  const handleUpdate = async (status: string) => {
    if (!selectedCard) return;
    setIsUpdating(true);
    try {
      await api.put(`/admin/cards/${selectedCard.id}`, { status, adminNote });
      toast.success(`Card ${status}`);
      setSelectedCard(null);
      setAdminNote('');
      fetchCards();
    } catch (error) {
      toast.error('Failed to update card');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to completely delete this card application?')) return;
    try {
      await api.delete(`/admin/cards/${id}`);
      toast.success('Card deleted successfully');
      fetchCards();
    } catch (error) {
      toast.error('Failed to delete card');
    }
  };

  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const paginatedCards = cards.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col min-h-full">
      <DashboardHeader title="Manage Cards" logo="dwp" />

      <div className="flex-1 p-6">
        <div className="glass rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--bg-card)] text-[var(--text-muted)] uppercase text-xs">
                <tr>
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-6 py-4 font-medium">Card Name</th>
                  <th className="px-6 py-4 font-medium">Card Number</th>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-color)]">
                {paginatedCards.map(card => (
                  <tr key={card.id} className="hover:bg-[var(--bg-hover)] transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[var(--text-primary)]">
                        {card.userId?.firstName} {card.userId?.lastName}
                      </div>
                      <div className="text-xs text-[var(--text-muted)]">{card.userId?.email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-[var(--text-primary)]">{card.cardHolderName}</td>
                    <td className="px-6 py-4 font-mono text-[var(--text-primary)]">{card.cardNumber}</td>
                    <td className="px-6 py-4 text-[var(--text-primary)]">{card.cardType}</td>
                    <td className="px-6 py-4 text-[var(--text-muted)]">{formatDate(card.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        card.status === 'approved' ? 'bg-green-500/10 text-green-500' :
                        (card.status === 'rejected' || card.status === 'disabled') ? 'bg-red-500/10 text-red-500' :
                        'bg-amber-500/10 text-amber-500'
                      }`}>
                        {card.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {card.status === 'pending' && (
                          <Button 
                            size="sm" 
                            variant="secondary"
                            onClick={() => setSelectedCard(card)}
                          >
                            Review
                          </Button>
                        )}
                        <button
                          onClick={() => handleDelete(card._id || card.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                          title="Delete Card"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {cards.length === 0 && !loading && (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-[var(--text-muted)]">
                      No card applications found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {cards.length > 0 && (
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-[var(--border-color)]">
              <p className="text-xs text-[var(--text-muted)]">
                Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, cards.length)} of {cards.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)] transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs font-medium text-[var(--text-primary)]">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-[var(--border-color)] text-[var(--text-muted)] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)] transition-colors"
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={!!selectedCard} onClose={() => setSelectedCard(null)} title="Review Card Application">
        {selectedCard && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">User</p>
                <p className="font-semibold text-gray-900 dark:text-white">
                  {selectedCard.userId?.firstName} {selectedCard.userId?.lastName}
                </p>
                <p className="text-sm text-gray-500">{selectedCard.userId?.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Card Details</p>
                <p className="font-semibold text-gray-900 dark:text-white">{selectedCard.cardType}</p>
                <p className="font-mono text-sm text-gray-500">{selectedCard.cardNumber}</p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                Admin Note (Optional)
              </label>
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Reason for rejection, or additional notes..."
                className="w-full bg-[#f4f5f8] dark:bg-gray-900 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                rows={3}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                onClick={() => handleUpdate('rejected')}
                loading={isUpdating}
              >
                <X size={16} className="mr-1.5" /> Reject
              </Button>
              <Button 
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                onClick={() => handleUpdate('approved')}
                loading={isUpdating}
              >
                <Check size={16} className="mr-1.5" /> Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
