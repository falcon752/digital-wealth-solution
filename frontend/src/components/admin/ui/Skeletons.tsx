"use client";

import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Skeleton from "@mui/material/Skeleton";
import MDBox from "@/components/admin/components/MDBox";

/**
 * Loading placeholders shaped like what they stand in for, so the page doesn't jump when the
 * data arrives. Use them while a query `isLoading` (first load); while it `isFetching` again,
 * keep showing the old data.
 */

/** Same footprint as ComplexStatisticsCard / StatCard. */
export function StatCardSkeleton() {
  return (
    <Card>
      <MDBox display="flex" justifyContent="space-between" pt={1} px={2}>
        <Skeleton variant="rounded" width={64} height={64} sx={{ mt: -3, borderRadius: 3 }} />
        <MDBox textAlign="right" pt={1}>
          <Skeleton variant="text" width={90} height={18} sx={{ ml: "auto" }} />
          <Skeleton variant="text" width={60} height={34} sx={{ ml: "auto" }} />
        </MDBox>
      </MDBox>
      <MDBox pb={2} px={2} pt={1}>
        <Skeleton variant="text" width="70%" height={18} />
      </MDBox>
    </Card>
  );
}

/** A table card: header bar, column titles and rows. */
export function TableSkeleton({
  rows = 8,
  columns = 5,
  header = true,
}: {
  rows?: number;
  columns?: number;
  header?: boolean;
}) {
  return (
    <Card>
      {header && (
        <MDBox mx={2} mt={-3} mb={1}>
          <Skeleton variant="rounded" height={56} sx={{ borderRadius: 2 }} />
        </MDBox>
      )}
      <MDBox px={3} py={2}>
        <TableRowsSkeleton rows={rows} columns={columns} />
      </MDBox>
    </Card>
  );
}

/** Just the rows, for inside an existing table while a page loads. */
export function TableRowsSkeleton({ rows = 8, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <>
      <MDBox display="flex" gap={2} pb={1.5}>
        {Array.from({ length: columns }, (_, c) => (
          <Skeleton key={c} variant="text" height={16} sx={{ flex: 1 }} />
        ))}
      </MDBox>
      {Array.from({ length: rows }, (_, r) => (
        <MDBox key={r} display="flex" gap={2} py={1.25} alignItems="center">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton key={c} variant="text" height={22} sx={{ flex: c === 0 ? 1.6 : 1 }} />
          ))}
        </MDBox>
      ))}
    </>
  );
}

/** A chart card (ReportsLineChart / ReportsBarChart footprint). */
export function ChartCardSkeleton({ height = 220 }: { height?: number }) {
  return (
    <Card sx={{ height: "100%" }}>
      <MDBox p={2}>
        <Skeleton variant="rounded" height={height} sx={{ mt: -5, borderRadius: 3 }} />
        <MDBox pt={2}>
          <Skeleton variant="text" width="45%" height={24} />
          <Skeleton variant="text" width="70%" height={18} />
        </MDBox>
      </MDBox>
    </Card>
  );
}

/** A detail page: a header card and a grid of label/value pairs. */
export function DetailSkeleton({ fields = 8 }: { fields?: number }) {
  return (
    <Card>
      <MDBox p={3}>
        <MDBox display="flex" alignItems="center" gap={2} mb={3}>
          <Skeleton variant="circular" width={56} height={56} />
          <MDBox flexGrow={1}>
            <Skeleton variant="text" width="35%" height={28} />
            <Skeleton variant="text" width="20%" height={18} />
          </MDBox>
        </MDBox>
        <Grid container spacing={2}>
          {Array.from({ length: fields }, (_, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="text" width="50%" height={16} />
              <Skeleton variant="text" width="80%" height={22} />
            </Grid>
          ))}
        </Grid>
      </MDBox>
    </Card>
  );
}
