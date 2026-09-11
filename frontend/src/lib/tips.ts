export interface AppTip {
  icon: 'shield' | 'trending-up' | 'gift' | 'lock' | 'bell' | 'sparkles';
  title: string;
  message: string;
}

// Shown at random (one per login session) alongside the welcome message.
export const APP_TIPS: AppTip[] = [
  { icon: 'shield', title: 'Secure your account', message: 'Enable two-factor authentication under Settings > Security to keep your funds safe.' },
  { icon: 'trending-up', title: 'Diversify your portfolio', message: 'Spreading your holdings across multiple assets can help manage risk.' },
  { icon: 'gift', title: 'Refer a friend', message: 'Share your referral link from the dashboard and earn rewards when they join.' },
  { icon: 'lock', title: 'Never share your keys', message: 'Digital Wealth Partners will never ask for your private keys or wallet seed phrase.' },
  { icon: 'bell', title: 'Stay in the loop', message: "Turn on notifications so you never miss a deposit, withdrawal, or loan update." },
  { icon: 'sparkles', title: 'Explore Crypto Lending', message: 'Borrow against your crypto or earn competitive yields from the Lending tab.' },
  { icon: 'trending-up', title: 'Track live prices', message: 'Keep an eye on real-time market prices from the Assets tab.' },
  { icon: 'shield', title: 'Verify withdrawal addresses', message: 'Always double-check wallet addresses before confirming a withdrawal.' },
  { icon: 'sparkles', title: 'Set up your LLC', message: 'Form and manage a Wyoming LLC for your holdings right from the LLC tab.' },
  { icon: 'trending-up', title: 'Try Crypto Cards', message: 'Spend your crypto anywhere with a Digital Wealth Partners card.' },
  { icon: 'bell', title: 'Check your activity log', message: 'Review recent account activity anytime from Settings > Security.' },
  { icon: 'lock', title: 'Use a strong password', message: 'Use a unique, strong password for your account and update it periodically.' },
  { icon: 'gift', title: 'Complete your profile', message: 'A complete profile helps our team assist you faster if you ever need support.' },
  { icon: 'shield', title: 'Beware of phishing', message: 'Only log in at our official domain — we will never ask for your password by email.' },
  { icon: 'trending-up', title: 'Review your deposits', message: 'Track all your deposit history and status from the Deposits tab.' },
  { icon: 'sparkles', title: 'Swap assets instantly', message: 'Use the Swap tab to convert between supported crypto assets in seconds.' },
];

export function getRandomTip(): AppTip {
  return APP_TIPS[Math.floor(Math.random() * APP_TIPS.length)];
}
