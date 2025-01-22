import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import React from "react";

const EditDevisModal = ({
  open,
  handleClose,
  devisData,
  handleSubmit,
  handleChange,
  newTotals,
}) => {
  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Modification du devis</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            label="Numéro du devis"
            name="numero"
            value={devisData.numero || ""}
            disabled // Le numéro ne doit pas être modifiable
          />

          <Typography variant="subtitle1" gutterBottom>
            Anciens montants :
          </Typography>
          <Typography>
            Montant HT : {devisData.price_ht?.toFixed(2) || "0.00"} €
          </Typography>
          <Typography>
            Montant TTC : {devisData.price_ttc?.toFixed(2) || "0.00"} €
          </Typography>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" gutterBottom>
            Nouveaux montants calculés :
          </Typography>
          <Typography>
            Montant HT : {newTotals?.totalHT?.toFixed(2) || "0.00"} €
          </Typography>
          <Typography>
            Montant TTC : {newTotals?.totalTTC?.toFixed(2) || "0.00"} €
          </Typography>

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
          Enregistrer les modifications
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditDevisModal;
