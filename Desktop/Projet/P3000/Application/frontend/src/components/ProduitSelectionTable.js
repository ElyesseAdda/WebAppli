import {
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  MenuItem,
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
import { bonCommandeService } from "../services/bonCommandeService";
import { updateChantierMaterialCost } from "../services/chantierService";
import NewProductForm from "./NewProductForm";

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
  const [codeRangeFilter, setCodeRangeFilter] = useState(""); // Nouveau filtre par plage de codes
  const [openNewProductModal, setOpenNewProductModal] = useState(false);
  const [editingCell, setEditingCell] = useState({
    productId: null,
    field: null,
  });
  const [editedProducts, setEditedProducts] = useState({});

  const handleOpenNewProductModal = () => setOpenNewProductModal(true);
  const handleCloseNewProductModal = () => setOpenNewProductModal(false);

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

  const handleCellDoubleClick = (productId, field) => {
    setEditingCell({ productId, field });
  };

  const handleEditChange = (productId, field, value) => {
    setEditedProducts((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: field === "prix_unitaire" ? parseFloat(value) : value,
      },
    }));
  };

  const handleEditBlur = async (productId, field) => {
    setEditingCell({ productId: null, field: null });
    const edited = editedProducts[productId];
    if (
      edited &&
      ["code_produit", "designation", "prix_unitaire"].includes(field)
    ) {
      try {
        await axios.patch(`/api/stock/${productId}/`, {
          [field]: edited[field],
        });
        loadProducts();
      } catch (error) {
        console.error("Erreur lors de la mise à jour du produit:", error);
      }
    }
  };

  const handleEditKeyDown = (e, productId, field) => {
    if (e.key === "Enter") {
      handleEditBlur(productId, field);
    }
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
      if (!selectedData.emetteur) {
        throw new Error("Veuillez sélectionner un émetteur");
      }

      if (!products || products.length === 0) {
        throw new Error("Aucun produit n'est disponible");
      }

      const selectedItems = products
        .filter((product) => selectedProducts[product.id])
        .map((product) => ({
          produit: product.id,
          designation: product.designation,
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
        emetteur: selectedData.emetteur,
        date_commande: selectedData.date_commande,
        date_creation_personnalisee: selectedData.date_creation_personnalisee,
        contact_type: selectedData.contact_type,
        contact_agent: selectedData.contact_agent,
        contact_sous_traitant: selectedData.contact_sous_traitant,
        lignes: selectedItems,
        montant_total: parseFloat(
          selectedItems.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)
        ),
      };

      console.log("Données envoyées:", bonCommandeData);

      // Créer le bon de commande
      const bonCommande = await bonCommandeService.createBonCommande(
        bonCommandeData
      );

      // Attendre que la création soit terminée avant de mettre à jour le coût
      await updateChantierMaterialCost(selectedData.chantier);

      onClose();

      if (onValidate && typeof onValidate === "function") {
        onValidate(bonCommande);
      }

      // Recharger la page après la création
      window.location.reload();
    } catch (error) {
      console.error("Erreur lors de la création du bon de commande:", error);
      throw error;
    }
  };

  const calculateTotal = (product, edited = {}) => {
    const price = edited.prix_unitaire ?? product.prix_unitaire;
    const quantity =
      edited.quantite !== undefined
        ? parseInt(edited.quantite)
        : quantities[product.id] || 0;
    return (quantity * price).toFixed(2);
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

  // On extrait la fonction de chargement pour la réutiliser après ajout
  const loadProducts = async () => {
    try {
      const data = await bonCommandeService.getProductsByFournisseur(
        fournisseur,
        codeRangeFilter || null
      );
      setProducts(data);
    } catch (error) {
      console.error("Erreur lors du chargement des produits:", error);
    }
  };

  useEffect(() => {
    loadProducts();
  }, [fournisseur, codeRangeFilter]);

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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
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
            }}
            sx={{ width: "250px" }}
          />
          <TextField
            select
            size="small"
            label="Plage de codes"
            variant="outlined"
            value={codeRangeFilter}
            onChange={(e) => setCodeRangeFilter(e.target.value)}
            sx={{ width: "150px" }}
          >
            <MenuItem value="">Tous les codes</MenuItem>
            <MenuItem value="0-99">0-99</MenuItem>
            <MenuItem value="100-199">100-199</MenuItem>
            <MenuItem value="200-299">200-299</MenuItem>
            <MenuItem value="300-399">300-399</MenuItem>
            <MenuItem value="400-499">400-499</MenuItem>
            <MenuItem value="500+">500+</MenuItem>
            <MenuItem value="non-numeric">Non-numérique</MenuItem>
          </TextField>
          <Button
            variant="outlined"
            color="primary"
            onClick={handleOpenNewProductModal}
          >
            Nouveau Produit
          </Button>
        </Box>
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
              {filteredProducts.map((product, idx) => {
                const isSelected = selectedProducts[product.id];
                const edited = editedProducts[product.id] || {};
                const rowColor = idx % 2 === 0 ? "#fafafa" : "#fff";
                return (
                  <TableRow
                    key={product.id}
                    hover
                    selected={isSelected}
                    sx={{ backgroundColor: rowColor }}
                  >
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={isSelected || false}
                        onChange={() => handleCheckboxChange(product.id)}
                      />
                    </TableCell>
                    <TableCell
                      onDoubleClick={() =>
                        handleCellDoubleClick(product.id, "code_produit")
                      }
                      sx={{ cursor: "pointer" }}
                    >
                      {editingCell.productId === product.id &&
                      editingCell.field === "code_produit" ? (
                        <TextField
                          value={edited.code_produit ?? product.code_produit}
                          onChange={(e) =>
                            handleEditChange(
                              product.id,
                              "code_produit",
                              e.target.value
                            )
                          }
                          onBlur={() =>
                            handleEditBlur(product.id, "code_produit")
                          }
                          onKeyDown={(e) =>
                            handleEditKeyDown(e, product.id, "code_produit")
                          }
                          size="small"
                          autoFocus
                        />
                      ) : (
                        edited.code_produit ?? product.code_produit
                      )}
                    </TableCell>
                    <TableCell
                      onDoubleClick={() =>
                        handleCellDoubleClick(product.id, "designation")
                      }
                      sx={{ cursor: "pointer" }}
                    >
                      {editingCell.productId === product.id &&
                      editingCell.field === "designation" ? (
                        <TextField
                          value={edited.designation ?? product.designation}
                          onChange={(e) =>
                            handleEditChange(
                              product.id,
                              "designation",
                              e.target.value
                            )
                          }
                          onBlur={() =>
                            handleEditBlur(product.id, "designation")
                          }
                          onKeyDown={(e) =>
                            handleEditKeyDown(e, product.id, "designation")
                          }
                          size="small"
                          autoFocus
                        />
                      ) : (
                        edited.designation ?? product.designation
                      )}
                    </TableCell>
                    <TableCell
                      onDoubleClick={() =>
                        handleCellDoubleClick(product.id, "prix_unitaire")
                      }
                      sx={{ cursor: "pointer" }}
                    >
                      {editingCell.productId === product.id &&
                      editingCell.field === "prix_unitaire" ? (
                        <TextField
                          type="number"
                          value={edited.prix_unitaire ?? product.prix_unitaire}
                          onChange={(e) =>
                            handleEditChange(
                              product.id,
                              "prix_unitaire",
                              e.target.value
                            )
                          }
                          onBlur={() =>
                            handleEditBlur(product.id, "prix_unitaire")
                          }
                          onKeyDown={(e) =>
                            handleEditKeyDown(e, product.id, "prix_unitaire")
                          }
                          size="small"
                          autoFocus
                          inputProps={{ min: 0, step: "0.01" }}
                        />
                      ) : (
                        (edited.prix_unitaire ?? product.prix_unitaire).toFixed(
                          2
                        ) + " €"
                      )}
                    </TableCell>
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
                        disabled={!isSelected}
                        InputProps={{ inputProps: { min: 0 } }}
                        sx={{ width: "100px" }}
                      />
                    </TableCell>
                    <TableCell>{calculateTotal(product, edited)} €</TableCell>
                  </TableRow>
                );
              })}
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
      <NewProductForm
        open={openNewProductModal}
        handleClose={handleCloseNewProductModal}
        onAddProduct={() => {
          handleCloseNewProductModal();
          loadProducts();
        }}
        fournisseur={selectedData?.fournisseur}
      />
    </Dialog>
  );
}

export default ProduitSelectionTable;
