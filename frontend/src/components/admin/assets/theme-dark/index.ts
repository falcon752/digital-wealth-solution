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

// @mui material components
import { createTheme } from "@mui/material/styles";
// import Fade from "@mui/material/Fade";

// Material Dashboard 2 React base styles
import colors from "@/components/admin/assets/theme-dark/base/colors";
import breakpoints from "@/components/admin/assets/theme-dark/base/breakpoints";
import typography from "@/components/admin/assets/theme-dark/base/typography";
import boxShadows from "@/components/admin/assets/theme-dark/base/boxShadows";
import borders from "@/components/admin/assets/theme-dark/base/borders";
import globals from "@/components/admin/assets/theme-dark/base/globals";

// Material Dashboard 2 React helper functions
import boxShadow from "@/components/admin/assets/theme-dark/functions/boxShadow";
import hexToRgb from "@/components/admin/assets/theme-dark/functions/hexToRgb";
import linearGradient from "@/components/admin/assets/theme-dark/functions/linearGradient";
import pxToRem from "@/components/admin/assets/theme-dark/functions/pxToRem";
import rgba from "@/components/admin/assets/theme-dark/functions/rgba";

// Material Dashboard 2 React components base styles for @mui material components
import sidenav from "@/components/admin/assets/theme-dark/components/sidenav";
import list from "@/components/admin/assets/theme-dark/components/list";
import listItem from "@/components/admin/assets/theme-dark/components/list/listItem";
import listItemText from "@/components/admin/assets/theme-dark/components/list/listItemText";
import card from "@/components/admin/assets/theme-dark/components/card";
import cardMedia from "@/components/admin/assets/theme-dark/components/card/cardMedia";
import cardContent from "@/components/admin/assets/theme-dark/components/card/cardContent";
import button from "@/components/admin/assets/theme-dark/components/button";
import iconButton from "@/components/admin/assets/theme-dark/components/iconButton";
import input from "@/components/admin/assets/theme-dark/components/form/input";
import inputLabel from "@/components/admin/assets/theme-dark/components/form/inputLabel";
import inputOutlined from "@/components/admin/assets/theme-dark/components/form/inputOutlined";
import textField from "@/components/admin/assets/theme-dark/components/form/textField";
import menu from "@/components/admin/assets/theme-dark/components/menu";
import menuItem from "@/components/admin/assets/theme-dark/components/menu/menuItem";
import switchButton from "@/components/admin/assets/theme-dark/components/form/switchButton";
import divider from "@/components/admin/assets/theme-dark/components/divider";
import tableContainer from "@/components/admin/assets/theme-dark/components/table/tableContainer";
import tableHead from "@/components/admin/assets/theme-dark/components/table/tableHead";
import tableCell from "@/components/admin/assets/theme-dark/components/table/tableCell";
import linearProgress from "@/components/admin/assets/theme-dark/components/linearProgress";
import breadcrumbs from "@/components/admin/assets/theme-dark/components/breadcrumbs";
import slider from "@/components/admin/assets/theme-dark/components/slider";
import avatar from "@/components/admin/assets/theme-dark/components/avatar";
import tooltip from "@/components/admin/assets/theme-dark/components/tooltip";
import appBar from "@/components/admin/assets/theme-dark/components/appBar";
import tabs from "@/components/admin/assets/theme-dark/components/tabs";
import tab from "@/components/admin/assets/theme-dark/components/tabs/tab";
import stepper from "@/components/admin/assets/theme-dark/components/stepper";
import step from "@/components/admin/assets/theme-dark/components/stepper/step";
import stepConnector from "@/components/admin/assets/theme-dark/components/stepper/stepConnector";
import stepLabel from "@/components/admin/assets/theme-dark/components/stepper/stepLabel";
import stepIcon from "@/components/admin/assets/theme-dark/components/stepper/stepIcon";
import select from "@/components/admin/assets/theme-dark/components/form/select";
import formControlLabel from "@/components/admin/assets/theme-dark/components/form/formControlLabel";
import formLabel from "@/components/admin/assets/theme-dark/components/form/formLabel";
import checkbox from "@/components/admin/assets/theme-dark/components/form/checkbox";
import radio from "@/components/admin/assets/theme-dark/components/form/radio";
import autocomplete from "@/components/admin/assets/theme-dark/components/form/autocomplete";
import container from "@/components/admin/assets/theme-dark/components/container";
import popover from "@/components/admin/assets/theme-dark/components/popover";
import buttonBase from "@/components/admin/assets/theme-dark/components/buttonBase";
import icon from "@/components/admin/assets/theme-dark/components/icon";
import svgIcon from "@/components/admin/assets/theme-dark/components/svgIcon";
import link from "@/components/admin/assets/theme-dark/components/link";
import dialog from "@/components/admin/assets/theme-dark/components/dialog";
import dialogTitle from "@/components/admin/assets/theme-dark/components/dialog/dialogTitle";
import dialogContent from "@/components/admin/assets/theme-dark/components/dialog/dialogContent";
import dialogContentText from "@/components/admin/assets/theme-dark/components/dialog/dialogContentText";
import dialogActions from "@/components/admin/assets/theme-dark/components/dialog/dialogActions";

