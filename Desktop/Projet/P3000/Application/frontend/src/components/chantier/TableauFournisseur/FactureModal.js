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
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditMode ? "Modifier la facture" : "Ajouter une facture"}
      </DialogTitle>
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
            onClick={onDelete}
            color="error"
            sx={{ mr: "auto" }}
          >
            Supprimer
          </Button>
        )}
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={onSave}
          variant="contained"
          disabled={!factureData.numero.trim()}
        >
          {isEditMode ? "Modifier" : "Ajouter"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FactureModal;

