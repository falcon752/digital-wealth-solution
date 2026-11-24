'use client';

/**
 * The "Portfolio holdings" section of /admin/users/<id>: the client's retirement accounts,
 * investments, precious metals, NFTs and DeFi positions, with the active total and a per-category
 * summary, and Add / Edit / Close / Remove. Reports the active total so the page can add it to the
 * client's total balance.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import Chip from '@mui/material/Chip';
import MDBox from '@/components/admin/components/MDBox';
import MDButton from '@/components/admin/components/MDButton';
import MDTypography from '@/components/admin/components/MDTypography';
import { RelatedTable, fmtDate, fmtUsd, type RelatedColumn } from '@/components/admin/detail/Record';
import Icon from '@/components/admin/ui/Icon';
import StatusBadge from '@/components/admin/ui/StatusBadge';
import { useAccent } from '@/components/admin/ui/useAccent';
import { errorMessage } from '@/components/admin/lib/errors';
import HoldingDialog, { type HoldingClient } from './HoldingDialog';
import { HoldingRowActions, HoldingStatusDialog, type StatusChange } from './HoldingActions';
import {
  adminHoldingsAPI, CATEGORY_META, HOLDING_CATEGORIES, STATUS_BADGE, categoryLabel, fmtQuantity, typeLabel, type Holding,
} from './api';

const ORDER = { active: 0, closed: 1, removed: 2 } as const;

/** The value with the gain or loss against the cost basis under it. */
export function HoldingValue({ h, showDate = false }: { h: Pick<Holding, 'valueUsd' | 'costBasisUsd' | 'valuedAt'>; showDate?: boolean }) {
  const gain = h.costBasisUsd ? h.valueUsd - h.costBasisUsd : null;
  return (
    <MDBox lineHeight={1.2} textAlign="right">
      <MDTypography variant="button" fontWeight="bold" display="block" whiteSpace="nowrap">{fmtUsd(h.valueUsd)}</MDTypography>
      {gain !== null && (
        <MDTypography variant="caption" color={gain >= 0 ? 'success' : 'error'} whiteSpace="nowrap" title={`Cost basis ${fmtUsd(h.costBasisUsd)}`}>
          {gain >= 0 ? '+' : '−'}{fmtUsd(Math.abs(gain))} ({gain >= 0 ? '+' : '−'}{Math.abs((gain / (h.costBasisUsd as number)) * 100).toFixed(1)}%)
        </MDTypography>
      )}
      {showDate && h.valuedAt && <MDTypography variant="caption" color="text" display="block" whiteSpace="nowrap">on {fmtDate(h.valuedAt)}</MDTypography>}
    </MDBox>
  );
}

/** "Fidelity · ••••4821 · 401(k)" */
export const holdingSubline = (h: Holding) =>
  [h.institution, h.accountLast4 ? `••••${h.accountLast4}` : null, typeLabel(h.type) || null].filter(Boolean).join(' · ');