export default createTheme({
  breakpoints: { ...breakpoints },
  // mode "dark" gives MUI's own parts (text, dividers, skeletons, inputs) light-on-dark defaults.
  palette: { mode: "dark", ...colors },
  typography: { ...typography },
  boxShadows: { ...boxShadows },
  borders: { ...borders },
  functions: {
    boxShadow,
    hexToRgb,
    linearGradient,
    pxToRem,
    rgba,
  },

  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ...globals,
        ...container,
      },
    },
    MuiDrawer: { ...sidenav },
    MuiList: { ...list },
    MuiListItem: { ...listItem },
    MuiListItemText: { ...listItemText },
    MuiCard: { ...card },
    MuiCardMedia: { ...cardMedia },
    MuiCardContent: { ...cardContent },
    MuiButton: { ...button },
    MuiIconButton: { ...iconButton },
    MuiInput: { ...input },
    MuiInputLabel: { ...inputLabel },
    MuiOutlinedInput: { ...inputOutlined },
    MuiTextField: { ...textField },
    MuiMenu: { ...menu },
    MuiMenuItem: { ...menuItem },
    MuiSwitch: { ...switchButton },
    MuiDivider: { ...divider },
    MuiTableContainer: { ...tableContainer },
    MuiTableHead: { ...tableHead },
    MuiTableCell: { ...tableCell },
    MuiLinearProgress: { ...linearProgress },
    MuiBreadcrumbs: { ...breadcrumbs },
    MuiSlider: { ...slider },
    MuiAvatar: { ...avatar },
    MuiTooltip: { ...tooltip },
    MuiAppBar: { ...appBar },
    MuiTabs: { ...tabs },
    MuiTab: { ...tab },
    MuiStepper: { ...stepper },
    MuiStep: { ...step },
    MuiStepConnector: { ...stepConnector },
    MuiStepLabel: { ...stepLabel },
    MuiStepIcon: { ...stepIcon },
    MuiSelect: { ...select },
    MuiFormControlLabel: { ...formControlLabel },
    MuiFormLabel: { ...formLabel },
    MuiCheckbox: { ...checkbox },
    MuiRadio: { ...radio },
    MuiAutocomplete: { ...autocomplete },
    MuiPopover: { ...popover },
    MuiButtonBase: { ...buttonBase },
    MuiIcon: { ...icon },
    MuiSvgIcon: { ...svgIcon },
    MuiLink: { ...link },
    MuiDialog: { ...dialog },
    MuiDialogTitle: { ...dialogTitle },
    MuiDialogContent: { ...dialogContent },
    MuiDialogContentText: { ...dialogContentText },
    MuiDialogActions: { ...dialogActions },
  },
});
