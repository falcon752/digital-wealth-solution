'use client';

/**
 * Lend & Invest overview, laid out like an Anchorage vault: the title with "New loan or invest" on
 * the right, three figures (active loans, locked collateral, active deposits), then the client's
 * loans and invest deposits as tables under grey column bands.
 */
import { useCallback, useEffect, useState } from 'react';
import { Coins, HandCoins, PiggyBank, Plus, X } from 'lucide-react';
import { loansAPI, earnsAPI, assetsAPI } from '@/lib/api';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { APP_TIMEZONE } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useBalancesChanged } from '@/components/client/actions';
import { AnimatedMoney } from '@/components/client/motion';
import { ActionButton, AssetIcon, Card, EmptyState, PageHeader, Skeleton, StatusPill, TableHead, formatAmount } from '@/components/client/ui';

type LoanRow = {
  id?: string; _id?: string; status: string; createdAt?: string;
  loanAsset?: string; loanAmount?: number; collateralAsset?: string; collateralAmount?: number; ltv?: number; apr?: number;
};
type EarnRow = {
  id?: string; _id?: string; status: string; createdAt?: string;
  asset?: string; amount?: number; apy?: number; monthlyReward?: number; term?: string;
};

const LOAN_GRID = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1.2fr)_0.6fr_0.8fr]';
const EARN_GRID = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[minmax(0,1.4fr)_0.6fr_minmax(0,1.2fr)_0.8fr]';

function shortDate(date?: string) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', { timeZone: APP_TIMEZONE, month: 'short', day: 'numeric', year: 'numeric' });
}

function pct(value?: number) {
  if (value === undefined || value === null) return '—';
  return `${+(value * 100).toFixed(2)}%`;
}

