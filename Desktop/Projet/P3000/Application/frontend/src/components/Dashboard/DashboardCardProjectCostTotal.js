import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardProjectCostTotal = ({
  value = 0,
  totalCA = 0,
  loading = false,
}) => (
  <DashboardMetricCardShell
    title="Cout chantier global"
    value={loading ? "Chargement..." : formatDashboardCurrency(value)}
    valueColor="#dc2626"
    subtitle=""
    accent="#dc2626"
    variant={7}
    percentValue={loading ? null : value}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardProjectCostTotal;
