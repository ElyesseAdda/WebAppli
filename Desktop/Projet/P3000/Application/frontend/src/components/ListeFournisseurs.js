import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
  Snackbar,
} from "@mui/material";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdBusiness,
  MdStore,
} from "react-icons/md";
import axios from "axios";
import { COLORS } from "../constants/colors";

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
          <MdBusiness size={32} color={COLORS.infoDark} />
          <Typography variant="h4" component="h1">
            Gestion des Fournisseurs
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<MdAdd />}
          onClick={() => handleOpenModal()}
          sx={{
            backgroundColor: COLORS.infoDark,
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
            <TableRow sx={{ backgroundColor: COLORS.backgroundHover }}>
              <TableCell sx={{ fontWeight: "bold" }}>Nom</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Téléphone</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Magasins</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Description</TableCell>
              <TableCell sx={{ fontWeight: "bold", textAlign: "center" }}>
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
                          backgroundColor: COLORS.backgroundHover,
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
                backgroundColor: COLORS.infoDark,
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
