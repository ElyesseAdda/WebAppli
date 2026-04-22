import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

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

const DashboardCardMargeBrute = ({
  value = 0,
  ratePercent = 0,
  loading = false,
  progressPercent = null,
  comparisonYear = null,
}) => (
  <DashboardMetricCardShell
    title="Marge brute"
    value={loading ? "Chargement..." : formatCurrency(value)}
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
  />
);

export default DashboardCardMargeBrute;
