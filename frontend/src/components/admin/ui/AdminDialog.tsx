"use client";

import type { ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import IconButton from "@mui/material/IconButton";
import Icon from "@/components/admin/ui/Icon";
import MDBox from "@/components/admin/components/MDBox";

const WIDTHS = { sm: "xs", md: "sm", lg: "md", xl: "lg" } as const;

interface AdminDialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  /** Same sizes as the old Modal: sm, md, lg, xl. */
  size?: keyof typeof WIDTHS;
  /** Buttons along the bottom (Cancel / Save …). */
  actions?: ReactNode;
}

/**
 * The admin pop-up, in the Material Dashboard style (MUI Dialog). Takes the old Modal's props
 * (isOpen, onClose, title, size), so pages switch over by changing the import.
 */
export default function AdminDialog({ isOpen, onClose, title, children, size = "md", actions }: AdminDialogProps) {
  return (
    <Dialog open={isOpen} onClose={onClose} fullWidth maxWidth={WIDTHS[size]} scroll="paper">
      <DialogTitle component="div" sx={{ pr: 6 }}>
        <MDBox component="h2" m={0} sx={({ typography }) => ({ ...typography.h6 })}>
          {title}
        </MDBox>
        <IconButton aria-label="Close" onClick={onClose} sx={{ position: "absolute", right: 12, top: 12 }} size="small">
          <Icon fontSize="small">close</Icon>
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      {actions && <DialogActions sx={{ px: 3, py: 2 }}>{actions}</DialogActions>}
    </Dialog>
  );
}
