"use client";

/**
 * Building blocks for admin details pages (/admin/<thing>/<id>), following KIK Konnect's admin:
 * clicking a table row opens a page with everything about that record. A page is:
 *
 *   <AdminPage actions={…}>
 *     <RecordHeader … items={[…]} />          // who/what it is, status badges, every field
 *     <Grid container spacing={3}>
 *       <SectionCard title="…"><DetailGrid …/></SectionCard>
 *       <RelatedTable title="Deposits" rows={…} columns={…} rowHref={…} />
 *       <TimelineCard events={…} />
 *       <ActivityCard entries={…} />
 *     </Grid>
 *   </AdminPage>
 */
import type { ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Card from "@mui/material/Card";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import MDBox from "@/components/admin/components/MDBox";
import MDButton from "@/components/admin/components/MDButton";
import MDTypography from "@/components/admin/components/MDTypography";
import AdminPage from "@/components/admin/shell/AdminPage";
import DetailGrid, { type DetailItem } from "@/components/admin/ui/DetailGrid";
import Icon from "@/components/admin/ui/Icon";
import PersonAvatar from "@/components/admin/ui/PersonAvatar";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { DetailSkeleton } from "@/components/admin/ui/Skeletons";
import { useAccent } from "@/components/admin/ui/useAccent";
import { humanize } from "@/components/admin/lib/format";

/* ─── Formatting ────────────────────────────────────────────────────────── */

export function fmtDateTime(value?: string | Date | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function fmtDate(value?: string | Date | null) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export function fmtUsd(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return Number(value).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export function fmtAmount(value?: number | null, symbol?: string | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const n = Number(value);
  const text = n.toLocaleString("en-US", { maximumFractionDigits: Math.abs(n) >= 1 ? 6 : 8 });
  return symbol ? `${text} ${symbol}` : text;
}

/** A long ID or address shown in monospace, shortened in the middle, full value on hover. */
export function Mono({ value, short = true }: { value?: string | null; short?: boolean }) {
  if (!value) return null;
  const text = short && value.length > 22 ? `${value.slice(0, 10)}…${value.slice(-8)}` : value;
  return (
    <MDBox component="span" title={value} sx={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: "0.8125rem", wordBreak: "break-all" }}>
      {text}
    </MDBox>
  );
}

/** A link to another record's details page. */
export function RecordLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <MDTypography component={Link} href={href} variant="button" fontWeight="medium" color="info" sx={{ "&:hover": { textDecoration: "underline" } }}>
      {children}
    </MDTypography>
  );
}

/* ─── Page states ───────────────────────────────────────────────────────── */

/** Loading and error states for a details page; renders children once `ready`. */
export function RecordState({ loading, error, backHref, backLabel = "Back", children }: {
  loading: boolean;
  error?: string | null;
  backHref: string;
  backLabel?: string;
  children: ReactNode;
}) {
  const accent = useAccent();
  if (loading) {
    return (
      <AdminPage>
        <DetailSkeleton fields={10} />
      </AdminPage>
    );
  }
  if (error) {
    return (
      <AdminPage>
        <Card>
          <MDBox p={4} textAlign="center">
            <Icon sx={{ fontSize: "2.5rem !important", opacity: 0.6 }}>error_outline</Icon>
            <MDTypography variant="h6" mt={1}>{error}</MDTypography>
            <MDButton component={Link} href={backHref} variant="outlined" color={accent} size="small" sx={{ mt: 2 }}>
              <Icon>arrow_back</Icon>&nbsp;{backLabel}
            </MDButton>
          </MDBox>
        </Card>
      </AdminPage>
    );
  }
  return <>{children}</>;
}

/* ─── Header ────────────────────────────────────────────────────────────── */

