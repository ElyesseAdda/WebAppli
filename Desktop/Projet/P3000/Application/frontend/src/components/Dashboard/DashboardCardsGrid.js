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
import DashboardCardClientReceivables from "./DashboardCardClientReceivables";
import DashboardCardCashBurn from "./DashboardCardCashBurn";

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
        gridTemplateRows: "repeat(5, minmax(0, 1fr))",
        gap: 1.5,
        height: 580,
      }}
    >
      <DashboardCardRevenueTotal
        value={totalCA}
        totalCA={totalCA}
        loading={totalCALoading}
        progressPercent={totalCAProgress}
        comparisonYear={totalCAComparisonYear}
      />
      <DashboardCardGrossMargin
        value={margeBrute}
        totalCA={totalCA}
        ratePercent={margeBruteRate}
        loading={margeBruteLoading}
        progressPercent={margeBruteProgress}
        comparisonYear={margeBruteComparisonYear}
      />
      <DashboardCardProjectCostTotal
        value={coutChantierGlobal}
        totalCA={totalCA}
        loading={coutChantierLoading}
      />
      <DashboardCardCashIn totalCA={totalCA} />
      <DashboardCardOverduePayments
        value={coutMainOeuvre}
        totalCA={totalCA}
        loading={coutChantierLoading}
      />
      <DashboardCardActiveProjects totalCA={totalCA} />
      <DashboardCardAverageTicket
        value={coutMateriel}
        totalCA={totalCA}
        loading={coutChantierLoading}
      />
      <DashboardCardYearlyGrowth totalCA={totalCA} />
      <DashboardCardClientReceivables
        value={coutSousTraitance}
        totalCA={totalCA}
        loading={coutChantierLoading}
      />
      <DashboardCardCashBurn totalCA={totalCA} />
    </Box>
  );
};

export default DashboardCardsGrid;
