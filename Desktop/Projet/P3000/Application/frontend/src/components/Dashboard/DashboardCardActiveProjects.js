import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";

const activeProjectsCount = 58;

const DashboardCardActiveProjects = ({ totalCA = 0 }) => (
  <DashboardMetricCardShell
    title="Dossiers actifs"
    value="58"
    subtitle="9 nouveaux ce trimestre"
    accent="#f59e0b"
    variant={7}
    percentValue={activeProjectsCount}
    percentBase={totalCA}
  />
);

export default DashboardCardActiveProjects;
