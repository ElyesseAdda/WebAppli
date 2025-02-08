import {
  Box,
  Button,
  Checkbox,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { bonCommandeService } from "../services/bonCommandeService";

function ProduitSelectionTable({
  fournisseur,
  onValidate,
  onCancel,
  numeroBC,
  selectedData,
}) {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [quantities, setQuantities] = useState({});
  const [isPreviewed, setIsPreviewed] = useState(false);

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
    try {
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
      if (onValidate && typeof onValidate === "function") {
        onValidate(response);
      }
    } catch (error) {
      console.error("Erreur détaillée:", error.response?.data || error.message);
      alert(error.message || "Erreur lors de la création du bon de commande");
    }
  };

  const calculateTotal = (product) => {
    const quantity = quantities[product.id] || 0;
    return (quantity * product.prix_unitaire).toFixed(2);
  };

  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      <TableContainer sx={{ maxHeight: 440 }}>
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox disabled />
              </TableCell>
              <TableCell>Code</TableCell>
              <TableCell>Désignation</TableCell>
              <TableCell>Prix unitaire</TableCell>
              <TableCell>Unité</TableCell>
              <TableCell>Quantité</TableCell>
              <TableCell>Total</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
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

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 2, p: 2 }}>
        <Button onClick={onCancel}>Annuler</Button>
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
    </Paper>
  );
}

export default ProduitSelectionTable;
