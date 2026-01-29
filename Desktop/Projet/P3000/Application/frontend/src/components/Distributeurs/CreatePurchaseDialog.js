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
  IconButton,
  Autocomplete,
  Chip,
  Divider,
  Card,
  CardContent,
} from "@mui/material";
import {
  MdClose,
  MdAdd,
  MdDelete,
  MdShoppingCart,
  MdInventory,
  MdStore,
  MdCalendarToday,
  MdRemove,
} from "react-icons/md";

const STORAGE_KEY = "stock_purchase_draft";

/** Retourne la date/heure actuelle en heure locale au format YYYY-MM-DDTHH:mm pour datetime-local */
function getLocalDatetimeString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

const CreatePurchaseDialog = ({ open, onClose, onSave, existingProducts = [] }) => {
  // Charger depuis localStorage au montage
  const loadDraft = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const draft = JSON.parse(saved);
        return {
          lieuAchat: draft.lieuAchat || "",
          dateAchat: draft.dateAchat || getLocalDatetimeString(),
          items: draft.items && draft.items.length > 0 
            ? draft.items 
            : [{
                produit_id: null,
                nom_produit: "",
                quantite: "",
                prix_unitaire: "",
        unite: "pièce",
        creer_produit: true, // Toujours mettre à jour le stock
              }],
        };
      }
    } catch (e) {
      console.error("Erreur chargement brouillon:", e);
    }
    return {
      lieuAchat: "",
      dateAchat: getLocalDatetimeString(),
      items: [{
        produit_id: null,
        nom_produit: "",
        quantite: "",
        prix_unitaire: "",
        unite: "pièce", // Toujours "pièce" par défaut
        creer_produit: true, // Toujours mettre à jour le stock
      }],
    };
  };

  const [lieuAchat, setLieuAchat] = useState("");
  const [dateAchat, setDateAchat] = useState(getLocalDatetimeString());
  const [items, setItems] = useState([
    {
      produit_id: null,
      nom_produit: "",
      quantite: "",
      prix_unitaire: "",
        unite: "pièce",
        creer_produit: true, // Toujours mettre à jour le stock
    },
  ]);
  const [expandedItems, setExpandedItems] = useState({}); // { index: true/false }

  // Charger le brouillon au montage
  useEffect(() => {
    const draft = loadDraft();
    setLieuAchat(draft.lieuAchat);
    setDateAchat(draft.dateAchat);
    setItems(draft.items);
  }, []);

  // À chaque ouverture du dialog : mettre la date d'achat à aujourd'hui (heure locale)
  useEffect(() => {
    if (open) {
      setDateAchat(getLocalDatetimeString());
    }
  }, [open]);

  // Sauvegarder dans localStorage à chaque changement
  useEffect(() => {
    const draft = {
      lieuAchat,
      dateAchat,
      items,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  }, [lieuAchat, dateAchat, items]);


  // Filtrer les produits existants pour exclure ceux déjà ajoutés
  const getAvailableProducts = (currentIndex) => {
    return existingProducts.filter((product) => {
      // Vérifier si le produit n'est pas déjà utilisé dans un autre item
      return !items.some((item, idx) => 
        idx !== currentIndex && item.produit_id === product.id
      );
    });
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        produit_id: null,
        nom_produit: "",
        quantite: "",
        prix_unitaire: "",
        unite: "pièce", // Toujours "pièce"
        creer_produit: true, // Toujours mettre à jour le stock
      },
    ]);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
    // Nettoyer l'état d'expansion pour cet index
    const newExpanded = { ...expandedItems };
    delete newExpanded[index];
    // Réindexer les états d'expansion
    const reindexed = {};
    Object.keys(newExpanded).forEach((key) => {
      const oldIndex = parseInt(key);
      if (oldIndex > index) {
        reindexed[oldIndex - 1] = newExpanded[key];
      } else if (oldIndex < index) {
        reindexed[oldIndex] = newExpanded[key];
      }
    });
    setExpandedItems(reindexed);
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Si un produit existant est sélectionné, remplir le nom
    if (field === "produit_id" && value) {
      const produit = existingProducts.find((p) => p.id === value);
      if (produit) {
        newItems[index].nom_produit = produit.nom;
      }
    }
    
    setItems(newItems);
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => {
      const quantite = parseFloat(item.quantite) || 0;
      const prix = parseFloat(item.prix_unitaire) || 0;
      return total + quantite * prix;
    }, 0);
  };

  const handleSave = () => {
    // Validation
    const validItems = items.filter(
      (item) =>
        item.nom_produit && item.nom_produit.trim() && // Nom du produit requis
        item.quantite &&
        item.prix_unitaire
    );

    if (validItems.length === 0) {
      alert("Veuillez ajouter au moins un produit");
      return;
    }

    const purchaseData = {
      lieu_achat: lieuAchat.trim() || "Non renseigné",
      date_achat: dateAchat,
      items: validItems.map((item) => ({
        produit_id: item.produit_id || null,
        nom_produit: item.nom_produit.trim() || null,
        quantite: parseInt(item.quantite),
        prix_unitaire: parseFloat(item.prix_unitaire),
        unite: "pièce", // Toujours "pièce"
        // Toujours mettre à jour le stock (c'est le but de la section achat)
        creer_produit: true,
      })),
    };

    onSave(purchaseData);
    // Réinitialiser après sauvegarde
    localStorage.removeItem(STORAGE_KEY);
  };

  const handleReset = () => {
    if (window.confirm("Voulez-vous vraiment réinitialiser la liste d'achat ?")) {
      setLieuAchat("");
      setDateAchat(getLocalDatetimeString());
      setItems([
        {
          produit_id: null,
          nom_produit: "",
          quantite: "",
          prix_unitaire: "",
          unite: "pièce", // Toujours "pièce"
                creer_produit: true, // Toujours mettre à jour le stock
        },
      ]);
      setExpandedItems({});
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const handleClose = () => {
    // Ne pas réinitialiser, garder les données pour la prochaine fois
    onClose();
  };


  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
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
        pt: 3,
        px: 3
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ 
            width: 40, 
            height: 40, 
            borderRadius: "12px", 
            bgcolor: "primary.main", 
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>
            <MdShoppingCart size={24} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Nouvel achat
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small" sx={{ bgcolor: "action.hover" }}>
          <MdClose />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ px: 3 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          {/* Informations générales - Modern Cards */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <TextField
              label="Lieu d'achat (optionnel)"
              placeholder="Ex: Leclerc, Carrefour... (laissé vide = Non renseigné)"
              value={lieuAchat}
              onChange={(e) => setLieuAchat(e.target.value)}
              fullWidth
              InputProps={{
                startAdornment: <MdStore size={20} color="#999" style={{ marginRight: 8 }} />,
                sx: { borderRadius: "16px", fontWeight: 600 }
              }}
            />
            <TextField
              label="Date d'achat"
              type="datetime-local"
              value={dateAchat}
              onChange={(e) => setDateAchat(e.target.value)}
              fullWidth
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: <MdCalendarToday size={20} color="#999" style={{ marginRight: 8 }} />,
                sx: { borderRadius: "16px" }
              }}
            />
          </Box>

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
              Panier ({items.length})
            </Typography>
            <Button
              startIcon={<MdAdd size={20} />}
              onClick={handleAddItem}
              variant="text"
              sx={{ fontWeight: 700, borderRadius: "10px", textTransform: "none" }}
            >
              Ajouter un produit
            </Button>
          </Box>

          {/* Liste des produits - Modern Shopping List */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {items.map((item, index) => {
              const product = item.produit_id ? existingProducts.find(p => p.id === item.produit_id) : null;
              const expanded = expandedItems[index] || false;
              const availableProducts = getAvailableProducts(index);

              return (
                <Card
                  key={index}
                  elevation={0}
                  sx={{
                    borderRadius: "20px",
                    border: "1px solid",
                    borderColor: expanded ? "primary.main" : "divider",
                    bgcolor: expanded ? "primary.50" : "background.paper",
                    transition: "all 0.2s",
                  }}
                >
                  <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                    {/* Header Item */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: "14px",
                          bgcolor: "background.paper",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid",
                          borderColor: "divider",
                          overflow: "hidden",
                          flexShrink: 0
                        }}
                      >
                        {product?.image_display_url || product?.image_url ? (
                          <img src={product.image_display_url || product.image_url} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                        ) : (
                          <MdInventory size={24} color="#ccc" />
                        )}
                      </Box>
                      
                      <Box sx={{ flex: 1, minWidth: 0 }} onClick={() => setExpandedItems({ ...expandedItems, [index]: !expanded })}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: "0.95rem", lineHeight: 1.2 }}>
                          {item.nom_produit || (product ? product.nom : "Nouveau produit")}
                        </Typography>
                        {item.quantite && item.prix_unitaire && (
                          <Typography variant="caption" sx={{ fontWeight: 700, color: "primary.main" }}>
                            {item.quantite} {item.unite} × {item.prix_unitaire}€ = {(parseFloat(item.quantite) * parseFloat(item.prix_unitaire)).toFixed(2)}€
                          </Typography>
                        )}
                      </Box>

                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                          onClick={() => setExpandedItems({ ...expandedItems, [index]: !expanded })}
                          size="small"
                          sx={{ bgcolor: "background.paper", borderRadius: "10px", border: "1px solid", borderColor: "divider" }}
                        >
                          {expanded ? <MdRemove size={20} /> : <MdAdd size={20} />}
                        </IconButton>
                        {items.length > 1 && (
                          <IconButton
                            onClick={() => handleRemoveItem(index)}
                            size="small"
                            sx={{ color: "error.main", bgcolor: "error.50", borderRadius: "10px" }}
                          >
                            <MdDelete size={20} />
                          </IconButton>
                        )}
                      </Box>
                    </Box>

                    {/* Formulaire détaillé */}
                    {expanded && (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 3, p: 2, bgcolor: "background.paper", borderRadius: "16px" }}>
                        {/* Champ unifié : produit existant ou nouveau */}
                        <Autocomplete
                          freeSolo
                          options={availableProducts}
                          getOptionLabel={(option) => {
                            if (typeof option === 'string') {
                              return option;
                            }
                            return option.nom;
                          }}
                          value={
                            item.produit_id && product
                              ? product
                              : item.nom_produit || ""
                          }
                          onInputChange={(event, newInputValue, reason) => {
                            // Si l'utilisateur tape, mettre à jour le nom
                            if (reason === 'input') {
                              handleItemChange(index, "nom_produit", newInputValue);
                              // Si le texte ne correspond à aucun produit, réinitialiser produit_id
                              const matchingProduct = availableProducts.find(
                                (p) => p.nom.toLowerCase() === newInputValue.toLowerCase()
                              );
                              if (!matchingProduct) {
                                handleItemChange(index, "produit_id", null);
                              }
                            }
                          }}
                          onChange={(event, newValue) => {
                            if (typeof newValue === 'string') {
                              // Nouveau produit saisi manuellement
                              handleItemChange(index, "nom_produit", newValue);
                              handleItemChange(index, "produit_id", null);
                            } else if (newValue && newValue.id) {
                              // Produit existant sélectionné
                              handleItemChange(index, "produit_id", newValue.id);
                              handleItemChange(index, "nom_produit", newValue.nom);
                            } else {
                              // Rien sélectionné
                              handleItemChange(index, "produit_id", null);
                              handleItemChange(index, "nom_produit", "");
                            }
                          }}
                          filterOptions={(options, params) => {
                            const filtered = [];
                            const { inputValue } = params;
                            
                            // Si pas de texte, retourner tous les produits disponibles
                            if (!inputValue) {
                              return options;
                            }
                            
                            // Filtrer les produits existants qui correspondent
                            const inputLower = inputValue.toLowerCase();
                            options.forEach((option) => {
                              if (option.nom.toLowerCase().includes(inputLower)) {
                                filtered.push(option);
                              }
                            });
                            
                            return filtered;
                          }}
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Produit *"
                              placeholder="Rechercher ou créer un produit..."
                              variant="outlined"
                              size="small"
                              required
                            />
                          )}
                          renderOption={(props, option) => (
                            <li {...props} key={option.id}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1, width: "100%" }}>
                                <MdInventory size={16} color="#666" />
                                <Typography sx={{ flex: 1 }}>{option.nom}</Typography>
                                {option.quantite !== undefined && (
                                  <Typography variant="caption" sx={{ color: "text.secondary", ml: 1 }}>
                                    Stock: {option.quantite}
                                  </Typography>
                                )}
                              </Box>
                            </li>
                          )}
                        />

                        <Box sx={{ display: "flex", gap: 1.5 }}>
                          <TextField
                            label="Quantité *"
                            type="number"
                            value={item.quantite}
                            onChange={(e) => handleItemChange(index, "quantite", e.target.value)}
                            size="small"
                            sx={{ flex: 1 }}
                          />
                          <TextField
                            label="Prix unit. *"
                            type="number"
                            value={item.prix_unitaire}
                            onChange={(e) => handleItemChange(index, "prix_unitaire", e.target.value)}
                            size="small"
                            sx={{ flex: 1 }}
                          />
                        </Box>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1, flexDirection: "column", gap: 2 }}>
        <Box sx={{ 
          width: "100%", 
          p: 2.5, 
          bgcolor: "primary.main", 
          borderRadius: "20px", 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center",
          color: "white",
          boxShadow: "0 8px 24px rgba(25, 118, 210, 0.3)"
        }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Total de l'achat</Typography>
          <Typography variant="h5" sx={{ fontWeight: 900 }}>{calculateTotal().toFixed(2)}€</Typography>
        </Box>

        <Box sx={{ width: "100%", display: "flex", gap: 1.5 }}>
          <Button 
            fullWidth
            onClick={handleClose} 
            sx={{ borderRadius: "16px", py: 1.5, fontWeight: 700, textTransform: "none", color: "text.secondary" }}
          >
            Brouillon
          </Button>
          <Button
            fullWidth
            variant="contained"
            onClick={handleSave}
            disabled={items.length === 0}
            sx={{ 
              borderRadius: "16px", 
              py: 1.5, 
              fontWeight: 800, 
              textTransform: "none",
              bgcolor: "primary.dark",
              "&:hover": { bgcolor: "primary.main" }
            }}
          >
            Enregistrer
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CreatePurchaseDialog;
