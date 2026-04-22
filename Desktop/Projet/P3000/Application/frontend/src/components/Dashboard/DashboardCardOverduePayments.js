import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";

const formatCurrency = (amount) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));

const DashboardCardOverduePayments = ({ value = 0, totalCA = 0, loading = false }) => (
  <DashboardMetricCardShell
    title="COUT MAIN D'OEUVRE"
    value={loading ? "Chargement..." : formatCurrency(value)}
    subtitle="Periode selectionnee"
    accent="#0d9488"
    variant={7}
    percentValue={loading ? null : value}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardOverduePayments;
