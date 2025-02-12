import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Modal,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useState } from "react";

const TransformationCIEModal = ({ open, onClose, devis, chantier }) => {
  const [designation, setDesignation] = useState("");
  const [mois, setMois] = useState("");
  const [annee, setAnnee] = useState(new Date().getFullYear());

  const handleSubmit = async () => {
    try {
      const cieData = {
        devis_id: devis.id,
        chantier_id: chantier.id,
        designation: designation,
        mois_situation: parseInt(mois),
        annee_situation: parseInt(annee),
      };

      console.log("Données envoyées:", cieData);

      const response = await axios.post("/api/create-facture-cie/", cieData);

      console.log("Réponse reçue:", response.data);

      alert(`La facture CIE a été créée avec succès.`);

      if (response.data.preview_url) {
        window.open(response.data.preview_url, "_blank");
      }

      onClose();
    } catch (error) {
      console.error("Erreur lors de la création de la facture CIE:", error);
      console.log("Détails de l'erreur:", error.response?.data);
      alert(
        "Erreur lors de la création de la facture CIE. Veuillez vérifier les données."
      );
    }
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
          borderRadius: 2,
        }}
      >
        <Typography variant="h6" gutterBottom>
          Transformer en Facture CIE
        </Typography>

        <FormControl fullWidth margin="normal">
          <InputLabel>Mois de situation</InputLabel>
          <Select
            value={mois}
            onChange={(e) => setMois(e.target.value)}
            required
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <MenuItem key={m} value={m}>
                {m.toString().padStart(2, "0")}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          fullWidth
          type="number"
          label="Année"
          value={annee}
          onChange={(e) => setAnnee(e.target.value)}
          margin="normal"
        />

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
            disabled={!mois || !annee}
          >
            Transformer
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default TransformationCIEModal;
