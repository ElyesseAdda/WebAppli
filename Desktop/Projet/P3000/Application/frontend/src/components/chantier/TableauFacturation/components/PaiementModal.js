import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import React, { useEffect, useState } from "react";

const PaiementModal = ({ open, onClose, situation, onSubmit }) => {
  const [montantRecu, setMontantRecu] = useState("");
  const [datePaiementReel, setDatePaiementReel] = useState("");

  useEffect(() => {
    if (situation) {
      setMontantRecu(situation.montant_reel_ht || "");
      setDatePaiementReel(situation.date_paiement_reel || "");
    }
  }, [situation]);

  const handleSubmit = () => {
    onSubmit(situation.id, {
      montantRecu,
      datePaiementReel,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Montant reçu et date de paiement</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <TextField
            type="number"
            label="Montant reçu HT"
            value={montantRecu}
            onChange={(e) => setMontantRecu(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            type="date"
            label="Date de paiement réelle"
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

