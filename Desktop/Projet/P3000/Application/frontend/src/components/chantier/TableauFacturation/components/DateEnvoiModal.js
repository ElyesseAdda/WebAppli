import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import React, { useEffect, useState } from "react";

const DateEnvoiModal = ({ open, onClose, situation, onSubmit }) => {
  const [dateEnvoi, setDateEnvoi] = useState("");
  const [delaiPaiement, setDelaiPaiement] = useState(45);

  useEffect(() => {
    if (situation) {
      setDateEnvoi(situation.date_envoi || "");
      setDelaiPaiement(situation.delai_paiement || 45);
    }
  }, [situation]);

  const handleSubmit = () => {
    onSubmit(situation.id, {
      dateEnvoi,
      delaiPaiement,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Date d'envoi et délai de paiement</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <TextField
            type="date"
            label="Date d'envoi"
            value={dateEnvoi}
            onChange={(e) => setDateEnvoi(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Select
            value={delaiPaiement}
            onChange={(e) => setDelaiPaiement(e.target.value)}
            fullWidth
            label="Délai de paiement"
          >
            <MenuItem value={45}>45 jours</MenuItem>
            <MenuItem value={60}>60 jours</MenuItem>
          </Select>
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

export default DateEnvoiModal;

