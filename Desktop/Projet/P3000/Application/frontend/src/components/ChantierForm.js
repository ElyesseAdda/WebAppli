import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import React, { useEffect, useState } from "react";

const ChantierForm = ({ open, onClose, onSubmit, societeId }) => {
  const [chantierData, setChantierData] = useState({
    chantier_name: "",
    ville: "",
    rue: "",
    code_postal: "",
    societe: societeId,
  });

  useEffect(() => {
    setChantierData((prev) => ({
      ...prev,
      societe: societeId,
    }));
  }, [societeId]);

  const handleChange = (e) => {
    setChantierData({
      ...chantierData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = () => {
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
        <Button onClick={handleSubmit} variant="contained">
          Créer le chantier
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ChantierForm;
