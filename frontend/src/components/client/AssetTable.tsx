'use client';

/**
 * Anchorage's holdings table: a grey band of small uppercase column names, then one row per asset
 * with "SYMBOL | Name" over the network, the USD balance, the amount and the price. On a phone the
 * row folds to the name on the left and the USD balance over the amount on the right.
 */
import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { PriceTick } from './motion';
import { AssetIcon, AssetName, Change, Money, TableHead, formatAmount, formatPrice } from './ui';

export interface HoldingRow {
  symbol: string;
  name?: string;
  network?: string;
  /** Balance in USD. */
  usd: number;
  /** Balance in the asset's own units. */
  amount: number;
  price: number;
  change24h?: number;
  /** Shown as an "Available" line when part of the balance is locked (loans, earn). */
  available?: number;
  href?: string;
  /** A fixed glyph instead of the coin logo (e.g. "$" for US dollars). */
  glyph?: string;
}

const GRID = 'grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 sm:grid-cols-[minmax(0,1.7fr)_1fr_1fr_0.8fr]';

export default function AssetTable({ rows, hidden = false, unitLabel = true, onRowClick }: {
  rows: HoldingRow[];
  hidden?: boolean;
  unitLabel?: boolean;
  /** Makes each row a button (e.g. to open the asset's pop-up panel). Rows with an `href` stay links. */
  onRowClick?: (row: HoldingRow) => void;
}) {
  const reduce = useReducedMotion();
  return (
    <div>
      <TableHead className={GRID}>
        <span>Asset</span>
        <span className="text-right sm:text-right">
          <span className="sm:hidden">Balance</span>
          <span className="hidden sm:inline">Balance (USD)</span>
        </span>
        <span className="hidden pl-4 sm:block">Balance</span>
        <span className="hidden text-right sm:block">Price</span>
      </TableHead>

      <ul>
        {rows.map((row, index) => {
          const locked = row.available !== undefined && row.available < row.amount - 1e-9;
          const body = (
            <>
              <div className={GRID}>
                <div className="flex min-w-0 items-center gap-3.5">
                  {row.glyph ? (
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[20px] font-normal text-cd-text">{row.glyph}</span>
                  ) : (
                    <AssetIcon symbol={row.symbol} size={30} />
                  )}
                  <AssetName symbol={row.symbol} name={row.name} network={row.network} />
                </div>

                <div className="text-right">
                  {row.price > 0 || hidden ? (
                    <Money value={row.usd} hidden={hidden} className="text-[14px] text-cd-text" centsClassName="text-[1em]" />
                  ) : (
                    <span className="text-[14px] text-cd-faint" title="Price unavailable">—</span>
                  )}
                  <p className="cd-num mt-0.5 text-[12px] text-cd-muted sm:hidden">
                    {hidden ? '••••' : formatAmount(row.amount, unitLabel ? row.symbol : undefined)}
                  </p>
                </div>

                <p className="cd-num hidden truncate pl-4 text-[14px] text-cd-text sm:block">
                  {hidden ? '••••' : formatAmount(row.amount)}
                </p>

                <div className="hidden text-right sm:block">
                  <p className="cd-num text-[14px] text-cd-text"><PriceTick value={row.price} className="px-0.5">{formatPrice(row.price)}</PriceTick></p>
                  {row.change24h !== undefined && row.change24h !== 0 && <Change value={row.change24h} className="mt-0.5 text-[12px]" />}
                </div>
              </div>

              {locked && (
                <div className={cn(GRID, 'mt-2 text-[13px] text-cd-accent-text')}>
                  <span className="pl-[46px]">Available</span>
                  <Money value={(row.available || 0) * row.price} hidden={hidden} className="text-right" centsClassName="text-[1em]" />
                  <span className="cd-num hidden pl-4 sm:block">{hidden ? '••••' : formatAmount(row.available || 0)}</span>
                  <span className="hidden sm:block" />
                </div>
              )}
            </>
          );
          const rowClass = 'block w-full border-b border-cd-line px-3 py-4 text-left sm:px-4';
          const interactive = 'transition hover:bg-cd-raised/60 active:scale-[0.995]';
          return (
            <motion.li
              key={row.symbol}
              className="[&:last-child>*]:border-b-0"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: Math.min(index, 12) * 0.035, ease: 'easeOut' }}
            >
              {row.href && !onRowClick ? (
                <Link href={row.href} className={cn(rowClass, interactive)}>{body}</Link>
              ) : onRowClick ? (
                <button type="button" onClick={() => onRowClick(row)} className={cn(rowClass, interactive, 'cursor-pointer')}>{body}</button>
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
