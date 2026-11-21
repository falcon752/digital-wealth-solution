"use client";

import Link from "next/link";
import ComplexStatisticsCard from "@/components/admin/examples/Cards/StatisticsCards/ComplexStatisticsCard";
import MDBox from "@/components/admin/components/MDBox";
import { StatCardSkeleton } from "./Skeletons";

type StatColor =
  "primary" | "secondary" | "info" | "success" | "warning" | "error" | "light" | "dark";

interface StatCardProps {
  icon: string;
  title: string;
  value: string | number | undefined;
  /** The line under the number: "+12 this week" etc. */
  footnote?: {
    label: string;
    amount?: string;
    color?: "success" | "error" | "warning" | "info" | "secondary";
  };
  color?: StatColor;
  /** Makes the card a link (e.g. to the queue it counts). */
  href?: string;
  loading?: boolean;
}

/** The template's statistics card, with a skeleton while loading and an optional link. */
export default function StatCard({
  icon,
  title,
  value,
  footnote,
  color = "dark",
  href,
  loading,
}: StatCardProps) {
  if (loading) return <StatCardSkeleton />;
  const card = (
    <ComplexStatisticsCard
      color={color}
      icon={icon}
      title={title}
      count={value ?? "—"}
      percentage={{
        color: footnote?.color ?? "success",
        amount: footnote?.amount ?? "",
        label: footnote?.label ?? "",
      }}
    />
  );
  if (!href) return card;
  return (
    <MDBox
      component={Link}
      href={href}
      display="block"
      sx={{ textDecoration: "none", "&:hover": { opacity: 0.92 } }}
    >
      {card}
    </MDBox>
  );
}
