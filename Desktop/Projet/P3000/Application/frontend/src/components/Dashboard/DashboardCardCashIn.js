import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";

const cashInValue = 1502000;

const DashboardCardCashIn = ({ totalCA = 0 }) => (
  <DashboardMetricCardShell
    title="Encaissement"
    value="1 502 000 EUR"
    subtitle="81.5% du CA"
    accent="#0ea5e9"
    variant={7}
    percentValue={cashInValue}
    percentBase={totalCA}
  />
);

export default DashboardCardCashIn;
