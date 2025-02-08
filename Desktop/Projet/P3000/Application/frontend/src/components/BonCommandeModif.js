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
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const BonCommandeModif = () => {
  const { id } = useParams();
  const [bonCommande, setBonCommande] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [quantities, setQuantities] = useState({});
  const [isPreviewed, setIsPreviewed] = useState(false);

  useEffect(() => {
    fetchBonCommande();
  }, [id]);

  const fetchBonCommande = async () => {
    try {
      const response = await axios.get(`/api/detail-bon-commande/${id}/`);
      setBonCommande(response.data);

      // Récupérer tous les produits du fournisseur
      const productsResponse = await axios.get(
        `/api/products-by-fournisseur/?fournisseur=${encodeURIComponent(
          response.data.fournisseur
        )}`
      );
      setAllProducts(productsResponse.data);

      // Initialiser les quantités et sélections
      const initialQuantities = {};
      const initialSelected = {};
      response.data.lignes.forEach((ligne) => {
        initialQuantities[ligne.produit] = ligne.quantite;
        initialSelected[ligne.produit] = true;
      });

      setQuantities(initialQuantities);
      setSelectedProducts(initialSelected);
    } catch (error) {
      console.error("Erreur lors du chargement:", error);
    }
  };

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

  const handlePreview = () => {
    const selectedItems = allProducts
      .filter((product) => selectedProducts[product.id])
      .map((product) => ({
        produit: product.id,
        designation: product.designation || product.nom_materiel,
        quantite: quantities[product.id] || 0,
        prix_unitaire: product.prix_unitaire,
        total: (quantities[product.id] || 0) * product.prix_unitaire,
      }));

    // Calculer le nouveau montant total
    const montantTotal = selectedItems.reduce(
      (acc, curr) => acc + curr.total,
      0
    );

    const bonCommandeData = {
      ...bonCommande,
      lignes: selectedItems,
      montant_total: montantTotal,
    };

    // Ouvrir l'aperçu dans un nouvel onglet
    const queryString = encodeURIComponent(JSON.stringify(bonCommandeData));
    window.open(
      `/api/preview-bon-commande/?bon_commande=${queryString}`,
      "_blank"
    );
    setIsPreviewed(true);
  };

  const handleSave = async () => {
    try {
      const selectedItems = allProducts
        .filter((product) => selectedProducts[product.id])
        .map((product) => ({
          produit: product.id,
          designation: product.designation || product.nom_materiel,
          quantite: quantities[product.id] || 0,
          prix_unitaire: product.prix_unitaire,
        }));

      const updatedBC = {
        ...bonCommande,
        lignes: selectedItems,
        montant_total: selectedItems.reduce(
          (acc, curr) => acc + curr.quantite * curr.prix_unitaire,
          0
        ),
      };

      await axios.put(`/api/update-bon-commande/${id}/`, updatedBC);
      window.location.href = "/BonCommande";
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      alert("Erreur lors de la modification du bon de commande");
    }
  };

  if (!bonCommande) return <div>Chargement...</div>;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: "0 auto" }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" sx={{ mb: 3 }}>
          Modification du Bon de Commande {bonCommande.numero}
        </Typography>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">Sélection</TableCell>
                <TableCell>Désignation</TableCell>
                <TableCell>Prix Unitaire</TableCell>
                <TableCell>Quantité</TableCell>
                <TableCell>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {allProducts.map((product) => (
                <TableRow key={product.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedProducts[product.id] || false}
                      onChange={() => handleCheckboxChange(product.id)}
                    />
                  </TableCell>
                  <TableCell>
                    {product.designation || product.nom_materiel}
                  </TableCell>
                  <TableCell>{product.prix_unitaire} €</TableCell>
                  <TableCell>
                    <TextField
                      type="number"
                      value={quantities[product.id] || 0}
                      onChange={(e) =>
                        handleQuantityChange(product.id, e.target.value)
                      }
                      disabled={!selectedProducts[product.id]}
                    />
                  </TableCell>
                  <TableCell>
                    {(
                      (quantities[product.id] || 0) * product.prix_unitaire
                    ).toFixed(2)}{" "}
                    €
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Box
          sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "flex-end" }}
        >
          <Button
            variant="contained"
            onClick={isPreviewed ? handleSave : handlePreview}
          >
            {isPreviewed ? "Enregistrer les modifications" : "Aperçu"}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default BonCommandeModif;
