import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";

const cashBurnValue = 42300;

const DashboardCardCashBurn = ({ totalCA = 0 }) => (
  <DashboardMetricCardShell
    title="Burn mensuel"
    value="42 300 EUR"
    subtitle="Depenses nettes mensuelles"
    accent="#f97316"
    variant={7}
    percentValue={cashBurnValue}
    percentBase={totalCA}
  />
);

export default DashboardCardCashBurn;
