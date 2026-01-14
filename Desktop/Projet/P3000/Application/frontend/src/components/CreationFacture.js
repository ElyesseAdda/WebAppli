import { Box, Button, MenuItem, TextField, Typography } from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import axios from "axios";
import fr from "date-fns/locale/fr";
import React, { useEffect, useState } from "react";

const CreationFacture = ({ devis, onClose, onSubmit }) => {
  console.log("1. Devis reçu:", devis);
  console.log("1.1 Nom du chantier:", devis?.chantier_name);

  if (!devis || Array.isArray(devis) || !devis.id) {
    console.error("Devis invalide:", devis);
    return <Box sx={{ p: 2 }}>Erreur: Devis invalide</Box>;
  }

  const [formData, setFormData] = useState({
    numero_facture: "",
    adresse_facturation: "",
    date_envoi: new Date(),
    delai_paiement: 45,
    mode_paiement: "virement",
  });

  const [societeData, setSocieteData] = useState(null);

  // Fonction pour calculer la date d'échéance
  const calculateDateEcheance = (dateEnvoi, delaiPaiement) => {
    if (!dateEnvoi || !delaiPaiement) return null;
    const dateEcheance = new Date(dateEnvoi);
    dateEcheance.setDate(dateEcheance.getDate() + delaiPaiement);
    return dateEcheance;
  };

  // Calculer la date d'échéance automatiquement
  const dateEcheanceCalculee = calculateDateEcheance(
    formData.date_envoi,
    formData.delai_paiement
  );

  // Charger le numéro de facture depuis l'API
  useEffect(() => {
    const fetchNextFactureNumber = async () => {
      try {
        const response = await axios.get("/api/get-next-facture-number/");
        if (response.data && response.data.numero) {
          setFormData((prev) => ({
            ...prev,
            numero_facture: response.data.numero,
          }));
        }
      } catch (error) {
        console.error("Erreur lors du chargement du numéro de facture:", error);
        // En cas d'erreur, utiliser un format par défaut
        const currentYear = new Date().getFullYear();
        setFormData((prev) => ({
          ...prev,
          numero_facture: `Facture n°01.${currentYear}`,
        }));
      }
    };

    fetchNextFactureNumber();
  }, []);

  useEffect(() => {
    const fetchSocieteData = async () => {
      try {
        console.log("2. Tentative de chargement du chantier");
        if (devis?.chantier_name) {
          console.log("3. Nom du chantier trouvé:", devis.chantier_name);
          // Récupérer d'abord tous les chantiers
          const response = await axios.get("/api/chantier/");
          const chantiers = response.data;
          console.log(
            "4. Liste des chantiers reçue, nombre:",
            chantiers.length
          );
          console.log("4.1 Chantiers disponibles:", chantiers);

          // Trouver le chantier correspondant
          const chantierData = chantiers.find(
            (c) => c.chantier_name === devis.chantier_name
          );
          console.log("5. Chantier trouvé:", chantierData);
          console.log(
            "5.1 Structure complète du chantier:",
            JSON.stringify(chantierData, null, 2)
          );

          if (chantierData) {
            console.log(
              "5.2 Propriétés du chantier:",
              Object.keys(chantierData)
            );
            const societeId = chantierData.societe;
            console.log("5.3 ID de la société extrait:", societeId);

            if (societeId) {
              console.log("6. ID de la société trouvé:", societeId);

              // Récupérer les données complètes de la société
              const societeResponse = await axios.get(
                `/api/societe/${societeId}/`
              );
              const societeComplete = societeResponse.data;
              console.log(
                "7. Données complètes de la société:",
                societeComplete
              );

              setSocieteData(societeComplete);

              const address = `${societeComplete.nom_societe || ""}
                ${societeComplete.rue_societe || ""}
                ${societeComplete.codepostal_societe || ""} ${
                societeComplete.ville_societe || ""
              }`.trim();

              setFormData((prev) => ({
                ...prev,
                adresse_facturation: address,
              }));
            } else {
              console.warn("5.4 Pas d'ID de société dans le chantier");
            }
          } else {
            console.warn(
              "5.5 Chantier non trouvé avec le nom:",
              devis.chantier_name
            );
          }
        }
      } catch (error) {
        console.error("Erreur lors du chargement des données:", {
          message: error.message,
          response: error.response?.data,
          stack: error.stack,
        });
      }
    };

    fetchSocieteData();
  }, [devis]);

  console.log("4. État initial formData:", formData);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log("8. Changement d'input:", { name, value });
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (!devis) {
        throw new Error("Aucun devis fourni");
      }

      // Calculer la date d'échéance basée sur la date d'envoi et le délai
      const dateEcheanceFormatted = dateEcheanceCalculee
        ? dateEcheanceCalculee.toISOString().split("T")[0]
        : null;

      const factureData = {
        numero: formData.numero_facture,
        devis: devis.id,
        date_echeance: dateEcheanceFormatted,
        mode_paiement: formData.mode_paiement,
      };

      console.log("Données de la facture à envoyer:", factureData);
      await onSubmit(factureData);
      onClose();
    } catch (error) {
      console.error("Erreur lors de la création de la facture:", error);
      alert(`Erreur lors de la création de la facture: ${error.message}`);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <form onSubmit={handleSubmit}>
        <TextField
          fullWidth
          label="Numéro de facture"
          name="numero_facture"
          value={formData.numero_facture}
          onChange={handleInputChange}
          required
          margin="normal"
        />
        <TextField
          fullWidth
          label="Adresse de facturation"
          name="adresse_facturation"
          value={formData.adresse_facturation}
          onChange={handleInputChange}
          multiline
          rows={4}
          margin="normal"
        />
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
          <DatePicker
            label="Date d'envoi"
            value={formData.date_envoi}
            onChange={(date) => setFormData({ ...formData, date_envoi: date })}
            renderInput={(params) => (
              <TextField {...params} fullWidth margin="normal" />
            )}
          />
        </LocalizationProvider>

        <TextField
          fullWidth
          select
          label="Délai de paiement"
          name="delai_paiement"
          value={formData.delai_paiement}
          onChange={handleInputChange}
          margin="normal"
          required
        >
          <MenuItem value={45}>45 jours</MenuItem>
          <MenuItem value={60}>60 jours</MenuItem>
        </TextField>

        {dateEcheanceCalculee && (
          <Box sx={{ mt: 2, p: 2, bgcolor: "grey.100", borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              <strong>Date de paiement prévue :</strong>{" "}
              {dateEcheanceCalculee.toLocaleDateString("fr-FR")}
            </Typography>
          </Box>
        )}
        <TextField
          fullWidth
          label="Mode de paiement"
          name="mode_paiement"
          value={formData.mode_paiement}
          onChange={handleInputChange}
          margin="normal"
          required
        />
        <Box
          sx={{ mt: 2, display: "flex", justifyContent: "flex-end", gap: 2 }}
        >
          <Button onClick={onClose} variant="outlined">
            Annuler
          </Button>
          <Button type="submit" variant="contained" color="primary">
            Créer la facture
          </Button>
        </Box>
      </form>
    </Box>
  );
};

export default CreationFacture;
