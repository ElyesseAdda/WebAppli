import React, { useState } from "react";
import { Box, BottomNavigation, BottomNavigationAction, Paper, AppBar, Toolbar, IconButton, Typography } from "@mui/material";
import {
  MdBarChart,
  MdStore,
  MdDescription,
  MdInventory,
  MdLogout,
} from "react-icons/md";
import { Home as HomeIcon } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import DistributeursDashboard from "./DistributeursDashboard";
import StatsTab from "./StatsTab";
import DocumentsTab from "./DocumentsTab";
import StockTab from "./StockTab";

const MobileAppLayout = () => {
  const [value, setValue] = useState(1); // 0: Stats, 1: Distributeur, 2: Stock, 3: Documents
  const [distributeurToOpen, setDistributeurToOpen] = useState(null);
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleOpenDistributeur = (distributeurId) => {
    setDistributeurToOpen(distributeurId);
    setValue(1);
  };

  const renderContent = () => {
    switch (value) {
      case 0:
        return <StatsTab onOpenDistributeur={handleOpenDistributeur} />;
      case 1:
        return <DistributeursDashboard initialDistributeurId={distributeurToOpen} onDistributeurIdConsumed={() => setDistributeurToOpen(null)} />;
      case 2:
        return <StockTab />;
      case 3:
        return <DocumentsTab />;
      default:
        return <DistributeursDashboard />;
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: "hidden",
        bgcolor: "background.default",
      }}
    >
      {/* AppBar avec navigation vers accueil mobile */}
      <AppBar position="static" sx={{ bgcolor: "#388e3c", flexShrink: 0 }}>
        <Toolbar sx={{ minHeight: 48 }}>
          <IconButton
            color="inherit"
            onClick={() => navigate("/mobile-home")}
            size="small"
            aria-label="Accueil mobile"
            sx={{ mr: 0.5 }}
          >
            <HomeIcon />
          </IconButton>
          <MdStore size={20} style={{ marginRight: 8 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "0.95rem", fontWeight: 700 }}>
            Distributeurs
          </Typography>
          {user && (
            <Typography variant="caption" sx={{ mr: 1, opacity: 0.85 }}>
              {user.first_name || user.username}
            </Typography>
          )}
          <IconButton color="inherit" onClick={logout} size="small" aria-label="Déconnexion">
            <MdLogout size={20} />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Contenu principal */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          pb: 14, // Espace pour la barre de navigation flottante
        }}
      >
        {renderContent()}
      </Box>

      {/* Barre de navigation en bas */}
      <Paper
        elevation={0}
        sx={{
          position: "fixed",
          bottom: 20,
          left: 20,
          right: 20,
          zIndex: 1000,
          borderRadius: "24px",
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
        }}
      >
        <BottomNavigation
          value={value}
          onChange={(event, newValue) => {
            setValue(newValue);
            if (newValue !== 1) setDistributeurToOpen(null);
          }}
          showLabels
          sx={{
            height: 70,
            bgcolor: "background.paper",
            "& .MuiBottomNavigationAction-root": {
              minWidth: 0,
              padding: "12px 0",
              color: "text.disabled",
              "&.Mui-selected": {
                color: "primary.main",
                "& .MuiBottomNavigationAction-label": {
                  fontSize: "0.75rem",
                  fontWeight: 800,
                }
              },
            },
            "& .MuiBottomNavigationAction-label": {
              fontSize: "0.7rem",
              fontWeight: 600,
              marginTop: "4px",
              transition: "all 0.2s ease"
            },
          }}
        >
          <BottomNavigationAction
            label="Stats"
            icon={<MdBarChart size={26} />}
          />
          <BottomNavigationAction
            label="Distributeur"
            icon={<MdStore size={26} />}
          />
          <BottomNavigationAction
            label="Stock"
            icon={<MdInventory size={26} />}
          />
          <BottomNavigationAction
            label="Documents"
            icon={<MdDescription size={26} />}
          />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default MobileAppLayout;
