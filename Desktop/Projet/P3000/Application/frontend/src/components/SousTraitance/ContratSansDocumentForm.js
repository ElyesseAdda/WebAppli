import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  TextField,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import frLocale from "date-fns/locale/fr";
import React, { useEffect, useState } from "react";

const ContratSansDocumentForm = ({ open, onClose, sousTraitant, chantier, onSave }) => {
  const [formData, setFormData] = useState({
    description_prestation: "",
    date_debut: new Date(),
    duree: "Jusqu'à livraison du chantier",
    adresse_prestation: "",
    nom_operation: "",
    montant_operation: "",
    nom_maitre_ouvrage: "",
    nom_maitre_oeuvre: "",
  });

  useEffect(() => {
    if (chantier) {
      // Construction de l'adresse complète du chantier
      const adresseComplete = [
        chantier.rue || "",
        chantier.code_postal || "",
        chantier.ville || "",
      ]
        .filter((part) => part.trim() !== "")
        .join(", ");

      setFormData((prev) => ({
        ...prev,
        adresse_prestation: adresseComplete,
        nom_operation: chantier.chantier_name || "",
      }));
    }
  }, [chantier]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({
      ...prev,
      date_debut: date,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Vérification des données requises
    if (!sousTraitant?.id) {
      alert("Erreur: Sous-traitant non sélectionné");
      return;
    }

    if (!chantier?.id) {
      alert("Erreur: Chantier non sélectionné");
      return;
    }

    // Validation des champs obligatoires
    if (!formData.description_prestation || !formData.description_prestation.trim()) {
      alert("Erreur: La description de la prestation est requise");
      return;
    }

    if (!formData.date_debut) {
      alert("Erreur: La date de début est requise");
      return;
    }

    if (!formData.duree || !formData.duree.trim()) {
      alert("Erreur: La durée est requise");
      return;
    }

    if (!formData.adresse_prestation || !formData.adresse_prestation.trim()) {
      alert("Erreur: L'adresse de la prestation est requise");
      return;
    }

    if (!formData.nom_operation || !formData.nom_operation.trim()) {
      alert("Erreur: Le nom de l'opération est requis");
      return;
    }

    if (!formData.montant_operation) {
      alert("Erreur: Le montant de l'opération est requis");
      return;
    }

    if (!formData.nom_maitre_ouvrage || !formData.nom_maitre_ouvrage.trim()) {
      alert("Erreur: Le nom du maître d'ouvrage est requis");
      return;
    }

    if (!formData.nom_maitre_oeuvre || !formData.nom_maitre_oeuvre.trim()) {
      alert("Erreur: Le nom du maître d'œuvre est requis");
      return;
    }

    try {
      const contratData = {
        ...formData,
        sous_traitant: sousTraitant.id,
        chantier: chantier.id,
        sans_contrat: true, // Marquer comme association sans contrat documenté
        date_debut: formData.date_debut.toISOString().split("T")[0],
        montant_operation: parseFloat(formData.montant_operation).toFixed(2),
        description_prestation: formData.description_prestation.trim(),
        adresse_prestation: formData.adresse_prestation.trim(),
        nom_operation: formData.nom_operation.trim(),
        duree: formData.duree.trim(),
        nom_maitre_ouvrage: formData.nom_maitre_ouvrage.trim(),
        nom_maitre_oeuvre: formData.nom_maitre_oeuvre.trim(),
        type_contrat: "SANS_CONTRAT", // Catégorie spéciale pour les associations sans contrat documenté
      };

      console.log("Données envoyées (sans contrat):", contratData);

      const response = await fetch("/api/contrats-sous-traitance/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(contratData),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Réponse du serveur:", errorText);
        throw new Error(`Erreur ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();

      onSave(responseData);
      onClose();
    } catch (error) {
      console.error("Erreur complète:", error);
      alert(
        `Une erreur est survenue lors de la création de l'association: ${error.message}`
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Associer un sous-traitant (sans contrat documenté)</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <TextField
              name="description_prestation"
              label="Description de la prestation"
              multiline
              rows={4}
              value={formData.description_prestation}
              onChange={handleChange}
              fullWidth
              required
            />

            <TextField
              name="nom_maitre_ouvrage"
              label="Nom du maître d'ouvrage"
              value={formData.nom_maitre_ouvrage}
              onChange={handleChange}
              fullWidth
              required
            />

            <TextField
              name="nom_maitre_oeuvre"
              label="Nom du maître d'œuvre"
              value={formData.nom_maitre_oeuvre}
              onChange={handleChange}
              fullWidth
              required
            />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <LocalizationProvider
                  dateAdapter={AdapterDateFns}
                  adapterLocale={frLocale}
                >
                  <DatePicker
                    label="Date de début"
                    value={formData.date_debut}
                    onChange={handleDateChange}
                    renderInput={(params) => (
                      <TextField {...params} fullWidth required />
                    )}
                  />
                </LocalizationProvider>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Durée"
                  name="duree"
                  value={formData.duree}
                  onChange={handleChange}
                  required
                />
              </Grid>
            </Grid>

            <TextField
              fullWidth
              label="Adresse de la prestation"
              name="adresse_prestation"
              value={formData.adresse_prestation}
              onChange={handleChange}
              required
            />

            <TextField
              fullWidth
              label="Nom de l'opération"
              name="nom_operation"
              value={formData.nom_operation}
              onChange={handleChange}
              required
            />

            <TextField
              fullWidth
              label="Montant de l'opération"
              name="montant_operation"
              type="number"
              value={formData.montant_operation}
              onChange={handleChange}
              required
              InputProps={{
                endAdornment: <InputAdornment position="end">€</InputAdornment>,
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annuler</Button>
          <Button type="submit" variant="contained" color="primary">
            Associer
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ContratSansDocumentForm;

