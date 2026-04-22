import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardClientReceivables = ({ value = 0, totalCA = 0, loading = false }) => (
  <DashboardMetricCardShell
    title="COUT SOUS-TRAITANCE"
    value={loading ? "Chargement..." : formatDashboardCurrency(value)}
    subtitle="Periode selectionnee"
    accent="#2196f3"
    variant={7}
    percentValue={loading ? null : value}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardClientReceivables;
