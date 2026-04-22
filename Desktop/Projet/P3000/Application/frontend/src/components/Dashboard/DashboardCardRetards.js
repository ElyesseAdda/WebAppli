import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";

const DashboardCardRetards = () => (
  <DashboardMetricCardShell
    title="Paiements en retard"
    value="96 300 EUR"
    subtitle="12 dossiers critiques"
    accent="#dc2626"
    variant={7}
  />
);

export default DashboardCardRetards;
