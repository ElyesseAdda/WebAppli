import {
  Box,
  Button,
  MenuItem,
  Modal,
  TextField,
  Typography,
} from "@mui/material";
import { DatePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import fr from "date-fns/locale/fr";
import React, { useEffect, useState } from "react";

const FactureModal = ({ open, onClose, onSubmit, devis }) => {
  const [formData, setFormData] = useState({
    numero_facture: "",
    adresse_facturation: "",
    date_envoi: new Date(),
    delai_paiement: 45,
    mode_paiement: "virement",
  });

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

  // Initialiser l'adresse de facturation et le numéro de facture
  useEffect(() => {
    if (devis && devis.numero) {
      const adresseSociete = devis.societe
        ? `${devis.societe.nom_societe}
${devis.societe.rue_societe}
${devis.societe.codepostal_societe} ${devis.societe.ville_societe}`
        : "";

      // Transformer le numéro de devis en numéro de facture
      const factureNumber = devis.numero.replace("DEV-", "FACT-");

      setFormData((prev) => ({
        ...prev,
        numero_facture: prev.numero_facture || factureNumber,
        adresse_facturation: prev.adresse_facturation || adresseSociete,
      }));
    }
  }, [devis]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Calculer la date d'échéance basée sur la date d'envoi et le délai
    const dateEcheanceFormatted = dateEcheanceCalculee
      ? dateEcheanceCalculee.toISOString().split("T")[0]
      : null;

    // Si l'adresse de facturation est vide, utiliser l'adresse de la société
    const finalFormData = {
      numero: formData.numero_facture,
      devis: devis.id,
      date_echeance: dateEcheanceFormatted,
      mode_paiement: formData.mode_paiement,
    };

    onSubmit(finalFormData);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 400,
          bgcolor: "background.paper",
          boxShadow: 24,
          p: 4,
        }}
      >
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Numéro de facture"
            value={formData.numero_facture}
            onChange={(e) =>
              setFormData({ ...formData, numero_facture: e.target.value })
            }
            margin="normal"
            required
          />
          <TextField
            fullWidth
            label="Adresse de facturation"
            multiline
            rows={4}
            value={formData.adresse_facturation}
            onChange={(e) =>
              setFormData({ ...formData, adresse_facturation: e.target.value })
            }
            margin="normal"
            placeholder="Laissez vide pour utiliser l'adresse de la société"
          />
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={fr}>
            <DatePicker
              label="Date d'envoi"
              value={formData.date_envoi}
              onChange={(date) =>
                setFormData({ ...formData, date_envoi: date })
              }
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
            onChange={(e) =>
              setFormData({
                ...formData,
                delai_paiement: parseInt(e.target.value),
              })
            }
            margin="normal"
            required
          >
            <MenuItem value={45}>45 jours</MenuItem>
            <MenuItem value={60}>60 jours</MenuItem>
          </TextField>

          {dateEcheanceCalculee && (
            <Typography
              variant="body2"
              sx={{ mt: 1, mb: 2, color: "text.secondary" }}
            >
              Date de paiement prévue :{" "}
              {dateEcheanceCalculee.toLocaleDateString("fr-FR")}
            </Typography>
          )}
          <TextField
            fullWidth
            label="Mode de paiement"
            value={formData.mode_paiement}
            onChange={(e) =>
              setFormData({ ...formData, mode_paiement: e.target.value })
            }
            margin="normal"
            required
          />
          <Button type="submit" variant="contained" color="primary">
            Créer la facture
          </Button>
        </form>
      </Box>
    </Modal>
  );
};

export default FactureModal;