export default function ClientHoldings({ client, canAdd = true, onTotal }: {
  client: HoldingClient;
  canAdd?: boolean;
  onTotal?: (totalUsd: number) => void;
}) {
  const accent = useAccent();
  const [holdings, setHoldings] = useState<Holding[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);
  const [dialog, setDialog] = useState<{ holding: Holding | null } | null>(null);
  const [change, setChange] = useState<StatusChange | null>(null);

  const load = useCallback(() => {
    adminHoldingsAPI.list({ userId: client.id, status: 'all', limit: 100 })
      .then((res) => { setHoldings(res.data.holdings); setError(null); })
      .catch((err) => setError(errorMessage(err, 'Could not load the holdings.')));
  }, [client.id]);
  useEffect(load, [load]);

  const summary = useMemo(() => {
    const active = (holdings ?? []).filter((h) => h.status === 'active');
    const byCategory = HOLDING_CATEGORIES
      .map((c) => ({ c, items: active.filter((h) => h.category === c) }))
      .filter((x) => x.items.length)
      .map(({ c, items }) => ({ c, count: items.length, value: items.reduce((s, h) => s + h.valueUsd, 0) }));
    return {
      total: active.reduce((s, h) => s + h.valueUsd, 0),
      active: active.length,
      removed: (holdings ?? []).filter((h) => h.status === 'removed').length,
      byCategory,
    };
  }, [holdings]);

  useEffect(() => { if (holdings) onTotal?.(summary.total); }, [holdings, summary.total, onTotal]);

  const rows = (holdings ?? [])
    .filter((h) => showRemoved || h.status !== 'removed')
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.category.localeCompare(b.category) || b.valueUsd - a.valueUsd);

  const columns: RelatedColumn<Holding>[] = [
    {
      label: 'Holding',
      render: (h) => (
        <MDBox lineHeight={1.2} maxWidth={300} sx={{ opacity: h.status === 'active' ? 1 : 0.6 }}>
          <MDTypography variant="button" fontWeight="medium" display="block">
            {h.name}{h.symbol ? <MDTypography component="span" variant="caption" color="text"> · {h.symbol}</MDTypography> : null}
          </MDTypography>
          {holdingSubline(h) && <MDTypography variant="caption" color="text" display="block">{holdingSubline(h)}</MDTypography>}
          {/* Phones: category and status, since those columns are hidden. */}
          <MDBox display={{ xs: 'flex', sm: 'none' }} gap={0.75} mt={0.5} alignItems="center" flexWrap="wrap">
            <MDTypography variant="caption" color="text">{categoryLabel(h.category)}</MDTypography>
            {h.status !== 'active' && <StatusBadge {...STATUS_BADGE[h.status]} />}
            <HoldingRowActions holding={h} onEdit={(holding) => setDialog({ holding })} onAsk={setChange} onChanged={load} />
          </MDBox>
        </MDBox>
      ),
    },
    { label: 'Category', hideOnMobile: true, render: (h) => <MDBox component="span" whiteSpace="nowrap">{categoryLabel(h.category)}</MDBox> },
    { label: 'Quantity', hideOnMobile: true, align: 'right', render: (h) => <MDBox component="span" whiteSpace="nowrap">{fmtQuantity(h) ?? '—'}</MDBox> },
    { label: 'Value', align: 'right', render: (h) => <HoldingValue h={h} /> },
    { label: 'Valued on', hideOnMobile: true, render: (h) => <MDBox component="span" whiteSpace="nowrap">{fmtDate(h.valuedAt) ?? '—'}</MDBox> },
    { label: 'Status', hideOnMobile: true, render: (h) => <StatusBadge {...STATUS_BADGE[h.status]} /> },
    {
      label: ' ',
      align: 'right',
      hideOnMobile: true,
      render: (h) => <HoldingRowActions holding={h} onEdit={(holding) => setDialog({ holding })} onAsk={setChange} onChanged={load} />,
    },
  ];

  const description = error ? error : !holdings ? 'Loading…' : (
    <MDBox>
      <MDBox component="span">
        {summary.active
          ? <>Active total <strong>{fmtUsd(summary.total)}</strong> across {summary.active} {summary.active === 1 ? 'holding' : 'holdings'}. Shown read-only on the client&apos;s dashboard.</>
          : 'Retirement accounts, investments, precious metals, NFTs and DeFi positions DWP records for this client.'}
      </MDBox>
      {summary.byCategory.length > 0 && (
        <MDBox display="flex" gap={0.75} flexWrap="wrap" mt={1}>
          {summary.byCategory.map(({ c, count, value }) => (
            <Chip
              key={c}
              size="small"
              variant="outlined"
              icon={<Icon sx={{ fontSize: '1rem !important', ml: '6px !important' }}>{CATEGORY_META[c].icon}</Icon>}
              label={`${CATEGORY_META[c].label} ${fmtUsd(value)}${count > 1 ? ` · ${count}` : ''}`}
              sx={{ fontSize: '0.72rem', height: 24 }}
            />
          ))}
        </MDBox>
      )}
    </MDBox>
  );

  return (
    <>
      <RelatedTable
        title="Portfolio holdings"
        description={description}
        rows={rows}
        columns={columns}
        getKey={(h) => h.id}
        empty={holdings ? (summary.removed ? 'No active or closed holdings.' : 'No holdings recorded yet.') : 'Loading…'}
        action={
          <MDBox display="flex" gap={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
            {summary.removed > 0 && (
              <MDButton variant="text" color="dark" size="small" onClick={() => setShowRemoved((v) => !v)} sx={{ whiteSpace: 'nowrap' }}>
                {showRemoved ? 'Hide removed' : `Show removed (${summary.removed})`}
              </MDButton>
            )}
            {canAdd && (
              <MDButton variant="outlined" color={accent} size="small" onClick={() => setDialog({ holding: null })} sx={{ whiteSpace: 'nowrap' }}>
                <Icon>add</Icon>&nbsp;Add holding
              </MDButton>
            )}
          </MDBox>
        }
      />
      <HoldingDialog open={Boolean(dialog)} holding={dialog?.holding ?? null} client={client} onClose={() => setDialog(null)} onSaved={load} />
      <HoldingStatusDialog change={change} onClose={() => setChange(null)} onChanged={load} />
    </>
  );
}
