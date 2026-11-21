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
import colors from "@/components/admin/assets/theme-dark/base/colors";

// Material Dashboard 2 React helper functions
import pxToRem from "@/components/admin/assets/theme-dark/functions/pxToRem";
import rgba from "@/components/admin/assets/theme-dark/functions/rgba";
import type { Components, Theme } from "@mui/material/styles";

const { size, fontWeightRegular } = typography;
const { white } = colors;

const stepLabel: Components<Theme>["MuiStepLabel"] = {
  styleOverrides: {
    label: {
      marginTop: `${pxToRem(8)} !important`,
      fontWeight: fontWeightRegular,
      fontSize: size.xs,
      color: "#9fc9ff",
      textTransform: "uppercase",

      "&.Mui-active": {
        fontWeight: `${fontWeightRegular} !important`,
        color: `${rgba(white.main, 0.8)} !important`,
      },

      "&.Mui-completed": {
        fontWeight: `${fontWeightRegular} !important`,
        color: `${rgba(white.main, 0.8)} !important`,
      },
    },
  },
};

export default stepLabel;
