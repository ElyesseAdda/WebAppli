import { Box, Typography } from "@mui/material";
import React from "react";
import ChantierListeBonCommande from "./ChantierListeBonCommande";

const ChantierCommandesTab = ({ chantierData }) => {
  if (!chantierData?.id) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <Typography color="error">Aucun chantier sélectionné.</Typography>
      </Box>
    );
  }
  return <ChantierListeBonCommande chantierId={chantierData.id} />;
};

export default ChantierCommandesTab;
