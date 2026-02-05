import { Box, Card, CardContent, Typography } from "@mui/material";
import React from "react";
import { COLORS as APP_COLORS, withOpacity } from "../constants/colors";

const ChantierEnCoursCard = ({ chantierEnCours, montantTotal }) => {
  const data = [
    { name: "En cours", value: chantierEnCours || 0 },
    { name: "Autres", value: Math.max(10 - (chantierEnCours || 0), 0) },
  ];

  const COLORS = [APP_COLORS.primary, APP_COLORS.border];

  // Fonction pour formater le montant en euros
  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(montant);
  };

  return (
    <Card
      sx={{
        minHeight: 150,
        boxShadow: `0 4px 6px ${withOpacity(APP_COLORS.black, 0.1)}`,
        borderRadius: "10px",
        width: 450,
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Typography
            variant="h6"
            color="textSecondary"
            gutterBottom
            sx={{ fontSize: 16, fontWeight: "bold" }}
          >
            Chantiers en cours
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            variant="h3"
            component="div"
            color="primary"
            sx={{ fontWeight: "bold", marginLeft: "20px" }}
          >
            {chantierEnCours || 0}
          </Typography>

          <Box sx={{ textAlign: "right", marginRight: "20px" }}>
            <Typography
              variant="subtitle2"
              color="textSecondary"
              sx={{ fontSize: 10, fontWeight: "bold" }}
            >
              Chiffre d'affaires attendu
            </Typography>
            <Typography
              variant="h4"
              component="div"
              color="primary"
              sx={{ fontWeight: "bold" }}
            >
              {formatMontant(montantTotal || 0)}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ChantierEnCoursCard;
