"use client";

/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

/**
  This file is used for controlling the global states of the components,
  you can customize the states for the different components here.
*/

import { createContext, useContext, useReducer, useMemo } from "react";
import type { Dispatch, ReactNode } from "react";
import { DEFAULT_THEME, type ThemeChoice, type ThemeMode } from "@/components/admin/lib/theme-mode";

/** Sidenav accent colors offered by the Configurator. */
export type SidenavColor =
  "primary" | "secondary" | "info" | "success" | "warning" | "error" | "dark";

/** Which layout container is currently mounted. */
export type LayoutType = "dashboard" | "page";

export interface MaterialUIControllerState {
  miniSidenav: boolean;
  transparentSidenav: boolean;
  whiteSidenav: boolean;
  sidenavColor: SidenavColor;
  transparentNavbar: boolean;
  fixedNavbar: boolean;
  openConfigurator: boolean;
  layout: LayoutType;
  /** What the person chose: light, dark or follow the computer. */
  themeMode: ThemeMode;
  /** What is showing (themeMode resolved; for "system", what the computer prefers). */
  darkMode: boolean;
}

export type MaterialUIControllerAction =
  | { type: "MINI_SIDENAV"; value: boolean }
  | { type: "TRANSPARENT_SIDENAV"; value: boolean }
  | { type: "WHITE_SIDENAV"; value: boolean }
  | { type: "SIDENAV_COLOR"; value: SidenavColor }
  | { type: "TRANSPARENT_NAVBAR"; value: boolean }
  | { type: "FIXED_NAVBAR"; value: boolean }
  | { type: "OPEN_CONFIGURATOR"; value: boolean }
  | { type: "LAYOUT"; value: LayoutType }
  | { type: "DARKMODE"; value: boolean }
  | { type: "THEME_MODE"; value: ThemeMode }
  | { type: "SYSTEM_PREFERS_DARK"; value: boolean };

export type MaterialUIControllerDispatch = Dispatch<MaterialUIControllerAction>;

export type MaterialUIControllerValue = [MaterialUIControllerState, MaterialUIControllerDispatch];

// Material Dashboard 2 React main context
const MaterialUI = createContext<MaterialUIControllerValue | null>(null);

// Setting custom name for the context which is visible on react dev tools
MaterialUI.displayName = "MaterialUIContext";

// Material Dashboard 2 React reducer
function reducer(
  state: MaterialUIControllerState,
  action: MaterialUIControllerAction
): MaterialUIControllerState {
  switch (action.type) {
    case "MINI_SIDENAV": {
      return { ...state, miniSidenav: action.value };
    }
    case "TRANSPARENT_SIDENAV": {
      return { ...state, transparentSidenav: action.value };
    }
    case "WHITE_SIDENAV": {
      return { ...state, whiteSidenav: action.value };
    }
    case "SIDENAV_COLOR": {
      return { ...state, sidenavColor: action.value };
    }
    case "TRANSPARENT_NAVBAR": {
      return { ...state, transparentNavbar: action.value };
    }
    case "FIXED_NAVBAR": {
      return { ...state, fixedNavbar: action.value };
    }
    case "OPEN_CONFIGURATOR": {
      return { ...state, openConfigurator: action.value };
    }
    case "LAYOUT": {
      return { ...state, layout: action.value };
    }
    case "DARKMODE": {
      return { ...state, darkMode: action.value };
    }
    case "THEME_MODE": {
      // Light and dark show at once; "system" keeps what's showing until the computer's
      // preference is read (useThemeMode).
      return {
        ...state,
        themeMode: action.value,
        darkMode: action.value === "system" ? state.darkMode : action.value === "dark",
      };
    }
    case "SYSTEM_PREFERS_DARK": {
      // The computer's setting only matters while following it; a light/dark choice made in
      // the same moment (or since) wins.
      return state.themeMode === "system" && state.darkMode !== action.value
        ? { ...state, darkMode: action.value }
        : state;
    }
    default: {
      const unhandled: { type: string } = action;
      throw new Error(`Unhandled action type: ${unhandled.type}`);
    }
  }
}

export interface MaterialUIControllerProviderProps {
  children: ReactNode;
  /** The theme to start with (from the cookie), so the server renders it. */
  initialTheme?: ThemeChoice;
}

// Material Dashboard 2 React context provider
function MaterialUIControllerProvider({
  children,
  initialTheme = DEFAULT_THEME,
}: MaterialUIControllerProviderProps) {
  const initialState: MaterialUIControllerState = {
    miniSidenav: false,
    transparentSidenav: false,
    whiteSidenav: false,
    sidenavColor: "primary",
    transparentNavbar: true,
    fixedNavbar: true,
    openConfigurator: false,
    layout: "dashboard",
    themeMode: initialTheme.mode,
    darkMode: initialTheme.dark,
  };

  const [controller, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<MaterialUIControllerValue>(
    () => [controller, dispatch],
    [controller, dispatch]
  );

  return <MaterialUI.Provider value={value}>{children}</MaterialUI.Provider>;
}

// Material Dashboard 2 React custom hook for using context
function useMaterialUIController(): MaterialUIControllerValue {
  const context = useContext(MaterialUI);

  if (!context) {
    throw new Error(
      "useMaterialUIController should be used inside the MaterialUIControllerProvider."
    );
  }

  return context;
}

// Context module functions
const setMiniSidenav = (dispatch: MaterialUIControllerDispatch, value: boolean) =>
  dispatch({ type: "MINI_SIDENAV", value });
const setTransparentSidenav = (dispatch: MaterialUIControllerDispatch, value: boolean) =>
  dispatch({ type: "TRANSPARENT_SIDENAV", value });
const setWhiteSidenav = (dispatch: MaterialUIControllerDispatch, value: boolean) =>
  dispatch({ type: "WHITE_SIDENAV", value });
const setSidenavColor = (dispatch: MaterialUIControllerDispatch, value: SidenavColor) =>
  dispatch({ type: "SIDENAV_COLOR", value });
const setTransparentNavbar = (dispatch: MaterialUIControllerDispatch, value: boolean) =>
  dispatch({ type: "TRANSPARENT_NAVBAR", value });
const setFixedNavbar = (dispatch: MaterialUIControllerDispatch, value: boolean) =>
  dispatch({ type: "FIXED_NAVBAR", value });
const setOpenConfigurator = (dispatch: MaterialUIControllerDispatch, value: boolean) =>
  dispatch({ type: "OPEN_CONFIGURATOR", value });
const setLayout = (dispatch: MaterialUIControllerDispatch, value: LayoutType) =>
  dispatch({ type: "LAYOUT", value });
const setDarkMode = (dispatch: MaterialUIControllerDispatch, value: boolean) =>
  dispatch({ type: "DARKMODE", value });
const setThemeMode = (dispatch: MaterialUIControllerDispatch, value: ThemeMode) =>
  dispatch({ type: "THEME_MODE", value });
const setSystemPrefersDark = (dispatch: MaterialUIControllerDispatch, value: boolean) =>
  dispatch({ type: "SYSTEM_PREFERS_DARK", value });

export {
  MaterialUIControllerProvider,
  useMaterialUIController,
  setMiniSidenav,
  setTransparentSidenav,
  setWhiteSidenav,
  setSidenavColor,
  setTransparentNavbar,
  setFixedNavbar,
  setOpenConfigurator,
  setLayout,
  setDarkMode,
  setThemeMode,
  setSystemPrefersDark,
  reducer as materialUIReducer,
};
