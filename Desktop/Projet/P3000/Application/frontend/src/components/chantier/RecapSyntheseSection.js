import { Box, Grid, Paper, Typography } from "@mui/material";
import { ResponsivePie } from "@nivo/pie";
import React from "react";

const RecapSyntheseSection = ({ data }) => {
  if (!data) return null;
  const montant_ht = Number(data.montant_ht || 0);
  const taux_fixe = Number(data.taux_fixe || 0);
  const montant_taux_fixe = Number(data.montant_taux_fixe || 0);
  const total_materiel = Number(data.sorties?.paye?.materiel?.total || 0);
  const total_main_oeuvre = Number(data.sorties?.paye?.main_oeuvre?.total || 0);
  const total_sous_traitant = Number(
    data.sorties?.paye?.sous_traitant?.total || 0
  );
  const benefice =
    montant_ht -
    montant_taux_fixe -
    total_materiel -
    total_main_oeuvre -
    total_sous_traitant;

  // Préparer les données pour le PieChart
  const pieData = [
    {
      id: "Taux fixe",
      label: "Taux fixe",
      value: montant_taux_fixe,
      color: "#BDBDBD",
    },
    {
      id: "Matériel",
      label: "Matériel",
      value: total_materiel,
      color: "#FF9800",
    },
    {
      id: "Main d'œuvre",
      label: "Main d'œuvre",
      value: total_main_oeuvre,
      color: "#2196F3",
    },
    {
      id: "Sous-traitance",
      label: "Sous-traitance",
      value: total_sous_traitant,
      color: "#4CAF50",
    },
    {
      id: "Bénéfice",
      label: "Bénéfice",
      value: benefice,
      color: benefice >= 0 ? "#43A047" : "#f44336",
    },
  ];

  // Déterminer dynamiquement la taille de police
  const getFontSize = (value) => {
    const length = String(Math.floor(Math.abs(value))).length;
    if (length <= 2) return 32;
    if (length === 3) return 28;
    if (length === 4) return 24;
    if (length === 5) return 20;
    if (length === 6) return 18;
    return 16;
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }} elevation={3}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Synthèse Financière du Chantier
      </Typography>
      <Grid container spacing={2} alignItems="center">
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <Typography color="text.secondary">Montant marché</Typography>
              <Typography variant="h6">
                {montant_ht.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                })}{" "}
                €
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography color="text.secondary">Taux fixe</Typography>
              <Typography variant="h6">
                {taux_fixe.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                })}{" "}
                %
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography color="text.secondary">Montant taux fixe</Typography>
              <Typography variant="h6">
                {montant_taux_fixe.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                })}{" "}
                €
              </Typography>
            </Grid>
            <Grid item xs={12} md={3}>
              <Typography color="text.secondary">Bénéfice</Typography>
              <Typography
                variant="h6"
                color={benefice >= 0 ? "success.main" : "error.main"}
              >
                {benefice.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}{" "}
                €
              </Typography>
            </Grid>
          </Grid>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box
            sx={{ width: 220, height: 220, position: "relative", mx: "auto" }}
          >
            <ResponsivePie
              data={pieData}
              margin={{ top: 20, right: 20, bottom: 40, left: 20 }}
              innerRadius={0.6}
              padAngle={1}
              cornerRadius={3}
              colors={{ datum: "data.color" }}
              borderWidth={1}
              borderColor={{ from: "color", modifiers: [["darker", 0.2]] }}
              enableArcLabels={false}
              enableArcLinkLabels={false}
            />
            {/* Afficher le bénéfice au centre */}
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                flexDirection: "column",
              }}
            >
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ fontSize: getFontSize(benefice) }}
              >
                {Number(benefice).toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                })}
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ fontSize: getFontSize(benefice) * 0.7, ml: 0.5 }}
              >
                €
              </Typography>
              <Typography variant="body2" sx={{ mt: 1 }}>
                Bénéfice
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default RecapSyntheseSection;
