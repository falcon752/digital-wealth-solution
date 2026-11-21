"use client";

/**
=========================================================
* Material Dashboard 2 React - v2.2.0
=========================================================

* Product Page: https://www.creative-tim.com/product/material-dashboard-react
* Copyright 2023 Creative Tim (https://www.creative-tim.com)

Coded by www.creative-tim.com

 =========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
*/

import { forwardRef, createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";

// Material Dashboard 2 React components
import MDBox from "@/components/admin/components/MDBox";
import type { MDButtonColor, MDButtonProps, MDButtonSize } from "@/components/admin/components/MDButton";

// Custom styles for MDPagination
import MDPaginationItemRoot from "@/components/admin/components/MDPagination/MDPaginationItemRoot";
import type { MDPaginationVariant } from "@/components/admin/components/MDPagination/MDPaginationItemRoot";

export type { MDPaginationVariant };

interface MDPaginationContextValue {
  variant: MDPaginationVariant;
  color: MDButtonColor;
  size: MDButtonSize;
}

// The Pagination main context
const Context = createContext<MDPaginationContextValue | null>(null);

export interface MDPaginationOwnProps {
  item?: boolean;
  variant?: MDPaginationVariant;
  color?: MDButtonColor;
  size?: MDButtonSize;
  active?: boolean;
  children: ReactNode;
}

export type MDPaginationProps = MDPaginationOwnProps &
  Omit<MDButtonProps, keyof MDPaginationOwnProps | "ref">;

const MDPagination = forwardRef<HTMLButtonElement, MDPaginationProps>(
  (
    {
      item = false,
      variant = "gradient",
      color = "info",
      size = "medium",
      active = false,
      children,
      ...rest
    },
    ref
  ) => {
    const context = useContext(Context);
    const paginationSize = context ? context.size : null;

    const value = useMemo(() => ({ variant, color, size }), [variant, color, size]);

    return (
      <Context.Provider value={value}>
        {item ? (
          <MDPaginationItemRoot
            {...rest}
            ref={ref}
            variant={active ? context?.variant : "outlined"}
            color={active ? context?.color : "secondary"}
            iconOnly
            circular
            ownerState={{ variant, active, paginationSize }}
          >
            {children}
          </MDPaginationItemRoot>
        ) : (
          <MDBox
            display="flex"
            justifyContent="flex-end"
            alignItems="center"
            sx={{ listStyle: "none" }}
          >
            {children}
          </MDBox>
        )}
      </Context.Provider>
    );
  }
);

MDPagination.displayName = "MDPagination";

export default MDPagination;
