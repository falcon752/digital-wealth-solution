"use client";

import { useState, type ReactNode } from "react";
import Icon from "@/components/admin/ui/Icon";
import MDBox from "@/components/admin/components/MDBox";
import Sidenav from "@/components/admin/examples/Sidenav";
import Configurator from "@/components/admin/examples/Configurator";
import { useMaterialUIController, setMiniSidenav, setOpenConfigurator } from "@/components/admin/context";
import { NAVIGATION } from "@/components/admin/navigation";
import StaffCard from "./StaffCard";
import { useDisplaySettings } from "./useDisplaySettings";

/**
 * The frame around every admin page, as in the KIK Konnect admin: the sidebar, the settings
 * panel (accent colour, light/dark/system, sidebar style) and its floating button.
 */
export default function AdminShell({ children }: { children: ReactNode }) {
  const [controller, dispatch] = useMaterialUIController();
  const { miniSidenav, layout, openConfigurator, darkMode, transparentSidenav, whiteSidenav } = controller;
  // White-text logo on the dark sidebar, navy logo on a white or see-through one.
  const onDarkSidebar = !transparentSidenav && (!whiteSidenav || darkMode);
  const [onMouseEnter, setOnMouseEnter] = useState(false);
  useDisplaySettings();

  // A collapsed sidebar opens while the mouse is over it.
  const handleOnMouseEnter = () => {
    if (miniSidenav && !onMouseEnter) {
      setMiniSidenav(dispatch, false);
      setOnMouseEnter(true);
    }
  };
  const handleOnMouseLeave = () => {
    if (onMouseEnter) {
      setMiniSidenav(dispatch, true);
      setOnMouseEnter(false);
    }
  };

  return (
    <>
      {layout === "dashboard" && (
        <>
          <Sidenav
            brand={onDarkSidebar || darkMode ? "/dwp-logo-dark.png" : "/dwp-logo.png"}
            brandName="DWP Admin"
            routes={[...NAVIGATION]}
            onMouseEnter={handleOnMouseEnter}
            onMouseLeave={handleOnMouseLeave}
            footer={<StaffCard />}
          />
          <Configurator />
          <MDBox
            display="flex"
            justifyContent="center"
            alignItems="center"
            width="3.25rem"
            height="3.25rem"
            bgColor={darkMode ? "dark" : "white"}
            shadow="sm"
            borderRadius="50%"
            position="fixed"
            right="2rem"
            bottom="2rem"
            zIndex={99}
            color={darkMode ? "white" : "dark"}
            sx={{ cursor: "pointer" }}
            onClick={() => setOpenConfigurator(dispatch, !openConfigurator)}
            role="button"
            aria-label="Display settings"
          >
            <Icon fontSize="small" color="inherit">
              settings
            </Icon>
          </MDBox>
        </>
      )}
      {children}
    </>
  );
}
