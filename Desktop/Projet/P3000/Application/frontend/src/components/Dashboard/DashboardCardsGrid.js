import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import React, { useState } from "react";
import DashboardCardRevenueTotal from "./DashboardCardRevenueTotal";
import DashboardCardGrossMargin from "./DashboardCardGrossMargin";
import DashboardCardAnnualGrowth from "./DashboardCardAnnualGrowth";
import DashboardCardAgencyExpenses from "./DashboardCardAgencyExpenses";
import DashboardCardAnnualBurn from "./DashboardCardAnnualBurn";
import DashboardCardLatePayments from "./DashboardCardLatePayments";
import DashboardRevenueMockChart from "./DashboardRevenueMockChart";
import DashboardCostBreakdown from "./DashboardCostBreakdown";
import TresorerieDashboard from "./TresorerieDashboard";
import PaymentsDetailModal from "./PaymentsDetailModal";
import { usePaymentsDetail } from "./usePaymentsDetail";

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
  depensesAgencePointageHt,
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
  const {
    encaissementsRecus,
    paiementsAVenir,
    paiementsEnRetard,
    loadingEncaissements,
    loadingAVenir,
    loadingRetard,
  } = usePaymentsDetail(selectedYear);

  const [modalConfig, setModalConfig] = useState(null); // { title, kind, accentColor }

  const modalLists = {
    encaissements: { items: encaissementsRecus, loading: loadingEncaissements },
    avenir: { items: paiementsAVenir, loading: loadingAVenir },
    retard: { items: paiementsEnRetard, loading: loadingRetard },
  };

  const latePaymentsFromDetail = paiementsEnRetard.reduce(
    (sum, item) => sum + (item.montant || 0),
    0
  );
  const encaissementsFromDetail = encaissementsRecus.reduce(
    (sum, item) => sum + (item.montant || 0),
    0
  );
  const avenirFromDetail = paiementsAVenir.reduce(
    (sum, item) => sum + (item.montant || 0),
    0
  );

  const latePaymentsDisplay = loadingRetard
    ? latePaymentsHt
    : latePaymentsFromDetail || latePaymentsHt;
  const encaissementsDisplay = loadingEncaissements
    ? montantFacturePayeHt
    : encaissementsFromDetail || montantFacturePayeHt;
  const avenirDisplay = loadingAVenir ? burn15JHt : avenirFromDetail || burn15JHt;

  const latePaymentsCardLoading = loadingRetard && totalCALoading;
  const encaissementsCardLoading = loadingEncaissements && totalCALoading;
  const avenirCardLoading = loadingAVenir && totalCALoading;

  const makeDetailBtn = (title, kind, accentColor, iconColor) => (
    <Tooltip title={`Voir le détail : ${title}`}>
      <IconButton
        size="small"
        onClick={() => setModalConfig({ title, kind, accentColor })}
        sx={{
          p: 0.35,
          color: iconColor || accentColor,
          opacity: 0.75,
          "&:hover": { opacity: 1, bgcolor: `${accentColor}18` },
        }}
      >
        <ListAltOutlinedIcon sx={{ fontSize: "1.05rem" }} />
      </IconButton>
    </Tooltip>
  );

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
        <DashboardCardAgencyExpenses
          breakdown={depensesAgenceBreakdown}
          pointageAgenceMontant={depensesAgencePointageHt}
          loading={coutChantierLoading}
          totalCA={totalCA}
        />
        <DashboardCardAnnualGrowth
          totalCA={totalCA}
          montantEncaisseReel={encaissementsDisplay}
          loading={encaissementsCardLoading}
          toolbarPrefix={makeDetailBtn("Encaissements reçus", "encaissements", "#22c55e", "#15803d")}
        />
        <DashboardCardAnnualBurn
          totalCA={totalCA}
          burnMontant={avenirDisplay}
          loading={avenirCardLoading}
          toolbarPrefix={makeDetailBtn("Paiements à venir (15 j.)", "avenir", "#f97316", "#c2410c")}
        />
        <DashboardCardLatePayments
          totalCA={totalCA}
          montantRetard={latePaymentsDisplay}
          loading={latePaymentsCardLoading}
          toolbarPrefix={makeDetailBtn("Paiements en retard", "retard", "#dc2626", "#b91c1c")}
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

      {/* ── Modal détail paiements ── */}
      <PaymentsDetailModal
        open={!!modalConfig}
        onClose={() => setModalConfig(null)}
        title={modalConfig?.title || ""}
        items={modalLists[modalConfig?.kind]?.items || []}
        accentColor={modalConfig?.accentColor || "#1B78BC"}
        loading={modalLists[modalConfig?.kind]?.loading || false}
      />
    </Box>
  );
};

export default DashboardCardsGrid;
