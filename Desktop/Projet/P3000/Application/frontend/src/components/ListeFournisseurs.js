import React, { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  MdAdd,
  MdBusiness,
  MdDelete,
  MdEdit,
  MdInventory2,
  MdStore,
} from "react-icons/md";
import { FiSearch } from "react-icons/fi";
import axios from "axios";
import { bonCommandeService } from "../services/bonCommandeService";
import NewProductForm from "./NewProductForm";

const ListeFournisseurs = () => {
  const [fournisseurs, setFournisseurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editingFournisseur, setEditingFournisseur] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    Fournisseur_mail: "",
    phone_Number: "",
    description_fournisseur: "",
    magasin: "",
    magasins: [],
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [selectedFournisseur, setSelectedFournisseur] = useState(null);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [openNewProductModal, setOpenNewProductModal] = useState(false);
  const [editingCell, setEditingCell] = useState({
    productId: null,
    field: null,
  });
  const [editedProducts, setEditedProducts] = useState({});

  // Charger les fournisseurs
  const fetchFournisseurs = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/fournisseurs/");
      setFournisseurs(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des fournisseurs:", error);
      showSnackbar("Erreur lors du chargement des fournisseurs", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFournisseurs();
  }, []);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenModal = (fournisseur = null) => {
    setEditingFournisseur(fournisseur);
    if (fournisseur) {
      setFormData({
        name: fournisseur.name || "",
        Fournisseur_mail: fournisseur.Fournisseur_mail || "",
        phone_Number: fournisseur.phone_Number || "",
        description_fournisseur: fournisseur.description_fournisseur || "",
        magasin: fournisseur.magasin || "",
        magasins: fournisseur.magasins || [],
      });
    } else {
      setFormData({
        name: "",
        Fournisseur_mail: "",
        phone_Number: "",
        description_fournisseur: "",
        magasin: "",
        magasins: [],
      });
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingFournisseur(null);
    setFormData({
      name: "",
      Fournisseur_mail: "",
      phone_Number: "",
      description_fournisseur: "",
      magasin: "",
      magasins: [],
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddMagasin = () => {
    setFormData(prev => ({
      ...prev,
      magasins: [...prev.magasins, { nom: "", email: "" }],
    }));
  };

  const handleMagasinChange = (index, field, value) => {
    setFormData(prev => {
      const newMagasins = [...prev.magasins];
      newMagasins[index] = {
        ...newMagasins[index],
        [field]: value,
      };
      return {
        ...prev,
        magasins: newMagasins,
      };
    });
  };

  const handleRemoveMagasin = (index) => {
    setFormData(prev => ({
      ...prev,
      magasins: prev.magasins.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Filtrer les magasins vides (sans nom)
    const magasinsValides = formData.magasins.filter(m => m.nom && m.nom.trim() !== "");
    
    const dataToSend = {
      ...formData,
      magasins: magasinsValides,
    };
    
    try {
      if (editingFournisseur) {
        // Modifier un fournisseur existant
        await axios.put(`/api/fournisseurs/${editingFournisseur.id}/`, dataToSend);
        showSnackbar("Fournisseur modifié avec succès", "success");
      } else {
        // Créer un nouveau fournisseur
        await axios.post("/api/fournisseurs/", dataToSend);
        showSnackbar("Fournisseur créé avec succès", "success");
      }
      
      handleCloseModal();
      fetchFournisseurs();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || "Erreur lors de la sauvegarde du fournisseur";
      showSnackbar(errorMessage, "error");
    }
  };

  const loadFournisseurProducts = async (fournisseurName) => {
    try {
      setProductsLoading(true);
      const data = await bonCommandeService.getProductsByFournisseur(
        fournisseurName
      );
      setProducts(data);
    } catch (error) {
      console.error("Erreur lors du chargement des produits:", error);
      showSnackbar("Erreur lors du chargement des produits", "error");
      setProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleOpenProductsModal = (fournisseur) => {
    setSelectedFournisseur(fournisseur);
    setProductSearch("");
    setEditedProducts({});
    setEditingCell({ productId: null, field: null });
    setProductsModalOpen(true);
    loadFournisseurProducts(fournisseur.name);
  };

  const handleCloseProductsModal = () => {
    setProductsModalOpen(false);
    setOpenNewProductModal(false);
    setSelectedFournisseur(null);
    setProducts([]);
    setProductSearch("");
    setEditedProducts({});
    setEditingCell({ productId: null, field: null });
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
      ["code_produit", "designation", "prix_unitaire", "unite"].includes(field)
    ) {
      try {
        await axios.patch(`/api/stock/${productId}/`, {
          [field]: edited[field],
        });
        if (selectedFournisseur) {
          loadFournisseurProducts(selectedFournisseur.name);
        }
      } catch (error) {
        console.error("Erreur lors de la mise à jour du produit:", error);
        showSnackbar("Erreur lors de la mise à jour du produit", "error");
      }
    }
  };

  const handleEditKeyDown = (e, productId, field) => {
    if (e.key === "Enter") {
      handleEditBlur(productId, field);
    }
  };

  const filteredProducts = products.filter((product) => {
    const search = productSearch.toLowerCase();
    if (!search) return true;
    return (
      product.code_produit?.toLowerCase().includes(search) ||
      product.designation?.toLowerCase().includes(search) ||
      product.unite?.toLowerCase().includes(search) ||
      product.prix_unitaire?.toString().includes(search)
    );
  });

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce fournisseur ?")) {
      try {
        await axios.delete(`/api/fournisseurs/${id}/`);
        showSnackbar("Fournisseur supprimé avec succès", "success");
        fetchFournisseurs();
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        showSnackbar("Erreur lors de la suppression du fournisseur", "error");
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Chargement...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MdBusiness size={32} color="#1976d2" />
          <Typography variant="h4" component="h1">
            Gestion des Fournisseurs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<MdAdd />}
          onClick={() => handleOpenModal()}
          sx={{
            backgroundColor: "#1976d2",
            "&:hover": {
              backgroundColor: "#1565c0",
            },
          }}
        >
          Ajouter un Fournisseur
        </Button>
      </Box>

      {/* Tableau des fournisseurs */}
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#1976d2" }}>
              <TableCell sx={{ fontWeight: "bold", color: "#fff" }}>Nom</TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "#fff" }}>Email</TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "#fff" }}>Téléphone</TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "#fff" }}>Magasins</TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "#fff" }}>Description</TableCell>
              <TableCell sx={{ fontWeight: "bold", textAlign: "center", color: "#fff" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {fournisseurs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    Aucun fournisseur trouvé
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              fournisseurs.map((fournisseur) => (
                <TableRow key={fournisseur.id} hover>
                  <TableCell sx={{ fontWeight: "medium" }}>
                    {fournisseur.name}
                  </TableCell>
                  <TableCell>{fournisseur.Fournisseur_mail || "-"}</TableCell>
                  <TableCell>{fournisseur.phone_Number || "-"}</TableCell>
                  <TableCell>
                    {fournisseur.magasins && fournisseur.magasins.length > 0 ? (
                      <Box>
                        {fournisseur.magasins.map((magasin, idx) => (
                          <Box key={idx} sx={{ mb: 0.5, display: "flex", alignItems: "center", gap: 1 }}>
                            <MdStore size={16} />
                            <Typography variant="body2">
                              {magasin.nom}
                              {magasin.email && (
                                <Typography component="span" variant="caption" sx={{ ml: 1, color: "text.secondary" }}>
                                  ({magasin.email})
                                </Typography>
                              )}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {fournisseur.description_fournisseur
                      ? fournisseur.description_fournisseur.length > 50
                        ? `${fournisseur.description_fournisseur.substring(0, 50)}...`
                        : fournisseur.description_fournisseur
                      : "-"}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <Tooltip title="Voir les produits">
                      <IconButton
                        color="primary"
                        onClick={() => handleOpenProductsModal(fournisseur)}
                        size="small"
                        sx={{ mr: 1 }}
                      >
                        <MdInventory2 />
                      </IconButton>
                    </Tooltip>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenModal(fournisseur)}
                      size="small"
                      sx={{ mr: 1 }}
                    >
                      <MdEdit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(fournisseur.id)}
                      size="small"
                    >
                      <MdDelete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal de création/édition */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingFournisseur ? "Modifier le Fournisseur" : "Nouveau Fournisseur"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <TextField
                name="name"
                label="Nom du Fournisseur"
                value={formData.name}
                onChange={handleInputChange}
                required
                fullWidth
                variant="outlined"
              />
              <TextField
                name="Fournisseur_mail"
                label="Email"
                type="email"
                value={formData.Fournisseur_mail}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <TextField
                name="phone_Number"
                label="Numéro de Téléphone"
                value={formData.phone_Number}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                  <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <MdStore />
                    Magasins
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<MdAdd />}
                    onClick={handleAddMagasin}
                  >
                    Ajouter un Magasin
                  </Button>
                </Box>
                {formData.magasins.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Aucun magasin ajouté. Cliquez sur "Ajouter un Magasin" pour en ajouter un.
                  </Typography>
                ) : (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {formData.magasins.map((magasin, index) => (
                      <Box
                        key={index}
                        sx={{
                          p: 2,
                          border: "1px solid #e0e0e0",
                          borderRadius: 1,
                          backgroundColor: "#fafafa",
                        }}
                      >
                        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
                          <TextField
                            label="Nom du Magasin"
                            value={magasin.nom}
                            onChange={(e) => handleMagasinChange(index, "nom", e.target.value)}
                            fullWidth
                            variant="outlined"
                            size="small"
                            required
                          />
                          <TextField
                            label="Email du Magasin (optionnel)"
                            type="email"
                            value={magasin.email}
                            onChange={(e) => handleMagasinChange(index, "email", e.target.value)}
                            fullWidth
                            variant="outlined"
                            size="small"
                          />
                          <IconButton
                            color="error"
                            onClick={() => handleRemoveMagasin(index)}
                            size="small"
                            sx={{ mt: 0.5 }}
                          >
                            <MdDelete />
                          </IconButton>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>
              <TextField
                name="description_fournisseur"
                label="Description"
                value={formData.description_fournisseur}
                onChange={handleInputChange}
                multiline
                rows={3}
                fullWidth
                variant="outlined"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseModal} color="inherit">
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: "#1976d2",
                "&:hover": {
                  backgroundColor: "#1565c0",
                },
              }}
            >
              {editingFournisseur ? "Modifier" : "Créer"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Modal liste des produits du fournisseur */}
      <Dialog
        open={productsModalOpen}
        onClose={handleCloseProductsModal}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 2,
            pb: 1,
          }}
        >
          <Typography variant="h6">
            Produits — {selectedFournisseur?.name || ""}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              size="small"
              placeholder="Rechercher..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FiSearch />
                  </InputAdornment>
                ),
              }}
              sx={{ width: 250 }}
            />
            <Button
              variant="outlined"
              startIcon={<MdAdd />}
              onClick={() => setOpenNewProductModal(true)}
            >
              Nouveau produit
            </Button>
          </Box>
        </DialogTitle>
        <DialogContent>
          {productsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer sx={{ maxHeight: 480 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Code</TableCell>
                    <TableCell>Désignation</TableCell>
                    <TableCell>Prix unitaire</TableCell>
                    <TableCell>Unité</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} sx={{ textAlign: "center", py: 4 }}>
                        <Typography color="text.secondary">
                          Aucun produit pour ce fournisseur
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProducts.map((product) => {
                      const edited = editedProducts[product.id] || {};
                      return (
                        <TableRow key={product.id} hover>
                          <TableCell
                            onDoubleClick={() =>
                              handleCellDoubleClick(product.id, "code_produit")
                            }
                            sx={{ cursor: "pointer" }}
                          >
                            {editingCell.productId === product.id &&
                            editingCell.field === "code_produit" ? (
                              <TextField
                                value={
                                  edited.code_produit ?? product.code_produit
                                }
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
                                  handleEditKeyDown(
                                    e,
                                    product.id,
                                    "code_produit"
                                  )
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
                                value={
                                  edited.designation ?? product.designation
                                }
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
                                  handleEditKeyDown(
                                    e,
                                    product.id,
                                    "designation"
                                  )
                                }
                                size="small"
                                autoFocus
                                fullWidth
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
                                value={
                                  edited.prix_unitaire ?? product.prix_unitaire
                                }
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
                                  handleEditKeyDown(
                                    e,
                                    product.id,
                                    "prix_unitaire"
                                  )
                                }
                                size="small"
                                autoFocus
                                inputProps={{ min: 0, step: "0.01" }}
                              />
                            ) : (
                              `${Number(
                                edited.prix_unitaire ?? product.prix_unitaire
                              ).toFixed(2)} €`
                            )}
                          </TableCell>
                          <TableCell
                            onDoubleClick={() =>
                              handleCellDoubleClick(product.id, "unite")
                            }
                            sx={{ cursor: "pointer" }}
                          >
                            {editingCell.productId === product.id &&
                            editingCell.field === "unite" ? (
                              <TextField
                                value={edited.unite ?? product.unite}
                                onChange={(e) =>
                                  handleEditChange(
                                    product.id,
                                    "unite",
                                    e.target.value
                                  )
                                }
                                onBlur={() =>
                                  handleEditBlur(product.id, "unite")
                                }
                                onKeyDown={(e) =>
                                  handleEditKeyDown(e, product.id, "unite")
                                }
                                size="small"
                                autoFocus
                              />
                            ) : (
                              edited.unite ?? product.unite
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, justifyContent: "space-between" }}>
          <Typography variant="body2" color="text.secondary">
            {filteredProducts.length} produit
            {filteredProducts.length > 1 ? "s" : ""}
            {" — double-clic pour modifier"}
          </Typography>
          <Button onClick={handleCloseProductsModal}>Fermer</Button>
        </DialogActions>
      </Dialog>

      <NewProductForm
        open={openNewProductModal}
        handleClose={() => setOpenNewProductModal(false)}
        onAddProduct={() => {
          setOpenNewProductModal(false);
          if (selectedFournisseur) {
            loadFournisseurProducts(selectedFournisseur.name);
          }
        }}
        fournisseur={selectedFournisseur?.id}
      />

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ListeFournisseurs;
