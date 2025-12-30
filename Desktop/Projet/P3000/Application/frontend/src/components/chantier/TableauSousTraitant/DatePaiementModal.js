import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import React, { useEffect } from "react";

const DatePaiementModal = ({ open, onClose, onSave, datePaiement, montantPaye, isMontantAPayer = false }) => {
  const [localDatePaiement, setLocalDatePaiement] = React.useState("");
  const [localMontantPaye, setLocalMontantPaye] = React.useState("");

  useEffect(() => {
    if (open) {
      // Préremplir le montant
      setLocalMontantPaye(montantPaye || "");
      
      if (!isMontantAPayer) {
        // Mode "Montant payé" : Préremplir avec la date du jour si aucune date n'est fournie
        if (datePaiement) {
          // Convertir la date ISO en format YYYY-MM-DD pour l'input
          const date = new Date(datePaiement);
          const formattedDate = date.toISOString().split('T')[0];
          setLocalDatePaiement(formattedDate);
        } else {
          // Date du jour par défaut
          const today = new Date();
          const formattedDate = today.toISOString().split('T')[0];
          setLocalDatePaiement(formattedDate);
        }
      }
    }
  }, [open, datePaiement, montantPaye, isMontantAPayer]);

  const handleSave = () => {
    const montant = parseFloat(localMontantPaye) || 0;
    if (isMontantAPayer) {
      // Mode "Montant à payer" : ne retourner que le montant
      onSave(montant);
    } else {
      // Mode "Montant payé" : retourner montant et date
      onSave(montant, localDatePaiement);
    }
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isMontantAPayer ? "Modifier le montant à payer" : "Montant payé et date de paiement"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label={isMontantAPayer ? "Montant à payer" : "Montant payé"}
            type="number"
            value={localMontantPaye}
            onChange={(e) => setLocalMontantPaye(e.target.value)}
            fullWidth
            required
            inputProps={{
              min: 0,
              step: 0.01,
            }}
          />
          {!isMontantAPayer && (
            <TextField
              label="Date de paiement"
              type="date"
              value={localDatePaiement}
              onChange={(e) => setLocalDatePaiement(e.target.value)}
              fullWidth
              required
              InputLabelProps={{
                shrink: true,
              }}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button 
          onClick={handleSave} 
          variant="contained" 
          disabled={isMontantAPayer ? false : !localDatePaiement}
        >
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DatePaiementModal;

