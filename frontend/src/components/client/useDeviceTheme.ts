'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

/**
 * The client dashboard and advisor console always follow the device's light/dark setting (they
 * have no theme button). A choice made elsewhere, e.g. on the sign-in pages, is set back to the
 * device theme here.
 */
export function useDeviceTheme() {
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    if (theme && theme !== 'system') setTheme('system');
  }, [theme, setTheme]);
}
