import { Box, Paper, Typography } from "@mui/material";
import React from "react";

const getVariantStyles = (variant, accent) => {
  const commonHover = {
    transition: "all 0.25s ease",
    "&:hover": {
      transform: "translateY(-2px)",
      boxShadow: "0 10px 24px rgba(17, 24, 39, 0.12)",
    },
  };

  switch (variant) {
    case 1:
      return {
        ...commonHover,
        background:
          "linear-gradient(135deg, rgba(255,255,255,1) 0%, rgba(243,244,246,0.8) 100%)",
        border: `1px solid ${accent}33`,
        borderTop: `4px solid ${accent}`,
      };
    case 2:
      return {
        ...commonHover,
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "blur(8px)",
        border: `1px solid ${accent}44`,
        boxShadow: "0 8px 20px rgba(15, 23, 42, 0.08)",
      };
    case 3:
      return {
        ...commonHover,
        backgroundColor: "#0f172a",
        border: `1px solid ${accent}66`,
        color: "#f8fafc",
      };
    case 4:
      return {
        ...commonHover,
        background: `linear-gradient(135deg, ${accent}22 0%, #ffffff 100%)`,
        border: "1px dashed #d1d5db",
      };
    case 5:
      return {
        ...commonHover,
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        boxShadow: `inset 0 0 0 2px ${accent}22`,
      };
    case 6:
      return {
        ...commonHover,
        background: "linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)",
        border: "1px solid #e5e7eb",
        borderLeft: `6px solid ${accent}`,
      };
    case 7:
      return {
        ...commonHover,
        backgroundColor: "#ffffff",
        border: `1px solid ${accent}30`,
        boxShadow: `0 2px 10px ${accent}25`,
      };
    case 8:
      return {
        ...commonHover,
        background:
          "radial-gradient(circle at top right, rgba(59,130,246,0.14) 0%, rgba(255,255,255,1) 45%)",
        border: "1px solid #e5e7eb",
      };
    default:
      return {
        ...commonHover,
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
      };
  }
};

const DashboardMetricCardShell = ({
  title,
  value,
  subtitle,
  accent = "#1976d2",
  variant = 1,
  label,
  footerItems = [],
  valueColor,
  percentValue,
  percentBase,
}) => {
  const variantStyles = getVariantStyles(variant, accent);
  const darkCard = variant === 3;
  const hasPercent =
    percentValue != null &&
    percentBase != null &&
    !Number.isNaN(Number(percentValue)) &&
    !Number.isNaN(Number(percentBase)) &&
    Number(percentBase) !== 0;
  const percentLabel = hasPercent
    ? `${((Number(percentValue) / Number(percentBase)) * 100).toFixed(1)}%`
    : null;

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: "14px",
        height: "100%",
        minHeight: 92,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        position: "relative",
        overflow: "hidden",
        ...variantStyles,
      }}
    >
      {(label || percentLabel) && (
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
            bgcolor: darkCard ? "rgba(255,255,255,0.14)" : `${accent}20`,
            color: darkCard ? "#e5e7eb" : accent,
          }}
        >
          {label || percentLabel}
        </Box>
      )}
      <Typography
        variant="caption"
        sx={{
          color: darkCard ? "#cbd5e1" : "#6b7280",
          fontWeight: 700,
          textTransform: "uppercase",
          pr: 7,
        }}
      >
        {title}
      </Typography>
      <Typography
        variant="h6"
        sx={{
          color: valueColor || (darkCard ? "#f8fafc" : "#111827"),
          fontWeight: 800,
          lineHeight: 1.1,
          mt: 0.5,
        }}
      >
        {value}
      </Typography>
      <Box
        sx={{
          height: 4,
          width: 52,
          borderRadius: 999,
          background: `linear-gradient(90deg, ${accent} 0%, ${accent}66 100%)`,
          mb: 0.5,
        }}
      />
      {subtitle ? (
        <Typography
          variant="body2"
          sx={{ color: darkCard ? "#cbd5e1" : "#6b7280", fontSize: "0.75rem" }}
        >
          {subtitle}
        </Typography>
      ) : null}
      {footerItems.length > 0 && (
        <Box
          sx={{
            mt: 1,
            pt: 1,
            borderTop: "1px solid",
            borderTopColor: darkCard ? "rgba(203,213,225,0.28)" : "#e5e7eb",
            display: "flex",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          {footerItems.map((item) => (
            <Box
              key={item.key || item.label}
              sx={{ display: "flex", alignItems: "center", gap: 0.4 }}
            >
              {item.icon ? (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    color: item.color || (darkCard ? "#cbd5e1" : "#6b7280"),
                  }}
                >
                  {item.icon}
                </Box>
              ) : null}
              <Typography
                variant="caption"
                sx={{
                  color: item.color || (darkCard ? "#f8fafc" : "#111827"),
                  fontWeight: 800,
                  lineHeight: 1.2,
                }}
              >
                {item.value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Paper>
  );
};

export default DashboardMetricCardShell;
