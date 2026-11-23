'use client';

import { useEffect, useState, useCallback, useRef, type ChangeEvent, type SyntheticEvent } from 'react';
import { useSearchParams } from 'next/navigation';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { earnsAPI, loansAPI } from '@/lib/api';
import AdminPage from '@/components/admin/shell/AdminPage';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import AdminDialog from '@/components/admin/ui/AdminDialog';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import Icon from '@/components/admin/ui/Icon';
import MDAlert from '@/components/admin/components/MDAlert';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDInput from '@/components/admin/components/MDInput';
import MDTypography from '@/components/admin/components/MDTypography';
import { fmtRate, stopRowClick } from '@/components/admin/money/MoneyKit';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

const TABS = ['all', 'pending', 'approved', 'rejected'] as const;
type LoanTab = (typeof TABS)[number];
const TAB_LABEL: Record<LoanTab, string> = { all: 'All', pending: 'Pending', approved: 'Approved', rejected: 'Rejected' };

const PAGE_SIZE = 10;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loan = any;

const loanId = (l: Loan): string => l.id || l._id;

/** An earn (savings) deposit as GET /api/earns returns it to an admin (the user is populated). */
interface EarnDeposit {
  id: string;
  userId?: { firstName?: string; lastName?: string; email?: string } | null;
  asset: string;
  amount: number;
  apy: number;
  monthlyReward: number;
  term: string;
  status: string;
  createdAt: string;
}

const EARN_COLUMNS: Column<EarnDeposit>[] = [
  {
    key: 'user',
    header: 'User',
    render: (e) => (
      <MDBox display="flex" alignItems="center" gap={1.5}>
        <PersonAvatar name={`${e.userId?.firstName ?? ''} ${e.userId?.lastName ?? ''}`} email={e.userId?.email} photoUrl={null} />
        <MDBox lineHeight={1.2} minWidth={0}>
          <MDTypography variant="button" fontWeight="medium" display="block">{e.userId?.firstName} {e.userId?.lastName}</MDTypography>
          <MDTypography variant="caption" color="text">{e.userId?.email}</MDTypography>
          {/* Phones: the other columns are hidden. */}
          <MDBox display={{ xs: 'flex', md: 'none' }} alignItems="center" gap={1} flexWrap="wrap" mt={1}>
            <MDTypography variant="caption" fontWeight="bold" color="info">{e.amount} {e.asset}</MDTypography>
            <StatusBadge status={e.status} />
          </MDBox>
        </MDBox>
      </MDBox>
    ),
  },
  {
    key: 'amount',
    header: 'Deposit',
    hideOnMobile: true,
    render: (e) => <MDTypography variant="button" fontWeight="bold" color="info" whiteSpace="nowrap">{e.amount} {e.asset}</MDTypography>,
  },
  {
    key: 'terms',
    header: 'APY / Term',
    hideOnMobile: true,
    render: (e) => (
      <MDBox lineHeight={1.4} whiteSpace="nowrap">
        <MDBox>APY: {fmtRate(e.apy)}</MDBox>
        <MDBox>{e.term}</MDBox>
      </MDBox>
    ),
  },
  { key: 'status', header: 'Status', hideOnMobile: true, render: (e) => <StatusBadge status={e.status} /> },
  { key: 'date', header: 'Date', hideOnMobile: true, render: (e) => formatDate(e.createdAt) },
];

