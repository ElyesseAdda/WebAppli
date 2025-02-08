import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

const EditStockModal = ({ open, onClose, stock, onUpdate }) => {
  const [formData, setFormData] = useState({
    code_produit: "",
    designation: "",
    fournisseur: "",
    prix_unitaire: "",
    unite: "",
  });

  // Mettre à jour formData quand stock change
  useEffect(() => {
    if (stock) {
      setFormData({
        code_produit: stock.code_produit || "",
        designation: stock.designation || "",
        fournisseur: stock.fournisseur || "",
        prix_unitaire: stock.prix_unitaire || "",
        unite: stock.unite || "",
      });
    }
  }, [stock]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      const response = await axios.put(`/api/stock/${stock.id}/`, formData);
      onUpdate(response.data);
      onClose();
    } catch (error) {
      console.error("Erreur lors de la modification du stock:", error);
      alert("Erreur lors de la modification du stock");
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{ fontFamily: '"Roboto", sans-serif', fontWeight: "bold" }}
      >
        Modifier le stock
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
          <TextField
            label="Code Produit"
            name="code_produit"
            value={formData.code_produit}
            onChange={handleChange}
            fullWidth
          />
          <TextField
            label="Désignation"
            name="designation"
            value={formData.designation}
            onChange={handleChange}
            fullWidth
          />
          <TextField
            label="Fournisseur"
            name="fournisseur"
            value={formData.fournisseur}
            onChange={handleChange}
            fullWidth
          />
          <TextField
            label="Prix Unitaire"
            name="prix_unitaire"
            type="number"
            value={formData.prix_unitaire}
            onChange={handleChange}
            fullWidth
          />
          <TextField
            label="Unité"
            name="unite"
            value={formData.unite}
            onChange={handleChange}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary">
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditStockModal;
