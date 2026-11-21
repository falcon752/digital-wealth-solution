"use client";

import { useEffect, useRef } from "react";
import {
  useMaterialUIController,
  setFixedNavbar,
  setSidenavColor,
  setTransparentSidenav,
  setWhiteSidenav,
  type SidenavColor,
} from "@/components/admin/context";

const KEY = "dwp-admin:display";
const COLORS: readonly SidenavColor[] = ["primary", "dark", "info", "success", "warning", "error"];

interface Saved {
  sidenavColor?: SidenavColor;
  fixedNavbar?: boolean;
  transparentSidenav?: boolean;
  whiteSidenav?: boolean;
}

function read(): Saved {
  try {
    const raw = window.localStorage.getItem(KEY);
    const value: unknown = raw ? JSON.parse(raw) : {};
    return typeof value === "object" && value !== null ? (value as Saved) : {};
  } catch {
    return {};
  }
}

/**
 * Remembers the settings-panel choices (accent colour, sidebar style, top bar) on this
 * device. A convenience only: if storage is unavailable the defaults apply. The theme (light,
 * dark, system) is kept separately in a cookie, so it applies from the first frame: see
 * useThemeMode.
 */
export function useDisplaySettings(): void {
  const [controller, dispatch] = useMaterialUIController();
  const restored = useRef(false);

  // Restore once, after the first render (the server rendered the defaults).
  useEffect(() => {
    const saved = read();
    if (saved.sidenavColor && COLORS.includes(saved.sidenavColor))
      setSidenavColor(dispatch, saved.sidenavColor);
    if (typeof saved.fixedNavbar === "boolean") setFixedNavbar(dispatch, saved.fixedNavbar);
    if (typeof saved.transparentSidenav === "boolean")
      setTransparentSidenav(dispatch, saved.transparentSidenav);
    if (typeof saved.whiteSidenav === "boolean") setWhiteSidenav(dispatch, saved.whiteSidenav);
    // Start saving only after the restored values have rendered: saving in this same commit
    // would write the defaults over what was saved (React runs effects twice in development).
    queueMicrotask(() => {
      restored.current = true;
    });
  }, [dispatch]);

  const { sidenavColor, fixedNavbar, transparentSidenav, whiteSidenav } = controller;
  useEffect(() => {
    if (!restored.current) return;
    try {
      window.localStorage.setItem(
        KEY,
        JSON.stringify({ sidenavColor, fixedNavbar, transparentSidenav, whiteSidenav })
      );
    } catch {
      // Private mode or storage blocked: nothing to remember.
    }
  }, [sidenavColor, fixedNavbar, transparentSidenav, whiteSidenav]);
}