/** The top card: a person's avatar (or an icon), the title, status badges and every main field. */
export function RecordHeader({ person, icon, title, subtitle, badges, items, children }: {
  person?: { name?: string | null; email?: string | null; photoUrl?: string | null };
  icon?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  badges?: ({ status: string; label?: string } | null | false | undefined)[];
  items?: DetailItem[];
  children?: ReactNode;
}) {
  const accent = useAccent();
  return (
    <Card>
      <MDBox p={3}>
        <MDBox display="flex" alignItems="center" gap={2} mb={items?.length ? 3 : 0} flexWrap="wrap">
          {person ? (
            <PersonAvatar name={person.name} email={person.email} photoUrl={person.photoUrl} size="lg" />
          ) : icon ? (
            <MDBox
              variant="gradient"
              bgColor={accent}
              coloredShadow={accent}
              borderRadius="lg"
              width="3.5rem"
              height="3.5rem"
              display="flex"
              alignItems="center"
              justifyContent="center"
              color="white"
            >
              <Icon fontSize="medium">{icon}</Icon>
            </MDBox>
          ) : null}
          <MDBox flexGrow={1} minWidth={0}>
            <MDTypography variant="h5" sx={{ wordBreak: "break-word" }}>{title}</MDTypography>
            {subtitle && (
              <MDTypography variant="button" color="text" component="div">{subtitle}</MDTypography>
            )}
          </MDBox>
          {badges && (
            <MDBox display="flex" gap={1} flexWrap="wrap">
              {badges.filter(Boolean).map((b, i) => {
                const badge = b as { status: string; label?: string };
                return <StatusBadge key={`${badge.status}-${i}`} status={badge.status} label={badge.label ?? humanize(badge.status)} />;
              })}
            </MDBox>
          )}
        </MDBox>
        {items && items.length > 0 && <DetailGrid items={items} />}
        {children}
      </MDBox>
    </Card>
  );
}

/* ─── Sections ──────────────────────────────────────────────────────────── */

export function SectionCard({ title, description, action, children, noPadding = false }: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  noPadding?: boolean;
}) {
  return (
    <Card sx={{ height: "100%" }}>
      <MDBox px={3} pt={3} pb={noPadding ? 1 : 0} display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <MDBox>
          <MDTypography variant="h6">{title}</MDTypography>
          {description && <MDTypography variant="caption" color="text" component="div">{description}</MDTypography>}
        </MDBox>
        {action}
      </MDBox>
      <MDBox p={noPadding ? 0 : 3} pt={noPadding ? 0 : 2}>{children}</MDBox>
    </Card>
  );
}

export interface RelatedColumn<T> {
  label: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
  /** Hide this column on phones (keep the 2–3 columns that matter most visible). */
  hideOnMobile?: boolean;
}

const cellDisplay = (hide?: boolean) => (hide ? { xs: "none", sm: "table-cell" } : "table-cell");

