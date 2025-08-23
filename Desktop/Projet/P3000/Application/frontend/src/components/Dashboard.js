import ConstructionIcon from "@mui/icons-material/Construction";
import { Box, Container, Paper, Typography } from "@mui/material";
import React from "react";

const Dashboard = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper
        elevation={3}
        sx={{
          p: 6,
          textAlign: "center",
          borderRadius: 3,
          background: "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        }}
      >
        <Box sx={{ mb: 3 }}>
          <ConstructionIcon
            sx={{
              fontSize: 80,
              color: "#ff9800",
              mb: 2,
            }}
          />
        </Box>

        <Typography
          variant="h4"
          component="h1"
          gutterBottom
          sx={{
            fontWeight: "bold",
            color: "#333",
            mb: 2,
          }}
        >
          🚧 Dashboard en cours de développement
        </Typography>

        <Typography variant="h6" color="text.secondary" sx={{ mb: 3 }}>
          Cette fonctionnalité sera bientôt disponible
        </Typography>

        <Typography
          variant="body1"
          color="text.secondary"
          sx={{
            maxWidth: 600,
            mx: "auto",
            lineHeight: 1.6,
          }}
        >
          Nous travaillons activement sur le tableau de bord pour vous offrir
          une vue d'ensemble complète de vos chantiers, statistiques et
          performances. Merci de votre patience !
        </Typography>

        <Box sx={{ mt: 4 }}>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontStyle: "italic" }}
          >
            En attendant, vous pouvez utiliser les autres fonctionnalités de
            l'application.
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Dashboard;
