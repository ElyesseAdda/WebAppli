import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import axios from "axios";
import React, { useState } from "react";

const UpdateTauxFixeModal = ({ open, handleClose, onTauxFixeUpdated }) => {
  const [nouveauTaux, setNouveauTaux] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    try {
      // Validation basique
      const tauxNumber = parseFloat(nouveauTaux);
      if (isNaN(tauxNumber) || tauxNumber <= 0) {
        setError("Veuillez entrer un taux valide (nombre positif)");
        return;
      }

      // Appel API
      await axios.post("/api/update-taux-fixe/", {
        taux_fixe: tauxNumber,
      });

      setSuccess(true);
      setError("");

      // Callback pour informer le parent
      if (onTauxFixeUpdated) {
        onTauxFixeUpdated(tauxNumber);
      }

      // Fermer après 1.5 secondes
      setTimeout(() => {
        handleClose();
        setNouveauTaux("");
        setSuccess(false);
      }, 1500);
    } catch (error) {
      setError(
        error.response?.data?.error ||
          "Erreur lors de la mise à jour du taux fixe"
      );
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Mise à jour du taux fixe</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            Taux fixe mis à jour avec succès !
          </Alert>
        )}
        <TextField
          autoFocus
          margin="dense"
          label="Nouveau taux fixe (%)"
          type="number"
          fullWidth
          value={nouveauTaux}
          onChange={(e) => setNouveauTaux(e.target.value)}
          inputProps={{ step: "0.01" }}
          sx={{ mt: 2 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Mettre à jour
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default UpdateTauxFixeModal;
