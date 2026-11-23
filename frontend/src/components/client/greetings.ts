'use client';

/**
 * The greetings in the top bar of the client and advisor home pages: one picked at random on each
 * visit. `{time}` becomes "Good morning/afternoon/evening" and `{name}` the person's first name.
 * `head` is the short part (shown alone on phones), `line` the rest (shown after it on computers).
 */
import { useEffect, useState } from 'react';

export interface Greeting {
  head: string;
  line: string;
}

export const CLIENT_GREETINGS: Greeting[] = [
  { head: '{time}, {name}', line: "Here's where your wealth stands today." },
  { head: 'Welcome back, {name}', line: 'Your accounts are up to date.' },
  { head: '{time}, {name}', line: 'Everything is in order.' },
  { head: 'Good to see you, {name}', line: "Let's take a look at your portfolio." },
  { head: 'Hello, {name}', line: 'Your wealth, all in one place.' },
  { head: '{time}, {name}', line: 'Markets never sleep, and neither does your custody.' },
  { head: 'Welcome back, {name}', line: 'Your assets are held securely with Anchorage Digital Bank.' },
  { head: 'Hi {name}', line: 'Your advisor is one message away.' },
  { head: '{time}, {name}', line: 'Ready when you are.' },
  { head: 'Nice to have you back, {name}', line: "Here's today's overview." },
  { head: 'Hello again, {name}', line: 'Deposit, convert or withdraw in a few taps.' },
  { head: '{time}, {name}', line: 'Your partner code earns you a commission on every referral.' },
  { head: 'Welcome, {name}', line: 'Built for long-term, institutional-grade wealth.' },
  { head: 'Hi {name}', line: "Prices are live, so here's your latest balance." },
  { head: '{time}, {name}', line: 'Thank you for trusting Digital Wealth Partners.' },
];

export const ADVISOR_GREETINGS: Greeting[] = [
  { head: '{time}, {name}', line: "Here's who needs you today." },
  { head: 'Welcome back, {name}', line: 'Your clients are in good hands.' },
  { head: '{time}, {name}', line: "Let's clear the queue." },
  { head: 'Good to see you, {name}', line: 'Every reply builds trust.' },
  { head: 'Hello, {name}', line: 'Your tickets are sorted by what needs attention first.' },
  { head: '{time}, {name}', line: 'A quick answer goes a long way.' },
  { head: 'Welcome back, {name}', line: 'Your clients can reach you here, by email and on WhatsApp or Telegram.' },
  { head: 'Hi {name}', line: 'Thanks for looking after our clients.' },
  { head: '{time}, {name}', line: 'Ready for the next conversation.' },
  { head: 'Nice to have you back, {name}', line: "Here's today's overview." },
  { head: 'Hello again, {name}', line: 'Resolved tickets stay in your record.' },
  { head: '{time}, {name}', line: 'Clear answers, calm clients.' },
  { head: 'Welcome, {name}', line: 'You are the face of Digital Wealth Partners.' },
  { head: 'Hi {name}', line: "Let's keep every client informed." },
  { head: '{time}, {name}', line: 'Great service starts here.' },
];

function timeOfDay(date = new Date()) {
  const hour = date.getHours();
  return hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
}

function fill(text: string, name: string) {
  return text.replace('{time}', timeOfDay()).replace('{name}', name);
}

/**
 * A random greeting for this visit. Chosen after the page has loaded (so the server and browser
 * agree on the first render); until then it's null.
 */
export function useGreeting(kind: 'client' | 'advisor', firstName?: string | null) {
  const [greeting, setGreeting] = useState<Greeting | null>(null);
  const name = (firstName || '').trim() || 'there';

  useEffect(() => {
    const list = kind === 'advisor' ? ADVISOR_GREETINGS : CLIENT_GREETINGS;
    setGreeting(list[Math.floor(Math.random() * list.length)]);
  }, [kind]);

  return greeting ? { head: fill(greeting.head, name), line: fill(greeting.line, name) } : null;
}
