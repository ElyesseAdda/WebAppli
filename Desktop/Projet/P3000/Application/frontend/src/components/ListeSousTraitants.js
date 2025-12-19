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
  Collapse,
} from "@mui/material";
import {
  MdAdd,
  MdEdit,
  MdDelete,
  MdBusiness,
  MdSearch,
  MdPerson,
  MdKeyboardArrowDown,
  MdKeyboardArrowUp,
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
  const [expandedRows, setExpandedRows] = useState({}); // Pour gérer les lignes expandues
  
  // États pour la gestion des contacts
  const [contacts, setContacts] = useState([]);
  const [openContactModal, setOpenContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactFormData, setContactFormData] = useState({
    nom: "",
    prenom: "",
    poste: "",
    email: "",
    telephone: "",
  });

  // Charger les sous-traitants
  const fetchSousTraitants = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/sous-traitants/");
      // S'assurer que les contacts sont bien présents pour chaque sous-traitant
      const sousTraitantsAvecContacts = response.data.map(st => ({
        ...st,
        contacts: st.contacts || []
      }));
      console.log("Sous-traitants chargés:", sousTraitantsAvecContacts);
      setSousTraitants(sousTraitantsAvecContacts);
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

  const handleOpenModal = async (sousTraitant = null) => {
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
      // Charger les contacts du sous-traitant
      await fetchContacts(sousTraitant.id);
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
      setContacts([]);
    }
    setOpenModal(true);
  };

  // Charger les contacts d'un sous-traitant
  const fetchContacts = async (sousTraitantId) => {
    try {
      const response = await axios.get(`/api/contacts-sous-traitant/?sous_traitant=${sousTraitantId}`);
      setContacts(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des contacts:", error);
    }
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingSousTraitant(null);
    setContacts([]);
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

  // Gestion des contacts
  const handleOpenContactModal = (contact = null) => {
    setEditingContact(contact);
    if (contact) {
      setContactFormData({
        nom: contact.nom || "",
        prenom: contact.prenom || "",
        poste: contact.poste || "",
        email: contact.email || "",
        telephone: contact.telephone || "",
      });
    } else {
      setContactFormData({
        nom: "",
        prenom: "",
        poste: "",
        email: "",
        telephone: "",
      });
    }
    setOpenContactModal(true);
  };

  const handleCloseContactModal = () => {
    setOpenContactModal(false);
    setEditingContact(null);
    setContactFormData({
      nom: "",
      prenom: "",
      poste: "",
      email: "",
      telephone: "",
    });
  };

  const handleContactInputChange = (e) => {
    const { name, value } = e.target;
    setContactFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!editingSousTraitant) {
      showSnackbar("Veuillez d'abord créer le sous-traitant", "error");
      return;
    }

    try {
      const dataToSend = {
        ...contactFormData,
        sous_traitant: editingSousTraitant.id,
      };

      if (editingContact) {
        await axios.put(`/api/contacts-sous-traitant/${editingContact.id}/`, dataToSend);
        showSnackbar("Contact modifié avec succès", "success");
      } else {
        await axios.post("/api/contacts-sous-traitant/", dataToSend);
        showSnackbar("Contact créé avec succès", "success");
      }
      
      handleCloseContactModal();
      // Rafraîchir les contacts dans le modal si ouvert
      if (openModal && editingSousTraitant) {
        await fetchContacts(editingSousTraitant.id);
      }
      // Rafraîchir le tableau principal pour afficher les changements
      await fetchSousTraitants();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du contact:", error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.nom?.[0] ||
                          "Erreur lors de la sauvegarde du contact";
      showSnackbar(errorMessage, "error");
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce contact ?")) {
      try {
        await axios.delete(`/api/contacts-sous-traitant/${contactId}/`);
        showSnackbar("Contact supprimé avec succès", "success");
        // Rafraîchir les contacts dans le modal si ouvert
        if (openModal && editingSousTraitant) {
          await fetchContacts(editingSousTraitant.id);
        }
        // Rafraîchir le tableau principal pour afficher les changements
        await fetchSousTraitants();
      } catch (error) {
        console.error("Erreur lors de la suppression du contact:", error);
        showSnackbar("Erreur lors de la suppression du contact", "error");
      }
    }
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
      // Rafraîchir le tableau pour afficher les changements
      await fetchSousTraitants();
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
        // Retirer la ligne de l'état d'expansion si elle était ouverte
        setExpandedRows(prev => {
          const newState = { ...prev };
          delete newState[id];
          return newState;
        });
        // Rafraîchir le tableau pour afficher les changements
        await fetchSousTraitants();
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

  // Fonction pour vérifier si un contact est le représentant
  const isRepresentant = (contact, representant) => {
    if (!representant || !contact) return false;
    const representantLower = representant.toLowerCase().trim();
    const contactNomComplet = `${contact.prenom || ""} ${contact.nom || ""}`.trim().toLowerCase();
    const contactNom = (contact.nom || "").toLowerCase().trim();
    
    // Vérifier si le nom complet ou le nom seul correspond au représentant
    return contactNomComplet === representantLower || 
           contactNom === representantLower ||
           representantLower.includes(contactNom) ||
           contactNomComplet.includes(representantLower);
  };

  // Transformer les sous-traitants en lignes principales (une ligne par sous-traitant avec ses contacts)
  const tableRows = useMemo(() => {
    return sousTraitants.map((st) => {
      const contacts = st.contacts || [];
      // Filtrer les contacts (exclure le représentant s'il est dans les contacts)
      const autresContacts = contacts.filter(contact => !isRepresentant(contact, st.representant));
      
      return {
        id: st.id,
        sousTraitant: st,
        contacts: autresContacts,
      };
    });
  }, [sousTraitants]);

  // Fonction pour toggle l'expansion d'une ligne
  const handleToggleExpand = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Filtrage et tri des données
  const filteredAndSortedRows = useMemo(() => {
    let filtered = tableRows;

    // Filtrage par recherche (inclut les contacts)
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = tableRows.filter((row) => {
        const st = row.sousTraitant;
        const contacts = row.contacts || [];
        
        // Recherche dans les données du sous-traitant
        const stMatches = Object.values(st).some((value) =>
          value?.toString().toLowerCase().includes(searchLower)
        );
        
        // Recherche dans les contacts
        const contactsMatches = contacts.some(contact => 
          Object.values(contact).some((value) =>
            value?.toString().toLowerCase().includes(searchLower)
          )
        );
        
        return stMatches || contactsMatches;
      });
    }

    // Tri
    if (orderBy) {
      filtered = [...filtered].sort((a, b) => {
        let aValue = a.sousTraitant[orderBy];
        let bValue = b.sousTraitant[orderBy];
        
        // Gérer les valeurs null/undefined
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        
        // Comparaison normale
        if (order === "desc") {
          return bValue < aValue ? -1 : bValue > aValue ? 1 : 0;
        } else {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
      });
    }

    return filtered;
  }, [tableRows, searchTerm, order, orderBy]);

  // Pagination des données
  const paginatedRows = useMemo(() => {
    return filteredAndSortedRows.slice(
      page * rowsPerPage,
      page * rowsPerPage + rowsPerPage
    );
  }, [filteredAndSortedRows, page, rowsPerPage]);

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
          placeholder="Rechercher un sous-traitant ou un contact..."
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
                  active={orderBy === "nom"}
                  direction={orderBy === "nom" ? order : "asc"}
                  onClick={() => handleRequestSort("nom")}
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
                  Nom / Représentant
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: "bold", color: "white" }}>
                <TableSortLabel
                  active={orderBy === "poste"}
                  direction={orderBy === "poste" ? order : "asc"}
                  onClick={() => handleRequestSort("poste")}
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
                  Poste
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
                  active={orderBy === "telephone"}
                  direction={orderBy === "telephone" ? order : "asc"}
                  onClick={() => handleRequestSort("telephone")}
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
            {filteredAndSortedRows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {searchTerm
                      ? "Aucun résultat ne correspond à votre recherche"
                      : "Aucun sous-traitant trouvé"}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRows.map((row) => {
                const st = row.sousTraitant;
                const contacts = row.contacts || [];
                const isExpanded = expandedRows[st.id];
                
                return (
                  <React.Fragment key={st.id}>
                    {/* Ligne principale - Représentant */}
                    <TableRow 
                      hover
                      sx={{
                        backgroundColor: 'rgba(25, 118, 210, 0.05)',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleToggleExpand(st.id)}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleExpand(st.id);
                            }}
                          >
                            {isExpanded ? <MdKeyboardArrowUp /> : <MdKeyboardArrowDown />}
                          </IconButton>
                          <Typography sx={{ fontWeight: "bold" }}>
                            {st.entreprise}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontWeight: "medium" }}>
                        {st.representant || "-"}
                      </TableCell>
                      <TableCell>Représentant</TableCell>
                      <TableCell>{st.email || "-"}</TableCell>
                      <TableCell>{st.phone_Number || "-"}</TableCell>
                      <TableCell>{st.numero_rcs || "-"}</TableCell>
                      <TableCell>{getTypeLabel(st.type)}</TableCell>
                      <TableCell>{st.ville || "-"}</TableCell>
                      <TableCell sx={{ textAlign: "center" }}>
                        <IconButton
                          color="primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal(st);
                          }}
                          size="small"
                          sx={{ mr: 1 }}
                          title="Modifier"
                        >
                          <MdEdit />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(st.id);
                          }}
                          size="small"
                          title="Supprimer"
                        >
                          <MdDelete />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    
                    {/* Lignes des contacts (collapsible) */}
                    <TableRow>
                      <TableCell 
                        style={{ paddingBottom: 0, paddingTop: 0 }} 
                        colSpan={9}
                      >
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2 }}>
                            {contacts.length === 0 ? (
                              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: "center" }}>
                                Aucun contact pour ce sous-traitant
                              </Typography>
                            ) : (
                              <Table size="small" aria-label="contacts">
                                <TableHead>
                                  <TableRow>
                                    <TableCell sx={{ fontWeight: "bold" }}>Nom</TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>Poste</TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>Email</TableCell>
                                    <TableCell sx={{ fontWeight: "bold" }}>Téléphone</TableCell>
                                    <TableCell></TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {contacts.map((contact) => (
                                    <TableRow key={contact.id}>
                                      <TableCell>
                                        {`${contact.prenom || ""} ${contact.nom}`.trim() || contact.nom}
                                      </TableCell>
                                      <TableCell>{contact.poste || "-"}</TableCell>
                                      <TableCell>{contact.email || "-"}</TableCell>
                                      <TableCell>{contact.telephone || "-"}</TableCell>
                                      <TableCell sx={{ textAlign: "center" }}>
                                        <IconButton
                                          color="primary"
                                          onClick={() => {
                                            handleOpenModal(st);
                                            setTimeout(() => {
                                              handleOpenContactModal(contact);
                                            }, 100);
                                          }}
                                          size="small"
                                          sx={{ mr: 1 }}
                                          title="Modifier"
                                        >
                                          <MdEdit />
                                        </IconButton>
                                        <IconButton
                                          color="error"
                                          onClick={() => handleDeleteContact(contact.id)}
                                          size="small"
                                          title="Supprimer"
                                        >
                                          <MdDelete />
                                        </IconButton>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filteredAndSortedRows.length}
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

              {/* Section Contacts - affichée uniquement en mode édition */}
              {editingSousTraitant && (
                <Box sx={{ mt: 3, pt: 2, borderTop: "1px solid #e0e0e0" }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                    <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <MdPerson /> Contacts ({contacts.length})
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<MdAdd />}
                      onClick={() => handleOpenContactModal()}
                      sx={{ backgroundColor: "white" }}
                    >
                      Ajouter un Contact
                    </Button>
                  </Box>
                  {contacts.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", py: 2 }}>
                      Aucun contact pour ce sous-traitant
                    </Typography>
                  ) : (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {contacts.map((contact) => (
                        <Box
                          key={contact.id}
                          sx={{
                            p: 2,
                            border: "1px solid #e0e0e0",
                            borderRadius: 1,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: "medium" }}>
                              {contact.prenom ? `${contact.prenom} ${contact.nom}` : contact.nom}
                              {contact.poste && ` - ${contact.poste}`}
                            </Typography>
                            {contact.email && (
                              <Typography variant="body2" color="text.secondary">
                                📧 {contact.email}
                              </Typography>
                            )}
                            {contact.telephone && (
                              <Typography variant="body2" color="text.secondary">
                                📞 {contact.telephone}
                              </Typography>
                            )}
                          </Box>
                          <Box>
                            <IconButton
                              color="primary"
                              onClick={() => handleOpenContactModal(contact)}
                              size="small"
                              sx={{ mr: 1 }}
                              title="Modifier"
                            >
                              <MdEdit />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => handleDeleteContact(contact.id)}
                              size="small"
                              title="Supprimer"
                            >
                              <MdDelete />
                            </IconButton>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}
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

      {/* Modal de création/édition de contact */}
      <Dialog open={openContactModal} onClose={handleCloseContactModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingContact ? "Modifier le Contact" : "Nouveau Contact"}
        </DialogTitle>
        <form onSubmit={handleContactSubmit}>
          <DialogContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
              <TextField
                name="nom"
                label="Nom *"
                value={contactFormData.nom}
                onChange={handleContactInputChange}
                required
                fullWidth
                variant="outlined"
              />
              <TextField
                name="prenom"
                label="Prénom"
                value={contactFormData.prenom}
                onChange={handleContactInputChange}
                fullWidth
                variant="outlined"
              />
              <TextField
                name="poste"
                label="Poste"
                value={contactFormData.poste}
                onChange={handleContactInputChange}
                fullWidth
                variant="outlined"
              />
              <TextField
                name="email"
                label="Email"
                type="email"
                value={contactFormData.email}
                onChange={handleContactInputChange}
                fullWidth
                variant="outlined"
              />
              <TextField
                name="telephone"
                label="Téléphone"
                value={contactFormData.telephone}
                onChange={handleContactInputChange}
                fullWidth
                variant="outlined"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseContactModal} color="inherit">
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
              {editingContact ? "Modifier" : "Créer"}
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

