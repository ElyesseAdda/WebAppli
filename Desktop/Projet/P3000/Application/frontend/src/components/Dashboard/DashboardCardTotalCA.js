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

const DashboardCardTotalCA = ({
  value = 0,
  loading = false,
  progressPercent = null,
  comparisonYear = null,
}) => {
  return (
    <DashboardMetricCardShell
      title="CA total"
      value={loading ? "Chargement..." : formatCurrency(value)}
      valueColor="#2196f3"
      subtitle={
        loading
          ? "Calcul de progression..."
          : formatProgressLabel(progressPercent, comparisonYear)
      }
      accent="#2563eb"
      variant={7}
    />
  );
};

export default DashboardCardTotalCA;
