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

import type { ThemeColors } from "@/components/admin/assets/theme/types";

/**
 * The base colors for the Material Dashboard 2 React.
 * You can add new color using this file.
 * You can customized the colors for the entire Material Dashboard 2 React using thie file.
 */

const colors: ThemeColors = {
  // KIK Konnect black theme (shared with the web app): near-black page, black cards.
  background: {
    default: "#111111",
    sidenav: "#171717",
    card: "#0D0D0D",
    paper: "#0D0D0D",
  },

  text: {
    main: "#A4A4A4",
    focus: "#A4A4A4",
  },

  transparent: {
    main: "transparent",
  },

  white: {
    main: "#ffffff",
    focus: "#ffffff",
  },

  black: {
    light: "#000000",
    main: "#000000",
    focus: "#000000",
  },

  // DWP blue (the brand's primary colour)
  primary: {
    main: "#0033AD",
    focus: "#002A8F",
  },

  secondary: {
    main: "#A4A4A4",
    focus: "#8C8C8C",
  },

  info: {
    main: "#1A73E8",
    focus: "#1662C4",
  },

  success: {
    main: "#4CAF50",
    focus: "#67bb6a",
  },

  warning: {
    main: "#fb8c00",
    focus: "#fc9d26",
  },

  error: {
    main: "#F44335",
    focus: "#f65f53",
  },

  // Borders and subtle surfaces.
  light: {
    main: "#333333",
    focus: "#333333",
  },

  dark: {
    main: "#262626",
    focus: "#1A1A1A",
  },

  // Reversed for dark: low numbers are the darkest surfaces (hover rows, muted areas).
  grey: {
    100: "#1A1A1A",
    200: "#262626",
    300: "#333333",
    400: "#404040",
    500: "#737373",
    600: "#A4A4A4",
    700: "#D4D4D4",
    800: "#E5E5E5",
    900: "#FAFAFA",
  },

  gradients: {
    primary: {
      main: "#3A66D6",
      state: "#002A8F",
    },

    secondary: {
      main: "#5C5C5C",
      state: "#404040",
    },

    info: {
      main: "#49a3f1",
      state: "#1A73E8",
    },

    success: {
      main: "#66BB6A",
      state: "#43A047",
    },

    warning: {
      main: "#FFA726",
      state: "#FB8C00",
    },

    error: {
      main: "#EF5350",
      state: "#E53935",
    },

    light: {
      main: "#EBEFF4",
      state: "#CED4DA",
    },

    dark: {
      main: "#333333",
      state: "#1A1A1A",
    },
  },

  socialMediaColors: {
    facebook: {
      main: "#3b5998",
      dark: "#344e86",
    },

    twitter: {
      main: "#55acee",
      dark: "#3ea1ec",
    },

    instagram: {
      main: "#125688",
      dark: "#0e456d",
    },

    linkedin: {
      main: "#0077b5",
      dark: "#00669c",
    },

    pinterest: {
      main: "#cc2127",
      dark: "#b21d22",
    },

    youtube: {
      main: "#e52d27",
      dark: "#d41f1a",
    },

    vimeo: {
      main: "#1ab7ea",
      dark: "#13a3d2",
    },

    slack: {
      main: "#3aaf85",
      dark: "#329874",
    },

    dribbble: {
      main: "#ea4c89",
      dark: "#e73177",
    },

    github: {
      main: "#24292e",
      dark: "#171a1d",
    },

    reddit: {
      main: "#ff4500",
      dark: "#e03d00",
    },

    tumblr: {
      main: "#35465c",
      dark: "#2a3749",
    },
  },

  badgeColors: {
    primary: {
      background: "#D6E0FF",
      text: "#0033AD",
    },

    secondary: {
      background: "#333333",
      text: "#D4D4D4",
    },

    info: {
      background: "#aecef7",
      text: "#095bc6",
    },

    success: {
      background: "#bce2be",
      text: "#339537",
    },

    warning: {
      background: "#ffd59f",
      text: "#c87000",
    },

    error: {
      background: "#fcd3d0",
      text: "#f61200",
    },

    light: {
      background: "#404040",
      text: "#FAFAFA",
    },

    dark: {
      background: "#262626",
      text: "#E5E5E5",
    },
  },

  coloredShadows: {
    primary: "#0033AD",
    secondary: "#110e0e",
    info: "#00bbd4",
    success: "#4caf4f",
    warning: "#ff9900",
    error: "#f44336",
    light: "#adb5bd",
    dark: "#000000",
  },

  inputBorderColor: "#333333",

  tabs: {
    indicator: { boxShadow: "#000000" },
  },
};

export default colors;
