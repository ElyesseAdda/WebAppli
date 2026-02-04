import { createTheme } from "@mui/material/styles";
import { COLORS } from "../constants/colors";

const theme = createTheme({
  palette: {
    primary: {
      main: COLORS.primary,
      dark: COLORS.primaryDark,
      light: COLORS.primaryLight,
    },
    secondary: {
      main: COLORS.secondary,
      dark: COLORS.secondaryDark,
      light: COLORS.secondaryLight,
    },
    error: {
      main: COLORS.error,
      dark: COLORS.errorDark,
      light: COLORS.errorLight,
    },
    warning: {
      main: COLORS.warning,
      dark: COLORS.warningDark,
      light: COLORS.warningLight,
    },
    success: {
      main: COLORS.success,
      dark: COLORS.successDark,
      light: COLORS.successLight,
    },
    info: {
      main: COLORS.info,
      dark: COLORS.infoDark,
      light: COLORS.infoLight,
    },
  },
});

export default theme;
