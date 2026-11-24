'use client';

/**
 * /admin/holdings: every client's portfolio holdings (retirement accounts, investments, precious
 * metals, NFTs, DeFi positions) that DWP's team records and clients see read-only. KPI cards show
 * the active count and value per category (click one to filter); the list filters by category,
 * status and search (holding, institution, symbol or client). Rows open the client's page.
 * Add holding picks the client first. Nothing is deleted: Close and Remove hide a holding from
 * the client and from totals, and Reopen / Restore bring it back. Amounts are USD.
 * Links: ?category=<category>, ?status=closed|removed|all, ?search=<text> (a portfolio ticket links
 * here with the client's email).
 */
import { useCallback, useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import AdminPage from '@/components/admin/shell/AdminPage';
import DataTableCard, { type Column } from '@/components/admin/ui/DataTableCard';
import { SearchField, SelectFilter } from '@/components/admin/ui/Filters';
import Icon from '@/components/admin/ui/Icon';
import PersonAvatar from '@/components/admin/ui/PersonAvatar';
import StatCard from '@/components/admin/ui/StatCard';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import { fmtUsd } from '@/components/admin/detail/Record';
import HoldingDialog from '@/components/admin/holdings/HoldingDialog';
import { HoldingRowActions, HoldingStatusDialog, type StatusChange } from '@/components/admin/holdings/HoldingActions';
import { HoldingValue, holdingSubline } from '@/components/admin/holdings/ClientHoldings';
import {
  adminHoldingsAPI, CATEGORY_META, CATEGORY_OPTIONS, HOLDING_CATEGORIES, STATUS_BADGE, categoryLabel, fmtQuantity,
  type CategoryTotals, type Holding, type HoldingCategory,
} from '@/components/admin/holdings/api';

const PAGE_SIZE = 25;
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'closed', label: 'Closed' },
  { value: 'removed', label: 'Removed' },
  { value: 'all', label: 'Any status' },
] as const;
type StatusFilter = (typeof STATUS_OPTIONS)[number]['value'];

