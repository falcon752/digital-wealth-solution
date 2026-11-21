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

// @mui material components
import type { LinearProgressProps } from "@mui/material/LinearProgress";

// Material Dashboard 2 React components
import MDTypography from "@/components/admin/components/MDTypography";

// Custom styles for MDProgress
import MDProgressRoot from "@/components/admin/components/MDProgress/MDProgressRoot";
import type { MDProgressColor, MDProgressVariant } from "@/components/admin/components/MDProgress/MDProgressRoot";

export type { MDProgressColor, MDProgressVariant };

export interface MDProgressProps extends Omit<LinearProgressProps, "variant" | "color" | "value"> {
  variant?: MDProgressVariant;
  color?: MDProgressColor;
  value?: number;
  label?: boolean;
}

const MDProgress = forwardRef<HTMLSpanElement, MDProgressProps>(
  ({ variant = "contained", color = "info", value = 0, label = false, ...rest }, ref) => (
    <>
      {label && (
        <MDTypography variant="button" fontWeight="medium" color="text">
          {value}%
        </MDTypography>
      )}
      <MDProgressRoot
        {...rest}
        ref={ref}
        variant="determinate"
        value={value}
        ownerState={{ color, value, variant }}
      />
    </>
  )
);

MDProgress.displayName = "MDProgress";

export default MDProgress;
