'use client';

import Link from 'next/link';
import Card from '@mui/material/Card';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import AdminPage from '@/components/admin/shell/AdminPage';
import StatCard from '@/components/admin/ui/StatCard';
import Icon from '@/components/admin/ui/Icon';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import { useAccent } from '@/components/admin/ui/useAccent';
import { useAdminStats, waitingItems } from '@/components/admin/shell/useAdminStats';
import { errorMessage } from '@/components/admin/lib/errors';
import { humanize } from '@/components/admin/lib/format';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { AdminQueues } from '@/types';

/** Every queue, including empty ones, so the card shows what is clear too. */
interface Queue {
  key: keyof AdminQueues;
  label: string;
  icon: string;
  href: string;
  /** Red when not empty (money or identity waiting on us). */
  urgent?: boolean;
}

const QUEUES: Queue[] = [
  { key: 'kyc', label: 'KYC verifications', icon: 'verified_user', href: '/admin/kyc', urgent: true },
  { key: 'paymentProofs', label: 'Payment proofs', icon: 'request_quote', href: '/admin/payment-proofs', urgent: true },
  { key: 'onboardingPayments', label: 'Onboarding fees', icon: 'paid', href: '/admin/onboarding-payments' },
  { key: 'deposits', label: 'Pending deposits', icon: 'south_west', href: '/admin/deposits?status=pending' },
  { key: 'withdrawals', label: 'Pending withdrawals', icon: 'outbound', href: '/admin/withdrawals?status=pending', urgent: true },
  { key: 'accessRequests', label: 'Access requests', icon: 'key', href: '/admin/access-requests' },
  { key: 'consultations', label: 'New consultations', icon: 'forum', href: '/admin/consultations' },
  { key: 'llc', label: 'LLC applications', icon: 'business', href: '/admin/llc' },
  { key: 'loans', label: 'Loan requests', icon: 'account_balance', href: '/admin/loans' },
  { key: 'cards', label: 'Card requests', icon: 'payment', href: '/admin/cards' },
];

