import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardOverduePayments = ({ value = 0, totalCA = 0, loading = false }) => (
  <DashboardMetricCardShell
    title="COUT MAIN D'OEUVRE"
    value={loading ? "Chargement..." : formatDashboardCurrency(value)}
    subtitle="Periode selectionnee"
    accent="#0d9488"
    variant={7}
    percentValue={loading ? null : value}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardOverduePayments;
