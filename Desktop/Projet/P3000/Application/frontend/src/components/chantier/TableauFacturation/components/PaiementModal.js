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

  const isFacture = situation && (situation.price_ht !== undefined || situation.isFacture);

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const day = String(today.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (situation) {
      if (isFacture) {
        setDatePaiementReel(situation.date_paiement || getTodayDate());
        setMontantRecu("");
      } else {
        setMontantRecu(
          situation.montant_reel_ht ||
          (situation.montant_apres_retenues ? String(situation.montant_apres_retenues) : "")
        );
        setDatePaiementReel(situation.date_paiement_reel || getTodayDate());
      }
    }
  }, [situation, isFacture]);

  const handleSave = () => {
    onSubmit(situation.id, {
      montantRecu: isFacture ? null : montantRecu,
      datePaiementReel,
      isFacture,
    });
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSave();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        {isFacture ? "Date de paiement" : "Montant reçu et date de paiement"}
      </DialogTitle>
      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
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
                inputProps={{ min: 0, step: 0.01 }}
              />
            )}
            <TextField
              type="date"
              label={isFacture ? "Date de paiement" : "Date de paiement réelle"}
              value={datePaiementReel}
              onChange={(e) => setDatePaiementReel(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button type="button" onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained">
            Valider
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default PaiementModal;
