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

const DateEnvoiModal = ({ open, onClose, onSave, dateEnvoi }) => {
  const [localDateEnvoi, setLocalDateEnvoi] = React.useState("");

  useEffect(() => {
    if (open) {
      // Préremplir avec la date existante ou la date du jour
      if (dateEnvoi) {
        const date = new Date(dateEnvoi);
        const formattedDate = date.toISOString().split('T')[0];
        setLocalDateEnvoi(formattedDate);
      } else {
        // Date du jour par défaut
        const today = new Date();
        const formattedDate = today.toISOString().split('T')[0];
        setLocalDateEnvoi(formattedDate);
      }
    }
  }, [open, dateEnvoi]);

  const handleSave = () => {
    onSave(localDateEnvoi || null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Date d'envoi</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Date d'envoi"
            type="date"
            value={localDateEnvoi}
            onChange={(e) => setLocalDateEnvoi(e.target.value)}
            fullWidth
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave} variant="contained">
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DateEnvoiModal;

