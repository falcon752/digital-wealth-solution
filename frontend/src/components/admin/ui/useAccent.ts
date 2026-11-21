"use client";

import { useMaterialUIController } from "@/components/admin/context";

export type AccentColor = "primary" | "dark" | "info" | "success" | "warning" | "error";

/**
 * The accent colour picked in the settings panel (KIK green by default). Use it for page
 * headers, primary buttons and charts so the whole panel follows the person's choice.
 */
export function useAccent(): AccentColor {
  const [controller] = useMaterialUIController();
  return controller.sidenavColor as AccentColor;
}
