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
import borders from "@/components/admin/assets/theme-dark/base/borders";
import boxShadows from "@/components/admin/assets/theme-dark/base/boxShadows";

// Material Dashboard 2 React helper functions
import pxToRem from "@/components/admin/assets/theme-dark/functions/pxToRem";
import type { Components, Theme } from "@mui/material/styles";

const { background } = colors;
const { borderRadius } = borders;
const { md } = boxShadows;

const tabs: Components<Theme>["MuiTabs"] = {
  styleOverrides: {
    root: {
      position: "relative",
      backgroundColor: background.card,
      borderRadius: borderRadius.xl,
      minHeight: "unset",
      padding: pxToRem(4),
    },

    flexContainer: {
      height: "100%",
      position: "relative",
      zIndex: 10,
    },

    fixed: {
      // the `overflow` shorthand also resets overflow-x (with the same !important priority)
      overflow: "unset !important",
    },

    vertical: {
      "& .MuiTabs-indicator": {
        width: "100%",
      },
    },

    indicator: {
      height: "100%",
      borderRadius: borderRadius.lg,
      backgroundColor: background.default,
      boxShadow: md,
      transition: "all 500ms ease",
    },
  },
};

export default tabs;
