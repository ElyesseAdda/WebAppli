import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import React, { useState } from "react";

const ClientInfoModal = ({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    civilite: "",
    name: "",
    surname: "",
    client_mail: "",
    phone_Number: "",
  });

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = () => {
    // Validation du numéro de téléphone
    if (isNaN(parseInt(formData.phone_Number))) {
      alert("Le numéro de téléphone doit être un nombre");
      return;
    }
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Informations Client</DialogTitle>
      <DialogContent>
        <FormControl fullWidth margin="normal">
          <InputLabel>Civilité</InputLabel>
          <Select
            name="civilite"
            value={formData.civilite}
            onChange={handleChange}
            label="Civilité"
          >
            <MenuItem value="">Aucune</MenuItem>
            <MenuItem value="M.">Monsieur</MenuItem>
            <MenuItem value="Mme">Madame</MenuItem>
            <MenuItem value="Mlle">Mademoiselle</MenuItem>
          </Select>
        </FormControl>
        <TextField
          fullWidth
          margin="normal"
          name="name"
          label="Nom"
          value={formData.name}
          onChange={handleChange}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          name="surname"
          label="Prénom"
          value={formData.surname}
          onChange={handleChange}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          name="client_mail"
          label="Email"
          type="email"
          value={formData.client_mail}
          onChange={handleChange}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          name="phone_Number"
          label="Téléphone"
          type="tel"
          value={formData.phone_Number}
          onChange={(e) => {
            // Ne garde que les chiffres
            const numericValue = e.target.value.replace(/\D/g, "");
            // Crée un événement synthétique avec la nouvelle valeur
            const syntheticEvent = {
              target: {
                name: e.target.name,
                value: numericValue,
              },
            };
            handleChange(syntheticEvent);
          }}
          onKeyDown={(e) => {
            // Empêche la saisie de caractères non numériques
            if (
              !/[0-9]/.test(e.key) &&
              e.key !== "Backspace" &&
              e.key !== "Delete" &&
              e.key !== "ArrowLeft" &&
              e.key !== "ArrowRight"
            ) {
              e.preventDefault();
            }
          }}
          inputProps={{
            inputMode: "numeric",
            pattern: "[0-9]*",
          }}
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Suivant
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientInfoModal;
