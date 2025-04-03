import { Box, Card, Grid, Typography } from "@mui/material";
import React from "react";

const ChantierDetailStats = ({ data, year, month }) => {
  const monthlyStats = data?.stats_mensuelles?.[year]?.[month];
  const globalStats = data?.stats_globales;

  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(montant || 0);
  };

  return (
    <Card sx={{ mt: 2, p: 2 }}>
      <Typography variant="h6" gutterBottom>
        {data?.info?.nom}
      </Typography>

      <Grid container spacing={3}>
        {/* Statistiques Globales */}
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
              Statistiques Globales
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography>
                Montant HT: {formatMontant(globalStats?.montant_ht)}
              </Typography>
              <Typography>
                Coût Matériel: {formatMontant(globalStats?.cout_materiel)}
              </Typography>
              <Typography>
                Coût Estimé Matériel:{" "}
                {formatMontant(globalStats?.cout_estime_materiel)}
              </Typography>
              <Typography>
                Marge Fourniture: {formatMontant(globalStats?.marge_fourniture)}
              </Typography>
              <Typography>
                Coût Sous-Traitance:{" "}
                {formatMontant(globalStats?.cout_sous_traitance)}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Statistiques Mensuelles */}
        <Grid item xs={12} md={6}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: "bold" }}>
              Statistiques Mensuelles ({month}/{year})
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <Typography>
                Coût Matériel: {formatMontant(monthlyStats?.cout_materiel)}
              </Typography>
              <Typography>
                Coût Main d'œuvre:{" "}
                {formatMontant(monthlyStats?.cout_main_oeuvre)}
              </Typography>
              <Typography>
                Marge Fourniture:{" "}
                {formatMontant(monthlyStats?.marge_fourniture)}
              </Typography>
              <Typography>
                Coût Sous-Traitance:{" "}
                {formatMontant(monthlyStats?.cout_sous_traitance)}
              </Typography>
            </Box>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
};

export default ChantierDetailStats;
