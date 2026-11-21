"use client";

import { HugeiconsIcon } from "@hugeicons/react";
import MuiIcon, { type IconProps } from "@mui/material/Icon";
import { forwardRef } from "react";

import { iconFor } from "./icon-map";

/**
 * Drop-in for MUI's `<Icon>dashboard</Icon>`: same sizes, colours and class names (the
 * template's styles target `.material-icons-round`), but drawn with Hugeicons instead of
 * the Material Icons web font. The child is the Material icon name.
 */
const Icon = forwardRef<HTMLSpanElement, IconProps>(function Icon({ children, ...props }, ref) {
  const name = typeof children === "string" ? children.trim() : null;
  return (
    <MuiIcon ref={ref} aria-hidden {...props}>
      {name !== null ? (
        <HugeiconsIcon
          icon={iconFor(name)}
          size="1em"
          color="currentColor"
          strokeWidth={1.8}
          style={{ display: "block" }}
        />
      ) : (
        children
      )}
    </MuiIcon>
  );
});

export default Icon;
