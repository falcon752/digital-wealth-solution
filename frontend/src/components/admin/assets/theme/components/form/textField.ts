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

// Material Dashboard 2 React Base Styles
import colors from "@/components/admin/assets/theme/base/colors";
import type { Components, Theme } from "@mui/material/styles";

const { transparent } = colors;

const textField: Components<Theme>["MuiTextField"] = {
  styleOverrides: {
    root: {
      backgroundColor: transparent.main,
    },
  },
};

export default textField;
