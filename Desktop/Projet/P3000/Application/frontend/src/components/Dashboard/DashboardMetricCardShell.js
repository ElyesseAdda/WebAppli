import { Box, Paper, Typography } from "@mui/material";
import React from "react";

// Couleurs des badges (Pill-like) par tone — alignées avec le canvas
const BADGE_TONE = {
  success: { bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  info:    { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  brandBlue: { bg: "#ffffff", color: "#1B78BC", border: "#1B78BC" },
  warning: { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  danger:  { bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
  neutral: { bg: "#f1f5f9", color: "#475569", border: "#e2e8f0" },
};

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
        border: "1px solid #e5e7eb",
        boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
      };
    case 8:
      return {
        ...commonHover,
        background:
          "radial-gradient(circle at top right, rgba(59,130,246,0.14) 0%, rgba(255,255,255,1) 45%)",
        border: "1px solid #e5e7eb",
      };
    // variant 9 = hero : seulement la bordure gauche, pas d'outer border (canvas exact)
    case 9:
      return {
        ...commonHover,
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        borderLeft: `8px solid ${accent}`,
        borderTopLeftRadius: "4px",
        borderBottomLeftRadius: "4px",
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
  extraContent = null,
  toolbarPrefix = null,
  // Hero mode (variant 9) : valeur 32 px + layout canal
  largeValue = false,
  // Mode KPI compact : montant centré en haut, titre centré dessous, sous-texte en bas à gauche
  valueFirstCentered = false,
  // Badge Pill affiché en row sous la valeur (hero mode)
  subtitleBadge = null,
  subtitleBadgeTone = "neutral",
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
  const badgeShowsPercent = Boolean(percentLabel) && !label;

  // En mode hero, on cache le badge top-right (l'info est dans la row badge/subtitle)
  const showTopBadge = !largeValue && !valueFirstCentered && (toolbarPrefix || label || percentLabel);

  const badgeStyle = BADGE_TONE[subtitleBadgeTone] || BADGE_TONE.neutral;

  return (
    <Paper
      elevation={0}
      sx={{
        px: largeValue ? 2.25 : 2,
        py: largeValue ? 1.5 : valueFirstCentered ? 1.25 : 2,
        borderRadius: "10px",
        height: "100%",
        minHeight: largeValue ? 98 : valueFirstCentered ? 84 : 92,
        display: "flex",
        flexDirection: "column",
        justifyContent: largeValue ? "flex-start" : "space-between",
        position: "relative",
        overflow: "hidden",
        ...variantStyles,
      }}
    >
      {/* Badge % en haut à droite — uniquement pour les cartes standards */}
      {showTopBadge && (
        <Box
          sx={{
            position: "absolute",
            top: 8,
            right: 10,
            display: "flex",
            alignItems: "center",
            gap: 0.5,
          }}
        >
          {toolbarPrefix}
          {(label || percentLabel) && (
            <Typography
              component="span"
              variant="caption"
              sx={{
                fontSize: "0.65rem",
                fontWeight: 700,
                letterSpacing: "0.02em",
                lineHeight: 1.2,
                ...(badgeShowsPercent
                  ? { color: darkCard ? "#94a3b8" : "#64748b" }
                  : { color: darkCard ? "#e5e7eb" : accent }),
              }}
            >
              {label || percentLabel}
            </Typography>
          )}
        </Box>
      )}

      {/* Toolbar en hero mode (icône agence) — reste accessible */}
      {largeValue && toolbarPrefix && (
        <Box sx={{ position: "absolute", top: 10, right: 10 }}>
          {toolbarPrefix}
        </Box>
      )}
      {valueFirstCentered && !largeValue && toolbarPrefix && (
        <Box sx={{ position: "absolute", top: 8, right: 10 }}>
          {toolbarPrefix}
        </Box>
      )}

      {valueFirstCentered && !largeValue ? (
        <>
          <Typography
            component="div"
            sx={{
              color: valueColor || (darkCard ? "#f8fafc" : "#111827"),
              fontWeight: 800,
              lineHeight: 1.05,
              mt: 0.1,
              fontSize: "1.45rem",
              textAlign: "center",
            }}
          >
            {value}
          </Typography>
          <Typography
            variant="caption"
            component="span"
            sx={{
              color: darkCard ? "#cbd5e1" : "#475569",
              fontWeight: 600,
              textTransform: "none",
              letterSpacing: "0.04em",
              fontSize: "0.56rem",
              textAlign: "center",
              mt: 0.25,
            }}
          >
            {title}
          </Typography>
        </>
      ) : (
        <>
          {/* ── Titre ── */}
          <Typography
            variant="caption"
            component="span"
            sx={{
              // Hero : secondaire, 600, letterspacing 0.06em — canvas exact
              // Standard : plus foncé, 700
              color: largeValue
                ? "#64748b"
                : darkCard
                ? "#cbd5e1"
                : "#475569",
              fontWeight: largeValue ? 600 : 700,
              textTransform: "uppercase",
              pr: largeValue ? 0 : 7,
              letterSpacing: largeValue ? "0.06em" : "0.04em",
              fontSize: largeValue ? "0.72rem" : undefined,
            }}
          >
            {title}
          </Typography>

          {/* ── Valeur ── */}
          <Typography
            component="div"
            sx={{
              color: valueColor || (darkCard ? "#f8fafc" : "#111827"),
              fontWeight: 800,
              lineHeight: largeValue ? 1 : 1.1,
              mt: largeValue ? 0.7 : 0.5,
              letterSpacing: largeValue ? "-0.02em" : undefined,
              // Hero : 32 px (canvas exact) — Standard : h6 MUI (~1.25 rem)
              fontSize: largeValue ? "1.85rem" : "1.25rem",
            }}
          >
            {value}
          </Typography>
        </>
      )}

      {/* ── Zone sous-titre ── */}
      {largeValue ? (
        // Hero mode : row avec Pill badge + texte secondaire (canvas exact)
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mt: 0.8,
            flexWrap: "wrap",
          }}
        >
          {subtitleBadge && (
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 1.4,
                py: 0.45,
                borderRadius: "999px",
                bgcolor: "#ffffff",
                border: `1.5px solid ${badgeStyle.border}`,
                fontSize: "0.8rem",
                fontWeight: 700,
                color: badgeStyle.color,
                lineHeight: 1.5,
                whiteSpace: "nowrap",
              }}
            >
              {subtitleBadge}
            </Box>
          )}
          {subtitle && (
            <Typography
              component="span"
              variant="caption"
              sx={{
                color: "#94a3b8",
                fontSize: "0.72rem",
                fontWeight: 500,
                lineHeight: 1.4,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      ) : (
        // Standard mode : texte subtitle classique
        subtitle ? (
          <Typography
            variant="body2"
            sx={{
              color: darkCard ? "#cbd5e1" : "#6b7280",
              fontSize: valueFirstCentered ? "0.62rem" : "0.72rem",
              lineHeight: valueFirstCentered ? 1.2 : undefined,
              mt: valueFirstCentered ? "auto" : undefined,
              textAlign: valueFirstCentered ? "left" : undefined,
              alignSelf: valueFirstCentered ? "flex-start" : undefined,
              ml: valueFirstCentered ? 0 : undefined,
              mb: valueFirstCentered ? -0.2 : undefined,
            }}
          >
            {subtitle}
          </Typography>
        ) : null
      )}

      {extraContent ? (
        <Box sx={{ mt: 0.75, flex: 1, minHeight: 0, overflow: "auto" }}>{extraContent}</Box>
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
