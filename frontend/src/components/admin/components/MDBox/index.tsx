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

import { forwardRef } from "react";
import type { ElementType } from "react";

// @mui material components
import type { Theme } from "@mui/material/styles";
import type { OverridableComponent, OverrideProps } from "@mui/material/OverridableComponent";
import type { BoxTypeMap } from "@mui/system";

// Material Dashboard 2 React theme types
import type {
  BorderRadiusName,
  BoxShadowName,
  GreyColorName,
  PaletteColorName,
} from "@/components/admin/assets/theme/types";

// Custom styles for MDBox
import MDBoxRoot from "@/components/admin/components/MDBox/MDBoxRoot";
import type { MDBoxColoredShadow, MDBoxVariant } from "@/components/admin/components/MDBox/MDBoxRoot";

/** A theme color name, or any other CSS color value. */
export type MDBoxColor = PaletteColorName | GreyColorName | (string & {});

export interface MDBoxOwnProps {
  variant?: MDBoxVariant;
  bgColor?: MDBoxColor;
  color?: MDBoxColor;
  opacity?: number;
  /** A theme border radius name, or any other CSS border-radius value. */
  borderRadius?: BorderRadiusName | "none" | (string & {});
  /** A theme box shadow name, or "none". */
  shadow?: BoxShadowName | "none" | (string & {});
  coloredShadow?: MDBoxColoredShadow;
}

export interface MDBoxTypeMap<AdditionalProps = object, RootComponent extends ElementType = "div"> {
  props: AdditionalProps &
    MDBoxOwnProps &
    Omit<BoxTypeMap<object, RootComponent, Theme>["props"], keyof MDBoxOwnProps>;
  defaultComponent: RootComponent;
}

export type MDBoxProps<
  RootComponent extends ElementType = MDBoxTypeMap["defaultComponent"],
  AdditionalProps = object,
> = OverrideProps<MDBoxTypeMap<AdditionalProps, RootComponent>, RootComponent> & {
  component?: ElementType;
};

const MDBoxBase = forwardRef<HTMLDivElement, MDBoxProps>(
  (
    {
      variant = "contained",
      bgColor = "transparent",
      color = "dark",
      opacity = 1,
      borderRadius = "none",
      shadow = "none",
      coloredShadow = "none",
      ...rest
    },
    ref
  ) => (
    <MDBoxRoot
      {...rest}
      ref={ref}
      ownerState={{ variant, bgColor, color, opacity, borderRadius, shadow, coloredShadow }}
    />
  )
);
MDBoxBase.displayName = "MDBox";

const MDBox = MDBoxBase as OverridableComponent<MDBoxTypeMap>;

export default MDBox;
