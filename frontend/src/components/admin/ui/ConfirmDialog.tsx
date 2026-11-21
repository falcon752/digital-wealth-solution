"use client";

import { useState, type ChangeEvent, type ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MDAlert from "@/components/admin/components/MDAlert";
import MDBox from "@/components/admin/components/MDBox";
import MDButton from "@/components/admin/components/MDButton";
import MDInput from "@/components/admin/components/MDInput";
import MDTypography from "@/components/admin/components/MDTypography";
import { errorMessage } from "@/components/admin/lib/errors";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel: string;
  /** "error" for destructive actions (suspend, ban, cancel, refund…). */
  tone?: "primary" | "error" | "warning" | "success" | "info" | "dark";
  /** Ask for a reason (recorded in the audit log). */
  reason?: { label?: string; required: boolean; minLength?: number; maxLength?: number };
  /** Extra form fields above the reason. */
  children?: ReactNode;
  /** Return a promise; the dialog shows a spinner and stays open with the error if it fails. */
  onConfirm: (reason: string) => Promise<unknown>;
  onClose: () => void;
  /** Disable confirm (e.g. extra fields not filled). */
  confirmDisabled?: boolean;
}

/**
 * The one confirmation for admin actions: says what will happen, optionally asks why
 * (the API records it in the audit log), and keeps the error visible if the API refuses.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = "primary",
  reason,
  children,
  onConfirm,
  onClose,
  confirmDisabled = false,
}: ConfirmDialogProps) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);

  const trimmed = text.trim();
  const minLength = reason?.minLength ?? (reason?.required ? 3 : 0);
  const reasonOk =
    !reason || (!reason.required && trimmed.length === 0) || trimmed.length >= minLength;

  const close = () => {
    if (busy) return;
    setText("");
    setFailure(null);
    onClose();
  };

  const confirm = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await onConfirm(trimmed);
      setText("");
      onClose();
    } catch (error) {
      setFailure(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {message && (
          <MDTypography variant="body2" color="text" mb={2} component="div">
            {message}
          </MDTypography>
        )}
        {children}
        {reason && (
          <MDBox mt={1}>
            <MDInput
              label={reason.label ?? (reason.required ? "Reason (required)" : "Reason (optional)")}
              value={text}
              onChange={(event: ChangeEvent<HTMLInputElement>) => setText(event.target.value)}
              multiline
              minRows={2}
              fullWidth
              inputProps={{ maxLength: reason.maxLength ?? 500 }}
              helperText="Recorded in the audit log."
            />
          </MDBox>
        )}
        {Boolean(failure) && (
          <MDBox mt={2}>
            <MDAlert color="error">
              <MDTypography variant="button" color="white">
                {errorMessage(failure)}
              </MDTypography>
            </MDAlert>
          </MDBox>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <MDButton variant="text" color="dark" onClick={close} disabled={busy}>
          Cancel
        </MDButton>
        <MDButton
          variant="gradient"
          color={tone}
          onClick={() => void confirm()}
          disabled={busy || !reasonOk || confirmDisabled}
        >
          {busy ? "Working…" : confirmLabel}
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}
