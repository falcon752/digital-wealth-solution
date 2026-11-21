"use client";

import MDBox from "@/components/admin/components/MDBox";
import MDTypography from "@/components/admin/components/MDTypography";

/** Bottom of every admin page. */
function Footer() {
  return (
    <MDBox
      width="100%"
      display="flex"
      flexDirection={{ xs: "column", lg: "row" }}
      justifyContent="space-between"
      alignItems="center"
      gap={1}
      px={1.5}
      pt={2}
    >
      <MDTypography variant="button" color="text" fontWeight="regular">
        &copy; {new Date().getFullYear()} Digital Wealth Partners · Admin
      </MDTypography>
      <MDTypography variant="button" color="text" fontWeight="regular">
        digitalwealthpartnersllc.net
      </MDTypography>
    </MDBox>
  );
}

export default Footer;
