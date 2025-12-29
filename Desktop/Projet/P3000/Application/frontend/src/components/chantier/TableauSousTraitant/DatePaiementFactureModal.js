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

const DatePaiementFactureModal = ({ open, onClose, onSave, datePaiement }) => {
  const [localDatePaiement, setLocalDatePaiement] = React.useState("");

  useEffect(() => {
    if (open) {
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
  }, [open, datePaiement]);

  const handleSave = () => {
    if (localDatePaiement) {
      onSave(localDatePaiement);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Date de paiement de la facture</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
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
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave} variant="contained" disabled={!localDatePaiement}>
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DatePaiementFactureModal;

