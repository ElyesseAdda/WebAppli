import { Box } from "@mui/material";
import React from "react";

const STYLES = {
  termine: {
    label: "Validé",
    dot: "#34d399",
    header: {
      color: "#ecfdf5",
      borderColor: "rgba(52, 211, 153, 0.45)",
      backgroundColor: "rgba(16, 185, 129, 0.16)",
      dotShadow: "0 0 8px rgba(52, 211, 153, 0.75)",
    },
    surface: {
      color: "#047857",
      borderColor: "#a7f3d0",
      backgroundColor: "#ecfdf5",
      dotShadow: "0 0 6px rgba(16, 185, 129, 0.45)",
    },
  },
  brouillon: {
    label: "Brouillon",
    dot: "#fbbf24",
    header: {
      color: "#fffbeb",
      borderColor: "rgba(251, 191, 36, 0.45)",
      backgroundColor: "rgba(245, 158, 11, 0.18)",
      dotShadow: "0 0 8px rgba(251, 191, 36, 0.75)",
    },
    surface: {
      color: "#b45309",
      borderColor: "#fde68a",
      backgroundColor: "#fffbeb",
      dotShadow: "0 0 6px rgba(245, 158, 11, 0.45)",
    },
  },
};

/** Badge de statut discret : pastille lumineuse + libellé, adapté au fond clair ou bleu. */
const GanttStatutBadge = ({ statut, variant = "surface", size = "medium" }) => {
  const config = STYLES[statut === "termine" ? "termine" : "brouillon"];
  const theme = variant === "header" ? config.header : config.surface;
  const compact = size === "small";

  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: compact ? 0.5 : 0.75,
        px: compact ? 1 : 1.25,
        py: compact ? 0.25 : 0.375,
        borderRadius: "999px",
        fontSize: compact ? 10 : 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        border: "1px solid",
        borderColor: theme.borderColor,
        backgroundColor: theme.backgroundColor,
        color: theme.color,
        lineHeight: 1.4,
        flexShrink: 0,
        backdropFilter: variant === "header" ? "blur(6px)" : "none",
      }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          width: compact ? 6 : 7,
          height: compact ? 6 : 7,
          borderRadius: "50%",
          backgroundColor: config.dot,
          boxShadow: theme.dotShadow,
          flexShrink: 0,
        }}
      />
      {config.label}
    </Box>
  );
};

export default GanttStatutBadge;