/** A compact table of linked records (a user's deposits, an advisor's clients…). Rows open their own page. */
export function RelatedTable<T>({ title, description, rows, columns, rowHref, empty = "Nothing yet.", action, getKey }: {
  title: ReactNode;
  description?: ReactNode;
  rows: T[];
  columns: RelatedColumn<T>[];
  rowHref?: (row: T) => string | null | undefined;
  empty?: string;
  action?: ReactNode;
  getKey?: (row: T, index: number) => string;
}) {
  const router = useRouter();
  return (
    <SectionCard title={title} description={description} action={action} noPadding>
      {rows.length === 0 ? (
        <MDBox px={3} pb={3} pt={1}>
          <MDTypography variant="button" color="text">{empty}</MDTypography>
        </MDBox>
      ) : (
        <MDBox sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ display: "table", minWidth: { xs: 0, sm: 480 } }}>
            <TableHead sx={{ display: "table-header-group" }}>
              <TableRow>
                {columns.map((c) => (
                  <TableCell key={c.label} align={c.align ?? "left"} sx={{ display: cellDisplay(c.hideOnMobile), py: 1.25, px: { xs: 2, sm: 3 }, fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", opacity: 0.7, whiteSpace: "nowrap" }}>
                    {c.label}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, i) => {
                const href = rowHref?.(row) || undefined;
                return (
                  <TableRow
                    key={getKey ? getKey(row, i) : i}
                    hover={Boolean(href)}
                    onClick={href ? () => router.push(href) : undefined}
                    sx={href ? { cursor: "pointer" } : undefined}
                  >
                    {columns.map((c) => (
                      <TableCell key={c.label} align={c.align ?? "left"} sx={{ display: cellDisplay(c.hideOnMobile), py: 1.25, px: { xs: 2, sm: 3 }, fontSize: "0.8125rem" }}>
                        {c.render(row) ?? "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </MDBox>
      )}
    </SectionCard>
  );
}

export interface TimelineEvent {
  label: string;
  at?: string | Date | null;
  note?: ReactNode;
  tone?: "success" | "error" | "warning" | "info" | "dark";
  /** Not reached yet (shown faded). */
  pending?: boolean;
}

/** A vertical status history: Submitted → Reviewed → Approved… */
export function TimelineCard({ title = "History", events }: { title?: ReactNode; events: TimelineEvent[] }) {
  return (
    <SectionCard title={title}>
      <MDBox component="ol" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {events.map((e, i) => (
          <MDBox component="li" key={`${e.label}-${i}`} display="flex" gap={1.5} sx={{ opacity: e.pending ? 0.45 : 1 }}>
            <MDBox display="flex" flexDirection="column" alignItems="center">
              <MDBox width="0.75rem" height="0.75rem" borderRadius="50%" mt={0.6} bgColor={e.tone ?? (e.pending ? "secondary" : "info")} />
              {i < events.length - 1 && <MDBox width="2px" flexGrow={1} my={0.5} bgColor="light" sx={{ minHeight: "1.5rem" }} />}
            </MDBox>
            <MDBox pb={2} minWidth={0}>
              <MDTypography variant="button" fontWeight="medium" display="block">{e.label}</MDTypography>
              {e.at && <MDTypography variant="caption" color="text" display="block">{fmtDateTime(e.at)}</MDTypography>}
              {e.note && <MDTypography variant="caption" color="text" component="div" mt={0.5}>{e.note}</MDTypography>}
            </MDBox>
          </MDBox>
        ))}
      </MDBox>
    </SectionCard>
  );
}

export interface ActivityEntry {
  id?: string;
  action: string;
  details?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt?: string;
  actor?: { name?: string | null; email?: string | null; role?: string | null } | null;
}

function detailsText(details?: Record<string, unknown> | null) {
  if (!details || typeof details !== "object") return null;
  const parts = Object.entries(details)
    .filter(([, v]) => v !== null && v !== undefined && v !== "" && typeof v !== "object")
    .slice(0, 6)
    .map(([k, v]) => `${humanize(k)}: ${String(v)}`);
  return parts.length ? parts.join(" · ") : null;
}

/** The activity log for a person or record: what happened, when, from where. */
export function ActivityCard({ title = "Activity", entries, empty = "No activity recorded yet.", action }: {
  title?: ReactNode;
  entries: ActivityEntry[];
  empty?: string;
  action?: ReactNode;
}) {
  return (
    <SectionCard title={title} action={action}>
      {entries.length === 0 ? (
        <MDTypography variant="button" color="text">{empty}</MDTypography>
      ) : (
        <MDBox component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
          {entries.map((e, i) => (
            <MDBox component="li" key={e.id ?? i} py={1.25} sx={{ borderBottom: i < entries.length - 1 ? "1px solid" : "none", borderColor: "divider" }}>
              <MDBox display="flex" justifyContent="space-between" gap={2} flexWrap="wrap">
                <MDTypography variant="button" fontWeight="medium">{humanize(e.action)}</MDTypography>
                <MDTypography variant="caption" color="text">{fmtDateTime(e.createdAt)}</MDTypography>
              </MDBox>
              {e.actor && (
                <MDTypography variant="caption" color="text" display="block">
                  By {e.actor.name || e.actor.email}{e.actor.role ? ` (${humanize(e.actor.role)})` : ""}
                </MDTypography>
              )}
              {detailsText(e.details) && <MDTypography variant="caption" color="text" display="block">{detailsText(e.details)}</MDTypography>}
              {(e.ipAddress || e.userAgent) && (
                <MDTypography variant="caption" color="secondary" display="block" sx={{ wordBreak: "break-all" }}>
                  {[e.ipAddress, e.userAgent].filter(Boolean).join(" · ")}
                </MDTypography>
              )}
            </MDBox>
          ))}
        </MDBox>
      )}
    </SectionCard>
  );
}