export default function AdminLoansPage() {
  const searchParams = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const [activeTab, setActiveTab] = useState<LoanTab>('all');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);

  const [confirmTarget, setConfirmTarget] = useState<Loan | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Loan | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const didAutoOpen = useRef(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Earn (savings) deposits: listed under the loans, each opening /admin/loans/<id>?kind=earn.
  const [earns, setEarns] = useState<EarnDeposit[]>([]);
  const [earnsLoading, setEarnsLoading] = useState(true);
  const [earnsError, setEarnsError] = useState<unknown>(null);
  const [earnPage, setEarnPage] = useState(1);
  const loadEarns = useCallback(() => {
    setEarnsLoading(true);
    setEarnsError(null);
    earnsAPI.list()
      .then((r) => setEarns(r.data.earns ?? []))
      .catch((err: unknown) => setEarnsError(err))
      .finally(() => setEarnsLoading(false));
  }, []);
  useEffect(loadEarns, [loadEarns]);
  const earnPages = Math.max(1, Math.ceil(earns.length / PAGE_SIZE));

  const load = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    loansAPI.list()
      .then((r) => {
        const data = r.data.loans ?? [];
        if (activeTab === 'all') setLoans(data);
        else setLoans(data.filter((d: Loan) => d.status === activeTab));
        setCurrentPage(1);
      })
      .catch((err: unknown) => setLoadError(err))
      .finally(() => {
        setLoading(false);
        setLoadedOnce(true);
      });
  }, [activeTab]);

  useEffect(load, [load]);

  useEffect(() => {
    if (!highlightId || loading || didAutoOpen.current) return;

    const index = loans.findIndex((d) => d.id === highlightId || d._id === highlightId);
    if (index === -1) return;
    const loan = loans[index];

    if (activeTab !== 'all' && loan.status !== activeTab) {
      setActiveTab('all');
      return;
    }

    // Jump to the page containing this loan before scrolling to it
    const targetPage = Math.floor(index / PAGE_SIZE) + 1;
    if (currentPage !== targetPage) {
      setCurrentPage(targetPage);
      return;
    }

    const marker = document.querySelector(`[data-loan-row="${CSS.escape(highlightId)}"]`);
    const row = marker?.closest('tr');
    if (row) {
      row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    if (loan.status === 'pending') {
      didAutoOpen.current = true;
      setConfirmTarget(loan);
      setAdminNote('');
    }
  }, [loans, loading, highlightId, activeTab, currentPage]);

  const openConfirm = (l: Loan) => { setConfirmTarget(l); setAdminNote(''); };
  const openReject = (l: Loan) => { setRejectTarget(l); setAdminNote(''); };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    setSubmitting(true);
    try {
      const id = confirmTarget.id || confirmTarget._id;
      await loansAPI.updateStatus(id, { status: 'approved', adminNote });
      toast.success('Loan approved successfully');
      setConfirmTarget(null);
      load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to approve loan');
    } finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setSubmitting(true);
    try {
      const id = rejectTarget.id || rejectTarget._id;
      await loansAPI.updateStatus(id, { status: 'rejected', adminNote });
      toast.success('Loan rejected');
      setRejectTarget(null);
      load();
    } catch (err: unknown) {
      toast.error((err as { response?: { data?: { error?: string } } }).response?.data?.error || 'Failed to reject loan');
    } finally { setSubmitting(false); }
  };

  const totalPages = Math.max(1, Math.ceil(loans.length / PAGE_SIZE));
  const paginatedLoans = loans.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const actionButtons = (l: Loan) =>
    l.status === 'pending' ? (
      <>
        <MDButton size="small" variant="outlined" color="success" onClick={() => openConfirm(l)}>
          Approve
        </MDButton>
        <MDButton size="small" variant="outlined" color="error" onClick={() => openReject(l)}>
          Reject
        </MDButton>
      </>
    ) : null;

  const columns: Column<Loan>[] = [
    {
      key: 'user',
      header: 'User',
      render: (l) => (
        <MDBox display="flex" alignItems="center" gap={1.5} data-loan-row={loanId(l)}>
          <PersonAvatar
            name={`${l.userId?.firstName ?? ''} ${l.userId?.lastName ?? ''}`}
            email={l.userId?.email}
            photoUrl={null}
          />
          <MDBox lineHeight={1.2} minWidth={0}>
            <MDTypography variant="button" fontWeight="medium" display="block">
              {l.userId?.firstName} {l.userId?.lastName}
            </MDTypography>
            <MDTypography variant="caption" color="text">{l.userId?.email}</MDTypography>
            {/* Phones: the other columns are hidden, so the essentials go here. */}
            <MDBox display={{ xs: 'block', md: 'none' }} mt={1}>
              <MDBox display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <MDTypography variant="caption" fontWeight="bold" color="info">
                  {l.loanAmount?.toFixed(2)} {l.loanAsset}
                </MDTypography>
                <StatusBadge status={l.status} />
              </MDBox>
              <MDTypography variant="caption" color="text" display="block">
                {l.collateralAmount} {l.collateralAsset} collateral · LTV {(l.ltv * 100).toFixed(0)}% · APR {(l.apr * 100).toFixed(0)}%
              </MDTypography>
              {l.status === 'pending' && (
                <MDBox display="flex" gap={1} mt={1} onClick={stopRowClick}>{actionButtons(l)}</MDBox>
              )}
            </MDBox>
          </MDBox>
        </MDBox>
      ),
    },
    {
      key: 'collateral',
      header: 'Collateral',
      hideOnMobile: true,
      render: (l) => (
        <MDTypography variant="button" fontWeight="medium" whiteSpace="nowrap">
          {l.collateralAmount} {l.collateralAsset}
        </MDTypography>
      ),
    },
    {
      key: 'loan',
      header: 'Loan',
      hideOnMobile: true,
      render: (l) => (
        <MDBox lineHeight={1.2}>
          <MDTypography variant="button" fontWeight="bold" color="info" display="block" whiteSpace="nowrap">
            {l.loanAmount?.toFixed(2)} {l.loanAsset}
          </MDTypography>
          <MDTypography variant="caption" color="text" display="block" noWrap maxWidth={150} title={l.payoutAddress}>
            To: {l.payoutAddress}
          </MDTypography>
        </MDBox>
      ),
    },
    {
      key: 'ltv',
      header: 'LTV / APR',
      hideOnMobile: true,
      render: (l) => (
        <MDBox lineHeight={1.4} whiteSpace="nowrap">
          <MDBox>LTV: {(l.ltv * 100).toFixed(0)}%</MDBox>
          <MDBox>APR: {(l.apr * 100).toFixed(0)}%</MDBox>
        </MDBox>
      ),
    },
    { key: 'status', header: 'Status', hideOnMobile: true, render: (l) => <StatusBadge status={l.status} /> },
    { key: 'date', header: 'Date', hideOnMobile: true, render: (l) => formatDate(l.createdAt) },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      hideOnMobile: true,
      render: (l) => (
        <MDBox display="flex" flexDirection="column" alignItems="stretch" gap={1} onClick={stopRowClick}>{actionButtons(l)}</MDBox>
      ),
    },
  ];

  return (
    <AdminPage title="Loans" description="Review and manage user loan requests">
      {highlightId && !loading && (
        <MDAlert color="info">
          <MDBox display="flex" alignItems="center" gap={1}>
            <Icon fontSize="small" sx={{ color: 'white.main' }}>bolt</Icon>
            <MDTypography variant="button" color="white" fontWeight="regular" display="block">
              Opened from email notification — the loan is highlighted below.
            </MDTypography>
          </MDBox>
        </MDAlert>
      )}

      <MDBox mb={6}>
        <Tabs
          value={activeTab}
          onChange={(_: SyntheticEvent, value: LoanTab) => setActiveTab(value)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ maxWidth: 520 }}
        >
          {TABS.map((t) => (
            <Tab key={t} value={t} label={TAB_LABEL[t]} />
          ))}
        </Tabs>
      </MDBox>

      {/* The emailed loan's row is tinted (the marker sits in its first cell). */}
      <MDBox
        sx={({ palette, functions: { rgba } }) => ({
          [`& tr:has([data-loan-row="${highlightId ?? ''}"])`]: highlightId
            ? { backgroundColor: rgba(palette.info.main, 0.12) }
            : {},
        })}
      >
        <DataTableCard
          title={`${TAB_LABEL[activeTab]} loans`}
          subtitle={
            loans.length
              ? `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, loans.length)} of ${loans.length} · page ${currentPage} of ${totalPages}`
              : 'Loan requests from users'
          }
          columns={columns}
          rows={paginatedLoans}
          rowKey={loanId}
          rowHref={(l) => `/admin/loans/${loanId(l)}`}
          isLoading={loading && !loadedOnce}
          isFetching={loading}
          error={loadError}
          onRetry={load}
          emptyMessage="No loans found. There are no loan requests matching the current filter."
          paging={{
            page: currentPage,
            hasPrevious: currentPage > 1,
            hasNext: currentPage < totalPages,
            onPrevious: () => setCurrentPage((p) => Math.max(1, p - 1)),
            onNext: () => setCurrentPage((p) => Math.min(totalPages, p + 1)),
          }}
        />
      </MDBox>

      <MDBox mt={6}>
        <DataTableCard
          title="Earn deposits"
          subtitle={earns.length ? `${earns.length} savings requests · open one to activate or reject it` : 'Savings (earn) requests from users'}
          columns={EARN_COLUMNS}
          rows={earns.slice((earnPage - 1) * PAGE_SIZE, earnPage * PAGE_SIZE)}
          rowKey={(e) => e.id}
          rowHref={(e) => `/admin/loans/${e.id}?kind=earn`}
          isLoading={earnsLoading && earns.length === 0}
          isFetching={earnsLoading && earns.length > 0}
          error={earnsError}
          onRetry={loadEarns}
          emptyMessage="No earn deposits yet."
          paging={{
            page: earnPage,
            hasPrevious: earnPage > 1,
            hasNext: earnPage < earnPages,
            onPrevious: () => setEarnPage((p) => Math.max(1, p - 1)),
            onNext: () => setEarnPage((p) => Math.min(earnPages, p + 1)),
          }}
        />
      </MDBox>

      <AdminDialog
        isOpen={!!confirmTarget}
        onClose={() => !submitting && setConfirmTarget(null)}
        title="Approve Loan"
        actions={
          <>
            <MDButton variant="text" color="dark" onClick={() => setConfirmTarget(null)} disabled={submitting}>Cancel</MDButton>
            <MDButton variant="gradient" color="success" onClick={() => void handleConfirm()} disabled={submitting}>
              {submitting ? 'Approving…' : 'Approve Loan'}
            </MDButton>
          </>
        }
      >
        <MDAlert color="success">
          <MDBox display="flex" alignItems="flex-start" gap={1.5}>
            <Icon fontSize="small" sx={{ color: 'white.main', mt: 0.25 }}>check_circle</Icon>
            <MDTypography variant="button" color="white" fontWeight="regular" display="block">
              You are about to approve this loan. Make sure you have transferred{' '}
              <b>{confirmTarget?.loanAmount?.toFixed(2)} {confirmTarget?.loanAsset}</b>{' '}to the user&apos;s wallet address.
            </MDTypography>
          </MDBox>
        </MDAlert>
        <MDInput
          fullWidth
          label="Admin Note (Optional)"
          placeholder="e.g. Sent via TRX network"
          value={adminNote}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAdminNote(e.target.value)}
          disabled={submitting}
        />
      </AdminDialog>

      <AdminDialog
        isOpen={!!rejectTarget}
        onClose={() => !submitting && setRejectTarget(null)}
        title="Reject Loan"
        actions={
          <>
            <MDButton variant="text" color="dark" onClick={() => setRejectTarget(null)} disabled={submitting}>Cancel</MDButton>
            <MDButton variant="gradient" color="error" onClick={() => void handleReject()} disabled={submitting}>
              {submitting ? 'Rejecting…' : 'Reject Loan'}
            </MDButton>
          </>
        }
      >
        <MDAlert color="error">
          <MDBox display="flex" alignItems="flex-start" gap={1.5}>
            <Icon fontSize="small" sx={{ color: 'white.main', mt: 0.25 }}>cancel</Icon>
            <MDTypography variant="button" color="white" fontWeight="regular" display="block">
              You are about to reject this loan request. The user will not receive the funds.
            </MDTypography>
          </MDBox>
        </MDAlert>
        <MDInput
          fullWidth
          label="Reason for rejection (Optional)"
          placeholder="e.g. Insufficient collateral history"
          value={adminNote}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setAdminNote(e.target.value)}
          disabled={submitting}
        />
      </AdminDialog>
    </AdminPage>
  );
}
