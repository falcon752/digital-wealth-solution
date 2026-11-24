"use client";

/**
 * Overpayment reversals and refunds on an onboarding payment or a payment proof.
 *
 *   const reversals = useReversals('onboarding-payments', id, reload);
 *   <AdminPage actions={<>{…}{reversals.buttons}</>}>
 *     …<Grid item>{reversals.card}</Grid>…
 *     {reversals.dialog}
 *
 * "Reverse overpayment" returns the part paid above the fee (amount filled in); "Refund" returns any
 * part of what was paid. Both go to the client's DWP account by default, in the coin they paid
 * with, or are recorded as sent to their wallet. The API caps the amounts and stops duplicates.
 */
import { useCallback, useEffect, useState } from "react";
import CircularProgress from "@mui/material/CircularProgress";
import FormControlLabel from "@mui/material/FormControlLabel";
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import toast from "react-hot-toast";
import api from "@/lib/api";
import MDBox from "@/components/admin/components/MDBox";
import MDButton from "@/components/admin/components/MDButton";
import MDInput from "@/components/admin/components/MDInput";
import MDTypography from "@/components/admin/components/MDTypography";
import AdminDialog from "@/components/admin/ui/AdminDialog";
import Icon from "@/components/admin/ui/Icon";
import StatusBadge from "@/components/admin/ui/StatusBadge";
import { errorMessage } from "@/components/admin/lib/errors";
import { RecordLink, SectionCard, fmtDateTime, fmtUsd } from "@/components/admin/detail/Record";
import { CopyValue, MoneyLine, Notice } from "./MoneyKit";

type SourceType = "onboarding-payments" | "payment-proofs";
type Kind = "overpayment" | "refund";
type Destination = "account" | "wallet";

export interface ReversalSummary {
  asset: string;
  priceUsd: number | null;
  expected: string | null;
  paid: string | null;
  paidFrom: "ledger" | "reported" | "quote";
  overpayment: string;
  returned: string;
  remainingOverpayment: string;
  refundable: string;
  senderAddress: string | null;
  account: { available: boolean; reason: string | null; user: { id: string; name: string | null; email: string; active: boolean } | null };
  history: {
    id: string;
    reference: string;
    kind: Kind;
    destination: Destination;
    asset: string;
    amount: string;
    usdValue: number | null;
    reason: string;
    depositId: string | null;
    walletAddress: string | null;
    txHash: string | null;
    createdAt: string;
    createdBy: { id: string; name: string | null; email: string } | null;
  }[];
}

const positive = (value?: string | null) => Number(value || 0) > 0;
// Radio and its two-line label side by side (MUI wraps the label under the radio otherwise).
const RADIO_ROW = { alignItems: "flex-start", mr: 0, mb: 1, display: "flex", "& .MuiFormControlLabel-label": { flex: 1, minWidth: 0 } } as const;
const PAID_FROM: Record<ReversalSummary["paidFrom"], string> = {
  ledger: "Amount delivered on the ledger",
  reported: "Amount the client reported (not checked on the ledger)",
  quote: "No delivered amount recorded, so the quoted amount is used",
};

