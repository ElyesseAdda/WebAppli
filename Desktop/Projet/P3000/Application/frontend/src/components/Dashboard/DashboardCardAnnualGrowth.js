import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardAnnualGrowth = ({ totalCA = 0, montantEncaisseReel = 0, loading = false }) => {
  const pct = totalCA > 0 ? `${((montantEncaisseReel / totalCA) * 100).toFixed(1)}% du CA` : null;
  return (
    <DashboardMetricCardShell
      title="Encaissements reçus"
      value={loading ? "Chargement..." : formatDashboardCurrency(montantEncaisseReel)}
      valueColor={loading ? undefined : Number(montantEncaisseReel || 0) >= 0 ? "#22c55e" : "#dc2626"}
      subtitle={loading ? null : pct}
      accent="#22c55e"
      variant={7}
      valueFirstCentered
      percentValue={loading ? null : montantEncaisseReel}
      percentBase={loading ? null : totalCA}
    />
  );
};

export default DashboardCardAnnualGrowth;
