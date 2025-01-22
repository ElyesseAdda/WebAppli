import {
  Box,
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
import React, { useEffect, useState } from "react";

const EditLigneSpecialeModal = ({ open, onClose, ligne, onSave }) => {
  const [formData, setFormData] = useState({
    description: "",
    value: "",
    value_type: "fixed",
    type: "reduction",
    is_highlighted: false,
    niveau: "global",
  });

  useEffect(() => {
    if (ligne) {
      setFormData({
        description: ligne.description || "",
        value: ligne.value || "",
        value_type: ligne.value_type || "fixed",
        type: ligne.type || "reduction",
        is_highlighted: ligne.is_highlighted || false,
        niveau: ligne.niveau || "global",
        partie: ligne.partie,
        sous_partie: ligne.sous_partie,
      });
    }
  }, [ligne]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = () => {
    onSave({ ...ligne, ...formData });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Modifier la ligne spéciale</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            label="Description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            fullWidth
          />
          <TextField
            label="Valeur"
            name="value"
            type="number"
            value={formData.value}
            onChange={handleChange}
            fullWidth
          />
          <FormControl fullWidth>
            <InputLabel>Type de valeur</InputLabel>
            <Select
              name="value_type"
              value={formData.value_type}
              onChange={handleChange}
              label="Type de valeur"
            >
              <MenuItem value="fixed">Montant fixe (€)</MenuItem>
              <MenuItem value="percentage">Pourcentage (%)</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Type</InputLabel>
            <Select
              name="type"
              value={formData.type}
              onChange={handleChange}
              label="Type"
            >
              <MenuItem value="reduction">Réduction</MenuItem>
              <MenuItem value="addition">Addition</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditLigneSpecialeModal;
