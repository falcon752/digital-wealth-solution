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
import { usePathname } from "next/navigation";

// Material Dashboard 2 React components
import MDBox from "@/components/admin/components/MDBox";

// Material Dashboard 2 React context
import { useMaterialUIController, setLayout } from "@/components/admin/context";

export interface PageLayoutProps {
  background?: "white" | "light" | "default";
  children: ReactNode;
}

function PageLayout({ background = "default", children }: PageLayoutProps) {
  const [, dispatch] = useMaterialUIController();
  const pathname = usePathname();

  useEffect(() => {
    setLayout(dispatch, "page");
  }, [dispatch, pathname]);

  return (
    <MDBox
      width="100vw"
      height="100%"
      minHeight="100vh"
      bgColor={background}
      sx={{ overflowX: "hidden" }}
    >
      {children}
    </MDBox>
  );
}

export default PageLayout;
