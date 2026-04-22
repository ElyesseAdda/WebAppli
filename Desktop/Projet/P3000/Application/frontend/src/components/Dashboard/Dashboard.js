import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  OutlinedInput,
  Checkbox,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  DashboardFiltersProvider,
  useDashboardFilters,
} from "./DashboardFiltersContext";
import DashboardRevenueMockChart from "./DashboardRevenueMockChart";
import DashboardCardsGrid from "./DashboardCardsGrid";

// Composant interne qui utilise les filtres
const DashboardContent = () => {
  const { selectedYear, comparisonYears, periodStart, periodEnd } = useDashboardFilters();
  const [dashboardData, setDashboardData] = useState(null);
  const [comparisonDashboardData, setComparisonDashboardData] = useState(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);

  const getPeriodBoundaries = (startMonth, endMonth) => {
    if (!startMonth || !endMonth) return {};
    const startDate = `${startMonth}-01`;
    const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
    if (!endYear || !endMonthNumber) return {};
    const lastDay = new Date(endYear, endMonthNumber, 0).getDate();
    const endDate = `${endMonth}-${String(lastDay).padStart(2, "0")}`;
    return { startDate, endDate };
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setDashboardLoading(true);
        setDashboardError(null);
        const { startDate, endDate } = getPeriodBoundaries(periodStart, periodEnd);
        const referenceYear = comparisonYears.length ? Number(comparisonYears[0]) : selectedYear - 1;

        const [currentResponse, referenceResponse] = await Promise.all([
          axios.get("/api/dashboard/", {
            params: {
              year: selectedYear,
              years: comparisonYears.length ? comparisonYears.join(",") : undefined,
              period_start: startDate,
              period_end: endDate,
            },
          }),
          axios.get("/api/dashboard/", {
            params: {
              year: referenceYear,
              period_start: startDate,
              period_end: endDate,
            },
          }),
        ]);

        setDashboardData(currentResponse.data || null);
        setComparisonDashboardData(referenceResponse.data || null);
      } catch (err) {
        console.error("Erreur chargement dashboard:", err);
        setDashboardError("Erreur lors de la recuperation des donnees.");
      } finally {
        setDashboardLoading(false);
      }
    };

    fetchDashboardData();
  }, [selectedYear, comparisonYears, periodStart, periodEnd]);

  const totalCA = Number(dashboardData?.global_stats?.total_montant_ht || 0);
  const comparisonYear = comparisonYears.length ? Number(comparisonYears[0]) : selectedYear - 1;
  const comparisonTotalCA = Number(
    comparisonDashboardData?.global_stats?.total_montant_ht || 0
  );
  const caProgress =
    comparisonTotalCA > 0 ? ((totalCA - comparisonTotalCA) / comparisonTotalCA) * 100 : null;

  return (
    <Box sx={{ position: "relative" }}>
      <Paper
        elevation={0}
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: "12px",
          border: "1px dashed #d1d5db",
          bgcolor: "#f9fafb",
        }}
      >
        <Typography variant="body2" sx={{ color: "#374151", fontWeight: 600 }}>
          Maquette visuelle - donnees en dur
        </Typography>
        <Typography variant="caption" sx={{ color: "#6b7280" }}>
          Annee base: {selectedYear} | Comparaison:{" "}
          {comparisonYears.length ? comparisonYears.join(", ") : "Aucune"} | Periode:{" "}
          {periodStart && periodEnd ? `${periodStart} a ${periodEnd}` : "Non definie"}
        </Typography>
        {dashboardError && (
          <Typography variant="caption" sx={{ display: "block", color: "#b91c1c", mt: 0.5 }}>
            {dashboardError}
          </Typography>
        )}
      </Paper>

      <Box
        sx={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: { xs: "1fr", xl: "1fr 1fr" },
          gap: 2,
          alignItems: "stretch",
        }}
      >
        <DashboardRevenueMockChart />
        <DashboardCardsGrid
          totalCA={totalCA}
          totalCALoading={dashboardLoading}
          totalCAProgress={caProgress}
          totalCAComparisonYear={comparisonYear}
        />
      </Box>
    </Box>
  );
};

// Composant de sélection des filtres
const DashboardFilters = () => {
  const {
    selectedYear,
    updateYear,
    comparisonYears,
    updateComparisonYears,
    periodStart,
    periodEnd,
    updatePeriod,
    clearPeriod,
  } = useDashboardFilters();
  const [periodModalOpen, setPeriodModalOpen] = useState(false);
  const [draftPeriodStart, setDraftPeriodStart] = useState(periodStart);
  const [draftPeriodEnd, setDraftPeriodEnd] = useState(periodEnd);

  // Générer une liste d'années (année courante - 2 à année courante + 2)
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: 8 },
    (_, i) => currentYear - 4 + i
  );

  const openPeriodModal = () => {
    setDraftPeriodStart(periodStart);
    setDraftPeriodEnd(periodEnd);
    setPeriodModalOpen(true);
  };

  const applyPeriod = () => {
    if (draftPeriodStart && draftPeriodEnd && draftPeriodStart > draftPeriodEnd) {
      return;
    }
    updatePeriod(draftPeriodStart, draftPeriodEnd);
    setPeriodModalOpen(false);
  };

  return (
    <>
      <Paper
        elevation={2}
        sx={{
          p: 2,
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          Filtres :
        </Typography>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="year-select-label">Année de base</InputLabel>
          <Select
            labelId="year-select-label"
            id="year-select"
            value={selectedYear}
            label="Année de base"
            onChange={(e) => updateYear(Number(e.target.value))}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="comparison-years-label">Comparer avec</InputLabel>
          <Select
            labelId="comparison-years-label"
            id="comparison-years"
            multiple
            value={comparisonYears}
            onChange={(e) => updateComparisonYears(e.target.value)}
            input={<OutlinedInput label="Comparer avec" />}
            renderValue={(selected) => (selected.length ? selected.join(", ") : "Aucune")}
          >
            {years
              .filter((year) => year !== selectedYear)
              .map((year) => (
                <MenuItem key={year} value={year}>
                  <Checkbox checked={comparisonYears.indexOf(year) > -1} />
                  <ListItemText primary={String(year)} />
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <Button variant="outlined" onClick={openPeriodModal}>
          Periode personnalisee
        </Button>
        {periodStart && periodEnd && (
          <Button variant="text" color="inherit" onClick={clearPeriod}>
            Reinitialiser periode
          </Button>
        )}
      </Paper>

      <Dialog open={periodModalOpen} onClose={() => setPeriodModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Filtrer par periode</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField
            label="Du mois"
            type="month"
            value={draftPeriodStart}
            onChange={(e) => setDraftPeriodStart(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Au mois"
            type="month"
            value={draftPeriodEnd}
            onChange={(e) => setDraftPeriodEnd(e.target.value)}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          {draftPeriodStart && draftPeriodEnd && draftPeriodStart > draftPeriodEnd && (
            <Typography variant="body2" color="error">
              La date de debut doit etre anterieure ou egale a la date de fin.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPeriodModalOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={applyPeriod}
            disabled={draftPeriodStart && draftPeriodEnd && draftPeriodStart > draftPeriodEnd}
          >
            Appliquer
          </Button>
        </DialogActions>
      </Dialog>
    </>
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
            maxWidth: "1360px",
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

