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

import type { ReactNode } from "react";

// @mui material components
import Snackbar from "@mui/material/Snackbar";
import IconButton from "@mui/material/IconButton";
import Icon from "@/components/admin/ui/Icon";
import Divider from "@mui/material/Divider";
import Fade from "@mui/material/Fade";
import type { SnackbarProps } from "@mui/material/Snackbar";

// Material Dashboard 2 React components
import MDBox from "@/components/admin/components/MDBox";
import MDTypography from "@/components/admin/components/MDTypography";
import type { MDTypographyColor } from "@/components/admin/components/MDTypography";

// Custom styles for the MDSnackbar
import MDSnackbarIconRoot from "@/components/admin/components/MDSnackbar/MDSnackbarIconRoot";
import type { MDSnackbarColor } from "@/components/admin/components/MDSnackbar/MDSnackbarIconRoot";

// Material Dashboard 2 React context
import { useMaterialUIController } from "@/components/admin/context";

export type { MDSnackbarColor };

export interface MDSnackbarProps extends Omit<
  SnackbarProps,
  "color" | "title" | "content" | "action" | "children"
> {
  color?: MDSnackbarColor;
  icon: ReactNode;
  title: string;
  dateTime: string;
  content: ReactNode;
  close: () => void;
  bgWhite?: boolean;
}

function MDSnackbar({
  color = "info",
  icon,
  title,
  dateTime,
  content,
  close,
  bgWhite = false,
  ...rest
}: MDSnackbarProps) {
  const [controller] = useMaterialUIController();
  const { darkMode } = controller;

  let titleColor: MDTypographyColor;
  let dateTimeColor: MDTypographyColor;
  let dividerColor: boolean;

  if (bgWhite) {
    titleColor = color;
    dateTimeColor = "dark";
    dividerColor = false;
  } else if (color === "light") {
    titleColor = darkMode ? "inherit" : "dark";
    dateTimeColor = darkMode ? "inherit" : "text";
    dividerColor = false;
  } else {
    titleColor = "white";
    dateTimeColor = "white";
    dividerColor = true;
  }

  return (
    <Snackbar
      TransitionComponent={Fade}
      autoHideDuration={5000}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "right",
      }}
      {...rest}
      action={
        <IconButton size="small" aria-label="close" color="inherit" onClick={close}>
          <Icon fontSize="small">close</Icon>
        </IconButton>
      }
    >
      <MDBox
        variant={bgWhite ? "contained" : "gradient"}
        bgColor={bgWhite ? "white" : color}
        minWidth="21.875rem"
        maxWidth="100%"
        shadow="md"
        borderRadius="md"
        p={1}
        sx={{
          // The template returned `palette[color]` (a color *object*, not a CSS value) in light
          // mode, which produced no valid background-color; the MDBox gradient/white background
          // applies instead. `undefined` keeps that exact rendering in a type-safe way.
          backgroundColor: ({ palette }) => (darkMode ? palette.background.card : undefined),
        }}
      >
        <MDBox
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          color="dark"
          p={1.5}
        >
          <MDBox display="flex" alignItems="center" lineHeight={0}>
            <MDSnackbarIconRoot fontSize="small" ownerState={{ color, bgWhite }}>
              {icon}
            </MDSnackbarIconRoot>
            <MDTypography
              variant="button"
              fontWeight="medium"
              color={titleColor}
              textGradient={bgWhite}
            >
              {title}
            </MDTypography>
          </MDBox>
          <MDBox display="flex" alignItems="center" lineHeight={0}>
            <MDTypography variant="caption" color={dateTimeColor}>
              {dateTime}
            </MDTypography>
            <Icon
              sx={{
                color: ({ palette: { dark, white } }) =>
                  (bgWhite && !darkMode) || color === "light" ? dark.main : white.main,
                fontWeight: ({ typography: { fontWeightBold } }) => fontWeightBold,
                cursor: "pointer",
                marginLeft: 2,
                transform: "translateY(-1px)",
              }}
              onClick={close}
            >
              close
            </Icon>
          </MDBox>
        </MDBox>
        <Divider sx={{ margin: 0 }} light={dividerColor} />
        <MDBox
          p={1.5}
          sx={{
            fontSize: ({ typography: { size } }) => size.sm,
            color: ({ palette: { white, text } }) => {
              let colorValue = bgWhite || color === "light" ? text.main : white.main;

              if (darkMode) {
                colorValue = color === "light" ? "inherit" : white.main;
              }

              return colorValue;
            },
          }}
        >
          {content}
        </MDBox>
      </MDBox>
    </Snackbar>
  );
}

export default MDSnackbar;
