import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import React, { useState } from "react";

function AddProductModal({ open, onClose, fournisseurId, onProductAdded }) {
  const [designation, setDesignation] = useState("");
  const [quantite, setQuantite] = useState("");
  const [prixUnitaire, setPrixUnitaire] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    await fetch("/api/stock/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        designation,
        quantite,
        prix_unitaire: prixUnitaire,
        fournisseur: fournisseurId,
      }),
    });
    setLoading(false);
    setDesignation("");
    setQuantite("");
    setPrixUnitaire("");
    onProductAdded();
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Ajouter un produit</DialogTitle>
      <DialogContent>
        <TextField
          label="Désignation"
          value={designation}
          onChange={(e) => setDesignation(e.target.value)}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Quantité"
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          type="number"
          fullWidth
          margin="normal"
        />
        <TextField
          label="Prix unitaire"
          value={prixUnitaire}
          onChange={(e) => setPrixUnitaire(e.target.value)}
          type="number"
          fullWidth
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleAdd}
          disabled={loading || !designation || !quantite || !prixUnitaire}
          variant="contained"
        >
          Ajouter
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddProductModal;
