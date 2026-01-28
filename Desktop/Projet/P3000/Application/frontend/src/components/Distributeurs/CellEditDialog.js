import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Tabs,
  Tab,
  Box,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardActionArea,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from "@mui/material";
import {
  MdClose,
  MdSearch,
  MdImage,
  MdTextFields,
} from "react-icons/md";

const CellEditDialog = ({
  open,
  onClose,
  cell,
  distributeurId,
  rowIndex,
  colIndex,
  onSave,
}) => {
  const [tabValue, setTabValue] = useState(0); // 0: Nom, 1: Image
  const [nomProduit, setNomProduit] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePosition, setImagePosition] = useState("center");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (cell) {
      setNomProduit(cell.nom_produit || "");
      setImageUrl(cell.image_display_url || cell.image_url || "");
      setImagePosition(cell.image_position || "center");
      if (cell.image_url || cell.image_display_url) {
        setTabValue(1);
      }
    } else {
      setNomProduit("");
      setImageUrl("");
      setImagePosition("center");
      setTabValue(0);
    }
  }, [cell, open]);

  const handleSearchProducts = async () => {
    if (!searchTerm.trim()) return;
    
    setSearching(true);
    setSearchResults([]);
    try {
      const response = await axios.get("/api/distributeurs/search-products/", {
        params: { q: searchTerm },
      });
      const products = response.data.products || [];
      setSearchResults(products);
      
      if (products.length === 0 && response.data.error) {
        // Afficher un message si aucun résultat mais qu'il y a une erreur
        console.warn("Aucun produit trouvé:", response.data.error);
      }
    } catch (error) {
      console.error("Erreur recherche produits:", error);
      setSearchResults([]);
      // L'API retourne toujours un tableau products même en cas d'erreur
      if (error.response?.data?.products) {
        setSearchResults(error.response.data.products);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSelectProduct = (product) => {
    setImageUrl(product.image_url);
    setNomProduit(product.name);
    setSelectedImage(product);
    setTabValue(1);
  };

  const handleSave = () => {
    // Validation : au moins un nom ou une image doit être fourni
    if (tabValue === 0 && !nomProduit.trim()) {
      alert("Veuillez entrer un nom de produit");
      return;
    }
    if (tabValue === 1 && !imageUrl.trim()) {
      alert("Veuillez entrer une URL d'image ou sélectionner un produit");
      return;
    }

    // Préparer les données en s'assurant que les valeurs vides sont null
    const cellData = {
      distributeur: parseInt(distributeurId), // S'assurer que c'est un entier
      row_index: parseInt(rowIndex), // S'assurer que c'est un entier
      col_index: parseInt(colIndex), // S'assurer que c'est un entier
      nom_produit: tabValue === 0 && nomProduit.trim() ? nomProduit.trim() : null,
      image_url: tabValue === 1 && imageUrl.trim() ? imageUrl.trim() : null,
      image_s3_key: null, // Sera géré plus tard si upload
      image_position: imagePosition || 'center',
    };

    // Supprimer les clés avec valeur null pour éviter les problèmes
    Object.keys(cellData).forEach(key => {
      if (cellData[key] === null || cellData[key] === '') {
        // Garder null pour nom_produit et image_url car ils peuvent être null
        if (key !== 'nom_produit' && key !== 'image_url' && key !== 'image_s3_key') {
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
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ mb: 3, borderBottom: 1, borderColor: "divider" }}
        >
          <Tab
            icon={<MdTextFields size={20} />}
            label="Nom du produit"
            iconPosition="start"
          />
          <Tab
            icon={<MdImage size={20} />}
            label="Image"
            iconPosition="start"
          />
        </Tabs>

        {tabValue === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Nom du produit"
              placeholder="Ex: Chips Lays"
              value={nomProduit}
              onChange={(e) => setNomProduit(e.target.value)}
              fullWidth
              autoFocus
            />
            {nomProduit && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: "action.hover",
                  borderRadius: "12px",
                  textAlign: "center",
                }}
              >
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                  Aperçu (initiales)
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "primary.main",
                  }}
                >
                  {nomProduit
                    .split(" ")
                    .map((w) => w[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {/* Recherche Open Food Facts */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                Rechercher un produit (Open Food Facts)
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  placeholder="Ex: Coca Cola, Snickers, Mars..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleSearchProducts();
                    }
                  }}
                  fullWidth
                  size="small"
                />
                <Button
                  variant="contained"
                  onClick={handleSearchProducts}
                  disabled={searching || !searchTerm.trim()}
                  sx={{ minWidth: 44, minHeight: 44 }}
                >
                  {searching ? (
                    <CircularProgress size={20} />
                  ) : (
                    <MdSearch size={20} />
                  )}
                </Button>
              </Box>

              {/* Résultats de recherche */}
              {searchResults.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
                    Résultats ({searchResults.length})
                  </Typography>
                  <Grid container spacing={1}>
                    {searchResults.map((product, index) => (
                      <Grid item xs={6} sm={4} key={product.code || index}>
                        <Card
                          sx={{
                            cursor: "pointer",
                            transition: "transform 0.2s",
                            "&:hover": {
                              transform: "scale(1.05)",
                            },
                          }}
                        >
                          <CardActionArea onClick={() => handleSelectProduct(product)}>
                            {product.image_url ? (
                              <CardMedia
                                component="img"
                                image={product.image_url}
                                alt={product.name}
                                sx={{
                                  height: 100,
                                  objectFit: "contain",
                                  bgcolor: "background.default",
                                }}
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  height: 100,
                                  bgcolor: "action.hover",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <Typography variant="caption" color="text.secondary">
                                  Pas d'image
                                </Typography>
                              </Box>
                            )}
                            <Box sx={{ p: 1 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  display: "block",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  fontWeight: 600,
                                }}
                              >
                                {product.name}
                              </Typography>
                              {product.brand && (
                                <Typography variant="caption" color="text.secondary">
                                  {product.brand}
                                </Typography>
                              )}
                            </Box>
                          </CardActionArea>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              )}
              
              {/* Message si aucun résultat après recherche */}
              {!searching && searchTerm.trim() && searchResults.length === 0 && (
                <Box sx={{ mt: 2, p: 2, bgcolor: "action.hover", borderRadius: "12px", textAlign: "center" }}>
                  <Typography variant="body2" color="text.secondary">
                    Aucun produit trouvé pour "{searchTerm}"
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
                    Essayez avec un autre terme de recherche
                  </Typography>
                </Box>
              )}
            </Box>

            {/* URL image manuelle */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                Ou entrer une URL d'image
              </Typography>
              <TextField
                label="URL de l'image"
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                fullWidth
              />
            </Box>

            {/* Position de l'image */}
            {imageUrl && (
              <Box>
                <FormControl fullWidth>
                  <InputLabel>Position de l'image</InputLabel>
                  <Select
                    value={imagePosition}
                    label="Position de l'image"
                    onChange={(e) => setImagePosition(e.target.value)}
                  >
                    <MenuItem value="center">Centré</MenuItem>
                    <MenuItem value="top">Haut</MenuItem>
                    <MenuItem value="bottom">Bas</MenuItem>
                    <MenuItem value="left">Gauche</MenuItem>
                    <MenuItem value="right">Droite</MenuItem>
                  </Select>
                </FormControl>

                {/* Aperçu */}
                <Box
                  sx={{
                    mt: 2,
                    p: 2,
                    bgcolor: "action.hover",
                    borderRadius: "12px",
                    textAlign: "center",
                    minHeight: 150,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={imageUrl}
                    alt="Aperçu"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                      objectPosition: imagePosition,
                    }}
                    onError={(e) => {
                      e.target.style.display = "none";
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>
        )}
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
            disabled={
              tabValue === 0
                ? !nomProduit.trim()
                : !imageUrl.trim()
            }
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
