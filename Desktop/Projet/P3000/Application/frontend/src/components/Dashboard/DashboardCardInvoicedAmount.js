import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardInvoicedAmount = ({
  totalCA = 0,
  montantFacture = 0,
  montantPaye = 0,
  montantAttente = 0,
  loading = false,
}) => {
  const subtitle = loading
    ? "Chargement..."
    : `Payé HT ${formatDashboardCurrency(montantPaye)} · En attente HT ${formatDashboardCurrency(
        montantAttente
      )}`;
  return (
    <DashboardMetricCardShell
      title="Facturé HT"
      value={loading ? "Chargement..." : formatDashboardCurrency(montantFacture)}
      subtitle={subtitle}
      accent="#0ea5e9"
      variant={7}
      percentValue={loading ? null : montantFacture}
      percentBase={loading ? null : totalCA}
    />
  );
};

export default DashboardCardInvoicedAmount;
