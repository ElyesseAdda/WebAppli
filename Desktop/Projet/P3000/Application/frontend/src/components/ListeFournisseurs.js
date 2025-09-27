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
} from "react-icons/md";
import axios from "axios";

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
      });
    } else {
      setFormData({
        name: "",
        Fournisseur_mail: "",
        phone_Number: "",
        description_fournisseur: "",
        magasin: "",
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
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingFournisseur) {
        // Modifier un fournisseur existant
        await axios.put(`/api/fournisseurs/${editingFournisseur.id}/`, formData);
        showSnackbar("Fournisseur modifié avec succès", "success");
      } else {
        // Créer un nouveau fournisseur
        await axios.post("/api/fournisseurs/", formData);
        showSnackbar("Fournisseur créé avec succès", "success");
      }
      
      handleCloseModal();
      fetchFournisseurs();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      showSnackbar("Erreur lors de la sauvegarde du fournisseur", "error");
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
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: "bold" }}>Nom</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Téléphone</TableCell>
              <TableCell sx={{ fontWeight: "bold" }}>Magasin</TableCell>
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
                  <TableCell>{fournisseur.magasin || "-"}</TableCell>
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
              <TextField
                name="magasin"
                label="Magasin"
                value={formData.magasin}
                onChange={handleInputChange}
                fullWidth
                variant="outlined"
              />
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
