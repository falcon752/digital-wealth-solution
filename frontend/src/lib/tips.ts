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
];

export function getRandomTip(): AppTip {
  return APP_TIPS[Math.floor(Math.random() * APP_TIPS.length)];
}
