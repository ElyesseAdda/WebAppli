import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  DashboardFiltersProvider,
  useDashboardFilters,
} from "./DashboardFiltersContext";
import SituationsSummary from "./Paiement/SituationsSummary";

// Composant interne qui utilise les filtres
const DashboardContent = () => {
  const { selectedYear } = useDashboardFilters();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedYear]); // Recharger les données quand l'année change

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/dashboard/", {
        params: {
          year: selectedYear,
        },
      });
      setDashboardData(response.data);
    } catch (err) {
      console.error("Erreur lors du chargement du dashboard:", err);
      setError("Impossible de charger les données du dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", py: 4 }}>
        <CircularProgress />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Chargement des données...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ py: 2 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative" }}>
      {/* Section Paiement - Situations */}
      <Box sx={{ mb: 4, position: "relative" }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ mb: 2 }}>
         
        </Typography>
        <SituationsSummary />
      </Box>

      {/* Autres sections du dashboard */}
      {dashboardData && (
        <Typography variant="body1" color="text.secondary">
         
        </Typography>
      )}
    </Box>
  );
};

// Composant de sélection des filtres
const DashboardFilters = () => {
  const { selectedYear, updateYear } = useDashboardFilters();

  // Générer une liste d'années (année courante - 2 à année courante + 2)
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: 5 },
    (_, i) => currentYear - 2 + i
  );

  return (
    <Paper
      elevation={2}
      sx={{
        p: 2,
        mb: 3,
        display: "flex",
        alignItems: "center",
        gap: 2,
      }}
    >
      <Typography variant="body1" sx={{ fontWeight: 500 }}>
        Filtres :
      </Typography>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel id="year-select-label">Année</InputLabel>
        <Select
          labelId="year-select-label"
          id="year-select"
          value={selectedYear}
          label="Année"
          onChange={(e) => updateYear(Number(e.target.value))}
        >
          {years.map((year) => (
            <MenuItem key={year} value={year}>
              {year}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </Paper>
  );
};

// Composant principal du Dashboard
const Dashboard = () => {
  return (
    <DashboardFiltersProvider>
      <Container maxWidth={false} sx={{ mt: 4, mb: 4, px: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 4,
            gap: 2,
          }}
        >
          <Typography variant="h4" component="h1" sx={{ color: "white", fontWeight: "bold" }}>
            Tableau de Bord
          </Typography>

          {/* Section des filtres */}
          <DashboardFilters />
        </Box>

        {/* Contenu du dashboard avec accès aux filtres */}
        <DashboardContent />
      </Container>
    </DashboardFiltersProvider>
  );
};

export default Dashboard;

