'use client';

import { useEffect, useState, useCallback, type ChangeEvent } from 'react';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import toast from 'react-hot-toast';
import { llcAPI } from '@/lib/api';
import { LLCApplication } from '@/types';
import { formatDate, formatCurrency } from '@/lib/utils';
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

type PopulatedUser = { firstName?: string; lastName?: string; email?: string };

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: LLCApplication['status']; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

function getApplicant(app: LLCApplication): PopulatedUser {
  const populated = (app as unknown as { userId?: PopulatedUser }).userId;
  return {
    firstName: app.firstName || populated?.firstName,
    lastName: app.lastName || populated?.lastName,
    email: app.email || populated?.email,
  };
}

export default function AdminLLCPage() {
  const accent = useAccent();
  const [applications, setApplications] = useState<LLCApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);

  const [editTarget, setEditTarget] = useState<LLCApplication | null>(null);
  const [status, setStatus] = useState<LLCApplication['status']>('pending');
  const [stateFee, setStateFee] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    llcAPI.adminList()
      .then((r) => {
        setApplications(r.data.applications ?? r.data);
        setCurrentPage(1);
      })
      .catch((err) => {
        setLoadError(err);
        toast.error('Failed to load LLC applications');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const openEdit = (app: LLCApplication) => {
    setEditTarget(app);
    setStatus(app.status);
    setStateFee(app.stateFee ? String(app.stateFee) : '0');
    setAdminNote(app.adminNote || '');
  };

  const handleUpdate = async () => {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await llcAPI.adminUpdate(editTarget.id, {
        status,
        stateFee: stateFee ? parseFloat(stateFee) : undefined,
        adminNote
      });
      toast.success('LLC application updated successfully!');
      setEditTarget(null);
      load();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to update LLC application';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(applications.length / PAGE_SIZE));
  const paginatedApplications = applications.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const columns: Column<LLCApplication>[] = [
    {
      key: 'user',
      header: 'User',
      hideOnMobile: true,
      render: (app) => {
        const applicant = getApplicant(app);
        return (
          <MDBox>
            <MDTypography variant="button" fontWeight="medium" display="block">
              {applicant.firstName && applicant.lastName ? `${applicant.firstName} ${applicant.lastName}` : '—'}
            </MDTypography>
            <MDTypography variant="caption" color="text" display="block">{applicant.email || '—'}</MDTypography>
          </MDBox>
        );
      },
    },
    {
      key: 'company',
      header: 'Company Name',
      render: (app) => {
        const applicant = getApplicant(app);
        return (
          <MDBox>
            <MDTypography variant="button" fontWeight="bold" display="block">{app.companyName}</MDTypography>
            {/* On phones the User and Status columns are hidden, so they show here. */}
            <MDTypography variant="caption" color="text" sx={{ display: { xs: 'block', md: 'none' } }}>
              {applicant.email || '—'}
            </MDTypography>
            <MDBox sx={{ display: { xs: 'block', md: 'none' } }} mt={0.5}>
              <StatusBadge status={app.status} />
            </MDBox>
          </MDBox>
        );
      },
    },
    {
      key: 'entity',
      header: 'Entity & Type',
      hideOnMobile: true,
      render: (app) => (
        <MDBox>
          <MDTypography variant="button" fontWeight="regular" display="block">{app.entityType}</MDTypography>
          <MDTypography variant="caption" color="text" display="block" textTransform="capitalize">{app.companyType}</MDTypography>
        </MDBox>
      ),
    },
    {
      key: 'state',
      header: 'State & Fee',
      render: (app) => (
        <MDBox>
          <MDTypography variant="button" fontWeight="regular" display="block">{app.state}</MDTypography>
          <MDTypography variant="caption" color="text" display="block">{app.stateFee ? formatCurrency(app.stateFee) : '—'}</MDTypography>
        </MDBox>
      ),
    },
    { key: 'status', header: 'Status', hideOnMobile: true, render: (app) => <StatusBadge status={app.status} /> },
    {
      key: 'date',
      header: 'Date',
      hideOnMobile: true,
      render: (app) => <MDTypography variant="caption" color="text" whiteSpace="nowrap">{formatDate(app.createdAt)}</MDTypography>,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (app) => (
        <MDButton variant="text" color={accent} size="small" onClick={() => openEdit(app)} title="Edit LLC Application">
          <Icon>edit</Icon>
          <MDBox component="span" sx={{ display: { xs: 'none', md: 'inline' } }}>&nbsp;Review</MDBox>
        </MDButton>
      ),
    },
  ];

  return (
    <AdminPage title="LLC Applications" description="Manage and approve user LLC applications">
      <MDBox mt={4}>
        <DataTableCard
          title="Applications"
          subtitle={applications.length > 0
            ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, applications.length)} of ${applications.length}`
            : 'LLC formation requests from clients'}
          columns={columns}
          rows={paginatedApplications}
          rowKey={(app) => app.id}
          isLoading={loading && applications.length === 0}
          isFetching={loading && applications.length > 0}
          error={applications.length === 0 ? loadError : null}
          onRetry={load}
          emptyMessage="No LLC applications found."
          paging={{
            page: currentPage,
            hasPrevious: currentPage > 1,
            hasNext: currentPage < totalPages,
            onPrevious: () => setCurrentPage((p) => Math.max(1, p - 1)),
            onNext: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
          }}
        />
      </MDBox>

      {/* Update dialog */}
      <AdminDialog
        isOpen={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Update LLC Application"
        size="md"
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
                { label: 'Company', value: editTarget.companyName, span: 4 },
                { label: 'State', value: editTarget.state, span: 4 },
                { label: 'Type', value: editTarget.companyType ? editTarget.companyType.charAt(0).toUpperCase() + editTarget.companyType.slice(1) : null, span: 4 },
              ]}
            />

            <Divider sx={{ my: 3 }} />
            <MDTypography variant="h6" fontWeight="medium" mb={1.5}>Application Details</MDTypography>
            <DetailGrid
              items={[
                ['Business Ending', editTarget.businessEnding],
                ['Contact Name', [editTarget.contactFirstName, editTarget.contactLastName].filter(Boolean).join(' ')],
                ['Contact Username', editTarget.contactUsername],
                ['Contact Email', editTarget.contactEmail],
                ['Contact Phone', editTarget.contactPhone],
                ['Street Address', editTarget.streetAddress],
                ['Unit', editTarget.unit],
                ['City', editTarget.city],
                ['Country', editTarget.country],
                ['Postal Code', editTarget.postalCode],
                ['Partner Code', editTarget.partnerCode],
              ].map(([label, value]) => ({ label: label as string, value: value || '—', span: 6 as const }))}
            />

            <Divider sx={{ my: 3 }} />
            <MDTypography variant="h6" fontWeight="medium" mb={2}>Decision</MDTypography>
            <Grid container spacing={2.5}>
              <Grid item xs={12} sm={6}>
                <MDInput
                  select
                  fullWidth
                  label="Status"
                  SelectProps={{ sx: { height: 44 } }}
                  value={status}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setStatus(e.target.value as LLCApplication['status'])}
                >
                  {STATUS_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                  ))}
                </MDInput>
              </Grid>
              <Grid item xs={12} sm={6}>
                <MDInput
                  fullWidth
                  label="State Fee (USD)"
                  type="number"
                  inputProps={{ step: 'any' }}
                  placeholder="e.g. 500"
                  value={stateFee}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setStateFee(e.target.value)}
                />
              </Grid>
              <Grid item xs={12}>
                <MDInput
                  fullWidth
                  label="Admin Note (optional)"
                  placeholder="E.g. Sent to state authority..."
                  value={adminNote}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setAdminNote(e.target.value)}
                />
              </Grid>
            </Grid>
          </MDBox>
        )}
      </AdminDialog>
    </AdminPage>
  );
}
