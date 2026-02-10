import React, { useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  LinearProgress,
  Grow,
  Collapse,
  alpha,
} from "@mui/material";
import {
  MdCompareArrows,
  MdTrendingDown,
  MdEmojiEvents,
  MdAssessment,
} from "react-icons/md";
import { PALETTE } from "./theme";

// === Carte statistique ===
const StatCard = ({ icon: Icon, label, value, sublabel, color, delay }) => (
  <Grow in timeout={400 + delay * 100}>
    <Box
      sx={{
        flex: "1 1 180px",
        minWidth: 180,
        p: 2.5,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(
          color,
          0.03
        )} 100%)`,
        border: `1px solid ${alpha(color, 0.15)}`,
        display: "flex",
        flexDirection: "column",
        gap: 0.5,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: `0 8px 25px ${alpha(color, 0.15)}`,
          border: `1px solid ${alpha(color, 0.3)}`,
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: alpha(color, 0.12),
            color: color,
          }}
        >
          <Icon size={18} />
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: PALETTE.textSecondary,
            fontWeight: 500,
            fontSize: "0.7rem",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {label}
        </Typography>
      </Box>
      <Typography
        variant="h5"
        sx={{ fontWeight: 800, color: PALETTE.text, lineHeight: 1.2 }}
      >
        {value}
      </Typography>
      {sublabel && (
        <Typography
          variant="caption"
          sx={{ color: PALETTE.textMuted, fontSize: "0.72rem" }}
        >
          {sublabel}
        </Typography>
      )}
    </Box>
  </Grow>
);

// === Barre fournisseur ===
const FournisseurBar = ({ name, count, total, color, delay }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <Grow in timeout={500 + delay * 120}>
      <Box sx={{ flex: "1 1 200px", minWidth: 200 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 0.5,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                backgroundColor: color,
                boxShadow: `0 0 6px ${alpha(color, 0.4)}`,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: PALETTE.text,
                fontSize: "0.8rem",
              }}
            >
              {name}
            </Typography>
          </Box>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, color, fontSize: "0.85rem" }}
          >
            {count}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={pct}
          sx={{
            height: 6,
            borderRadius: 3,
            backgroundColor: alpha(color, 0.1),
            "& .MuiLinearProgress-bar": {
              borderRadius: 3,
              background: `linear-gradient(90deg, ${color}, ${alpha(
                color,
                0.7
              )})`,
            },
          }}
        />
      </Box>
    </Grow>
  );
};

const StatsPanel = ({
  comparaisonRows,
  selectedFournisseurs,
  fournisseurColors,
}) => {
  const stats = useMemo(() => {
    if (selectedFournisseurs.length < 2) return null;

    const selectedNames = selectedFournisseurs.map((f) => f.name);
    let completedRows = 0;
    let totalEcart = 0;
    let bestCountByFournisseur = {};

    selectedNames.forEach((name) => {
      bestCountByFournisseur[name] = 0;
    });

    comparaisonRows.forEach((row) => {
      // Verifier que au moins 2 fournisseurs ont un produit selectionne
      const filledEntries = selectedNames
        .filter((name) => row.products[name] != null)
        .map((name) => ({
          name,
          prix: row.products[name].prix_unitaire,
        }));

      if (filledEntries.length >= 2) {
        completedRows++;
        const prices = filledEntries.map((e) => e.prix);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        totalEcart += maxPrice - minPrice;

        // Qui a le meilleur prix ?
        const bestEntry = filledEntries.reduce((best, entry) =>
          entry.prix < best.prix ? entry : best
        );
        bestCountByFournisseur[bestEntry.name]++;
      }
    });

    return {
      totalRows: comparaisonRows.length,
      completedRows,
      totalEcart,
      bestCountByFournisseur,
    };
  }, [comparaisonRows, selectedFournisseurs]);

  if (!stats || stats.completedRows === 0) return null;

  return (
    <Collapse in>
      <Box sx={{ mb: 3 }}>
        {/* Cartes stats */}
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 2 }}>
          <StatCard
            icon={MdAssessment}
            label="Lignes de comparaison"
            value={stats.totalRows}
            sublabel={`${stats.completedRows} complete${
              stats.completedRows > 1 ? "s" : ""
            }`}
            color={PALETTE.primary}
            delay={0}
          />
          <StatCard
            icon={MdCompareArrows}
            label="Comparaisons effectives"
            value={stats.completedRows}
            sublabel="avec 2+ produits"
            color="#06b6d4"
            delay={1}
          />
          <StatCard
            icon={MdTrendingDown}
            label="Ecart cumule"
            value={`${stats.totalEcart.toFixed(2)} €`}
            sublabel="economies potentielles"
            color={PALETTE.warning}
            delay={2}
          />
        </Box>

        {/* Barres meilleur prix */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5,
            borderRadius: 3,
            border: `1px solid ${PALETTE.border}`,
            backgroundColor: PALETTE.surface,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <MdEmojiEvents size={18} color={PALETTE.warning} />
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: PALETTE.text,
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Meilleurs prix par fournisseur
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            {Object.entries(stats.bestCountByFournisseur).map(
              ([name, count], i) => (
                <FournisseurBar
                  key={name}
                  name={name}
                  count={count}
                  total={stats.completedRows}
                  color={fournisseurColors[name]}
                  delay={i}
                />
              )
            )}
          </Box>
        </Paper>
      </Box>
    </Collapse>
  );
};

export default StatsPanel;
