"use client";

import { useEffect } from "react";
import { setSystemPrefersDark, useMaterialUIController } from "@/components/admin/context";
import { themeCookie } from "@/components/admin/lib/theme-mode";

const PREFERS_DARK = "(prefers-color-scheme: dark)";

/**
 * Keeps the theme in step with the choice: follows the computer's light/dark setting live while
 * the choice is "system", and saves the choice (and what's showing) in the cookie the server
 * renders from. Mounted once, around every page.
 */
export function useThemeMode(): void {
  const [{ themeMode, darkMode }, dispatch] = useMaterialUIController();

  // "System": show what the computer prefers now, and change when it does.
  useEffect(() => {
    if (themeMode !== "system" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia(PREFERS_DARK);
    const follow = () => setSystemPrefersDark(dispatch, query.matches);
    follow();
    query.addEventListener("change", follow);
    return () => query.removeEventListener("change", follow);
  }, [themeMode, dispatch]);

  // Remember it for the next page load, and let the browser draw its own parts (scrollbars,
  // date pickers, autofill) to match.
  useEffect(() => {
    document.cookie = themeCookie(
      { mode: themeMode, dark: darkMode },
      window.location.protocol === "https:"
    );
    document.documentElement.style.colorScheme = darkMode ? "dark" : "light";
  }, [themeMode, darkMode]);
}
