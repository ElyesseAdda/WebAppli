import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
} from "@mui/material";
import React, { useEffect, useState } from "react";

const SousTraitantForm = ({ open, onClose, sousTraitant, onSave }) => {
  const [formData, setFormData] = useState({
    entreprise: "",
    capital: "",
    adresse: "",
    code_postal: "",
    ville: "",
    numero_rcs: "",
    representant: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (sousTraitant) {
      setFormData({
        ...sousTraitant,
        capital: sousTraitant.capital.toString(),
      });
    } else {
      setFormData({
        entreprise: "",
        capital: "",
        adresse: "",
        code_postal: "",
        ville: "",
        numero_rcs: "",
        representant: "",
      });
    }
    setErrors({});
  }, [sousTraitant]);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.entreprise) newErrors.entreprise = "L'entreprise est requise";
    if (!formData.capital) newErrors.capital = "Le capital est requis";
    if (!formData.adresse) newErrors.adresse = "L'adresse est requise";
    if (!formData.code_postal)
      newErrors.code_postal = "Le code postal est requis";
    if (!formData.ville) newErrors.ville = "La ville est requise";
    if (!formData.numero_rcs) newErrors.numero_rcs = "Le numéro RCS est requis";
    if (!formData.representant)
      newErrors.representant = "Le représentant est requis";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Effacer l'erreur du champ modifié
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const url = sousTraitant
        ? `/api/sous-traitants/${sousTraitant.id}/`
        : "/api/sous-traitants/";
      const method = sousTraitant ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          capital: parseFloat(formData.capital) || 0,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onSave(data);
        onClose();
      } else {
        const errorData = await response.json();
        setErrors(errorData);
        console.error(
          "Erreur lors de la sauvegarde du sous-traitant:",
          errorData
        );
      }
    } catch (error) {
      console.error("Erreur:", error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {sousTraitant ? "Modifier le sous-traitant" : "Nouveau sous-traitant"}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Entreprise"
              name="entreprise"
              value={formData.entreprise}
              onChange={handleChange}
              error={!!errors.entreprise}
              helperText={errors.entreprise}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Capital"
              name="capital"
              type="number"
              value={formData.capital}
              onChange={handleChange}
              error={!!errors.capital}
              helperText={errors.capital}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Adresse"
              name="adresse"
              value={formData.adresse}
              onChange={handleChange}
              error={!!errors.adresse}
              helperText={errors.adresse}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Code postal"
              name="code_postal"
              value={formData.code_postal}
              onChange={handleChange}
              error={!!errors.code_postal}
              helperText={errors.code_postal}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Ville"
              name="ville"
              value={formData.ville}
              onChange={handleChange}
              error={!!errors.ville}
              helperText={errors.ville}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Numéro RCS"
              name="numero_rcs"
              value={formData.numero_rcs}
              onChange={handleChange}
              error={!!errors.numero_rcs}
              helperText={errors.numero_rcs}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Représentant"
              name="representant"
              value={formData.representant}
              onChange={handleChange}
              error={!!errors.representant}
              helperText={errors.representant}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          {sousTraitant ? "Modifier" : "Créer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SousTraitantForm;
