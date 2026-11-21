"use client";

import type { ReactNode } from "react";
import DashboardLayout from "@/components/admin/examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "@/components/admin/examples/Navbars/DashboardNavbar";
import Footer from "@/components/admin/examples/Footer";
import MDBox from "@/components/admin/components/MDBox";
import MDTypography from "@/components/admin/components/MDTypography";

interface AdminPageProps {
  /** Page heading (the navbar's breadcrumbs follow the URL). */
  title?: string;
  description?: ReactNode;
  /** Buttons on the right of the heading. */
  actions?: ReactNode;
  children: ReactNode;
}

/** Every admin page: the template's dashboard layout, navbar, a heading, content, footer. */
export default function AdminPage({ title, description, actions, children }: AdminPageProps) {
  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={2} pb={3}>
        {(title || actions) && (
          <MDBox
            display="flex"
            justifyContent="space-between"
            alignItems="flex-start"
            flexWrap="wrap"
            gap={2}
            mb={4}
          >
            <MDBox>
              {title && (
                <MDTypography variant="h4" fontWeight="medium">
                  {title}
                </MDTypography>
              )}
              {description && (
                <MDTypography variant="button" color="text" fontWeight="regular">
                  {description}
                </MDTypography>
              )}
            </MDBox>
            {actions && (
              <MDBox display="flex" gap={1} flexWrap="wrap">
                {actions}
              </MDBox>
            )}
          </MDBox>
        )}
        {children}
      </MDBox>
      <Footer />
    </DashboardLayout>
  );
}
