import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardGrossMargin = ({
  value = 0,
  totalCA = 0,
  ratePercent = 0,
  loading = false,
}) => {
  const rate = Number(ratePercent || 0);
  const badge = loading ? null : `${rate.toFixed(1)}% du CA`;
  const badgeTone = !loading ? (rate >= 0 ? "success" : "danger") : "neutral";

  return (
    <DashboardMetricCardShell
      title="Marge brute"
      value={loading ? "Chargement..." : formatDashboardCurrency(value)}
      valueColor={loading ? undefined : Number(value || 0) >= 0 ? "#16a34a" : "#dc2626"}
      subtitle="CA - coûts réels - agence"
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
