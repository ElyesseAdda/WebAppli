import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";

const PaiementModal = ({ open, onClose, situation, onSubmit }) => {
  const [montantRecu, setMontantRecu] = useState("");
  const [datePaiementReel, setDatePaiementReel] = useState("");

  // Détecter si c'est une facture (a price_ht ou isFacture) ou une situation
  const isFacture = situation && (situation.price_ht !== undefined || situation.isFacture);

  // Fonction pour obtenir la date du jour au format YYYY-MM-DD
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (situation) {
      if (isFacture) {
        // Pour les factures, utiliser date_paiement
        // Préremplir avec la date du jour si pas déjà définie
        setDatePaiementReel(situation.date_paiement || getTodayDate());
        setMontantRecu(""); // Pas de montant pour les factures
      } else {
        // Pour les situations, utiliser montant_reel_ht et date_paiement_reel
        // Préremplir le montant avec montant_apres_retenues si pas déjà défini
        setMontantRecu(
          situation.montant_reel_ht || 
          (situation.montant_apres_retenues ? String(situation.montant_apres_retenues) : "")
        );
        // Préremplir avec la date du jour si pas déjà définie
        setDatePaiementReel(situation.date_paiement_reel || getTodayDate());
      }
    }
  }, [situation, isFacture]);

  const handleSubmit = () => {
    onSubmit(situation.id, {
      montantRecu: isFacture ? null : montantRecu, // Pas de montant pour les factures
      datePaiementReel,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {isFacture ? "Date de paiement" : "Montant reçu et date de paiement"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          {isFacture && situation.price_ht && (
            <Box sx={{ mb: 2, p: 1.5, backgroundColor: "#f5f5f5", borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Montant HT à payer
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                {parseFloat(situation.price_ht).toFixed(2)} €
              </Typography>
            </Box>
          )}
          {!isFacture && (
            <TextField
              type="number"
              label="Montant reçu HT"
              value={montantRecu}
              onChange={(e) => setMontantRecu(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
            />
          )}
          <TextField
            type="date"
            label={isFacture ? "Date de paiement" : "Date de paiement réelle"}
            value={datePaiementReel}
            onChange={(e) => setDatePaiementReel(e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained">
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PaiementModal;

