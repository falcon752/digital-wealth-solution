'use client';

import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { adminAPI } from '@/lib/api';
import AdminPage from '@/components/admin/shell/AdminPage';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import { SearchField } from '@/components/admin/ui/Filters';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import MDBadge from '@/components/admin/components/MDBadge';
import MDBox from '@/components/admin/components/MDBox';
import MDTypography from '@/components/admin/components/MDTypography';
import { APP_TIMEZONE } from '@/lib/utils';

interface ReferralPerson {
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface ReferralRow extends ReferralPerson {
  id: string;
  referralCode?: string;
  referredBy?: ReferralPerson | null;
  createdAt: string;
}

const PAGE_SIZE = 20;

function Person({ person }: { person: ReferralPerson }) {
  return (
    <MDBox display="flex" alignItems="center" gap={1.5}>
      <PersonAvatar name={`${person.firstName ?? ''} ${person.lastName ?? ''}`} email={person.email} photoUrl={null} />
      <MDBox lineHeight={1.2} minWidth={0}>
        <MDTypography variant="button" fontWeight="medium" display="block">
          {person.firstName} {person.lastName}
        </MDTypography>
        <MDTypography variant="caption" color="text">{person.email}</MDTypography>
      </MDBox>
    </MDBox>
  );
}

const COLUMNS: Column<ReferralRow>[] = [
  {
    key: 'user',
    header: 'User',
    render: (r) => (
      <>
        <Person person={r} />
        {/* Phones: the "Referred by" column is hidden, so say it here. */}
        <MDTypography variant="caption" color="text" display={{ xs: 'block', md: 'none' }} mt={0.75}>
          {r.referredBy ? (
            <>Referred by <b>{`${r.referredBy.firstName ?? ''} ${r.referredBy.lastName ?? ''}`.trim() || r.referredBy.email}</b></>
          ) : (
            <i>Organic / Direct</i>
          )}
        </MDTypography>
      </>
    ),
  },
  {
    key: 'code',
    header: 'Referral code',
    render: (r) =>
      r.referralCode ? (
        <MDBadge badgeContent={r.referralCode} color="info" variant="contained" size="sm" container />
      ) : (
        '—'
      ),
  },
  {
    key: 'referredBy',
    header: 'Referred by',
    hideOnMobile: true,
    render: (r) =>
      r.referredBy ? (
        <Person person={r.referredBy} />
      ) : (
        <MDTypography variant="caption" color="text" fontStyle="italic">Organic / Direct</MDTypography>
      ),
  },
  {
    key: 'joined',
    header: 'Joined date',
    hideOnMobile: true,
    render: (r) => new Date(r.createdAt).toLocaleDateString('en-US', { timeZone: APP_TIMEZONE }),
  },
];

export default function AdminReferralsPage() {
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await adminAPI.getReferrals({ page, limit: PAGE_SIZE, search });
      setReferrals(res.data.referrals);
      setTotal(res.data.total);
    } catch (err: unknown) {
      setLoadError(err);
      toast.error('Failed to load referrals');
    } finally {
      setLoading(false);
      setLoadedOnce(true);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchReferrals();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchReferrals]);

  return (
    <AdminPage title="Referrals Tracking" description="Who joined with whose referral code.">
      <MDBox mt={4}>
        <DataTableCard
          title="Referrals"
          subtitle={total > 0 ? `Showing ${referrals.length} of ${total}` : 'Every account and who referred it'}
          columns={COLUMNS}
          rows={referrals}
          rowKey={(r) => String(r.id)}
          isLoading={loading && !loadedOnce}
          isFetching={loading}
          error={loadError}
          onRetry={() => void fetchReferrals()}
          emptyMessage="No referrals found"
          toolbar={
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search by name, email, or referral code..."
              width="min(360px, 100%)"
            />
          }
          paging={
            total > PAGE_SIZE
              ? {
                  page,
                  hasPrevious: page > 1,
                  hasNext: referrals.length >= PAGE_SIZE,
                  onPrevious: () => setPage((p) => Math.max(1, p - 1)),
                  onNext: () => setPage((p) => p + 1),
                }
              : undefined
          }
        />
      </MDBox>
    </AdminPage>
  );
}
