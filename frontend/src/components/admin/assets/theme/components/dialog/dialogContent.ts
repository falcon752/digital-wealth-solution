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
import borders from "@/components/admin/assets/theme/base/borders";
import colors from "@/components/admin/assets/theme/base/colors";

// Material Dashboard 2 React helper functions
import pxToRem from "@/components/admin/assets/theme/functions/pxToRem";
import type { Components, Theme } from "@mui/material/styles";

const { size } = typography;
const { text } = colors;
const { borderWidth, borderColor } = borders;

const dialogContent: Components<Theme>["MuiDialogContent"] = {
  styleOverrides: {
    root: {
      padding: pxToRem(16),
      fontSize: size.md,
      color: text.main,
    },

    dividers: {
      borderTop: `${borderWidth[1]} solid ${borderColor}`,
      borderBottom: `${borderWidth[1]} solid ${borderColor}`,
    },
  },
};

export default dialogContent;
