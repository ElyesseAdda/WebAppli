import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const formatProgressLabel = (progressPercent, comparisonYear) => {
  const yearSuffix = comparisonYear ? ` vs ${comparisonYear}` : "";
  if (progressPercent == null || Number.isNaN(progressPercent)) {
    return `Progression indisponible${yearSuffix}`;
  }
  const absValue = Math.abs(progressPercent).toFixed(1);
  if (progressPercent > 0) {
    return `+${absValue}% de hausse${yearSuffix}`;
  }
  if (progressPercent < 0) {
    return `-${absValue}% de baisse${yearSuffix}`;
  }
  return `0.0% stable${yearSuffix}`;
};

const DashboardCardGrossMargin = ({
  value = 0,
  totalCA = 0,
  ratePercent = 0,
  loading = false,
  progressPercent = null,
  comparisonYear = null,
}) => (
  <DashboardMetricCardShell
    title="Marge brute"
    value={loading ? "Chargement..." : formatDashboardCurrency(value)}
    valueColor={loading ? undefined : Number(value || 0) >= 0 ? "#0d9488" : "#dc2626"}
    subtitle={
      loading
        ? "Calcul du taux..."
        : `Taux ${Number(ratePercent || 0).toFixed(1)}% | ${formatProgressLabel(
            progressPercent,
            comparisonYear
          )}`
    }
    accent="#059669"
    variant={7}
    percentValue={loading ? null : value}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardGrossMargin;
