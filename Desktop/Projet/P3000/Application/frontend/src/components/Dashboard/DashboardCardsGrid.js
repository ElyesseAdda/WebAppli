import { Box, Typography } from "@mui/material";
import React from "react";
import DashboardCardRevenueTotal from "./DashboardCardRevenueTotal";
import DashboardCardGrossMargin from "./DashboardCardGrossMargin";
import DashboardCardAnnualGrowth from "./DashboardCardAnnualGrowth";
import DashboardCardAgencyExpenses from "./DashboardCardAgencyExpenses";
import DashboardCardAnnualBurn from "./DashboardCardAnnualBurn";
import DashboardCardLatePayments from "./DashboardCardLatePayments";
import DashboardRevenueMockChart from "./DashboardRevenueMockChart";
import DashboardCostBreakdown from "./DashboardCostBreakdown";
import TresorerieDashboard from "./TresorerieDashboard";

// Hauteur partagée entre le graphique et le donut
const MID_HEIGHT = 360;

const DashboardCardsGrid = ({
  totalCA,
  totalCALoading,
  totalCAProgress,
  totalCAComparisonYear,
  margeBrute,
  margeBruteRate,
  margeBruteLoading,
  margeBruteProgress,
  margeBruteComparisonYear,
  coutChantierGlobal,
  coutMateriel,
  coutMainOeuvre,
  mainOeuvreMonthlyBreakdown,
  coutSousTraitance,
  coutChantierLoading,
  depensesAgenceBreakdown,
  montantFacturePayeHt,
  burn15JHt,
  latePaymentsHt,
  // données graphique mensuel
  monthlyCashflow,
  comparisonYearSeries,
  selectedYear,
  periodStart,
  periodEnd,
}) => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* ── Zone 1 : KPIs héro (CA Total + Marge Brute) ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 2,
        }}
      >
        <DashboardCardRevenueTotal
          value={totalCA}
          totalCA={totalCA}
          loading={totalCALoading}
          progressPercent={totalCAProgress}
          comparisonYear={totalCAComparisonYear}
        />
        <DashboardCardGrossMargin
          value={margeBrute}
          totalCA={totalCA}
          ratePercent={margeBruteRate}
          loading={margeBruteLoading}
          progressPercent={margeBruteProgress}
          comparisonYear={margeBruteComparisonYear}
        />
      </Box>

      {/* ── Zone 2 : Graphique mensuel (60%) + Répartition coûts (40%) ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "3fr 2fr",
          gap: 2,
          alignItems: "stretch",
        }}
      >
        <DashboardRevenueMockChart
          monthlyCashflow={monthlyCashflow}
          comparisonYearSeries={comparisonYearSeries}
          selectedYear={selectedYear}
          periodStart={periodStart}
          periodEnd={periodEnd}
          loading={totalCALoading}
          cardHeight={MID_HEIGHT}
        />
        <DashboardCostBreakdown
          coutMainOeuvre={coutMainOeuvre}
          coutMateriel={coutMateriel}
          coutSousTraitance={coutSousTraitance}
          coutChantierGlobal={coutChantierGlobal}
          mainOeuvreMonthlyBreakdown={mainOeuvreMonthlyBreakdown}
          loading={coutChantierLoading}
          totalCA={totalCA}
        />
      </Box>

      {/* ── H2 "Indicateurs financiers" (canvas exact) ── */}
      <Typography
        component="h2"
        sx={{
          fontSize: "1.1rem",
          fontWeight: 700,
          color: "#111827",
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
          mt: 0.5,
        }}
      >
        Indicateurs financiers
      </Typography>

      {/* ── Zone 3 : KPIs financiers (4 cartes compactes) ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 2,
        }}
      >
        <DashboardCardAnnualGrowth
          totalCA={totalCA}
          montantEncaisseReel={montantFacturePayeHt}
          loading={totalCALoading}
        />
        <DashboardCardAgencyExpenses
          breakdown={depensesAgenceBreakdown}
          loading={coutChantierLoading}
          totalCA={totalCA}
        />
        <DashboardCardAnnualBurn
          totalCA={totalCA}
          burnMontant={burn15JHt}
          loading={totalCALoading}
        />
        <DashboardCardLatePayments
          totalCA={totalCA}
          montantRetard={latePaymentsHt}
          loading={totalCALoading}
        />
      </Box>

      {/* ── Divider avant Zone 4 ── */}
      <Box sx={{ borderBottom: "1px solid #e5e7eb" }} />

      {/* ── Zone 4 : Trésorerie mensuelle ── */}
      <TresorerieDashboard
        selectedYear={selectedYear}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
    </Box>
  );
};

export default DashboardCardsGrid;
