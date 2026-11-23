"use client";

/**
 * Pieces shared by the money details pages (deposits, withdrawals, loans, cards, payment proofs,
 * onboarding payments, partner commissions). Built on the details kit in ../detail/Record.tsx.
 */
import { isValidElement, useCallback, useEffect, useState, type MouseEvent, type ReactNode } from "react";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import toast from "react-hot-toast";
import api from "@/lib/api";
import MDBox from "@/components/admin/components/MDBox";
import MDTypography from "@/components/admin/components/MDTypography";
import { Mono, RecordLink, SectionCard, fmtDate, fmtUsd, fmtAmount, type ActivityEntry } from "@/components/admin/detail/Record";
import type { DetailItem } from "@/components/admin/ui/DetailGrid";
import Icon from "@/components/admin/ui/Icon";
import PersonAvatar from "@/components/admin/ui/PersonAvatar";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { errorMessage } from "@/components/admin/lib/errors";
import { humanize } from "@/components/admin/lib/format";

/* ─── Types the records API returns ─────────────────────────────────────── */

export interface PersonInfo {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name: string | null;
  email: string | null;
  phone?: string | null;
  role?: string | null;
  isActive?: boolean;
  country?: string | null;
  photo?: string | null;
  createdAt?: string | null;
  balance?: number | null;
  onboardingStatus?: string | null;
  onboardingFeePaid?: boolean;
  partnerCode?: string | null;
}

export interface AssetInfo {
  id: string;
  name: string;
  symbol: string;
  network?: string | null;
  walletAddress?: string | null;
  memo?: string | null;
  minDeposit?: number | null;
  isActive?: boolean;
}

export interface HistoryEntry {
  status: string;
  changedAt: string;
  note?: string | null;
  changedBy?: { id: string; name: string | null; email: string; role?: string } | null;
}

export interface EmailDelivery {
  id?: string | null;
  template: string;
  status?: string | null;
  success: boolean;
  error?: string | null;
  attemptedAt: string;
}

export type { ActivityEntry };

/* ─── Loading ───────────────────────────────────────────────────────────── */

/**
 * GET /api/admin/records/<path>. `reload` refetches without the skeleton, so the page stays put
 * after an action.
 */
export function useAdminRecord<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<T>(`/admin/records/${path}`);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(errorMessage(err, "This record could not be loaded."));
    } finally {
      setLoading(false);
    }
  }, [path]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  return { data, loading, error, reload: load };
}

/* ─── Formatting ────────────────────────────────────────────────────────── */

/** "0.15 BTC · $9,000.00", or just the amount when there is no USD value. */
export function amountUsd(amount?: number | string | null, symbol?: string | null, usd?: number | null) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  const main = fmtAmount(value ?? null, symbol) ?? (amount !== null && amount !== undefined ? `${amount} ${symbol ?? ""}`.trim() : null);
  const dollars = fmtUsd(usd ?? null);
  return [main, dollars].filter(Boolean).join(" · ") || null;
}

