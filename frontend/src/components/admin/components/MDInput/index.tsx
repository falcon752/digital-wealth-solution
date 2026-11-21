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
import type { TextFieldProps } from "@mui/material/TextField";

// Custom styles for MDInput
import MDInputRoot from "@/components/admin/components/MDInput/MDInputRoot";

export type MDInputProps = TextFieldProps & {
  error?: boolean;
  success?: boolean;
  disabled?: boolean;
};

const MDInput = forwardRef<HTMLDivElement, MDInputProps>(
  ({ error = false, success = false, disabled = false, ...rest }, ref) => (
    <MDInputRoot {...rest} ref={ref} ownerState={{ error, success, disabled }} />
  )
);

MDInput.displayName = "MDInput";

export default MDInput;
