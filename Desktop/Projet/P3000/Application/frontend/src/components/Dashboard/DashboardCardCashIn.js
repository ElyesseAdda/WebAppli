import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardCashIn = ({
  totalCA = 0,
  montantFacture = 0,
  montantPaye = 0,
  montantAttente = 0,
  loading = false,
}) => {
  const subtitle = loading
    ? "Chargement..."
    : `Facturé HT ${formatDashboardCurrency(montantFacture)} · En attente HT ${formatDashboardCurrency(
        montantAttente
      )} (récap facturation)`;
  return (
    <DashboardMetricCardShell
      title="Encaissement"
      value={loading ? "Chargement..." : formatDashboardCurrency(montantPaye)}
      subtitle={subtitle}
      accent="#0ea5e9"
      variant={7}
      percentValue={loading ? null : montantPaye}
      percentBase={loading ? null : totalCA}
    />
  );
};

export default DashboardCardCashIn;
