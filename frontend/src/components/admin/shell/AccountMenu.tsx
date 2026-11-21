"use client";

import { useState, type MouseEvent } from "react";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import type { SxProps, Theme } from "@mui/material/styles";
import Icon from "@/components/admin/ui/Icon";
import MDBox from "@/components/admin/components/MDBox";
import MDTypography from "@/components/admin/components/MDTypography";
import { useAuth } from "@/context/AuthContext";

/** The person icon: who is signed in, the public site, and "Sign out". */
export default function AccountMenu({ buttonSx, iconSx }: { buttonSx: SxProps<Theme>; iconSx: SxProps<Theme> }) {
  const { user, logout } = useAuth();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const name = `${user?.firstName || ""} ${user?.lastName || ""}`.trim();

  return (
    <>
      <IconButton
        size="small"
        disableRipple
        color="inherit"
        sx={buttonSx}
        aria-label="Account"
        aria-controls="account-menu"
        aria-haspopup="true"
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
      >
        <Icon sx={iconSx}>account_circle</Icon>
      </IconButton>
      <Menu
        id="account-menu"
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ mt: 1 }}
      >
        <MDBox px={2} py={1} maxWidth="16rem">
          <MDTypography variant="button" fontWeight="medium" display="block" noWrap>
            {name || user?.email}
          </MDTypography>
          <MDTypography variant="caption" color="text" display="block" noWrap>
            {user?.email}
          </MDTypography>
          <MDTypography variant="caption" color="text" display="block">
            Administrator
          </MDTypography>
        </MDBox>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null);
            window.open("/", "_blank", "noopener");
          }}
        >
          <Icon fontSize="small">open_in_new</Icon>&nbsp; View website
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchor(null);
            logout();
          }}
        >
          <Icon fontSize="small">logout</Icon>&nbsp; Sign out
        </MenuItem>
      </Menu>
    </>
  );
}
