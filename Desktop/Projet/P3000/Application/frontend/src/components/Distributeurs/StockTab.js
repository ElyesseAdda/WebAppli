import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Box,
  Typography,
  TextField,
  Card,
  CardContent,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  InputAdornment,
  Chip,
  Fab,
  LinearProgress,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  MdAdd,
  MdRemove,
  MdSearch,
  MdInventory,
  MdShoppingCart,
  MdEdit,
  MdHistory,
  MdClose,
  MdLocationOn,
  MdExpandMore,
  MdExpandLess,
  MdSettings,
  MdChevronRight,
} from "react-icons/md";
import StockProductDialog from "./StockProductDialog";
import CreatePurchaseDialog from "./CreatePurchaseDialog";
import StockLotEditDialog from "./StockLotEditDialog";

const StockTab = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [openQuantityDialog, setOpenQuantityDialog] = useState(false);
  const [quantity, setQuantity] = useState("");
  const [actionType, setActionType] = useState("add"); // "add" or "remove"
  const [prixUnitaire, setPrixUnitaire] = useState(""); // optionnel pour ajout manuel (création lot)
  const [isPerte, setIsPerte] = useState(false); // pour retrait : perte (casse, vol...)
  const [commentairePerte, setCommentairePerte] = useState("");
  const [openProductDialog, setOpenProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [openPurchaseDialog, setOpenPurchaseDialog] = useState(false);
  const [purchases, setPurchases] = useState([]);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState(null);
  const [openPurchasesList, setOpenPurchasesList] = useState(false);
  const [purchaseSearchTerm, setPurchaseSearchTerm] = useState("");
  const [openLotEditDialog, setOpenLotEditDialog] = useState(false);
  const [productForLots, setProductForLots] = useState(null);

  useEffect(() => {
    fetchProducts();
    fetchPurchases();
  }, []);

  const fetchProducts = async (forceRefresh = false) => {
    try {
      const url = forceRefresh 
        ? `/api/stock-products/?_t=${Date.now()}`
        : "/api/stock-products/";
      const response = await axios.get(url, {
        headers: forceRefresh ? { 'Cache-Control': 'no-cache' } : {}
      });
      const productsData = response.data.results || response.data;
      const normalizedProducts = Array.isArray(productsData) 
        ? productsData.map(p => ({ ...p, quantite: parseInt(p.quantite) || 0 }))
        : productsData;
      setProducts(normalizedProducts);
    } catch (error) {
      console.error("Erreur chargement produits:", error);
    }
  };

  const fetchPurchases = async (forceRefresh = false) => {
    try {
      const url = forceRefresh 
        ? `/api/stock-purchases/?_t=${Date.now()}`
        : "/api/stock-purchases/";
      const response = await axios.get(url);
      const data = response.data.results || response.data;
      setPurchases(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erreur chargement achats:", error);
    }
  };

  // Achats filtrés (recherche par jour ou lieu), triés du plus récent en haut
  const filteredPurchases = React.useMemo(() => {
    const term = purchaseSearchTerm.trim().toLowerCase();
    if (!term) return purchases;
    return purchases.filter((p) => {
      const dateStr = new Date(p.date_achat).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).toLowerCase();
      const lieu = (p.lieu_achat || "").toLowerCase();
      return dateStr.includes(term) || lieu.includes(term);
    });
  }, [purchases, purchaseSearchTerm]);

  // Meilleur prix par produit (prix min + lieu d'achat), clé = nom produit (normalisé minuscules pour match)
  const bestPriceByProduct = React.useMemo(() => {
    const map = {};
    purchases.forEach((p) => {
      (p.items || []).forEach((item) => {
        const nom = (item.nom_produit || item.produit_nom || "Sans nom").trim();
        const nomKey = nom.toLowerCase();
        const prix = parseFloat(item.prix_unitaire);
        const lieu = item.lieu_achat || p.lieu_achat || "—";
        if (!map[nomKey] || prix < map[nomKey].prix) {
          map[nomKey] = { prix, lieu, nom };
        }
      });
    });
    return map;
  }, [purchases]);

  const getBestPriceForProduct = (product) => {
    if (!product?.nom) return null;
    const key = product.nom.trim().toLowerCase();
    return bestPriceByProduct[key] || null;
  };

  const filteredProducts = products.filter((product) => {
    const search = searchTerm.toLowerCase();
    return (
      (product.nom && product.nom.toLowerCase().includes(search)) ||
      (product.nom_produit && product.nom_produit.toLowerCase().includes(search))
    );
  });

  const handleOpenQuantityDialog = (product, type) => {
    setSelectedProduct(product);
    setActionType(type);
    setQuantity("");
    setPrixUnitaire("");
    setIsPerte(false);
    setCommentairePerte("");
    setOpenQuantityDialog(true);
  };

  const handleCloseQuantityDialog = () => {
    setOpenQuantityDialog(false);
    setSelectedProduct(null);
    setQuantity("");
    setPrixUnitaire("");
    setIsPerte(false);
    setCommentairePerte("");
  };

  const handleQuantityAction = async () => {
    if (!selectedProduct || !quantity || parseInt(quantity) <= 0) {
      alert("Veuillez entrer une quantité valide");
      return;
    }

    try {
      const endpoint =
        actionType === "add"
          ? `/api/stock-products/${selectedProduct.id}/add_quantity/`
          : `/api/stock-products/${selectedProduct.id}/remove_quantity/`;

      const payload = { quantite: parseInt(quantity) };
      if (actionType === "add") {
        const prix = prixUnitaire.trim().replace(",", ".");
        if (prix !== "" && !isNaN(parseFloat(prix)) && parseFloat(prix) >= 0) {
          payload.prix_unitaire = parseFloat(prix);
        }
      } else {
        payload.is_perte = !!isPerte;
        if (isPerte && commentairePerte.trim()) payload.commentaire = commentairePerte.trim();
      }

      await axios.post(endpoint, payload);

      handleCloseQuantityDialog();
      fetchProducts();
    } catch (error) {
      console.error("Erreur modification stock:", error);
      alert(
        error.response?.data?.error ||
          `Erreur lors du ${actionType === "add" ? "ajout" : "retrait"} du stock`
      );
    }
  };

  const handleOpenProductDialog = (product = null) => {
    setEditingProduct(product);
    setOpenProductDialog(true);
  };

  const handleCloseProductDialog = () => {
    setOpenProductDialog(false);
    setEditingProduct(null);
  };

  const handleSaveProduct = async (productData) => {
    if (productData === null) {
      // Produit supprimé
      fetchProducts();
      return;
    }

    try {
      if (editingProduct && editingProduct.id) {
        // Mise à jour
        await axios.put(`/api/stock-products/${editingProduct.id}/`, productData);
      } else {
        // Création
        await axios.post("/api/stock-products/", productData);
      }
      handleCloseProductDialog();
      fetchProducts();
    } catch (error) {
      console.error("Erreur sauvegarde produit:", error);
      if (error.response?.data) {
        alert(`Erreur: ${JSON.stringify(error.response.data)}`);
      }
    }
  };

  return (
    <Box
      sx={{
        width: "100%",
        minHeight: "100vh",
        bgcolor: "background.default",
        pb: 12, // Espace pour la navigation flottante
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2.5,
          bgcolor: "background.paper",
          borderBottom: "1px solid",
          borderColor: "divider",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography
            variant="h5"
            sx={{ 
              fontWeight: 800, 
              letterSpacing: "-0.5px",
              color: "text.primary" 
            }}
          >
            Stock Central
          </Typography>
          <IconButton 
            onClick={() => fetchProducts()}
            sx={{ bgcolor: "action.hover", borderRadius: "12px" }}
          >
            <MdInventory size={22} color="#666" />
          </IconButton>
        </Box>

        {/* Recherche */}
        <TextField
          fullWidth
          placeholder="Rechercher un produit..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="medium"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MdSearch size={24} color="#999" />
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "16px",
              bgcolor: "grey.50",
              "& fieldset": { borderColor: "transparent" },
              "&:hover fieldset": { borderColor: "grey.300" },
              "&.Mui-focused fieldset": { borderColor: "primary.main" },
            },
          }}
        />
      </Box>

      {/* Liste des produits - Modern Grid */}
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        {filteredProducts.length === 0 ? (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              opacity: 0.5
            }}
          >
            <Box 
              sx={{ 
                width: 80, 
                height: 80, 
                borderRadius: "50%", 
                bgcolor: "action.hover",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 1
              }}
            >
              <MdInventory size={40} />
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {searchTerm ? "Aucun produit correspondant" : "Stock vide"}
            </Typography>
          </Box>
        ) : (
          filteredProducts.map((product) => {
            // Seuil de stock bas arbitraire pour le visuel
            const lowStockThreshold = 10;
            const stockPercentage = Math.min((product.quantite / 50) * 100, 100); // 50 est le max pour la jauge
            
            return (
              <Card
                key={product.id}
                elevation={0}
                sx={{
                  borderRadius: "28px",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  overflow: "hidden",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:active": { transform: "scale(0.97)" },
                  boxShadow: "0 4px 20px rgba(0,0,0,0.03)"
                }}
              >
                <Box sx={{ p: 2.5 }}>
                  <Box sx={{ display: "flex", gap: 2.5, alignItems: "center", mb: 2.5 }}>
                    {/* Avatar / Image modernisé */}
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: "22px",
                        bgcolor: product.image_display_url || product.image_url ? "white" : "primary.light",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        overflow: "hidden",
                        border: "1px solid",
                        borderColor: "divider",
                        flexShrink: 0,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
                      }}
                      onClick={() => handleOpenProductDialog(product)}
                    >
                      {product.image_display_url || product.image_url ? (
                        <img
                          src={product.image_display_url || product.image_url}
                          alt={product.nom}
                          style={{
                            width: "85%",
                            height: "85%",
                            objectFit: "contain",
                            objectPosition: product.image_position || "center",
                          }}
                        />
                      ) : (
                        <Typography
                          variant="h4"
                          sx={{ fontWeight: 900, color: "primary.main" }}
                        >
                          {product.nom ? product.nom.charAt(0).toUpperCase() : "?"}
                        </Typography>
                      )}
                    </Box>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 900,
                            fontSize: "1.15rem",
                            lineHeight: 1.2,
                            mb: 0.5,
                            color: "text.primary",
                            letterSpacing: "-0.5px"
                          }}
                        >
                          {product.nom}
                        </Typography>
                        <IconButton 
                          size="small"
                          onClick={() => handleOpenProductDialog(product)}
                          sx={{ bgcolor: "primary.50", color: "primary.main", borderRadius: "10px", ml: 1 }}
                        >
                          <MdEdit size={18} />
                        </IconButton>
                      </Box>
                      
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                        <Typography variant="h4" sx={{ 
                          fontWeight: 950, 
                          color: product.quantite === 0 ? "error.main" : product.quantite <= lowStockThreshold ? "warning.main" : "primary.main",
                          textShadow: "0 2px 4px rgba(0,0,0,0.05)"
                        }}>
                          {product.quantite}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", mt: 1, textTransform: "uppercase", fontSize: "0.6rem" }}>
                          UNITÉS EN STOCK
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  {/* Jauge de stock */}
                  <Box sx={{ mb: 2, p: 2, bgcolor: "grey.50", borderRadius: "16px" }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 800, color: "text.secondary", fontSize: "0.65rem", textTransform: "uppercase" }}>
                        Niveau de réserve
                      </Typography>
                      <Box sx={{ 
                        px: 1, 
                        py: 0.2, 
                        borderRadius: "6px", 
                        bgcolor: product.quantite <= lowStockThreshold ? "error.50" : "success.50",
                        color: product.quantite <= lowStockThreshold ? "error.main" : "success.main"
                      }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, fontSize: "0.6rem" }}>
                          {product.quantite <= lowStockThreshold ? "ALERTE STOCK" : "STOCK OPTIMAL"}
                        </Typography>
                      </Box>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={stockPercentage} 
                      sx={{ 
                        height: 10, 
                        borderRadius: 5,
                        bgcolor: "white",
                        border: "1px solid",
                        borderColor: "divider",
                        "& .MuiLinearProgress-bar": {
                          borderRadius: 5,
                          bgcolor: product.quantite <= lowStockThreshold ? "error.main" : "success.main",
                        }
                      }} 
                    />
                  </Box>

                  {/* Quick Controls */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 1.5,
                      mt: 2
                    }}
                  >
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => handleOpenQuantityDialog(product, "remove")}
                      disabled={product.quantite === 0}
                      sx={{ 
                        borderRadius: "14px", 
                        textTransform: "none", 
                        fontWeight: 800,
                        borderColor: "error.light",
                        color: "error.main",
                        py: 1.2,
                        bgcolor: "error.50",
                        "&:hover": { bgcolor: "error.100", borderColor: "error.main" }
                      }}
                    >
                      Sortie
                    </Button>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => handleOpenQuantityDialog(product, "add")}
                      sx={{ 
                        borderRadius: "14px", 
                        textTransform: "none", 
                        fontWeight: 800,
                        boxShadow: "0 6px 16px rgba(46, 125, 50, 0.25)",
                        py: 1.2,
                        bgcolor: "success.main",
                        "&:hover": { bgcolor: "success.dark" }
                      }}
                    >
                      Entrée
                    </Button>
                  </Box>
                  <Button
                    fullWidth
                    variant="outlined"
                    size="small"
                    startIcon={<MdSettings size={18} />}
                    endIcon={<MdChevronRight size={18} />}
                    onClick={() => {
                      setProductForLots(product);
                      setOpenLotEditDialog(true);
                    }}
                    sx={{
                      mt: 1,
                      textTransform: "none",
                      fontWeight: 700,
                      color: "text.primary",
                      fontSize: "0.75rem",
                      borderRadius: "12px",
                      borderColor: "divider",
                      py: 0.8,
                      bgcolor: "grey.50",
                      display: "flex",
                      justifyContent: "space-between",
                      px: 2,
                      "&:active": { transform: "scale(0.98)" }
                    }}
                  >
                    Modifier les lots (prix / qté)
                  </Button>
                  {/* Meilleur prix (discret) */}
                  {getBestPriceForProduct(product) && (
                    <Box
                      sx={{
                        mt: 1.5,
                        pt: 1.5,
                        borderTop: "1px solid",
                        borderColor: "divider",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "text.secondary", fontSize: "0.7rem", fontWeight: 600 }}>
                        Meilleur prix: {Number(getBestPriceForProduct(product).prix).toFixed(2)} €/u
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                        <MdLocationOn size={12} style={{ color: "#999" }} />
                        <Typography variant="caption" sx={{ color: "text.disabled", fontSize: "0.65rem" }}>
                          {getBestPriceForProduct(product).lieu}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Footer info */}
                  <Typography variant="caption" sx={{ display: "block", textAlign: "center", mt: 2, color: "text.disabled", fontSize: "0.65rem" }}>
                    Dernière mise à jour: {new Date(product.updated_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </Typography>
                </Box>
              </Card>
            );
          })
        )}
      </Box>

      {/* Dialog plein écran : Liste des achats (ouvert au clic sur le FAB achat) */}
      <Dialog
        open={openPurchasesList}
        onClose={() => {
          setOpenPurchasesList(false);
          setPurchaseSearchTerm("");
          setExpandedPurchaseId(null);
        }}
        fullScreen
        PaperProps={{
          sx: {
            bgcolor: "background.default",
            backgroundImage: "none",
          },
        }}
      >
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          {/* Header de la liste des achats */}
          <Box
            sx={{
              p: 2.5,
              bgcolor: "background.paper",
              borderBottom: "1px solid",
              borderColor: "divider",
              flexShrink: 0,
              pt: 3
            }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2.5 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <IconButton 
                  onClick={() => setOpenPurchasesList(false)} 
                  sx={{ bgcolor: "action.hover", borderRadius: "12px", width: 40, height: 40 }}
                >
                  <MdClose size={22} />
                </IconButton>
                <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: "-0.5px" }}>
                  Historique Achats
                </Typography>
              </Box>
              <Button
                variant="contained"
                size="small"
                startIcon={<MdAdd size={20} />}
                onClick={() => setOpenPurchaseDialog(true)}
                sx={{
                  borderRadius: "12px",
                  fontWeight: 800,
                  textTransform: "none",
                  px: 2,
                  boxShadow: "0 4px 12px rgba(25, 118, 210, 0.2)",
                }}
              >
                Nouveau
              </Button>
            </Box>

            <TextField
              fullWidth
              placeholder="Lieu, date ou produit..."
              value={purchaseSearchTerm}
              onChange={(e) => setPurchaseSearchTerm(e.target.value)}
              size="medium"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MdSearch size={22} color="#999" />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: "16px",
                  bgcolor: "grey.50",
                  "& fieldset": { borderColor: "transparent" },
                  "&:hover fieldset": { borderColor: "grey.200" },
                  "&.Mui-focused fieldset": { borderColor: "primary.main" },
                },
              }}
            />
          </Box>

          {/* Corps de la liste */}
          <Box sx={{ flex: 1, overflow: "auto", p: 2, pb: 4 }}>
            {filteredPurchases.length === 0 ? (
              <Box sx={{ py: 8, textAlign: "center", opacity: 0.5 }}>
                <MdShoppingCart size={48} style={{ marginBottom: 16 }} />
                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                  {purchaseSearchTerm.trim() ? "Aucun achat trouvé" : "Aucun achat enregistré"}
                </Typography>
              </Box>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {filteredPurchases.map((p) => {
                  const isExpanded = expandedPurchaseId === p.id;
                  const items = p.items || [];
                  const dateAchat = new Date(p.date_achat);
                  
                  return (
                    <Card
                      key={p.id}
                      elevation={0}
                      sx={{
                        borderRadius: "24px",
                        border: "1px solid",
                        borderColor: isExpanded ? "primary.main" : "divider",
                        bgcolor: "background.paper",
                        overflow: "hidden",
                        transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                        boxShadow: isExpanded ? "0 8px 24px rgba(0,0,0,0.08)" : "0 2px 8px rgba(0,0,0,0.02)"
                      }}
                    >
                      <Box
                        onClick={() => setExpandedPurchaseId(isExpanded ? null : p.id)}
                        sx={{
                          p: 2,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          cursor: "pointer",
                          "&:active": { bgcolor: "action.hover" },
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          <Box sx={{ 
                            width: 44, 
                            height: 44, 
                            borderRadius: "14px", 
                            bgcolor: isExpanded ? "primary.main" : "primary.light", 
                            color: isExpanded ? "white" : "primary.main",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            transition: "all 0.2s"
                          }}>
                            <MdShoppingCart size={22} />
                          </Box>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                              {p.lieu_achat || "Lieu inconnu"}
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                              {dateAchat.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })} • {dateAchat.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                            </Typography>
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: "right", display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Box>
                            <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "primary.main", lineHeight: 1 }}>
                              {Number(p.total).toFixed(2)} €
                            </Typography>
                            <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 700, fontSize: "0.6rem" }}>
                              {items.length} PRODUIT{items.length > 1 ? "S" : ""}
                            </Typography>
                          </Box>
                          {isExpanded ? <MdExpandLess size={24} color="#999" /> : <MdExpandMore size={24} color="#ccc" />}
                        </Box>
                      </Box>

                      {isExpanded && (
                        <Box sx={{ bgcolor: "grey.50", borderTop: "1px solid", borderColor: "divider", p: 2 }}>
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            {items.map((item, i) => (
                              <Box
                                key={item.id || i}
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  p: 1.5,
                                  bgcolor: "background.paper",
                                  borderRadius: "14px",
                                  border: "1px solid",
                                  borderColor: "divider",
                                }}
                              >
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: "primary.main" }} />
                                  <Box>
                                    <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                                      {item.nom_produit || item.produit_nom || "—"}
                                    </Typography>
                                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                                      Qté: {item.quantite} {item.unite || "u"}
                                    </Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ textAlign: "right" }}>
                                  <Typography variant="body2" sx={{ fontWeight: 800 }}>
                                    {Number(item.montant_total).toFixed(2)} €
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 600, fontSize: "0.65rem" }}>
                                    {Number(item.prix_unitaire).toFixed(2)} €/u
                                  </Typography>
                                </Box>
                              </Box>
                            ))}
                          </Box>
                        </Box>
                      )}
                    </Card>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>
      </Dialog>

      {/* Floating Action Buttons - Modern Stack */}
      <Box
        sx={{
          position: "fixed",
          bottom: 110,
          right: 24,
          zIndex: 999,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <Fab
          onClick={() => setOpenPurchasesList(true)}
          sx={{
            width: 60,
            height: 60,
            bgcolor: "primary.main",
            color: "white",
            boxShadow: "0 8px 24px rgba(25, 118, 210, 0.4)",
            "&:hover": { bgcolor: "primary.dark" },
          }}
        >
          <MdShoppingCart size={28} />
        </Fab>
        <Fab
          onClick={() => handleOpenProductDialog(null)}
          sx={{
            width: 60,
            height: 60,
            bgcolor: "white",
            color: "primary.main",
            border: "2px solid",
            borderColor: "primary.main",
            boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
            "&:hover": { bgcolor: "grey.50" },
          }}
        >
          <MdAdd size={32} />
        </Fab>
      </Box>

      {/* Dialog pour ajouter/retirer du stock */}
      <Dialog
        open={openQuantityDialog}
        onClose={handleCloseQuantityDialog}
        maxWidth="xs"
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{
          sx: {
            borderRadius: window.innerWidth < 600 ? "24px 24px 0 0" : "28px",
            position: window.innerWidth < 600 ? "fixed" : "relative",
            bottom: 0,
            margin: 0,
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 800, 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          pt: 3
        }}>
          {actionType === "add" ? "Ajouter du stock" : "Retirer du stock"}
          <IconButton onClick={handleCloseQuantityDialog} size="small" sx={{ bgcolor: "action.hover" }}>
            <MdClose />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pb: 4 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3, p: 2, bgcolor: "grey.50", borderRadius: "20px" }}>
            <Box
              sx={{
                width: 50,
                height: 50,
                borderRadius: "14px",
                bgcolor: "background.paper",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden"
              }}
            >
              {selectedProduct?.image_display_url || selectedProduct?.image_url ? (
                <img
                  src={selectedProduct.image_display_url || selectedProduct.image_url}
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              ) : (
                <MdInventory size={24} color="#ccc" />
              )}
            </Box>
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                {selectedProduct?.nom}
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                Stock actuel : {selectedProduct?.quantite}
              </Typography>
            </Box>
          </Box>

          <TextField
            fullWidth
            label="Quantité"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            inputProps={{ min: 1 }}
            autoFocus
            variant="filled"
            InputProps={{
              disableUnderline: true,
              sx: {
                borderRadius: "20px",
                bgcolor: "grey.100",
                fontSize: "1.5rem",
                fontWeight: 800,
                "& input": { textAlign: "center", py: 2 }
              }
            }}
          />

          {actionType === "add" && (
            <TextField
              fullWidth
              label="Prix unitaire (€) — optionnel (ajustement manuel)"
              type="number"
              value={prixUnitaire}
              onChange={(e) => setPrixUnitaire(e.target.value)}
              inputProps={{ min: 0, step: 0.01 }}
              variant="filled"
              sx={{ mt: 2 }}
              InputProps={{
                disableUnderline: true,
                sx: { borderRadius: "20px", bgcolor: "grey.100" }
              }}
              helperText="Si renseigné, un lot sera créé pour le suivi FIFO."
            />
          )}

          {actionType === "remove" && (
            <>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isPerte}
                    onChange={(e) => setIsPerte(e.target.checked)}
                    color="primary"
                  />
                }
                label="C'est une perte (casse, vol, péremption…)"
                sx={{ mt: 2, display: "block" }}
              />
              {isPerte && (
                <TextField
                  fullWidth
                  label="Commentaire (optionnel)"
                  value={commentairePerte}
                  onChange={(e) => setCommentairePerte(e.target.value)}
                  placeholder="Ex: casse, vol..."
                  variant="filled"
                  size="small"
                  sx={{ mt: 1 }}
                  InputProps={{
                    disableUnderline: true,
                    sx: { borderRadius: "16px", bgcolor: "grey.100" }
                  }}
                />
              )}
            </>
          )}
          
          {actionType === "remove" && selectedProduct && (
            <Box sx={{ mt: 2, textAlign: "center" }}>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: parseInt(quantity) > selectedProduct.quantite ? "error.main" : "text.secondary",
                }}
              >
                {parseInt(quantity) > selectedProduct.quantite
                  ? "⚠️ Stock insuffisant"
                  : `Nouveau stock estimé : ${selectedProduct.quantite - (parseInt(quantity) || 0)}`}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 0 }}>
          <Button
            fullWidth
            variant="contained"
            onClick={handleQuantityAction}
            disabled={
              !quantity ||
              parseInt(quantity) <= 0 ||
              (actionType === "remove" &&
                selectedProduct &&
                parseInt(quantity) > selectedProduct.quantite)
            }
            sx={{ 
              borderRadius: "18px", 
              minHeight: 56,
              fontSize: "1.1rem",
              fontWeight: 800,
              textTransform: "none",
              boxShadow: "0 8px 20px rgba(25, 118, 210, 0.3)"
            }}
          >
            Confirmer {actionType === "add" ? "l'ajout" : "le retrait"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog pour créer/modifier un produit */}
      <StockProductDialog
        open={openProductDialog}
        onClose={handleCloseProductDialog}
        product={editingProduct}
        onSave={handleSaveProduct}
      />

      {/* Dialog modifier les lots d'un produit (prix unitaire, quantité restante) */}
      <StockLotEditDialog
        open={openLotEditDialog}
        onClose={() => {
          setOpenLotEditDialog(false);
          setProductForLots(null);
        }}
        product={productForLots}
        onSaved={() => fetchProducts(true)}
      />

      {/* Dialog pour créer un achat */}
      <CreatePurchaseDialog
        open={openPurchaseDialog}
        onClose={() => setOpenPurchaseDialog(false)}
        onSave={async (purchaseData) => {
          try {
            await axios.post("/api/stock-purchases/", purchaseData);
            setOpenPurchaseDialog(false);
            
            // Attendre un peu pour que le backend termine toutes les opérations
            await new Promise(resolve => setTimeout(resolve, 300));
            
            fetchProducts(true);
            fetchPurchases(true);
          } catch (error) {
            console.error("Erreur création achat:", error);
            alert(
              error.response?.data?.error ||
                "Erreur lors de l'enregistrement de l'achat"
            );
          }
        }}
        existingProducts={products}
      />
    </Box>
  );
};

export default StockTab;
