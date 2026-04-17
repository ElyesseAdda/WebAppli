import React, { useState } from "react";
import { Box, BottomNavigation, BottomNavigationAction, Paper, Typography, AppBar, Toolbar, IconButton } from "@mui/material";
import { MdList, MdAdd, MdDescription, MdLogout } from "react-icons/md";
import RapportsPageMobile from "./RapportsPageMobile";
import RapportDetailMobile from "./RapportDetailMobile";
import RapportForm from "./RapportForm";
import { useAuth } from "../../hooks/useAuth";
import { COLORS } from "../../constants/colors";

const RapportMobileLayout = () => {
  const [currentView, setCurrentView] = useState("list");
  const [selectedRapportId, setSelectedRapportId] = useState(null);
  const [selectedServerBrouillonId, setSelectedServerBrouillonId] = useState(null);
  const [navValue, setNavValue] = useState(0);
  const { logout, user } = useAuth();

  const handleCreateNew = () => {
    setSelectedRapportId(null);
    setSelectedServerBrouillonId(null);
    setCurrentView("form");
    setNavValue(1);
  };

  const handleEditRapport = (rapport) => {
    if (rapport?.is_brouillon_serveur) {
      setSelectedRapportId(null);
      setSelectedServerBrouillonId(rapport.id);
    } else {
      setSelectedRapportId(typeof rapport === "object" ? rapport.id : rapport);
      setSelectedServerBrouillonId(null);
    }
    setCurrentView("form");
    setNavValue(1);
  };

  const handleBackToList = () => {
    setCurrentView("list");
    setSelectedRapportId(null);
    setSelectedServerBrouillonId(null);
    setNavValue(0);
  };

  const handleSelectRapport = (rapport) => {
    if (rapport?.is_brouillon_serveur) {
      setSelectedRapportId(null);
      setSelectedServerBrouillonId(rapport.id);
      setCurrentView("form");
      setNavValue(1);
      return;
    }
    const id = typeof rapport === "object" ? rapport.id : rapport;
    setSelectedServerBrouillonId(null);
    setSelectedRapportId(id);
    setCurrentView("detail");
  };

  const handleBackFromDetail = () => {
    setCurrentView("list");
    setSelectedRapportId(null);
    setSelectedServerBrouillonId(null);
    setNavValue(0);
  };

  const handleReportCreated = (id) => {
    setSelectedServerBrouillonId(null);
    setSelectedRapportId(id);
    setCurrentView("detail");
    setNavValue(0);
  };

  const handleNavChange = (event, newValue) => {
    setNavValue(newValue);
    if (newValue === 0) {
      setCurrentView("list");
      setSelectedRapportId(null);
      setSelectedServerBrouillonId(null);
    } else if (newValue === 1) {
      setSelectedRapportId(null);
      setSelectedServerBrouillonId(null);
      setCurrentView("form");
    }
  };

  const renderContent = () => {
    if (currentView === "form") {
      return (
        <RapportForm
          rapportId={selectedRapportId}
          serverBrouillonIdToLoad={selectedServerBrouillonId}
          onBack={handleBackToList}
          saveButtonAtBottom
          onReportCreated={handleReportCreated}
          onRapportIdAssigned={(id) => {
            setSelectedServerBrouillonId(null);
            setSelectedRapportId(id);
          }}
        />
      );
    }
    if (currentView === "detail" && selectedRapportId) {
      return (
        <RapportDetailMobile
          rapportId={selectedRapportId}
          onBack={handleBackFromDetail}
          onEdit={handleEditRapport}
        />
      );
    }
    return (
      <RapportsPageMobile
        onSelectRapport={handleSelectRapport}
        onEditRapport={handleEditRapport}
      />
    );
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
        bgcolor: "#f5f5f5",
      }}
    >
      <AppBar position="static" sx={{ backgroundColor: COLORS.infoDark || "#1976d2" }}>
        <Toolbar sx={{ minHeight: 56 }}>
          <MdDescription size={24} style={{ marginRight: 8 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: "1rem" }}>
            Rapports d'intervention
          </Typography>
          {user && (
            <Typography variant="caption" sx={{ mr: 1, opacity: 0.8 }}>
              {user.first_name || user.username}
            </Typography>
          )}
          <IconButton color="inherit" onClick={logout} size="small">
            <MdLogout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          pb: "80px",
        }}
      >
        {renderContent()}
      </Box>

      <Paper
        sx={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 10 }}
        elevation={3}
      >
        <BottomNavigation
          value={navValue}
          onChange={handleNavChange}
          showLabels
        >
          <BottomNavigationAction label="Rapports" icon={<MdList size={24} />} />
          <BottomNavigationAction label="Nouveau" icon={<MdAdd size={24} />} />
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default RapportMobileLayout;
