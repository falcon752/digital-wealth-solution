import { Fira_Mono, Fira_Sans } from 'next/font/google';

/** DirectStay's dashboard fonts, used across the client dashboard (see .dwp-client in globals.css). */
export const firaSans = Fira_Sans({
  variable: '--font-fira-sans',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

// Only addresses and codes use it, so it isn't preloaded ahead of everything else.
export const firaMono = Fira_Mono({
  variable: '--font-fira-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  preload: false,
});

export const clientFontClasses = `${firaSans.variable} ${firaMono.variable}`;
