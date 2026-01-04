import {
  Box,
  Button,
  Checkbox,
  InputAdornment,
  MenuItem,
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
import { generatePDFDrive } from "../utils/universalDriveGenerator";

const BonCommandeModif = () => {
  const { id } = useParams();
  const [bonCommande, setBonCommande] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [quantities, setQuantities] = useState({});
  const [isPreviewed, setIsPreviewed] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [numeroBonCommande, setNumeroBonCommande] = useState("");
  const [codeRangeFilter, setCodeRangeFilter] = useState(""); // Nouveau filtre par plage de codes
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (id) {
      fetchBonCommande();
    }
  }, [id]);

  // Fonction pour recharger les produits avec le filtre de plage
  const reloadProductsWithFilter = async () => {
    if (!bonCommande) return;

    try {
      const productsResponse = await axios.get(
        `/api/products-by-fournisseur/?fournisseur=${encodeURIComponent(
          bonCommande.fournisseur
        )}${codeRangeFilter ? `&code_range=${codeRangeFilter}` : ""}`
      );
      setAllProducts(productsResponse.data);
    } catch (error) {
      console.error("Erreur lors du rechargement des produits:", error);
    }
  };

  // Recharger les produits quand le filtre de plage change
  useEffect(() => {
    reloadProductsWithFilter();
  }, [codeRangeFilter, bonCommande]);

  const fetchBonCommande = async () => {
    // Vérifier que l'ID existe avant de faire l'appel API
    if (!id) {
      setError("ID du bon de commande manquant");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/detail-bon-commande/${id}/`);
      setBonCommande(response.data);
      setNumeroBonCommande(response.data.numero);

      // Récupérer tous les produits du fournisseur
      const productsResponse = await axios.get(
        `/api/products-by-fournisseur/?fournisseur=${encodeURIComponent(
          response.data.fournisseur
        )}${codeRangeFilter ? `&code_range=${codeRangeFilter}` : ""}`
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
      setError("Erreur lors du chargement du bon de commande. Vérifiez que l'ID est correct.");
    } finally {
      setIsLoading(false);
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
      // Capturer l'ancien numéro avant la mise à jour
      const oldNumeroBonCommande = bonCommande?.numero || null;
      
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

      const response = await axios.patch(`/api/update-bon-commande/${id}/`, updatedBC);
      
      // Régénérer le PDF avec gestion de l'historique si le numéro a changé
      if (oldNumeroBonCommande && numeroBonCommande && oldNumeroBonCommande !== numeroBonCommande) {
        try {
          console.log('🔄 Régénération du PDF du bon de commande modifié...');
          const pdfResponse = await axios.post(
            `/api/bon-commande/${id}/regenerate-pdf/`,
            { old_numero_bon_commande: oldNumeroBonCommande }
          );
          if (pdfResponse.data.success) {
            console.log('✅ PDF régénéré avec succès:', pdfResponse.data.message);
            if (pdfResponse.data.conflict_detected) {
              console.log('📦 Ancien PDF déplacé vers Historique');
            }
            alert("Bon de commande mis à jour et PDF régénéré avec succès !");
          } else {
            console.warn('⚠️ Erreur lors de la régénération du PDF:', pdfResponse.data.error);
            alert("Bon de commande mis à jour, mais erreur lors de la régénération du PDF.");
          }
        } catch (pdfError) {
          console.warn('⚠️ Erreur lors de la régénération du PDF:', pdfError);
          alert("Bon de commande mis à jour, mais erreur lors de la régénération du PDF.");
        }
      } else {
        // Si le numéro n'a pas changé, utiliser l'ancienne méthode
        try {
          const pdfResult = await generatePDFDrive(
            "bon_commande",
            {
              bonCommandeId: id,
              chantierId: bonCommande.chantier,
              chantierName: bonCommande.chantier_name || "Chantier",
              societeName: bonCommande.societe_name || "Société par défaut",
              numeroBonCommande: numeroBonCommande,
              fournisseurName: bonCommande.fournisseur,
            },
            {
              onSuccess: (response) => {
                console.log("✅ PDF généré et stocké dans le Drive:", response);
                alert("Bon de commande mis à jour et PDF généré avec succès !");
                // Ne pas rediriger ici - la redirection se fait après, seulement si pas de conflit
              },
              onError: (error) => {
                console.error("❌ Erreur lors de la génération du PDF:", error);
                alert("Bon de commande mis à jour, mais erreur lors de la génération du PDF.");
                // Ne pas rediriger ici - la redirection se fait après, seulement si pas de conflit
              },
            }
          );
          
          // Si un conflit est détecté, ne pas rediriger (le modal reste ouvert)
          if (pdfResult && pdfResult.conflict_detected) {
            console.log("⚠️ Conflit détecté - le modal de conflit est affiché. Attente de la résolution par l'utilisateur.");
            // Ne pas rediriger - l'utilisateur doit résoudre le conflit via le modal
            return;
          }
        } catch (pdfError) {
          console.error("Erreur lors de la génération du PDF:", pdfError);
          // Si l'erreur est un conflit, ne pas rediriger
          if (pdfError.response && pdfError.response.status === 409) {
            console.log("⚠️ Conflit détecté via erreur - le modal de conflit est affiché.");
            return;
          }
          alert("Bon de commande mis à jour, mais erreur lors de la génération du PDF.");
        }
      }
      
      // Rediriger uniquement si aucun conflit n'a été détecté
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

  // Affichage des états de chargement et d'erreur
  if (isLoading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <Typography>Chargement du bon de commande...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', minHeight: '200px' }}>
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          ID reçu: {id || 'Aucun'}
        </Typography>
      </Box>
    );
  }

  if (!bonCommande) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <Typography>Aucun bon de commande trouvé</Typography>
      </Box>
    );
  }

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
          <Box sx={{ display: "flex", gap: 2, alignItems: "center" }}>
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
              sx={{ width: 250 }}
            />
            <TextField
              select
              size="small"
              label="Plage de codes"
              variant="outlined"
              value={codeRangeFilter}
              onChange={(e) => setCodeRangeFilter(e.target.value)}
              sx={{ width: 150 }}
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
          </Box>
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
              onClick={async () => {
                try {
                  await generatePDFDrive(
                    "bon_commande",
                    {
                      bonCommandeId: id,
                      chantierId: bonCommande.chantier,
                      chantierName: bonCommande.chantier_name || "Chantier",
                      societeName: bonCommande.societe_name || "Société par défaut",
                      numeroBonCommande: numeroBonCommande,
                      fournisseurName: bonCommande.fournisseur,
                    },
                    {
                      onSuccess: (response) => {
                        console.log("✅ PDF généré et stocké dans le Drive:", response);
                      },
                      onError: (error) => {
                        console.error("❌ Erreur lors de la génération du PDF:", error);
                      },
                    }
                  );
                } catch (error) {
                  console.error("Erreur lors de la génération du PDF:", error);
                }
              }}
              variant="outlined"
              color="secondary"
              disabled={!bonCommande}
            >
              Générer PDF Drive
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
