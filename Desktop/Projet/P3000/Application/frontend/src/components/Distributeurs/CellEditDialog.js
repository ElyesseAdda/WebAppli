import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import { MdClose } from "react-icons/md";

const CellEditDialog = ({
  open,
  onClose,
  cell,
  distributeurId,
  rowIndex,
  colIndex,
  onSave,
}) => {
  const [nomProduit, setNomProduit] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePosition, setImagePosition] = useState("center");
  const [prixVente, setPrixVente] = useState("");
  const [stockProductId, setStockProductId] = useState(null);
  const [stockProducts, setStockProducts] = useState([]);

  useEffect(() => {
    if (open) {
      axios.get("/api/stock-products/").then((res) => setStockProducts(res.data.results || res.data || [])).catch(() => setStockProducts([]));
    }
  }, [open]);

  useEffect(() => {
    if (cell) {
      setNomProduit(cell.nom_produit || "");
      setImageUrl(cell.image_display_url || cell.image_url || "");
      setImagePosition(cell.image_position || "center");
      setPrixVente(cell.prix_vente != null && cell.prix_vente !== "" ? String(cell.prix_vente) : "");
      setStockProductId(cell.stock_product ?? null);
    } else {
      setNomProduit("");
      setImageUrl("");
      setImagePosition("center");
      setPrixVente("");
      setStockProductId(null);
    }
  }, [cell, open]);

  const handleSave = () => {
    if (!stockProductId) {
      alert("Veuillez sélectionner un produit du stock.");
      return;
    }
    const p = stockProducts.find((x) => x.id === stockProductId);
    const hasNom = !!nomProduit.trim();
    const hasImage = !!imageUrl.trim();
    const cellData = {
      distributeur: parseInt(distributeurId),
      row_index: parseInt(rowIndex),
      col_index: parseInt(colIndex),
      nom_produit: hasNom ? nomProduit.trim() : (p ? (p.nom || p.nom_produit) : null),
      image_url: hasImage ? imageUrl.trim() : (p ? (p.image_display_url || p.image_url) : null),
      image_s3_key: null,
      image_position: imagePosition || "center",
      prix_vente: prixVente.trim() !== "" && !isNaN(parseFloat(prixVente)) && parseFloat(prixVente) >= 0
        ? parseFloat(prixVente)
        : null,
      stock_product: stockProductId,
    };
    Object.keys(cellData).forEach(key => {
      if (cellData[key] === null || cellData[key] === "") {
        if (!["nom_produit", "image_url", "image_s3_key", "prix_vente", "stock_product"].includes(key)) {
          delete cellData[key];
        }
      }
    });
    onSave(cellData);
    onClose();
  };

  const handleDelete = () => {
    if (cell && cell.id) {
      // Supprimer la cellule
      axios.delete(`/api/distributeur-cells/${cell.id}/`).then(() => {
        onSave(null); // Indiquer que la cellule a été supprimée
        onClose();
      });
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={window.innerWidth < 600}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Éditer la case L{rowIndex + 1}C{colIndex + 1}
        </Typography>
        <IconButton onClick={onClose} size="small">
          <MdClose />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <FormControl fullWidth sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}>
              <InputLabel>Produit lié au stock</InputLabel>
              <Select
                value={stockProductId ?? ""}
                label="Produit lié au stock"
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : null;
                  setStockProductId(id);
                  if (id) {
                    const p = stockProducts.find((x) => x.id === id);
                    if (p) {
                      setNomProduit(p.nom || p.nom_produit || nomProduit);
                      setImageUrl(p.image_display_url || p.image_url || imageUrl);
                    }
                  }
                }}
              >
                <MenuItem value="">Aucun</MenuItem>
                {stockProducts.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.nom || p.nom_produit || `Produit #${p.id}`}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" sx={{ mt: 0.5, display: "block", color: "text.secondary" }}>
                Même liste que l'onglet Stock. Créez les produits dans l'onglet Stock.
              </Typography>
            </FormControl>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.secondary" }}>
              Vue d'ensemble de la case (nom et image du produit lié au stock).
            </Typography>
            <Box
              sx={{
                p: 2,
                borderRadius: "16px",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "grey.50",
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "14px",
                  bgcolor: "background.paper",
                  border: "1px solid",
                  borderColor: "divider",
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={nomProduit || "Produit"}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      objectPosition: imagePosition || "center",
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                ) : (
                  <Typography
                    variant="h5"
                    sx={{ fontWeight: 800, color: "primary.main" }}
                  >
                    {nomProduit
                      ? nomProduit
                          .split(" ")
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)
                      : "—"}
                  </Typography>
                )}
              </Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                  Produit
                </Typography>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {nomProduit || "Aucun nom"}
                </Typography>
              </Box>
            </Box>
            <TextField
              label="Prix de vente (€)"
              placeholder="Ex: 1.50"
              type="number"
              value={prixVente}
              onChange={(e) => setPrixVente(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              fullWidth
              helperText="Utilisé pour calculer le bénéfice (vs coûts d'achat StockLot)"
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "12px" } }}
            />
          </Box>
      </DialogContent>

      <DialogActions sx={{ px: 2, pb: 2, justifyContent: "space-between" }}>
        <Button
          onClick={handleDelete}
          color="error"
          disabled={!cell || !cell.id}
          sx={{ borderRadius: "12px" }}
        >
          Supprimer
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={onClose} sx={{ borderRadius: "12px" }}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!stockProductId}
            sx={{ borderRadius: "12px", minHeight: 44 }}
          >
            Enregistrer
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CellEditDialog;
