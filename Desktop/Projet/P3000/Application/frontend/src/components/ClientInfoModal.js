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
  Box,
  Divider,
  Typography,
} from "@mui/material";
import React, { useState, useEffect } from "react";
import { FiUser } from "react-icons/fi";

const ClientInfoModal = ({ open, onClose, onSubmit, onSelectExisting, initialData }) => {
  const [formData, setFormData] = useState({
    civilite: "",
    name: "",
    surname: "",
    client_mail: "",
    phone_Number: "",
    poste: "",
  });

  // Mettre à jour formData quand initialData change
  useEffect(() => {
    if (initialData) {
      setFormData({
        civilite: initialData.civilite || "",
        name: initialData.name || "",
        surname: initialData.surname || "",
        client_mail: initialData.client_mail || "",
        phone_Number: initialData.phone_Number ? String(initialData.phone_Number) : "",
        poste: initialData.poste || "",
      });
    }
  }, [initialData]);

  // Réinitialiser le formulaire quand le modal s'ouvre (si pas d'initialData)
  useEffect(() => {
    if (open && !initialData) {
      setFormData({
        civilite: "",
        name: "",
        surname: "",
        client_mail: "",
        phone_Number: "",
        poste: "",
      });
    }
  }, [open, initialData]);

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
        {onSelectExisting && (
          <Box sx={{ mb: 2, mt: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              startIcon={<FiUser />}
              fullWidth
              onClick={onSelectExisting}
            >
              Sélectionner un client existant
            </Button>
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                ou remplir manuellement
              </Typography>
            </Divider>
          </Box>
        )}
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
        <TextField
          fullWidth
          margin="normal"
          name="poste"
          label="Poste"
          value={formData.poste}
          onChange={handleChange}
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
