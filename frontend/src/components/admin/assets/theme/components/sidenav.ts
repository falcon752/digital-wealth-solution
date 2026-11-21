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

// Material Dashboard 2 React helper functions
import pxToRem from "@/components/admin/assets/theme/functions/pxToRem";
import type { Components, Theme } from "@mui/material/styles";

const { white } = colors;
const { borderRadius } = borders;

const sidenav: Components<Theme>["MuiDrawer"] = {
  // The template's sidebar look is for the permanent drawers (sidebar, settings panel).
  // Pop-out drawers (detail panels) size to their content, wrap text and scroll.
  styleOverrides: {
    root: ({ ownerState }) =>
      ownerState.variant === "permanent"
        ? { width: pxToRem(250), whiteSpace: "nowrap", border: "none" }
        : {},

    paper: ({ ownerState }) =>
      ownerState.variant === "permanent"
        ? {
            width: pxToRem(250),
            backgroundColor: white.main,
            height: `calc(100vh - ${pxToRem(32)})`,
            margin: pxToRem(16),
            borderRadius: borderRadius.xl,
            border: "none",
          }
        : {
            backgroundColor: white.main,
            backgroundImage: "none",
            height: `calc(100% - ${pxToRem(32)})`,
            maxWidth: `calc(100vw - ${pxToRem(32)})`,
            margin: pxToRem(16),
            borderRadius: borderRadius.xl,
            whiteSpace: "normal",
            overflowX: "hidden",
          },

    paperAnchorDockedLeft: {
      borderRight: "none",
    },
  },
};

export default sidenav;
