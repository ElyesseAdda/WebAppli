import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import React from "react";

const SocieteInfoModal = ({
  open,
  onClose,
  societeData,
  onSubmit,
  onChange,
}) => {
  const handleSubmit = () => {
    // Valider que tous les champs requis sont remplis
    if (
      !societeData.nom_societe ||
      !societeData.ville_societe ||
      !societeData.rue_societe ||
      !societeData.codepostal_societe
    ) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    onSubmit();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Informations Société</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          margin="normal"
          name="nom_societe"
          label="Nom de la société"
          value={societeData.nom_societe}
          onChange={(e) => onChange(e, "societe")}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          name="ville_societe"
          label="Ville"
          value={societeData.ville_societe}
          onChange={(e) => onChange(e, "societe")}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          name="rue_societe"
          label="Rue"
          value={societeData.rue_societe}
          onChange={(e) => onChange(e, "societe")}
          required
        />
        <TextField
          fullWidth
          margin="normal"
          name="codepostal_societe"
          label="Code postal"
          value={societeData.codepostal_societe}
          onChange={(e) => onChange(e, "societe")}
          required
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Retour</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default SocieteInfoModal;