function ReversalDialog({ open, kind, summary, sourceType, id, onClose, onDone }: {
  open: boolean;
  kind: Kind;
  summary: ReversalSummary;
  sourceType: SourceType;
  id: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const cap = kind === "overpayment" ? summary.remainingOverpayment : summary.refundable;
  const [amount, setAmount] = useState("");
  const [destination, setDestination] = useState<Destination>("account");
  const [reason, setReason] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [txHash, setTxHash] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fresh form each time it opens: the overpayment is filled in; a refund starts empty.
  useEffect(() => {
    if (!open) return;
    setAmount(kind === "overpayment" ? cap : "");
    setDestination(summary.account.available ? "account" : "wallet");
    setReason(kind === "overpayment" ? "Overpaid the onboarding fee" : "");
    setWalletAddress(summary.senderAddress || "");
    setTxHash("");
    setError(null);
  }, [open, kind, cap, summary.account.available, summary.senderAddress]);

  const usd = summary.priceUsd && Number(amount) > 0 ? Number(amount) * summary.priceUsd : null;
  const tooMuch = Number(amount) > Number(cap);
  const valid = Number(amount) > 0 && !tooMuch && reason.trim().length >= 3 && (destination === "account" || txHash.trim().length > 0);

  const submit = async () => {
    setSaving(true);
    setError(null);
    try {
      await api.post(`/admin/reversals/${sourceType}/${id}`, { kind, destination, amount: amount.trim(), reason: reason.trim(), walletAddress: walletAddress.trim(), txHash: txHash.trim() });
      toast.success(kind === "overpayment" ? "Overpayment reversed. The client has been emailed." : "Refund recorded. The client has been emailed.");
      onDone();
      onClose();
    } catch (err) {
      setError(errorMessage(err, "Could not return the money"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminDialog
      isOpen={open}
      onClose={() => !saving && onClose()}
      title={kind === "overpayment" ? "Reverse overpayment" : "Refund payment"}
      size="sm"
      actions={
        <>
          <MDButton variant="outlined" color="dark" size="small" onClick={onClose} disabled={saving}>Cancel</MDButton>
          <MDButton variant="gradient" color={kind === "overpayment" ? "info" : "warning"} size="small" onClick={() => void submit()} disabled={!valid || saving}>
            {saving ? <CircularProgress size={12} color="inherit" /> : <Icon>{kind === "overpayment" ? "undo" : "currency_exchange"}</Icon>}
            &nbsp;{kind === "overpayment" ? "Reverse" : "Refund"} {amount && !tooMuch ? `${amount} ${summary.asset}` : ""}
          </MDButton>
        </>
      }
    >
      <MDBox display="flex" flexDirection="column" gap={2.5}>
        <MDTypography variant="button" color="text">
          {kind === "overpayment"
            ? `The client paid ${summary.paid} ${summary.asset} for a ${summary.expected} ${summary.asset} fee. Return the extra ${summary.overpayment} ${summary.asset}${summary.returned !== "0" ? ` (${summary.returned} already returned)` : ""}.`
            : `Return part or all of the ${summary.paid} ${summary.asset} paid. Up to ${cap} ${summary.asset} can still be refunded.`}
        </MDTypography>

        <MDBox>
          <MDInput
            label={`Amount (${summary.asset})`}
            value={amount}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value.replace(/[^\d.]/g, ""))}
            fullWidth
            inputProps={{ inputMode: "decimal" }}
            error={tooMuch}
            helperText={tooMuch ? `The most is ${cap} ${summary.asset}.` : usd ? `≈ ${fmtUsd(usd)} at the payment's rate` : `Up to ${cap} ${summary.asset}`}
          />
          {kind === "refund" && (
            <MDButton variant="text" color="info" size="small" onClick={() => setAmount(cap)} sx={{ mt: 0.5, px: 0 }}>Refund all {cap} {summary.asset}</MDButton>
          )}
        </MDBox>

        <MDBox>
          <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase">Return it to</MDTypography>
          <RadioGroup value={destination} onChange={(e) => setDestination(e.target.value as Destination)}>
            <FormControlLabel
              value="account"
              disabled={!summary.account.available}
              control={<Radio size="small" sx={{ mt: -0.5 }} />}
              sx={RADIO_ROW}
              label={
                <MDTypography variant="button" color="text">
                  Their DWP account, as {summary.asset}
                  <MDTypography variant="caption" color="text" display="block">
                    {summary.account.available ? "Added to their balance now. Shown to them as a reversal, not a deposit." : summary.account.reason}
                  </MDTypography>
                </MDTypography>
              }
            />
            <FormControlLabel
              value="wallet"
              control={<Radio size="small" sx={{ mt: -0.5 }} />}
              sx={RADIO_ROW}
              label={
                <MDTypography variant="button" color="text">
                  Their wallet (already sent)
                  <MDTypography variant="caption" color="text" display="block">You sent it on-chain yourself; this records it. Their balance doesn&apos;t change.</MDTypography>
                </MDTypography>
              }
            />
          </RadioGroup>
        </MDBox>

        {destination === "wallet" && (
          <>
            <MDInput label="Sent to (wallet address)" value={walletAddress} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWalletAddress(e.target.value)} fullWidth />
            <MDInput label="Transaction hash (required)" value={txHash} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTxHash(e.target.value)} fullWidth />
          </>
        )}

        <MDInput
          label="Reason (required)"
          value={reason}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          helperText="Sent to the client by email and recorded in the audit log."
        />

        {error && <Notice tone="error" icon="error">{error}</Notice>}
      </MDBox>
    </AdminDialog>
  );
}

