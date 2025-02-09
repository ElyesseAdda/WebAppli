import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { bonCommandeService } from "../services/bonCommandeService";

function ProduitSelectionTable({
  open,
  onClose,
  fournisseur,
  onValidate,
  numeroBC,
  selectedData,
}) {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [quantities, setQuantities] = useState({});
  const [isPreviewed, setIsPreviewed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await bonCommandeService.getProductsByFournisseur(
          fournisseur
        );
        setProducts(data);
      } catch (error) {
        console.error("Erreur lors du chargement des produits:", error);
      }
    };
    loadProducts();
  }, [fournisseur]);

  const handleCheckboxChange = (productId) => {
    setIsPreviewed(false);
    setSelectedProducts((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }));

    setTimeout(() => {
      const quantityInput = document.getElementById(`quantity-${productId}`);
      if (quantityInput && !selectedProducts[productId]) {
        quantityInput.focus();
      }
    }, 0);
  };

  const handleQuantityChange = (productId, value) => {
    setIsPreviewed(false);
    const quantity = parseInt(value) || 0;
    setQuantities((prev) => ({
      ...prev,
      [productId]: quantity,
    }));
  };

  const handleValidate = () => {
    const selectedItems = products
      .filter((product) => selectedProducts[product.id])
      .map((product) => ({
        produit: product.id,
        designation: product.designation,
        quantite: quantities[product.id] || 0,
        prix_unitaire: product.prix_unitaire,
        total: (quantities[product.id] || 0) * product.prix_unitaire,
      }))
      .filter((item) => item.quantite > 0);

    onValidate(selectedItems);
    setIsPreviewed(true);
  };

  const handleSave = async () => {
    if (!selectedData.agent) {
      throw new Error("Veuillez sélectionner un agent");
    }

    if (!products || products.length === 0) {
      throw new Error("Aucun produit n'est disponible");
    }

    const selectedItems = products
      .filter((product) => selectedProducts[product.id])
      .map((product) => ({
        produit: product.id,
        designation: product.designation || product.nom_materiel,
        quantite: parseInt(quantities[product.id]) || 0,
        prix_unitaire: parseFloat(product.prix_unitaire),
        total: parseFloat(
          (quantities[product.id] || 0) * product.prix_unitaire
        ),
      }))
      .filter((item) => item.quantite > 0);

    if (selectedItems.length === 0) {
      throw new Error(
        "Veuillez sélectionner au moins un produit avec une quantité"
      );
    }

    const bonCommandeData = {
      numero: numeroBC,
      fournisseur: fournisseur,
      chantier: selectedData.chantier,
      agent: selectedData.agent,
      lignes: selectedItems,
      montant_total: parseFloat(
        selectedItems.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)
      ),
    };

    console.log("Données envoyées:", bonCommandeData);
    const response = await bonCommandeService.createBonCommande(
      bonCommandeData
    );
    console.log("Réponse:", response);

    onClose();

    if (onValidate && typeof onValidate === "function") {
      onValidate(response);
    }

    // Recharger la page après la création
    window.location.reload();
  };

  const calculateTotal = (product) => {
    const quantity = quantities[product.id] || 0;
    return (quantity * product.prix_unitaire).toFixed(2);
  };

  // Fonction pour calculer le total général
  const calculateGrandTotal = () => {
    return products
      .filter((product) => selectedProducts[product.id])
      .reduce((total, product) => {
        const quantity = quantities[product.id] || 0;
        return total + quantity * product.prix_unitaire;
      }, 0);
  };

  // Filtrer les produits en fonction du terme de recherche
  const filteredProducts = products.filter((product) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      product.code_produit?.toLowerCase().includes(searchTermLower) ||
      product.designation?.toLowerCase().includes(searchTermLower) ||
      product.unite?.toLowerCase().includes(searchTermLower) ||
      product.prix_unitaire?.toString().includes(searchTermLower)
    );
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pb: 1,
        }}
      >
        <Typography variant="h6">Sélection des produits</Typography>
        <TextField
          size="small"
          variant="outlined"
          placeholder="Rechercher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FiSearch style={{ fontSize: "1.2rem" }} />
              </InputAdornment>
            ),
            sx: { width: "300px" },
          }}
        />
      </DialogTitle>
      <DialogContent>
        <TableContainer sx={{ maxHeight: 440 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox"></TableCell>
                <TableCell>Code</TableCell>
                <TableCell>Désignation</TableCell>
                <TableCell>Prix unitaire</TableCell>
                <TableCell>Unité</TableCell>
                <TableCell>Quantité</TableCell>
                <TableCell>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProducts.map((product) => (
                <TableRow
                  key={product.id}
                  hover
                  selected={selectedProducts[product.id]}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedProducts[product.id] || false}
                      onChange={() => handleCheckboxChange(product.id)}
                    />
                  </TableCell>
                  <TableCell>{product.code_produit}</TableCell>
                  <TableCell>{product.designation}</TableCell>
                  <TableCell>{product.prix_unitaire.toFixed(2)} €</TableCell>
                  <TableCell>{product.unite}</TableCell>
                  <TableCell>
                    <TextField
                      id={`quantity-${product.id}`}
                      type="number"
                      size="small"
                      value={quantities[product.id] || ""}
                      onChange={(e) =>
                        handleQuantityChange(product.id, e.target.value)
                      }
                      disabled={!selectedProducts[product.id]}
                      InputProps={{ inputProps: { min: 0 } }}
                      sx={{ width: "100px" }}
                    />
                  </TableCell>
                  <TableCell>{calculateTotal(product)} €</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ justifyContent: "space-between", px: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            typography: "h6",
            color: "primary.main",
          }}
        >
          Total: {calculateGrandTotal().toFixed(2)} €
        </Box>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button onClick={onClose}>Annuler</Button>
          {isPreviewed ? (
            <Button
              onClick={handleSave}
              variant="contained"
              color="success"
              disabled={Object.keys(selectedProducts).length === 0}
            >
              Enregistrer le bon de commande
            </Button>
          ) : (
            <Button
              onClick={handleValidate}
              variant="contained"
              disabled={Object.keys(selectedProducts).length === 0}
            >
              Valider la sélection
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
}

export default ProduitSelectionTable;
