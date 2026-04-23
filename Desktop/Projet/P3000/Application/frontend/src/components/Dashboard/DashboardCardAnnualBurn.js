import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardAnnualBurn = ({ totalCA = 0, burnMontant = 0, loading = false }) => (
  <DashboardMetricCardShell
    title="Prochain paiement"
    value={loading ? "Chargement..." : formatDashboardCurrency(burnMontant)}
    subtitle="Paiements à échéance sous 15 jours (HT)"
    accent="#f97316"
    variant={7}
    percentValue={loading ? null : burnMontant}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardAnnualBurn;
