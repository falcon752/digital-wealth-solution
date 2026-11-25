const { getXrpUsdPriceAt } = require('./xrpPrice');

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

function dropsToXrp(drops) {
  const value = BigInt(drops);
  const whole = value / 1000000n;
  const fraction = (value % 1000000n).toString().padStart(6, '0').replace(/0+$/, '');
  return fraction ? `${whole}.${fraction}` : `${whole}`;
}

function transactionFields(result) {
  return result.tx_json || result;
}

// Payments older than this are judged against the XRP price at the time they were made too.
const PRICE_MOVE_WINDOW_MS = 10 * 60 * 1000;

/** When the transaction reached a validated ledger (XRPL dates count seconds from 2000-01-01). */
function ledgerTime(result, transaction) {
  if (result.close_time_iso) {
    const iso = new Date(result.close_time_iso);
    if (!Number.isNaN(iso.getTime())) return iso;
  }
  const seconds = Number(result.date ?? transaction.date);
  return Number.isFinite(seconds) && seconds > 0 ? new Date((seconds + 946684800) * 1000) : null;
}

/**
 * Checks an XRP payment on the ledger against the onboarding quote ({ destinationAddress,
 * destinationTag, assetAmount, tolerancePercent, feeUsd }). Wrong destination, failed or non-XRP
 * transactions are refused; a short amount goes to review; anything at or above the fee passes.
 * options.priceAt(date) → XRP/USD at that time (for tests).
 */
async function verifyXrplPayment(transactionReference, quote, options = {}) {
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
    if (!/^\d+$/.test(deliveredAmount)) {
      throw new PaymentVerificationError('The payment did not deliver XRP directly to the destination.', 'ASSET_MISMATCH');
    }
    const deliveredDrops = BigInt(deliveredAmount);
    const toleranceBps = BigInt(Math.round(Math.min(Math.max(Number(quote.tolerancePercent) || 0, 0), 10) * 100));
    const paidAt = ledgerTime(result, transaction);

    // What the fee came to in XRP. The quote shown when the client submits can differ from the one
    // they paid against if XRP moved in between, so the fee at the price when the payment reached
    // the ledger is also worked out, and the lower of the two (the kinder to the client) is used.
    let expectedDrops = BigInt(xrpToDrops(quote.assetAmount));
    let priceUsdAtPayment = null;
    if (Number(quote.feeUsd) > 0 && paidAt && Date.now() - paidAt.getTime() > PRICE_MOVE_WINDOW_MS) {
      const atPayment = await (options.priceAt || getXrpUsdPriceAt)(paidAt).catch(() => null);
      if (atPayment && atPayment > 0) {
        const thenDrops = BigInt(xrpToDrops((Math.ceil((Number(quote.feeUsd) / atPayment) * 100) / 100).toFixed(2)));
        if (thenDrops < expectedDrops) {
          expectedDrops = thenDrops;
          priceUsdAtPayment = atPayment;
        }
      }
    }
    const minDrops = (expectedDrops * (10000n - toleranceBps)) / 10000n;

    const base = {
      checkedAt,
      ledgerIndex: Number(result.ledger_index || transaction.ledger_index) || null,
      senderAddress: transaction.Account || null,
      deliveredAmount: dropsToXrp(deliveredDrops),
      expectedAmount: dropsToXrp(expectedDrops),
      paidAt,
      priceUsdAtPayment,
    };

    // Short: a real, validated payment, so it isn't turned away. An administrator reviews it with
    // the exact figures (and can accept it, or ask for the rest).
    if (deliveredDrops < minDrops) {
      const short = expectedDrops - deliveredDrops;
      return {
        ...base,
        state: 'manual_review',
        shortfallAmount: dropsToXrp(short),
        overpaidAmount: null,
        failureReason: `We received ${dropsToXrp(deliveredDrops)} XRP; the fee needed at least ${dropsToXrp(minDrops)} XRP when you paid (${dropsToXrp(short)} XRP short). Our team will review it.`,
      };
    }

    // Enough, or more: accepted. Anything above the fee is recorded so an administrator can return
    // it with "Reverse overpayment".
    const over = deliveredDrops - expectedDrops;
    return {
      ...base,
      state: 'verified',
      overpaidAmount: over > 0n ? dropsToXrp(over) : null,
      shortfallAmount: null,
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

module.exports = { PaymentVerificationError, verifyXrplPayment, xrpToDrops, dropsToXrp, ledgerTime };
