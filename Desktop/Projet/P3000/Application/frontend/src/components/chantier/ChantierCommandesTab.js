import { Box, Typography } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import ChantierListeBonCommande from "./ChantierListeBonCommande";

const ChantierCommandesTab = ({ chantierData }) => {
  const [savedFilters, setSavedFilters] = useState({
    numero: "",
    fournisseur: "",
    date_creation: "",
    montant_total: "",
    statut: "",
    statut_paiement: "",
    montant_paye: "",
    reste_a_payer: "",
  });
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!chantierData?.id) return;
    if (!hasLoaded.current) {
      // fetchData(); // Décommente et adapte si tu as une fonction de chargement
      hasLoaded.current = true;
    }
  }, [chantierData?.id]);

  if (!chantierData?.id) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <Typography color="error">Aucun chantier sélectionné.</Typography>
      </Box>
    );
  }
  return (
    <ChantierListeBonCommande
      chantierId={chantierData.id}
      initialFilters={savedFilters}
      onSaveFilters={setSavedFilters}
    />
  );
};

export default ChantierCommandesTab;
