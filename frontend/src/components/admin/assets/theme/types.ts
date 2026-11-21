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
  Shared type definitions for the light (assets/theme) and dark (assets/theme-dark) themes,
  plus the module augmentation that teaches MUI's `Theme` about the template's custom keys.
*/

import type { CSSObject, TypographyStyle as MuiTypographyStyle } from "@mui/material/styles";

/* ------------------------------------------------------------------ */
/* Color names                                                         */
/* ------------------------------------------------------------------ */

/** The eight main template colors (gradients, coloredShadows, badgeColors, ...). */
export const mainColorNames = [
  "primary",
  "secondary",
  "info",
  "success",
  "warning",
  "error",
  "light",
  "dark",
] as const;
export type MainColor = (typeof mainColorNames)[number];

/** Palette keys that hold an object with a `main` color. */
export const paletteColorNames = [
  ...mainColorNames,
  "transparent",
  "white",
  "black",
  "text",
] as const;
export type PaletteColorName = (typeof paletteColorNames)[number];

export const greyColorNames = [
  "grey-100",
  "grey-200",
  "grey-300",
  "grey-400",
  "grey-500",
  "grey-600",
  "grey-700",
  "grey-800",
  "grey-900",
] as const;
export type GreyColorName = (typeof greyColorNames)[number];

export type GreyShade = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type SocialMediaName =
  | "facebook"
  | "twitter"
  | "instagram"
  | "linkedin"
  | "pinterest"
  | "youtube"
  | "vimeo"
  | "slack"
  | "dribbble"
  | "github"
  | "reddit"
  | "tumblr";

/** Type guard: is `value` one of the entries of `list`? */
export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

/** Type guard: is `value` one of the eight main template colors? */
export function isMainColor(value: unknown): value is MainColor {
  return isOneOf(mainColorNames, value);
}

/** Type guard: is `value` a palette key holding a `{ main }` color object? */
export function isPaletteColorName(value: unknown): value is PaletteColorName {
  return isOneOf(paletteColorNames, value);
}

/** Type guard: is `value` one of the "grey-100" ... "grey-900" names? */
export function isGreyColorName(value: unknown): value is GreyColorName {
  return isOneOf(greyColorNames, value);
}

/* ------------------------------------------------------------------ */
/* base/colors                                                         */
/* ------------------------------------------------------------------ */

export interface ColorWithFocus {
  main: string;
  focus: string;
}

export interface GradientColor {
  main: string;
  state: string;
}

export interface SocialMediaColor {
  main: string;
  dark: string;
}

export interface BadgeColor {
  background: string;
  text: string;
}

export interface ThemeColors {
  background: {
    default: string;
    /** dark theme only */
    sidenav?: string;
    /** dark theme only */
    card?: string;
    /** MUI's surface for Paper, menus and dialogs (dark theme sets it to the card colour) */
    paper?: string;
  };
  text: ColorWithFocus;
  transparent: { main: string };
  white: ColorWithFocus;
  black: ColorWithFocus & { light: string };
  primary: ColorWithFocus;
  secondary: ColorWithFocus;
  info: ColorWithFocus;
  success: ColorWithFocus;
  warning: ColorWithFocus;
  error: ColorWithFocus;
  light: ColorWithFocus;
  dark: ColorWithFocus;
  grey: Record<GreyShade, string>;
  gradients: Record<MainColor, GradientColor>;
  socialMediaColors: Record<SocialMediaName, SocialMediaColor>;
  badgeColors: Record<MainColor, BadgeColor>;
  coloredShadows: Record<MainColor, string>;
  inputBorderColor: string;
  tabs: {
    indicator: { boxShadow: string };
  };
}

/* ------------------------------------------------------------------ */
/* base/borders                                                        */
/* ------------------------------------------------------------------ */

export type BorderRadiusName = "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "section";

export interface ThemeBorders {
  borderColor: string;
  borderWidth: {
    0: number;
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
  };
  borderRadius: Record<BorderRadiusName, string>;
}

/* ------------------------------------------------------------------ */
/* base/boxShadows                                                     */
/* ------------------------------------------------------------------ */

export type BoxShadowName = "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "inset";

export interface ThemeBoxShadows extends Record<BoxShadowName, string> {
  colored: Record<MainColor, string>;
  navbarBoxShadow: string;
  sliderBoxShadow: { thumb: string };
  tabsBoxShadow: { indicator: string };
}

/* ------------------------------------------------------------------ */
/* base/breakpoints                                                    */
/* ------------------------------------------------------------------ */

export interface ThemeBreakpoints {
  values: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
}

/* ------------------------------------------------------------------ */
/* base/typography                                                     */
/* ------------------------------------------------------------------ */

export type FontSizeName = "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
export type FontSizes = Record<FontSizeName, string>;

export interface LineHeights {
  sm: number;
  md: number;
  lg: number;
}

