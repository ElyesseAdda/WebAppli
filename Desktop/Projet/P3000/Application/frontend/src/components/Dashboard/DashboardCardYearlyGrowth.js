import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";

const yearlyGrowthValue = 11.6;

const DashboardCardYearlyGrowth = ({ totalCA = 0 }) => (
  <DashboardMetricCardShell
    title="Croissance annuelle"
    value="+11.6%"
    subtitle="Projection stable"
    accent="#22c55e"
    variant={7}
    percentValue={yearlyGrowthValue}
    percentBase={totalCA}
  />
);

export default DashboardCardYearlyGrowth;
