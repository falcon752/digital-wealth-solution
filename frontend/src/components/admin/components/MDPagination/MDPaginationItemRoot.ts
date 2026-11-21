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
import { styled } from "@mui/material/styles";

// Material Dashboard 2 React components
import MDButton from "@/components/admin/components/MDButton";
import type { MDButtonSize } from "@/components/admin/components/MDButton";

export type MDPaginationVariant = "gradient" | "contained";

export interface MDPaginationItemOwnerState {
  variant: MDPaginationVariant;
  active: boolean;
  paginationSize: MDButtonSize | null;
}

export default styled(MDButton)<{ ownerState: MDPaginationItemOwnerState }>(({
  theme,
  ownerState,
}) => {
  const { borders, functions, typography, palette } = theme;
  const { paginationSize, active } = ownerState;

  const { borderColor } = borders;
  const { pxToRem } = functions;
  const { fontWeightRegular, size: fontSize } = typography;
  const { light } = palette;

  // width, height, minWidth and minHeight values
  let sizeValue = pxToRem(36);

  if (paginationSize === "small") {
    sizeValue = pxToRem(30);
  } else if (paginationSize === "large") {
    sizeValue = pxToRem(46);
  }

  return {
    borderColor,
    margin: `0 ${pxToRem(2)}`,
    pointerEvents: active ? "none" : "auto",
    fontWeight: fontWeightRegular,
    fontSize: fontSize.sm,
    width: sizeValue,
    minWidth: sizeValue,
    height: sizeValue,
    minHeight: sizeValue,

    "&:hover, &:focus, &:active": {
      transform: "none",
      // the template's `(variant !== "gradient" || variant !== "contained") && ...` was always true
      boxShadow: "none !important",
      opacity: "1 !important",
    },

    "&:hover": {
      backgroundColor: light.main,
      borderColor,
    },
  };
});
