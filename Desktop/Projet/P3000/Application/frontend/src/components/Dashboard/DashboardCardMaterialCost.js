import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardMaterialCost = ({ value = 0, totalCA = 0, loading = false }) => (
  <DashboardMetricCardShell
    title="Coût matériel"
    value={loading ? "Chargement..." : formatDashboardCurrency(value)}
    valueColor={loading ? undefined : Number(value || 0) >= 0 ? "rgba(27, 120, 188, 1)" : "#dc2626"}
    subtitle="Période sélectionnée"
    accent="#ff9800"
    variant={7}
    percentValue={loading ? null : value}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardMaterialCost;
