import { Box } from "@mui/material";
import React from "react";
import DashboardCardRevenueTotal from "./DashboardCardRevenueTotal";
import DashboardCardGrossMargin from "./DashboardCardGrossMargin";
import DashboardCardProjectCostTotal from "./DashboardCardProjectCostTotal";
import DashboardCardCashIn from "./DashboardCardCashIn";
import DashboardCardOverduePayments from "./DashboardCardOverduePayments";
import DashboardCardActiveProjects from "./DashboardCardActiveProjects";
import DashboardCardAverageTicket from "./DashboardCardAverageTicket";
import DashboardCardYearlyGrowth from "./DashboardCardYearlyGrowth";

const DashboardCardsGrid = ({
  totalCA,
  totalCALoading,
  totalCAProgress,
  totalCAComparisonYear,
  margeBrute,
  margeBruteRate,
  margeBruteLoading,
  margeBruteProgress,
  margeBruteComparisonYear,
  coutChantierGlobal,
  coutMateriel,
  coutMainOeuvre,
  coutSousTraitance,
  coutChantierLoading,
}) => {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gridTemplateRows: "repeat(4, minmax(0, 1fr))",
        gap: 1.5,
        height: 460,
      }}
    >
      <DashboardCardRevenueTotal
        value={totalCA}
        loading={totalCALoading}
        progressPercent={totalCAProgress}
        comparisonYear={totalCAComparisonYear}
      />
      <DashboardCardGrossMargin
        value={margeBrute}
        ratePercent={margeBruteRate}
        loading={margeBruteLoading}
        progressPercent={margeBruteProgress}
        comparisonYear={margeBruteComparisonYear}
      />
      <DashboardCardProjectCostTotal
        value={coutChantierGlobal}
        coutMateriel={coutMateriel}
        coutMainOeuvre={coutMainOeuvre}
        coutSousTraitance={coutSousTraitance}
        loading={coutChantierLoading}
      />
      <DashboardCardCashIn />
      <DashboardCardOverduePayments />
      <DashboardCardActiveProjects />
      <DashboardCardAverageTicket />
      <DashboardCardYearlyGrowth />
    </Box>
  );
};

export default DashboardCardsGrid;
