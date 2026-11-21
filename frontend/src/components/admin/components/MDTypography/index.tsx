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
import type { ElementType, ReactNode } from "react";

// @mui material components
import type { OverridableComponent, OverrideProps } from "@mui/material/OverridableComponent";
import type { TypographyOwnProps } from "@mui/material/Typography";

// Custom styles for MDTypography
import MDTypographyRoot from "@/components/admin/components/MDTypography/MDTypographyRoot";
import type {
  MDTypographyColor,
  MDTypographyFontWeight,
  MDTypographyTextTransform,
  MDTypographyVerticalAlign,
} from "@/components/admin/components/MDTypography/MDTypographyRoot";

// Material Dashboard 2 React contexts
import { useMaterialUIController } from "@/components/admin/context";

export type {
  MDTypographyColor,
  MDTypographyFontWeight,
  MDTypographyTextTransform,
  MDTypographyVerticalAlign,
};

export interface MDTypographyOwnProps {
  color?: MDTypographyColor;
  fontWeight?: MDTypographyFontWeight;
  textTransform?: MDTypographyTextTransform;
  verticalAlign?: MDTypographyVerticalAlign;
  textGradient?: boolean;
  opacity?: number;
  children: ReactNode;
}

export interface MDTypographyTypeMap<
  AdditionalProps = object,
  RootComponent extends ElementType = "span",
> {
  props: AdditionalProps &
    MDTypographyOwnProps &
    Omit<TypographyOwnProps, keyof MDTypographyOwnProps>;
  defaultComponent: RootComponent;
}

export type MDTypographyProps<
  RootComponent extends ElementType = MDTypographyTypeMap["defaultComponent"],
  AdditionalProps = object,
> = OverrideProps<MDTypographyTypeMap<AdditionalProps, RootComponent>, RootComponent> & {
  component?: ElementType;
};

const MDTypographyBase = forwardRef<HTMLSpanElement, MDTypographyProps>(
  (
    {
      color = "dark",
      fontWeight = false,
      textTransform = "none",
      verticalAlign = "unset",
      textGradient = false,
      opacity = 1,
      children,
      ...rest
    },
    ref
  ) => {
    const [controller] = useMaterialUIController();
    const { darkMode } = controller;

    return (
      <MDTypographyRoot
        {...rest}
        ref={ref}
        ownerState={{
          color,
          textTransform,
          verticalAlign,
          fontWeight,
          opacity,
          textGradient,
          darkMode,
        }}
      >
        {children}
      </MDTypographyRoot>
    );
  }
);
MDTypographyBase.displayName = "MDTypography";

const MDTypography = MDTypographyBase as OverridableComponent<MDTypographyTypeMap>;

export default MDTypography;
