import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import frLocale from "date-fns/locale/fr";
import React, { useEffect, useState } from "react";
import { generatePDFDrive } from "../../utils/universalDriveGenerator";

const ContratForm = ({ open, onClose, sousTraitant, chantier, onSave }) => {
  const [formData, setFormData] = useState({
    description_prestation: "",
    date_debut: new Date(),
    date_creation: new Date(),
    duree: "Jusqu'à livraison du chantier",
    adresse_prestation: "",
    nom_operation: "",
    montant_operation: "",
    type_contrat: "",
    nom_maitre_ouvrage: "",
    nom_maitre_oeuvre: "",
  });
  const [typeContratError, setTypeContratError] = useState(false);

  // Réinitialiser l'erreur quand le modal s'ouvre
  useEffect(() => {
    if (open) {
      setTypeContratError(false);
    }
  }, [open]);

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
        // Préremplir le nom du maître d'ouvrage si disponible
        nom_maitre_ouvrage: chantier.maitre_ouvrage_nom_societe || prev.nom_maitre_ouvrage || "",
        // Préremplir le nom du maître d'œuvre si disponible
        nom_maitre_oeuvre: chantier.maitre_oeuvre_nom_societe || prev.nom_maitre_oeuvre || "",
      }));
    }
  }, [chantier]);

  // Effet pour préremplir le type de contrat selon le type du sous-traitant
  useEffect(() => {
    if (sousTraitant?.type) {
      // Mapper le type du sous-traitant vers le type de contrat
      // Les types possibles sont : NETTOYAGE, BTP, TCE, AUTRE
      // Le formulaire n'accepte que BTP et NETTOYAGE
      // Pour TCE et AUTRE, on laisse vide pour que l'utilisateur choisisse
      
      if (sousTraitant.type === "BTP") {
        setFormData((prev) => ({
          ...prev,
          type_contrat: "BTP",
        }));
        setTypeContratError(false);
      } else if (sousTraitant.type === "NETTOYAGE") {
        setFormData((prev) => ({
          ...prev,
          type_contrat: "NETTOYAGE",
        }));
        setTypeContratError(false);
      } else {
        // Pour TCE ou AUTRE, on laisse vide et on marque visuellement en rouge
        setFormData((prev) => ({
          ...prev,
          type_contrat: "",
        }));
        setTypeContratError(true); // Marquer visuellement en rouge dès l'ouverture
      }
    }
  }, [sousTraitant]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Réinitialiser l'erreur visuelle quand l'utilisateur sélectionne un type
    if (name === "type_contrat" && value) {
      setTypeContratError(false);
    }
  };

  const handleDateChange = (date) => {
    setFormData((prev) => ({
      ...prev,
      date_debut: date,
    }));
  };

  const handleDateCreationChange = (date) => {
    setFormData((prev) => ({
      ...prev,
      date_creation: date,
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

    if (!formData.type_contrat) {
      setTypeContratError(true);
      alert("Erreur: Le type de contrat est requis");
      return;
    }

    if (!formData.montant_operation) {
      alert("Erreur: Le montant de l'opération est requis");
      return;
    }

    if (!formData.nom_maitre_ouvrage) {
      alert("Erreur: Le nom du maître d'ouvrage est requis");
      return;
    }

    if (!formData.nom_maitre_oeuvre) {
      alert("Erreur: Le nom du maître d'œuvre est requis");
      return;
    }

    try {
      const contratData = {
        ...formData,
        sous_traitant: sousTraitant.id,
        chantier: chantier.id,
        date_debut: formData.date_debut.toISOString().split("T")[0],
        date_creation: formData.date_creation.toISOString().split("T")[0],
        montant_operation: parseFloat(formData.montant_operation).toFixed(2),
        description_prestation: formData.description_prestation.trim(),
        adresse_prestation: formData.adresse_prestation.trim(),
        nom_operation: formData.nom_operation.trim(),
        duree: formData.duree.trim(),
        nom_maitre_ouvrage: formData.nom_maitre_ouvrage.trim(),
        nom_maitre_oeuvre: formData.nom_maitre_oeuvre.trim(),
      };

      console.log("Données envoyées:", contratData);

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

      // Téléchargement automatique vers le Drive après création du contrat
      try {
        console.log(
          "🚀 Lancement du téléchargement automatique du contrat vers le Drive..."
        );

        const driveData = {
          contratId: responseData.id,
          chantierId: chantier.id,
          chantierName: chantier.chantier_name || chantier.nom,
          societeName:
            chantier.societe?.nom_societe || chantier.societe?.nom || "Société",
          sousTraitantName: sousTraitant.entreprise,
        };

        await generatePDFDrive("contrat_sous_traitance", driveData);
        console.log("✅ Contrat téléchargé avec succès vers le Drive");
      } catch (driveError) {
        console.error(
          "❌ Erreur lors du téléchargement vers le Drive:",
          driveError
        );
        // Ne pas bloquer la création du contrat si le Drive échoue
      }

      onSave(responseData);
      onClose();
    } catch (error) {
      console.error("Erreur complète:", error);
      alert(
        `Une erreur est survenue lors de la création du contrat: ${error.message}`
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Nouveau contrat de sous-traitance</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
            <FormControl fullWidth error={typeContratError} required>
              <InputLabel>Type de contrat</InputLabel>
              <Select
                value={formData.type_contrat}
                onChange={handleChange}
                name="type_contrat"
                label="Type de contrat"
                error={typeContratError}
                sx={{
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: typeContratError ? "error.main" : undefined,
                  },
                }}
              >
                <MenuItem value="">
                  <em>Sélectionner un type</em>
                </MenuItem>
                <MenuItem value="BTP">BTP</MenuItem>
                <MenuItem value="NETTOYAGE">Nettoyage</MenuItem>
              </Select>
              {typeContratError && (
                <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                  Veuillez sélectionner un type de contrat
                </Typography>
              )}
            </FormControl>

            <TextField
              name="description_prestation"
              label="Description de la prestation"
              multiline
              rows={4}
              value={formData.description_prestation}
              onChange={handleChange}
              fullWidth
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
              <LocalizationProvider
                dateAdapter={AdapterDateFns}
                adapterLocale={frLocale}
              >
                <DatePicker
                  label="Date de création du contrat"
                  value={formData.date_creation}
                  onChange={handleDateCreationChange}
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
            Créer
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ContratForm;
