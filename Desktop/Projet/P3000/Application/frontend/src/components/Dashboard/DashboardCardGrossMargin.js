import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const formatProgressSubtitle = (progressPercent, comparisonYear) => {
  const yearSuffix = comparisonYear ? ` vs ${comparisonYear}` : "";
  if (progressPercent == null || Number.isNaN(progressPercent))
    return `Progression indisponible${yearSuffix}`;
  const abs = Math.abs(progressPercent).toFixed(1);
  if (progressPercent > 0) return `+${abs} % de hausse${yearSuffix}`;
  if (progressPercent < 0) return `−${abs} % de baisse${yearSuffix}`;
  return `Stable${yearSuffix}`;
};

const DashboardCardGrossMargin = ({
  value = 0,
  totalCA = 0,
  ratePercent = 0,
  loading = false,
  progressPercent = null,
  comparisonYear = null,
}) => {
  const rate = Number(ratePercent || 0);
  const badge = loading ? null : `${rate.toFixed(1)} % du CA`;
  const badgeTone = !loading ? (rate >= 0 ? "success" : "danger") : "neutral";

  return (
    <DashboardMetricCardShell
      title="Marge Brute"
      value={loading ? "Chargement..." : formatDashboardCurrency(value)}
      valueColor={loading ? undefined : Number(value || 0) >= 0 ? "#16a34a" : "#dc2626"}
      subtitle="CA — coûts réels — agence"
      subtitleBadge={badge}
      subtitleBadgeTone={badgeTone}
      accent="#16a34a"
      variant={9}
      largeValue
      percentValue={loading ? null : value}
      percentBase={loading ? null : totalCA}
    />
  );
};

export default DashboardCardGrossMargin;
