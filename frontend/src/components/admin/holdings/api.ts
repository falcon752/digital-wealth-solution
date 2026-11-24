/**
 * Portfolio holdings, the admin side (/api/portfolio/admin): a client's wider wealth that DWP's
 * team records (retirement accounts, investments, precious metals, NFTs, DeFi positions). The
 * client sees active holdings read-only; "closed" and "removed" ones are hidden from them and from
 * totals, and nothing is deleted. Amounts are USD.
 */
import api from '@/lib/api';

export const HOLDING_CATEGORIES = ['retirement', 'investment', 'precious_metal', 'nft', 'defi', 'other'] as const;
export type HoldingCategory = (typeof HOLDING_CATEGORIES)[number];
export type HoldingStatus = 'active' | 'closed' | 'removed';

export interface Holding {
  id: string;
  userId: string;
  client?: { id: string; name: string; email: string } | null;
  category: HoldingCategory;
  type: string | null;
  name: string;
  institution: string | null;
  accountLast4: string | null;
  symbol: string | null;
  quantity: number | null;
  unit: string | null;
  valueUsd: number;
  costBasisUsd: number | null;
  valuedAt: string | null;
  notes: string | null;
  adminNote: string | null;
  status: HoldingStatus;
  createdAt: string;
  updatedAt: string;
}

export type CategoryTotals = Partial<Record<HoldingCategory, { valueUsd: number; count: number }>>;

export interface HoldingInput {
  userId?: string;
  category: HoldingCategory | '';
  type: string;
  name: string;
  institution: string;
  accountLast4: string;
  symbol: string;
  quantity: string;
  unit: string;
  valueUsd: string;
  costBasisUsd: string;
  valuedAt: string;
  notes: string;
  adminNote: string;
}

export interface HoldingQuery {
  userId?: string;
  category?: string;
  /** active | closed | removed; anything else (e.g. 'all') lists every status. */
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

const clean = <T extends object>(params: T) =>
  Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== '' && v !== null));

export const adminHoldingsAPI = {
  list: (params: HoldingQuery = {}) =>
    api.get<{ holdings: Holding[]; total: number; page: number; limit: number; byCategory: CategoryTotals }>('/portfolio/admin', { params: clean(params) }),
  create: (data: HoldingInput) => api.post<{ holding: Holding }>('/portfolio/admin', data),
  update: (id: string, data: Partial<HoldingInput>) => api.put<{ holding: Holding }>(`/portfolio/admin/${id}`, data),
  setStatus: (id: string, status: HoldingStatus) => api.put<{ holding: Holding }>(`/portfolio/admin/${id}/status`, { status }),
};

/* ─── Labels ──────────────────────────────────────────────────────────────── */

export const CATEGORY_META: Record<HoldingCategory, { label: string; icon: string; color: 'info' | 'success' | 'warning' | 'primary' | 'error' | 'dark' }> = {
  retirement: { label: 'Retirement', icon: 'umbrella', color: 'info' },
  investment: { label: 'Investments', icon: 'trending_up', color: 'success' },
  precious_metal: { label: 'Precious metals', icon: 'workspace_premium', color: 'warning' },
  nft: { label: 'NFTs', icon: 'image', color: 'primary' },
  defi: { label: 'DeFi', icon: 'hub', color: 'error' },
  other: { label: 'Other', icon: 'category', color: 'dark' },
};

export const CATEGORY_OPTIONS = HOLDING_CATEGORIES.map((value) => ({ value, label: CATEGORY_META[value].label }));
export const categoryLabel = (value: string) => CATEGORY_META[value as HoldingCategory]?.label ?? value;

/** Suggested types per category (free text is allowed too). */
export const TYPE_SUGGESTIONS: Record<HoldingCategory, string[]> = {
  retirement: ['401k', '403b', 'ira', 'roth_ira', 'sep_ira', 'rollover_ira'],
  investment: ['brokerage', 'stock', 'etf', 'fund', 'bond'],
  precious_metal: ['gold', 'silver', 'platinum', 'palladium'],
  nft: ['nft'],
  defi: ['staking', 'lending', 'liquidity', 'yield'],
  other: ['other'],
};

const TYPE_LABELS: Record<string, string> = {
  '401k': '401(k)', '403b': '403(b)', ira: 'IRA', roth_ira: 'Roth IRA', sep_ira: 'SEP IRA', rollover_ira: 'Rollover IRA',
  brokerage: 'Brokerage account', stock: 'Stock', etf: 'ETF', fund: 'Fund', bond: 'Bond',
  gold: 'Gold', silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium',
  nft: 'NFT', staking: 'Staking', lending: 'Lending', liquidity: 'Liquidity pool', yield: 'Yield farming', other: 'Other',
};

export const typeLabel = (value?: string | null) => (value ? TYPE_LABELS[value] ?? value : '');

/** What the admin typed in the type box → the stored type ("Roth IRA" → roth_ira; anything else as typed). */
export function typeFromText(text: string) {
  const trimmed = text.trim();
  const known = Object.entries(TYPE_LABELS).find(([code, label]) => label.toLowerCase() === trimmed.toLowerCase() || code === trimmed.toLowerCase());
  return known ? known[0] : trimmed;
}

/** Suggested units per category. */
export const UNIT_SUGGESTIONS: Record<HoldingCategory, string[]> = {
  retirement: ['shares', 'units'],
  investment: ['shares', 'units'],
  precious_metal: ['oz', 'g', 'kg', 'bars', 'coins'],
  nft: ['items'],
  defi: ['tokens', 'LP tokens'],
  other: ['units'],
};

/** Status words StatusBadge colours: active → green, closed → grey, removed → red. */
export const STATUS_BADGE: Record<HoldingStatus, { status: string; label: string }> = {
  active: { status: 'active', label: 'Active' },
  closed: { status: 'closed', label: 'Closed' },
  removed: { status: 'rejected', label: 'Removed' },
};

export const fmtQuantity = (h: Pick<Holding, 'quantity' | 'unit' | 'symbol'>) => {
  if (h.quantity === null || h.quantity === undefined) return null;
  const n = h.quantity.toLocaleString('en-US', { maximumFractionDigits: 8 });
  return [n, h.unit || h.symbol].filter(Boolean).join(' ');
};
