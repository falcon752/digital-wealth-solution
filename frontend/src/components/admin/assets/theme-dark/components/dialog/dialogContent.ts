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
import typography from "@/components/admin/assets/theme-dark/base/typography";
import borders from "@/components/admin/assets/theme-dark/base/borders";
import colors from "@/components/admin/assets/theme-dark/base/colors";

// Material Dashboard 2 React helper functions
import pxToRem from "@/components/admin/assets/theme-dark/functions/pxToRem";
import rgba from "@/components/admin/assets/theme-dark/functions/rgba";
import type { Components, Theme } from "@mui/material/styles";

const { size } = typography;
const { white } = colors;
const { borderWidth, borderColor } = borders;

const dialogContent: Components<Theme>["MuiDialogContent"] = {
  styleOverrides: {
    root: {
      padding: pxToRem(16),
      fontSize: size.md,
      color: rgba(white.main, 0.8),
    },

    dividers: {
      borderTop: `${borderWidth[1]} solid ${rgba(borderColor, 0.6)}`,
      borderBottom: `${borderWidth[1]} solid ${rgba(borderColor, 0.6)}`,
    },
  },
};

export default dialogContent;
