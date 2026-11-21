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
import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";
import type { CSSObject } from "@mui/material/styles";

// Material Dashboard 2 React theme types
import { isOneOf } from "@/components/admin/assets/theme/types";
import type { GreyColorName, MainColor } from "@/components/admin/assets/theme/types";

export type MDBoxVariant = "contained" | "gradient";
export type MDBoxColoredShadow = MainColor | "none";

export interface MDBoxOwnerState {
  variant: MDBoxVariant;
  bgColor: string;
  color: string;
  opacity: number;
  borderRadius: string;
  shadow: string;
  coloredShadow: MDBoxColoredShadow;
}

export default styled(Box)<{ ownerState: MDBoxOwnerState }>(({ theme, ownerState }): CSSObject => {
  const { palette, functions, borders, boxShadows } = theme;
  const { variant, bgColor, color, opacity, borderRadius, shadow, coloredShadow } = ownerState;

  const { gradients, grey, white } = palette;
  const { linearGradient } = functions;
  const { borderRadius: radius } = borders;
  const { colored } = boxShadows;

  const greyColors: Record<GreyColorName, string> = {
    "grey-100": grey[100],
    "grey-200": grey[200],
    "grey-300": grey[300],
    "grey-400": grey[400],
    "grey-500": grey[500],
    "grey-600": grey[600],
    "grey-700": grey[700],
    "grey-800": grey[800],
    "grey-900": grey[900],
  };

  const validGradients = [
    "primary",
    "secondary",
    "info",
    "success",
    "warning",
    "error",
    "dark",
    "light",
  ] as const;

  const paletteColors = [
    "transparent",
    "white",
    "black",
    "primary",
    "secondary",
    "info",
    "success",
    "warning",
    "error",
    "light",
    "dark",
    "text",
  ] as const;

  const validColors = [
    ...paletteColors,
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

  const validBorderRadius = ["xs", "sm", "md", "lg", "xl", "xxl", "section"] as const;
  const validBoxShadows = ["xs", "sm", "md", "lg", "xl", "xxl", "inset"] as const;

  // background value
  let backgroundValue = bgColor;

  if (variant === "gradient") {
    backgroundValue = isOneOf(validGradients, bgColor)
      ? linearGradient(gradients[bgColor].main, gradients[bgColor].state)
      : white.main;
  } else if (isOneOf(validColors, bgColor)) {
    backgroundValue = isOneOf(paletteColors, bgColor) ? palette[bgColor].main : greyColors[bgColor];
  } else {
    backgroundValue = bgColor;
  }

  // color value
  let colorValue = color;

  if (isOneOf(validColors, color)) {
    colorValue = isOneOf(paletteColors, color) ? palette[color].main : greyColors[color];
    // As MDTypography does: "dark" text means light text on a dark page.
    if (palette.mode === "dark" && color === "dark") colorValue = palette.white.main;
  }

  // borderRadius value
  let borderRadiusValue = borderRadius;

  if (isOneOf(validBorderRadius, borderRadius)) {
    borderRadiusValue = radius[borderRadius];
  }

  // boxShadow value
  let boxShadowValue = "none";

  if (isOneOf(validBoxShadows, shadow)) {
    boxShadowValue = boxShadows[shadow];
  } else if (coloredShadow) {
    boxShadowValue = coloredShadow !== "none" ? colored[coloredShadow] : "none";
  }

  return {
    opacity,
    background: backgroundValue,
    color: colorValue,
    borderRadius: borderRadiusValue,
    boxShadow: boxShadowValue,
  };
});
