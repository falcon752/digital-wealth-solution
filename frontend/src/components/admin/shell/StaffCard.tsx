"use client";

import Icon from "@/components/admin/ui/Icon";
import MDBox from "@/components/admin/components/MDBox";
import MDButton from "@/components/admin/components/MDButton";
import MDTypography from "@/components/admin/components/MDTypography";
import PersonAvatar from "@/components/admin/ui/PersonAvatar";
import { useMaterialUIController } from "@/components/admin/context";
import { useAuth } from "@/context/AuthContext";

/** Bottom of the sidebar: who is signed in, and "Sign out". */
export default function StaffCard() {
  const { user, logout } = useAuth();
  const [{ miniSidenav, transparentSidenav, whiteSidenav, darkMode, sidenavColor }] = useMaterialUIController();
  const onDark = !transparentSidenav && (!whiteSidenav || darkMode);
  const textColor = onDark ? "white" : "dark";
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  if (miniSidenav) {
    return (
      <MDBox display="flex" justifyContent="center">
        <MDButton iconOnly circular variant="gradient" color={sidenavColor} onClick={logout} aria-label="Sign out">
          <Icon>logout</Icon>
        </MDButton>
      </MDBox>
    );
  }

  return (
    <MDBox>
      <MDBox display="flex" alignItems="center" gap={1.5} mb={1.5} px={1}>
        <PersonAvatar name={name} email={user?.email} photoUrl={null} />
        <MDBox lineHeight={1.1} minWidth={0}>
          <MDTypography variant="button" fontWeight="medium" color={textColor} display="block" noWrap>
            {name || user?.email}
          </MDTypography>
          <MDTypography variant="caption" color={textColor} opacity={0.7} display="block" noWrap>
            Administrator
          </MDTypography>
        </MDBox>
      </MDBox>
      <MDButton variant="gradient" color={sidenavColor} fullWidth size="small" onClick={logout}>
        <Icon>logout</Icon>&nbsp;Sign out
      </MDButton>
    </MDBox>
  );
}
