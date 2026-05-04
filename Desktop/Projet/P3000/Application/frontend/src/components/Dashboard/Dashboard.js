import {
  Box,
  Container,
  Typography,
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
import FilterAltOutlinedIcon from "@mui/icons-material/FilterAltOutlined";
import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import {
  DashboardFiltersProvider,
  useDashboardFilters,
} from "./DashboardFiltersContext";
import DashboardCardsGrid from "./DashboardCardsGrid";

// Composant interne qui utilise les filtres
const DashboardContent = () => {
  const {
    selectedYear,
    comparisonYears,
    periodStart,
    periodEnd,
    setDepensesAgenceIncludedAgenceIds,
    depensesAgenceIncludedAgenceIds,
    chartFocusMonthKey,
    setChartFocusMonthKey,
  } = useDashboardFilters();
  const [dashboardData, setDashboardData] = useState(null);
  const [comparisonDashboardData, setComparisonDashboardData] = useState(null);
  const [comparisonDashboardsByYear, setComparisonDashboardsByYear] = useState({});
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState(null);

  const depensesSettingsHydrated = useRef(false);
  /** Dernière réponse « période large » (graphique + stats année / plage) pour réappliquer au désengagement mois. */
  const wideDashboardSnapshotRef = useRef(null);

  const referenceYears = useMemo(
    () =>
      comparisonYears.length > 0
        ? comparisonYears.map((y) => Number(y)).filter((y) => Number.isFinite(y))
        : [selectedYear - 1],
    [comparisonYears, selectedYear]
  );

  const drillFetchParamsRef = useRef({
    selectedYear,
    comparisonYears,
    referenceYears,
  });
  drillFetchParamsRef.current = { selectedYear, comparisonYears, referenceYears };

  useEffect(() => {
    if (depensesSettingsHydrated.current) return;
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await axios.get("/api/dashboard/settings/");
        if (cancelled) return;
        depensesSettingsHydrated.current = true;
        if (data.depenses_agence_use_default) {
          setDepensesAgenceIncludedAgenceIds(null);
        } else if (Array.isArray(data.depenses_agence_included_agence_ids)) {
          setDepensesAgenceIncludedAgenceIds(data.depenses_agence_included_agence_ids);
        }
      } catch (err) {
        console.error("Chargement parametres dashboard:", err);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [setDepensesAgenceIncludedAgenceIds]);

  const getPeriodBoundaries = (startMonth, endMonth) => {
    if (!startMonth || !endMonth) return {};
    const startDate = `${startMonth}-01`;
    const [endYear, endMonthNumber] = endMonth.split("-").map(Number);
    if (!endYear || !endMonthNumber) return {};
    const lastDay = new Date(endYear, endMonthNumber, 0).getDate();
    const endDate = `${endMonth}-${String(lastDay).padStart(2, "0")}`;
    return { startDate, endDate };
  };

  const shiftDateByYears = (isoDate, yearsDelta) => {
    if (!isoDate) return undefined;
    const [y, m, d] = isoDate.split("-").map(Number);
    if (!y || !m || !d) return undefined;
    const targetYear = y + yearsDelta;
    const maxDay = new Date(targetYear, m, 0).getDate();
    const safeDay = Math.min(d, maxDay);
    return `${targetYear}-${String(m).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
  };

  useEffect(() => {
    let cancelled = false;
    const fetchDashboardData = async () => {
      try {
        setDashboardLoading(true);
        setDashboardError(null);
        const { startDate, endDate } = getPeriodBoundaries(periodStart, periodEnd);
        const referenceRequests = referenceYears.map((referenceYear) => {
          const yearsDelta = referenceYear - selectedYear;
          const referenceStartDate =
            startDate && endDate ? shiftDateByYears(startDate, yearsDelta) : undefined;
          const referenceEndDate =
            startDate && endDate ? shiftDateByYears(endDate, yearsDelta) : undefined;
          return axios.get("/api/dashboard/", {
            params: {
              year: referenceYear,
              period_start: referenceStartDate,
              period_end: referenceEndDate,
            },
          });
        });

        const [currentResponse, ...referenceResponses] = await Promise.all([
          axios.get("/api/dashboard/", {
            params: {
              year: selectedYear,
              years: comparisonYears.length ? comparisonYears.join(",") : undefined,
              period_start: startDate,
              period_end: endDate,
            },
          }),
          ...referenceRequests,
        ]);

        if (cancelled) return;
        const byYear = {};
        referenceYears.forEach((yr, idx) => {
          byYear[yr] = referenceResponses[idx]?.data || null;
        });
        wideDashboardSnapshotRef.current = {
          current: currentResponse.data || null,
          comparison0: referenceResponses[0]?.data || null,
          byYear,
        };
        setDashboardData(currentResponse.data || null);
        setComparisonDashboardData(referenceResponses[0]?.data || null);
        setComparisonDashboardsByYear(byYear);
        setChartFocusMonthKey(null);
      } catch (err) {
        if (!cancelled) {
          console.error("Erreur chargement dashboard:", err);
          setDashboardError("Erreur lors de la recuperation des donnees.");
        }
      } finally {
        if (!cancelled) setDashboardLoading(false);
      }
    };

    fetchDashboardData();
    return () => {
      cancelled = true;
    };
  }, [selectedYear, comparisonYears, periodStart, periodEnd, referenceYears, setChartFocusMonthKey]);

  useEffect(() => {
    if (!chartFocusMonthKey) {
      const snap = wideDashboardSnapshotRef.current;
      if (!snap?.current) return;
      setDashboardData(snap.current);
      setComparisonDashboardData(snap.comparison0);
      setComparisonDashboardsByYear({ ...snap.byYear });
      return;
    }

    let cancelled = false;
    const run = async () => {
      try {
        const { selectedYear: sy, comparisonYears: cy, referenceYears: ry } = drillFetchParamsRef.current;
        const { startDate, endDate } = getPeriodBoundaries(chartFocusMonthKey, chartFocusMonthKey);
        if (!startDate || !endDate) return;

        const referenceRequests = ry.map((referenceYear) => {
          const yearsDelta = referenceYear - sy;
          const referenceStartDate = shiftDateByYears(startDate, yearsDelta);
          const referenceEndDate = shiftDateByYears(endDate, yearsDelta);
          return axios.get("/api/dashboard/", {
            params: {
              year: referenceYear,
              period_start: referenceStartDate,
              period_end: referenceEndDate,
            },
          });
        });

        const [currentResponse, ...referenceResponses] = await Promise.all([
          axios.get("/api/dashboard/", {
            params: {
              year: sy,
              years: cy.length ? cy.join(",") : undefined,
              period_start: startDate,
              period_end: endDate,
            },
          }),
          ...referenceRequests,
        ]);

        if (cancelled) return;
        const byYear = {};
        ry.forEach((yr, idx) => {
          byYear[yr] = referenceResponses[idx]?.data || null;
        });
        setDashboardData(currentResponse.data || null);
        setComparisonDashboardData(referenceResponses[0]?.data || null);
        setComparisonDashboardsByYear(byYear);
      } catch (err) {
        if (!cancelled) {
          console.error("Erreur chargement dashboard (mois):", err);
          setDashboardError("Erreur lors de la recuperation des donnees.");
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [chartFocusMonthKey]);

  const totalCA = Number(dashboardData?.global_stats?.total_montant_ht || 0);
  const comparisonYear = referenceYears[0];
  const comparisonTotalCA = Number(
    comparisonDashboardData?.global_stats?.total_montant_ht || 0
  );
  const caProgress =
    comparisonTotalCA > 0 ? ((totalCA - comparisonTotalCA) / comparisonTotalCA) * 100 : null;
  const coutMateriel = Number(dashboardData?.global_stats?.total_cout_materiel || 0);
  const coutMainOeuvre = Number(dashboardData?.global_stats?.total_cout_main_oeuvre || 0);
  const mainOeuvreMonthlyBreakdown =
    dashboardData?.global_stats?.main_oeuvre_monthly_breakdown ?? [];
  const coutSousTraitance = Number(
    dashboardData?.global_stats?.total_cout_sous_traitance || 0
  );
  const coutChantierGlobal = coutMateriel + coutMainOeuvre + coutSousTraitance;
  const depensesAgenceBreakdown = dashboardData?.global_stats?.depenses_agence_breakdown || [];
  const depensesAgencePointageHt = Number(
    dashboardData?.global_stats?.depenses_agence_pointage_ht || 0
  );

  /**
   * Somme des `total_ht` du breakdown tel qu’affiché dans le popover (même logique agence + pointage
   * découpé côté API). Équivalent à « toutes les agences cochées » — pas le total brut API isolé.
   */
  const sumBreakdownTotalHt = (bd) =>
    Array.isArray(bd) ? bd.reduce((s, r) => s + Number(r.total_ht || 0), 0) : 0;
  const depensesAgencePourMargeHt = sumBreakdownTotalHt(depensesAgenceBreakdown);

  const comparisonCoutMateriel = Number(
    comparisonDashboardData?.global_stats?.total_cout_materiel || 0
  );
  const comparisonCoutMainOeuvre = Number(
    comparisonDashboardData?.global_stats?.total_cout_main_oeuvre || 0
  );
  const comparisonCoutSousTraitance = Number(
    comparisonDashboardData?.global_stats?.total_cout_sous_traitance || 0
  );
  const comparisonCoutChantierGlobal =
    comparisonCoutMateriel + comparisonCoutMainOeuvre + comparisonCoutSousTraitance;
  const comparisonDepensesAgenceBreakdown =
    comparisonDashboardData?.global_stats?.depenses_agence_breakdown || [];
  const comparisonDepensesAgencePourMargeHt =
    sumBreakdownTotalHt(comparisonDepensesAgenceBreakdown);

  const margeBrute = totalCA - coutChantierGlobal - depensesAgencePourMargeHt;
  const margeBruteRate = totalCA > 0 ? (margeBrute / totalCA) * 100 : 0;
  const margeBruteComparaison =
    comparisonTotalCA - comparisonCoutChantierGlobal - comparisonDepensesAgencePourMargeHt;
  const margeBruteProgress =
    margeBruteComparaison !== 0 && Number.isFinite(margeBruteComparaison)
      ? ((margeBrute - margeBruteComparaison) / Math.abs(margeBruteComparaison)) * 100
      : null;
  const montantFacturePayeHt = Number(
    dashboardData?.global_stats?.encaissement_paye_ht || 0
  );
  const burn15JHt = Number(dashboardData?.global_stats?.burn_15j_ht || 0);
  const latePaymentsHt = Number(dashboardData?.global_stats?.late_payments_ht || 0);
  const wideForChart = wideDashboardSnapshotRef.current;
  const monthlyCashflow =
    wideForChart?.current?.global_stats?.monthly_cashflow ??
    dashboardData?.global_stats?.monthly_cashflow ??
    [];
  const comparisonYearSeries = referenceYears.map((yr) => ({
    year: yr,
    monthlyCashflow:
      wideForChart?.byYear?.[yr]?.global_stats?.monthly_cashflow ??
      comparisonDashboardsByYear?.[yr]?.global_stats?.monthly_cashflow ??
      [],
  }));

  return (
    <Box sx={{ position: "relative" }}>
      {dashboardError && (
        <Typography variant="caption" sx={{ display: "block", color: "#b91c1c", mb: 1.5 }}>
          {dashboardError}
        </Typography>
      )}
      <DashboardCardsGrid
        totalCA={totalCA}
        totalCALoading={dashboardLoading}
        totalCAProgress={caProgress}
        totalCAComparisonYear={comparisonYear}
        margeBrute={margeBrute}
        margeBruteRate={margeBruteRate}
        margeBruteLoading={dashboardLoading}
        margeBruteProgress={margeBruteProgress}
        margeBruteComparisonYear={comparisonYear}
        coutChantierGlobal={coutChantierGlobal}
        coutMateriel={coutMateriel}
        coutMainOeuvre={coutMainOeuvre}
        mainOeuvreMonthlyBreakdown={mainOeuvreMonthlyBreakdown}
        coutSousTraitance={coutSousTraitance}
        coutChantierLoading={dashboardLoading}
        depensesAgenceBreakdown={depensesAgenceBreakdown}
        depensesAgencePointageHt={depensesAgencePointageHt}
        montantFacturePayeHt={montantFacturePayeHt}
        burn15JHt={burn15JHt}
        latePaymentsHt={latePaymentsHt}
        monthlyCashflow={monthlyCashflow}
        comparisonYearSeries={comparisonYearSeries}
        selectedYear={selectedYear}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
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

  const compactSelectSx = {
    "& .MuiOutlinedInput-root": {
      fontSize: "0.8125rem",
      minHeight: 36,
      "& .MuiSelect-select": { py: 0.65, display: "flex", alignItems: "center" },
    },
    "& .MuiInputLabel-root": { fontSize: "0.8125rem" },
  };

  return (
    <>
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.25,
          rowGap: 1,
          px: 1.5,
          py: 1,
          width: "fit-content",
          maxWidth: "none",
          backgroundColor: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
        }}
      >
        <FilterAltOutlinedIcon
          sx={{ fontSize: 18, color: "#94a3b8", flexShrink: 0, display: { xs: "none", sm: "block" } }}
        />
        <FormControl size="small" sx={{ minWidth: { xs: 120, sm: 132 }, ...compactSelectSx }}>
          <InputLabel id="year-select-label">Année</InputLabel>
          <Select
            labelId="year-select-label"
            id="year-select"
            value={selectedYear}
            label="Année"
            onChange={(e) => updateYear(Number(e.target.value))}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year} sx={{ fontSize: "0.8125rem" }}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: 160, sm: 200 }, ...compactSelectSx }}>
          <InputLabel id="comparison-years-label">Comparaison</InputLabel>
          <Select
            labelId="comparison-years-label"
            id="comparison-years"
            multiple
            value={comparisonYears}
            onChange={(e) => updateComparisonYears(e.target.value)}
            input={<OutlinedInput label="Comparaison" />}
            renderValue={(selected) => (selected.length ? selected.join(", ") : "Aucune")}
          >
            {years
              .filter((year) => year !== selectedYear)
              .map((year) => (
                <MenuItem key={year} value={year} dense sx={{ fontSize: "0.8125rem" }}>
                  <Checkbox size="small" checked={comparisonYears.indexOf(year) > -1} />
                  <ListItemText primary={String(year)} />
                </MenuItem>
              ))}
          </Select>
        </FormControl>

        <Button
          size="small"
          variant="outlined"
          onClick={openPeriodModal}
          sx={{
            textTransform: "none",
            fontSize: "0.8125rem",
            py: 0.45,
            px: 1.25,
            minHeight: 36,
            borderColor: "#e2e8f0",
            color: "#475569",
            "&:hover": { borderColor: "#cbd5e1", bgcolor: "rgba(148,163,184,0.08)" },
          }}
        >
          Période…
        </Button>
        {periodStart && periodEnd && (
          <Button
            size="small"
            variant="text"
            onClick={clearPeriod}
            sx={{ fontSize: "0.75rem", color: "#64748b", textTransform: "none", minHeight: 36 }}
          >
            Réinitialiser période
          </Button>
        )}
      </Box>

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
      <Container maxWidth={false} sx={{ mt: 2, mb: 4, px: 3 }}>
        <Box sx={{ maxWidth: "1360px", width: "100%", mx: "auto" }}>
          <Typography
            component="h1"
            variant="subtitle1"
            sx={{
              color: "white",
              fontWeight: 700,
              mb: 0.8,
              fontSize: "1.35rem",
              letterSpacing: "-0.01em",
              lineHeight: 1.3,
            }}
          >
            Tableau de bord
          </Typography>

          <Box sx={{ mt: 0.25 }}>
            <DashboardFilters />
          </Box>

          <Box sx={{ mt: 2 }}>
            <DashboardContent />
          </Box>
        </Box>
      </Container>
    </DashboardFiltersProvider>
  );
};

export default Dashboard;