export type TypographyStyle = MuiTypographyStyle;

export interface ThemeTypography {
  fontFamily: string;
  fontWeightLighter: number;
  fontWeightLight: number;
  fontWeightRegular: number;
  fontWeightMedium: number;
  fontWeightBold: number;
  h1: TypographyStyle;
  h2: TypographyStyle;
  h3: TypographyStyle;
  h4: TypographyStyle;
  h5: TypographyStyle;
  h6: TypographyStyle;
  subtitle1: TypographyStyle;
  subtitle2: TypographyStyle;
  body1: TypographyStyle;
  body2: TypographyStyle;
  button: TypographyStyle;
  caption: TypographyStyle;
  overline: TypographyStyle;
  d1: TypographyStyle;
  d2: TypographyStyle;
  d3: TypographyStyle;
  d4: TypographyStyle;
  d5: TypographyStyle;
  d6: TypographyStyle;
  size: FontSizes;
  lineHeight: LineHeights;
}

/* ------------------------------------------------------------------ */
/* functions                                                           */
/* ------------------------------------------------------------------ */

export type PxToRem = (number: number, baseNumber?: number) => string;
export type HexToRgb = (color: string) => string;
export type Rgba = (color: string, opacity: number) => string;
export type LinearGradient = (color: string, colorState: string, angle?: number) => string;
export type BoxShadow = (
  offset: readonly number[] | undefined,
  radius: readonly number[] | undefined,
  color: string,
  opacity: number,
  inset?: string
) => string;

export interface ThemeFunctions {
  boxShadow: BoxShadow;
  hexToRgb: HexToRgb;
  linearGradient: LinearGradient;
  pxToRem: PxToRem;
  rgba: Rgba;
}

/* ------------------------------------------------------------------ */
/* Style helpers                                                       */
/* ------------------------------------------------------------------ */

/** A plain CSS-in-JS style object (used for theme sub-objects and global styles). */
export type StyleObject = CSSObject;

/** The size/color variants used by the button overrides (base, small, large, ...). */
export interface ButtonVariantStyles {
  base: CSSObject;
  small: CSSObject;
  large: CSSObject;
  primary: CSSObject;
  secondary: CSSObject;
}

/* ------------------------------------------------------------------ */
/* MUI module augmentation                                             */
/* ------------------------------------------------------------------ */

declare module "@mui/material/styles" {
  interface Theme {
    functions: ThemeFunctions;
    borders: ThemeBorders;
    boxShadows: ThemeBoxShadows;
  }

  interface ThemeOptions {
    functions?: ThemeFunctions;
    borders?: ThemeBorders;
    boxShadows?: ThemeBoxShadows;
  }

  interface Palette {
    transparent: ThemeColors["transparent"];
    white: ThemeColors["white"];
    black: ThemeColors["black"];
    light: ThemeColors["light"];
    dark: ThemeColors["dark"];
    gradients: ThemeColors["gradients"];
    socialMediaColors: ThemeColors["socialMediaColors"];
    badgeColors: ThemeColors["badgeColors"];
    coloredShadows: ThemeColors["coloredShadows"];
    inputBorderColor: ThemeColors["inputBorderColor"];
    tabs: ThemeColors["tabs"];
  }

  interface PaletteOptions {
    transparent?: ThemeColors["transparent"];
    white?: ThemeColors["white"];
    black?: ThemeColors["black"];
    light?: ThemeColors["light"];
    dark?: ThemeColors["dark"];
    gradients?: ThemeColors["gradients"];
    socialMediaColors?: ThemeColors["socialMediaColors"];
    badgeColors?: ThemeColors["badgeColors"];
    coloredShadows?: ThemeColors["coloredShadows"];
    inputBorderColor?: ThemeColors["inputBorderColor"];
    tabs?: ThemeColors["tabs"];
  }

  interface PaletteColor {
    focus: string;
  }

  interface SimplePaletteColorOptions {
    focus?: string;
  }

  interface TypeText {
    main: string;
    focus: string;
  }

  interface TypeBackground {
    sidenav?: string;
    card?: string;
  }

  interface TypographyVariants {
    fontWeightLighter: number;
    d1: TypographyStyle;
    d2: TypographyStyle;
    d3: TypographyStyle;
    d4: TypographyStyle;
    d5: TypographyStyle;
    d6: TypographyStyle;
    size: FontSizes;
    lineHeight: LineHeights;
  }

  interface TypographyVariantsOptions {
    fontWeightLighter?: number;
    d1?: TypographyStyle;
    d2?: TypographyStyle;
    d3?: TypographyStyle;
    d4?: TypographyStyle;
    d5?: TypographyStyle;
    d6?: TypographyStyle;
    size?: FontSizes;
    lineHeight?: LineHeights;
  }

  interface BreakpointOverrides {
    xxl: true;
  }
}
