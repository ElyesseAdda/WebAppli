import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";

const DashboardCardClientReceivables = () => (
  <DashboardMetricCardShell
    title="Encours client"
    value="284 000 EUR"
    subtitle="A encaisser sur la periode"
    accent="#6366f1"
    variant={7}
  />
);

export default DashboardCardClientReceivables;
