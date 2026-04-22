import { Box } from "@mui/material";
import React from "react";
import DashboardCardTotalCA from "./DashboardCardTotalCA";
import DashboardCardMargeBrute from "./DashboardCardMargeBrute";
import DashboardCardFacturesEmises from "./DashboardCardFacturesEmises";
import DashboardCardEncaissement from "./DashboardCardEncaissement";
import DashboardCardRetards from "./DashboardCardRetards";
import DashboardCardDossiersActifs from "./DashboardCardDossiersActifs";
import DashboardCardTicketMoyen from "./DashboardCardTicketMoyen";
import DashboardCardCroissance from "./DashboardCardCroissance";

const DashboardCardsGrid = ({
  totalCA,
  totalCALoading,
  totalCAProgress,
  totalCAComparisonYear,
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
      <DashboardCardTotalCA
        value={totalCA}
        loading={totalCALoading}
        progressPercent={totalCAProgress}
        comparisonYear={totalCAComparisonYear}
      />
      <DashboardCardMargeBrute />
      <DashboardCardFacturesEmises />
      <DashboardCardEncaissement />
      <DashboardCardRetards />
      <DashboardCardDossiersActifs />
      <DashboardCardTicketMoyen />
      <DashboardCardCroissance />
    </Box>
  );
};

export default DashboardCardsGrid;
