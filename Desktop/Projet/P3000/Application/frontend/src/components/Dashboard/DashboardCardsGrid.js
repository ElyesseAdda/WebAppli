import { Box } from "@mui/material";
import React from "react";
import DashboardCardRevenueTotal from "./DashboardCardRevenueTotal";
import DashboardCardGrossMargin from "./DashboardCardGrossMargin";
import DashboardCardProjectCostTotal from "./DashboardCardProjectCostTotal";
import DashboardCardInvoicedAmount from "./DashboardCardInvoicedAmount";
import DashboardCardLaborCost from "./DashboardCardLaborCost";
import DashboardCardAgencyExpenses from "./DashboardCardAgencyExpenses";
import DashboardCardMaterialCost from "./DashboardCardMaterialCost";
import DashboardCardAnnualGrowth from "./DashboardCardAnnualGrowth";
import DashboardCardSubcontractingCost from "./DashboardCardSubcontractingCost";
import DashboardCardAnnualBurn from "./DashboardCardAnnualBurn";
import DashboardCardLatePayments from "./DashboardCardLatePayments";

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
  mainOeuvreMonthlyBreakdown,
  coutSousTraitance,
  coutChantierLoading,
  depensesAgenceBreakdown,
  montantFactureHt,
  montantFacturePayeHt,
  montantFactureAttenteHt,
  burn15JHt,
  latePaymentsHt,
}) => {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gridTemplateRows: "repeat(6, minmax(0, 1fr))",
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
      <DashboardCardAgencyExpenses
        breakdown={depensesAgenceBreakdown}
        loading={coutChantierLoading}
        totalCA={totalCA}
      />
      <DashboardCardLaborCost
        value={coutMainOeuvre}
        totalCA={totalCA}
        loading={coutChantierLoading}
        mainOeuvreMonthlyBreakdown={mainOeuvreMonthlyBreakdown}
      />
      <DashboardCardInvoicedAmount
        totalCA={totalCA}
        montantFacture={montantFactureHt}
        loading={totalCALoading}
      />
      <DashboardCardMaterialCost
        value={coutMateriel}
        totalCA={totalCA}
        loading={coutChantierLoading}
      />
      <DashboardCardAnnualGrowth
        totalCA={totalCA}
        montantEncaisseReel={montantFacturePayeHt}
        loading={totalCALoading}
      />
      <DashboardCardSubcontractingCost
        value={coutSousTraitance}
        totalCA={totalCA}
        loading={coutChantierLoading}
      />
      <DashboardCardAnnualBurn
        totalCA={totalCA}
        burnMontant={burn15JHt}
        loading={totalCALoading}
      />
      <Box />
      <DashboardCardLatePayments
        totalCA={totalCA}
        montantRetard={latePaymentsHt}
        loading={totalCALoading}
      />
    </Box>
  );
};

export default DashboardCardsGrid;
