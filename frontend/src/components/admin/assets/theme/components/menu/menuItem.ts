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
import colors from "@/components/admin/assets/theme/base/colors";
import borders from "@/components/admin/assets/theme/base/borders";
import typography from "@/components/admin/assets/theme/base/typography";

// Material Dashboard 2 React helper functions
import pxToRem from "@/components/admin/assets/theme/functions/pxToRem";
import type { Components, Theme } from "@mui/material/styles";

const { light, text, dark } = colors;
const { borderRadius } = borders;
const { size } = typography;

const menuItem: Components<Theme>["MuiMenuItem"] = {
  styleOverrides: {
    root: {
      minWidth: pxToRem(160),
      minHeight: "unset",
      padding: `${pxToRem(4.8)} ${pxToRem(16)}`,
      borderRadius: borderRadius.md,
      fontSize: size.sm,
      color: text.main,
      transition: "background-color 300ms ease, color 300ms ease",

      "&:hover, &:focus, &.Mui-selected, &.Mui-selected:hover, &.Mui-selected:focus": {
        backgroundColor: light.main,
        color: dark.main,
      },
    },
  },
};

export default menuItem;
