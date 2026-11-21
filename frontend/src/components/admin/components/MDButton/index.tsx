"use client";

/**
=========================================================
* Material Dashboard 2 React - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/soft-ui-dashboard-pro-react
* Copyright 2021 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { forwardRef } from "react";
import type { ElementType, ReactNode } from "react";

// @mui material components
import type { ButtonOwnProps } from "@mui/material/Button";
import type { ExtendButtonBase, ExtendButtonBaseTypeMap } from "@mui/material/ButtonBase";
import type { OverrideProps } from "@mui/material/OverridableComponent";

// Custom styles for MDButton
import MDButtonRoot from "@/components/admin/components/MDButton/MDButtonRoot";
import type {
  MDButtonColor,
  MDButtonSize,
  MDButtonVariant,
} from "@/components/admin/components/MDButton/MDButtonRoot";

// Material Dashboard 2 React contexts
import { useMaterialUIController } from "@/components/admin/context";

export type { MDButtonColor, MDButtonSize, MDButtonVariant };

export interface MDButtonOwnProps {
  size?: MDButtonSize;
  variant?: MDButtonVariant;
  color?: MDButtonColor;
  circular?: boolean;
  iconOnly?: boolean;
  children: ReactNode;
}

export type MDButtonTypeMap<
  AdditionalProps = object,
  RootComponent extends ElementType = "button",
> = ExtendButtonBaseTypeMap<{
  props: AdditionalProps & MDButtonOwnProps & Omit<ButtonOwnProps, keyof MDButtonOwnProps>;
  defaultComponent: RootComponent;
}>;

export type MDButtonProps<
  RootComponent extends ElementType = MDButtonTypeMap["defaultComponent"],
  AdditionalProps = object,
> = OverrideProps<MDButtonTypeMap<AdditionalProps, RootComponent>, RootComponent> & {
  component?: ElementType;
};

const MDButtonBase = forwardRef<HTMLButtonElement, MDButtonProps>(
  (
    {
      color = "white",
      variant = "contained",
      size = "medium",
      circular = false,
      iconOnly = false,
      children,
      ...rest
    },
    ref
  ) => {
    const [controller] = useMaterialUIController();
    const { darkMode } = controller;

    return (
      <MDButtonRoot
        {...rest}
        ref={ref}
        color="primary"
        variant={variant === "gradient" ? "contained" : variant}
        size={size}
        ownerState={{ color, variant, size, circular, iconOnly, darkMode }}
      >
        {children}
      </MDButtonRoot>
    );
  }
);
MDButtonBase.displayName = "MDButton";

const MDButton = MDButtonBase as ExtendButtonBase<MDButtonTypeMap>;

export default MDButton;
