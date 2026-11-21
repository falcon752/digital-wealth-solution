"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import Card from "@mui/material/Card";
import Icon from "@/components/admin/ui/Icon";
import LinearProgress from "@mui/material/LinearProgress";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import MDBox from "@/components/admin/components/MDBox";
import MDButton from "@/components/admin/components/MDButton";
import MDTypography from "@/components/admin/components/MDTypography";
import { errorMessage } from "@/components/admin/lib/errors";
import { TableRowsSkeleton } from "./Skeletons";
import { useAccent } from "./useAccent";

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  width?: number | string;
  /** Hide on small screens. */
  hideOnMobile?: boolean;
}

export interface CursorPaging {
  page: number;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
}

interface DataTableCardProps<T> {
  title: string;
  /** Under the title, e.g. a count or what the list shows. */
  subtitle?: ReactNode;
  columns: readonly Column<T>[];
  rows: readonly T[] | undefined;
  rowKey: (row: T) => string;
  /** First load: skeleton rows. */
  isLoading: boolean;
  /** Refetching (filters, paging, focus): a thin progress bar over the old rows. */
  isFetching?: boolean;
  error?: unknown;
  onRetry?: () => void;
  emptyMessage?: string;
  /** Filters and actions shown between the header and the table. */
  toolbar?: ReactNode;
  /** Button(s) in the header bar, e.g. "Invite". */
  actions?: ReactNode;
  /** Makes rows clickable. */
  rowHref?: (row: T) => string;
  paging?: CursorPaging;
}

/**
 * A list page's card, in the template's style (coloured header bar, MUI table), for data
 * paged by the API. Shows skeleton rows on first load, the old rows with a progress bar while
 * refetching, and a message with a retry button on error.
 */
export default function DataTableCard<T>({
  title,
  subtitle,
  columns,
  rows,
  rowKey,
  isLoading,
  isFetching = false,
  error,
  onRetry,
  emptyMessage = "Nothing here yet.",
  toolbar,
  actions,
  rowHref,
  paging,
}: DataTableCardProps<T>) {
  const accent = useAccent();
  const router = useRouter();
  const showError = Boolean(error) && !isLoading;

  return (
    <Card>
      <MDBox
        mx={2}
        mt={-3}
        py={2}
        px={2}
        variant="gradient"
        bgColor={accent}
        borderRadius="lg"
        coloredShadow={accent}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
        flexWrap="wrap"
      >
        <MDBox>
          <MDTypography variant="h6" color="white">
            {title}
          </MDTypography>
          {subtitle && (
            <MDTypography variant="button" color="white" opacity={0.8} fontWeight="regular">
              {subtitle}
            </MDTypography>
          )}
        </MDBox>
        {actions && (
          <MDBox display="flex" gap={1}>
            {actions}
          </MDBox>
        )}
      </MDBox>

      {toolbar && (
        <MDBox px={3} pt={3} display="flex" gap={2} flexWrap="wrap" alignItems="center">
          {toolbar}
        </MDBox>
      )}

      <MDBox position="relative" pt={1}>
        {isFetching && !isLoading && (
          <LinearProgress
            color="inherit"
            sx={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, overflow: "hidden" }}
          />
        )}

        {isLoading ? (
          <MDBox px={3} py={2}>
            <TableRowsSkeleton rows={8} columns={Math.min(columns.length, 6)} />
          </MDBox>
        ) : showError ? (
          <MDBox px={3} py={6} textAlign="center">
            <Icon color="error" fontSize="large">
              error_outline
            </Icon>
            <MDTypography variant="button" display="block" color="text" mt={1} mb={2}>
              {errorMessage(error)}
            </MDTypography>
            {onRetry && (
              <MDButton variant="outlined" color={accent} size="small" onClick={onRetry}>
                Try again
              </MDButton>
            )}
          </MDBox>
        ) : !rows || rows.length === 0 ? (
          <MDBox px={3} py={6} textAlign="center">
            <Icon fontSize="large" sx={{ color: "text.disabled" }}>
              inbox
            </Icon>
            <MDTypography variant="button" display="block" color="text" mt={1}>
              {emptyMessage}
            </MDTypography>
          </MDBox>
        ) : (
          <TableContainer sx={{ boxShadow: "none" }}>
            <Table>
              <MDBox component="thead">
                <TableRow>
                  {columns.map((column) => (
                    <MDBox
                      key={column.key}
                      component="th"
                      width={column.width ?? "auto"}
                      py={1.5}
                      px={3}
                      textAlign={column.align ?? "left"}
                      display={column.hideOnMobile ? { xs: "none", md: "table-cell" } : undefined}
                      sx={({ palette: { light }, borders: { borderWidth } }) => ({
                        borderBottom: `${borderWidth[1]} solid ${light.main}`,
                      })}
                    >
                      <MDTypography
                        variant="caption"
                        color="secondary"
                        fontWeight="bold"
                        textTransform="uppercase"
                        opacity={0.7}
                      >
                        {column.header}
                      </MDTypography>
                    </MDBox>
                  ))}
                </TableRow>
              </MDBox>
              <TableBody>
                {rows.map((row) => {
                  const href = rowHref?.(row);
                  return (
                    <TableRow
                      key={rowKey(row)}
                      hover={Boolean(href)}
                      onClick={href ? () => router.push(href) : undefined}
                      sx={href ? { cursor: "pointer" } : undefined}
                    >
                      {columns.map((column) => (
                        <TableCell
                          key={column.key}
                          align={column.align ?? "left"}
                          sx={{
                            px: 3,
                            py: 1.5,
                            display: column.hideOnMobile
                              ? { xs: "none", md: "table-cell" }
                              : undefined,
                          }}
                        >
                          <MDTypography
                            variant="button"
                            color="text"
                            fontWeight="regular"
                            component="div"
                          >
                            {column.render(row)}
                          </MDTypography>
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </MDBox>

      {paging && !isLoading && !showError && (paging.hasPrevious || paging.hasNext) && (
        <MDBox display="flex" justifyContent="space-between" alignItems="center" px={3} py={2}>
          <MDTypography variant="button" color="text" fontWeight="regular">
            Page {paging.page}
          </MDTypography>
          <MDBox display="flex" gap={1}>
            <MDButton
              variant="outlined"
              color={accent}
              size="small"
              disabled={!paging.hasPrevious}
              onClick={paging.onPrevious}
            >
              <Icon>chevron_left</Icon>&nbsp;Previous
            </MDButton>
            <MDButton
              variant="outlined"
              color={accent}
              size="small"
              disabled={!paging.hasNext}
              onClick={paging.onNext}
            >
              Next&nbsp;<Icon>chevron_right</Icon>
            </MDButton>
          </MDBox>
        </MDBox>
      )}
    </Card>
  );
}
