import { Box, Typography } from "@mui/material";
import React from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardCardLaborCost = ({
  value = 0,
  totalCA = 0,
  loading = false,
  mainOeuvreMonthlyBreakdown = [],
}) => {
  const hasBreakdown = Array.isArray(mainOeuvreMonthlyBreakdown) && mainOeuvreMonthlyBreakdown.length > 0;

  const extraContent =
    !loading && hasBreakdown ? (
      <Box>
        <Typography
          variant="caption"
          sx={{ display: "block", color: "#64748b", fontWeight: 600, mb: 0.5, lineHeight: 1.35 }}
        >
          Détail par mois (somme LaborCost : normal, samedi, dimanche, férié, heures sup. ; mois =
          mois civil du lundi de la semaine ISO ; hors chantiers agence)
        </Typography>
        <Box sx={{ maxHeight: 112, overflowY: "auto", pr: 0.25 }}>
          {mainOeuvreMonthlyBreakdown.map((row) => (
            <Box
              key={row.key}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 1,
                py: 0.2,
                borderBottom: "1px solid #f1f5f9",
              }}
            >
              <Typography component="span" variant="caption" sx={{ color: "#64748b", fontWeight: 600 }}>
                {row.label}
              </Typography>
              <Typography
                component="span"
                variant="caption"
                sx={{ color: "#334155", fontWeight: 700, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}
              >
                {formatDashboardCurrency(Number(row.montant_ht) || 0)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    ) : null;

  return (
    <DashboardMetricCardShell
      title="Coût main d'œuvre"
      value={loading ? "Chargement..." : formatDashboardCurrency(value)}
      valueColor={loading ? undefined : Number(value || 0) >= 0 ? "rgba(27, 120, 188, 1)" : "#dc2626"}
      subtitle="Période sélectionnée — total = somme des lignes ci-dessous"
      accent="#0d9488"
      variant={7}
      percentValue={loading ? null : value}
      percentBase={loading ? null : totalCA}
      extraContent={extraContent}
    />
  );
};

export default DashboardCardLaborCost;
