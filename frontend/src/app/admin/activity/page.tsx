'use client';

import { useEffect, useState } from 'react';
import { keyframes } from '@mui/material/styles';
import { adminAPI } from '@/lib/api';
import { ActivityLog } from '@/types';
import { formatDate } from '@/lib/utils';
import AdminPage from '@/components/admin/shell/AdminPage';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import MDBox from '@/components/admin/components/MDBox';
import MDTypography from '@/components/admin/components/MDTypography';

type ActionColor = 'success' | 'error' | 'warning' | 'info' | 'primary' | 'text';

interface ActionStyle {
  color: ActionColor;
  bold?: boolean;
  /** Something the team should act on (pulses, as before). */
  pulse?: boolean;
}

const ACTION_COLORS: Record<string, ActionStyle> = {
  // Authentication & Registrations
  USER_REGISTERED: { color: 'success', bold: true },
  LOGIN_SUCCESS: { color: 'info' },
  LOGIN_FAILED: { color: 'error', bold: true },
  LOGIN_2FA_FAILED: { color: 'error', bold: true },
  PASSWORD_RESET: { color: 'warning', bold: true },
  '2FA_ENABLED': { color: 'success', bold: true },
  '2FA_DISABLED': { color: 'error', bold: true },

  // Onboarding Fee Approvals
  ONBOARDING_FEE_SUBMITTED: { color: 'warning', bold: true, pulse: true },
  USER_PAYMENT_VERIFIED: { color: 'success', bold: true },
  INQUIRY_SUBMITTED: { color: 'info', bold: true, pulse: true },

  // Deposits
  DEPOSIT_SUBMITTED: { color: 'warning', bold: true, pulse: true },
  DEPOSIT_CONFIRMED: { color: 'success', bold: true },
  DEPOSIT_REJECTED: { color: 'error', bold: true },

  // Withdrawals
  WITHDRAWAL_SUBMITTED: { color: 'warning', bold: true },
  WITHDRAWAL_VERIFIED: { color: 'info', bold: true },
  WITHDRAWAL_APPROVED: { color: 'primary', bold: true },
  WITHDRAWAL_COMPLETED: { color: 'success', bold: true },
  WITHDRAWAL_REJECTED: { color: 'error', bold: true },
  WITHDRAWAL_OTP_FAILED: { color: 'error' },

  // Admin Actions
  USER_ACTIVATED: { color: 'success', bold: true },
  USER_DEACTIVATED: { color: 'error', bold: true },
  BALANCE_ADJUSTED: { color: 'primary', bold: true },
  ADMIN_CREATED_USER: { color: 'info', bold: true },
};

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
`;

function parseDetails(log: ActivityLog): Record<string, unknown> {
  // The API sends details as an object; older code stored a JSON string.
  const details = log.details as unknown;
  if (details && typeof details === 'object') return details as Record<string, unknown>;
  try { return typeof details === 'string' ? JSON.parse(details) : {}; } catch { return {}; }
}

const columns: Column<ActivityLog>[] = [
  {
    key: 'user',
    header: 'User',
    render: (log) => (
      <MDBox lineHeight={1.2}>
        <MDTypography variant="button" fontWeight="medium" display="block" sx={{ overflowWrap: 'anywhere' }}>
          {log.email || `User #${log.userId}`}
        </MDTypography>
        {/* Phones: the time column is hidden, so show it here. */}
        <MDTypography variant="caption" color="text" display={{ xs: 'block', md: 'none' }} mt={0.25}>{formatDate(log.createdAt)}</MDTypography>
      </MDBox>
    ),
  },
  {
    key: 'action',
    header: 'Action',
    render: (log) => {
      const style = ACTION_COLORS[log.action] ?? { color: 'text' as const };
      return (
        <MDBox display="inline-flex" alignItems="center" gap={0.75}>
          {style.pulse && (
            <MDBox
              component="span"
              width="0.5rem"
              height="0.5rem"
              borderRadius="50%"
              bgColor={style.color}
              flexShrink={0}
              sx={{ animation: `${pulse} 2s ease-in-out infinite` }}
            />
          )}
          <MDTypography
            variant="button"
            color={style.color}
            fontWeight={style.bold ? 'bold' : 'medium'}
            sx={{ fontFamily: 'monospace' }}
          >
            {log.action.replace(/_/g, ' ')}
          </MDTypography>
        </MDBox>
      );
    },
  },
  {
    key: 'details',
    header: 'Details',
    hideOnMobile: true,
    render: (log) => {
      const parsedDetails = parseDetails(log);
      if (Object.keys(parsedDetails).length === 0) return <MDTypography variant="caption" color="text">—</MDTypography>;
      return (
        <MDBox display="flex" flexWrap="wrap" gap={0.5} maxWidth={420}>
          {Object.entries(parsedDetails).map(([k, v]) => (
            <MDBox
              key={k}
              component="span"
              px={1}
              py={0.25}
              borderRadius="md"
              sx={({ palette, typography }) => ({
                backgroundColor: palette.grey[200],
                fontSize: typography.size.xs,
                lineHeight: 1.5,
                color: palette.text.main,
                whiteSpace: 'nowrap',
              })}
            >
              {k}: {String(v).slice(0, 20)}
            </MDBox>
          ))}
        </MDBox>
      );
    },
  },
  {
    key: 'ip',
    header: 'IP Address',
    hideOnMobile: true,
    render: (log) => (
      <MDTypography variant="caption" color="text" sx={{ fontFamily: 'monospace' }}>{log.ipAddress || '—'}</MDTypography>
    ),
  },
  {
    key: 'time',
    header: 'Time',
    hideOnMobile: true,
    render: (log) => <MDTypography variant="caption" color="text" whiteSpace="nowrap">{formatDate(log.createdAt)}</MDTypography>,
  },
];

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // Bumped by "Try again"; the request for the current page + attempt is loading until it settles.
  const [attempt, setAttempt] = useState(0);
  const [settledKey, setSettledKey] = useState<string | null>(null);
  const requestKey = `${page}:${attempt}`;
  const loading = settledKey !== requestKey;
  const limit = 30;

  useEffect(() => {
    let cancelled = false;
    adminAPI.getActivityLogs({ page, limit })
      .then((r) => {
        if (cancelled) return;
        setLogs(r.data.logs || r.data);
        if (r.data.total) setTotalPages(Math.ceil(r.data.total / limit));
        setLoaded(true);
        setError(null);
      })
      .catch((e: unknown) => { if (!cancelled) setError(e); })
      .finally(() => { if (!cancelled) setSettledKey(`${page}:${attempt}`); });
    return () => { cancelled = true; };
  }, [page, attempt]);

  // Entries may not carry a unique id: key rows by their position, as before.
  const rowKeys = new Map(logs.map((log, i) => [log, String(i)]));

  return (
    <AdminPage title="Activity Log" description="All user and system activity events">
      <MDBox mt={3}>
        <DataTableCard
          title="Activity"
          subtitle={totalPages > 1 ? `Newest first · page ${page} of ${totalPages}` : 'Newest first'}
          columns={columns}
          rows={logs}
          rowKey={(log) => rowKeys.get(log) ?? log.id}
          rowHref={(log) => `/admin/activity/${log.id}`}
          isLoading={loading && !loaded}
          isFetching={loading}
          error={error}
          onRetry={() => setAttempt((a) => a + 1)}
          emptyMessage="No activity yet."
          paging={totalPages > 1 ? {
            page,
            hasPrevious: page > 1,
            hasNext: page < totalPages,
            onPrevious: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => Math.min(totalPages, p + 1)),
          } : undefined}
        />
      </MDBox>
    </AdminPage>
  );
}
