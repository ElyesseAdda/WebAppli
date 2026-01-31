import React, { useState } from "react";
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Divider,
  Tooltip,
  useTheme,
  alpha,
} from "@mui/material";
import {
  MdBarChart,
  MdStore,
  MdDescription,
  MdInventory,
  MdChevronLeft,
  MdChevronRight,
  MdDashboard,
} from "react-icons/md";
import DistributeursDashboard from "./DistributeursDashboard";
import StatsTab from "./StatsTab";
import DocumentsTab from "./DocumentsTab";
import StockTab from "./StockTab";

// Logo client
import mjrLogo from "../../img/MJR SERVICES logo.jpg";

const DRAWER_WIDTH = 280;
const DRAWER_COLLAPSED_WIDTH = 80;

const menuItems = [
  { 
    id: 0, 
    label: "Statistiques", 
    icon: MdBarChart, 
    description: "Vue d'ensemble et analyses"
  },
  { 
    id: 1, 
    label: "Distributeurs", 
    icon: MdStore, 
    description: "Gestion des distributeurs"
  },
  { 
    id: 2, 
    label: "Stock", 
    icon: MdInventory, 
    description: "Inventaire et produits"
  },
  { 
    id: 3, 
    label: "Documents", 
    icon: MdDescription, 
    description: "Factures et rapports"
  },
];

