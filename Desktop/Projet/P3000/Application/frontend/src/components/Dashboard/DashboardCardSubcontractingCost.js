import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardSubcontractingCost = ({ value = 0, totalCA = 0, loading = false }) => (
  <DashboardMetricCardShell
    title="Coût sous-traitance"
    value={loading ? "Chargement..." : formatDashboardCurrency(value)}
    subtitle="Période sélectionnée"
    accent="#2196f3"
    variant={7}
    percentValue={loading ? null : value}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardSubcontractingCost;
