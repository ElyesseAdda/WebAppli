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
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Date d'envoi</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Date d'envoi"
              type="date"
              value={localDateEnvoi}
              onChange={(e) => setLocalDateEnvoi(e.target.value)}
              onKeyDown={handleKeyDown}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
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

export default DateEnvoiModal;

