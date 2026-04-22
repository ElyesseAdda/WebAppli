import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";

const DashboardCardEncaissement = () => (
  <DashboardMetricCardShell
    title="Encaissement"
    value="1 502 000 EUR"
    subtitle="81.5% du CA"
    accent="#0ea5e9"
    variant={7}
  />
);

export default DashboardCardEncaissement;