const DesktopAppLayout = () => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(1); // 0: Stats, 1: Distributeur, 2: Stock, 3: Documents
  const [distributeurToOpen, setDistributeurToOpen] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleOpenDistributeur = (distributeurId) => {
    setDistributeurToOpen(distributeurId);
    setSelectedTab(1);
  };

  const renderContent = () => {
    switch (selectedTab) {
      case 0:
        return <StatsTab onOpenDistributeur={handleOpenDistributeur} isDesktop />;
      case 1:
        return (
          <DistributeursDashboard 
            initialDistributeurId={distributeurToOpen} 
            onDistributeurIdConsumed={() => setDistributeurToOpen(null)}
            isDesktop 
          />
        );
      case 2:
        return <StockTab isDesktop />;
      case 3:
        return <DocumentsTab isDesktop />;
      default:
        return <DistributeursDashboard isDesktop />;
    }
  };

  const drawerWidth = sidebarCollapsed ? DRAWER_COLLAPSED_WIDTH : DRAWER_WIDTH;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "#f8fafc" }}>
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": {
            width: drawerWidth,
            boxSizing: "border-box",
            borderRight: "none",
            bgcolor: "#ffffff",
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            boxShadow: "4px 0 24px rgba(0,0,0,0.04)",
            overflowX: "hidden",
          },
        }}
      >
        {/* Header de la sidebar - Logo client */}
        <Box
          sx={{
            height: sidebarCollapsed ? 80 : 100,
            display: "flex",
            alignItems: "center",
            justifyContent: sidebarCollapsed ? "center" : "space-between",
            px: sidebarCollapsed ? 1 : 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            bgcolor: "#ffffff",
          }}
        >
          {!sidebarCollapsed && (
            <Box 
              sx={{ 
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <img
                src={mjrLogo}
                alt="MJR Services"
                style={{
                  maxWidth: "180px",
                  maxHeight: "70px",
                  objectFit: "contain",
                }}
              />
            </Box>
          )}
          
          {sidebarCollapsed && (
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: "12px",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                bgcolor: "#f5f5f5",
              }}
            >
              <img
                src={mjrLogo}
                alt="MJR"
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            </Box>
          )}
          
          <Tooltip title={sidebarCollapsed ? "Développer" : "Réduire"} placement="right">
            <IconButton
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              size="small"
              sx={{
                bgcolor: alpha(theme.palette.grey[500], 0.08),
                position: sidebarCollapsed ? "absolute" : "relative",
                right: sidebarCollapsed ? 8 : "auto",
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.15),
                },
              }}
            >
              {sidebarCollapsed ? <MdChevronRight size={18} /> : <MdChevronLeft size={18} />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Navigation */}
        <Box sx={{ py: 2, px: sidebarCollapsed ? 1 : 2 }}>
          {!sidebarCollapsed && (
            <Typography
              variant="overline"
              sx={{
                px: 2,
                mb: 1,
                display: "block",
                color: "text.disabled",
                fontWeight: 700,
                letterSpacing: "1.5px",
                fontSize: "0.65rem",
              }}
            >
              Navigation
            </Typography>
          )}
          
          <List sx={{ px: 0 }}>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isSelected = selectedTab === item.id;
              
              return (
                <ListItem key={item.id} disablePadding sx={{ mb: 0.5 }}>
                  <Tooltip 
                    title={sidebarCollapsed ? item.label : ""} 
                    placement="right"
                    arrow
                  >
                    <ListItemButton
                      selected={isSelected}
                      onClick={() => {
                        setSelectedTab(item.id);
                        if (item.id !== 1) setDistributeurToOpen(null);
                      }}
                      sx={{
                        borderRadius: "14px",
                        py: 1.5,
                        px: sidebarCollapsed ? 2 : 2.5,
                        minHeight: 56,
                        justifyContent: sidebarCollapsed ? "center" : "flex-start",
                        transition: "all 0.2s ease",
                        "&.Mui-selected": {
                          bgcolor: alpha(theme.palette.primary.main, 0.1),
                          "&:hover": {
                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                          },
                          "& .MuiListItemIcon-root": {
                            color: "primary.main",
                          },
                          "& .MuiListItemText-primary": {
                            color: "primary.main",
                            fontWeight: 700,
                          },
                        },
                        "&:hover": {
                          bgcolor: alpha(theme.palette.primary.main, 0.05),
                          transform: "translateX(4px)",
                        },
                      }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: sidebarCollapsed ? 0 : 48,
                          justifyContent: "center",
                          color: isSelected ? "primary.main" : "text.secondary",
                        }}
                      >
                        <Box
                          sx={{
                            width: 40,
                            height: 40,
                            borderRadius: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: isSelected 
                              ? alpha(theme.palette.primary.main, 0.15)
                              : "transparent",
                            transition: "all 0.2s ease",
                          }}
                        >
                          <Icon size={22} />
                        </Box>
                      </ListItemIcon>
                      {!sidebarCollapsed && (
                        <ListItemText
                          primary={item.label}
                          secondary={item.description}
                          primaryTypographyProps={{
                            fontWeight: isSelected ? 700 : 600,
                            fontSize: "0.95rem",
                          }}
                          secondaryTypographyProps={{
                            fontSize: "0.75rem",
                            sx: { opacity: 0.7 },
                          }}
                        />
                      )}
                    </ListItemButton>
                  </Tooltip>
                </ListItem>
              );
            })}
          </List>
        </Box>

        {/* Footer de la sidebar */}
        <Box sx={{ mt: "auto", p: 2 }}>
          <Divider sx={{ mb: 2 }} />
          
          {/* Bouton retour à l'application principale */}
          <Tooltip title={sidebarCollapsed ? "Retour à P3000" : ""} placement="right">
            <Box
              component="a"
              href="https://myp3000app.com/"
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: sidebarCollapsed ? "center" : "flex-start",
                gap: 1.5,
                p: sidebarCollapsed ? 1.5 : 2,
                borderRadius: "14px",
                bgcolor: alpha(theme.palette.grey[500], 0.08),
                color: "text.secondary",
                textDecoration: "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
                mb: 2,
                "&:hover": {
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: "primary.main",
                  transform: "translateX(4px)",
                },
              }}
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  bgcolor: "background.paper",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                }}
              >
                <MdDashboard size={18} />
              </Box>
              {!sidebarCollapsed && (
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    Retour à P3000
                  </Typography>
                  <Typography variant="caption" sx={{ opacity: 0.7, fontSize: "0.7rem" }}>
                    Application principale
                  </Typography>
                </Box>
              )}
            </Box>
          </Tooltip>

          {!sidebarCollapsed && (
            <Box
              sx={{
                p: 2,
                borderRadius: "16px",
                background: "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
                textAlign: "center",
              }}
            >
              <Typography variant="caption" sx={{ color: "primary.dark", fontWeight: 600 }}>
                Version Desktop
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: "primary.main", fontWeight: 700, mt: 0.5 }}
              >
                Interface optimisée
              </Typography>
            </Box>
          )}
        </Box>
      </Drawer>

      {/* Contenu principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minHeight: "100vh",
          overflow: "auto",
          transition: theme.transitions.create("margin", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* Header du contenu */}
        <Box
          sx={{
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 4,
            bgcolor: "#ffffff",
            borderBottom: "1px solid",
            borderColor: "divider",
            position: "sticky",
            top: 0,
            zIndex: 100,
          }}
        >
          <Box>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 800,
                color: "text.primary",
                letterSpacing: "-0.5px",
              }}
            >
              {menuItems.find((m) => m.id === selectedTab)?.label || "Distributeurs"}
            </Typography>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
              {menuItems.find((m) => m.id === selectedTab)?.description || ""}
            </Typography>
          </Box>
          
          {/* Indicateur d'onglet actif */}
          <Box sx={{ display: "flex", gap: 1 }}>
            {menuItems.map((item) => (
              <Box
                key={item.id}
                onClick={() => setSelectedTab(item.id)}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  bgcolor: selectedTab === item.id ? "primary.main" : "grey.300",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "scale(1.3)",
                  },
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Zone de contenu */}
        <Box
          sx={{
            p: 3,
            minHeight: "calc(100vh - 80px)",
          }}
        >
          {renderContent()}
        </Box>
      </Box>
    </Box>
  );
};

export default DesktopAppLayout;
