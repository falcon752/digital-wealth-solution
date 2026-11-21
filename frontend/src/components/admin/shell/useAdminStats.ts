"use client";

import { useEffect, useSyncExternalStore } from "react";
import { adminAPI } from "@/lib/api";
import type { AdminStats } from "@/types";

/**
 * The admin overview numbers, shared by the notification bell and the Overview page so they
 * make one request between them. Refreshed every two minutes while any admin page is open.
 */
interface State {
  data: AdminStats | null;
  error: unknown;
  loading: boolean;
}

let state: State = { data: null, error: null, loading: false };
const listeners = new Set<() => void>();
let subscribers = 0;
let timer: ReturnType<typeof setInterval> | null = null;

function set(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

export async function refreshAdminStats(): Promise<void> {
  set({ loading: true });
  try {
    const response = await adminAPI.getDashboardStats();
    set({ data: response.data, error: null, loading: false });
  } catch (error) {
    set({ error, loading: false });
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useAdminStats(): State & { refresh: () => Promise<void> } {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);

  useEffect(() => {
    subscribers += 1;
    if (subscribers === 1) {
      if (!state.data && !state.loading) void refreshAdminStats();
      timer = setInterval(() => void refreshAdminStats(), 120_000);
    }
    return () => {
      subscribers -= 1;
      if (subscribers === 0 && timer) {
        clearInterval(timer);
        timer = null;
      }
    };
  }, []);

  return { ...snapshot, refresh: refreshAdminStats };
}

/** The waiting-work queues as links, biggest first, skipping empty ones. */
export function waitingItems(stats: AdminStats | null) {
  const q = stats?.queues;
  const items = [
    { icon: "verified_user", label: "KYC verifications to review", href: "/admin/kyc", count: q?.kyc ?? 0 },
    { icon: "request_quote", label: "payment proofs to check", href: "/admin/payment-proofs", count: q?.paymentProofs ?? 0 },
    { icon: "paid", label: "onboarding fees to confirm", href: "/admin/onboarding-payments", count: q?.onboardingPayments ?? 0 },
    { icon: "south_west", label: "pending deposits", href: "/admin/deposits?status=pending", count: q?.deposits ?? stats?.pendingDeposits ?? 0 },
    { icon: "outbound", label: "pending withdrawals", href: "/admin/withdrawals?status=pending", count: q?.withdrawals ?? stats?.pendingWithdrawals ?? 0 },
    { icon: "key", label: "access requests", href: "/admin/access-requests", count: q?.accessRequests ?? 0 },
    { icon: "forum", label: "new consultations", href: "/admin/consultations", count: q?.consultations ?? 0 },
    { icon: "business", label: "LLC applications", href: "/admin/llc", count: q?.llc ?? 0 },
    { icon: "account_balance", label: "loan requests", href: "/admin/loans", count: q?.loans ?? 0 },
    { icon: "payment", label: "card requests", href: "/admin/cards", count: q?.cards ?? 0 },
  ];
  return items.filter((item) => item.count > 0);
}
