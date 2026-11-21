"use client";

import { useEffect } from "react";
import { setSystemPrefersDark, setThemeMode, useMaterialUIController } from "@/components/admin/context";
import { hasThemeCookie, modeFromLegacySettings, themeCookie } from "@/components/admin/lib/theme-mode";

const PREFERS_DARK = "(prefers-color-scheme: dark)";
/** Where display settings used to keep dark mode (see modeFromLegacySettings). */
const LEGACY_SETTINGS_KEY = "dwp-admin:display";

/**
 * Keeps the theme in step with the choice: follows the computer's light/dark setting live while
 * the choice is "system", and saves the choice (and what's showing) in the cookie the server
 * renders from. Mounted once, around every page.
 */
export function useThemeMode(): void {
  const [{ themeMode, darkMode }, dispatch] = useMaterialUIController();

  // First visit since the cookie existed: keep dark mode for anyone who had switched it on.
  useEffect(() => {
    if (hasThemeCookie(document.cookie)) return;
    let legacy: string | null = null;
    try {
      legacy = window.localStorage.getItem(LEGACY_SETTINGS_KEY);
    } catch {
      // Storage blocked: nothing to carry over.
    }
    const mode = modeFromLegacySettings(legacy);
    if (mode) setThemeMode(dispatch, mode);
  }, [dispatch]);

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
