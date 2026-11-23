'use client';

/**
 * Live data for the client dashboard: prices that refresh while the page is on screen (and pause
 * while the tab is hidden), and a coin's price history from CoinGecko, the source the coin page's
 * chart uses.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { assetsAPI } from '@/lib/api';

/** CoinGecko ids for the coins the platform lists. */
export const COINGECKO_ID: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', DOGE: 'dogecoin', LTC: 'litecoin',
  XRP: 'ripple', XLM: 'stellar', USDT: 'tether', USDC: 'usd-coin',
  BNB: 'binancecoin', SOL: 'solana', ADA: 'cardano', HBAR: 'hedera-hashgraph',
  SHIB: 'shiba-inu', AVAX: 'avalanche-2', DOT: 'polkadot', MATIC: 'matic-network',
  LINK: 'chainlink', BCH: 'bitcoin-cash', TRX: 'tron', ATOM: 'cosmos', UNI: 'uniswap',
};

/** USD prices for the last `days` days (CoinGecko's market chart), oldest first; [] when unknown. */
export async function fetchPriceHistory(symbol: string, days: string | number): Promise<number[]> {
  const id = COINGECKO_ID[symbol.toUpperCase()];
  if (!id) return [];
  const res = await fetch(`https://api.coingecko.com/api/v3/coins/${id}/market_chart?vs_currency=usd&days=${days}`);
  const data = await res.json();
  return Array.isArray(data?.prices) ? data.prices.map(([, v]: [number, number]) => v) : [];
}

/** Runs `callback` every `ms` while the page is visible, and once when it comes back into view. */
export function useVisibleInterval(callback: () => void, ms: number, enabled = true) {
  const saved = useRef(callback);
  useEffect(() => { saved.current = callback; }, [callback]);

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!timer) timer = setInterval(() => saved.current(), ms); };
    const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
    const onVisibility = () => {
      if (document.hidden) stop();
      else { saved.current(); start(); }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => { stop(); document.removeEventListener('visibilitychange', onVisibility); };
  }, [ms, enabled]);
}

/** The platform's live prices and 24h changes, refreshed every `ms` while the page is visible. */
export function useLivePrices(ms = 30000) {
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [changes24h, setChanges24h] = useState<Record<string, number>>({});
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    assetsAPI.prices()
      .then((res) => {
        const next = res.data.prices || {};
        // Keep the last good prices if the server briefly has none.
        if (Object.keys(next).length) {
          setPrices(next);
          setChanges24h(res.data.changes24h || {});
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);
  useVisibleInterval(refresh, ms);

  return { prices, changes24h, loaded, refresh };
}