export default function AdminHoldingsPage() {
  const accent = useAccent();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [total, setTotal] = useState(0);
  const [filteredValue, setFilteredValue] = useState(0);
  const [summary, setSummary] = useState<CategoryTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadedOnce, setLoadedOnce] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<HoldingCategory | ''>('');
  const [status, setStatus] = useState<StatusFilter>('active');
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const [dialog, setDialog] = useState<{ holding: Holding | null } | null>(null);
  const [change, setChange] = useState<StatusChange | null>(null);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const c = query.get('category');
    if (c && (HOLDING_CATEGORIES as readonly string[]).includes(c)) setCategory(c as HoldingCategory);
    const s = query.get('status');
    if (s && STATUS_OPTIONS.some((o) => o.value === s)) setStatus(s as StatusFilter);
    const q = query.get('search');
    if (q) setSearch(q.slice(0, 80));
    setReady(true);
  }, []);

  // The KPI cards: every active holding, whatever the filters.
  const loadSummary = useCallback(() => {
    adminHoldingsAPI.list({ status: 'active', limit: 1 })
      .then((res) => setSummary(res.data.byCategory))
      .catch(() => setSummary({}));
  }, []);
  useEffect(loadSummary, [loadSummary]);

  const load = useCallback(() => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    adminHoldingsAPI.list({ category, status, search, page, limit: PAGE_SIZE })
      .then((res) => {
        setHoldings(res.data.holdings);
        setTotal(res.data.total);
        setFilteredValue(Object.values(res.data.byCategory).reduce((s, c) => s + (c?.valueUsd ?? 0), 0));
      })
      .catch(setError)
      .finally(() => { setLoading(false); setLoadedOnce(true); });
  }, [ready, category, status, search, page]);
  useEffect(load, [load]);

  const reload = () => { load(); loadSummary(); };
  /** A KPI card: filter the list to that category's active holdings (again to clear). */
  const pickCategory = (c: HoldingCategory) => { setCategory(category === c ? '' : c); setStatus('active'); setPage(1); };
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const activeTotal = summary ? Object.values(summary).reduce((s, c) => s + (c?.valueUsd ?? 0), 0) : 0;
  const activeCount = summary ? Object.values(summary).reduce((s, c) => s + (c?.count ?? 0), 0) : 0;

  const columns: Column<Holding>[] = [
    {
      key: 'holding',
      header: 'Holding',
      render: (h) => (
        <MDBox display="flex" alignItems="center" gap={1.5} sx={{ opacity: h.status === 'active' ? 1 : 0.65 }}>
          <MDBox
            variant="gradient"
            bgColor={CATEGORY_META[h.category]?.color ?? 'dark'}
            borderRadius="md"
            width="2.25rem"
            height="2.25rem"
            display={{ xs: 'none', sm: 'flex' }}
            alignItems="center"
            justifyContent="center"
            color="white"
            flexShrink={0}
          >
            <Icon fontSize="small">{CATEGORY_META[h.category]?.icon ?? 'category'}</Icon>
          </MDBox>
          <MDBox lineHeight={1.2} minWidth={{ xs: 0, md: 200 }} maxWidth={320}>
            <MDTypography variant="button" fontWeight="medium" display="block">
              {h.name}{h.symbol ? <MDTypography component="span" variant="caption" color="text"> · {h.symbol}</MDTypography> : null}
            </MDTypography>
            <MDTypography variant="caption" color="text" display="block">{[categoryLabel(h.category), holdingSubline(h)].filter(Boolean).join(' · ')}</MDTypography>
            {/* Phones: the other columns are hidden. */}
            <MDBox display={{ xs: 'block', md: 'none' }} mt={0.75}>
              <MDTypography variant="caption" fontWeight="bold" display="block">{fmtUsd(h.valueUsd)} · {h.client?.name || h.client?.email}</MDTypography>
              <MDBox display="flex" gap={1} alignItems="center" mt={0.5}>
                <StatusBadge {...STATUS_BADGE[h.status]} />
                <MDBox onClick={(e: MouseEvent) => e.stopPropagation()}>
                  <HoldingRowActions holding={h} onEdit={(holding) => setDialog({ holding })} onAsk={setChange} onChanged={reload} />
                </MDBox>
              </MDBox>
            </MDBox>
          </MDBox>
        </MDBox>
      ),
    },
    {
      key: 'client',
      header: 'Client',
      hideOnMobile: true,
      render: (h) => (
        <MDBox display="flex" alignItems="center" gap={1}>
          <PersonAvatar name={h.client?.name} email={h.client?.email} photoUrl={null} size="xs" />
          <MDBox lineHeight={1.2} minWidth={0}>
            <MDTypography variant="button" fontWeight="medium" display="block" noWrap>{h.client?.name || '—'}</MDTypography>
            <MDTypography variant="caption" color="text" noWrap>{h.client?.email}</MDTypography>
          </MDBox>
        </MDBox>
      ),
    },
    { key: 'quantity', header: 'Quantity', align: 'right', hideOnMobile: true, render: (h) => <MDBox component="span" whiteSpace="nowrap">{fmtQuantity(h) ?? '—'}</MDBox> },
    { key: 'value', header: 'Value', align: 'right', hideOnMobile: true, render: (h) => <HoldingValue h={h} showDate /> },
    { key: 'status', header: 'Status', hideOnMobile: true, render: (h) => <StatusBadge {...STATUS_BADGE[h.status]} /> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      hideOnMobile: true,
      render: (h) => <HoldingRowActions holding={h} onEdit={(holding) => setDialog({ holding })} onAsk={setChange} onChanged={reload} />,
    },
  ];

  const statusWord = status === 'all' ? '' : `${STATUS_OPTIONS.find((o) => o.value === status)?.label.toLowerCase()} `;

  return (
    <AdminPage
      title="Portfolio Holdings"
      description="Retirement accounts, investments, precious metals, NFTs and DeFi positions recorded for clients (USD)"
      actions={<MDButton variant="gradient" color={accent} onClick={() => setDialog({ holding: null })}><Icon>add</Icon>&nbsp;Add holding</MDButton>}
    >
      {/* Phones: one compact card instead of six statistics cards. */}
      <Card sx={{ display: { xs: 'block', sm: 'none' } }}>
        {HOLDING_CATEGORIES.map((c, i) => {
          const meta = CATEGORY_META[c];
          const totals = summary?.[c];
          return (
            <MDBox
              key={c}
              component="button"
              type="button"
              onClick={() => pickCategory(c)}
              display="flex"
              alignItems="center"
              gap={1.5}
              width="100%"
              px={2}
              py={1.25}
              textAlign="left"
              sx={({ palette, functions: { rgba } }) => ({
                border: 0, borderTop: i ? `1px solid ${palette.divider}` : 0, font: 'inherit', color: 'inherit', cursor: 'pointer',
                background: category === c ? rgba(palette[meta.color].main, 0.12) : 'transparent',
              })}
            >
              <MDBox variant="gradient" bgColor={meta.color} borderRadius="md" width="2rem" height="2rem" display="flex" alignItems="center" justifyContent="center" color="white" flexShrink={0}>
                <Icon fontSize="small">{meta.icon}</Icon>
              </MDBox>
              <MDBox flex={1} minWidth={0} lineHeight={1.2}>
                <MDTypography variant="button" fontWeight="medium" display="block">{meta.label}</MDTypography>
                <MDTypography variant="caption" color="text">{totals?.count ?? 0} active</MDTypography>
              </MDBox>
              <MDTypography variant="button" fontWeight="bold" whiteSpace="nowrap">{summary ? fmtUsd(totals?.valueUsd ?? 0) : '…'}</MDTypography>
            </MDBox>
          );
        })}
      </Card>

      <Grid container spacing={3} sx={{ display: { xs: 'none', sm: 'flex' } }}>
        {HOLDING_CATEGORIES.map((c) => {
          const meta = CATEGORY_META[c];
          const totals = summary?.[c];
          return (
            <Grid item xs={12} sm={6} lg={4} xl={2} key={c}>
              <MDBox
                mb={1.5}
                role="button"
                tabIndex={0}
                aria-pressed={category === c}
                onClick={() => pickCategory(c)}
                onKeyDown={(e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pickCategory(c); } }}
                sx={({ palette }) => ({
                  cursor: 'pointer',
                  borderRadius: '0.75rem',
                  outline: category === c ? `2px solid ${palette[meta.color].main}` : 'none',
                  outlineOffset: 2,
                  '&:hover': { opacity: 0.92 },
                })}
              >
                <StatCard
                  loading={!summary}
                  color={meta.color}
                  icon={meta.icon}
                  title={meta.label}
                  value={fmtUsd(totals?.valueUsd ?? 0) ?? '$0.00'}
                  footnote={{ label: `${totals?.count ?? 0} active ${(totals?.count ?? 0) === 1 ? 'holding' : 'holdings'}`, color: 'secondary' }}
                />
              </MDBox>
            </Grid>
          );
        })}
      </Grid>

      <MDBox mt={6}>
        <DataTableCard
          title={category ? `${categoryLabel(category)} holdings` : 'Holdings'}
          subtitle={loadedOnce
            ? `${total} ${statusWord}${total === 1 ? 'holding' : 'holdings'} · ${fmtUsd(filteredValue)}${total > PAGE_SIZE ? ` · page ${page} of ${pages}` : ''}${summary && (category || search || status !== 'active') ? ` · all active: ${fmtUsd(activeTotal)} in ${activeCount}` : ''}`
            : 'Loading…'}
          columns={columns}
          rows={holdings}
          rowKey={(h) => h.id}
          rowHref={(h) => `/admin/users/${h.userId}`}
          isLoading={loading && !loadedOnce}
          isFetching={loading}
          error={error}
          onRetry={load}
          emptyMessage={search || category || status !== 'active' ? 'No holdings match these filters.' : 'No holdings recorded yet. Add one with "Add holding".'}
          toolbar={
            <>
              <SearchField value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Holding, institution, symbol or client…" width="min(320px, 100%)" />
              <SelectFilter label="Category" value={category} onChange={(v) => { setCategory(v); setPage(1); }} options={CATEGORY_OPTIONS} anyLabel="All categories" />
              <SelectFilter label="Status" value={status === 'all' ? '' : status} onChange={(v) => { setStatus(v || 'all'); setPage(1); }} options={STATUS_OPTIONS.filter((o) => o.value !== 'all')} anyLabel="Any status" width={150} />
              {(search || category || status !== 'active') && (
                <MDButton variant="text" color="dark" size="small" onClick={() => { setSearch(''); setCategory(''); setStatus('active'); setPage(1); }}>
                  <Icon>filter_alt_off</Icon>&nbsp;Clear
                </MDButton>
              )}
            </>
          }
          paging={pages > 1 ? {
            page,
            hasPrevious: page > 1,
            hasNext: page < pages,
            onPrevious: () => setPage((p) => Math.max(1, p - 1)),
            onNext: () => setPage((p) => Math.min(pages, p + 1)),
          } : undefined}
        />
      </MDBox>

      <HoldingDialog open={Boolean(dialog)} holding={dialog?.holding ?? null} onClose={() => setDialog(null)} onSaved={reload} />
      <HoldingStatusDialog change={change} onClose={() => setChange(null)} onChanged={reload} />
    </AdminPage>
  );
}
