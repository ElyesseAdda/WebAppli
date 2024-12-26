import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import React, { useState } from "react";

const SocieteInfoModal = ({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    nom_societe: "",
    ville_societe: "",
    rue_societe: "",
    codepostal_societe: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = () => {
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Informations Société</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          margin="normal"
          name="nom_societe"
          label="Nom de la société"
          value={formData.nom_societe}
          onChange={handleChange}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          name="ville_societe"
          label="Ville"
          value={formData.ville_societe}
          onChange={handleChange}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          name="rue_societe"
          label="Rue"
          value={formData.rue_societe}
          onChange={handleChange}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          name="codepostal_societe"
          label="Code postal"
          value={formData.codepostal_societe}
          onChange={handleChange}
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Retour</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SocieteInfoModal;
