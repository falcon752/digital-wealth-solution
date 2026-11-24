'use client';

/**
 * Applies the client's display currency across the dashboard (see lib/currency.ts): loads the day's
 * rates, remembers the last ones on this device so the right currency shows from the first frame,
 * and re-renders the dashboard when the client picks another currency. Amounts typed into forms
 * (buy, withdraw, deposit values) stay in US dollars.
 */
import { createContext, Fragment, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { CURRENCIES, CURRENCY_CODES, isCurrencyCode, setDisplayCurrency, type CurrencyCode } from '@/lib/currency';
import { cn } from '@/lib/utils';

const RATES_KEY = 'dwp_fx_rates';

interface CurrencyContextValue {
  code: CurrencyCode;
  symbol: string;
  /** Currencies we have a rate for today. */
  available: CurrencyCode[];
  choose: (code: CurrencyCode) => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextValue>({ code: 'USD', symbol: '$', available: ['USD'], choose: async () => {} });

export function useCurrency() {
  return useContext(CurrencyContext);
}

function cachedRates(): Record<string, number> | null {
  try {
    const raw = localStorage.getItem(RATES_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { user, refreshUser } = useAuth();
  const preferred: CurrencyCode = isCurrencyCode(user?.displayCurrency) ? user.displayCurrency : 'USD';
  const [choice, setChoice] = useState<CurrencyCode>(preferred);
  const [rates, setRates] = useState<Record<string, number> | null>(null);
  const [ratesFailed, setRatesFailed] = useState(false);

  useEffect(() => setChoice(preferred), [preferred]);

  useEffect(() => {
    const cached = cachedRates();
    if (cached) setRates(cached);
    api.get('/assets/fx')
      .then((res) => {
        const next = res.data?.rates || { USD: 1 };
        setRates(next);
        try { localStorage.setItem(RATES_KEY, JSON.stringify(next)); } catch {}
      })
      .catch(() => setRatesFailed(true));
  }, []);

  // Back to US dollars when leaving the client dashboard.
  useEffect(() => () => setDisplayCurrency('USD', 1), []);

  const active: CurrencyCode = choice !== 'USD' && rates?.[choice] ? choice : 'USD';
  setDisplayCurrency(active, rates?.[active] || 1);

  const choose = useCallback(async (code: CurrencyCode) => {
    const previous = choice;
    setChoice(code);
    try {
      await api.put('/users/preferences', { displayCurrency: code });
      await refreshUser();
      toast.success(`Showing amounts in ${CURRENCIES[code].name}s (${CURRENCIES[code].symbol})`);
    } catch {
      setChoice(previous);
      toast.error('Could not save your currency. Please try again.');
    }
  }, [choice, refreshUser]);

  const value = useMemo<CurrencyContextValue>(() => ({
    code: active,
    symbol: CURRENCIES[active].symbol,
    available: CURRENCY_CODES.filter((code) => code === 'USD' || Boolean(rates?.[code])),
    choose,
  }), [active, rates, choose]);

  // Until today's rates arrive, wait (briefly) rather than flash dollars at someone who chose
  // pounds; if rates can't be loaded at all, show dollars.
  if (preferred !== 'USD' && !rates && !ratesFailed) return null;

  return (
    <CurrencyContext.Provider value={value}>
      {/* A new key re-renders every amount when the currency changes. */}
      <Fragment key={active}>{children}</Fragment>
    </CurrencyContext.Provider>
  );
}

/** Chips to choose the display currency (settings). */
export function CurrencyChips({ className }: { className?: string }) {
  const { code, available, choose } = useCurrency();
  return (
    <div className={cn('flex flex-wrap gap-2', className)} role="radiogroup" aria-label="Display currency">
      {CURRENCY_CODES.map((c) => {
        const info = CURRENCIES[c];
        const selected = c === code;
        const disabled = !available.includes(c);
        return (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => !selected && void choose(c)}
            title={disabled ? 'Exchange rate unavailable right now' : info.name}
            className={cn(
              'inline-flex h-10 min-w-[84px] items-center justify-center gap-1.5 rounded-md border px-3 text-[13.5px] transition-colors active:scale-[0.98] disabled:opacity-40',
              selected ? 'border-cd-accent bg-cd-accent-soft font-medium text-cd-accent-text' : 'border-cd-line text-cd-text hover:bg-cd-raised',
            )}
          >
            <span className="font-medium">{info.symbol}</span>
            <span className={selected ? '' : 'text-cd-muted'}>{c}</span>
          </button>
        );
      })}
    </div>
  );
}

/** A small "USD ▾" switch, e.g. next to the total balance. */
export function CurrencySelect({ className }: { className?: string }) {
  const { code, available, choose } = useCurrency();
  return (
    <label className={cn('relative inline-flex items-center', className)}>
      <span className="sr-only">Display currency</span>
      <select
        value={code}
        onChange={(e) => void choose(e.target.value as CurrencyCode)}
        className="cd-num h-7 cursor-pointer appearance-none rounded-full border border-cd-line bg-transparent pl-2.5 pr-6 text-[12px] font-medium text-cd-text hover:bg-cd-raised focus:border-cd-accent focus:outline-none"
      >
        {CURRENCY_CODES.map((c) => (
          <option key={c} value={c} disabled={!available.includes(c)}>{CURRENCIES[c].symbol} {c}</option>
        ))}
      </select>
      <ChevronDown size={13} className="pointer-events-none absolute right-2 text-cd-muted" />
    </label>
  );
}
