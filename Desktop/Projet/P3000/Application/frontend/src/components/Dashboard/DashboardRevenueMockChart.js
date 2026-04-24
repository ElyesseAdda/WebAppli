import { Box, Paper, Typography } from "@mui/material";
import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDashboardCurrency } from "./dashboardCurrency";

const COMPANY_BLUE = "#1B78BC";
const COMPARISON_PALETTE = ["#f97316", "#22c55e", "#a855f7", "#ef4444", "#eab308", "#14b8a6"];

// Tones canvas : neutral pour la période actuelle, warning pour les années de comparaison
const PILL_TONE = {
  neutral: { color: "#475569", border: "#e2e8f0" },
  warning: { color: "#c2410c", border: "#fed7aa" },
  info: { color: "#1d4ed8", border: "#bfdbfe" },
  danger: { color: "#b91c1c", border: "#fecaca" },
};

// Pill légère pour la légende dans le header du chart (canvas exact)
const LegendPill = ({ label, tone = "neutral" }) => {
  const t = PILL_TONE[tone] || PILL_TONE.neutral;
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.6,
        px: 1.2,
        py: 0.45,
        borderRadius: "999px",
        border: `1.5px solid ${t.border}`,
        bgcolor: "#ffffff",
      }}
    >
      <Typography
        component="span"
        sx={{ fontSize: "0.76rem", fontWeight: 700, color: t.color, lineHeight: 1.1 }}
      >
        {label}
      </Typography>
    </Box>
  );
};

const DashboardRevenueMockChart = ({
  monthlyCashflow = [],
  comparisonYearSeries = [],
  selectedYear = null,
  periodStart = null,
  periodEnd = null,
  loading = false,
  cardHeight = 487,
}) => {
  const formatBottomLegendLabel = (label) => {
    const match = String(label || "").match(/^Année\s+(\d{4})$/i);
    return match ? match[1] : label;
  };

  const formatMonthLabel = (value) => {
    const raw = String(value || "").trim();
    if (!raw) return "";
    if (/^\d{4}[-/]\d{2}$/.test(raw)) {
      const [y, m] = raw.split(/[-/]/).map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long" });
    }
    if (/^\d{2}[-/]\d{4}$/.test(raw)) {
      const [m, y] = raw.split(/[-/]/).map(Number);
      return new Date(y, m - 1, 1).toLocaleDateString("fr-FR", { month: "long" });
    }
    const cleaned = raw
      .replace(/\b\d{4}\b/g, "")
      .replace(/\b\d{2}\b/g, "")
      .replace(/[,/()-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const monthOnly = cleaned.split(" ")[0];
    return monthOnly || cleaned || raw;
  };

  const formatPeriodLegend = () => {
    if (!selectedYear) return "Période actuelle";
    if (!periodStart || !periodEnd) return `Année ${selectedYear}`;
    const formatMonthYear = (monthValue) => {
      const [year, month] = String(monthValue || "").split("-").map(Number);
      if (!year || !month) return monthValue;
      return new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
        month: "long",
        year: "2-digit",
      });
    };
    return `${selectedYear} de ${formatMonthYear(periodStart)} à ${formatMonthYear(periodEnd)}`;
  };

  const legendItems = [{ label: formatPeriodLegend(), color: COMPANY_BLUE, tone: "neutral" }];
  (comparisonYearSeries || []).forEach((series, idx) => {
    legendItems.push({
      label: `Année ${series.year}`,
      color: COMPARISON_PALETTE[idx % COMPARISON_PALETTE.length],
      tone: "warning",
    });
  });

  const data = (monthlyCashflow || []).map((m, idx) => {
    const row = { month: m.label, ca_ht_current: Number(m.facture_ht || 0) };
    (comparisonYearSeries || []).forEach((series, sIdx) => {
      row[`ca_ht_cmp_${sIdx}`] = Number(series?.monthlyCashflow?.[idx]?.facture_ht || 0);
    });
    return row;
  });

  // Hauteur de la zone chart = cardHeight − header − légende bas
  const chartAreaHeight = cardHeight - 126;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "10px",
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",          // neutre (canvas exact, pas de blue tint)
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
        transition: "all 0.25s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 10px 24px rgba(17, 24, 39, 0.12)",
        },
        height: cardHeight,
        p: 2,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {/* ── Header : titre H3 + pills légende (canvas exact) ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography
          component="h3"
          sx={{
            fontSize: "0.88rem",
            fontWeight: 700,
            color: "#111827",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}
        >
          Facturation HT mensuelle
        </Typography>
        <Box sx={{ display: "flex", gap: 0.6, flexWrap: "wrap" }}>
          {legendItems.map((item) => (
            <LegendPill
              key={item.label}
              label={item.label}
              tone={item.tone}
            />
          ))}
        </Box>
      </Box>

      {/* ── Zone graphique ── */}
      <Box sx={{ flex: 1, minHeight: 0, height: chartAreaHeight }}>
        {loading ? (
          <Typography variant="body2" sx={{ color: "#94a3b8" }}>
            Chargement du graphique...
          </Typography>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 8, left: -14, bottom: 4 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthLabel}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "#94a3b8", fontSize: 11 }}
                tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(val, name) => [formatDashboardCurrency(val), name]}
                contentStyle={{
                  borderRadius: 10,
                  border: "1px solid #e5e7eb",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  fontSize: "0.78rem",
                }}
                cursor={{ fill: "rgba(0,0,0,0.03)" }}
              />
              <Bar
                dataKey="ca_ht_current"
                name="Période actuelle"
                fill={COMPANY_BLUE}
                radius={[0, 0, 0, 0]}
                maxBarSize={32}
              />
              {(comparisonYearSeries || []).map((series, idx) => (
                <Bar
                  key={`cmp-${series.year}-${idx}`}
                  dataKey={`ca_ht_cmp_${idx}`}
                  name={`Année ${series.year}`}
                  fill={COMPARISON_PALETTE[idx % COMPARISON_PALETTE.length]}
                  radius={[0, 0, 0, 0]}
                  maxBarSize={32}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>
      {!loading && (
        <Box
          sx={{
            mt: 0.75,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.5,
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {legendItems.map((item) => (
            <Box key={`bottom-${item.label}`} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "2px",
                  bgcolor: item.color,
                  flexShrink: 0,
                }}
              />
              <Typography component="span" sx={{ fontSize: "0.72rem", color: "#64748b", fontWeight: 600 }}>
                {formatBottomLegendLabel(item.label)}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default DashboardRevenueMockChart;
