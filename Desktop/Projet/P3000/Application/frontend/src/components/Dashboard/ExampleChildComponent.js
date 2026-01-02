import { Box, Paper, Typography } from "@mui/material";
import React from "react";
import { useDashboardFilters } from "./DashboardFiltersContext";

/**
 * Exemple de composant enfant qui utilise les filtres du Dashboard
 * 
 * Ce composant montre comment accéder aux filtres (année) depuis un composant enfant
 * en utilisant le hook useDashboardFilters.
 * 
 * Pour utiliser ce composant dans le Dashboard, importez-le et ajoutez-le dans DashboardContent :
 * 
 * import ExampleChildComponent from "./ExampleChildComponent";
 * 
 * // Dans DashboardContent :
 * <ExampleChildComponent />
 */
const ExampleChildComponent = () => {
  // Utiliser le hook pour accéder aux filtres
  const { selectedYear } = useDashboardFilters();

  return (
    <Paper elevation={1} sx={{ p: 3, mb: 2 }}>
      <Typography variant="h6" gutterBottom>
        Exemple de composant enfant
      </Typography>
      <Box>
        <Typography variant="body1" color="text.secondary">
          Ce composant utilise les filtres du Dashboard parent.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Année sélectionnée : <strong>{selectedYear}</strong>
        </Typography>
        <Typography variant="body2" sx={{ mt: 1, fontStyle: "italic" }}>
          Les données de ce composant seront automatiquement mises à jour
          lorsque l'année change dans le sélecteur du Dashboard.
        </Typography>
      </Box>
    </Paper>
  );
};

export default ExampleChildComponent;

