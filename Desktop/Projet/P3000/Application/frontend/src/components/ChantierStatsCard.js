import { Box, Card, Grid, Typography } from "@mui/material";
import React from "react";

const ChantierStatsCard = ({ data }) => {
  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(montant || 0);
  };

  return (
    <Card sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Statistiques Globales
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              Chantiers en cours
            </Typography>
            <Typography variant="h6">
              {data?.total_chantiers_en_cours || 0}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              Montant Total HT
            </Typography>
            <Typography variant="h6">
              {formatMontant(data?.total_ht)}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              Marge Fourniture
            </Typography>
            <Typography variant="h6">
              {formatMontant(data?.total_marge_fourniture)}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              Coût Matériel
            </Typography>
            <Typography variant="h6">
              {formatMontant(data?.total_cout_materiel)}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              Coût Main d'œuvre
            </Typography>
            <Typography variant="h6">
              {formatMontant(data?.total_cout_main_oeuvre)}
            </Typography>
          </Box>
        </Grid>

        <Grid item xs={12} md={4}>
          <Box>
            <Typography variant="subtitle2" color="textSecondary">
              Coût Sous-traitance
            </Typography>
            <Typography variant="h6">
              {formatMontant(data?.total_cout_sous_traitance || 0)}
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Card>
  );
};

export default ChantierStatsCard;
