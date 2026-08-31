import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import React from "react";

const FactureModal = ({
  open,
  onClose,
  onSave,
  onDelete,
  factureData,
  onFactureDataChange,
  isEditMode = false,
}) => {
  const canSave = factureData.numero.trim();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (canSave) {
      onSave();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditMode ? "Modifier la facture" : "Ajouter une facture"}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            <TextField
              label="Numéro de facture"
              value={factureData.numero}
              onChange={(e) =>
                onFactureDataChange({ ...factureData, numero: e.target.value })
              }
              fullWidth
              required
            />
            <TextField
              label="Montant facture"
              type="number"
              value={factureData.montant}
              onChange={(e) =>
                onFactureDataChange({ ...factureData, montant: e.target.value })
              }
              inputProps={{
                min: 0,
                step: 0.01,
              }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          {isEditMode && onDelete && (
            <Button
              type="button"
              onClick={onDelete}
              color="error"
              sx={{ mr: "auto" }}
            >
              Supprimer
            </Button>
          )}
          <Button type="button" onClick={onClose}>Annuler</Button>
          <Button
            type="submit"
            variant="contained"
            disabled={!canSave}
          >
            {isEditMode ? "Modifier" : "Ajouter"}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default FactureModal;

