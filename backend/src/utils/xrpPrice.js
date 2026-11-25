// Live XRP/USD price for the onboarding payment amount.
// Primary source is CoinGecko (the same source the dashboard assets use),
// with Coinbase as a backup. Results are cached so the public page cannot
// exhaust the free rate limits.

const CACHE_TTL_MS = 60 * 1000;
const STALE_MAX_MS = 30 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 5000;

const SOURCES = [
  {
    name: 'CoinGecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd',
    parse: (data) => Number(data?.ripple?.usd),
  },
  {
    name: 'Coinbase',
    url: 'https://api.coinbase.com/v2/prices/XRP-USD/spot',
    parse: (data) => Number(data?.data?.amount),
  },
];

let cache = null;
let inflight = null;

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshPrice() {
  for (const source of SOURCES) {
    try {
      const price = source.parse(await fetchJson(source.url));
      if (Number.isFinite(price) && price > 0) {
        cache = { priceUsd: price, source: source.name, fetchedAt: Date.now() };
        return cache;
      }
    } catch (error) {
      console.error(`XRP price lookup failed (${source.name}):`, error.message);
    }
  }
  return null;
}

async function getXrpUsdPrice() {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) return { ...cache, stale: false };
  if (!inflight) inflight = refreshPrice().finally(() => { inflight = null; });
  const fresh = await inflight;
  if (fresh) return { ...fresh, stale: false };
  if (cache && Date.now() - cache.fetchedAt < STALE_MAX_MS) return { ...cache, stale: true };
  return null;
}

const historyCache = new Map();

/** XRP/USD close to `date` (CoinGecko's price history, nearest point within ±3 hours); null if unknown. */
async function getXrpUsdPriceAt(date) {
  const at = new Date(date).getTime();
  if (!Number.isFinite(at)) return null;
  const hourKey = Math.floor(at / 3600000);
  if (historyCache.has(hourKey)) return historyCache.get(hourKey);
  const from = Math.floor(at / 1000) - 3 * 3600;
  const to = Math.floor(at / 1000) + 3 * 3600;
  try {
    const data = await fetchJson(`https://api.coingecko.com/api/v3/coins/ripple/market_chart/range?vs_currency=usd&from=${from}&to=${to}`);
    const points = Array.isArray(data?.prices) ? data.prices : [];
    let best = null;
    for (const [time, price] of points) {
      if (!(Number(price) > 0)) continue;
      if (!best || Math.abs(time - at) < Math.abs(best[0] - at)) best = [time, Number(price)];
    }
    const value = best ? best[1] : null;
    if (value) {
      historyCache.set(hourKey, value);
      if (historyCache.size > 500) historyCache.delete(historyCache.keys().next().value);
    }
    return value;
  } catch (error) {
    console.error('XRP price history lookup failed:', error.message);
    return null;
  }
}

function tolerancePercent() {
  const raw = (process.env.ONBOARDING_AMOUNT_TOLERANCE_PERCENT || '').trim();
  const value = raw === '' ? NaN : Number(raw);
  return Number.isFinite(value) && value >= 0 ? Math.min(value, 10) : 2;
}

// Builds the current payment quote: feeUsd converted to XRP at the live rate,
// rounded up to 2 decimals so the client never under-sends. Falls back to the
// admin-configured amount when no price is available.
async function getLiveQuote(config) {
  const feeUsd = Number(config.feeUsd);
  const price = await getXrpUsdPrice();
  if (price && feeUsd > 0) {
    return {
      live: true,
      stale: price.stale,
      assetAmount: (Math.ceil((feeUsd / price.priceUsd) * 100) / 100).toFixed(2),
      priceUsd: price.priceUsd,
      priceSource: price.source,
      quotedAt: new Date(price.fetchedAt),
      tolerancePercent: tolerancePercent(),
      feeUsd,
    };
  }
  return {
    live: false,
    stale: false,
    assetAmount: config.assetAmount,
    priceUsd: null,
    priceSource: null,
    quotedAt: null,
    tolerancePercent: tolerancePercent(),
    feeUsd,
  };
}

function resetPriceCache() {
  cache = null;
  inflight = null;
}

module.exports = { getXrpUsdPrice, getLiveQuote, resetPriceCache, getXrpUsdPriceAt };
