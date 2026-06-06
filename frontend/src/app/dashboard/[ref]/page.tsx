'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReferralRedirectPage({ params }: { params: { ref: string } }) {
  const router = useRouter();

  useEffect(() => {
    if (params.ref) {
      localStorage.setItem('referralCode', params.ref);
    }
    router.replace('/register');
  }, [params.ref, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
