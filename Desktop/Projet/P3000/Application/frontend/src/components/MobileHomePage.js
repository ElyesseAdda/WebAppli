import React, { useEffect } from "react";
import { Box, Typography, Paper, CircularProgress } from "@mui/material";
import {
  AssignmentOutlined as RapportsIcon,
  StorefrontOutlined as DistributeurIcon,
  FolderOpenOutlined as DriveIcon,
  ErrorOutline as NoAccessIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { useAuth, getUserMobileAccess } from "../hooks/useAuth";
import logo from "../img/apple-touch-icon.png";

const SECTIONS = [
  {
    key: "can_access_rapports",
    label: "Rapports",
    description: "Rapports d'intervention",
    icon: RapportsIcon,
    route: "/rapports-mobile",
    gradient: "linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)",
  },
  {
    key: "can_access_distributeur",
    label: "Distributeur",
    description: "Gestion des distributeurs",
    icon: DistributeurIcon,
    route: "/distributeurs",
    gradient: "linear-gradient(135deg, #388e3c 0%, #66bb6a 100%)",
  },
  {
    key: "can_access_drive",
    label: "Drive",
    description: "Accès aux documents",
    icon: DriveIcon,
    route: "/drive-mobile",
    gradient: "linear-gradient(135deg, #f57c00 0%, #ffb74d 100%)",
  },
];

const MobileHomePage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const mobileAccess = getUserMobileAccess(user);
  const availableSections = SECTIONS.filter((s) => mobileAccess[s.key]);

  // Redirection automatique si une seule section disponible
  useEffect(() => {
    if (!loading && user && availableSections.length === 1) {
      navigate(availableSections[0].route, { replace: true });
    }
  }, [loading, user, availableSections.length]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          bgcolor: "#f5f5f5",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        bgcolor: "#f0f4f8",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflowY: "auto",
      }}
    >
      {/* En-tête */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #1565c0 0%, #1976d2 100%)",
          pt: 5,
          pb: 4,
          px: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 2,
        }}
      >
        <Box
          component="img"
          src={logo}
          alt="Logo"
          sx={{ width: 64, height: 64, borderRadius: 2, boxShadow: 3 }}
        />
        <Typography
          variant="h5"
          sx={{ color: "white", fontWeight: 700, textAlign: "center" }}
        >
          {user?.first_name ? `Bonjour, ${user.first_name}` : "Bienvenue"}
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "rgba(255,255,255,0.8)", textAlign: "center" }}
        >
          Choisissez votre espace de travail
        </Typography>
      </Box>

      {/* Cartes de navigation */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          p: 3,
          pt: 4,
        }}
      >
        {availableSections.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              gap: 2,
              mt: 4,
            }}
          >
            <NoAccessIcon sx={{ fontSize: 64, color: "text.disabled" }} />
            <Typography
              variant="h6"
              sx={{ color: "text.secondary", textAlign: "center", fontWeight: 600 }}
            >
              Aucun accès configuré
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: "text.disabled", textAlign: "center", maxWidth: 280 }}
            >
              Contactez votre administrateur pour obtenir l'accès aux sections
              de l'application.
            </Typography>
          </Box>
        ) : (
          availableSections.map((section) => {
            const Icon = section.icon;
            return (
              <Paper
                key={section.key}
                elevation={0}
                onClick={() => navigate(section.route)}
                sx={{
                  background: section.gradient,
                  borderRadius: 3,
                  p: 3,
                  display: "flex",
                  alignItems: "center",
                  gap: 2.5,
                  cursor: "pointer",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                  "&:active": {
                    transform: "scale(0.97)",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  },
                  userSelect: "none",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                <Box
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    borderRadius: 2,
                    p: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon sx={{ fontSize: 32, color: "white" }} />
                </Box>
                <Box>
                  <Typography
                    variant="h6"
                    sx={{ color: "white", fontWeight: 700, lineHeight: 1.2 }}
                  >
                    {section.label}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: "rgba(255,255,255,0.85)", mt: 0.5 }}
                  >
                    {section.description}
                  </Typography>
                </Box>
                <Box sx={{ ml: "auto", color: "rgba(255,255,255,0.7)", fontSize: 24 }}>
                  ›
                </Box>
              </Paper>
            );
          })
        )}
      </Box>

      {/* Pied de page */}
      <Box sx={{ pb: 4, textAlign: "center" }}>
        <Typography variant="caption" sx={{ color: "text.disabled" }}>
          {user?.username}
        </Typography>
      </Box>
    </Box>
  );
};

export default MobileHomePage;
