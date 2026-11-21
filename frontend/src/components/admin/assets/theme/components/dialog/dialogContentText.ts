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
import typography from "@/components/admin/assets/theme/base/typography";
import colors from "@/components/admin/assets/theme/base/colors";
import type { Components, Theme } from "@mui/material/styles";

// Material Dashboard 2 React helper functions
// import pxToRem from "@/components/admin/assets/theme/functions/pxToRem";

const { size } = typography;
const { text } = colors;

const dialogContentText: Components<Theme>["MuiDialogContentText"] = {
  styleOverrides: {
    root: {
      fontSize: size.md,
      color: text.main,
    },
  },
};

export default dialogContentText;
