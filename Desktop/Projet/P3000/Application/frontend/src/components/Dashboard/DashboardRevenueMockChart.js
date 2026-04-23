import { Box, Paper, Typography } from "@mui/material";
import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatDashboardCurrency } from "./dashboardCurrency";

const DashboardRevenueMockChart = ({
  monthlyCashflow = [],
  comparisonYearSeries = [],
  loading = false,
}) => {
  const companyBlue = "#1B78BC";
  const comparisonPalette = ["#f97316", "#22c55e", "#a855f7", "#ef4444", "#eab308", "#14b8a6"];
  const legendItems = [{ label: "Période actuelle", color: companyBlue }];
  (comparisonYearSeries || []).forEach((series, idx) => {
    legendItems.push({
      label: `Année ${series.year}`,
      color: comparisonPalette[idx % comparisonPalette.length],
    });
  });

  const data = (monthlyCashflow || []).map((m, idx) => {
    const row = {
    month: m.label,
    ca_ht_current: Number(m.facture_ht || 0),
    };
    (comparisonYearSeries || []).forEach((series, sIdx) => {
      const val = Number(series?.monthlyCashflow?.[idx]?.facture_ht || 0);
      row[`ca_ht_cmp_${sIdx}`] = val;
    });
    return row;
  });
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "14px",
        backgroundColor: "#ffffff",
        border: "1px solid rgba(27, 120, 188, 0.19)",
        boxShadow: "0 2px 10px rgba(27, 120, 188, 0.15)",
        transition: "all 0.25s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 10px 24px rgba(17, 24, 39, 0.12)",
        },
        height: 487,
        p: 2,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Typography
        variant="caption"
        sx={{ color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}
      >
        Vue mensuelle
      </Typography>
      <Typography variant="h6" sx={{ color: "#111827", fontWeight: 800, lineHeight: 1.1, mt: 0.5 }}>
        Montants facturés hors taxes (comparatif)
      </Typography>
      <Box
        sx={{
          height: 4,
          width: 70,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${companyBlue} 0%, #22c55e 100%)`,
          my: 1,
        }}
      />

      <Box sx={{ height: 365, mt: 1 }}>
        {loading ? (
          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            Chargement du graphique...
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 4 }} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fill: "#64748b", fontSize: 11 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
              <Tooltip
                formatter={(value, name) => [formatDashboardCurrency(value), name]}
                contentStyle={{ borderRadius: 10, border: "1px solid #cbd5e1" }}
              />
              <Bar
                dataKey="ca_ht_current"
                name="Période actuelle"
                fill={companyBlue}
                radius={[4, 4, 0, 0]}
              />
              {(comparisonYearSeries || []).map((series, idx) => (
                <Bar
                  key={`cmp-${series.year}-${idx}`}
                  dataKey={`ca_ht_cmp_${idx}`}
                  name={`Année ${series.year}`}
                  fill={comparisonPalette[idx % comparisonPalette.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
      <Box sx={{ mt: 1, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
        {legendItems.map((item) => (
          <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "2px",
                bgcolor: item.color,
                border: "1px solid rgba(15,23,42,0.08)",
              }}
            />
            <Typography variant="caption" sx={{ color: "#64748b", fontWeight: 700 }}>
              {item.label}
            </Typography>
          </Box>
        ))}
      </Box>

    </Paper>
  );
};

export default DashboardRevenueMockChart;
