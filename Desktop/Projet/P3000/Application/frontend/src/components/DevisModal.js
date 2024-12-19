import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import React from "react";

const DevisModal = ({
  open,
  handleClose,
  devisData,
  handleSubmit,
  handleChange,
}) => {
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Résumé du devis</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            label="Numéro du devis"
            name="numero"
            value={devisData.numero || ""}
            onChange={handleChange}
          />
          <TextField
            label="Client"
            name="client"
            value={devisData.client || ""}
            onChange={handleChange}
          />
          <TextField
            label="Montant HT"
            name="price_ht"
            value={devisData.price_ht || ""}
            disabled
          />
          <TextField
            label="Montant TTC"
            name="price_ttc"
            value={(parseFloat(devisData.price_ht || 0) * 1.2).toFixed(2) || ""}
            disabled
          />
          <TextField
            label="Description"
            name="description"
            value={devisData.description || ""}
            onChange={handleChange}
            multiline
            rows={4}
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DevisModal;
