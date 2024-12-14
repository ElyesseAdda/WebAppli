import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import React from "react";

const ClientInfoModal = ({ open, onClose, clientData, onSubmit, onChange }) => {
  const handleSubmit = () => {
    // Valider que tous les champs requis sont remplis
    if (
      !clientData.name ||
      !clientData.surname ||
      !clientData.client_mail ||
      !clientData.phone_Number
    ) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    onSubmit();
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
          value={clientData.name}
          onChange={(e) => onChange(e, "client")}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          name="surname"
          label="Prénom"
          value={clientData.surname}
          onChange={(e) => onChange(e, "client")}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          name="client_mail"
          label="Email"
          type="email"
          value={clientData.client_mail}
          onChange={(e) => onChange(e, "client")}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          name="phone_Number"
          label="Téléphone"
          type="tel"
          value={clientData.phone_Number}
          onChange={(e) => onChange(e, "client")}
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
