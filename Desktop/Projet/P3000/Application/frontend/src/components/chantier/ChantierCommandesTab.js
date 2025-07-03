import { Box, Typography } from "@mui/material";
import axios from "axios";
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
  const [bonsCommande, setBonsCommande] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!chantierData?.id) return;
    if (!hasLoaded.current) {
      // fetchData(); // Décommente et adapte si tu as une fonction de chargement
      hasLoaded.current = true;
    }
  }, [chantierData?.id]);

  useEffect(() => {
    if (!isLoaded && chantierData?.id) {
      axios.get("/api/bons-commande/").then((response) => {
        setBonsCommande(
          response.data.filter((bc) => bc.chantier === chantierData.id)
        );
        setIsLoaded(true);
      });
    }
  }, [chantierData?.id, isLoaded]);

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
      bonsCommande={bonsCommande}
      setBonsCommande={setBonsCommande}
      initialFilters={savedFilters}
      onSaveFilters={setSavedFilters}
    />
  );
};

export default ChantierCommandesTab;
