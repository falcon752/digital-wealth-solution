'use client';

import { useEffect, useState, useCallback, type ChangeEvent } from 'react';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Tooltip from '@mui/material/Tooltip';
import toast from 'react-hot-toast';
import { contactAPI } from '@/lib/api';
import { ContactSubmission } from '@/types';
import { APP_TIMEZONE, formatDate } from '@/lib/utils';
import AdminPage from '@/components/admin/shell/AdminPage';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import DetailGrid from '@/components/admin/ui/DetailGrid';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: ContactSubmission['status']; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

/** A small heading for a block inside the review dialog. */
function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <MDBox mb={1.5}>
      <MDTypography variant="h6" fontWeight="medium">{title}</MDTypography>
      {hint && <MDTypography variant="caption" color="text" display="block">{hint}</MDTypography>}
    </MDBox>
  );
}

export default function AdminConsultationsPage() {
  const accent = useAccent();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);

  const [editTarget, setEditTarget] = useState<ContactSubmission | null>(null);
  const [status, setStatus] = useState<ContactSubmission['status']>('pending');
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    contactAPI.adminList()
      .then((r) => {
        setSubmissions(r.data.submissions ?? r.data);
        setCurrentPage(1);
      })
      .catch((err) => {
        setLoadError(err);
        toast.error('Failed to load consultation submissions');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openEdit = (submission: ContactSubmission) => {
    setEditTarget(submission);
    setStatus(submission.status);
    setAdminNote(submission.adminNote || '');
  };

  const handleStatusChange = (newStatus: ContactSubmission['status']) => {
    setStatus(newStatus);
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const response = await contactAPI.adminUpdate(editTarget.id, { status, adminNote });
      if (response.data.emailDelivery && !response.data.emailDelivery.success) {
        toast.error('Status saved, but the client email failed. The attempt is recorded.');
      } else if (response.data.statusChanged) {
        toast.success('Status updated and client email submitted');
      } else {
        toast.success('Consultation note updated. No duplicate status email was sent.');
      }
      setEditTarget(null);
      load();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { error?: string; errors?: { msg: string }[] } } })?.response?.data;
      const msg = data?.error || data?.errors?.map((e) => e.msg).join(', ') || 'Failed to update submission';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(submissions.length / PAGE_SIZE));
  const paginatedSubmissions = submissions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const columns: Column<ContactSubmission>[] = [
    {
      key: 'applicant',
      header: 'Applicant',
      render: (s) => (
        <MDBox minWidth={0}>
          <MDTypography variant="button" fontWeight="medium" display="block">{s.firstName} {s.lastName}</MDTypography>
          <MDTypography variant="caption" color="text" display="block" sx={{ overflowWrap: 'break-word' }}>{s.email}</MDTypography>
          {/* On phones the Topic and Status columns are hidden, so they show here. */}
          <MDBox sx={{ display: { xs: 'block', md: 'none' } }} mt={0.5}>
            <MDTypography variant="caption" color="text" display="block" mb={0.5}>{s.topic}</MDTypography>
            <StatusBadge status={s.status} />
          </MDBox>
        </MDBox>
      ),
    },
    { key: 'topic', header: 'Topic', hideOnMobile: true, render: (s) => s.topic },
    {
      key: 'message',
      header: 'Message',
      hideOnMobile: true,
      render: (s) => (
        <MDTypography variant="caption" color="text" display="block" noWrap sx={{ maxWidth: 260 }}>{s.message}</MDTypography>
      ),
    },
    { key: 'status', header: 'Status', hideOnMobile: true, render: (s) => <StatusBadge status={s.status} /> },
    {
      key: 'date',
      header: 'Date',
      hideOnMobile: true,
      render: (s) => <MDTypography variant="caption" color="text" whiteSpace="nowrap">{formatDate(s.createdAt)}</MDTypography>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (s) => (
        <Tooltip title="Review submission">
          <MDButton variant="text" color={accent} size="small" onClick={(event: React.MouseEvent) => { event.stopPropagation(); openEdit(s); }}>
            <Icon>edit</Icon>
            <MDBox component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>&nbsp;Review</MDBox>
          </MDButton>
        </Tooltip>
      ),
    },
  ];

  const detailItems = editTarget
    ? [
        ['Address', [editTarget.streetAddress, [editTarget.city, [editTarget.stateProvince, editTarget.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', '), editTarget.country].filter(Boolean).join(', ') || null],
        ['Investable Assets', editTarget.investableAssets],
        ['Digital Allocation', editTarget.digitalAllocation],
        ['Holds 50k+ XRP', editTarget.holdsXRP],
        ['Married', editTarget.married],
        ['Children', editTarget.children],
        ['DWP Client', editTarget.existingClient],
        ['Client Type', editTarget.clientType],
        ['Has LLC, Trust or Corp', editTarget.hasEntity ? `${editTarget.hasEntity}${editTarget.hasEntity === 'Yes' && editTarget.entityName ? ` (${editTarget.entityName})` : ''}` : null],
        ['Has a Crypto IRA', editTarget.hasCryptoIRA],
        ['Areas of Interest', editTarget.areasOfInterest?.length ? editTarget.areasOfInterest.join(', ') : null],
        ['Assets to Move to Custody', editTarget.custodyAssets?.length ? editTarget.custodyAssets.join(', ') : editTarget.custodyAsset],
        ['Referral Source', editTarget.referralSource],
        ['Referred by (DWP official)', editTarget.referralOfficial],
        ['Wallets Used', editTarget.walletsUsed?.length ? editTarget.walletsUsed.map((value) => (value === 'Other' && editTarget.walletOther ? `Other: ${editTarget.walletOther}` : value)).join(', ') : null],
        ['Exchanges Used', editTarget.exchangesUsed?.length ? editTarget.exchangesUsed.map((value) => (value === 'Other' && editTarget.exchangeOther ? `Other: ${editTarget.exchangeOther}` : value)).join(', ') : null],
      ].map(([label, value]) => ({ label: label as string, value: value || '—', span: (label === 'Address' ? 12 : 4) as 4 | 12 }))
    : [];

  return (
    <AdminPage title="Consultations" description="Review and approve consultation requests">
      <MDBox mt={4}>
        <DataTableCard
          title="Consultation requests"
          subtitle={submissions.length > 0
            ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, submissions.length)} of ${submissions.length}`
            : 'Newest requests from the website contact form'}
          columns={columns}
          rows={paginatedSubmissions}
          rowKey={(s) => s.id}
          rowHref={(s) => `/admin/consultations/${s.id}`}
          isLoading={loading && submissions.length === 0}
          isFetching={loading && submissions.length > 0}
          error={submissions.length === 0 ? loadError : null}
          onRetry={load}
          emptyMessage="No consultation submissions found."
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
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Review Consultation Request"
        size="lg"
        actions={editTarget && (
          <>
            <MDButton variant="text" color="dark" onClick={() => setEditTarget(null)} disabled={submitting}>Cancel</MDButton>
            <MDButton variant="gradient" color={accent} onClick={handleUpdate} disabled={submitting}>
              {submitting ? 'Saving…' : 'Save Changes'}
            </MDButton>
          </>
        )}
      >
        {editTarget && (
          <MDBox>
            <DetailGrid
              items={[
                { label: 'Applicant', value: `${editTarget.firstName} ${editTarget.lastName}`, span: 6 },
                { label: 'Email', value: editTarget.email, span: 6 },
                { label: 'Phone', value: editTarget.phone, span: 6 },
                { label: 'Topic', value: editTarget.topic, span: 6 },
              ]}
            />

            <Divider sx={{ my: 3 }} />
            <SectionTitle title="Submission Details" />
            <DetailGrid items={detailItems} />
            <MDBox mt={2}>
              <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase">Message</MDTypography>
              <MDTypography variant="button" color="text" fontWeight="regular" component="p" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {editTarget.message}
              </MDTypography>
            </MDBox>

            <Divider sx={{ my: 3 }} />
            <SectionTitle title="Email Delivery" hint="Provider submission results for automated consultation notifications." />
            {editTarget.emailDeliveries?.map((delivery, index) => (
              <MDBox key={`${delivery.template}-${index}`}>
                {index > 0 && <Divider sx={{ my: 0 }} />}
                <MDBox display="flex" alignItems="flex-start" justifyContent="space-between" gap={2} py={1.25}>
                  <MDBox display="flex" alignItems="flex-start" gap={1.5} minWidth={0}>
                    <Icon fontSize="small" color={delivery.success ? 'success' : 'error'} sx={{ mt: 0.25, flexShrink: 0 }}>
                      {delivery.success ? 'check_circle' : 'error_outline'}
                    </Icon>
                    <MDBox minWidth={0}>
                      <MDTypography variant="button" fontWeight="medium" display="block" textTransform="capitalize">
                        {delivery.template.replaceAll('_', ' ')}
                      </MDTypography>
                      <MDTypography variant="caption" color="text" display="block">
                        {new Date(delivery.attemptedAt).toLocaleString('en-US', { timeZone: APP_TIMEZONE })}
                      </MDTypography>
                      {delivery.error && (
                        <MDTypography variant="caption" color="error" display="block" sx={{ wordBreak: 'break-word' }}>{delivery.error}</MDTypography>
                      )}
                    </MDBox>
                  </MDBox>
                  <StatusBadge status={delivery.success ? 'sent' : 'failed'} label={delivery.success ? 'Submitted' : 'Failed'} />
                </MDBox>
              </MDBox>
            ))}
            {!editTarget.emailDeliveries?.length && (
              <MDTypography variant="caption" color="text">No provider delivery attempts recorded for this legacy request.</MDTypography>
            )}

            <Divider sx={{ my: 3 }} />
            <SectionTitle title="Decision" />
            <MDInput
              select
              fullWidth
              label="Status"
              SelectProps={{ sx: { height: 44 } }}
              value={status}
              onChange={(e: ChangeEvent<HTMLInputElement>) => handleStatusChange(e.target.value as ContactSubmission['status'])}
            >
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
              ))}
            </MDInput>
            <MDBox mt={3}>
              <MDInput
                fullWidth
                multiline
                minRows={6}
                label="Additional Note (optional)"
                placeholder="Optional — add any personalized context for this client..."
                value={adminNote}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAdminNote(e.target.value)}
                helperText="A standard status email is sent automatically. Anything you add here appears as an extra note below it."
              />
            </MDBox>
          </MDBox>
        )}
      </AdminDialog>
    </AdminPage>
  );
}
