import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const DashboardCardProjectCostTotal = ({
  value = 0,
  totalCA = 0,
  loading = false,
}) => (
  <DashboardMetricCardShell
    title="Cout chantier global"
    value={loading ? "Chargement..." : formatCurrency(value)}
    valueColor="#dc2626"
    subtitle=""
    accent="#7c3aed"
    variant={7}
    percentValue={loading ? null : value}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardProjectCostTotal;
