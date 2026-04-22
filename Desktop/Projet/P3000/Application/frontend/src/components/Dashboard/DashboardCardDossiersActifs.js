import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";

const DashboardCardDossiersActifs = () => (
  <DashboardMetricCardShell
    title="Dossiers actifs"
    value="58"
    subtitle="9 nouveaux ce trimestre"
    accent="#f59e0b"
    variant={7}
  />
);

export default DashboardCardDossiersActifs;
