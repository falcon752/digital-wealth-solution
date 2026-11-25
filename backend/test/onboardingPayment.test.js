const test = require('node:test');
const assert = require('node:assert/strict');
const { PaymentVerificationError, verifyXrplPayment, xrpToDrops } = require('../src/utils/onboardingPayment');

const hash = 'A'.repeat(64);
const quote = {
  destinationAddress: 'rpR3Tor8XLZB71kmkWgtRrbHzJ8mdnHjTp',
  destinationTag: null,
  assetAmount: '758',
};

function mockFetch(result) {
  global.fetch = async () => ({ ok: true, json: async () => ({ result }) });
}

test.afterEach(() => {
  delete global.fetch;
});

test('converts XRP quote amounts to exact drops', () => {
  assert.equal(xrpToDrops('758'), '758000000');
  assert.equal(xrpToDrops('1.000001'), '1000001');
  assert.throws(() => xrpToDrops('1.0000001'));
});

test('accepts only a validated successful payment matching destination and amount', async () => {
  mockFetch({
    validated: true,
    ledger_index: 123,
    tx_json: {
      TransactionType: 'Payment',
      Account: 'rSenderAddress111111111111111111111',
      Destination: quote.destinationAddress,
      Amount: '758000000',
    },
    meta: { TransactionResult: 'tesSUCCESS', delivered_amount: '758000000' },
  });
  const result = await verifyXrplPayment(hash, quote);
  assert.equal(result.state, 'verified');
  assert.equal(result.ledgerIndex, 123);
  assert.equal(result.deliveredAmount, '758');
});

test('keeps missing and unvalidated transactions pending', async () => {
  mockFetch({ error: 'txnNotFound' });
  assert.equal((await verifyXrplPayment(hash, quote)).state, 'pending_network');

  mockFetch({ validated: false });
  assert.equal((await verifyXrplPayment(hash, quote)).state, 'pending_network');
});

test('rejects a transaction sent to a different destination', async () => {
  mockFetch({
    validated: true,
    tx_json: { TransactionType: 'Payment', Destination: 'rWrongDestination1111111111111111111', Amount: '758000000' },
    meta: { TransactionResult: 'tesSUCCESS', delivered_amount: '758000000' },
  });
  await assert.rejects(
    verifyXrplPayment(hash, quote),
    (error) => error instanceof PaymentVerificationError && error.code === 'DESTINATION_MISMATCH'
  );
});

function paymentOf(drops, extra = {}) {
  return {
    validated: true,
    ledger_index: 456,
    close_time_iso: '2026-11-24T10:00:00Z',
    tx_json: { TransactionType: 'Payment', Account: 'rSenderAddress111111111111111111111', Destination: quote.destinationAddress, Amount: drops },
    meta: { TransactionResult: 'tesSUCCESS', delivered_amount: drops },
    ...extra,
  };
}

test('sends a short payment to review with the exact shortfall instead of rejecting it', async () => {
  mockFetch(paymentOf('700000000'));
  const result = await verifyXrplPayment(hash, { ...quote, tolerancePercent: 2 });
  assert.equal(result.state, 'manual_review');
  assert.equal(result.deliveredAmount, '700');
  assert.equal(result.expectedAmount, '758');
  assert.equal(result.shortfallAmount, '58');
  assert.match(result.failureReason, /We received 700 XRP/);
});

test('accepts an overpayment and records the extra for reversal', async () => {
  mockFetch(paymentOf('800500000'));
  const result = await verifyXrplPayment(hash, { ...quote, tolerancePercent: 2 });
  assert.equal(result.state, 'verified');
  assert.equal(result.overpaidAmount, '42.5');
  assert.equal(result.shortfallAmount, null);
});

test('judges an older payment at the XRP price when it was made', async () => {
  // Fee $1,000. Now XRP is $1.3193 (758 XRP); when paid it was $1.50 (666.67 XRP). 667 XRP was enough then.
  mockFetch(paymentOf('667000000'));
  const result = await verifyXrplPayment(hash, { ...quote, feeUsd: 1000, tolerancePercent: 2 }, { priceAt: async () => 1.5 });
  assert.equal(result.state, 'verified');
  assert.equal(result.expectedAmount, '666.67');
  assert.equal(result.priceUsdAtPayment, 1.5);
  assert.equal(result.paidAt.toISOString(), '2026-11-24T10:00:00.000Z');
});

test('never uses a payment-time price that would ask the client for more', async () => {
  mockFetch(paymentOf('758000000'));
  const result = await verifyXrplPayment(hash, { ...quote, feeUsd: 1000, tolerancePercent: 2 }, { priceAt: async () => 1.0 });
  assert.equal(result.state, 'verified');
  assert.equal(result.expectedAmount, '758');
  assert.equal(result.priceUsdAtPayment, null);
});
