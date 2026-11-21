"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import EmotionRegistry from "@/components/admin/lib/EmotionRegistry";
import { MaterialUIControllerProvider, useMaterialUIController } from "@/components/admin/context";
import theme from "@/components/admin/assets/theme";
import themeDark from "@/components/admin/assets/theme-dark";
import { useThemeMode } from "@/components/admin/theme/useThemeMode";
import type { ThemeChoice } from "@/components/admin/lib/theme-mode";

function ThemedAdmin({ children }: { children: ReactNode }) {
  const [controller] = useMaterialUIController();
  useThemeMode();
  return (
    <ThemeProvider theme={controller.darkMode ? themeDark : theme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

/** The admin's Material Dashboard theme (light, dark or system), only under /admin. */
export default function AdminProviders({ children, initialTheme }: { children: ReactNode; initialTheme: ThemeChoice }) {
  return (
    <EmotionRegistry>
      <MaterialUIControllerProvider initialTheme={initialTheme}>
        <ThemedAdmin>{children}</ThemedAdmin>
      </MaterialUIControllerProvider>
    </EmotionRegistry>
  );
}
