class PaymentVerificationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'PaymentVerificationError';
    this.code = code;
  }
}

function xrpToDrops(value) {
  const normalized = String(value).trim();
  if (!/^\d+(\.\d{1,6})?$/.test(normalized)) {
    throw new Error('Configured XRP amount must have no more than 6 decimal places');
  }
  const [whole, fraction = ''] = normalized.split('.');
  return (BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'))).toString();
}

function transactionFields(result) {
  return result.tx_json || result;
}

async function verifyXrplPayment(transactionReference, quote) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  const checkedAt = new Date();
  try {
    const response = await fetch(process.env.XRPL_RPC_URL || 'https://s1.ripple.com:51234/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'tx',
        params: [{ transaction: transactionReference.toUpperCase(), binary: false, api_version: 2 }],
      }),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`XRPL service returned HTTP ${response.status}`);
    const payload = await response.json();
    const result = payload.result || {};
    if (result.error === 'txnNotFound') {
      return { state: 'pending_network', checkedAt, failureReason: 'Transaction is not yet available in a validated ledger.' };
    }
    if (result.error) throw new Error(result.error_message || result.error);
    if (!result.validated) {
      return { state: 'pending_network', checkedAt, failureReason: 'Transaction has not reached a validated ledger.' };
    }

    const transaction = transactionFields(result);
    const metadata = result.meta || {};
    if (transaction.TransactionType !== 'Payment') {
      throw new PaymentVerificationError('The transaction reference is not an XRP payment.', 'NOT_PAYMENT');
    }
    if (metadata.TransactionResult !== 'tesSUCCESS') {
      throw new PaymentVerificationError('The transaction did not complete successfully.', 'TRANSACTION_FAILED');
    }
    if (transaction.Destination !== quote.destinationAddress) {
      throw new PaymentVerificationError('The transaction destination does not match the official payment destination.', 'DESTINATION_MISMATCH');
    }
    if (quote.destinationTag != null && Number(transaction.DestinationTag) !== Number(quote.destinationTag)) {
      throw new PaymentVerificationError('The transaction destination tag does not match the payment instructions.', 'DESTINATION_TAG_MISMATCH');
    }

    const deliveredAmount = metadata.delivered_amount ?? metadata.DeliveredAmount ?? transaction.DeliverMax ?? transaction.Amount;
    if (typeof deliveredAmount !== 'string') {
      throw new PaymentVerificationError('The payment did not deliver XRP directly to the destination.', 'ASSET_MISMATCH');
    }
    if (deliveredAmount !== xrpToDrops(quote.assetAmount)) {
      throw new PaymentVerificationError('The delivered XRP amount does not match the active onboarding quote.', 'AMOUNT_MISMATCH');
    }

    return {
      state: 'verified',
      checkedAt,
      ledgerIndex: Number(result.ledger_index || transaction.ledger_index) || null,
      senderAddress: transaction.Account || null,
      deliveredAmount: quote.assetAmount,
      failureReason: null,
    };
  } catch (error) {
    if (error instanceof PaymentVerificationError) throw error;
    return {
      state: 'pending_network',
      checkedAt,
      failureReason: error.name === 'AbortError'
        ? 'The XRP Ledger verification request timed out.'
        : `Network verification is temporarily unavailable: ${error.message}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = { PaymentVerificationError, verifyXrplPayment, xrpToDrops };
