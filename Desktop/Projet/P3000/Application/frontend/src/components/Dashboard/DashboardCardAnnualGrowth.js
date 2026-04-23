import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardAnnualGrowth = ({ totalCA = 0, montantEncaisseReel = 0, loading = false }) => (
  <DashboardMetricCardShell
    title="Encaissement"
    value={loading ? "Chargement..." : formatDashboardCurrency(montantEncaisseReel)}
    valueColor="#15803d"
    subtitle="Montant encaissé (HT)"
    accent="#22c55e"
    variant={7}
    percentValue={loading ? null : montantEncaisseReel}
    percentBase={loading ? null : totalCA}
  />
);

export default DashboardCardAnnualGrowth;
