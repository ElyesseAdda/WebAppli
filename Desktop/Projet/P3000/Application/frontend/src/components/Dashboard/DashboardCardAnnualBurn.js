import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardAnnualBurn = ({ totalCA = 0, burnMontant = 0, loading = false }) => (
  <DashboardMetricCardShell
    title="Paiements à venir"
    value={loading ? "Chargement..." : formatDashboardCurrency(burnMontant)}
    valueColor={loading ? undefined : Number(burnMontant || 0) >= 0 ? "#fb923c" : "#dc2626"}
    subtitle="Sous 15 jours (HT)"
    accent="#f97316"
    variant={7}
    valueFirstCentered
    percentValue={loading ? null : burnMontant}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardAnnualBurn;
