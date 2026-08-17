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

const parseDateValue = (value) => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const emptyForm = {
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
};

const ContratForm = ({
  open,
  onClose,
  sousTraitant,
  chantier,
  onSave,
  mode = "create",
  contrat = null,
}) => {
  const isEdit = mode === "edit" && contrat?.id;
  const [formData, setFormData] = useState(emptyForm);
  const [typeContratError, setTypeContratError] = useState(false);

  useEffect(() => {
    if (!open) return;

    setTypeContratError(false);

    if (isEdit) {
      setFormData({
        description_prestation: contrat.description_prestation || "",
        date_debut: parseDateValue(contrat.date_debut),
        date_creation: parseDateValue(contrat.date_creation),
        duree: contrat.duree || "Jusqu'à livraison du chantier",
        adresse_prestation: contrat.adresse_prestation || "",
        nom_operation: contrat.nom_operation || "",
        montant_operation:
          contrat.montant_operation != null
            ? String(contrat.montant_operation)
            : "",
        type_contrat: contrat.type_contrat || "",
        nom_maitre_ouvrage: contrat.nom_maitre_ouvrage || "",
        nom_maitre_oeuvre: contrat.nom_maitre_oeuvre || "",
      });
      setTypeContratError(!contrat.type_contrat);
      return;
    }

    // Création : valeurs par défaut chantier + type ST
    const adresseComplete = chantier
      ? [chantier.rue || "", chantier.code_postal || "", chantier.ville || ""]
          .filter((part) => part.trim() !== "")
          .join(", ")
      : "";

    let type_contrat = "";
    let typeError = false;
    if (sousTraitant?.type === "BTP") {
      type_contrat = "BTP";
    } else if (sousTraitant?.type === "NETTOYAGE") {
      type_contrat = "NETTOYAGE";
    } else if (sousTraitant?.type) {
      typeError = true;
    }

    setFormData({
      ...emptyForm,
      adresse_prestation: adresseComplete,
      nom_operation: chantier?.chantier_name || "",
      nom_maitre_ouvrage: chantier?.maitre_ouvrage_nom_societe || "",
      nom_maitre_oeuvre: chantier?.maitre_oeuvre_nom_societe || "",
      type_contrat,
    });
    setTypeContratError(typeError);
  }, [open, isEdit, contrat, chantier, sousTraitant]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
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

    if (!formData.montant_operation && formData.montant_operation !== 0) {
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
        type_contrat: formData.type_contrat,
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

      if (!isEdit) {
        contratData.sous_traitant = sousTraitant.id;
        contratData.chantier = chantier.id;
      }

      const url = isEdit
        ? `/api/contrats-sous-traitance/${contrat.id}/`
        : "/api/contrats-sous-traitance/";
      const method = isEdit ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
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

      // PDF Drive uniquement à la création
      if (!isEdit) {
        try {
          const driveData = {
            contratId: responseData.id,
            chantierId: chantier.id,
            chantierName: chantier.chantier_name || chantier.nom,
            societeName:
              chantier.societe?.nom_societe ||
              chantier.societe?.nom ||
              "Société",
            sousTraitantName: sousTraitant.entreprise,
          };

          await generatePDFDrive("contrat_sous_traitance", driveData);
        } catch (driveError) {
          console.error(
            "Erreur lors du téléchargement vers le Drive:",
            driveError
          );
        }
      }

      const previousMontant = isEdit
        ? parseFloat(contrat.montant_operation) || 0
        : null;
      const newMontant = parseFloat(responseData.montant_operation) || 0;
      const montantChanged =
        isEdit && Math.abs(previousMontant - newMontant) > 0.001;

      onSave(responseData, {
        isEdit,
        montantChanged,
        hasAvenants: Boolean(contrat?.avenants?.length),
      });
      onClose();
    } catch (error) {
      console.error("Erreur complète:", error);
      alert(
        `Une erreur est survenue lors de la ${
          isEdit ? "modification" : "création"
        } du contrat: ${error.message}`
      );
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEdit
            ? "Modifier le contrat de sous-traitance"
            : "Nouveau contrat de sous-traitance"}
        </DialogTitle>
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
                <MenuItem value="NETTOYAGE">Prestation de services</MenuItem>
              </Select>
              {typeContratError && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ mt: 0.5, ml: 1.75 }}
                >
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
            {isEdit ? "Enregistrer" : "Créer"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ContratForm;
