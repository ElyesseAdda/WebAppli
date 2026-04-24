import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const formatProgressBadge = (progressPercent, comparisonYear) => {
  const yearSuffix = comparisonYear ? ` vs ${comparisonYear}` : "";
  const parsed = Number(progressPercent);
  if (progressPercent == null || Number.isNaN(parsed)) return comparisonYear ? `0.0%${yearSuffix}` : null;
  const abs = Math.abs(parsed).toFixed(1);
  if (parsed > 0) return `+${abs}%${yearSuffix}`;
  if (parsed < 0) return `−${abs}%${yearSuffix}`;
  return `0.0%${yearSuffix}`;
};

const DashboardCardRevenueTotal = ({
  value = 0,
  totalCA = 0,
  loading = false,
  progressPercent = null,
  comparisonYear = null,
}) => {
  const parsedProgress = Number(progressPercent);
  const badge = loading ? null : formatProgressBadge(progressPercent, comparisonYear);
  const badgeTone =
    loading || !badge
      ? "neutral"
      : Number.isNaN(parsedProgress)
      ? "brandBlue"
      : parsedProgress < 0
      ? "danger"
      : "brandBlue";

  return (
    <DashboardMetricCardShell
      title="CA Total HT"
      value={loading ? "Chargement..." : formatDashboardCurrency(value)}
      valueColor={loading ? undefined : "rgba(27, 120, 188, 1)"}
      subtitle="Situations + factures"
      subtitleBadge={badge}
      subtitleBadgeTone={badgeTone}
      accent="#1B78BC"
      variant={9}
      largeValue
      percentValue={loading ? null : value}
      percentBase={loading ? null : totalCA}
    />
  );
};

export default DashboardCardRevenueTotal;
