const test = require('node:test');
const assert = require('node:assert/strict');
const { getLiveQuote, resetPriceCache } = require('../src/utils/xrpPrice');
const { PaymentVerificationError, verifyXrplPayment } = require('../src/utils/onboardingPayment');

const config = { feeUsd: 1000, assetAmount: '758' };

function jsonResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body };
}

test.beforeEach(() => {
  resetPriceCache();
  process.env.ONBOARDING_AMOUNT_TOLERANCE_PERCENT = '';
});

test.afterEach(() => {
  delete global.fetch;
});

test('converts the USD fee to XRP at the live price, rounded up to 2 decimals', async () => {
  global.fetch = async () => jsonResponse({ ripple: { usd: 1.32 } });
  const quote = await getLiveQuote(config);
  assert.equal(quote.live, true);
  assert.equal(quote.assetAmount, '757.58');
  assert.equal(quote.priceUsd, 1.32);
  assert.equal(quote.priceSource, 'CoinGecko');
  assert.equal(quote.tolerancePercent, 2);
});

test('falls back to Coinbase when CoinGecko fails', async () => {
  global.fetch = async (url) => (String(url).includes('coingecko')
    ? jsonResponse({}, false)
    : jsonResponse({ data: { amount: '2.00' } }));
  const quote = await getLiveQuote(config);
  assert.equal(quote.live, true);
  assert.equal(quote.priceSource, 'Coinbase');
  assert.equal(quote.assetAmount, '500.00');
});

test('uses the configured fallback amount when no price source works', async () => {
  global.fetch = async () => { throw new Error('offline'); };
  const quote = await getLiveQuote(config);
  assert.equal(quote.live, false);
  assert.equal(quote.assetAmount, '758');
  assert.equal(quote.priceUsd, null);
});

test('caches the price between calls', async () => {
  let calls = 0;
  global.fetch = async () => { calls += 1; return jsonResponse({ ripple: { usd: 1.5 } }); };
  await getLiveQuote(config);
  await getLiveQuote(config);
  assert.equal(calls, 1);
});

const hash = 'B'.repeat(64);
const destination = 'rpR3Tor8XLZB71kmkWgtRrbHzJ8mdnHjTp';

function mockPayment(drops) {
  global.fetch = async () => jsonResponse({
    result: {
      validated: true,
      ledger_index: 9,
      tx_json: { TransactionType: 'Payment', Account: 'rSender', Destination: destination, Amount: drops },
      meta: { TransactionResult: 'tesSUCCESS', delivered_amount: drops },
    },
  });
}

const quote = { destinationAddress: destination, destinationTag: null, assetAmount: '757.58', tolerancePercent: 2 };

test('accepts a payment within the tolerance and records the delivered amount', async () => {
  mockPayment('750000000');
  const result = await verifyXrplPayment(hash, quote);
  assert.equal(result.state, 'verified');
  assert.equal(result.deliveredAmount, '750');
});

test('rejects a payment outside the tolerance', async () => {
  mockPayment('700000000');
  await assert.rejects(() => verifyXrplPayment(hash, quote), (error) => {
    assert.ok(error instanceof PaymentVerificationError);
    assert.equal(error.code, 'AMOUNT_MISMATCH');
    return true;
  });
});

test('requires an exact amount when no tolerance is set', async () => {
  mockPayment('757000000');
  await assert.rejects(() => verifyXrplPayment(hash, { ...quote, tolerancePercent: 0 }), (error) => error.code === 'AMOUNT_MISMATCH');
});
