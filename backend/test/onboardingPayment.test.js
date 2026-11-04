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

test('rejects a transaction with the wrong delivered amount', async () => {
  mockFetch({
    validated: true,
    tx_json: { TransactionType: 'Payment', Destination: quote.destinationAddress, Amount: '757000000' },
    meta: { TransactionResult: 'tesSUCCESS', delivered_amount: '757000000' },
  });
  await assert.rejects(
    verifyXrplPayment(hash, quote),
    (error) => error instanceof PaymentVerificationError && error.code === 'AMOUNT_MISMATCH'
  );
});
