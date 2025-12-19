import React, { useEffect, useState, useMemo } from "react";
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
  TablePagination,
  TableSortLabel,
  TextField,
  Typography,
  Alert,
  Snackbar,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdBusiness,
  MdSearch,
} from "react-icons/md";
import axios from "axios";

const ListeSousTraitants = () => {
  const [sousTraitants, setSousTraitants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editingSousTraitant, setEditingSousTraitant] = useState(null);
  const [formData, setFormData] = useState({
    entreprise: "",
    capital: "",
    adresse: "",
    code_postal: "",
    ville: "",
    forme_juridique: "",
    numero_rcs: "",
    representant: "",
    email: "",
    phone_Number: "",
    type: "",
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });
  
  // États pour la pagination et le tri
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState("");
  const [order, setOrder] = useState("asc");
  const [searchTerm, setSearchTerm] = useState("");

  // Charger les sous-traitants
  const fetchSousTraitants = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/sous-traitants/");
      setSousTraitants(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des sous-traitants:", error);
      showSnackbar("Erreur lors du chargement des sous-traitants", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSousTraitants();
  }, []);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenModal = (sousTraitant = null) => {
    setEditingSousTraitant(sousTraitant);
    if (sousTraitant) {
      setFormData({
        entreprise: sousTraitant.entreprise || "",
        capital: sousTraitant.capital || "",
        adresse: sousTraitant.adresse || "",
        code_postal: sousTraitant.code_postal || "",
        ville: sousTraitant.ville || "",
        forme_juridique: sousTraitant.forme_juridique || "",
        numero_rcs: sousTraitant.numero_rcs || "",
        representant: sousTraitant.representant || "",
        email: sousTraitant.email || "",
        phone_Number: sousTraitant.phone_Number || "",
        type: sousTraitant.type || "",
      });
    } else {
      setFormData({
        entreprise: "",
        capital: "",
        adresse: "",
        code_postal: "",
        ville: "",
        forme_juridique: "",
        numero_rcs: "",
        representant: "",
        email: "",
        phone_Number: "",
        type: "",
      });
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingSousTraitant(null);
    setFormData({
      entreprise: "",
      capital: "",
      adresse: "",
      code_postal: "",
      ville: "",
      forme_juridique: "",
      numero_rcs: "",
      representant: "",
      email: "",
      phone_Number: "",
      type: "",
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
      // Préparer les données pour l'API
      const dataToSend = {
        ...formData,
        capital: formData.capital ? parseFloat(formData.capital) : null,
      };
      
      // Supprimer les champs vides optionnels
      if (!dataToSend.capital) delete dataToSend.capital;
      if (!dataToSend.forme_juridique) delete dataToSend.forme_juridique;
      if (!dataToSend.email) delete dataToSend.email;
      if (!dataToSend.phone_Number) delete dataToSend.phone_Number;
      if (!dataToSend.type) delete dataToSend.type;

      if (editingSousTraitant) {
        // Modifier un sous-traitant existant
        await axios.put(`/api/sous-traitants/${editingSousTraitant.id}/`, dataToSend);
        showSnackbar("Sous-traitant modifié avec succès", "success");
      } else {
        // Créer un nouveau sous-traitant
        await axios.post("/api/sous-traitants/", dataToSend);
        showSnackbar("Sous-traitant créé avec succès", "success");
      }
      
      handleCloseModal();
      fetchSousTraitants();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.numero_rcs?.[0] ||
                          "Erreur lors de la sauvegarde du sous-traitant";
      showSnackbar(errorMessage, "error");
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce sous-traitant ?")) {
      try {
        await axios.delete(`/api/sous-traitants/${id}/`);
        showSnackbar("Sous-traitant supprimé avec succès", "success");
        fetchSousTraitants();
      } catch (error) {
        console.error("Erreur lors de la suppression:", error);
        showSnackbar("Erreur lors de la suppression du sous-traitant", "error");
      }
    }
  };

  const getTypeLabel = (type) => {
    const types = {
      'NETTOYAGE': 'Nettoyage',
      'BTP': 'BTP',
      'TCE': 'TCE',
      'AUTRE': 'Autre',
    };
    return types[type] || type || '-';
  };

  // Fonction de tri
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  // Fonction de comparaison pour le tri
  const descendingComparator = (a, b, orderBy) => {
    const aValue = a[orderBy];
    const bValue = b[orderBy];
    
    // Gérer les valeurs null/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;
    
    // Comparaison normale
    if (bValue < aValue) {
      return -1;
    }
    if (bValue > aValue) {
      return 1;
    }
    return 0;
  };

  const getComparator = (order, orderBy) => {
    return order === "desc"
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  // Filtrage et tri des données
  const filteredAndSortedSousTraitants = useMemo(() => {
    let filtered = sousTraitants;

    // Filtrage par recherche
    if (searchTerm) {
      filtered = sousTraitants.filter((st) =>
        Object.values(st).some((value) =>
          value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Tri
    if (orderBy) {
      const comparator = getComparator(order, orderBy);
      filtered = [...filtered].sort(comparator);
    }

    return filtered;
  }, [sousTraitants, searchTerm, order, orderBy]);

  // Pagination des données
  const paginatedSousTraitants = useMemo(() => {
    return filteredAndSortedSousTraitants.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredAndSortedSousTraitants, page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* En-tête */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ color: "white" }}>
          Gestion des Sous-traitants
        </Typography>
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
          Ajouter un Sous-traitant
        </Button>
      </Box>

      {/* Barre de recherche */}
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Rechercher un sous-traitant..."
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPage(0);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MdSearch style={{ color: "black" }} />
              </InputAdornment>
            ),
          }}
          sx={{
            maxWidth: 400,
            "& .MuiOutlinedInput-root": {
              backgroundColor: "white",
              "& fieldset": {
                borderColor: "rgba(255, 255, 255, 0.5)",
                borderWidth: 2,
              },
              "&:hover fieldset": {
                borderColor: "white",
              },
              "&.Mui-focused fieldset": {
                borderColor: "white",
                borderWidth: 2,
              },
            },
            "& .MuiInputBase-input": {
              color: "#333",
            },
            "& .MuiInputBase-input::placeholder": {
              color: "#999",
              opacity: 1,
            },
          }}
        />
      </Box>

      {/* Tableau des sous-traitants */}
      <TableContainer component={Paper} sx={{ mt: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#1976d2" }}>
              <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                <TableSortLabel
                  active={orderBy === "entreprise"}
                  direction={orderBy === "entreprise" ? order : "asc"}
                  onClick={() => handleRequestSort("entreprise")}
                  sx={{
                    color: "white",
                    "& .MuiTableSortLabel-icon": {
                      color: "white !important",
                    },
                    "&:hover": {
                      color: "rgba(255, 255, 255, 0.8)",
                    },
                  }}
                >
                  Entreprise
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                <TableSortLabel
                  active={orderBy === "representant"}
                  direction={orderBy === "representant" ? order : "asc"}
                  onClick={() => handleRequestSort("representant")}
                  sx={{
                    color: "white",
                    "& .MuiTableSortLabel-icon": {
                      color: "white !important",
                    },
                    "&:hover": {
                      color: "rgba(255, 255, 255, 0.8)",
                    },
                  }}
                >
                  Représentant
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                <TableSortLabel
                  active={orderBy === "email"}
                  direction={orderBy === "email" ? order : "asc"}
                  onClick={() => handleRequestSort("email")}
                  sx={{
                    color: "white",
                    "& .MuiTableSortLabel-icon": {
                      color: "white !important",
                    },
                    "&:hover": {
                      color: "rgba(255, 255, 255, 0.8)",
                    },
                  }}
                >
                  Email
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                <TableSortLabel
                  active={orderBy === "phone_Number"}
                  direction={orderBy === "phone_Number" ? order : "asc"}
                  onClick={() => handleRequestSort("phone_Number")}
                  sx={{
                    color: "white",
                    "& .MuiTableSortLabel-icon": {
                      color: "white !important",
                    },
                    "&:hover": {
                      color: "rgba(255, 255, 255, 0.8)",
                    },
                  }}
                >
                  Téléphone
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                <TableSortLabel
                  active={orderBy === "numero_rcs"}
                  direction={orderBy === "numero_rcs" ? order : "asc"}
                  onClick={() => handleRequestSort("numero_rcs")}
                  sx={{
                    color: "white",
                    "& .MuiTableSortLabel-icon": {
                      color: "white !important",
                    },
                    "&:hover": {
                      color: "rgba(255, 255, 255, 0.8)",
                    },
                  }}
                >
                  Numéro RCS
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                <TableSortLabel
                  active={orderBy === "type"}
                  direction={orderBy === "type" ? order : "asc"}
                  onClick={() => handleRequestSort("type")}
                  sx={{
                    color: "white",
                    "& .MuiTableSortLabel-icon": {
                      color: "white !important",
                    },
                    "&:hover": {
                      color: "rgba(255, 255, 255, 0.8)",
                    },
                  }}
                >
                  Type
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                <TableSortLabel
                  active={orderBy === "ville"}
                  direction={orderBy === "ville" ? order : "asc"}
                  onClick={() => handleRequestSort("ville")}
                  sx={{
                    color: "white",
                    "& .MuiTableSortLabel-icon": {
                      color: "white !important",
                    },
                    "&:hover": {
                      color: "rgba(255, 255, 255, 0.8)",
                    },
                  }}
                >
                  Ville
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", textAlign: "center", color: "white" }}>
                Actions
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredAndSortedSousTraitants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm
                      ? "Aucun sous-traitant ne correspond à votre recherche"
                      : "Aucun sous-traitant trouvé"}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedSousTraitants.map((sousTraitant) => (
                <TableRow key={sousTraitant.id} hover>
                  <TableCell sx={{ fontWeight: "medium" }}>
                    {sousTraitant.entreprise}
                  </TableCell>
                  <TableCell>{sousTraitant.representant || "-"}</TableCell>
                  <TableCell>{sousTraitant.email || "-"}</TableCell>
                  <TableCell>{sousTraitant.phone_Number || "-"}</TableCell>
                  <TableCell>{sousTraitant.numero_rcs || "-"}</TableCell>
                  <TableCell>{getTypeLabel(sousTraitant.type)}</TableCell>
                  <TableCell>{sousTraitant.ville || "-"}</TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenModal(sousTraitant)}
                      size="small"
                      sx={{ mr: 1 }}
                      title="Modifier"
                    >
                      <MdEdit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDelete(sousTraitant.id)}
                      size="small"
                      title="Supprimer"
                    >
                      <MdDelete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredAndSortedSousTraitants.length}
          page={page}
          onPageChange={handleChangePage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Lignes par page:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
          }
        />
      </TableContainer>

      {/* Modal de création/édition */}
      <Dialog open={openModal} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingSousTraitant ? "Modifier le Sous-traitant" : "Nouveau Sous-traitant"}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <TextField
                name="entreprise"
                label="Entreprise *"
                value={formData.entreprise}
                onChange={handleInputChange}
                required
                fullWidth
                variant="outlined"
              />
              <TextField
                name="representant"
                label="Représentant *"
                value={formData.representant}
                onChange={handleInputChange}
                required
                fullWidth
                variant="outlined"
              />
              <TextField
                name="numero_rcs"
                label="Numéro RCS *"
                value={formData.numero_rcs}
                onChange={handleInputChange}
                required
                fullWidth
                variant="outlined"
                helperText="Numéro unique d'enregistrement au RCS"
              />
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  name="adresse"
                  label="Adresse *"
                  value={formData.adresse}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  name="code_postal"
                  label="Code Postal *"
                  value={formData.code_postal}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  name="ville"
                  label="Ville *"
                  value={formData.ville}
                  onChange={handleInputChange}
                  required
                  fullWidth
                  variant="outlined"
                />
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  name="capital"
                  label="Capital"
                  type="number"
                  value={formData.capital}
                  onChange={handleInputChange}
                  fullWidth
                  variant="outlined"
                  inputProps={{ step: "0.01" }}
                />
                <FormControl fullWidth>
                  <InputLabel>Forme Juridique</InputLabel>
                  <Select
                    name="forme_juridique"
                    value={formData.forme_juridique}
                    onChange={handleInputChange}
                    label="Forme Juridique"
                  >
                    <MenuItem value="SARL">SARL</MenuItem>
                    <MenuItem value="SAS">SAS</MenuItem>
                    <MenuItem value="SA">SA</MenuItem>
                    <MenuItem value="EURL">EURL</MenuItem>
                    <MenuItem value="SNC">SNC</MenuItem>
                    <MenuItem value="SCI">SCI</MenuItem>
                    <MenuItem value="AUTRE">Autre</MenuItem>
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  name="email"
                  label="Email"
                  type="email"
                  value={formData.email}
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
              </Box>
              <FormControl fullWidth>
                <InputLabel>Type d'activité</InputLabel>
                <Select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  label="Type d'activité"
                >
                  <MenuItem value="NETTOYAGE">Nettoyage</MenuItem>
                  <MenuItem value="BTP">BTP</MenuItem>
                  <MenuItem value="TCE">TCE</MenuItem>
                  <MenuItem value="AUTRE">Autre</MenuItem>
                </Select>
              </FormControl>
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
              {editingSousTraitant ? "Modifier" : "Créer"}
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

export default ListeSousTraitants;

