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

import { useEffect } from "react";
import type { ReactNode } from "react";

// Next.js components
import NextLink from "next/link";
import { usePathname } from "next/navigation";

// @mui material components
import List from "@mui/material/List";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import Icon from "@/components/admin/ui/Icon";
import type { DrawerProps } from "@mui/material/Drawer";

// Material Dashboard 2 React components
import MDBox from "@/components/admin/components/MDBox";
import MDTypography from "@/components/admin/components/MDTypography";
import type { MDTypographyColor } from "@/components/admin/components/MDTypography";

// Material Dashboard 2 React example components
import SidenavCollapse from "@/components/admin/examples/Sidenav/SidenavCollapse";
import { navKeyFor } from "@/components/admin/navigation";

// Custom styles for the Sidenav
import SidenavRoot from "@/components/admin/examples/Sidenav/SidenavRoot";
import sidenavLogoLabel from "@/components/admin/examples/Sidenav/styles/sidenav";

// Material Dashboard 2 React context
import {
  useMaterialUIController,
  setMiniSidenav,
  setTransparentSidenav,
  setWhiteSidenav,
} from "@/components/admin/context";

/** A link to a page (`route`) or, when `href` is set, to an external site. */
export interface SidenavCollapseRoute {
  type: "collapse";
  key: string;
  name: string;
  icon: ReactNode;
  route: string;
  href?: string;
  noCollapse?: boolean;
  component?: ReactNode;
  /** A live count shown next to the name. */
  count?: number;
}

export interface SidenavTitleRoute {
  type: "title";
  key: string;
  title: string;
}

export interface SidenavDividerRoute {
  type: "divider";
  key: string;
}

export type SidenavRoute = SidenavCollapseRoute | SidenavTitleRoute | SidenavDividerRoute;

export interface SidenavProps extends Omit<DrawerProps, "color"> {
  brand?: string;
  brandName: string;
  routes: SidenavRoute[];
  /** Shown at the bottom of the sidebar (e.g. the signed-in person and "Sign out"). */
  footer?: ReactNode;
}

function Sidenav({ brand = "", brandName, routes, footer, ...rest }: SidenavProps) {
  const [controller, dispatch] = useMaterialUIController();
  const { miniSidenav, transparentSidenav, whiteSidenav, darkMode } = controller;
  const pathname = usePathname();
  // The segment after /admin, so detail pages (/admin/users/123) highlight their section too.
  const collapseName = navKeyFor(pathname);

  let textColor: MDTypographyColor = "white";

  if (transparentSidenav || (whiteSidenav && !darkMode)) {
    textColor = "dark";
  } else if (whiteSidenav && darkMode) {
    textColor = "inherit";
  }

  const closeSidenav = () => setMiniSidenav(dispatch, true);

  useEffect(() => {
    // A function that sets the mini state of the sidenav.
    function handleMiniSidenav() {
      setMiniSidenav(dispatch, window.innerWidth < 1200);
      setTransparentSidenav(dispatch, window.innerWidth < 1200 ? false : transparentSidenav);
      setWhiteSidenav(dispatch, window.innerWidth < 1200 ? false : whiteSidenav);
    }

    /** 
     The event listener that's calling the handleMiniSidenav function when resizing the window.
    */
    window.addEventListener("resize", handleMiniSidenav);

    // Call the handleMiniSidenav function to set the state with the initial value.
    handleMiniSidenav();

    // Remove event listener on cleanup
    return () => window.removeEventListener("resize", handleMiniSidenav);
  }, [dispatch, pathname, transparentSidenav, whiteSidenav]);

  // Render all the routes from the routes.js (All the visible items on the Sidenav)
  const renderRoutes = routes.map((item) => {
    let returnValue: ReactNode;

    if (item.type === "collapse") {
      const { name, icon, noCollapse, key, href, route, count } = item;
      returnValue = href ? (
        <Link
          href={href}
          key={key}
          target="_blank"
          rel="noreferrer"
          sx={{ textDecoration: "none" }}
        >
          <SidenavCollapse
            name={name}
            icon={icon}
            active={key === collapseName}
            noCollapse={noCollapse}
          />
        </Link>
      ) : (
        <NextLink key={key} href={route}>
          <SidenavCollapse name={name} icon={icon} active={key === collapseName} count={count} />
        </NextLink>
      );
    } else if (item.type === "title") {
      const { key, title } = item;
      returnValue = (
        <MDTypography
          key={key}
          color={textColor}
          display="block"
          variant="caption"
          fontWeight="bold"
          textTransform="uppercase"
          pl={3}
          mt={2}
          mb={1}
          ml={1}
        >
          {title}
        </MDTypography>
      );
    } else if (item.type === "divider") {
      const { key } = item;
      returnValue = (
        <Divider
          key={key}
          light={
            (!darkMode && !whiteSidenav && !transparentSidenav) ||
            (darkMode && !transparentSidenav && whiteSidenav)
          }
        />
      );
    }

    return returnValue;
  });

  return (
    <SidenavRoot
      {...rest}
      variant="permanent"
      ownerState={{ transparentSidenav, whiteSidenav, miniSidenav, darkMode }}
    >
      <MDBox pt={3} pb={1} px={4} textAlign="center">
        <MDBox
          display={{ xs: "block", xl: "none" }}
          position="absolute"
          top={0}
          right={0}
          p={1.625}
          onClick={closeSidenav}
          sx={{ cursor: "pointer" }}
        >
          <MDTypography variant="h6" color="secondary">
            <Icon sx={{ fontWeight: "bold" }}>close</Icon>
          </MDTypography>
        </MDBox>
        <MDBox component={NextLink} href="/admin" display="flex" alignItems="center">
          {brand && <MDBox component="img" src={brand} alt="Digital Wealth Partners" width="3.5rem" mr={0.5} />}
          {/* The template's `!brandName && "100%"` yielded `false` here, which MUI's width
              transform renders as "0%"; the explicit value keeps that output. */}
          <MDBox
            width={!brandName ? "100%" : "0%"}
            sx={(theme) => sidenavLogoLabel(theme, { miniSidenav })}
          >
            <MDTypography component="h6" variant="button" fontWeight="medium" color={textColor}>
              {brandName}
            </MDTypography>
          </MDBox>
        </MDBox>
      </MDBox>
      <Divider
        light={
          (!darkMode && !whiteSidenav && !transparentSidenav) ||
          (darkMode && !transparentSidenav && whiteSidenav)
        }
      />
      <List>{renderRoutes}</List>
      {footer && (
        <MDBox p={2} mt="auto">
          {footer}
        </MDBox>
      )}
    </SidenavRoot>
  );
}

export default Sidenav;
