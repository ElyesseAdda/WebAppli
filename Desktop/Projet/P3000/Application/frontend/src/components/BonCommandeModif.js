import {
  Box,
  Button,
  Checkbox,
  InputAdornment,
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
import { FiSearch } from "react-icons/fi";
import { useParams } from "react-router-dom";

const BonCommandeModif = () => {
  const { id } = useParams();
  const [bonCommande, setBonCommande] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [quantities, setQuantities] = useState({});
  const [isPreviewed, setIsPreviewed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [numeroBonCommande, setNumeroBonCommande] = useState("");

  useEffect(() => {
    fetchBonCommande();
  }, [id]);

  const fetchBonCommande = async () => {
    try {
      const response = await axios.get(`/api/detail-bon-commande/${id}/`);
      setBonCommande(response.data);
      setNumeroBonCommande(response.data.numero);

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

    // Focus sur l'input de quantité quand la checkbox est cochée
    setTimeout(() => {
      const quantityInput = document.getElementById(
        `quantity-modif-${productId}`
      );
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
      numero: numeroBonCommande,
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
        numero: numeroBonCommande,
        lignes: selectedItems,
        montant_total: selectedItems.reduce(
          (acc, curr) => acc + curr.quantite * curr.prix_unitaire,
          0
        ),
      };

      console.log("Données envoyées au serveur:", updatedBC);

      await axios.patch(`/api/update-bon-commande/${id}/`, updatedBC);
      alert("Bon de commande mis à jour avec succès !");
      window.location.href = "/BonCommande";
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      alert("Erreur lors de la modification du bon de commande");
    }
  };

  // Fonction pour calculer le total général
  const calculateGrandTotal = () => {
    return allProducts
      .filter((product) => selectedProducts[product.id])
      .reduce((total, product) => {
        const quantity = quantities[product.id] || 0;
        return total + quantity * product.prix_unitaire;
      }, 0);
  };

  // Filtrer les produits en fonction du terme de recherche
  const filteredProducts = allProducts.filter((product) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      product.code_produit?.toLowerCase().includes(searchTermLower) ||
      product.designation?.toLowerCase().includes(searchTermLower) ||
      product.unite?.toLowerCase().includes(searchTermLower) ||
      product.prix_unitaire?.toString().includes(searchTermLower)
    );
  });

  if (!bonCommande) return <div>Chargement...</div>;

  return (
    <Box sx={{ p: 3, maxWidth: 1200, margin: "0 auto" }}>
      <Paper sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography variant="h5">
            Modification du Bon de Commande {bonCommande.numero}
          </Typography>
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
        </Box>

        <TextField
          label="Numéro de Bon de Commande"
          value={numeroBonCommande}
          onChange={(e) => setNumeroBonCommande(e.target.value)}
          fullWidth
          margin="normal"
        />

        <TableContainer component={Paper}>
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
                  <TableCell>
                    {product.designation || product.nom_materiel}
                  </TableCell>
                  <TableCell>{product.prix_unitaire.toFixed(2)} €</TableCell>
                  <TableCell>
                    <TextField
                      id={`quantity-modif-${product.id}`}
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
          sx={{
            mt: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            px: 3,
          }}
        >
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
            <Button
              onClick={() => (window.location.href = "/BonCommande")}
              variant="outlined"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              variant="contained"
              disabled={Object.keys(selectedProducts).length === 0}
            >
              Enregistrer les modifications
            </Button>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default BonCommandeModif;
