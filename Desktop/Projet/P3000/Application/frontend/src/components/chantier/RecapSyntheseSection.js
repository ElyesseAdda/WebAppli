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
  // Coût chantier = main d'oeuvre + sous-traitance + matériel
  const cout_chantier =
    total_main_oeuvre + total_sous_traitant + total_materiel;

  // Calcul du total des paiements reçus
  const total_paiements_recus =
    data.entrees && data.entrees.paye
      ? Object.values(data.entrees.paye).reduce(
          (acc, cat) => acc + (cat.total || 0),
          0
        )
      : 0;

  // Nouveau calcul du bénéfice
  const benefice =
    total_paiements_recus -
    montant_taux_fixe -
    total_materiel -
    total_main_oeuvre -
    total_sous_traitant;

  // Préparer les données pour le PieChart (regroupement)
  const pieData = [
    {
      id: "Taux fixe",
      label: "Taux fixe",
      value: montant_taux_fixe,
      color: "#1976d2", // bleu
    },
    {
      id: "Coût chantier",
      label: "Coût chantier",
      value: cout_chantier,
      color: "#FF7043", // orange foncé
    },
    {
      id: "Bénéfice",
      label: "Bénéfice",
      value: benefice,
      color: benefice >= 0 ? "#43A047" : "#d32f2f", // vert ou rouge
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
      <Grid container spacing={0} alignItems="stretch">
        {/* Section Gauche : Textes */}
        <Grid item xs={12} md={7}>
          <Box
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              pl: 2,
              pr: 2,
            }}
          >
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography color="text.secondary">Montant marché</Typography>
                <Typography variant="h6">
                  {montant_ht.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  €
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography color="text.secondary">Taux fixe</Typography>
                <Typography variant="h6">
                  {taux_fixe.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  %
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography color="text.secondary">
                  Montant taux fixe
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ color: "#1976d2", fontWeight: 700 }}
                >
                  {montant_taux_fixe.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  €
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography color="text.secondary">Paiements reçus</Typography>
                <Typography
                  variant="h6"
                  style={{ color: "#43A047", fontWeight: 700 }}
                >
                  {total_paiements_recus.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  €
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography color="text.secondary">Coût chantier</Typography>
                <Typography
                  variant="h6"
                  style={{ color: "#d32f2f", fontWeight: 700 }}
                >
                  -{" "}
                  {cout_chantier.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  €
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography color="text.secondary">Bénéfice</Typography>
                <Typography
                  variant="h6"
                  style={{
                    color: benefice >= 0 ? "#43A047" : "#d32f2f",
                    fontWeight: 700,
                  }}
                >
                  {benefice.toLocaleString("fr-FR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  €
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Grid>
        {/* Ligne de séparation verticale */}
        <Grid
          item
          md={1}
          sx={{
            display: { xs: "none", md: "flex" },
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <Box
            sx={{ width: "2px", height: "90%", bgcolor: "#BDBDBD", mx: "auto" }}
          />
        </Grid>
        {/* Section Droite : PieChart */}
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
                sx={{
                  fontSize: getFontSize(benefice),
                  color: benefice >= 0 ? "#43A047" : "#d32f2f",
                }}
              >
                {Number(benefice).toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                })}
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{
                  fontSize: getFontSize(benefice) * 0.7,
                  ml: 0.5,
                  color: benefice >= 0 ? "#43A047" : "#d32f2f",
                }}
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
