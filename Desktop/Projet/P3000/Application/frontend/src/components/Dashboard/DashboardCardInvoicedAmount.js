import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardInvoicedAmount = ({
  totalCA = 0,
  montantFacture = 0,
  loading = false,
}) => {
  return (
    <DashboardMetricCardShell
      title="Facturé HT"
      value={loading ? "Chargement..." : formatDashboardCurrency(montantFacture)}
      valueColor="#0369a1"
      subtitle=""
      accent="#0ea5e9"
      variant={7}
      percentValue={loading ? null : montantFacture}
      percentBase={loading ? null : totalCA}
    />
  );
};

export default DashboardCardInvoicedAmount;
