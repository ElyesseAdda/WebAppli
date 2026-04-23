import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardLaborCost = ({ value = 0, totalCA = 0, loading = false }) => (
  <DashboardMetricCardShell
    title="Coût main d'œuvre"
    value={loading ? "Chargement..." : formatDashboardCurrency(value)}
    subtitle="Période sélectionnée"
    accent="#0d9488"
    variant={7}
    percentValue={loading ? null : value}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardLaborCost;
