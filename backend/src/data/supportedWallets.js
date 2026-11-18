// Wallets and exchanges offered in the consultation form ("which do you use") and in the onboarding
// payment proof form ("which did you pay from"). Wallets are DWP's official list; the exchange list is
// provisional until DWP confirms one.

const OTHER = 'Other';
const NO_WALLET = "I don't use a wallet";
const NO_EXCHANGE = "I don't use an exchange";

// DWP's official list of supported onboarding wallets (confirmed 2026-11-18).
const supportedWallets = [
  "D'Cent Wallet",
  'Xaman Wallet',
  'Trezor Wallet',
  'Trust Wallet',
  'Exodus Wallet',
  'Ledger',
];

const supportedExchanges = [
  'Coinbase',
  'Binance',
  'Kraken',
  'Uphold',
  'Bitstamp',
  'Crypto.com',
];

// Valid answers to each consultation question
const walletChoices = [...supportedWallets, OTHER, NO_WALLET];
const exchangeChoices = [...supportedExchanges, OTHER, NO_EXCHANGE];

// Valid answers to "which wallet or exchange did you pay from"
const paymentSourceChoices = [...supportedWallets, ...supportedExchanges, OTHER];

// "Ledger, Other: Atomic" — readable form for emails and the admin view
function describeSelections(values, otherText) {
  if (!Array.isArray(values) || values.length === 0) return '';
  return values.map((value) => (value === OTHER && otherText ? `Other: ${otherText}` : value)).join(', ');
}

module.exports = {
  OTHER,
  NO_WALLET,
  NO_EXCHANGE,
  supportedWallets,
  supportedExchanges,
  walletChoices,
  exchangeChoices,
  paymentSourceChoices,
  describeSelections,
};
