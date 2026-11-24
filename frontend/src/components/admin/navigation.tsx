import type { ReactNode } from "react";
import Icon from "@/components/admin/ui/Icon";

/** The admin sidebar, grouped like the KIK Konnect admin. `key` is the URL segment after /admin. */
export interface NavPage {
  type: "collapse";
  key: string;
  name: string;
  icon: ReactNode;
  route: string;
}

export interface NavTitle {
  type: "title";
  key: string;
  title: string;
}

export type NavItem = NavPage | NavTitle;

const icon = (name: string) => <Icon fontSize="small">{name}</Icon>;
const page = (key: string, name: string, iconName: string): NavPage => ({
  type: "collapse",
  key,
  name,
  icon: icon(iconName),
  route: key === "overview" ? "/admin" : `/admin/${key}`,
});

export const NAVIGATION: readonly NavItem[] = [
  page("overview", "Overview", "dashboard"),

  { type: "title", key: "clients-title", title: "Clients" },
  page("users", "Users", "group"),
  page("consultations", "Consultations", "forum"),
  page("kyc", "KYC Verification", "verified_user"),
  page("access-requests", "Access Requests", "key"),
  page("llc", "LLC Apps", "business"),

  { type: "title", key: "support-title", title: "Support" },
  page("advisors", "Advisors", "support_agent"),
  page("support", "Support Tickets", "chat"),

  { type: "title", key: "money-title", title: "Money" },
  page("payment-proofs", "Payment Proofs", "request_quote"),
  page("onboarding-payments", "Onboarding Fee", "paid"),
  page("deposits", "Deposits", "south_west"),
  page("withdrawals", "Withdrawals", "outbound"),
  page("loans", "Loans", "account_balance"),
  page("cards", "Cards", "payment"),
  page("assets", "Assets", "category"),
  page("holdings", "Portfolio Holdings", "savings"),

  { type: "title", key: "outreach-title", title: "Outreach" },
  page("broadcast", "Broadcast", "campaign"),
  page("referrals", "Referrals", "person_add"),

  { type: "title", key: "monitoring-title", title: "Monitoring" },
  page("live-visitors", "Live Visitors", "language"),
  page("activity", "Activity Log", "history"),
];

/** Which sidebar item a path belongs to: /admin → overview, /admin/kyc/123 → kyc. */
export function navKeyFor(pathname: string): string {
  const [, first, second] = pathname.split("/");
  if (first !== "admin") return "";
  return second || "overview";
}
