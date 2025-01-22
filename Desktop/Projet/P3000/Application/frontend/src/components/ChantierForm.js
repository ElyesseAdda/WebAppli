import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

const ChantierForm = ({ open, onClose, onSubmit, societeId }) => {
  const [chantierData, setChantierData] = useState({
    chantier_name: "",
    ville: "",
    rue: "",
    code_postal: "",
    societe: societeId,
  });

  // Nouvel état pour gérer l'erreur
  const [nameError, setNameError] = useState("");
  // État pour gérer le délai de vérification
  const [checkTimeout, setCheckTimeout] = useState(null);

  useEffect(() => {
    setChantierData((prev) => ({
      ...prev,
      societe: societeId,
    }));
  }, [societeId]);

  const checkChantierName = async (name) => {
    try {
      const response = await axios.get("/api/check-chantier-name/", {
        params: { chantier_name: name },
      });

      if (response.data.exists) {
        setNameError(`Un chantier avec le nom "${name}" existe déjà`);
        return false;
      } else {
        setNameError("");
        return true;
      }
    } catch (error) {
      console.error("Erreur lors de la vérification du nom:", error);
      setNameError("Erreur lors de la vérification du nom");
      return false;
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setChantierData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Si le champ modifié est le nom du chantier
    if (name === "chantier_name") {
      // Annuler le timeout précédent
      if (checkTimeout) clearTimeout(checkTimeout);

      // Créer un nouveau timeout pour la vérification
      if (value.trim()) {
        const newTimeout = setTimeout(() => {
          checkChantierName(value);
        }, 500); // Attendre 500ms après la dernière frappe
        setCheckTimeout(newTimeout);
      } else {
        setNameError("");
      }
    }
  };

  const handleSubmit = async () => {
    // Vérifier une dernière fois le nom avant la soumission
    if (chantierData.chantier_name.trim()) {
      const isValid = await checkChantierName(chantierData.chantier_name);
      if (!isValid) {
        return; // Ne pas soumettre si le nom existe déjà
      }
    }
    onSubmit(chantierData);
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth>
      <DialogTitle>
        {societeId
          ? "Nouveau Chantier"
          : "Nouveau Chantier pour Client Existant"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            name="chantier_name"
            label="Nom du chantier"
            value={chantierData.chantier_name}
            onChange={handleChange}
            fullWidth
            required
            error={!!nameError}
            helperText={nameError}
          />
          <TextField
            name="ville"
            label="Ville"
            value={chantierData.ville}
            onChange={handleChange}
            fullWidth
            required
          />
          <TextField
            name="rue"
            label="Rue"
            value={chantierData.rue}
            onChange={handleChange}
            fullWidth
            required
          />
          <TextField
            name="code_postal"
            label="Code postal"
            value={chantierData.code_postal}
            onChange={handleChange}
            fullWidth
            required
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!!nameError} // Désactiver le bouton si il y a une erreur
        >
          Créer le chantier
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChantierForm;
