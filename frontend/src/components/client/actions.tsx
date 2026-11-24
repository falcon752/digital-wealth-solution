'use client';

/**
 * Opens the dashboard's actions (Deposit, Withdraw, Convert, Buy, Send) and detail panels (an asset,
 * a transaction) as a pop-up sheet over the current page, instead of moving to another page:
 *
 *   const { openAction } = useActions();
 *   <button onClick={() => openAction('deposit', { asset: 'BTC' })}>Deposit</button>
 *
 * Each flow lives in ./flows and also renders as a full page (variant 'page') for direct links.
 * Flows call `notifyBalancesChanged()` after a successful action so pages can reload their numbers.
 */
import dynamic from 'next/dynamic';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Sheet } from './Sheet';
import { Skeleton } from './ui';

export type ActionKind = 'deposit' | 'withdraw' | 'convert' | 'buy' | 'send' | 'asset' | 'transaction' | 'holding' | 'portfolio-request';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ActionParams = Record<string, any>;

export interface SheetHeader {
  title?: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  /** Show a back arrow (for the flow's own previous step). */
  onBack?: () => void;
  /** A pinned footer, e.g. the main button. */
  footer?: ReactNode;
  /** Let a tap on the dimmed page close the sheet (only for read-only panels). */
  dismissible?: boolean;
}

export interface FlowProps {
  variant: 'page' | 'sheet';
  params?: ActionParams;
  /** Sheet only: set the sheet's title, back arrow and footer for the current step. */
  setHeader: (header: SheetHeader) => void;
  /** Closes the sheet (on a page: goes back to the dashboard home). */
  close: () => void;
  /** Opens another action, e.g. from an asset panel's "Deposit" button. */
  openAction: (kind: ActionKind, params?: ActionParams) => void;
}

function Loading() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-10 w-2/3" />
    </div>
  );
}

const FLOWS: Record<ActionKind, ComponentType<FlowProps>> = {
  deposit: dynamic(() => import('./flows/DepositFlow'), { loading: Loading }),
  withdraw: dynamic(() => import('./flows/WithdrawFlow'), { loading: Loading }),
  convert: dynamic(() => import('./flows/ConvertFlow'), { loading: Loading }),
  buy: dynamic(() => import('./flows/BuyFlow'), { loading: Loading }),
  send: dynamic(() => import('./flows/SendFlow'), { loading: Loading }),
  asset: dynamic(() => import('./flows/AssetPanel'), { loading: Loading }),
  transaction: dynamic(() => import('./flows/TransactionPanel'), { loading: Loading }),
  holding: dynamic(() => import('./flows/HoldingPanel'), { loading: Loading }),
  'portfolio-request': dynamic(() => import('./flows/PortfolioRequestFlow'), { loading: Loading }),
};

const DEFAULT_TITLES: Record<ActionKind, string> = {
  deposit: 'Deposit', withdraw: 'Withdraw', convert: 'Convert', buy: 'Buy', send: 'Send', asset: 'Asset', transaction: 'Transaction',
  holding: 'Holding', 'portfolio-request': 'Portfolio request',
};

interface ActionsContextValue {
  openAction: (kind: ActionKind, params?: ActionParams) => void;
  closeAction: () => void;
  current: ActionKind | null;
}

const ActionsContext = createContext<ActionsContextValue>({ openAction: () => {}, closeAction: () => {}, current: null });

export function useActions() {
  return useContext(ActionsContext);
}

const BALANCES_EVENT = 'dwp:balances-changed';

/** Tells every page that balances may have changed (after a deposit, withdrawal, swap…). */
export function notifyBalancesChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(BALANCES_EVENT));
}

/** Runs `callback` whenever an action reports that balances changed. */
export function useBalancesChanged(callback: () => void) {
  useEffect(() => {
    window.addEventListener(BALANCES_EVENT, callback);
    return () => window.removeEventListener(BALANCES_EVENT, callback);
  }, [callback]);
}

export function ActionsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ kind: ActionKind; params?: ActionParams; key: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [header, setHeader] = useState<SheetHeader>({});

  const openAction = useCallback((kind: ActionKind, params?: ActionParams) => {
    setHeader({});
    setState({ kind, params, key: Date.now() });
    setOpen(true);
  }, []);
  const closeAction = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ openAction, closeAction, current: open ? state?.kind ?? null : null }), [openAction, closeAction, open, state]);
  const Flow = state ? FLOWS[state.kind] : null;

  return (
    <ActionsContext.Provider value={value}>
      {children}
      <Sheet
        open={open}
        onClose={closeAction}
        title={header.title ?? (state ? DEFAULT_TITLES[state.kind] : undefined)}
        subtitle={header.subtitle}
        icon={header.icon}
        onBack={header.onBack}
        footer={header.footer}
        dismissible={header.dismissible}
      >
        {Flow && state && (
          <Flow key={state.key} variant="sheet" params={state.params} setHeader={setHeader} close={closeAction} openAction={openAction} />
        )}
      </Sheet>
    </ActionsContext.Provider>
  );
}
