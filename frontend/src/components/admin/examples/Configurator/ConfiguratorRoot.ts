"use client";

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

// @mui material components
import Drawer from "@mui/material/Drawer";
import { styled } from "@mui/material/styles";
import type { CSSObject } from "@mui/material/styles";

export interface ConfiguratorOwnerState {
  openConfigurator: boolean;
}

export default styled(Drawer)<{ ownerState: ConfiguratorOwnerState }>(({ theme, ownerState }) => {
  const { boxShadows, functions, transitions } = theme;
  const { openConfigurator } = ownerState;

  const configuratorWidth = 360;
  const { lg } = boxShadows;
  const { pxToRem } = functions;

  // drawer styles when openConfigurator={true}
  const drawerOpenStyles = (): CSSObject => ({
    width: configuratorWidth,
    left: "initial",
    right: 0,
    transition: transitions.create("right", {
      easing: transitions.easing.sharp,
      duration: transitions.duration.short,
    }),
  });

  // drawer styles when openConfigurator={false}
  const drawerCloseStyles = (): CSSObject => ({
    left: "initial",
    right: pxToRem(-350),
    transition: transitions.create("all", {
      easing: transitions.easing.sharp,
      duration: transitions.duration.short,
    }),
  });

  return {
    "& .MuiDrawer-paper": {
      height: "100vh",
      margin: 0,
      padding: `0 ${pxToRem(10)}`,
      borderRadius: 0,
      boxShadow: lg,
      overflowY: "auto",
      ...(openConfigurator ? drawerOpenStyles() : drawerCloseStyles()),
    },
  };
});
