import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardLatePayments = ({ totalCA = 0, montantRetard = 0, loading = false }) => (
  <DashboardMetricCardShell
    title="Paiements en retard"
    value={loading ? "Chargement..." : formatDashboardCurrency(montantRetard)}
    valueColor="#b91c1c"
    subtitle="Date prévue dépassée, non payé (HT)"
    accent="#dc2626"
    variant={7}
    percentValue={loading ? null : montantRetard}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardLatePayments;
