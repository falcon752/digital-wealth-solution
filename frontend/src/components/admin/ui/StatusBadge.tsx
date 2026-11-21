"use client";

import MDBadge from "@/components/admin/components/MDBadge";
import { humanize } from "@/components/admin/lib/format";

export type BadgeColor =
  "primary" | "secondary" | "info" | "success" | "warning" | "error" | "light" | "dark";

/**
 * Colour for a status word used anywhere in the API. Unknown words are grey, so a new
 * status still shows (just uncoloured) instead of breaking the page.
 */
const COLORS: Record<string, BadgeColor> = {
  // good / finished
  active: "success",
  approved: "success",
  verified: "success",
  completed: "success",
  complete: "success",
  released: "success",
  paid: "success",
  succeeded: "success",
  success: "success",
  resolved: "success",
  live: "success",
  sent: "success",
  delivered: "success",
  visible: "success",
  assigned: "success",
  // in progress
  pending: "warning",
  pending_verification: "warning",
  pending_payment: "warning",
  awaiting_payment: "warning",
  in_review: "warning",
  under_review: "warning",
  under_investigation: "warning",
  investigating: "warning",
  more_info_requested: "warning",
  processing: "warning",
  queued: "warning",
  scheduled: "info",
  draft: "secondary",
  open: "info",
  new: "info",
  in_progress: "info",
  accepted: "info",
  quoted: "info",
  held: "info",
  escrowed: "info",
  requested: "warning",
  sending: "info",
  escalated: "error",
  // bad / stopped
  suspended: "error",
  banned: "error",
  rejected: "error",
  declined: "error",
  confirmed: "success",
  not_verified: "secondary",
  failed: "error",
  cancelled: "dark",
  canceled: "dark",
  refunded: "dark",
  disabled: "dark",
  inactive: "dark",
  hidden: "dark",
  closed: "dark",
  expired: "dark",
  revoked: "error",
  dismissed: "dark",
  deleted: "dark",
};

export function statusColor(status: string | null | undefined): BadgeColor {
  if (!status) return "secondary";
  return COLORS[status.toLowerCase().replace(/[\s-]+/g, "_")] ?? "secondary";
}

interface StatusBadgeProps {
  status: string | null | undefined;
  /** Override the label (defaults to the status, humanised). */
  label?: string;
  color?: BadgeColor;
}

export default function StatusBadge({ status, label, color }: StatusBadgeProps) {
  return (
    <MDBadge
      badgeContent={label ?? humanize(status)}
      color={color ?? statusColor(status)}
      variant="gradient"
      size="sm"
      container
    />
  );
}
