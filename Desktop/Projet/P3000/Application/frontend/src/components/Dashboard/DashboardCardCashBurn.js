import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";

const DashboardCardCashBurn = () => (
  <DashboardMetricCardShell
    title="Burn mensuel"
    value="42 300 EUR"
    subtitle="Depenses nettes mensuelles"
    accent="#f97316"
    variant={7}
  />
);

export default DashboardCardCashBurn;
