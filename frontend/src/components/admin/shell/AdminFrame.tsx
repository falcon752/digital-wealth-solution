"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import MDBox from "@/components/admin/components/MDBox";
import CircularProgress from "@mui/material/CircularProgress";
import type { ThemeChoice } from "@/components/admin/lib/theme-mode";
import AdminProviders from "./AdminProviders";
import AdminShell from "./AdminShell";

function Loading() {
  return (
    <MDBox minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
      <CircularProgress size={32} color="info" />
    </MDBox>
  );
}

/** Admins only: everyone else goes to sign-in (or their own dashboard). */
function Gate({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === "/admin/login";

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      if (!isLoginRoute) router.replace("/admin/login");
      return;
    }
    if (user.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    // Already signed in as admin: don't linger on the login screen.
    if (isLoginRoute) router.replace("/admin");
  }, [user, isLoading, router, isLoginRoute]);

  if (isLoading) return <Loading />;
  // /admin/login renders the sign-in form itself; other routes are mid-redirect.
  if (!user) return isLoginRoute ? <>{children}</> : null;
  if (user.role !== "admin" || isLoginRoute) return null;
  return <AdminShell>{children}</AdminShell>;
}

export default function AdminFrame({ children, initialTheme }: { children: ReactNode; initialTheme: ThemeChoice }) {
  // Marks the page as admin so the public site's dark-mode CSS (globals.css) leaves it alone,
  // including pop-ups, which render outside this tree.
  useEffect(() => {
    document.documentElement.classList.add("dwp-admin");
    return () => document.documentElement.classList.remove("dwp-admin");
  }, []);

  return (
    <AdminProviders initialTheme={initialTheme}>
      {/* Material Dashboard's font (Roboto), as in the KIK Konnect admin. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- only the admin uses Roboto */}
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
        precedence="default"
      />
      <Gate>{children}</Gate>
    </AdminProviders>
  );
}
