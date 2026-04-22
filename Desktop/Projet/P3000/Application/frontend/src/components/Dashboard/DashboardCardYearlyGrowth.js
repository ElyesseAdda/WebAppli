import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";

const DashboardCardYearlyGrowth = () => (
  <DashboardMetricCardShell
    title="Croissance annuelle"
    value="+11.6%"
    subtitle="Projection stable"
    accent="#22c55e"
    variant={7}
  />
);

export default DashboardCardYearlyGrowth;
