import { Box, Divider, Paper, Typography } from "@mui/material";
import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { formatDashboardCurrency } from "./dashboardCurrency";

const COMPANY_BLUE = "#1B78BC";
const COST_COLORS = {
  mo: COMPANY_BLUE,
  mat: "#f97316",
  st: "#dc2626",
};

// Couleurs Pill — mêmes tones que le canvas
const PILL_TONE = {
  danger:  { color: "#b91c1c", border: "#fecaca" },
  info:    { color: "#1d4ed8", border: "#bfdbfe" },
  warning: { color: "#c2410c", border: "#fed7aa" },
};

// Pill abréviation (ST / MO / Mat) + montant — layout canvas
const CostPillRow = ({ pillLabel, tone, montant }) => {
  const t = PILL_TONE[tone];
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box
        component="span"
        sx={{
          display: "inline-flex",
          alignItems: "center",
          px: 1.15,
          py: 0.4,
          borderRadius: "999px",
          bgcolor: "#ffffff",
          border: `1.5px solid ${t.border}`,
          fontSize: "0.76rem",
          fontWeight: 700,
          color: t.color,
          lineHeight: 1.5,
          minWidth: 36,
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {pillLabel}
      </Box>
      <Typography
        variant="caption"
        sx={{ color: "#334155", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}
      >
        {montant}
      </Typography>
    </Box>
  );
};

const DashboardCostBreakdown = ({
  coutMainOeuvre = 0,
  coutMateriel = 0,
  coutSousTraitance = 0,
  coutChantierGlobal = 0,
  totalCA = 0,
  loading = false,
}) => {
  const pieData = [
    { name: "Sous-traitance", value: coutSousTraitance, color: COST_COLORS.st },
    { name: "Main d'œuvre",   value: coutMainOeuvre,   color: COST_COLORS.mo },
    { name: "Matériel",       value: coutMateriel,     color: COST_COLORS.mat },
  ].filter((d) => d.value > 0);

  const donutLegendItems = pieData.map((entry) => ({
    ...entry,
    ratioLabel:
      coutChantierGlobal > 0 ? `${((Number(entry.value) / Number(coutChantierGlobal)) * 100).toFixed(1)}%` : "0.0%",
  }));
  const costOverCALabel =
    Number(totalCA) > 0
      ? `${((Number(coutChantierGlobal) / Number(totalCA)) * 100).toFixed(1)}%`
      : null;

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "10px",
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
        p: 2,
        height: "100%",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        transition: "all 0.25s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 10px 24px rgba(17, 24, 39, 0.12)",
        },
      }}
    >
      {costOverCALabel && (
        <Typography
          component="span"
          variant="caption"
          sx={{
            position: "absolute",
            top: 8,
            right: 10,
            color: "#94a3b8",
            fontSize: "0.66rem",
            fontWeight: 700,
            lineHeight: 1.2,
            letterSpacing: "0.01em",
          }}
        >
          {costOverCALabel}
        </Typography>
      )}
      {/* ── Titre H3 (canvas exact) ── */}
      <Typography
        component="h3"
        sx={{
          fontSize: "0.88rem",
          fontWeight: 700,
          color: "#111827",
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          mb: 1,
          flexShrink: 0,
        }}
      >
        Répartition des coûts chantier
      </Typography>

      {/* ── Row : Donut GAUCHE | Données DROITE (canvas exact) ── */}
      {!loading && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Donut */}
          {pieData.length > 0 && (
            <Box sx={{ width: 230, flexShrink: 0, mt: 0.2, transform: "translate(30px)" }}>
              <Box sx={{ width: 170, height: 170, mx: "auto" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={44}
                      outerRadius={76}
                      paddingAngle={0}
                      dataKey="value"
                      strokeWidth={0}
                      stroke="none"
                    >
                      {pieData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatDashboardCurrency(value)}
                      contentStyle={{
                        borderRadius: 10,
                        border: "1px solid #e5e7eb",
                        fontSize: "0.75rem",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
              <Box
                sx={{
                  mt: "20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.2,
                  width: "100%",
                }}
              >
                {donutLegendItems.map((item) => (
                  <Box
                    key={`donut-legend-${item.name}`}
                    sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1.2 }}
                  >
                    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6, minWidth: 0 }}>
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: item.color,
                          flexShrink: 0,
                        }}
                      />
                      <Typography
                        component="span"
                        variant="caption"
                        sx={{ color: "#94a3b8", fontSize: "0.68rem", lineHeight: 1.2 }}
                      >
                        {item.name}
                      </Typography>
                    </Box>
                    <Typography
                      component="span"
                      variant="caption"
                      sx={{ color: "#94a3b8", fontWeight: 700, fontSize: "0.72rem", lineHeight: 1.2 }}
                    >
                      {item.ratioLabel}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          )}

          {/* Données droite : Stat + Divider + 3 Pill rows */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 0.75,
              flex: "0 0 40%",
              minWidth: 0,
              width: "40%",
              maxWidth: "40%",
              mt: 1.2,
              alignSelf: "center",
              transform: "translate(20px, -50px)",
            }}
          >
            {/* Stat "Coût global" */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
              <Typography
                sx={{
                  fontSize: "1.35rem",
                  fontWeight: 800,
                  color: "#334155",
                  lineHeight: 1.1,
                  fontVariantNumeric: "tabular-nums",
                  mb: 0.2,
                }}
              >
                {formatDashboardCurrency(coutChantierGlobal)}
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "#64748b", fontWeight: 600, display: "block" }}
              >
                Coût global
              </Typography>
            </Box>

            <Divider />

            {/* Pill ST + MO + Mat */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              <CostPillRow
                pillLabel="ST"
                tone="danger"
                montant={formatDashboardCurrency(coutSousTraitance)}
              />
              <CostPillRow
                pillLabel="MO"
                tone="info"
                montant={formatDashboardCurrency(coutMainOeuvre)}
              />
              <CostPillRow
                pillLabel="Mat"
                tone="warning"
                montant={formatDashboardCurrency(coutMateriel)}
              />
            </Box>
          </Box>
        </Box>
      )}

      {loading && (
        <Typography variant="body2" sx={{ color: "#94a3b8" }}>
          Chargement...
        </Typography>
      )}

    </Paper>
  );
};

export default DashboardCostBreakdown;