function Stat({ label, value, loading, className }: { label: string; value: number; loading: boolean; className?: string }) {
  return (
    <Card className={className} bodyClassName="p-4 sm:p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-cd-muted">{label}</p>
      {loading ? (
        <Skeleton className="mt-3 h-8 w-36" />
      ) : (
        <AnimatedMoney value={value} className="mt-2 block truncate text-[22px] font-normal leading-tight text-cd-text sm:text-[30px]" />
      )}
    </Card>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-4 px-3 py-4">
      {[0, 1].map((i) => (
        <div key={i} className="flex items-center gap-3.5">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-20" /></div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export default function FinanceDashboardPage() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    activeLoansUsd: 0,
    activeCollateralUsd: 0,
    activeEarningsUsd: 0,
  });
  const [loanRows, setLoanRows] = useState<LoanRow[]>([]);
  const [earnRows, setEarnRows] = useState<EarnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [bannerVisible, setBannerVisible] = useState(true);

  const load = useCallback((quiet = false) => {
    if (!quiet) setLoading(true);
    Promise.all([loansAPI.list(), earnsAPI.list(), assetsAPI.prices()])
      .then(([loansRes, earnsRes, pricesRes]) => {
        const loans = loansRes.data.loans || [];
        const earns = earnsRes.data.earns || [];
        const prices = pricesRes.data.prices || {};

        let activeLoansUsd = 0;
        let activeCollateralUsd = 0;
        let activeEarningsUsd = 0;

        loans.forEach((l: any) => {
          if (l.status === 'approved' || l.status === 'pending') {
            activeLoansUsd += (l.loanAmount || 0) * (prices[l.loanAsset?.toUpperCase()] || 0);
            activeCollateralUsd += (l.collateralAmount || 0) * (prices[l.collateralAsset?.toUpperCase()] || 0);
          }
        });

        earns.forEach((e: any) => {
          if (e.status === 'active' || e.status === 'pending') {
            activeEarningsUsd += (e.amount || 0) * (prices[e.asset?.toUpperCase()] || 0);
          }
        });

        setStats({
          activeLoansUsd,
          activeCollateralUsd,
          activeEarningsUsd,
        });
        setLoanRows(loans);
        setEarnRows(earns);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  // After an action in a pop-up, refresh the figures without the loading skeleton.
  const reloadQuietly = useCallback(() => load(true), [load]);
  useBalancesChanged(reloadQuietly);

  const newAction = (
    <ActionButton href="/dashboard/lending" variant="primary" icon={Plus} className="transition active:scale-[0.98]">New loan or invest</ActionButton>
  );

  return (
    <div className="min-h-full">
      <DashboardHeader title="Lend & Invest" breadcrumb />

      <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 lg:px-10 lg:pt-3">
        <PageHeader
          icon={Coins}
          title="Lend & Invest"
          titleOnPhone={false}
          meta={['Your crypto-backed loans and interest deposits']}
          actions={<div className="hidden lg:flex">{newAction}</div>}
        />

        {bannerVisible && (
          <div className="mt-6 flex items-start justify-between gap-4 rounded-md bg-cd-raised px-4 py-3">
            <p className="text-[13.5px] leading-relaxed text-cd-muted">
              <span className="font-medium text-cd-text">Welcome{user?.firstName ? `, ${user.firstName}` : ''}.</span>{' '}
              Manage your active crypto loans, collateral, and earnings.
            </p>
            <button
              type="button"
              onClick={() => setBannerVisible(false)}
              aria-label="Dismiss"
              className="-mr-1 shrink-0 rounded p-1 text-cd-muted hover:bg-cd-band hover:text-cd-text"
            >
              <X size={15} strokeWidth={1.75} />
            </button>
          </div>
        )}

        {/* Figures */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <Stat label="Active loans" value={stats.activeLoansUsd} loading={loading} />
          <Stat label="Locked collateral" value={stats.activeCollateralUsd} loading={loading} />
          <Stat label="Active deposits" value={stats.activeEarningsUsd} loading={loading} className="col-span-2 sm:col-span-1" />
        </div>

        <div className="mt-5 lg:hidden">
          <ActionButton href="/dashboard/lending" variant="primary" icon={Plus} className="h-11 w-full transition active:scale-[0.98]">New loan or invest</ActionButton>
        </div>

        <div className="mt-8 space-y-5 lg:mt-10">
          {/* Loans */}
          <Card title="Loans">
            {loading ? (
              <ListSkeleton />
            ) : loanRows.length === 0 ? (
              <EmptyState
                icon={HandCoins}
                title="No loans yet"
                text="Borrow stablecoins against your crypto without selling it."
                action={<ActionButton href="/dashboard/lending">Get a loan</ActionButton>}
              />
            ) : (
              <div>
                <TableHead className={LOAN_GRID}>
                  <span>Loan</span>
                  <span className="text-right sm:text-left"><span className="sm:hidden">Status</span><span className="hidden sm:inline">Collateral</span></span>
                  <span className="hidden text-right sm:block">APR</span>
                  <span className="hidden text-right sm:block">Status</span>
                </TableHead>
                <ul>
                  {loanRows.map((loan, i) => {
                    const symbol = (loan.loanAsset || '').toUpperCase();
                    const collateral = (loan.collateralAsset || '').toUpperCase();
                    return (
                      <li key={loan.id || loan._id || i} className={`${LOAN_GRID} border-b border-cd-line px-3 py-4 last:border-b-0 sm:px-4`}>
                        <div className="flex min-w-0 items-center gap-3.5">
                          <AssetIcon symbol={symbol || '?'} size={30} />
                          <div className="min-w-0">
                            <p className="cd-num truncate text-[14px] font-medium text-cd-text">{formatAmount(loan.loanAmount || 0, symbol)}</p>
                            <p className="cd-num mt-0.5 truncate text-[12px] text-cd-muted">
                              <span className="sm:hidden">{formatAmount(loan.collateralAmount || 0, collateral)} collateral</span>
                              <span className="hidden sm:inline">{shortDate(loan.createdAt)}</span>
                            </p>
                          </div>
                        </div>
                        <div className="text-right sm:hidden"><StatusPill status={loan.status} /></div>
                        <div className="hidden min-w-0 sm:block">
                          <p className="cd-num truncate text-[14px] text-cd-text">{formatAmount(loan.collateralAmount || 0, collateral)}</p>
                          <p className="cd-num mt-0.5 text-[12px] text-cd-muted">{pct(loan.ltv)} LTV</p>
                        </div>
                        <p className="cd-num hidden text-right text-[14px] text-cd-text sm:block">{pct(loan.apr)}</p>
                        <div className="hidden text-right sm:block"><StatusPill status={loan.status} /></div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>

          {/* Invest deposits */}
          <Card title="Invest deposits">
            {loading ? (
              <ListSkeleton />
            ) : earnRows.length === 0 ? (
              <EmptyState
                icon={PiggyBank}
                title="No deposits yet"
                text="Put idle crypto to work and earn a daily reward."
                action={<ActionButton href="/dashboard/lending">Start earning</ActionButton>}
              />
            ) : (
              <div>
                <TableHead className={EARN_GRID}>
                  <span>Deposit</span>
                  <span className="text-right sm:text-left"><span className="sm:hidden">Status</span><span className="hidden sm:inline">APY</span></span>
                  <span className="hidden sm:block">Monthly reward</span>
                  <span className="hidden text-right sm:block">Status</span>
                </TableHead>
                <ul>
                  {earnRows.map((earn, i) => {
                    const symbol = (earn.asset || '').toUpperCase();
                    return (
                      <li key={earn.id || earn._id || i} className={`${EARN_GRID} border-b border-cd-line px-3 py-4 last:border-b-0 sm:px-4`}>
                        <div className="flex min-w-0 items-center gap-3.5">
                          <AssetIcon symbol={symbol || '?'} size={30} />
                          <div className="min-w-0">
                            <p className="cd-num truncate text-[14px] font-medium text-cd-text">{formatAmount(earn.amount || 0, symbol)}</p>
                            <p className="cd-num mt-0.5 truncate text-[12px] text-cd-muted">
                              <span className="sm:hidden">{pct(earn.apy)} APY · </span>
                              {shortDate(earn.createdAt)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right sm:hidden"><StatusPill status={earn.status} /></div>
                        <p className="cd-num hidden text-[14px] text-cd-text sm:block">{pct(earn.apy)}</p>
                        <div className="hidden min-w-0 sm:block">
                          <p className="cd-num truncate text-[14px] text-cd-text">{formatAmount(earn.monthlyReward || 0, symbol)}</p>
                          {earn.term && <p className="mt-0.5 text-[12px] text-cd-muted">{earn.term} term</p>}
                        </div>
                        <div className="hidden text-right sm:block"><StatusPill status={earn.status} /></div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
