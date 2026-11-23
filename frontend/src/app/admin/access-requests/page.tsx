'use client';

import { useEffect, useState, useCallback, type ChangeEvent, type ReactNode } from 'react';
import toast from 'react-hot-toast';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { accessAPI } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import AdminPage from '@/components/admin/shell/AdminPage';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import Icon from '@/components/admin/ui/Icon';
import StatCard from '@/components/admin/ui/StatCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';

interface AccessRequest {
  id: string;
  name: string;
  email: string;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  code: string | null;
  adminNote: string | null;
  approvedAt: string | null;
  createdAt: string;
}

/** A line of the request summary in the review dialog. */
function SummaryRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <MDBox display="flex" justifyContent="space-between" alignItems="center" gap={2} py={0.75}>
      <MDTypography variant="button" color="text" fontWeight="regular">{label}</MDTypography>
      <MDTypography variant="button" fontWeight="medium" component="div" textAlign="right" sx={{ wordBreak: 'break-word', minWidth: 0 }}>
        {children}
      </MDTypography>
    </MDBox>
  );
}

export default function AdminAccessRequestsPage() {
  const accent = useAccent();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const [reviewTarget, setReviewTarget] = useState<AccessRequest | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const load = useCallback(() => {
    setLoading(true);
    accessAPI.adminList()
      .then((r) => {
        setRequests(r.data.requests ?? []);
        setCurrentPage(1);
      })
      .catch(() => toast.error('Failed to load access requests'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openReview = (request: AccessRequest) => {
    setReviewTarget(request);
    setAdminNote(request.adminNote || '');
  };

  const handleApprove = async () => {
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      await accessAPI.approve(reviewTarget.id, { adminNote: adminNote || undefined });
      toast.success('Approved! An access code has been emailed.');
      setReviewTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to approve request';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      await accessAPI.reject(reviewTarget.id, { adminNote: adminNote || undefined });
      toast.success('Request rejected');
      setReviewTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to reject request';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async () => {
    if (!reviewTarget) return;
    setSubmitting(true);
    try {
      await accessAPI.revoke(reviewTarget.id);
      toast.success('Access revoked');
      setReviewTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to revoke access';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const paginatedRequests = requests.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const count = (status: AccessRequest['status']) => requests.filter((r) => r.status === status).length;

  const columns: Column<AccessRequest>[] = [
    {
      key: 'requester',
      header: 'Requester',
      render: (r) => (
        <MDBox lineHeight={1.2}>
          <MDTypography variant="button" fontWeight="medium" display="block">{r.name}</MDTypography>
          <MDTypography variant="caption" color="text" display="block">{r.email}</MDTypography>
        </MDBox>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      hideOnMobile: true,
      render: (r) => (
        <MDTypography variant="caption" color="text" noWrap display="block" sx={{ maxWidth: 320 }} title={r.reason || undefined}>
          {r.reason || '—'}
        </MDTypography>
      ),
    },
    { key: 'status', header: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    {
      key: 'date',
      header: 'Date',
      hideOnMobile: true,
      render: (r) => <MDTypography variant="caption" color="text" whiteSpace="nowrap">{formatDate(r.createdAt)}</MDTypography>,
    },
    {
      key: 'review',
      header: '',
      align: 'right',
      render: (r) => (
        <Tooltip title="Review Request">
          <IconButton size="small" color="info" onClick={(event) => { event.stopPropagation(); openReview(r); }} aria-label="Review Request">
            <Icon fontSize="small">visibility</Icon>
          </IconButton>
        </Tooltip>
      ),
    },
  ];

  const stats = [
    { title: 'Pending', value: count('pending'), icon: 'pending_actions', color: 'warning' as const, label: 'waiting for a decision' },
    { title: 'Approved', value: count('approved'), icon: 'key', color: 'success' as const, label: 'have an access code' },
    { title: 'Rejected', value: count('rejected'), icon: 'cancel', color: 'error' as const, label: 'turned down' },
    { title: 'Revoked', value: count('revoked'), icon: 'lock', color: 'dark' as const, label: 'access taken back' },
  ];

  return (
    <AdminPage title="Access Requests" description="Review requests to unlock the site">
      <Grid container spacing={3}>
        {stats.map((stat) => (
          <Grid item xs={12} sm={6} lg={3} key={stat.title}>
            <MDBox mb={1.5}>
              <StatCard loading={loading} color={stat.color} icon={stat.icon} title={stat.title} value={stat.value}
                footnote={{ label: stat.label, color: 'secondary' }} />
            </MDBox>
          </Grid>
        ))}
      </Grid>

      <MDBox mt={6}>
        <DataTableCard
          title="Access requests"
          subtitle={requests.length > 0
            ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, requests.length)} of ${requests.length}`
            : undefined}
          columns={columns}
          rows={paginatedRequests}
          rowKey={(r) => r.id}
          rowHref={(r) => `/admin/access-requests/${r.id}`}
          isLoading={loading}
          emptyMessage="No access requests yet."
          paging={{
            page: currentPage,
            hasPrevious: currentPage > 1,
            hasNext: currentPage < totalPages,
            onPrevious: () => setCurrentPage((p) => Math.max(1, p - 1)),
            onNext: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
          }}
        />
      </MDBox>

      <AdminDialog
        isOpen={!!reviewTarget}
        onClose={() => setReviewTarget(null)}
        title="Review Access Request"
        size="sm"
        actions={reviewTarget ? (
          <>
            <MDButton variant="text" color="dark" onClick={() => setReviewTarget(null)}>Close</MDButton>
            {reviewTarget.status === 'pending' && (
              <>
                <MDButton variant="outlined" color="error" onClick={handleReject} disabled={submitting}>Reject</MDButton>
                <MDButton variant="gradient" color={accent} onClick={handleApprove} disabled={submitting}>Approve</MDButton>
              </>
            )}
            {reviewTarget.status === 'approved' && (
              <MDButton variant="gradient" color="error" onClick={handleRevoke} disabled={submitting}>Revoke Access</MDButton>
            )}
          </>
        ) : undefined}
      >
        {reviewTarget && (
          <MDBox>
            <MDBox p={2} borderRadius="lg" sx={({ palette }) => ({ backgroundColor: palette.grey[100] })}>
              <SummaryRow label="Name">{reviewTarget.name}</SummaryRow>
              <SummaryRow label="Email">{reviewTarget.email}</SummaryRow>
              <SummaryRow label="Status"><StatusBadge status={reviewTarget.status} /></SummaryRow>
              {reviewTarget.reason && (
                <MDBox pt={1.5} mt={1} sx={({ palette }) => ({ borderTop: `1px solid ${palette.divider}` })}>
                  <MDTypography variant="button" color="text" fontWeight="regular" display="block" mb={0.5}>Reason</MDTypography>
                  <MDTypography variant="button" fontWeight="regular" component="p" sx={{ whiteSpace: 'pre-wrap' }}>{reviewTarget.reason}</MDTypography>
                </MDBox>
              )}
              {reviewTarget.status === 'approved' && reviewTarget.code && (
                <MDBox pt={1.5} mt={1} sx={({ palette }) => ({ borderTop: `1px solid ${palette.divider}` })}>
                  <MDTypography variant="button" color="text" fontWeight="regular" display="block" mb={0.5}>Access Code</MDTypography>
                  <MDTypography variant="h5" color="info" textGradient sx={{ fontFamily: 'monospace', letterSpacing: '0.2em' }}>{reviewTarget.code}</MDTypography>
                </MDBox>
              )}
            </MDBox>

            {(reviewTarget.status === 'pending' || reviewTarget.status === 'rejected') && (
              <MDBox mt={3}>
                <MDInput
                  label="Admin Note (optional)"
                  placeholder="Internal note..."
                  value={adminNote}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setAdminNote(event.target.value)}
                  multiline
                  minRows={4}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </MDBox>
            )}
          </MDBox>
        )}
      </AdminDialog>
    </AdminPage>
  );
}
