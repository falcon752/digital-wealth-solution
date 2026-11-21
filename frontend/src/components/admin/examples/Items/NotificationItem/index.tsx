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

import { forwardRef } from "react";
import type { ReactNode } from "react";

// @mui material components
import MenuItem from "@mui/material/MenuItem";
import type { MenuItemProps } from "@mui/material/MenuItem";
import Link from "@mui/material/Link";

// Material Dashboard 2 React components
import MDBox from "@/components/admin/components/MDBox";
import MDTypography from "@/components/admin/components/MDTypography";

// custom styles for the NotificationItem
import menuItem from "@/components/admin/examples/Items/NotificationItem/styles";

export interface NotificationItemProps extends Omit<MenuItemProps, "title"> {
  icon: ReactNode;
  title: string;
}

const NotificationItem = forwardRef<HTMLLIElement, NotificationItemProps>(
  ({ icon, title, ...rest }, ref) => (
    <MenuItem {...rest} ref={ref} sx={(theme) => menuItem(theme)}>
      <MDBox component={Link} py={0.5} display="flex" alignItems="center" lineHeight={1}>
        <MDTypography variant="body1" color="secondary" lineHeight={0.75}>
          {icon}
        </MDTypography>
        <MDTypography variant="button" fontWeight="regular" sx={{ ml: 1 }}>
          {title}
        </MDTypography>
      </MDBox>
    </MenuItem>
  )
);

NotificationItem.displayName = "NotificationItem";

export default NotificationItem;
