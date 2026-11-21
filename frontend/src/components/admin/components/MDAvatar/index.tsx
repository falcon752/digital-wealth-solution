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
import type { AvatarOwnProps } from "@mui/material/Avatar";
import type { OverridableComponent, OverrideProps } from "@mui/material/OverridableComponent";

// Custom styles for MDAvatar
import MDAvatarRoot from "@/components/admin/components/MDAvatar/MDAvatarRoot";
import type {
  MDAvatarBgColor,
  MDAvatarShadow,
  MDAvatarSize,
} from "@/components/admin/components/MDAvatar/MDAvatarRoot";

export type { MDAvatarBgColor, MDAvatarShadow, MDAvatarSize };

export interface MDAvatarOwnProps {
  bgColor?: MDAvatarBgColor;
  size?: MDAvatarSize;
  shadow?: MDAvatarShadow;
}

export interface MDAvatarTypeMap<
  AdditionalProps = object,
  RootComponent extends ElementType = "div",
> {
  props: AdditionalProps & MDAvatarOwnProps & Omit<AvatarOwnProps, keyof MDAvatarOwnProps>;
  defaultComponent: RootComponent;
}

export type MDAvatarProps<
  RootComponent extends ElementType = MDAvatarTypeMap["defaultComponent"],
  AdditionalProps = object,
> = OverrideProps<MDAvatarTypeMap<AdditionalProps, RootComponent>, RootComponent> & {
  component?: ElementType;
};

const MDAvatarBase = forwardRef<HTMLDivElement, MDAvatarProps>(
  ({ bgColor = "transparent", size = "md", shadow = "none", ...rest }, ref) => (
    <MDAvatarRoot ref={ref} ownerState={{ shadow, bgColor, size }} {...rest} />
  )
);
MDAvatarBase.displayName = "MDAvatar";

const MDAvatar = MDAvatarBase as OverridableComponent<MDAvatarTypeMap>;

export default MDAvatar;
