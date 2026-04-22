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
  const chartWidth = 680;
  const chartHeight = 420;
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
        borderRadius: "16px",
        border: "1px solid #e5e7eb",
        height: 460,
        p: 2,
      }}
    >
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
        Evolution du CA mensuel (mock)
      </Typography>
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <svg width={chartWidth} height={chartHeight}>
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={padding.left + graphWidth}
            y2={padding.top + graphHeight}
            stroke="#d1d5db"
            strokeWidth="1.5"
          />
          <line
            x1={padding.left}
            y1={padding.top}
            x2={padding.left}
            y2={padding.top + graphHeight}
            stroke="#d1d5db"
            strokeWidth="1.5"
          />

          <path d={path} fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round" />

          {points.map((point) => (
            <g key={point.month}>
              <circle cx={point.x} cy={point.y} r="4" fill="#2563eb" />
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