/** Loans store rates as fractions: 0.12 → "12%". */
export function fmtRate(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  return `${(Number(value) * 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

export const fullName = (p?: { name?: string | null; firstName?: string | null; lastName?: string | null; email?: string | null } | null) =>
  p ? p.name || [p.firstName, p.lastName].filter(Boolean).join(" ") || p.email || "—" : "—";

/** Rows inside a list's DataTableCard open the details page; buttons in them must not. */
export const stopRowClick = (event: MouseEvent) => event.stopPropagation();

/* ─── Values ────────────────────────────────────────────────────────────── */

/** An address, hash or reference: monospace, with a copy button (and an optional explorer link). */
export function CopyValue({ value, short = false, href }: { value?: string | null; short?: boolean; href?: string | null }) {
  if (!value) return null;
  const copy = () => {
    void navigator.clipboard?.writeText(value).then(
      () => toast.success("Copied"),
      () => toast.error("Could not copy"),
    );
  };
  return (
    <MDBox component="span" display="inline-flex" alignItems="flex-start" gap={0.25} maxWidth="100%">
      <Mono value={value} short={short} />
      <Tooltip title="Copy">
        <IconButton size="small" aria-label="Copy" onClick={copy} sx={{ p: 0.25, mt: -0.25 }}>
          <Icon sx={{ fontSize: "0.9rem !important" }}>content_copy</Icon>
        </IconButton>
      </Tooltip>
      {href && (
        <Tooltip title="Open in explorer">
          <IconButton size="small" aria-label="Open in explorer" component="a" href={href} target="_blank" rel="noreferrer" sx={{ p: 0.25, mt: -0.25 }}>
            <Icon sx={{ fontSize: "0.9rem !important" }}>open_in_new</Icon>
          </IconButton>
        </Tooltip>
      )}
    </MDBox>
  );
}

/** One line of a money breakdown: label on the left, amount on the right. */
export function MoneyLine({ label, value, hint, strong = false, divider = false }: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  strong?: boolean;
  divider?: boolean;
}) {
  return (
    <>
      {divider && <Divider sx={{ my: 0.5 }} />}
      <MDBox display="flex" justifyContent="space-between" alignItems="baseline" gap={2} py={0.75}>
        <MDBox minWidth={0}>
          <MDTypography variant="button" color="text" fontWeight={strong ? "bold" : "regular"}>{label}</MDTypography>
          {hint && <MDTypography variant="caption" color="text" display="block">{hint}</MDTypography>}
        </MDBox>
        <MDTypography variant="button" fontWeight={strong ? "bold" : "medium"} textAlign="right" sx={{ whiteSpace: "nowrap" }}>
          {value ?? "—"}
        </MDTypography>
      </MDBox>
    </>
  );
}

/* ─── Cards ─────────────────────────────────────────────────────────────── */

/** The client (or partner) a record belongs to, with a link to their page. */
export function PersonCard({ title = "Client", person, empty = "No account is linked to this record.", children }: {
  title?: ReactNode;
  person: PersonInfo | null | undefined;
  empty?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <SectionCard
      title={title}
      action={person ? <RecordLink href={`/admin/users/${person.id}`}>Open</RecordLink> : undefined}
    >
      {!person ? (
        <MDTypography variant="button" color="text" component="div">{empty}</MDTypography>
      ) : (
        <>
          <MDBox display="flex" alignItems="center" gap={1.5} mb={1.5}>
            <PersonAvatar name={person.name} email={person.email} photoUrl={person.photo} size="md" />
            <MDBox minWidth={0}>
              <RecordLink href={`/admin/users/${person.id}`}>{fullName(person)}</RecordLink>
              <MDTypography variant="caption" color="text" display="block" sx={{ overflowWrap: "anywhere" }}>{person.email}</MDTypography>
            </MDBox>
          </MDBox>
          <MDBox display="flex" gap={0.75} flexWrap="wrap" mb={1}>
            <StatusBadge status={person.isActive === false ? "suspended" : "active"} label={person.isActive === false ? "Suspended" : "Active"} />
            {person.onboardingStatus && <StatusBadge status={person.onboardingStatus === "account_active" ? "active" : person.onboardingStatus} label={humanize(person.onboardingStatus)} />}
            {person.role && person.role !== "user" && <StatusBadge status="info" label={humanize(person.role)} color="info" />}
          </MDBox>
          {person.phone && <MoneyLine label="Phone" value={person.phone} />}
          {person.country && <MoneyLine label="Country" value={person.country} />}
          {typeof person.balance === "number" && <MoneyLine label="USD balance" value={fmtUsd(person.balance)} />}
          {person.partnerCode && <MoneyLine label="Partner code" value={<Mono value={person.partnerCode} short={false} />} />}
          {person.createdAt && <MoneyLine label="Joined" value={fmtDate(person.createdAt)} />}
          {children}
        </>
      )}
    </SectionCard>
  );
}

/** The asset a record is in, with DWP's receiving address for it. */
export function AssetCard({ title = "Asset", asset, fallbackSymbol }: { title?: ReactNode; asset: AssetInfo | null | undefined; fallbackSymbol?: string | null }) {
  return (
    <SectionCard title={title} action={asset ? <RecordLink href={`/admin/assets/${asset.id}`}>Open</RecordLink> : undefined}>
      {!asset ? (
        <MDTypography variant="button" color="text" component="div">
          {fallbackSymbol ? `${fallbackSymbol} is not one of the listed assets.` : "No asset is linked."}
        </MDTypography>
      ) : (
        <>
          <MDBox display="flex" alignItems="center" gap={1} mb={1} flexWrap="wrap">
            <RecordLink href={`/admin/assets/${asset.id}`}>{asset.name}</RecordLink>
            <MDTypography variant="button" color="text">{asset.symbol}</MDTypography>
            {asset.isActive === false && <StatusBadge status="inactive" />}
          </MDBox>
          <MoneyLine label="Network" value={asset.network || "—"} />
          {asset.minDeposit ? <MoneyLine label="Minimum deposit" value={fmtAmount(asset.minDeposit, asset.symbol)} /> : null}
          {asset.walletAddress && (
            <MDBox mt={1}>
              <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase" display="block">DWP wallet address</MDTypography>
              <MDTypography variant="button" color="text" component="div"><CopyValue value={asset.walletAddress} /></MDTypography>
            </MDBox>
          )}
          {asset.memo && (
            <MDBox mt={1}>
              <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase" display="block">Memo / tag</MDTypography>
              <MDTypography variant="button" color="text" component="div"><CopyValue value={asset.memo} /></MDTypography>
            </MDBox>
          )}
        </>
      )}
    </SectionCard>
  );
}

/** Notes on a record: the admin's (sent to the client where the API does that) and the client's. */
export function NotesCard({ notes }: { notes: { label: string; text?: string | null; hint?: string }[] }) {
  const shown = notes.filter((n) => n.text);
  return (
    <SectionCard title="Notes">
      {shown.length === 0 ? (
        <MDTypography variant="button" color="text" component="div">No notes on this record.</MDTypography>
      ) : (
        shown.map((n, i) => (
          <MDBox key={n.label} mt={i ? 2 : 0}>
            <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase" display="block">{n.label}</MDTypography>
            <MDTypography variant="button" color="text" component="div" sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{n.text}</MDTypography>
            {n.hint && <MDTypography variant="caption" color="text" display="block">{n.hint}</MDTypography>}
          </MDBox>
        ))
      )}
    </SectionCard>
  );
}

/** Emails the API recorded sending about the record. */
export function EmailsCard({ deliveries }: { deliveries: EmailDelivery[] }) {
  return (
    <SectionCard title="Emails" description="Messages sent to the client about this record.">
      {deliveries.length === 0 ? (
        <MDTypography variant="button" color="text" component="div">No emails recorded.</MDTypography>
      ) : (
        deliveries.map((d, i) => (
          <MDBox key={d.id ?? i}>
            {i > 0 && <Divider sx={{ my: 0 }} />}
            <MDBox display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} py={1}>
              <MDBox display="flex" gap={1} alignItems="flex-start" minWidth={0}>
                <Icon fontSize="small" color={d.success ? "success" : "warning"}>{d.success ? "mail" : "warning"}</Icon>
                <MDBox minWidth={0}>
                  <MDTypography variant="button" fontWeight="medium" display="block">{humanize(d.template)}</MDTypography>
                  {d.error && <MDTypography variant="caption" color="error" display="block">{d.error}</MDTypography>}
                </MDBox>
              </MDBox>
              <MDTypography variant="caption" color="text" sx={{ whiteSpace: "nowrap" }}>{fmtDate(d.attemptedAt)}</MDTypography>
            </MDBox>
          </MDBox>
        ))
      )}
    </SectionCard>
  );
}

/** A coloured notice inside a page (a warning about a reused hash or address…). */
export function Notice({ tone = "warning", icon = "warning", children }: { tone?: "warning" | "info" | "error" | "success"; icon?: string; children: ReactNode }) {
  return (
    <MDBox
      display="flex"
      gap={1.5}
      alignItems="flex-start"
      p={2}
      borderRadius="lg"
      sx={({ palette }) => ({ border: `1px solid ${palette[tone].main}`, backgroundColor: `${palette[tone].main}14` })}
    >
      <Icon color={tone} sx={{ mt: 0.1 }}>{icon}</Icon>
      <MDTypography variant="button" color="text" component="div">{children}</MDTypography>
    </MDBox>
  );
}

/** The first activity entry with one of `actions` (for timeline dates the record itself doesn't keep). */
export function activityAt(entries: ActivityEntry[], ...actions: string[]) {
  // Entries are newest first; the earliest matching one is when it happened.
  const matches = entries.filter((e) => actions.includes(e.action));
  return matches.length ? matches[matches.length - 1] : null;
}

/** A link that opens in a new tab (a file, a blob URL, a block explorer). */
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <MDTypography component="a" href={href} target="_blank" rel="noreferrer" variant="button" fontWeight="medium" color="info"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, "&:hover": { textDecoration: "underline" } }}>
      {children}
      <Icon sx={{ fontSize: "0.85rem !important" }}>open_in_new</Icon>
    </MDTypography>
  );
}

/** Header fields without the empty ones, so phones don't scroll past a column of dashes. */
export function filled(items: (DetailItem | null | false | undefined)[]): DetailItem[] {
  const empty = (v: ReactNode) =>
    v === null || v === undefined || v === "" || v === false ||
    (isValidElement(v) && (v.type === CopyValue || v.type === Mono) && !(v.props as { value?: unknown }).value);
  return items.filter((item): item is DetailItem => Boolean(item) && !empty((item as DetailItem).value));
}
