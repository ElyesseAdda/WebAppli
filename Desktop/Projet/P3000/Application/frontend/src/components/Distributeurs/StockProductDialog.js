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
  MdDelete,
  MdTextFields,
} from "react-icons/md";

const StockProductDialog = ({
  open,
  onClose,
  product,
  onSave,
}) => {
  const [tabValue, setTabValue] = useState(0); // 0: Nom, 1: Image
  const [nom, setNom] = useState("");
  const [nomProduit, setNomProduit] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePosition, setImagePosition] = useState("center");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (product) {
      setNom(product.nom || "");
      setNomProduit(product.nom_produit || "");
      setImageUrl(product.image_display_url || product.image_url || "");
      setImagePosition(product.image_position || "center");
      if (product.image_url || product.image_display_url) {
        setTabValue(1);
      }
    } else {
      setNom("");
      setNomProduit("");
      setImageUrl("");
      setImagePosition("center");
      setTabValue(0);
    }
  }, [product, open]);

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
        console.warn("Aucun produit trouvé:", response.data.error);
      }
    } catch (error) {
      console.error("Erreur recherche produits:", error);
      setSearchResults([]);
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
    setNom(product.name);
    setSelectedImage(product);
    setTabValue(1);
  };

  const handleSave = () => {
    // Validation : au moins un nom doit être fourni
    if (!nom.trim() && !nomProduit.trim() && !imageUrl.trim()) {
      alert("Veuillez entrer un nom ou sélectionner une image");
      return;
    }

    const productData = {
      nom: nom.trim() || nomProduit.trim() || "Produit sans nom",
      nom_produit: tabValue === 0 && nomProduit.trim() ? nomProduit.trim() : null,
      image_url: tabValue === 1 && imageUrl.trim() ? imageUrl.trim() : null,
      image_s3_key: null,
      image_position: imagePosition,
      quantite: product?.quantite || 0,
    };

    onSave(productData);
    onClose();
  };

  const handleDelete = () => {
    if (product && product.id) {
      if (window.confirm("Êtes-vous sûr de vouloir supprimer ce produit ?")) {
        axios.delete(`/api/stock-products/${product.id}/`).then(() => {
          onSave(null); // Indiquer que le produit a été supprimé
          onClose();
        });
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={window.innerWidth < 600}
      PaperProps={{
        sx: {
          borderRadius: window.innerWidth < 600 ? "24px 24px 0 0" : "28px",
        }
      }}
    >
      <DialogTitle sx={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        pt: 3
      }}>
        <Typography variant="h6" sx={{ fontWeight: 800, fontSize: "1.25rem" }}>
          {product ? "Modifier le produit" : "Nouveau produit"}
        </Typography>
        <IconButton onClick={onClose} size="small" sx={{ bgcolor: "action.hover" }}>
          <MdClose />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 2.5 }}>
        {/* Nom principal */}
        <Box sx={{ mb: 4, mt: 1 }}>
          <TextField
            label="Nom du produit *"
            placeholder="Ex: Coca Cola, Chips Lays..."
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            fullWidth
            autoFocus
            required
            variant="outlined"
            InputProps={{
              sx: { borderRadius: "16px", fontWeight: 600 }
            }}
          />
        </Box>

        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          sx={{ 
            mb: 3, 
            bgcolor: "grey.50", 
            borderRadius: "14px",
            p: 0.5,
            minHeight: 48,
            "& .MuiTabs-indicator": {
              display: "none"
            },
            "& .MuiTab-root": {
              minHeight: 40,
              borderRadius: "10px",
              textTransform: "none",
              fontWeight: 700,
              flex: 1,
              "&.Mui-selected": {
                bgcolor: "background.paper",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                color: "primary.main"
              }
            }
          }}
        >
          <Tab
            icon={<MdTextFields size={18} />}
            label="Design"
            iconPosition="start"
          />
          <Tab
            icon={<MdImage size={18} />}
            label="Image"
            iconPosition="start"
          />
        </Tabs>

        {tabValue === 0 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <TextField
              label="Initiales (automatiques si vide)"
              placeholder="Ex: CC"
              value={nomProduit}
              onChange={(e) => setNomProduit(e.target.value)}
              fullWidth
              InputProps={{
                sx: { borderRadius: "16px" }
              }}
            />
            <Box
              sx={{
                p: 3,
                bgcolor: "primary.50",
                borderRadius: "24px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                border: "2px dashed",
                borderColor: "primary.light"
              }}
            >
              <Typography variant="caption" sx={{ mb: 2, fontWeight: 700, color: "primary.main", textTransform: "uppercase" }}>
                Aperçu de l'icône
              </Typography>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  borderRadius: "24px",
                  bgcolor: "primary.main",
                  color: "white",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 8px 16px rgba(25, 118, 210, 0.2)"
                }}
              >
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 900 }}
                >
                  {nomProduit ? nomProduit.slice(0, 2).toUpperCase() : (nom ? nom.charAt(0).toUpperCase() : "?")}
                </Typography>
              </Box>
            </Box>
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3, minWidth: 0 }}>
            {/* Recherche Open Food Facts */}
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 800, color: "text.secondary" }}>
                Rechercher une image (Open Food Facts)
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField
                  placeholder="Ex: Coca Cola..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearchProducts()}
                  fullWidth
                  size="medium"
                  InputProps={{
                    sx: { borderRadius: "14px" }
                  }}
                />
                <Button
                  variant="contained"
                  onClick={handleSearchProducts}
                  disabled={searching || !searchTerm.trim()}
                  sx={{ minWidth: 56, borderRadius: "14px" }}
                >
                  {searching ? <CircularProgress size={24} color="inherit" /> : <MdSearch size={24} />}
                </Button>
              </Box>

              {/* Résultats de recherche - Horizontal scroll (mobile + desktop) */}
              {searchResults.length > 0 && (
                <Box 
                  sx={{ 
                    mt: 2, 
                    display: "flex", 
                    gap: 1.5, 
                    overflowX: "auto",
                    overflowY: "hidden",
                    maxWidth: "100%",
                    minWidth: 0,
                    pb: 1,
                    px: 0.5,
                    WebkitOverflowScrolling: "touch",
                    "&::-webkit-scrollbar": { height: 8 },
                    "&::-webkit-scrollbar-track": { bgcolor: "grey.200", borderRadius: 4 },
                    "&::-webkit-scrollbar-thumb": { bgcolor: "grey.400", borderRadius: 4 }
                  }}
                >
                  {searchResults.map((p, index) => (
                    <Card
                      key={p.code || index}
                      onClick={() => handleSelectProduct(p)}
                      elevation={0}
                      sx={{
                        minWidth: 120,
                        width: 120,
                        borderRadius: "16px",
                        border: "2px solid",
                        borderColor: imageUrl === p.image_url ? "primary.main" : "divider",
                        transition: "all 0.2s",
                        flexShrink: 0
                      }}
                    >
                      <CardActionArea sx={{ p: 1 }}>
                        <Box sx={{ height: 80, display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
                          <img 
                            src={p.image_url} 
                            style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} 
                          />
                        </Box>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: "block", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {p.name}
                        </Typography>
                      </CardActionArea>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>

            {/* URL image manuelle */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 800, color: "text.secondary" }}>
                Ou URL directe
              </Typography>
              <TextField
                placeholder="https://..."
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                fullWidth
                InputProps={{
                  sx: { borderRadius: "14px" }
                }}
              />
            </Box>

            {imageUrl && (
              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: "20px", border: "1px solid", borderColor: "divider" }}>
                <Typography variant="caption" sx={{ fontWeight: 700, mb: 1.5, display: "block", textAlign: "center", color: "text.secondary" }}>
                  Aperçu de l'image
                </Typography>
                <Box sx={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img src={imageUrl} style={{ maxHeight: "100%", maxWidth: "100%", objectFit: "contain" }} />
                </Box>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        {product && (
          <IconButton
            onClick={handleDelete}
            sx={{ bgcolor: "error.light", color: "error.main", borderRadius: "14px", width: 48, height: 48 }}
          >
            <MdDelete size={24} />
          </IconButton>
        )}
        <Box sx={{ flex: 1 }} />
        <Button 
          onClick={onClose} 
          sx={{ borderRadius: "14px", fontWeight: 700, textTransform: "none" }}
        >
          Annuler
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!nom.trim()}
          sx={{ 
            borderRadius: "14px", 
            minHeight: 48, 
            px: 4, 
            fontWeight: 800, 
            textTransform: "none",
            boxShadow: "0 6px 16px rgba(25, 118, 210, 0.2)"
          }}
        >
          {product ? "Enregistrer" : "Créer le produit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default StockProductDialog;
