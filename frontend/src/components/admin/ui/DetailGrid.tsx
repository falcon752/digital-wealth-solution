"use client";

import type { ReactNode } from "react";
import Grid from "@mui/material/Grid";
import MDBox from "@/components/admin/components/MDBox";
import MDTypography from "@/components/admin/components/MDTypography";

export interface DetailItem {
  label: string;
  value: ReactNode;
  /** Grid width on medium+ screens (12 = full row). Default 3. */
  span?: 3 | 4 | 6 | 12;
}

/** Label/value pairs for detail pages. Empty values show "—". */
export default function DetailGrid({ items }: { items: readonly DetailItem[] }) {
  return (
    <Grid container spacing={2}>
      {items.map((item) => (
        <Grid item xs={12} sm={6} md={item.span ?? 3} key={item.label}>
          <MDTypography
            variant="caption"
            color="secondary"
            fontWeight="bold"
            textTransform="uppercase"
          >
            {item.label}
          </MDTypography>
          <MDBox>
            <MDTypography
              variant="button"
              color="text"
              fontWeight="regular"
              component="div"
              sx={{ wordBreak: "break-word" }}
            >
              {item.value === null || item.value === undefined || item.value === ""
                ? "—"
                : item.value}
            </MDTypography>
          </MDBox>
        </Grid>
      ))}
    </Grid>
  );
}