export function useReversals(sourceType: SourceType, id: string, onChanged?: () => void | Promise<void>) {
  const [summary, setSummary] = useState<ReversalSummary | null>(null);
  const [dialog, setDialog] = useState<Kind | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<ReversalSummary>(`/admin/reversals/${sourceType}/${id}`);
      setSummary(res.data);
    } catch {
      setSummary(null);
    }
  }, [sourceType, id]);

  useEffect(() => {
    void load();
  }, [load]);

  const done = async () => {
    await load();
    await onChanged?.();
  };

  const canReverse = Boolean(summary && positive(summary.remainingOverpayment));
  const canRefund = Boolean(summary && positive(summary.refundable));

  const buttons = summary ? (
    <>
      {canReverse && (
        <MDButton variant="gradient" color="info" size="small" onClick={() => setDialog("overpayment")}>
          <Icon>undo</Icon>&nbsp;Reverse overpayment
        </MDButton>
      )}
      {canRefund && (
        <MDButton variant="outlined" color="warning" size="small" onClick={() => setDialog("refund")}>
          <Icon>currency_exchange</Icon>&nbsp;Refund
        </MDButton>
      )}
    </>
  ) : null;

  const card = summary ? (
    <SectionCard title="Overpayment & refunds" description={PAID_FROM[summary.paidFrom]}>
      <MoneyLine label="Fee asked" value={summary.expected ? `${summary.expected} ${summary.asset}` : "—"} />
      <MoneyLine label="Paid" value={summary.paid ? `${summary.paid} ${summary.asset}` : "—"} />
      <MoneyLine
        label="Overpaid"
        value={positive(summary.overpayment) ? `${summary.overpayment} ${summary.asset}` : "None"}
        hint={positive(summary.overpayment) && summary.priceUsd ? `≈ ${fmtUsd(Number(summary.overpayment) * summary.priceUsd)}` : undefined}
        strong={positive(summary.overpayment)}
      />
      <MoneyLine label="Returned so far" value={`${summary.returned} ${summary.asset}`} divider />
      <MoneyLine label="Overpayment still to reverse" value={`${summary.remainingOverpayment} ${summary.asset}`} strong={canReverse} />
      <MoneyLine label="Still refundable" value={`${summary.refundable} ${summary.asset}`} />

      {summary.history.length > 0 && (
        <MDBox mt={2}>
          <MDTypography variant="caption" color="secondary" fontWeight="bold" textTransform="uppercase" display="block" mb={1}>History</MDTypography>
          {summary.history.map((r) => (
            <MDBox key={r.id} py={1.25} sx={{ borderTop: "1px solid", borderColor: "divider" }}>
              <MDBox display="flex" justifyContent="space-between" alignItems="center" gap={1} flexWrap="wrap">
                <MDTypography variant="button" fontWeight="medium">{r.amount} {r.asset}{r.usdValue ? ` · ${fmtUsd(r.usdValue)}` : ""}</MDTypography>
                <MDBox display="flex" gap={0.75}>
                  <StatusBadge status={r.kind === "overpayment" ? "info" : "warning"} label={r.kind === "overpayment" ? "Overpayment" : "Refund"} />
                  <StatusBadge status="active" label={r.destination === "account" ? "To account" : "To wallet"} />
                </MDBox>
              </MDBox>
              <MDTypography variant="caption" color="text" display="block">
                {r.reference} · {fmtDateTime(r.createdAt)}{r.createdBy ? ` · by ${r.createdBy.name || r.createdBy.email}` : ""}
              </MDTypography>
              <MDTypography variant="caption" color="text" display="block">{r.reason}</MDTypography>
              {r.depositId && (
                <MDTypography variant="caption" display="block"><RecordLink href={`/admin/deposits/${r.depositId}`}>Credit in their account</RecordLink></MDTypography>
              )}
              {r.txHash && (
                <MDTypography variant="caption" color="text" component="div">Hash: <CopyValue value={r.txHash} short /></MDTypography>
              )}
            </MDBox>
          ))}
        </MDBox>
      )}
    </SectionCard>
  ) : null;

  const dialogNode = summary ? (
    <ReversalDialog open={dialog !== null} kind={dialog ?? "overpayment"} summary={summary} sourceType={sourceType} id={id} onClose={() => setDialog(null)} onDone={() => void done()} />
  ) : null;

  return { summary, buttons, card, dialog: dialogNode, reload: load };
}
