import { redirect } from 'next/navigation';

/** The Anchorage Digital Bank account moved to the dashboard's home, /dashboard. Old links land there. */
export default function WalletRedirect() {
  redirect('/dashboard');
}
