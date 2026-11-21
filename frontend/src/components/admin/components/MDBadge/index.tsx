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
import type { BadgeOwnProps } from "@mui/material/Badge";
import type { OverridableComponent, OverrideProps } from "@mui/material/OverridableComponent";

// Custom styles for the MDBadge
import MDBadgeRoot from "@/components/admin/components/MDBadge/MDBadgeRoot";
import type { MDBadgeColor, MDBadgeSize, MDBadgeVariant } from "@/components/admin/components/MDBadge/MDBadgeRoot";

export type { MDBadgeColor, MDBadgeSize, MDBadgeVariant };

export interface MDBadgeOwnProps {
  color?: MDBadgeColor;
  variant?: MDBadgeVariant;
  size?: MDBadgeSize;
  circular?: boolean;
  indicator?: boolean;
  border?: boolean;
  children?: ReactNode;
  container?: boolean;
}

export interface MDBadgeTypeMap<
  AdditionalProps = object,
  RootComponent extends ElementType = "span",
> {
  props: AdditionalProps & MDBadgeOwnProps & Omit<BadgeOwnProps, keyof MDBadgeOwnProps>;
  defaultComponent: RootComponent;
}

export type MDBadgeProps<
  RootComponent extends ElementType = MDBadgeTypeMap["defaultComponent"],
  AdditionalProps = object,
> = OverrideProps<MDBadgeTypeMap<AdditionalProps, RootComponent>, RootComponent> & {
  component?: ElementType;
};

const MDBadgeBase = forwardRef<HTMLSpanElement, MDBadgeProps>(
  (
    {
      color = "info",
      variant = "gradient",
      size = "sm",
      circular = false,
      indicator = false,
      border = false,
      container = false,
      children = false,
      ...rest
    },
    ref
  ) => (
    <MDBadgeRoot
      {...rest}
      ownerState={{ color, variant, size, circular, indicator, border, container, children }}
      ref={ref}
      color="default"
    >
      {children}
    </MDBadgeRoot>
  )
);
MDBadgeBase.displayName = "MDBadge";

const MDBadge = MDBadgeBase as OverridableComponent<MDBadgeTypeMap>;

export default MDBadge;
