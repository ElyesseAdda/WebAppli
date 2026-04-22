import { Box, Paper, Typography } from "@mui/material";
import React from "react";

const DashboardMetricCardShell = ({ title, value, subtitle, accent = "#1976d2" }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: "14px",
        border: "1px solid #e5e7eb",
        height: "100%",
        minHeight: 92,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        backgroundColor: "#ffffff",
      }}
    >
      <Typography variant="caption" sx={{ color: "#6b7280", fontWeight: 700, textTransform: "uppercase" }}>
        {title}
      </Typography>
      <Typography variant="h6" sx={{ color: "#111827", fontWeight: 800, lineHeight: 1.1 }}>
        {value}
      </Typography>
      <Box sx={{ height: 4, width: 42, borderRadius: 999, backgroundColor: accent, mb: 0.5 }} />
      <Typography variant="body2" sx={{ color: "#6b7280", fontSize: "0.75rem" }}>
        {subtitle}
      </Typography>
    </Paper>
  );
};

export default DashboardMetricCardShell;
