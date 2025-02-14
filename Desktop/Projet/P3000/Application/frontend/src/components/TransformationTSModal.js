import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Modal,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

const TransformationTSModal = ({ open, onClose, devis, chantier }) => {
  // États pour gérer les données du formulaire
  const [designation, setDesignation] = useState("");
  const [selectedAvenant, setSelectedAvenant] = useState("");
  const [createNewAvenant, setCreateNewAvenant] = useState(false);
  const [avenants, setAvenants] = useState([]);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!open) {
      setDesignation("");
      setSelectedAvenant("");
      setCreateNewAvenant(false);
    }
  }, [open]);

  // Charger les avenants existants
  useEffect(() => {
    if (open && chantier?.id) {
      fetchAvenants();
    }
  }, [open, chantier]);

  // Récupérer les avenants existants pour ce chantier
  const fetchAvenants = async () => {
    try {
      const response = await axios.get(
        `/api/avenant_chantier/${chantier.id}/avenants/`
      );
      if (response.data.success && Array.isArray(response.data.avenants)) {
        setAvenants(response.data.avenants);
      } else {
        setAvenants([]);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des avenants:", error);
      setAvenants([]);
    }
  };

  const handleSubmit = async () => {
    try {
      const tsData = {
        devis_id: devis.id,
        chantier_id: chantier.id,
        create_new_avenant: createNewAvenant,
        ...(createNewAvenant ? {} : { avenant_id: parseInt(selectedAvenant) }),
        designation: designation,
      };

      console.log("Données envoyées:", tsData);

      const response = await axios.post("/api/create-facture-ts/", tsData);

      alert(`La facture TS a été créée avec succès.`);
      fetchAvenants(); // Rafraîchir la liste des avenants
      onClose();
    } catch (error) {
      console.error("Erreur complète:", error);
      console.error("Response data:", error.response?.data);

      if (error.response?.data?.error) {
        if (error.response.data.error.includes("UNIQUE constraint failed")) {
          alert(
            `Une facture TS avec cette désignation existe déjà. Veuillez choisir une autre désignation.`
          );
        } else {
          alert(`Erreur : ${error.response.data.error}`);
        }
      } else {
        alert("Une erreur inattendue s'est produite. Veuillez réessayer.");
      }
    }
  };

  // Ne pas rendre le modal si les données essentielles sont manquantes
  if (!open || !devis || !chantier) {
    return null;
  }

  return (
    <Modal open={open} onClose={onClose} aria-labelledby="ts-modal-title">
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
          borderRadius: 2,
        }}
      >
        <Typography
          id="ts-modal-title"
          variant="h6"
          component="h2"
          gutterBottom
        >
          Transformer en Facture TS
        </Typography>

        <FormControlLabel
          control={
            <Checkbox
              checked={createNewAvenant}
              onChange={(e) => setCreateNewAvenant(e.target.checked)}
            />
          }
          label="Créer un nouvel avenant"
        />

        {!createNewAvenant && (
          <FormControl fullWidth margin="normal">
            <InputLabel>Sélectionner un avenant existant</InputLabel>
            <Select
              value={selectedAvenant}
              onChange={(e) => setSelectedAvenant(e.target.value)}
              required
            >
              {avenants.map((avenant) => (
                <MenuItem key={avenant.id} value={avenant.id}>
                  Avenant n°{avenant.numero}({avenant.nombre_ts} TS - Total:{" "}
                  {avenant.montant_total}€)
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <TextField
          fullWidth
          label="Désignation"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          margin="normal"
        />

        <Box
          sx={{ mt: 3, display: "flex", justifyContent: "flex-end", gap: 2 }}
        >
          <Button onClick={onClose}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!createNewAvenant && !selectedAvenant}
          >
            Transformer
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default TransformationTSModal;
