import { Box, Typography } from "@mui/material";
import React from "react";
import DashboardCardRevenueTotal from "./DashboardCardRevenueTotal";
import DashboardCardGrossMargin from "./DashboardCardGrossMargin";
import DashboardCardAnnualGrowth from "./DashboardCardAnnualGrowth";
import DashboardCardAgencyExpenses from "./DashboardCardAgencyExpenses";
import DashboardCardAnnualBurn from "./DashboardCardAnnualBurn";
import DashboardCardLatePayments from "./DashboardCardLatePayments";
import DashboardRevenueMockChart from "./DashboardRevenueMockChart";
import DashboardCostBreakdown from "./DashboardCostBreakdown";

// Hauteur partagée entre le graphique et le donut
const MID_HEIGHT = 360;

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
  montantFacturePayeHt,
  burn15JHt,
  latePaymentsHt,
  // données graphique mensuel
  monthlyCashflow,
  comparisonYearSeries,
  selectedYear,
  periodStart,
  periodEnd,
}) => {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* ── Zone 1 : KPIs héro (CA Total + Marge Brute) ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 2,
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
      </Box>

      {/* ── Zone 2 : Graphique mensuel (60%) + Répartition coûts (40%) ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "3fr 2fr",
          gap: 2,
          alignItems: "stretch",
        }}
      >
        <DashboardRevenueMockChart
          monthlyCashflow={monthlyCashflow}
          comparisonYearSeries={comparisonYearSeries}
          selectedYear={selectedYear}
          periodStart={periodStart}
          periodEnd={periodEnd}
          loading={totalCALoading}
          cardHeight={MID_HEIGHT}
        />
        <DashboardCostBreakdown
          coutMainOeuvre={coutMainOeuvre}
          coutMateriel={coutMateriel}
          coutSousTraitance={coutSousTraitance}
          coutChantierGlobal={coutChantierGlobal}
          mainOeuvreMonthlyBreakdown={mainOeuvreMonthlyBreakdown}
          loading={coutChantierLoading}
          totalCA={totalCA}
        />
      </Box>

      {/* ── H2 "Indicateurs financiers" (canvas exact) ── */}
      <Typography
        component="h2"
        sx={{
          fontSize: "1.1rem",
          fontWeight: 700,
          color: "#111827",
          letterSpacing: "-0.01em",
          lineHeight: 1.2,
          mt: 0.5,
        }}
      >
        Indicateurs financiers
      </Typography>

      {/* ── Zone 3 : KPIs financiers (4 cartes compactes) ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 2,
        }}
      >
        <DashboardCardAnnualGrowth
          totalCA={totalCA}
          montantEncaisseReel={montantFacturePayeHt}
          loading={totalCALoading}
        />
        <DashboardCardAgencyExpenses
          breakdown={depensesAgenceBreakdown}
          loading={coutChantierLoading}
          totalCA={totalCA}
        />
        <DashboardCardAnnualBurn
          totalCA={totalCA}
          burnMontant={burn15JHt}
          loading={totalCALoading}
        />
        <DashboardCardLatePayments
          totalCA={totalCA}
          montantRetard={latePaymentsHt}
          loading={totalCALoading}
        />
      </Box>

      {/* ── Divider canvas avant Zone 4 ── */}
      <Box sx={{ borderBottom: "1px solid #e5e7eb" }} />

      {/* ── Zone 4 : Tableau "Détail coûts chantier" (canvas exact) ── */}
      <Box>
        <Typography
          component="h3"
          sx={{
            fontSize: "0.95rem",
            fontWeight: 700,
            color: "#111827",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
            mb: 1.5,
          }}
        >
          Détail coûts chantier
        </Typography>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: 13,
          }}
        >
          <thead>
            <tr>
              {["Poste", "Montant HT", "Part du coût global", "Part du CA"].map((h) => (
                <th
                  key={h}
                  style={{
                    textAlign: "left",
                    padding: "6px 10px",
                    fontWeight: 600,
                    opacity: 0.6,
                    borderBottom: "1px solid rgba(128,128,128,0.2)",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              {
                label: "Coût chantier global",
                montant: coutChantierGlobal,
                partCout: "—",
                partCA:
                  totalCA > 0
                    ? ((coutChantierGlobal / totalCA) * 100).toFixed(1) + " %"
                    : "—",
                isGlobal: true,
              },
              {
                label: "Main d'œuvre",
                montant: coutMainOeuvre,
                partCout:
                  coutChantierGlobal > 0
                    ? ((coutMainOeuvre / coutChantierGlobal) * 100).toFixed(1) + " %"
                    : "—",
                partCA:
                  totalCA > 0
                    ? ((coutMainOeuvre / totalCA) * 100).toFixed(1) + " %"
                    : "—",
                isGlobal: false,
              },
              {
                label: "Matériel",
                montant: coutMateriel,
                partCout:
                  coutChantierGlobal > 0
                    ? ((coutMateriel / coutChantierGlobal) * 100).toFixed(1) + " %"
                    : "—",
                partCA:
                  totalCA > 0
                    ? ((coutMateriel / totalCA) * 100).toFixed(1) + " %"
                    : "—",
                isGlobal: false,
              },
              {
                label: "Sous-traitance",
                montant: coutSousTraitance,
                partCout:
                  coutChantierGlobal > 0
                    ? ((coutSousTraitance / coutChantierGlobal) * 100).toFixed(1) + " %"
                    : "—",
                partCA:
                  totalCA > 0
                    ? ((coutSousTraitance / totalCA) * 100).toFixed(1) + " %"
                    : "—",
                isGlobal: false,
              },
            ].map(({ label, montant, partCout, partCA, isGlobal }) => (
              <tr
                key={label}
                style={{
                  background: isGlobal ? "rgba(128,128,128,0.06)" : "transparent",
                }}
              >
                <td
                  style={{
                    padding: "7px 10px",
                    fontWeight: isGlobal ? 600 : 400,
                  }}
                >
                  {label}
                </td>
                <td
                  style={{
                    padding: "7px 10px",
                    fontVariantNumeric: "tabular-nums",
                    color: isGlobal ? "#dc2626" : undefined,
                    fontWeight: isGlobal ? 600 : 400,
                  }}
                >
                  {coutChantierLoading
                    ? "..."
                    : new Intl.NumberFormat("fr-FR", {
                        style: "currency",
                        currency: "EUR",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }).format(Number(montant || 0))}
                </td>
                <td style={{ padding: "7px 10px", opacity: 0.7 }}>{partCout}</td>
                <td style={{ padding: "7px 10px", opacity: 0.7 }}>{partCA}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Box>
    </Box>
  );
};

export default DashboardCardsGrid;
