import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardMaterialCost = ({ value = 0, totalCA = 0, loading = false }) => (
  <DashboardMetricCardShell
    title="Coût matériel"
    value={loading ? "Chargement..." : formatDashboardCurrency(value)}
    valueColor="#c2410c"
    subtitle="Période sélectionnée"
    accent="#ff9800"
    variant={7}
    percentValue={loading ? null : value}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardMaterialCost;
