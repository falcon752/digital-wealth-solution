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

import { useState } from "react";
import type { ReactNode } from "react";

// @mui material components
import Fade from "@mui/material/Fade";
import type { BoxProps } from "@mui/material/Box";

// Material Dashboard 2 React components
import MDBox from "@/components/admin/components/MDBox";

// Custom styles for the MDAlert
import MDAlertRoot from "@/components/admin/components/MDAlert/MDAlertRoot";
import type { MDAlertColor } from "@/components/admin/components/MDAlert/MDAlertRoot";
import MDAlertCloseIcon from "@/components/admin/components/MDAlert/MDAlertCloseIcon";

export type { MDAlertColor };

export interface MDAlertProps extends Omit<BoxProps, "color" | "children"> {
  color?: MDAlertColor;
  dismissible?: boolean;
  children: ReactNode;
}

type AlertStatus = "mount" | "fadeOut" | "unmount";

function MDAlert({ color = "info", dismissible = false, children, ...rest }: MDAlertProps) {
  const [alertStatus, setAlertStatus] = useState<AlertStatus>("mount");

  const handleAlertStatus = () => setAlertStatus("fadeOut");

  // The base template for the alert
  const alertTemplate = (mount = true) => (
    <Fade in={mount} timeout={300}>
      <MDAlertRoot ownerState={{ color }} {...rest}>
        <MDBox display="flex" alignItems="center" color="white">
          {children}
        </MDBox>
        {dismissible ? (
          <MDAlertCloseIcon onClick={mount ? handleAlertStatus : undefined}>
            &times;
          </MDAlertCloseIcon>
        ) : null}
      </MDAlertRoot>
    </Fade>
  );

  switch (true) {
    case alertStatus === "mount":
      return alertTemplate();
    case alertStatus === "fadeOut":
      setTimeout(() => setAlertStatus("unmount"), 400);
      return alertTemplate(false);
    default:
      alertTemplate();
      break;
  }

  return null;
}

export default MDAlert;
