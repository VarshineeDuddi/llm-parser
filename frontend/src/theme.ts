import { createTheme } from "@mui/material/styles";

const DISPLAY_FONT = '"Archivo", "Helvetica Neue", Arial, sans-serif';
const BODY_FONT = '"Public Sans", "Helvetica Neue", Arial, sans-serif';
export const MONO_FONT = '"IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, monospace';

export const theme = createTheme({
  palette: {
    primary: { main: "#2E5D8C" },
    secondary: { main: "#C98A2E" },
    success: { main: "#2F8F5B" },
    warning: { main: "#C98A2E" },
    error: { main: "#C1473D" },
    background: { default: "#EFF3EF", paper: "#FFFFFF" },
    text: { primary: "#17211C", secondary: "#4B5B54" },
    divider: "#D2DBD4",
  },
  typography: {
    fontFamily: BODY_FONT,
    h4: { fontFamily: DISPLAY_FONT, fontWeight: 700 },
    h5: { fontFamily: DISPLAY_FONT, fontWeight: 700 },
    h6: { fontFamily: DISPLAY_FONT, fontWeight: 600 },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { textTransform: "none", fontWeight: 600 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        head: {
          fontSize: "0.72rem",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
          color: "#4B5B54",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
        outlined: { borderColor: "#D2DBD4" },
      },
    },
  },
});
