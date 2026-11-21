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

import { NAVIGATION } from "@/components/admin/navigation";
import type { ReactNode } from "react";

// Next.js components
import Link from "next/link";

// @mui material components
import { Breadcrumbs as MuiBreadcrumbs } from "@mui/material";
import Icon from "@/components/admin/ui/Icon";

// Material Dashboard 2 React components
import MDBox from "@/components/admin/components/MDBox";
import MDTypography from "@/components/admin/components/MDTypography";

export interface BreadcrumbsProps {
  icon: ReactNode;
  title: string;
  /** The path segments, e.g. `["dashboard", "users"]`. */
  route: string[];
  light?: boolean;
}

/** A URL segment as a crumb: the section's sidebar name, "KIK-…" refs as they are, ids as "Details". */
function segmentLabel(segment: string): string {
  if (segment === "admin") return "Overview";
  const page = NAVIGATION.find((item) => item.type === "collapse" && item.key === segment);
  if (page && page.type === "collapse") return page.name;
  if (/^[0-9a-f-]{20,}$/i.test(segment) || /\d{4,}/.test(segment)) return "Details";
  return decodeURIComponent(segment).replace(/-/g, " ");
}

function Breadcrumbs({ icon, title, route, light = false }: BreadcrumbsProps) {
  // Each crumb links to the path up to it (/users, then /users/123).
  const routes = route.slice(0, -1).map((segment, index) => ({
    segment,
    href: `/${route.slice(0, index + 1).join("/")}`,
  }));

  return (
    <MDBox mr={{ xs: 0, xl: 8 }}>
      <MuiBreadcrumbs
        sx={{
          "& .MuiBreadcrumbs-separator": {
            color: ({ palette: { white, grey } }) => (light ? white.main : grey[600]),
          },
        }}
      >
        <Link href="/admin">
          <MDTypography
            component="span"
            variant="body2"
            color={light ? "white" : "dark"}
            opacity={light ? 0.8 : 0.5}
            sx={{ lineHeight: 0 }}
          >
            <Icon>{icon}</Icon>
          </MDTypography>
        </Link>
        {routes.map(({ segment, href }) => (
          <Link href={href} key={href}>
            <MDTypography
              component="span"
              variant="button"
              fontWeight="regular"
              textTransform="capitalize"
              color={light ? "white" : "dark"}
              opacity={light ? 0.8 : 0.5}
              sx={{ lineHeight: 0 }}
            >
              {segmentLabel(segment)}
            </MDTypography>
          </Link>
        ))}
        <MDTypography
          variant="button"
          fontWeight="regular"
          textTransform="capitalize"
          color={light ? "white" : "dark"}
          sx={{ lineHeight: 0 }}
        >
          {segmentLabel(title)}
        </MDTypography>
      </MuiBreadcrumbs>
      <MDTypography
        fontWeight="bold"
        textTransform="capitalize"
        variant="h6"
        color={light ? "white" : "dark"}
        noWrap
      >
        {segmentLabel(title)}
      </MDTypography>
    </MDBox>
  );
}

export default Breadcrumbs;
