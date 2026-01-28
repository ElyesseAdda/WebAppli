import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  MdAdd,
  MdArrowBack,
  MdEdit,
  MdDelete,
  MdLocationOn,
  MdTrendingUp,
  MdTrendingDown,
  MdAttachMoney,
  MdStorefront,
  MdChevronRight,
  MdMoreVert,
} from "react-icons/md";
import { useIsMobile } from "../../hooks/useIsMobile";
import DistributeurGrid from "./DistributeurGrid";

const defaultDistributeurForm = {
  nom: "",
  emplacement: "",
};

const defaultMouvementForm = {
  mouvement_type: "entree",
  quantite: 1,
  prix_unitaire: 0,
  date_mouvement: new Date().toISOString().slice(0, 16),
  commentaire: "",
};

const DistributeursDashboard = () => {
  const isMobile = useIsMobile();
  const [distributeurs, setDistributeurs] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [mouvements, setMouvements] = useState([]);
  const [resume, setResume] = useState({
    total_entrees: 0,
    total_sorties: 0,
    benefice: 0,
  });
  const [loadingDistributeurs, setLoadingDistributeurs] = useState(false);
  const [loadingMouvements, setLoadingMouvements] = useState(false);
  const [openDistributeurModal, setOpenDistributeurModal] = useState(false);
  const [openMouvementModal, setOpenMouvementModal] = useState(false);
  const [editingDistributeur, setEditingDistributeur] = useState(null);
  const [distributeurForm, setDistributeurForm] = useState(
    defaultDistributeurForm
  );
  const [mouvementForm, setMouvementForm] = useState(defaultMouvementForm);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const selectedDistributeur = useMemo(
    () => distributeurs.find((d) => d.id === selectedId) || null,
    [distributeurs, selectedId]
  );

  // En mode mobile, ajuster le body pour plein écran
  useEffect(() => {
    if (isMobile) {
      // Sauvegarder les styles originaux
      const originalStyle = {
        margin: document.body.style.margin,
        padding: document.body.style.padding,
        overflow: document.body.style.overflow,
      };
      
      // Appliquer le style plein écran
      document.body.style.margin = "0";
      document.body.style.padding = "0";
      document.body.style.overflow = "hidden";
      
      // Restaurer au démontage
      return () => {
        document.body.style.margin = originalStyle.margin;
        document.body.style.padding = originalStyle.padding;
        document.body.style.overflow = originalStyle.overflow;
      };
    }
  }, [isMobile]);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchDistributeurs = async () => {
    try {
      setLoadingDistributeurs(true);
      const response = await axios.get("/api/distributeurs/");
      setDistributeurs(response.data);
    } catch (error) {
      console.error("Erreur chargement distributeurs:", error);
      showSnackbar("Erreur lors du chargement des distributeurs", "error");
    } finally {
      setLoadingDistributeurs(false);
    }
  };

  const fetchMouvements = async (distributeurId) => {
    if (!distributeurId) return;
    try {
      setLoadingMouvements(true);
      const response = await axios.get("/api/distributeur-mouvements/", {
        params: { distributeur_id: distributeurId },
      });
      setMouvements(response.data);
    } catch (error) {
      console.error("Erreur chargement mouvements:", error);
      showSnackbar("Erreur lors du chargement des mouvements", "error");
    } finally {
      setLoadingMouvements(false);
    }
  };

  const fetchResume = async (distributeurId) => {
    if (!distributeurId) return;
    try {
      const response = await axios.get(
        `/api/distributeurs/${distributeurId}/resume/`
      );
      setResume(response.data);
    } catch (error) {
      console.error("Erreur chargement résumé:", error);
      showSnackbar("Erreur lors du chargement du résumé", "error");
    }
  };

  useEffect(() => {
    fetchDistributeurs();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetchMouvements(selectedId);
    fetchResume(selectedId);
  }, [selectedId]);

  const openCreateDistributeur = () => {
    setEditingDistributeur(null);
    setDistributeurForm(defaultDistributeurForm);
    setOpenDistributeurModal(true);
  };

  const openEditDistributeur = (distributeur) => {
    setEditingDistributeur(distributeur);
    setDistributeurForm({
      nom: distributeur.nom || "",
      emplacement: distributeur.emplacement || "",
    });
    setOpenDistributeurModal(true);
  };

  const handleSelectDistributeur = (distributeurId) => {
    setSelectedId(distributeurId);
  };

  const handleBackToList = () => {
    setSelectedId(null);
  };

  const handleSaveDistributeur = async () => {
    try {
      const payload = {
        ...distributeurForm,
        // Générer un code automatique si non fourni (basé sur le nom)
        code: distributeurForm.code || `DIST-${Date.now()}`,
        // Toujours actif par défaut
        actif: true,
      };
      
      if (editingDistributeur) {
        await axios.put(
          `/api/distributeurs/${editingDistributeur.id}/`,
          payload
        );
        showSnackbar("Distributeur mis à jour");
      } else {
        await axios.post("/api/distributeurs/", payload);
        showSnackbar("Distributeur créé");
      }
      setOpenDistributeurModal(false);
      fetchDistributeurs();
    } catch (error) {
      console.error("Erreur sauvegarde distributeur:", error);
      showSnackbar("Erreur lors de l'enregistrement", "error");
    }
  };

  const handleDeleteDistributeur = async (distributeurId) => {
    if (!window.confirm("Supprimer ce distributeur ?")) {
      return;
    }
    try {
      await axios.delete(`/api/distributeurs/${distributeurId}/`);
      showSnackbar("Distributeur supprimé");
      if (selectedId === distributeurId) {
        setSelectedId(null);
      }
      fetchDistributeurs();
    } catch (error) {
      console.error("Erreur suppression distributeur:", error);
      showSnackbar("Erreur lors de la suppression", "error");
    }
  };

  const handleCreateMouvement = async () => {
    if (!selectedId) return;
    try {
      const payload = {
        ...mouvementForm,
        distributeur: selectedId,
        quantite: Number(mouvementForm.quantite),
        prix_unitaire: Number(mouvementForm.prix_unitaire),
      };
      await axios.post("/api/distributeur-mouvements/", payload);
      showSnackbar("Mouvement ajouté");
      setMouvementForm({
        ...defaultMouvementForm,
        date_mouvement: new Date().toISOString().slice(0, 16),
      });
      setOpenMouvementModal(false);
      fetchMouvements(selectedId);
      fetchResume(selectedId);
    } catch (error) {
      console.error("Erreur création mouvement:", error);
      showSnackbar("Erreur lors de l'ajout du mouvement", "error");
    }
  };

  const openCreateMouvement = () => {
    setMouvementForm({
      ...defaultMouvementForm,
      date_mouvement: new Date().toISOString().slice(0, 16),
    });
    setOpenMouvementModal(true);
  };

  const handleDeleteMouvement = async (mouvementId) => {
    if (!window.confirm("Supprimer ce mouvement ?")) {
      return;
    }
    try {
      await axios.delete(`/api/distributeur-mouvements/${mouvementId}/`);
      showSnackbar("Mouvement supprimé");
      fetchMouvements(selectedId);
      fetchResume(selectedId);
    } catch (error) {
      console.error("Erreur suppression mouvement:", error);
      showSnackbar("Erreur lors de la suppression", "error");
    }
  };

  // Vue liste des distributeurs (cards)
  const renderDistributeursList = () => (
    <Box sx={{ pb: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
          px: isMobile ? 2 : 3,
          pt: isMobile ? 2 : 3,
        }}
      >
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 800,
            letterSpacing: "-0.5px",
            color: "text.primary"
          }}
        >
          Distributeurs
        </Typography>
        <Button
          variant="contained"
          startIcon={<MdAdd />}
          onClick={openCreateDistributeur}
          sx={{ 
            borderRadius: "12px",
            textTransform: "none",
            fontWeight: 600,
            px: 2,
            boxShadow: "0 4px 12px rgba(25, 118, 210, 0.2)",
            minHeight: 40
          }}
        >
          Nouveau
        </Button>
      </Box>

      {loadingDistributeurs ? (
        <Box sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary">Chargement...</Typography>
        </Box>
      ) : distributeurs.length === 0 ? (
        <Box 
          sx={{ 
            p: 4, 
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2
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
            <MdStorefront size={40} color="#ccc" />
          </Box>
          <Typography color="text.secondary" sx={{ fontWeight: 500 }}>
            Aucun distributeur enregistré
          </Typography>
          <Button 
            variant="outlined" 
            onClick={openCreateDistributeur}
            sx={{ borderRadius: "10px", textTransform: "none" }}
          >
            Créer le premier distributeur
          </Button>
        </Box>
      ) : (
        <Box sx={{ px: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
          {distributeurs.map((distributeur) => (
            <Card
              key={distributeur.id}
              elevation={0}
              sx={{
                borderRadius: "20px",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                overflow: "hidden",
                transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                "&:active": {
                  transform: "scale(0.97)",
                  bgcolor: "action.hover",
                },
              }}
            >
              <CardActionArea
                onClick={() => handleSelectDistributeur(distributeur.id)}
                sx={{ p: 0 }}
              >
                <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                  {/* Icon Container */}
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: "16px",
                      bgcolor: distributeur.actif ? "primary.light" : "action.hover",
                      color: distributeur.actif ? "primary.main" : "text.disabled",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <MdStorefront size={28} />
                  </Box>

                  {/* Content */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 700,
                          fontSize: "1.05rem",
                          color: "text.primary",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {distributeur.nom}
                      </Typography>
                      {!distributeur.actif && (
                        <Chip
                          label="Inactif"
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            bgcolor: "error.light",
                            color: "error.dark",
                            border: "none"
                          }}
                        />
                      )}
                    </Box>
                    
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      <MdLocationOn size={14} color="#666" />
                      <Typography
                        variant="body2"
                        sx={{
                          color: "text.secondary",
                          fontSize: "0.85rem",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {distributeur.emplacement || "Aucun emplacement"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Right Arrow */}
                  <MdChevronRight size={24} color="#ccc" />
                </Box>
              </CardActionArea>

              {/* Quick Actions (Swipeable or simple footer) */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  px: 1,
                  pb: 1,
                  gap: 1
                }}
              >
                <Button
                  size="small"
                  variant="text"
                  startIcon={<MdEdit size={16} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDistributeur(distributeur);
                  }}
                  sx={{ 
                    borderRadius: "8px", 
                    textTransform: "none",
                    color: "text.secondary",
                    fontSize: "0.75rem",
                    minWidth: 0,
                    px: 1.5
                  }}
                >
                  Modifier
                </Button>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteDistributeur(distributeur.id);
                  }}
                  sx={{ 
                    color: "error.light",
                    "&:hover": { color: "error.main" }
                  }}
                >
                  <MdDelete size={18} />
                </IconButton>
              </Box>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );

  // Vue détail d'un distributeur
  const renderDistributeurDetail = () => (
    <Box sx={{ pb: 4 }}>
      {/* Header avec bouton retour */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          px: isMobile ? 2 : 3,
          pt: isMobile ? 2 : 3,
          pb: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          position: isMobile ? "sticky" : "relative",
          top: 0,
          zIndex: 10,
        }}
      >
        <IconButton 
          onClick={handleBackToList} 
          sx={{ 
            minWidth: 44, 
            minHeight: 44,
            bgcolor: "action.hover",
            borderRadius: "12px"
          }}
        >
          <MdArrowBack />
        </IconButton>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontWeight: 800, 
              lineHeight: 1.2,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }}
          >
            {selectedDistributeur?.nom}
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              color: "text.secondary",
            }}
          >
            <MdLocationOn size={14} />
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {selectedDistributeur?.emplacement || "Sans emplacement"}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={() => openEditDistributeur(selectedDistributeur)}
          sx={{ 
            minWidth: 44, 
            minHeight: 44,
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "12px"
          }}
        >
          <MdEdit size={20} />
        </IconButton>
      </Box>

      {/* Grille du distributeur */}
      <Box sx={{ px: isMobile ? 2 : 3, mb: 2 }}>
        <DistributeurGrid
          distributeur={selectedDistributeur}
          onUpdateGrid={async (gridConfig) => {
            try {
              await axios.patch(`/api/distributeurs/${selectedDistributeur.id}/`, gridConfig);
              showSnackbar("Configuration de la grille mise à jour");
              fetchDistributeurs();
            } catch (error) {
              console.error("Erreur mise à jour grille:", error);
              showSnackbar("Erreur lors de la mise à jour", "error");
            }
          }}
        />
      </Box>

      {/* Résumé financier - Design modern cards */}
      <Box sx={{ p: 2 }}>
        <Typography 
          variant="subtitle2" 
          sx={{ mb: 2, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "1px" }}
        >
          Vue d'ensemble
        </Typography>
        
        <Grid container spacing={1.5}>
          <Grid item xs={12}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                borderRadius: "16px", 
                bgcolor: "primary.main", 
                color: "primary.contrastText",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                boxShadow: "0 8px 16px rgba(25, 118, 210, 0.25)"
              }}
            >
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 600 }}>
                  Bénéfice Total
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 800 }}>
                  {resume.benefice?.toFixed(2) ?? "0.00"} €
                </Typography>
              </Box>
              <Box 
                sx={{ 
                  width: 48, 
                  height: 48, 
                  borderRadius: "12px", 
                  bgcolor: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <MdAttachMoney size={28} />
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                borderRadius: "16px", 
                border: "1px solid",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                gap: 0.5
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "success.main" }}>
                <MdTrendingUp size={18} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>Entrées</Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {resume.total_entrees?.toFixed(2) ?? "0.00"} €
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                borderRadius: "16px", 
                border: "1px solid",
                borderColor: "divider",
                display: "flex",
                flexDirection: "column",
                gap: 0.5
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
                <MdTrendingDown size={18} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>Sorties</Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                {resume.total_sorties?.toFixed(2) ?? "0.00"} €
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Bouton ajouter mouvement */}
      <Box sx={{ px: 2, mb: 3 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<MdAdd size={22} />}
          onClick={openCreateMouvement}
          sx={{ 
            minHeight: 52, 
            fontSize: "1rem", 
            fontWeight: 700,
            borderRadius: "14px",
            textTransform: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
          }}
        >
          Nouveau mouvement
        </Button>
      </Box>

      {/* Historique des mouvements - Liste mobile-first */}
      <Box sx={{ px: 2 }}>
        <Typography 
          variant="subtitle2" 
          sx={{ mb: 2, fontWeight: 700, color: "text.secondary", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "1px" }}
        >
          Historique des transactions
        </Typography>
        
        {loadingMouvements ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="text.secondary">Chargement...</Typography>
          </Box>
        ) : mouvements.length === 0 ? (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 4, 
              textAlign: "center", 
              borderRadius: "16px",
              border: "1px dashed",
              borderColor: "divider",
              bgcolor: "transparent"
            }}
          >
            <Typography color="text.secondary" variant="body2">
              Aucun mouvement enregistré
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {mouvements.map((mouvement) => (
              <Paper
                key={mouvement.id}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: "14px",
                  border: "1px solid",
                  borderColor: "divider",
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: "10px",
                    bgcolor: mouvement.mouvement_type === "entree" ? "success.light" : "error.light",
                    color: mouvement.mouvement_type === "entree" ? "success.main" : "error.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {mouvement.mouvement_type === "entree" ? <MdTrendingUp size={22} /> : <MdTrendingDown size={22} />}
                </Box>
                
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {mouvement.mouvement_type === "entree" ? "Entrée de stock" : "Sortie de stock"}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary", display: "block" }}>
                    {new Date(mouvement.date_mouvement).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: "right" }}>
                  <Typography 
                    variant="subtitle1" 
                    sx={{ 
                      fontWeight: 800,
                      color: mouvement.mouvement_type === "entree" ? "success.main" : "error.main"
                    }}
                  >
                    {mouvement.mouvement_type === "entree" ? "+" : "-"}{(mouvement.montant_total ?? 0).toFixed(2)} €
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {mouvement.quantite} unité{mouvement.quantite > 1 ? "s" : ""}
                  </Typography>
                </Box>
                
                <IconButton
                  size="small"
                  onClick={() => handleDeleteMouvement(mouvement.id)}
                  sx={{ color: "text.disabled" }}
                >
                  <MdDelete size={18} />
                </IconButton>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: isMobile ? "100vh" : "auto",
        height: isMobile ? "100vh" : "auto",
        bgcolor: "background.default",
        overflow: isMobile ? "hidden" : "auto",
        display: "flex",
        flexDirection: "column",
        position: isMobile ? "fixed" : "relative",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: "100%",
      }}
    >
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch", // Smooth scroll sur iOS
        }}
      >
        {selectedId ? renderDistributeurDetail() : renderDistributeursList()}
      </Box>

      {/* Modal création/édition distributeur */}
      <Dialog
        open={openDistributeurModal}
        onClose={() => setOpenDistributeurModal(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle>
          {editingDistributeur ? "Modifier" : "Nouveau"} distributeur
        </DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <TextField
            label="Nom"
            value={distributeurForm.nom}
            onChange={(event) =>
              setDistributeurForm((prev) => ({
                ...prev,
                nom: event.target.value,
              }))
            }
            required
            fullWidth
            autoFocus
          />
          <TextField
            label="Localisation"
            placeholder="Ex: Hall d'entrée - immeuble énergie"
            value={distributeurForm.emplacement}
            onChange={(event) =>
              setDistributeurForm((prev) => ({
                ...prev,
                emplacement: event.target.value,
              }))
            }
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setOpenDistributeurModal(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleSaveDistributeur}
            disabled={!distributeurForm.nom.trim()}
            sx={{ minHeight: 44 }}
          >
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal création mouvement */}
      <Dialog
        open={openMouvementModal}
        onClose={() => setOpenMouvementModal(false)}
        maxWidth="sm"
        fullWidth
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle>Ajouter un mouvement</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="mouvement-type-label">Type</InputLabel>
            <Select
              labelId="mouvement-type-label"
              value={mouvementForm.mouvement_type}
              label="Type"
              onChange={(event) =>
                setMouvementForm((prev) => ({
                  ...prev,
                  mouvement_type: event.target.value,
                }))
              }
            >
              <MenuItem value="entree">Entrée</MenuItem>
              <MenuItem value="sortie">Sortie</MenuItem>
            </Select>
          </FormControl>
          <TextField
            label="Quantité"
            type="number"
            value={mouvementForm.quantite}
            onChange={(event) =>
              setMouvementForm((prev) => ({
                ...prev,
                quantite: event.target.value,
              }))
            }
            fullWidth
            inputProps={{ min: 1 }}
          />
          <TextField
            label="Prix unitaire (€)"
            type="number"
            value={mouvementForm.prix_unitaire}
            onChange={(event) =>
              setMouvementForm((prev) => ({
                ...prev,
                prix_unitaire: event.target.value,
              }))
            }
            fullWidth
            inputProps={{ min: 0, step: 0.01 }}
          />
          <TextField
            label="Date et heure"
            type="datetime-local"
            value={mouvementForm.date_mouvement}
            onChange={(event) =>
              setMouvementForm((prev) => ({
                ...prev,
                date_mouvement: event.target.value,
              }))
            }
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
          <TextField
            label="Commentaire (optionnel)"
            value={mouvementForm.commentaire}
            onChange={(event) =>
              setMouvementForm((prev) => ({
                ...prev,
                commentaire: event.target.value,
              }))
            }
            multiline
            minRows={2}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setOpenMouvementModal(false)}>Annuler</Button>
          <Button
            variant="contained"
            onClick={handleCreateMouvement}
            disabled={!mouvementForm.quantite || !mouvementForm.prix_unitaire}
            sx={{ minHeight: 44 }}
          >
            Ajouter
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3500}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DistributeursDashboard;
