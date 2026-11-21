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

// @mui material components
import Typography from "@mui/material/Typography";
import { styled } from "@mui/material/styles";
import type { CSSObject } from "@mui/material/styles";

// Material Dashboard 2 React theme types
import { isOneOf, isMainColor } from "@/components/admin/assets/theme/types";

export type MDTypographyColor =
  | "inherit"
  | "primary"
  | "secondary"
  | "info"
  | "success"
  | "warning"
  | "error"
  | "light"
  | "dark"
  | "text"
  | "white";

export type MDTypographyFontWeight = false | "light" | "regular" | "medium" | "bold";

export type MDTypographyTextTransform = "none" | "capitalize" | "uppercase" | "lowercase";

export type MDTypographyVerticalAlign =
  "unset" | "baseline" | "sub" | "super" | "text-top" | "text-bottom" | "middle" | "top" | "bottom";

export interface MDTypographyOwnerState {
  color: MDTypographyColor;
  textTransform: MDTypographyTextTransform;
  verticalAlign: MDTypographyVerticalAlign;
  fontWeight: MDTypographyFontWeight;
  opacity: number;
  textGradient: boolean;
  darkMode: boolean;
}

export default styled(Typography)<{ ownerState: MDTypographyOwnerState }>(({
  theme,
  ownerState,
}): CSSObject => {
  const { palette, typography, functions } = theme;
  const { color, textTransform, verticalAlign, fontWeight, opacity, textGradient, darkMode } =
    ownerState;

  const { gradients, transparent, white } = palette;
  const { fontWeightLight, fontWeightRegular, fontWeightMedium, fontWeightBold } = typography;
  const { linearGradient } = functions;

  // palette keys that hold a `main` color
  const paletteColors = [
    "primary",
    "secondary",
    "info",
    "success",
    "warning",
    "error",
    "light",
    "dark",
    "text",
    "white",
  ] as const;

  // fontWeight styles
  const fontWeights = {
    light: fontWeightLight,
    regular: fontWeightRegular,
    medium: fontWeightMedium,
    bold: fontWeightBold,
  };

  // styles for the typography with textGradient={true}
  const gradientStyles = (): CSSObject => ({
    backgroundImage:
      color !== "inherit" && color !== "text" && color !== "white" && isMainColor(color)
        ? linearGradient(gradients[color].main, gradients[color].state)
        : linearGradient(gradients.dark.main, gradients.dark.state),
    display: "inline-block",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: transparent.main,
    position: "relative",
    zIndex: 1,
  });

  // color value
  let colorValue =
    color === "inherit" || !isOneOf(paletteColors, color) ? "inherit" : palette[color].main;

  if (darkMode && (color === "inherit" || !isOneOf(paletteColors, color))) {
    colorValue = "inherit";
  } else if (darkMode && color === "dark") colorValue = white.main;

  return {
    opacity,
    textTransform,
    verticalAlign,
    textDecoration: "none",
    color: colorValue,
    fontWeight: fontWeight ? fontWeights[fontWeight] : undefined,
    ...(textGradient && gradientStyles()),
  };
});
