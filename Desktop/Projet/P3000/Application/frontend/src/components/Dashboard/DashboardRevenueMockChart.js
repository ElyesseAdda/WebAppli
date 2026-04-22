import { Box, Paper, Typography } from "@mui/material";
import React from "react";

const monthlyRevenue = [
  { month: "Jan", value: 102000 },
  { month: "Fev", value: 114000 },
  { month: "Mar", value: 121000 },
  { month: "Avr", value: 132000 },
  { month: "Mai", value: 149000 },
  { month: "Jun", value: 138000 },
  { month: "Jul", value: 156000 },
  { month: "Aou", value: 162000 },
  { month: "Sep", value: 170000 },
  { month: "Oct", value: 179000 },
  { month: "Nov", value: 186000 },
  { month: "Dec", value: 195000 },
];

const DashboardRevenueMockChart = () => {
  const chartWidth = 760;
  const chartHeight = 520;
  const padding = { top: 32, right: 20, bottom: 36, left: 42 };
  const graphWidth = chartWidth - padding.left - padding.right;
  const graphHeight = chartHeight - padding.top - padding.bottom;

  const max = Math.max(...monthlyRevenue.map((d) => d.value));
  const min = Math.min(...monthlyRevenue.map((d) => d.value));
  const range = max - min || 1;

  const points = monthlyRevenue.map((d, index) => {
    const x = padding.left + (index / (monthlyRevenue.length - 1)) * graphWidth;
    const y = padding.top + graphHeight - ((d.value - min) / range) * graphHeight;
    return { ...d, x, y };
  });

  const path = points.map((p, index) => `${index === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");

  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: "14px",
        backgroundColor: "#ffffff",
        border: "1px solid #2563eb30",
        boxShadow: "0 2px 10px #2563eb25",
        transition: "all 0.25s ease",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 10px 24px rgba(17, 24, 39, 0.12)",
        },
        height: 580,
        p: 2,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 10,
          right: 10,
          px: 1,
          py: 0.2,
          borderRadius: "999px",
          fontSize: "0.65rem",
          fontWeight: 800,
          letterSpacing: "0.3px",
          bgcolor: "#2563eb20",
          color: "#2563eb",
        }}
      >
        Style 7
      </Box>
      <Typography
        variant="caption"
        sx={{
          color: "#6b7280",
          fontWeight: 700,
          textTransform: "uppercase",
          pr: 7,
        }}
      >
        Evolution du CA mensuel (mock)
      </Typography>
      <Typography variant="h6" sx={{ color: "#111827", fontWeight: 800, lineHeight: 1.1, mt: 0.5, mb: 1 }}>
        Courbe de tendance annuelle
      </Typography>
      <Box
        sx={{
          height: 4,
          width: 52,
          borderRadius: 999,
          background: "linear-gradient(90deg, #2563eb 0%, #2563eb66 100%)",
          mb: 1,
        }}
      />
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <svg width={chartWidth} height={chartHeight}>
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={padding.left + graphWidth}
            y2={padding.top + graphHeight}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + graphHeight}
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />

          <defs>
            <linearGradient id="chartLineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#2563eb" />
              <stop offset="100%" stopColor="#60a5fa" />
            </linearGradient>
          </defs>

          <path d={path} fill="none" stroke="url(#chartLineGradient)" strokeWidth="3" strokeLinejoin="round" />

          {points.map((point) => (
            <g key={point.month}>
              <circle cx={point.x} cy={point.y} r="4" fill="#2563eb" />
              <circle cx={point.x} cy={point.y} r="7" fill="#2563eb22" />
              <text x={point.x} y={padding.top + graphHeight + 18} textAnchor="middle" fontSize="11" fill="#6b7280">
                {point.month}
              </text>
            </g>
          ))}
        </svg>
      </Box>
    </Paper>
  );
};

export default DashboardRevenueMockChart;
