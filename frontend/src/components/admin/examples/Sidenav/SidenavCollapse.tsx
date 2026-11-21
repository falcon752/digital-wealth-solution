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
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Badge from "@mui/material/Badge";
import Icon from "@/components/admin/ui/Icon";

// Material Dashboard 2 React components
import MDBox from "@/components/admin/components/MDBox";
import type { MDBoxProps } from "@/components/admin/components/MDBox";

// Custom styles for the SidenavCollapse
import {
  collapseItem,
  collapseIconBox,
  collapseIcon,
  collapseText,
} from "@/components/admin/examples/Sidenav/styles/sidenavCollapse";

// Material Dashboard 2 React context
import { useMaterialUIController } from "@/components/admin/context";

export interface SidenavCollapseProps extends Omit<MDBoxProps, "children"> {
  icon: ReactNode;
  name: string;
  active?: boolean;
  /** Route config flag; the template forwards it to the MDBox like any other extra prop. */
  noCollapse?: boolean;
  /** Something needing attention here (e.g. unresolved errors); hidden at 0. */
  count?: number;
}

function SidenavCollapse({ icon, name, active = false, count = 0, ...rest }: SidenavCollapseProps) {
  const [controller] = useMaterialUIController();
  const { miniSidenav, transparentSidenav, whiteSidenav, darkMode, sidenavColor } = controller;

  return (
    <ListItem component="li">
      <MDBox
        {...rest}
        sx={(theme) =>
          collapseItem(theme, {
            active,
            transparentSidenav,
            whiteSidenav,
            darkMode,
            sidenavColor,
          })
        }
      >
        <ListItemIcon
          sx={(theme) =>
            collapseIconBox(theme, { transparentSidenav, whiteSidenav, darkMode, active })
          }
        >
          <Badge
            color="error"
            variant="dot"
            invisible={!(miniSidenav && count > 0)}
            overlap="circular"
          >
            {typeof icon === "string" ? (
              <Icon sx={(theme) => collapseIcon(theme, { active })}>{icon}</Icon>
            ) : (
              icon
            )}
          </Badge>
        </ListItemIcon>

        <ListItemText
          primary={name}
          sx={(theme) =>
            collapseText(theme, {
              miniSidenav,
              transparentSidenav,
              whiteSidenav,
              active,
            })
          }
        />
        {count > 0 && !miniSidenav && (
          <MDBox
            component="span"
            aria-label={`${count} need attention`}
            ml="auto"
            px={0.75}
            minWidth="1.4rem"
            textAlign="center"
            borderRadius="lg"
            bgColor="error"
            color="white"
            sx={{ fontSize: "0.7rem", fontWeight: 700, lineHeight: "1.3rem" }}
          >
            {count > 99 ? "99+" : count}
          </MDBox>
        )}
      </MDBox>
    </ListItem>
  );
}

export default SidenavCollapse;