export default function AdminDashboard() {
  const accent = useAccent();
  const { data: stats, loading, error, refresh } = useAdminStats();
  const firstLoad = loading && !stats;
  const waiting = waitingItems(stats).reduce((sum, item) => sum + item.count, 0);

  return (
    <AdminPage title="Overview" description="What's happening on Digital Wealth Partners right now.">
      {error && !stats ? (
        <Card>
          <MDBox p={3} display="flex" alignItems="center" justifyContent="space-between" gap={2} flexWrap="wrap">
            <MDTypography variant="button" color="error">{errorMessage(error, 'Could not load the overview.')}</MDTypography>
            <MDButton variant="outlined" color="info" size="small" onClick={() => void refresh()}>Try again</MDButton>
          </MDBox>
        </Card>
      ) : (
        <>
          {/* Headline numbers */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6} lg={3}>
              <MDBox mb={1.5}>
                <StatCard loading={firstLoad} color={accent} icon="group" title="Total users" value={stats?.totalUsers ?? 0}
                  href="/admin/users" footnote={{ amount: String(stats?.activeUsers ?? 0), label: 'active accounts', color: 'success' }} />
              </MDBox>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <MDBox mb={1.5}>
                <StatCard loading={firstLoad} color="warning" icon="pending_actions" title="Waiting for review" value={waiting}
                  footnote={{ label: waiting ? 'items across all queues' : 'all queues are clear', color: waiting ? 'warning' : 'success' }} />
              </MDBox>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <MDBox mb={1.5}>
                <StatCard loading={firstLoad} color="success" icon="south_west" title="Total deposited" value={formatCurrency(stats?.totalDepositedUSD || 0)}
                  href="/admin/deposits" footnote={{ amount: String(stats?.pendingDeposits ?? 0), label: 'deposits pending', color: 'info' }} />
              </MDBox>
            </Grid>
            <Grid item xs={12} md={6} lg={3}>
              <MDBox mb={1.5}>
                <StatCard loading={firstLoad} color="info" icon="outbound" title="Total withdrawn" value={formatCurrency(stats?.totalWithdrawnUSD || 0)}
                  href="/admin/withdrawals" footnote={{ amount: String(stats?.pendingWithdrawals ?? 0), label: 'withdrawals pending', color: 'warning' }} />
              </MDBox>
            </Grid>
          </Grid>

          <MDBox mt={4.5}>
            <Grid container spacing={3}>
              {/* Work queues */}
              <Grid item xs={12} lg={5}>
                <Card sx={{ height: '100%' }}>
                  <MDBox pt={3} px={3}>
                    <MDTypography variant="h6" fontWeight="medium">Waiting for the team</MDTypography>
                    <MDTypography variant="button" color="text" fontWeight="regular">Each line opens the list that clears it.</MDTypography>
                  </MDBox>
                  <MDBox p={2}>
                    {QUEUES.map((queue) => {
                      const count = firstLoad ? null : (stats?.queues?.[queue.key] ?? 0);
                      const color = !count ? 'success' : queue.urgent ? 'error' : 'warning';
                      return (
                        <MDBox
                          key={queue.key}
                          component={Link}
                          href={queue.href}
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          py={1.25}
                          px={1}
                          borderRadius="md"
                          sx={({ palette: { grey } }) => ({ textDecoration: 'none', '&:hover': { backgroundColor: grey[100] } })}
                        >
                          <MDBox display="flex" alignItems="center" gap={1.5}>
                            <MDBox display="grid" sx={{ placeItems: 'center' }} width="2rem" height="2rem" borderRadius="md" variant="gradient" bgColor={color} color="white">
                              <Icon fontSize="small">{queue.icon}</Icon>
                            </MDBox>
                            <MDTypography variant="button" fontWeight="medium">{queue.label}</MDTypography>
                          </MDBox>
                          {count === null ? <Skeleton width={24} /> : <MDTypography variant="h6" color={count === 0 ? 'text' : color}>{count}</MDTypography>}
                        </MDBox>
                      );
                    })}
                  </MDBox>
                </Card>
              </Grid>

              {/* Recent activity */}
              <Grid item xs={12} lg={7}>
                <Card sx={{ height: '100%' }}>
                  <MDBox pt={3} px={3} display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
                    <MDBox>
                      <MDTypography variant="h6" fontWeight="medium">Recent activity</MDTypography>
                      <MDTypography variant="button" color="text" fontWeight="regular">The latest sign-ins and actions across the platform.</MDTypography>
                    </MDBox>
                    <MDButton component={Link} href="/admin/activity" variant="text" color="info" size="small">View all</MDButton>
                  </MDBox>
                  <MDBox p={2}>
                    {firstLoad && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={44} />)}
                    {!firstLoad && !stats?.recentActivity?.length && (
                      <MDTypography variant="button" color="text" px={1}>No activity yet.</MDTypography>
                    )}
                    {stats?.recentActivity?.map((log, i) => (
                      <MDBox key={i}>
                        {i > 0 && <Divider sx={{ my: 0.5 }} />}
                        <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} py={1} px={1}>
                          <MDBox minWidth={0}>
                            <MDTypography variant="button" fontWeight="medium" display="block">{humanize(log.action)}</MDTypography>
                            <MDTypography variant="caption" color="text" display="block" noWrap>
                              {log.email || 'System'} · {log.ipAddress || 'N/A'}
                            </MDTypography>
                          </MDBox>
                          <MDTypography variant="caption" color="text" whiteSpace="nowrap">{formatDate(log.createdAt)}</MDTypography>
                        </MDBox>
                      </MDBox>
                    ))}
                  </MDBox>
                </Card>
              </Grid>
            </Grid>
          </MDBox>
        </>
      )}
    </AdminPage>
  );
}
