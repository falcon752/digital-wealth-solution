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

// Material Dashboard 2 React base styles
import borders from "@/components/admin/assets/theme-dark/base/borders";

// Material Dashboard 2 React helper functions
import pxToRem from "@/components/admin/assets/theme-dark/functions/pxToRem";
import type { Components, Theme } from "@mui/material/styles";

const { borderRadius } = borders;

const tableHead: Components<Theme>["MuiTableHead"] = {
  styleOverrides: {
    root: {
      display: "block",
      padding: `${pxToRem(16)} ${pxToRem(16)} 0  ${pxToRem(16)}`,
      borderRadius: `${borderRadius.xl} ${borderRadius.xl} 0 0`,
    },
  },
};

export default tableHead;
