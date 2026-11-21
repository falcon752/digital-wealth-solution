/** "pending_verification" / "under-review" → "Pending verification" / "Under review". */
export function humanize(value: string | null | undefined): string {
  if (!value) return "—";
  const words = value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .trim();
  const sentence = words.charAt(0).toUpperCase() + words.slice(1);
  // Keep the acronyms DWP uses as acronyms: "Kyc submitted" → "KYC submitted".
  return sentence.replace(/\b(kyc|llc|otp|usd|xrp|btc|eth|ip|id|2fa)\b/gi, (word) => word.toUpperCase());
}

/** Initials for an avatar: "Ada Obi" → "AO"; falls back to the email's first letter. */
export function initials(name: string | null | undefined, email?: string | null): string {
  const source = (name ?? "").trim();
  if (source) {
    const parts = source.split(/\s+/).filter(Boolean);
    return (
      (parts[0]?.[0] ?? "") + (parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "")
    ).toUpperCase();
  }
  return (email?.[0] ?? "?").toUpperCase();
}
