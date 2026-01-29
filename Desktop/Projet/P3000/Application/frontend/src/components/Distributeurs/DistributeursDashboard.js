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
  Collapse,
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
  MdClose,
  MdLocationOn,
  MdTrendingUp,
  MdTrendingDown,
  MdAttachMoney,
  MdStorefront,
  MdChevronRight,
  MdMoreVert,
  MdHistory,
  MdExpandMore,
  MdExpandLess,
} from "react-icons/md";
import { useIsMobile } from "../../hooks/useIsMobile";
import DistributeurGrid from "./DistributeurGrid";
import MouvementReapproPage, { getReapproFromStorage } from "./MouvementReapproPage";

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
  const [showMouvementReappro, setShowMouvementReappro] = useState(false);
  const [reapproSessionId, setReapproSessionId] = useState(null);
  const [reapproSessions, setReapproSessions] = useState([]);
  const [openReapproDetail, setOpenReapproDetail] = useState(false);
  const [selectedReapproSession, setSelectedReapproSession] = useState(null);
  const [loadingReapproDetail, setLoadingReapproDetail] = useState(false);
  const [savedReappro, setSavedReappro] = useState(null);
  const [planOuvert, setPlanOuvert] = useState(false);
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

  const fetchReapproSessions = async (distributeurId) => {
    if (!distributeurId) return;
    try {
      const response = await axios.get("/api/distributeur-reappro-sessions/", {
        params: { distributeur_id: distributeurId, statut: "termine" },
      });
      const data = response.data.results || response.data;
      setReapproSessions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erreur chargement mouvements réappro:", error);
      setReapproSessions([]);
    }
  };

  const handleOpenReapproDetail = async (sessionId) => {
    setLoadingReapproDetail(true);
    setOpenReapproDetail(true);
    setSelectedReapproSession(null);
    try {
      const response = await axios.get(
        `/api/distributeur-reappro-sessions/${sessionId}/`
      );
      setSelectedReapproSession(response.data);
    } catch (error) {
      console.error("Erreur chargement détail mouvement:", error);
      showSnackbar("Erreur lors du chargement du détail", "error");
      setOpenReapproDetail(false);
    } finally {
      setLoadingReapproDetail(false);
    }
  };

  const handleCloseReapproDetail = () => {
    setOpenReapproDetail(false);
    setSelectedReapproSession(null);
  };

  useEffect(() => {
    fetchDistributeurs();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    fetchMouvements(selectedId);
    fetchResume(selectedId);
    fetchReapproSessions(selectedId);
    setSavedReappro(getReapproFromStorage());
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

  const openCreateMouvement = async () => {
    if (!selectedId) return;
    try {
      const response = await axios.post("/api/distributeur-reappro-sessions/", {
        distributeur: selectedId,
      });
      setReapproSessionId(response.data.id);
      setShowMouvementReappro(true);
    } catch (error) {
      console.error("Erreur création session réappro:", error);
      showSnackbar("Erreur lors du démarrage du mouvement", "error");
    }
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

      {/* Plan du distributeur — repliable, fermé par défaut */}
      <Box sx={{ px: isMobile ? 2 : 3, mb: 2 }}>
        <Paper
          elevation={0}
          sx={{
            borderRadius: "16px",
            border: "1px solid",
            borderColor: "divider",
            overflow: "hidden",
          }}
        >
          <Box
            onClick={() => setPlanOuvert((o) => !o)}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2,
              py: 1.5,
              cursor: "pointer",
              bgcolor: "action.hover",
              "&:hover": { bgcolor: "action.selected" },
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Plan du distributeur
            </Typography>
            <IconButton size="small" sx={{ ml: 1 }}>
              {planOuvert ? <MdExpandLess size={24} /> : <MdExpandMore size={24} />}
            </IconButton>
          </Box>
          <Collapse in={planOuvert}>
            <Box sx={{ p: 2 }}>
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
          </Collapse>
        </Paper>
      </Box>

      {/* Résumé financier - Design modern cards */}
      <Box sx={{ px: 2, mb: 4 }}>
        <Typography 
          variant="subtitle2" 
          sx={{ mb: 2, fontWeight: 800, color: "text.secondary", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "1.2px" }}
        >
          Performance Financière
        </Typography>
        
        <Grid container spacing={2}>
          {/* Carte Bénéfice Principale */}
          <Grid item xs={12}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 3, 
                borderRadius: "28px", 
                bgcolor: "primary.main", 
                color: "white",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 12px 32px rgba(25, 118, 210, 0.3)"
              }}
            >
              {/* Effet de fond décoratif */}
              <Box sx={{ 
                position: "absolute", 
                right: -20, 
                top: -20, 
                opacity: 0.1, 
                transform: "rotate(-15deg)" 
              }}>
                <MdAttachMoney size={120} />
              </Box>

              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 700, textTransform: "uppercase" }}>
                  Bénéfice Net Total
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, my: 0.5, letterSpacing: "-1px" }}>
                  {(resume.benefice_total ?? resume.benefice)?.toFixed(2) ?? "0.00"} €
                </Typography>
                
                {(resume.benefice_reappro != null && Number(resume.benefice_reappro) !== 0) && (
                  <Chip 
                    label={`Réappro: +${Number(resume.benefice_reappro).toFixed(2)} €`}
                    size="small"
                    sx={{ 
                      bgcolor: "rgba(255,255,255,0.2)", 
                      color: "white", 
                      fontWeight: 700,
                      fontSize: "0.65rem",
                      backdropFilter: "blur(4px)",
                      border: "none",
                      mt: 1
                    }}
                  />
                )}
              </Box>
            </Paper>
          </Grid>
          
          {/* Entrées / Sorties */}
          <Grid item xs={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                borderRadius: "24px", 
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "success.main" }}>
                <Box sx={{ p: 0.5, bgcolor: "success.light", borderRadius: "8px", display: "flex" }}>
                  <MdTrendingUp size={16} />
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: "0.65rem" }}>ENTRÉES</Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "text.primary" }}>
                {resume.total_entrees?.toFixed(2) ?? "0.00"} €
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={6}>
            <Paper 
              elevation={0}
              sx={{ 
                p: 2, 
                borderRadius: "24px", 
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                display: "flex",
                flexDirection: "column",
                gap: 0.5,
                boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, color: "error.main" }}>
                <Box sx={{ p: 0.5, bgcolor: "error.light", borderRadius: "8px", display: "flex" }}>
                  <MdTrendingDown size={16} />
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: "0.65rem" }}>SORTIES</Typography>
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 900, color: "text.primary" }}>
                {resume.total_sorties?.toFixed(2) ?? "0.00"} €
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Box>

      {/* Mouvement en cours (localStorage) — reprendre */}
      {savedReappro && savedReappro.distributeurId === selectedId && (
        <Box sx={{ px: 2, mb: 2 }}>
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: "16px",
              border: "1px solid",
              borderColor: "warning.light",
              bgcolor: "warning.light",
              backgroundImage: "none",
            }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, color: "warning.dark" }}>
              Mouvement en cours
            </Typography>
            <Typography variant="body2" sx={{ mb: 1.5, color: "text.secondary" }}>
              Un mouvement n'a pas été terminé. Reprenez-le pour ajouter du stock et le valider.
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => {
                setReapproSessionId(savedReappro.sessionId);
                setShowMouvementReappro(true);
              }}
              sx={{ borderRadius: "12px", textTransform: "none", fontWeight: 700 }}
            >
              Reprendre le mouvement
            </Button>
          </Paper>
        </Box>
      )}

      {/* Bouton d'action principal */}
      <Box sx={{ px: 2, mb: 5 }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<MdAdd size={24} />}
          onClick={openCreateMouvement}
          sx={{ 
            minHeight: 60, 
            fontSize: "1.1rem", 
            fontWeight: 900,
            borderRadius: "20px",
            textTransform: "none",
            boxShadow: "0 8px 24px rgba(25, 118, 210, 0.2)",
            bgcolor: "primary.dark",
            "&:hover": { bgcolor: "primary.main" }
          }}
        >
          Nouveau mouvement
        </Button>
      </Box>

      {/* Mouvements réappro enregistrés */}
      {reapproSessions.length > 0 && (
        <Box sx={{ px: 2, mb: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "1.2px" }}
            >
              Sessions Récentes
            </Typography>
            <Chip 
              label={`${reapproSessions.length} sessions`} 
              size="small" 
              sx={{ fontWeight: 700, fontSize: "0.6rem", bgcolor: "action.hover", color: "text.secondary" }} 
            />
          </Box>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {reapproSessions.slice(0, 10).map((s) => (
              <Card
                key={s.id}
                elevation={0}
                onClick={() => handleOpenReapproDetail(s.id)}
                sx={{
                  borderRadius: "20px",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:active": { transform: "scale(0.98)", bgcolor: "grey.50" },
                }}
              >
                <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                  <Box sx={{ 
                    width: 48, 
                    height: 48, 
                    borderRadius: "14px", 
                    bgcolor: "primary.light", 
                    color: "primary.main",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0
                  }}>
                    <MdHistory size={24} />
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                      {new Date(s.date_debut).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                      {s.total_unites ?? 0} unités • CA {(s.total_montant ?? 0).toFixed(2)} €
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    {s.total_benefice != null && (
                      <Typography variant="subtitle2" sx={{ fontWeight: 900, color: "success.main" }}>
                        +{Number(s.total_benefice).toFixed(2)} €
                      </Typography>
                    )}
                    <MdChevronRight size={20} color="#ccc" />
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Historique des mouvements (Individuels) */}
      <Box sx={{ px: 2 }}>
        <Typography 
          variant="subtitle2" 
          sx={{ mb: 2, fontWeight: 800, color: "text.secondary", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "1.2px" }}
        >
          Transactions Isolées
        </Typography>
        
        {loadingMouvements ? (
          <Box sx={{ py: 4, textAlign: "center" }}>
            <Typography color="text.secondary" sx={{ fontWeight: 600 }}>Chargement...</Typography>
          </Box>
        ) : mouvements.length === 0 ? (
          <Paper 
            elevation={0} 
            sx={{ 
              p: 6, 
              textAlign: "center", 
              borderRadius: "24px",
              border: "2px dashed",
              borderColor: "divider",
              bgcolor: "transparent",
              opacity: 0.6
            }}
          >
            <MdHistory size={40} style={{ marginBottom: 12, color: "#ccc" }} />
            <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>
              Aucun mouvement individuel
            </Typography>
          </Paper>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {mouvements.map((mouvement) => (
              <Card
                key={mouvement.id}
                elevation={0}
                sx={{
                  borderRadius: "20px",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  overflow: "hidden"
                }}
              >
                <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: "12px",
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
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
                      {mouvement.mouvement_type === "entree" ? "Entrée Manuelle" : "Sortie Manuelle"}
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
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
                        fontWeight: 900,
                        color: mouvement.mouvement_type === "entree" ? "success.main" : "error.main"
                      }}
                    >
                      {mouvement.mouvement_type === "entree" ? "+" : "-"}{(mouvement.montant_total ?? 0).toFixed(2)} €
                    </Typography>
                    <Typography variant="caption" sx={{ color: "text.disabled", fontWeight: 700, fontSize: "0.6rem" }}>
                      {mouvement.quantite} UNITÉS
                    </Typography>
                  </Box>
                  
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteMouvement(mouvement.id)}
                    sx={{ color: "text.disabled", ml: 1 }}
                  >
                    <MdDelete size={18} />
                  </IconButton>
                </Box>
              </Card>
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
        {showMouvementReappro && selectedDistributeur ? (
          <MouvementReapproPage
            distributeur={selectedDistributeur}
            sessionId={reapproSessionId}
            onClose={() => {
              setShowMouvementReappro(false);
              setReapproSessionId(null);
              setSavedReappro(getReapproFromStorage());
            }}
            onTerminer={() => {
              showSnackbar("Mouvement enregistré");
              setSavedReappro(null);
              fetchReapproSessions(selectedId);
            }}
          />
        ) : selectedId ? (
          renderDistributeurDetail()
        ) : (
          renderDistributeursList()
        )}
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

      {/* Détail mouvement réappro — produits, quantités, prix, bénéfices */}
      <Dialog
        open={openReapproDetail}
        onClose={handleCloseReapproDetail}
        maxWidth="sm"
        fullWidth
        fullScreen={window.innerWidth < 600}
        PaperProps={{ sx: { borderRadius: window.innerWidth < 600 ? "24px 24px 0 0" : "24px" } }}
      >
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 800, pr: 6 }}>
          <Box component="span">
            {selectedReapproSession ? (
              <>Détail du mouvement — {new Date(selectedReapproSession.date_debut).toLocaleDateString("fr-FR", {
                day: "2-digit",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
              </>
            ) : (
              "Détail du mouvement"
            )}
          </Box>
          <IconButton onClick={handleCloseReapproDetail} size="small" sx={{ position: "absolute", right: 8, top: 12, borderRadius: "10px" }}>
            <MdClose size={22} />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ px: 2, pb: 2 }}>
          {loadingReapproDetail ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography color="text.secondary">Chargement...</Typography>
            </Box>
          ) : selectedReapproSession && selectedReapproSession.lignes?.length > 0 ? (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
              {selectedReapproSession.lignes.map((ligne) => (
                <Card
                  key={ligne.id}
                  elevation={0}
                  sx={{
                    borderRadius: "20px",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    overflow: "hidden"
                  }}
                >
                  <Box sx={{ p: 2 }}>
                    {/* Header: Nom du produit */}
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 2 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary", lineHeight: 1.2 }}>
                        {ligne.cell_nom_produit || `Emplacement L${(ligne.cell_row ?? 0) + 1}C${(ligne.cell_col ?? 0) + 1}`}
                      </Typography>
                      <Box sx={{ 
                        px: 1.2, 
                        py: 0.4, 
                        borderRadius: "10px", 
                        bgcolor: "grey.100", 
                        color: "grey.900",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        border: "1px solid",
                        borderColor: "divider"
                      }}>
                        <Typography variant="caption" sx={{ fontWeight: 900, fontSize: "0.75rem" }}>
                          {ligne.quantite}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 700, fontSize: "0.55rem", color: "text.secondary" }}>
                          UNITÉS
                        </Typography>
                      </Box>
                    </Box>

                    {/* Grid de données */}
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Box>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", fontSize: "0.6rem" }}>
                            Prix Vente
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {Number(ligne.prix_vente).toFixed(2)} €
                          </Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6}>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, textTransform: "uppercase", fontSize: "0.6rem" }}>
                            Coût Unitaire
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 800 }}>
                            {ligne.cout_unitaire != null ? `${Number(ligne.cout_unitaire).toFixed(2)} €` : "—"}
                          </Typography>
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12}>
                        <Box sx={{ 
                          p: 1.5, 
                          borderRadius: "12px", 
                          bgcolor: "grey.50", 
                          display: "flex", 
                          justifyContent: "space-between",
                          alignItems: "center"
                        }}>
                          <Box>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: "0.6rem" }}>
                              TOTAL LIGNE
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 900 }}>
                              {Number(ligne.montant_total).toFixed(2)} €
                            </Typography>
                          </Box>
                          <Box sx={{ textAlign: "right" }}>
                            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: "0.6rem" }}>
                              BÉNÉFICE
                            </Typography>
                            <Typography variant="body1" sx={{ 
                              fontWeight: 900, 
                              color: (ligne.benefice ?? 0) >= 0 ? "success.main" : "error.main" 
                            }}>
                              {(ligne.benefice ?? 0).toFixed(2)} €
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                    </Grid>
                  </Box>
                </Card>
              ))}

              {/* Résumé de la session */}
              <Paper
                elevation={0}
                sx={{
                  p: 2.5,
                  mt: 1,
                  borderRadius: "24px",
                  bgcolor: "primary.main",
                  color: "white",
                  boxShadow: "0 8px 24px rgba(25, 118, 210, 0.2)"
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, opacity: 0.8 }}>RÉSUMÉ DU MOUVEMENT</Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700 }}>{selectedReapproSession.total_unites ?? 0} Unités</Typography>
                </Box>
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <Box>
                    <Typography variant="caption" sx={{ display: "block", opacity: 0.8, fontSize: "0.65rem" }}>CHIFFRE D'AFFAIRES</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900 }}>{(selectedReapproSession.total_montant ?? 0).toFixed(2)} €</Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" sx={{ display: "block", opacity: 0.8, fontSize: "0.65rem" }}>BÉNÉFICE NET</Typography>
                    <Typography variant="h5" sx={{ fontWeight: 900, color: "#4ade80" }}>
                      +{Number(selectedReapproSession.total_benefice || 0).toFixed(2)} €
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </Box>
          ) : selectedReapproSession ? (
            <Box sx={{ py: 4, textAlign: "center", px: 2 }}>
              <Typography color="text.secondary">Aucune ligne dans ce mouvement.</Typography>
            </Box>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={handleCloseReapproDetail} variant="contained" sx={{ borderRadius: "12px" }}>
            Fermer
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
