"use client";

import { useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Badge from "@mui/material/Badge";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import type { SxProps, Theme } from "@mui/material/styles";
import Icon from "@/components/admin/ui/Icon";
import MDBox from "@/components/admin/components/MDBox";
import MDTypography from "@/components/admin/components/MDTypography";
import NotificationItem from "@/components/admin/examples/Items/NotificationItem";
import { useAdminStats, waitingItems } from "./useAdminStats";

/** The bell: what's waiting for the team, each a link to its queue. */
export default function QueueMenu({ buttonSx, iconSx }: { buttonSx: SxProps<Theme>; iconSx: SxProps<Theme> }) {
  const router = useRouter();
  const { data } = useAdminStats();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const items = waitingItems(data);
  const total = items.reduce((sum, item) => sum + item.count, 0);

  return (
    <>
      <IconButton
        size="small"
        disableRipple
        color="inherit"
        sx={buttonSx}
        aria-label={`${total} items waiting`}
        aria-controls="queue-menu"
        aria-haspopup="true"
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
      >
        <Badge badgeContent={total} color="error" max={99} overlap="circular">
          <Icon sx={iconSx}>notifications</Icon>
        </Badge>
      </IconButton>
      <Menu
        id="queue-menu"
        anchorEl={anchor}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        sx={{ mt: 2 }}
      >
        {items.length === 0 ? (
          <MDBox px={2} py={1}>
            <MDTypography variant="button" color="text">
              Nothing waiting. All queues are clear.
            </MDTypography>
          </MDBox>
        ) : (
          items.map((item) => (
            <NotificationItem
              key={item.href}
              icon={<Icon>{item.icon}</Icon>}
              title={`${item.count} ${item.label}`}
              onClick={() => {
                setAnchor(null);
                router.push(item.href);
              }}
            />
          ))
        )}
      </Menu>
    </>
  );
}
