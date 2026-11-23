'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { usersAPI } from '@/lib/api';

/** Pending deposits plus withdrawals still in progress, for the Activity badge. */
export function usePendingCount() {
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  // Refreshed when the client moves to Activity or back to the dashboard, where it may have changed.
  const refreshKey = pathname?.startsWith('/dashboard/transactions') || pathname === '/dashboard' ? pathname : 'other';

  useEffect(() => {
    let cancelled = false;
    usersAPI.getDashboardStats()
      .then((res) => {
        if (!cancelled) setCount((res.data?.pendingDeposits || 0) + (res.data?.pendingWithdrawals || 0));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [refreshKey]);

  return count;
}
