'use client';

/**
 * The client's wider portfolio: holdings DWP's team records for them (retirement accounts,
 * investments, precious metals, NFTs, DeFi), read-only for the client, from GET /api/portfolio.
 * Shared by the dashboard home, the Portfolio page, the holding panel and the request flow:
 * the types, each category's name, icon and allocation colour, the request types a client can
 * send their advisor, the holdings table and the allocation bar.
 */
import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Briefcase, ChevronRight, Gem, Image as ImageIcon, Layers, PiggyBank, TrendingUp, Wallet, type LucideIcon,
} from 'lucide-react';
import api, { assetsAPI, usersAPI } from '@/lib/api';
import { cn } from '@/lib/utils';
import { getDisplayCurrency } from '@/lib/currency';
import { useAuth } from '@/context/AuthContext';
import { useBalancesChanged } from './actions';
import { useLivePrices } from './live';
import { Card, Money, TableHead, formatAmount } from './ui';

/* ─── Data ──────────────────────────────────────────────────────────────── */

export type HoldingCategory = 'retirement' | 'investment' | 'precious_metal' | 'nft' | 'defi' | 'other';

export interface Holding {
  id: string;
  category: HoldingCategory;
  type?: string | null;
  name: string;
  institution?: string | null;
  accountLast4?: string | null;
  symbol?: string | null;
  quantity?: number | null;
  unit?: string | null;
  valueUsd: number;
  costBasisUsd?: number | null;
  valuedAt?: string | null;
  notes?: string | null;
  status?: string;
}

export interface PortfolioData {
  holdings: Holding[];
  totalUsd: number;
  byCategory: Partial<Record<HoldingCategory, { valueUsd: number; count: number }>>;
}

export const portfolioAPI = {
  get: () => api.get<PortfolioData>('/portfolio'),
};

