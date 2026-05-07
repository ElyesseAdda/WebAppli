import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const formatProgressBadge = (progressPercent, comparisonYear) => {
  const yearSuffix = comparisonYear ? ` vs ${comparisonYear}` : "";
  const parsed = Number(progressPercent);
  if (progressPercent == null || Number.isNaN(parsed)) return null;
  const abs = Math.abs(parsed).toFixed(1);
  if (parsed > 0) return `+${abs}%${yearSuffix}`;
  if (parsed < 0) return `−${abs}%${yearSuffix}`;
  return `0.0%${yearSuffix}`;
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
  const badgeTone = !loading ? (rate >= 0 ? "success" : "danger") : "neutral";
  const progressPart =
    loading || progressPercent == null ? null : formatProgressBadge(progressPercent, comparisonYear);
  const subtitleBadge = loading
    ? null
    : [ `${rate.toFixed(1)}% du CA`, progressPart ].filter(Boolean).join(" · ");

  return (
    <DashboardMetricCardShell
      title="Marge brute"
      value={loading ? "Chargement..." : formatDashboardCurrency(value)}
      valueColor={loading ? undefined : Number(value || 0) >= 0 ? "#16a34a" : "#dc2626"}
      subtitle="CA − coûts chantier − dép. agence réalisées (toutes agences)"
      subtitleBadge={subtitleBadge}
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
