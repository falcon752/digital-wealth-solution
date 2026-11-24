/**
 * Light, dark or follow the computer ("system"). The choice lives in a cookie so the server
 * renders the right theme on the very first frame (loading skeletons and sign-in pages
 * included), instead of flashing light and switching after the page loads.
 *
 * The cookie also remembers what "system" last resolved to, because the server can't ask the
 * browser: `system:dark` renders dark, then the browser corrects it if the computer changed.
 */
export type ThemeMode = "light" | "dark" | "system";

export interface ThemeChoice {
  mode: ThemeMode;
  /** What is actually showing. */
  dark: boolean;
}

// Renamed (was dwp_admin_theme) so every admin starts on "Device" after the switch to device themes.
export const THEME_COOKIE = "dwp_admin_theme_device";
export const THEME_MODES: readonly ThemeMode[] = ["light", "dark", "system"];
export const DEFAULT_THEME: ThemeChoice = { mode: "system", dark: false };

const isMode = (value: unknown): value is ThemeMode =>
  typeof value === "string" && (THEME_MODES as readonly string[]).includes(value);

/** The dark/light that a mode shows, given whether the computer prefers dark. */
export function resolveDark(mode: ThemeMode, systemPrefersDark: boolean): boolean {
  if (mode === "system") return systemPrefersDark;
  return mode === "dark";
}

/** Reads the cookie; anything missing or unrecognised means the default (follow the system). */
export function parseThemeCookie(value: string | undefined | null): ThemeChoice {
  const [mode, shown] = (value ?? "").split(":");
  if (!isMode(mode)) return DEFAULT_THEME;
  if (mode !== "system") return { mode, dark: mode === "dark" };
  return { mode, dark: shown === "dark" };
}

export function themeCookieValue({ mode, dark }: ThemeChoice): string {
  return `${mode}:${dark ? "dark" : "light"}`;
}

/** The cookie as `document.cookie` sets it: a year, whole site, not sent to other sites. */
export function themeCookie(choice: ThemeChoice, secure: boolean): string {
  return `${THEME_COOKIE}=${themeCookieValue(choice)}; Path=/; Max-Age=31536000; SameSite=Lax${
    secure ? "; Secure" : ""
  }`;
}

/** Whether a `document.cookie` string already holds a theme choice. */
export function hasThemeCookie(cookieHeader: string): boolean {
  return cookieHeader.split(";").some((part) => part.trim().startsWith(`${THEME_COOKIE}=`));
}

/**
 * Before this setting existed, dark mode was an on/off saved with the other display settings.
 * Someone who had turned it on keeps dark. "Off" was saved for everyone (it was the default),
 * so it isn't a choice anyone made: they get the new default, following the system.
 */
export function modeFromLegacySettings(raw: string | null): ThemeMode | null {
  try {
    const saved: unknown = raw ? JSON.parse(raw) : null;
    if (typeof saved !== "object" || saved === null) return null;
    return (saved as { darkMode?: unknown }).darkMode === true ? "dark" : null;
  } catch {
    return null;
  }
}
