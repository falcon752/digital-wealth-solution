'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import Tooltip from '@mui/material/Tooltip';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { formatDate } from '@/lib/utils';
import AdminPage from '@/components/admin/shell/AdminPage';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import ConfirmDialog from '@/components/admin/ui/ConfirmDialog';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import DetailGrid from '@/components/admin/ui/DetailGrid';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge, { type BadgeColor } from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';

/** A card application as GET /admin/cards returns it (the user is populated). */
interface CardApplication {
  id: string;
  _id?: string;
  userId?: { firstName?: string; lastName?: string; email?: string } | null;
  cardHolderName?: string;
  cardNumber?: string;
  cardType?: string;
  status: string;
  createdAt: string;
}

const PAGE_SIZE = 10;

/** Same colours as before: approved green, rejected/disabled red, anything else amber. */
function cardStatusColor(status: string): BadgeColor {
  if (status === 'approved') return 'success';
  if (status === 'rejected' || status === 'disabled') return 'error';
  return 'warning';
}

export default function AdminCardsPage() {
  const accent = useAccent();
  const [cards, setCards] = useState<CardApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [selectedCard, setSelectedCard] = useState<CardApplication | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CardApplication | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchCards = () => {
    setLoading(true);
    setLoadError(null);
    api.get('/admin/cards', { params: { limit: 1000 } })
      .then(res => {
        setCards(res.data.cards);
        setCurrentPage(1);
      })
      .catch((err) => {
        setLoadError(err);
        toast.error('Failed to load cards');
      })
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
    } catch {
      toast.error('Failed to update card');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/admin/cards/${id}`);
      toast.success('Card deleted successfully');
      fetchCards();
    } catch {
      toast.error('Failed to delete card');
    }
  };

  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const paginatedCards = cards.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const columns: Column<CardApplication>[] = [
    {
      key: 'user',
      header: 'User',
      render: (card) => (
        <MDBox>
          <MDTypography variant="button" fontWeight="medium" display="block">
            {card.userId?.firstName} {card.userId?.lastName}
          </MDTypography>
          <MDTypography variant="caption" color="text" display="block" sx={{ overflowWrap: 'break-word' }}>{card.userId?.email}</MDTypography>
          {/* On phones the other columns are hidden, so the card and status show here. */}
          <MDBox sx={{ display: { xs: 'block', md: 'none' } }} mt={0.5}>
            <MDTypography variant="caption" color="text" display="block" mb={0.5}>{card.cardType} · {card.cardNumber}</MDTypography>
            <StatusBadge status={card.status} label={card.status.toUpperCase()} color={cardStatusColor(card.status)} />
          </MDBox>
        </MDBox>
      ),
    },
    {
      key: 'name',
      header: 'Card Name',
      hideOnMobile: true,
      render: (card) => <MDTypography variant="button" fontWeight="medium">{card.cardHolderName}</MDTypography>,
    },
    {
      key: 'number',
      header: 'Card Number',
      hideOnMobile: true,
      render: (card) => <MDBox component="span" sx={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{card.cardNumber}</MDBox>,
    },
    { key: 'type', header: 'Type', hideOnMobile: true, render: (card) => card.cardType },
    {
      key: 'date',
      header: 'Date',
      hideOnMobile: true,
      render: (card) => <MDTypography variant="caption" color="text" whiteSpace="nowrap">{formatDate(card.createdAt)}</MDTypography>,
    },
    {
      key: 'status',
      header: 'Status',
      hideOnMobile: true,
      render: (card) => <StatusBadge status={card.status} label={card.status.toUpperCase()} color={cardStatusColor(card.status)} />,
    },
    {
      key: 'actions',
      header: 'Action',
      align: 'right',
      render: (card) => (
        <MDBox display="flex" justifyContent="flex-end" alignItems="center" gap={0.5}>
          {card.status === 'pending' && (
            <MDButton variant="gradient" color={accent} size="small" onClick={() => setSelectedCard(card)} sx={{ minWidth: 0, px: { xs: 1.5, md: 2 } }}>
              Review
            </MDButton>
          )}
          <Tooltip title="Delete Card">
            <MDButton variant="text" color="error" size="small" iconOnly onClick={() => setDeleteTarget(card)} aria-label="Delete card">
              <Icon>delete</Icon>
            </MDButton>
          </Tooltip>
        </MDBox>
      ),
    },
  ];

  return (
    <AdminPage title="Manage Cards" description="Review card applications from clients.">
      <MDBox mt={4}>
        <DataTableCard
          title="Card applications"
          subtitle={cards.length > 0
            ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, cards.length)} of ${cards.length}`
            : undefined}
          columns={columns}
          rows={paginatedCards}
          rowKey={(card) => card._id || card.id}
          isLoading={loading && cards.length === 0}
          isFetching={loading && cards.length > 0}
          error={cards.length === 0 ? loadError : null}
          onRetry={fetchCards}
          emptyMessage="No card applications found."
          paging={{
            page: currentPage,
            hasPrevious: currentPage > 1,
            hasNext: currentPage < totalPages,
            onPrevious: () => setCurrentPage((p) => Math.max(1, p - 1)),
            onNext: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
          }}
        />
      </MDBox>

      {/* Review dialog */}
      <AdminDialog
        isOpen={!!selectedCard}
        onClose={() => setSelectedCard(null)}
        title="Review Card Application"
        actions={selectedCard && (
          <>
            <MDButton variant="outlined" color="error" onClick={() => handleUpdate('rejected')} disabled={isUpdating}>
              <Icon>close</Icon>&nbsp;Reject
            </MDButton>
            <MDButton variant="gradient" color="success" onClick={() => handleUpdate('approved')} disabled={isUpdating}>
              <Icon>check</Icon>&nbsp;Approve
            </MDButton>
          </>
        )}
      >
        {selectedCard && (
          <MDBox>
            <DetailGrid
              items={[
                {
                  label: 'User',
                  span: 6,
                  value: (
                    <>
                      <MDTypography variant="button" fontWeight="medium" display="block">
                        {selectedCard.userId?.firstName} {selectedCard.userId?.lastName}
                      </MDTypography>
                      <MDTypography variant="caption" color="text" display="block">{selectedCard.userId?.email}</MDTypography>
                    </>
                  ),
                },
                {
                  label: 'Card Details',
                  span: 6,
                  value: (
                    <>
                      <MDTypography variant="button" fontWeight="medium" display="block">{selectedCard.cardType}</MDTypography>
                      <MDTypography variant="caption" color="text" display="block" sx={{ fontFamily: 'monospace' }}>{selectedCard.cardNumber}</MDTypography>
                    </>
                  ),
                },
              ]}
            />
            <MDBox mt={3}>
              <MDInput
                fullWidth
                multiline
                minRows={3}
                label="Admin Note (Optional)"
                placeholder="Reason for rejection, or additional notes..."
                value={adminNote}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAdminNote(e.target.value)}
              />
            </MDBox>
          </MDBox>
        )}
      </AdminDialog>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete card application"
        tone="error"
        confirmLabel="Delete"
        message="Are you sure you want to completely delete this card application?"
        onConfirm={() => (deleteTarget ? handleDelete(deleteTarget._id || deleteTarget.id) : Promise.resolve())}
        onClose={() => setDeleteTarget(null)}
      />
    </AdminPage>
  );
}
