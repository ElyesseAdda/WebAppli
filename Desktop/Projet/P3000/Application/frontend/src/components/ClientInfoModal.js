import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import React, { useState } from "react";

const ClientInfoModal = ({ open, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
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
          onChange={handleChange}
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
