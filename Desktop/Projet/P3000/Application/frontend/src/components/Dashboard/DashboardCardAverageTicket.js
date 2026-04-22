import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardAverageTicket = ({ value = 0, totalCA = 0, loading = false }) => (
  <DashboardMetricCardShell
    title="COUT MATERIEL"
    value={loading ? "Chargement..." : formatDashboardCurrency(value)}
    subtitle="Periode selectionnee"
    accent="#ff9800"
    variant={7}
    percentValue={loading ? null : value}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardAverageTicket;
