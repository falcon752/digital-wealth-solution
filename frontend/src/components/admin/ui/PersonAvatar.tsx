"use client";

import MDAvatar from "@/components/admin/components/MDAvatar";
import type { MDAvatarSize } from "@/components/admin/components/MDAvatar/MDAvatarRoot";
import { initials } from "@/components/admin/lib/format";
import { useAccent } from "./useAccent";

/** A person's photo, or their initials on the accent colour when they have none. */
export default function PersonAvatar({
  name,
  email,
  photoUrl,
  size = "sm",
}: {
  name: string | null | undefined;
  email?: string | null;
  photoUrl: string | null | undefined;
  size?: MDAvatarSize;
}) {
  const accent = useAccent();
  return (
    <MDAvatar
      src={photoUrl ?? undefined}
      alt={name || email || "Profile photo"}
      bgColor={photoUrl ? "transparent" : accent}
      size={size}
    >
      {initials(name, email)}
    </MDAvatar>
  );
}
