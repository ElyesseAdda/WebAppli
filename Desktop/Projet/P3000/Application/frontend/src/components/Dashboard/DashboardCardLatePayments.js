import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardLatePayments = ({ totalCA = 0, montantRetard = 0, loading = false, toolbarPrefix = null }) => (
  <DashboardMetricCardShell
    title="Paiements en retard"
    value={loading ? "Chargement..." : formatDashboardCurrency(montantRetard)}
    valueColor="#dc2626"
    subtitle="Échéance dépassée"
    accent="#dc2626"
    variant={7}
    valueFirstCentered
    percentValue={loading ? null : montantRetard}
    percentBase={loading ? null : totalCA}
    toolbarPrefix={toolbarPrefix}
  />
);

export default DashboardCardLatePayments;
