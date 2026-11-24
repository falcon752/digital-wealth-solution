/**
 * The client dashboard's display currency. Amounts are stored and calculated in US dollars; the
 * dashboard shows them in the currency the client picked (USD, GBP, EUR, JPY or CNY) at the day's
 * rate. CurrencyProvider (components/client/currency.tsx) sets the current choice; outside the
 * client dashboard (admin, public site, emails) it stays US dollars.
 */
export type CurrencyCode = 'USD' | 'GBP' | 'EUR' | 'JPY' | 'CNY';

export const CURRENCIES: Record<CurrencyCode, { code: CurrencyCode; symbol: string; name: string; decimals: number }> = {
  USD: { code: 'USD', symbol: '$', name: 'US dollar', decimals: 2 },
  GBP: { code: 'GBP', symbol: '£', name: 'British pound', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', decimals: 2 },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese yen', decimals: 0 },
  CNY: { code: 'CNY', symbol: 'CN¥', name: 'Chinese yuan', decimals: 2 },
};

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export const isCurrencyCode = (value: unknown): value is CurrencyCode => typeof value === 'string' && value in CURRENCIES;

let display: { code: CurrencyCode; rate: number } = { code: 'USD', rate: 1 };

/** Sets what the dashboard shows money in. `rate` = units of that currency per US dollar. */
export function setDisplayCurrency(code: CurrencyCode, rate: number) {
  display = code !== 'USD' && rate > 0 ? { code, rate } : { code: 'USD', rate: 1 };
}

export function getDisplayCurrency() {
  return { ...display, ...CURRENCIES[display.code] };
}

/** A US-dollar amount in the display currency. */
export function convertUsd(usd: number) {
  return usd * display.rate;
}

/**
 * A US-dollar amount written in the display currency, e.g. "£1,234.56", "¥196,720".
 * `decimals` overrides the currency's usual places (e.g. more for small prices).
 */
export function formatMoney(usd: number, options: { decimals?: number; minDecimals?: number } = {}) {
  const { code, decimals } = getDisplayCurrency();
  const max = options.decimals ?? decimals;
  const min = Math.min(options.minDecimals ?? max, max);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    currencyDisplay: 'symbol',
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  }).format(convertUsd(Number(usd) || 0));
}
