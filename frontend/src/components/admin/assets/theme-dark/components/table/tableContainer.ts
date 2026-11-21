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
import colors from "@/components/admin/assets/theme-dark/base/colors";
import boxShadows from "@/components/admin/assets/theme-dark/base/boxShadows";
import borders from "@/components/admin/assets/theme-dark/base/borders";
import type { Components, Theme } from "@mui/material/styles";

const { background } = colors;
const { md } = boxShadows;
const { borderRadius } = borders;

const tableContainer: Components<Theme>["MuiTableContainer"] = {
  styleOverrides: {
    root: {
      backgroundColor: background.card,
      boxShadow: md,
      borderRadius: borderRadius.xl,
    },
  },
};

export default tableContainer;
