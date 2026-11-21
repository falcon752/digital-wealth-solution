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

// Material Dashboard 2 React helper functions
import pxToRem from "@/components/admin/assets/theme-dark/functions/pxToRem";

// Material Dashboard 2 React base styles
import colors from "@/components/admin/assets/theme-dark/base/colors";
import boxShadows from "@/components/admin/assets/theme-dark/base/boxShadows";
import borders from "@/components/admin/assets/theme-dark/base/borders";
import type { Components, Theme } from "@mui/material/styles";

const { transparent } = colors;
const { md } = boxShadows;
const { borderRadius } = borders;

const popover: Components<Theme>["MuiPopover"] = {
  styleOverrides: {
    paper: {
      backgroundColor: transparent.main,
      boxShadow: md,
      padding: pxToRem(8),
      borderRadius: borderRadius.md,
    },
  },
};

export default popover;
