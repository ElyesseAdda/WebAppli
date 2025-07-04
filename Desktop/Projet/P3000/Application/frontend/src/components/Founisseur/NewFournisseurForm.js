import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import axios from "axios";
import React, { useState } from "react";

function NewFournisseurForm({ open, handleClose, onAddFournisseur }) {
  const [form, setForm] = useState({
    name: "",
    Fournisseur_mail: "",
    phone_Number: "",
    description_fournisseur: "",
    magasin: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    try {
      // Préparation des données pour le backend
      const dataToSend = {
        ...form,
        phone_Number: form.phone_Number
          ? parseInt(form.phone_Number, 10)
          : null,
      };
      if (!dataToSend.phone_Number) delete dataToSend.phone_Number; // Optionnel : ne pas envoyer si vide

      console.log(
        "Données envoyées au backend pour création fournisseur:",
        dataToSend
      );
      const response = await axios.post("/api/fournisseurs/", dataToSend);
      console.log("Réponse du backend:", response);
      onAddFournisseur();
      handleClose();
    } catch (error) {
      console.error("Erreur lors de la création du fournisseur:", error);
      if (error.response) {
        console.error("Réponse du backend:", error.response);
      }
      alert("Erreur lors de la création du fournisseur");
    }
  };

  return (
    <Dialog open={open} onClose={handleClose}>
      <DialogTitle>Nouveau Fournisseur</DialogTitle>
      <DialogContent>
        <TextField
          label="Société*"
          name="name"
          value={form.name}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Email"
          name="Fournisseur_mail"
          value={form.Fournisseur_mail}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Téléphone (optionnel)"
          name="phone_Number"
          value={form.phone_Number}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Description"
          name="description_fournisseur"
          value={form.description_fournisseur}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Magasin (optionnel)"
          name="magasin"
          value={form.magasin}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained">
          Créer
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default NewFournisseurForm;
