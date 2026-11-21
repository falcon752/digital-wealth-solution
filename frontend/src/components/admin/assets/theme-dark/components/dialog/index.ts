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
import boxShadows from "@/components/admin/assets/theme-dark/base/boxShadows";
import type { Components, Theme } from "@mui/material/styles";

const { borderRadius } = borders;
const { xxl } = boxShadows;

const dialog: Components<Theme>["MuiDialog"] = {
  styleOverrides: {
    paper: {
      borderRadius: borderRadius.lg,
      boxShadow: xxl,
    },

    paperFullScreen: {
      borderRadius: 0,
    },
  },
};

export default dialog;