/** The client's holdings; reloads when an action reports that balances changed. */
export function usePortfolio() {
  const [data, setData] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    portfolioAPI.get()
      .then((res) => {
        setData({ holdings: res.data.holdings || [], totalUsd: res.data.totalUsd || 0, byCategory: res.data.byCategory || {} });
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);
  useBalancesChanged(load);
  return { data, loading, error, reload: load };
}

type DbAsset = { id: string; symbol: string };

/** Cash (US dollars) plus crypto at live prices: the Anchorage account's total, as on the home page. */
export function useCashAndCrypto() {
  const { user } = useAuth();
  const { prices, loaded: pricesLoaded } = useLivePrices(60000);
  const [stats, setStats] = useState<{ balance?: number; assetBalances?: Record<string, number> } | null>(null);
  const [assets, setAssets] = useState<DbAsset[] | null>(null);

  const load = useCallback(() => {
    usersAPI.getDashboardStats().then((res) => setStats(res.data)).catch(() => setStats({}));
  }, []);
  useEffect(() => {
    load();
    assetsAPI.list().then((res) => setAssets(res.data.assets || [])).catch(() => setAssets([]));
  }, [load]);
  useBalancesChanged(load);

  const hiddenAssets: string[] = user?.hiddenAssets || [];
  const crypto = (assets || [])
    .filter((a) => !hiddenAssets.includes(a.symbol.toUpperCase()))
    .reduce((sum, a) => sum + (stats?.assetBalances?.[a.id] || 0) * (prices[a.symbol.toUpperCase()] || 0), 0);
  const cash = stats?.balance || 0;
  return { cash, crypto, total: cash + crypto, loading: !stats || !assets || !pricesLoaded };
}

/** Whether balances are hidden on this device (the eye button on the home page). */
export const HIDE_KEY = 'dwp_hide_balances';

export function useHiddenBalances() {
  const [hidden, setHidden] = useState(true);
  useEffect(() => {
    try {
      // Read once on mount (localStorage isn't available while rendering on the server).
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHidden(localStorage.getItem(HIDE_KEY) !== '0');
    } catch { /* storage blocked: keep them hidden */ }
  }, []);
  const toggle = () => setHidden((value) => {
    try { localStorage.setItem(HIDE_KEY, value ? '0' : '1'); } catch {}
    return !value;
  });
  return [hidden, toggle] as const;
}

/* ─── Categories ────────────────────────────────────────────────────────── */

export interface CategoryMeta {
  label: string;
  /** The tab's name. */
  short: string;
  icon: LucideIcon;
  /** Allocation colour (validated categorical palette; stepped separately for dark). */
  swatch: string;
}

/** Fixed order: the allocation bar and the cards always run in this order. */
export const CATEGORY_ORDER: HoldingCategory[] = ['retirement', 'investment', 'precious_metal', 'nft', 'defi', 'other'];

export const CATEGORIES: Record<HoldingCategory, CategoryMeta> = {
  retirement: { label: 'Retirement accounts', short: 'Retirement', icon: PiggyBank, swatch: 'bg-[#eb6834] dark:bg-[#d95926]' },
  investment: { label: 'Investments', short: 'Investments', icon: TrendingUp, swatch: 'bg-[#1baf7a] dark:bg-[#199e70]' },
  precious_metal: { label: 'Precious metals', short: 'Precious metals', icon: Gem, swatch: 'bg-[#eda100] dark:bg-[#c98500]' },
  nft: { label: 'NFTs', short: 'NFTs', icon: ImageIcon, swatch: 'bg-[#e87ba4] dark:bg-[#d55181]' },
  defi: { label: 'DeFi', short: 'DeFi', icon: Layers, swatch: 'bg-[#008300] dark:bg-[#0ca30c]' },
  other: { label: 'Other holdings', short: 'Other', icon: Briefcase, swatch: 'bg-[#6250d6] dark:bg-[#9085e9]' },
};

/** The Anchorage account (cash and crypto) in the allocation bar: always the first slot. */
export const CASH_META = { label: 'Cash & crypto', icon: Wallet, swatch: 'bg-[#2a78d6] dark:bg-[#3987e5]' };

export const categoryOf = (value: string | undefined | null): HoldingCategory =>
  (CATEGORY_ORDER as string[]).includes(String(value)) ? (value as HoldingCategory) : 'other';

const TYPE_LABELS: Record<string, string> = {
  '401k': '401(k)', '403b': '403(b)', ira: 'IRA', traditional_ira: 'Traditional IRA', roth_ira: 'Roth IRA', sep_ira: 'SEP IRA',
  simple_ira: 'SIMPLE IRA', pension: 'Pension', brokerage: 'Brokerage account', stock: 'Stock', etf: 'ETF', fund: 'Fund',
  mutual_fund: 'Mutual fund', bond: 'Bond', gold: 'Gold', silver: 'Silver', platinum: 'Platinum', palladium: 'Palladium',
  nft: 'NFT', staking: 'Staking', lending: 'Lending', liquidity: 'Liquidity pool', yield: 'Yield', other: 'Other',
};

/** "401(k)", "Roth IRA", "ETF"…; unknown types are tidied ("money_market" → "Money market"). */
export function typeLabel(type?: string | null) {
  if (!type) return '';
  const key = type.toLowerCase();
  return TYPE_LABELS[key] || key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export const isRetirementAccount = (h: Pick<Holding, 'category'>) => h.category === 'retirement';

/** "Fidelity · ••4821" (or the type when there's no institution). */
export function holdingSubline(h: Holding) {
  return [h.institution || typeLabel(h.type), h.accountLast4 ? `••${h.accountLast4}` : ''].filter(Boolean).join(' · ');
}

/** "350 shares", "24 oz", "12.5 stETH"; null when the holding has no quantity. */
export function holdingQuantity(h: Holding) {
  if (h.quantity === null || h.quantity === undefined) return null;
  return formatAmount(Number(h.quantity), h.unit || h.symbol || undefined);
}

/** "Nov 24" this year, "Nov 24, 2025" before. */
export function shortDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export function longDate(value?: string | null) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

/** The holdings grouped by category, in the fixed order, with each group's total. */
export function groupHoldings(holdings: Holding[]) {
  return CATEGORY_ORDER
    .map((category) => {
      const rows = holdings.filter((h) => categoryOf(h.category) === category).sort((a, b) => b.valueUsd - a.valueUsd);
      return { category, rows, total: rows.reduce((sum, h) => sum + (h.valueUsd || 0), 0) };
    })
    .filter((group) => group.rows.length > 0);
}

/* ─── Requests ──────────────────────────────────────────────────────────── */

export type RequestField = 'institution' | 'accountType' | 'amount' | 'metalForm' | 'delivery' | 'asset' | 'details' | 'subject';

export interface RequestType {
  id: string;
  /** The tile's text. */
  label: string;
  /** One line under the tile. */
  hint?: string;
  /** Which group the tile sits in on the first step; hidden types are only opened from a holding. */
  group: HoldingCategory | null;
  /** The ticket's subject; may use the holding. */
  subject: (holding?: Holding | null) => string;
  fields: RequestField[];
  /** Field labels that differ from the defaults. */
  labels?: Partial<Record<RequestField, string>>;
  /** Short labels for the review screen and the ticket, where they differ from the defaults. */
  review?: Partial<Record<RequestField, string>>;
  placeholder?: string;
  /** The free-text message must be filled in. */
  messageRequired?: boolean;
}

const named = (h: Holding | null | undefined, fallback: string) => (h ? h.name : fallback);

export const REQUEST_TYPES: RequestType[] = [
  // Retirement
  {
    id: 'rollover', group: 'retirement', label: 'Roll over a 401(k) or IRA into a crypto IRA', hint: 'Move retirement savings into a self-directed crypto IRA',
    subject: (h) => h ? `Roll over my ${typeLabel(h.type) || 'account'}${h.institution ? ` at ${h.institution}` : ''} into a crypto IRA` : 'Roll over a 401(k) or IRA into a crypto IRA',
    fields: ['institution', 'accountType', 'amount'], labels: { institution: 'Where is it held?', amount: 'Approximate value (USD)' }, review: { amount: 'Approximate value' },
    placeholder: 'Anything your advisor should know, e.g. whether you have left that employer.',
  },
  {
    id: 'open_ira', group: 'retirement', label: 'Open a new IRA or Roth IRA', hint: 'A self-directed IRA that can hold crypto',
    subject: () => 'Open a new IRA or Roth IRA', fields: ['accountType', 'amount'], labels: { amount: 'First contribution (USD, optional)' }, review: { amount: 'First contribution' },
  },
  {
    id: 'add_retirement', group: 'retirement', label: 'Add an account I hold elsewhere', hint: 'Show a 401(k), IRA or pension in your portfolio',
    subject: () => 'Add a retirement account to my portfolio', fields: ['institution', 'accountType', 'amount'], labels: { institution: 'Where is it held?', amount: 'Approximate value (USD)' }, review: { amount: 'Approximate value' },
  },
  // Investments
  {
    id: 'add_brokerage', group: 'investment', label: 'Add a brokerage account', hint: 'Fidelity, Vanguard, Schwab…',
    subject: () => 'Add a brokerage account to my portfolio', fields: ['institution', 'amount'], labels: { institution: 'Brokerage', amount: 'Approximate value (USD)' }, review: { institution: 'Brokerage', amount: 'Approximate value' },
  },
  {
    id: 'invest', group: 'investment', label: 'Invest in stocks or funds', hint: 'Shares, ETFs and index funds',
    subject: () => 'Invest in stocks or funds', fields: ['asset', 'amount'], labels: { asset: 'What would you like to invest in?', amount: 'Amount to invest (USD)' }, review: { asset: 'Invest in', amount: 'Amount to invest' },
  },
  // Precious metals
  {
    id: 'buy_gold', group: 'precious_metal', label: 'Buy gold', hint: 'Bars or coins, stored for you or delivered',
    subject: () => 'Buy gold', fields: ['amount', 'metalForm', 'delivery'], labels: { amount: 'Amount to spend (USD)' }, review: { amount: 'Amount to spend' },
  },
  {
    id: 'buy_silver', group: 'precious_metal', label: 'Buy silver', hint: 'Bars or coins, stored for you or delivered',
    subject: () => 'Buy silver', fields: ['amount', 'metalForm', 'delivery'], labels: { amount: 'Amount to spend (USD)' }, review: { amount: 'Amount to spend' },
  },
  {
    id: 'bullion', group: 'precious_metal', label: 'Store or deliver bullion', hint: 'Vault storage, or delivery to you',
    subject: (h) => h ? `Arrange delivery or storage for ${h.name}` : 'Store or deliver bullion', fields: ['delivery', 'institution'], labels: { institution: 'Where is it now?' }, review: { institution: 'Currently at' },
  },
  // NFTs
  {
    id: 'add_nft', group: 'nft', label: 'Add NFTs to my portfolio', hint: 'Track NFTs you hold in your own wallet',
    subject: () => 'Add NFTs to my portfolio', fields: ['details', 'institution', 'amount'],
    labels: { details: 'Collection and token IDs', institution: 'Wallet address or marketplace', amount: 'Approximate value (USD, optional)' },
    review: { details: 'Collection and token IDs', institution: 'Wallet or marketplace', amount: 'Approximate value' },
  },
  // DeFi
  {
    id: 'defi_yield', group: 'defi', label: 'Earn yield with DeFi', hint: 'Staking, lending and liquidity, set up with your advisor',
    subject: () => 'Earn yield with DeFi', fields: ['asset', 'amount'], labels: { asset: 'Which asset? (e.g. ETH, USDC)', amount: 'Amount (USD)' }, review: { asset: 'Asset' },
  },
  {
    id: 'add_defi', group: 'defi', label: 'Add a DeFi position', hint: 'Show a position you hold elsewhere',
    subject: () => 'Add a DeFi position to my portfolio', fields: ['institution', 'details', 'amount'],
    labels: { institution: 'Protocol (e.g. Lido, Aave)', details: 'Position details', amount: 'Approximate value (USD)' },
    review: { institution: 'Protocol', details: 'Position', amount: 'Approximate value' },
  },
  // Other
  {
    id: 'other', group: 'other', label: 'Something else', hint: 'Any other question about your portfolio',
    subject: () => 'Portfolio request', fields: ['subject'], messageRequired: true,
  },
  // Opened from a holding only
  {
    id: 'buy_more', group: null, label: 'Buy more', subject: (h) => `Buy more ${named(h, 'precious metals')}`,
    fields: ['amount', 'delivery'], labels: { amount: 'Amount to spend (USD)' }, review: { amount: 'Amount to spend' },
  },
  {
    id: 'sell', group: null, label: 'Sell', subject: (h) => `Sell ${named(h, 'precious metals')}`,
    fields: ['details'], labels: { details: 'How much would you like to sell?' }, review: { details: 'Amount to sell' },
  },
  {
    id: 'ask', group: null, label: 'Ask a question', subject: (h) => `Question about ${named(h, 'my portfolio')}`,
    fields: [], messageRequired: true, placeholder: 'What would you like to know?',
  },
];

export const requestType = (id?: string | null) => REQUEST_TYPES.find((t) => t.id === id);

/** The requests a holding's panel offers. */
export function holdingRequests(h: Holding): { label: string; type: string }[] {
  const ask = (noun: string) => ({ label: `Ask about this ${noun}`, type: 'ask' });
  switch (categoryOf(h.category)) {
    case 'retirement': return [{ label: 'Roll over into a crypto IRA', type: 'rollover' }, ask('account')];
    case 'precious_metal': return [{ label: 'Buy more', type: 'buy_more' }, { label: 'Sell', type: 'sell' }, { label: 'Arrange delivery or storage', type: 'bullion' }];
    case 'investment': return [ask('investment')];
    case 'nft':
    case 'defi': return [ask('position')];
    default: return [ask('holding')];
  }
}

/** The "add one" request for an empty category tab. */
export const ADD_REQUEST: Record<HoldingCategory, string> = {
  retirement: 'add_retirement', investment: 'add_brokerage', precious_metal: 'buy_gold', nft: 'add_nft', defi: 'add_defi', other: 'other',
};

/* ─── Pieces ────────────────────────────────────────────────────────────── */

/** The category's icon in a soft circle. */
export function CategoryIcon({ category, size = 32, className }: { category: HoldingCategory; size?: number; className?: string }) {
  const Icon = CATEGORIES[categoryOf(category)].icon;
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-cd-raised text-cd-text', className)}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size * 0.5)} strokeWidth={1.6} />
    </span>
  );
}

const GRID = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[minmax(0,1.7fr)_1fr_1fr_0.8fr]';

/** Anchorage-style table of holdings: name over institution/account, value, quantity, valuation date. */
export function HoldingsTable({ rows, hidden = false, onRowClick }: { rows: Holding[]; hidden?: boolean; onRowClick?: (h: Holding) => void }) {
  const reduce = useReducedMotion();
  return (
    <div>
      <TableHead className={GRID}>
        <span>Holding</span>
        <span className="text-right">
          <span className="sm:hidden">Value</span>
          <span className="hidden sm:inline">Value ({getDisplayCurrency().code})</span>
        </span>
        <span className="hidden pl-4 sm:block">Quantity</span>
        <span className="hidden text-right sm:block">Valued</span>
      </TableHead>
      <ul>
        {rows.map((h, index) => {
          const quantity = holdingQuantity(h);
          const body = (
            <div className={GRID}>
              <div className="flex min-w-0 items-center gap-3.5">
                <CategoryIcon category={h.category} size={30} />
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-cd-text">{h.name}</p>
                  <p className="mt-0.5 truncate text-[12px] text-cd-muted">{holdingSubline(h)}</p>
                </div>
              </div>
              <div className="text-right">
                <Money value={h.valueUsd} hidden={hidden} className="text-[14px] text-cd-text" centsClassName="text-[1em]" />
                <p className="cd-num mt-0.5 truncate text-[12px] text-cd-muted sm:hidden">
                  {hidden && quantity ? '••••' : quantity || (h.valuedAt ? `Valued ${shortDate(h.valuedAt)}` : typeLabel(h.type))}
                </p>
              </div>
              <p className="cd-num hidden truncate pl-4 text-[14px] text-cd-text sm:block">
                {quantity ? (hidden ? '••••' : quantity) : <span className="text-cd-muted">{typeLabel(h.type) || '—'}</span>}
              </p>
              <p className="hidden text-right text-[13px] text-cd-muted sm:block">{h.valuedAt ? `Valued ${shortDate(h.valuedAt)}` : '—'}</p>
            </div>
          );
          const rowClass = 'block w-full border-b border-cd-line px-3 py-4 text-left sm:px-4';
          return (
            <motion.li
              key={h.id}
              className="[&:last-child>*]:border-b-0"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(index, 12) * 0.035, ease: 'easeOut' }}
            >
              {onRowClick ? (
                <button type="button" onClick={() => onRowClick(h)} className={cn(rowClass, 'cursor-pointer transition hover:bg-cd-raised/60 active:scale-[0.995]')}>{body}</button>
              ) : (
                <div className={rowClass}>{body}</div>
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}

/** One card per category: its name, the category total on the right, and the table. */
export function HoldingsCards({ holdings, hidden, onOpen }: { holdings: Holding[]; hidden: boolean; onOpen: (h: Holding) => void }) {
  return (
    <>
      {groupHoldings(holdings).map(({ category, rows, total }) => (
        <Card
          key={category}
          title={CATEGORIES[category].label}
          action={<Money value={total} hidden={hidden} className="text-[14px] text-cd-muted" centsClassName="text-[1em]" />}
        >
          <HoldingsTable rows={rows} hidden={hidden} onRowClick={onOpen} />
        </Card>
      ))}
    </>
  );
}

/** The quiet card for a client with no holdings yet. */
export function WiderPortfolioCard({ onRequest }: { onRequest: () => void }) {
  return (
    <Card>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cd-raised text-cd-muted">
          <Briefcase size={18} strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-medium text-cd-text">Your wider portfolio</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-cd-muted">
            Your advisor can add your retirement accounts (401(k), IRA, Roth IRA), investments, precious metals, NFTs and DeFi positions,
            so your whole wealth shows here in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={onRequest}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-[4px] border-[1.5px] border-cd-accent px-4 text-[14px] font-medium text-cd-accent-text transition hover:bg-cd-accent-soft active:scale-[0.98]"
        >
          Add an account or asset
          <ChevronRight size={16} strokeWidth={1.75} />
        </button>
      </div>
    </Card>
  );
}

/* ─── Allocation ────────────────────────────────────────────────────────── */

export interface AllocationSlice {
  key: string;
  label: string;
  valueUsd: number;
  swatch: string;
}

/** Cash & crypto first, then each category that has holdings, in the fixed order. */
export function allocationSlices(cashAndCrypto: number, byCategory: PortfolioData['byCategory']): AllocationSlice[] {
  return [
    { key: 'cash', label: CASH_META.label, valueUsd: cashAndCrypto, swatch: CASH_META.swatch },
    ...CATEGORY_ORDER.map((c) => ({ key: c, label: CATEGORIES[c].label, valueUsd: byCategory[c]?.valueUsd || 0, swatch: CATEGORIES[c].swatch })),
  ].filter((slice) => slice.valueUsd > 0);
}

const pct = (value: number, total: number) => (total > 0 ? (value / total) * 100 : 0);
const pctText = (value: number) => (value > 0 && value < 0.1 ? '<0.1%' : `${value.toFixed(1)}%`);

/** A stacked bar (2px gaps between segments) with a legend of amounts and shares. */
export function AllocationBar({ slices, hidden = false }: { slices: AllocationSlice[]; hidden?: boolean }) {
  const reduce = useReducedMotion();
  const total = slices.reduce((sum, s) => sum + s.valueUsd, 0);
  if (!total) return <div className="h-3 rounded-full bg-cd-raised" />;
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full" role="img" aria-label="Allocation by category">
        {slices.map((slice, i) => (
          <motion.span
            key={slice.key}
            title={`${slice.label}: ${pctText(pct(slice.valueUsd, total))}`}
            className={cn('h-full min-w-[3px]', slice.swatch, i === 0 && 'rounded-l-full', i === slices.length - 1 && 'rounded-r-full')}
            initial={reduce ? false : { flexGrow: 0 }}
            animate={{ flexGrow: slice.valueUsd }}
            style={{ flexBasis: 0 }}
            transition={{ duration: 0.7, delay: i * 0.05, ease: 'easeOut' }}
          />
        ))}
      </div>
      <ul className="mt-4 grid gap-x-8 gap-y-1 sm:grid-cols-2">
        {slices.map((slice) => (
          <li key={slice.key} className="flex items-center gap-2.5 py-2 text-[13.5px]">
            <span className={cn('h-2.5 w-2.5 shrink-0 rounded-[3px]', slice.swatch)} />
            <span className="min-w-0 flex-1 truncate text-cd-text">{slice.label}</span>
            <Money value={slice.valueUsd} hidden={hidden} className="text-cd-text" centsClassName="text-[1em]" />
            <span className="cd-num w-[52px] shrink-0 text-right text-cd-muted">{pctText(pct(slice.valueUsd, total))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
