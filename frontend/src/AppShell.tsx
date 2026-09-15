import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import { MONO_FONT } from "./theme";

const SIDEBAR_WIDTH = 224;

const NAV_LINKS = [
  { to: "/", label: "Library", icon: "▤" },
  { to: "/upload", label: "Upload", icon: "↑" },
  { to: "/fields", label: "Field Explorer", icon: "⌕" },
  { to: "/document-types", label: "Document Types", icon: "▦" },
  { to: "/needs-review", label: "Needs Review", icon: "◈" },
];

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const location = useLocation();

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Drawer
        variant="permanent"
        component="nav"
        aria-label="Main navigation"
        sx={{
          width: SIDEBAR_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: SIDEBAR_WIDTH,
            boxSizing: "border-box",
            borderRight: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            px: 1.5,
            py: 2.5,
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, px: 1, mb: 2.5 }}>
          <Box
            sx={{
              width: 30,
              height: 30,
              borderRadius: "8px",
              bgcolor: "primary.main",
              color: "primary.contrastText",
              display: "grid",
              placeItems: "center",
              fontFamily: '"Archivo", sans-serif',
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
            aria-hidden
          >
            DP
          </Box>
          <Box>
            <Typography variant="h6" sx={{ fontSize: 15.5, lineHeight: 1.2 }}>
              Document Parser
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              MVP console
            </Typography>
          </Box>
        </Box>

        <List sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
          {NAV_LINKS.map((link) => {
            const active = location.pathname === link.to;
            return (
              <ListItemButton
                key={link.to}
                component={Link}
                to={link.to}
                selected={active}
                sx={{
                  borderRadius: 2,
                  py: 1,
                  color: active ? "primary.main" : "text.secondary",
                  "&.Mui-selected": {
                    bgcolor: "action.selected",
                  },
                  "&.Mui-selected:hover": {
                    bgcolor: "action.selected",
                  },
                }}
              >
                <Box component="span" aria-hidden sx={{ width: 20, textAlign: "center", mr: 1.25 }}>
                  {link.icon}
                </Box>
                <ListItemText
                  primary={link.label}
                  slotProps={{ primary: { sx: { fontSize: 13.5, fontWeight: 500 } } }}
                />
              </ListItemButton>
            );
          })}
        </List>

        <Box sx={{ mt: "auto", pt: 2, px: 1, borderTop: "1px solid", borderColor: "divider" }}>
          <Typography variant="caption" sx={{ color: "text.secondary", fontFamily: MONO_FONT }}>
            Document Parser (MVP)
          </Typography>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0 }}>
        {children}
      </Box>
    </Box>
  );
}
