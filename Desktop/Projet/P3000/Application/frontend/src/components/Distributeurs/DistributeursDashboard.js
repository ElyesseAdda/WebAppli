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
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
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
  MdCalendarMonth,
  MdDateRange,
  MdPublic,
  MdEmojiEvents,
  MdReceipt,
  MdCreditCard,
  MdBuild,
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

const DistributeursDashboard = ({ initialDistributeurId = null, onDistributeurIdConsumed, isDesktop: propIsDesktop }) => {
  const isMobileHook = useIsMobile();
  // Si isDesktop est passé en prop, l'utiliser, sinon détecter via hook
  const isMobile = propIsDesktop !== undefined ? !propIsDesktop : isMobileHook;
  const isDesktop = !isMobile;
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
  const [editingLigneId, setEditingLigneId] = useState(null);
  const [editLignePrix, setEditLignePrix] = useState("");
  const [editLigneCout, setEditLigneCout] = useState("");
  const [savingLigne, setSavingLigne] = useState(false);
  const [editingMouvement, setEditingMouvement] = useState(null);
  const [openMouvementEditModal, setOpenMouvementEditModal] = useState(false);
  const [savedReappro, setSavedReappro] = useState(null);
  const [planOuvert, setPlanOuvert] = useState(false);
  const now = new Date();
  const [benefitYear, setBenefitYear] = useState(now.getFullYear());
  const [benefitMonth, setBenefitMonth] = useState(now.getMonth() + 1);
  /** Affichage bénéfice: "mois" (par mois, défaut) | "annuel" | "global" */
  const [benefitViewMode, setBenefitViewMode] = useState("mois");
  const [openBenefitModal, setOpenBenefitModal] = useState(false);
  const [openProductStatsModal, setOpenProductStatsModal] = useState(false);
  const [resumeProduits, setResumeProduits] = useState({ produits: [] });
  const [loadingResumeProduits, setLoadingResumeProduits] = useState(false);
  const [meilleurMois, setMeilleurMois] = useState({ year: null, month: null, benefice: null });
  const [fraisList, setFraisList] = useState([]);
  const [openFraisDialog, setOpenFraisDialog] = useState(false);
  const [editingFrais, setEditingFrais] = useState(null);
  const [fraisForm, setFraisForm] = useState({
    description: "",
    date_frais: new Date().toISOString().slice(0, 10),
    montant: "",
    category: "autre",
    recurrence: "",
  });
  const [savingFrais, setSavingFrais] = useState(false);
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

  const fetchResume = async (distributeurId, year, month) => {
    if (!distributeurId) return;
    try {
      const params = {};
      if (year != null) params.year = year;
      if (month != null) params.month = month;
      const response = await axios.get(
        `/api/distributeurs/${distributeurId}/resume/`,
        { params }
      );
      setResume(response.data);
    } catch (error) {
      console.error("Erreur chargement résumé:", error);
      showSnackbar("Erreur lors du chargement du résumé", "error");
    }
  };

  const fetchResumeProduits = async (distributeurId, year, month) => {
    if (!distributeurId) return;
    try {
      setLoadingResumeProduits(true);
      const params = {};
      if (year != null) params.year = year;
      if (month != null) params.month = month;
      const response = await axios.get(
        `/api/distributeurs/${distributeurId}/resume_produits/`,
        { params }
      );
      setResumeProduits(response.data);
    } catch (error) {
      console.error("Erreur chargement bénéfice par produit:", error);
      showSnackbar("Erreur lors du chargement des produits", "error");
      setResumeProduits({ produits: [] });
    } finally {
      setLoadingResumeProduits(false);
    }
  };

  const fetchMeilleurMois = async (distributeurId) => {
    if (!distributeurId) return;
    try {
      const response = await axios.get(
        `/api/distributeurs/${distributeurId}/meilleur_mois/`
      );
      setMeilleurMois(response.data);
    } catch (error) {
      console.error("Erreur chargement meilleur mois:", error);
      setMeilleurMois({ year: null, month: null, benefice: null });
    }
  };

  const fetchFrais = async (distributeurId) => {
    if (!distributeurId) return;
    try {
      const response = await axios.get("/api/distributeur-frais/", {
        params: { distributeur_id: distributeurId },
      });
      const data = response.data.results || response.data;
      setFraisList(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erreur chargement frais:", error);
      setFraisList([]);
    }
  };

  const handleOpenFraisDialog = () => {
    setEditingFrais(null);
    setFraisForm({
      description: "",
      date_frais: new Date().toISOString().slice(0, 10),
      montant: "",
      category: "autre",
      recurrence: "",
    });
    fetchFrais(selectedId);
    setOpenFraisDialog(true);
  };

  const handleSaveFrais = async () => {
    if (!selectedId || (!fraisForm.description?.trim() && !fraisForm.montant)) return;
    const montant = parseFloat(String(fraisForm.montant).replace(",", "."));
    if (isNaN(montant) || montant < 0) return;
    setSavingFrais(true);
    try {
      const payload = {
        distributeur: selectedId,
        description: fraisForm.description?.trim() || "Frais",
        date_frais: fraisForm.date_frais,
        montant: montant,
        category: fraisForm.category || "autre",
        recurrence: fraisForm.recurrence || "",
      };
      if (editingFrais?.id) {
        await axios.patch(`/api/distributeur-frais/${editingFrais.id}/`, payload);
        showSnackbar("Frais mis à jour");
      } else {
        await axios.post("/api/distributeur-frais/", payload);
        showSnackbar("Frais ajouté");
      }
      setEditingFrais(null);
      setFraisForm({
        description: "",
        date_frais: new Date().toISOString().slice(0, 10),
        montant: "",
        category: "autre",
        recurrence: "",
      });
      fetchFrais(selectedId);
      if (benefitViewMode === "mois") {
        fetchResume(selectedId, benefitYear, benefitMonth);
      } else if (benefitViewMode === "annuel") {
        fetchResume(selectedId, benefitYear, null);
      } else {
        fetchResume(selectedId);
      }
    } catch (error) {
      console.error("Erreur sauvegarde frais:", error);
      showSnackbar(error.response?.data?.detail || "Erreur lors de la sauvegarde", "error");
    } finally {
      setSavingFrais(false);
    }
  };

  const handleEditFrais = (frais) => {
    setEditingFrais(frais);
    setFraisForm({
      description: frais.description || "",
      date_frais: frais.date_frais ? frais.date_frais.slice(0, 10) : new Date().toISOString().slice(0, 10),
      montant: frais.montant != null ? String(frais.montant) : "",
      category: frais.category || "autre",
      recurrence: frais.recurrence || "",
    });
  };

  const handleDeleteFrais = async (id) => {
    if (!window.confirm("Supprimer ce frais ?")) return;
    try {
      await axios.delete(`/api/distributeur-frais/${id}/`);
      showSnackbar("Frais supprimé");
      fetchFrais(selectedId);
      if (benefitViewMode === "mois") {
        fetchResume(selectedId, benefitYear, benefitMonth);
      } else if (benefitViewMode === "annuel") {
        fetchResume(selectedId, benefitYear, null);
      } else {
        fetchResume(selectedId);
      }
    } catch (error) {
      console.error("Erreur suppression frais:", error);
      showSnackbar("Erreur lors de la suppression", "error");
    }
  };

  // Frais filtrés par la période bénéfice courante (mois / annuel / global)
  const fraisFilteredByPeriod = useMemo(() => {
    if (!fraisList.length) return [];
    if (benefitViewMode === "global") return fraisList;
    return fraisList.filter((f) => {
      const d = f.date_frais ? new Date(f.date_frais) : null;
      if (!d) return false;
      if (benefitViewMode === "mois") {
        return d.getFullYear() === benefitYear && d.getMonth() + 1 === benefitMonth;
      }
      if (benefitViewMode === "annuel") return d.getFullYear() === benefitYear;
      return true;
    });
  }, [fraisList, benefitViewMode, benefitYear, benefitMonth]);

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
    setEditingLigneId(null);
  };

  const handleSaveLigne = async (ligneId) => {
    const prix = parseFloat(String(editLignePrix).replace(",", "."));
    const cout = editLigneCout === "" || editLigneCout == null ? null : parseFloat(String(editLigneCout).replace(",", "."));
    if (isNaN(prix) || prix < 0) return;
    if (cout !== null && (isNaN(cout) || cout < 0)) return;
    setSavingLigne(true);
    try {
      await axios.patch(`/api/distributeur-reappro-lignes/${ligneId}/`, {
        prix_vente: prix,
        cout_unitaire: cout,
      });
      showSnackbar("Ligne mise à jour");
      setEditingLigneId(null);
      const sessionId = selectedReapproSession?.id;
      if (sessionId) {
        await handleOpenReapproDetail(sessionId);
      }
      fetchReapproSessions(selectedId);
      fetchMeilleurMois(selectedId);
      if (benefitViewMode === "mois") {
        fetchResume(selectedId, benefitYear, benefitMonth);
        fetchResumeProduits(selectedId, benefitYear, benefitMonth);
      } else if (benefitViewMode === "annuel") {
        fetchResume(selectedId, benefitYear, null);
        fetchResumeProduits(selectedId, benefitYear, null);
      } else {
        fetchResume(selectedId);
        fetchResumeProduits(selectedId);
      }
    } catch (error) {
      console.error("Erreur mise à jour ligne:", error);
      showSnackbar(error.response?.data?.detail || error.response?.data?.prix_vente?.[0] || "Erreur lors de la mise à jour", "error");
    } finally {
      setSavingLigne(false);
    }
  };

  const handleOpenEditMouvement = (mouvement) => {
    setEditingMouvement(mouvement);
    setMouvementForm({
      ...defaultMouvementForm,
      mouvement_type: mouvement.mouvement_type,
      quantite: mouvement.quantite,
      prix_unitaire: mouvement.prix_unitaire ?? 0,
      date_mouvement: mouvement.date_mouvement ? new Date(mouvement.date_mouvement).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16),
      commentaire: mouvement.commentaire || "",
    });
    setOpenMouvementEditModal(true);
  };

  const handleSaveMouvementEdit = async () => {
    if (!editingMouvement?.id) return;
    try {
      await axios.patch(`/api/distributeur-mouvements/${editingMouvement.id}/`, {
        mouvement_type: mouvementForm.mouvement_type,
        quantite: Number(mouvementForm.quantite),
        prix_unitaire: Number(mouvementForm.prix_unitaire),
        date_mouvement: mouvementForm.date_mouvement,
        commentaire: mouvementForm.commentaire || "",
      });
      showSnackbar("Mouvement mis à jour");
      setOpenMouvementEditModal(false);
      setEditingMouvement(null);
      setMouvementForm(defaultMouvementForm);
      fetchMouvements(selectedId);
    } catch (error) {
      console.error("Erreur mise à jour mouvement:", error);
      showSnackbar(error.response?.data?.detail || "Erreur lors de la mise à jour", "error");
    }
  };

  useEffect(() => {
    fetchDistributeurs();
  }, []);

  useEffect(() => {
    if (initialDistributeurId != null && distributeurs.some((d) => d.id === initialDistributeurId)) {
      setSelectedId(initialDistributeurId);
      onDistributeurIdConsumed?.();
    }
  }, [initialDistributeurId, distributeurs, onDistributeurIdConsumed]);

  useEffect(() => {
    if (!selectedId) return;
    fetchMouvements(selectedId);
    fetchReapproSessions(selectedId);
    fetchMeilleurMois(selectedId);
    setSavedReappro(getReapproFromStorage());
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    if (benefitViewMode === "mois") {
      fetchResume(selectedId, benefitYear, benefitMonth);
      fetchResumeProduits(selectedId, benefitYear, benefitMonth);
    } else if (benefitViewMode === "annuel") {
      fetchResume(selectedId, benefitYear, null);
      fetchResumeProduits(selectedId, benefitYear, null);
    } else {
      fetchResume(selectedId);
      fetchResumeProduits(selectedId);
    }
  }, [selectedId, benefitYear, benefitMonth, benefitViewMode]);

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
      {/* Header - affiché uniquement sur mobile (desktop a déjà un header dans DesktopAppLayout) */}
      {isMobile ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
            px: 2,
            pt: 2,
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
      ) : (
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
          <Button
            variant="contained"
            startIcon={<MdAdd />}
            onClick={openCreateDistributeur}
            sx={{ 
              borderRadius: "12px",
              textTransform: "none",
              fontWeight: 700,
              px: 3,
              py: 1.2,
              boxShadow: "0 4px 12px rgba(25, 118, 210, 0.2)",
            }}
          >
            Nouveau distributeur
          </Button>
        </Box>
      )}

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
        <Grid container spacing={isDesktop ? 3 : 2} sx={{ px: isDesktop ? 0 : 2 }}>
          {distributeurs.map((distributeur) => (
            <Grid item xs={12} md={isDesktop ? 6 : 12} lg={isDesktop ? 4 : 12} key={distributeur.id}>
              <Card
                elevation={0}
                sx={{
                  borderRadius: isDesktop ? "16px" : "20px",
                  border: "1px solid",
                  borderColor: "divider",
                  bgcolor: "background.paper",
                  overflow: "hidden",
                  transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
                  height: "100%",
                  "&:active": isMobile ? {
                    transform: "scale(0.98)",
                    bgcolor: "grey.50",
                  } : {},
                  "&:hover": isDesktop ? {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.1)",
                    borderColor: "primary.main"
                  } : {},
                }}
              >
              <CardActionArea
                onClick={() => handleSelectDistributeur(distributeur.id)}
                sx={{ p: 0 }}
              >
                <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                  {/* Icon Container with subtle status indicator */}
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: "14px",
                      bgcolor: distributeur.actif ? "primary.50" : "grey.100",
                      color: distributeur.actif ? "primary.main" : "text.disabled",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      position: "relative"
                    }}
                  >
                    <MdStorefront size={24} />
                    {/* Minimal Status Dot */}
                    <Box sx={{ 
                      position: "absolute", 
                      top: -2, 
                      right: -2, 
                      width: 12, 
                      height: 12, 
                      borderRadius: "50%", 
                      bgcolor: distributeur.actif ? "success.main" : "error.main",
                      border: "2px solid white"
                    }} />
                  </Box>

                  {/* Content */}
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 800,
                        fontSize: "1rem",
                        color: "text.primary",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {distributeur.nom}
                    </Typography>
                    
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.2 }}>
                      <MdLocationOn size={14} color="#999" />
                      <Typography
                        variant="caption"
                        sx={{
                          color: "text.secondary",
                          fontWeight: 500,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {distributeur.emplacement || "Aucun emplacement"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Minimal Right Arrow */}
                  <MdChevronRight size={20} color="#ccc" />
                </Box>
              </CardActionArea>

              {/* Minimal Actions - Integrated without a heavy footer */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  px: 1.5,
                  pb: 1.5,
                  gap: 1
                }}
              >
                <Button
                  size="small"
                  variant="text"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditDistributeur(distributeur);
                  }}
                  sx={{ 
                    borderRadius: "8px", 
                    textTransform: "none",
                    color: "primary.main",
                    fontWeight: 800,
                    fontSize: "0.75rem",
                    minWidth: 0,
                    px: 1.5,
                    bgcolor: "primary.50",
                    "&:hover": { bgcolor: "primary.100" }
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
                    color: "error.main",
                    bgcolor: "error.50",
                    borderRadius: "8px",
                    p: 0.6,
                    "&:hover": { bgcolor: "error.100" }
                  }}
                >
                  <MdDelete size={16} />
                </IconButton>
              </Box>
            </Card>
          </Grid>
          ))}
        </Grid>
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

      {/* Résumé financier — Bénéfice (clic sur la carte pour changer l'affichage) */}
      <Box sx={{ px: 2, mb: 4 }}>
        <Typography 
          variant="subtitle2" 
          sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "1.2px", mb: 2 }}
        >
          Performance Financière
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Paper 
              elevation={0}
              onClick={() => setOpenBenefitModal(true)}
              sx={{ 
                p: 3, 
                borderRadius: "28px", 
                bgcolor: "primary.main", 
                color: "white",
                position: "relative",
                overflow: "hidden",
                boxShadow: "0 12px 32px rgba(25, 118, 210, 0.3)",
                cursor: "pointer",
                transition: "all 0.2s",
                "&:active": { transform: "scale(0.98)" },
                "&:hover": { bgcolor: "primary.dark" }
              }}
            >
              <Box sx={{ position: "absolute", right: -20, top: -20, opacity: 0.1, transform: "rotate(-15deg)" }}>
                <MdAttachMoney size={120} />
              </Box>
              <Box sx={{ position: "relative", zIndex: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.8, fontWeight: 700, textTransform: "uppercase" }}>
                  Bénéfice Net — {benefitViewMode === "mois"
                    ? `${["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"][benefitMonth - 1]} ${benefitYear}`
                    : benefitViewMode === "annuel"
                    ? `Année ${benefitYear}`
                    : "Total global"}
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 900, my: 0.5, letterSpacing: "-1px" }}>
                  {(resume.benefice_total ?? resume.benefice)?.toFixed(2) ?? "0.00"} €
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1, alignItems: "center" }}>
                  {meilleurMois?.year != null && meilleurMois?.month != null && (
                    <Box sx={{ 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 0.5, 
                      bgcolor: "rgba(255,255,255,0.15)", 
                      px: 1, 
                      py: 0.3, 
                      borderRadius: "8px",
                      backdropFilter: "blur(4px)"
                    }}>
                      <MdEmojiEvents size={14} color="#ffd700" />
                      <Typography variant="caption" sx={{ color: "white", fontWeight: 700, fontSize: "0.65rem" }}>
                        Record: {["Janv.", "Fév.", "Mars", "Avril", "Mai", "Juin", "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."][meilleurMois.month - 1]} {meilleurMois.year} ({Number(meilleurMois.benefice ?? 0).toFixed(2)} €)
                      </Typography>
                    </Box>
                  )}
                  {(resume.total_frais != null && Number(resume.total_frais) > 0) && (
                    <Typography component="span" variant="caption" sx={{ color: "rgba(255,255,255,0.85)", fontSize: "0.7rem" }}>
                      Frais période : -{Number(resume.total_frais).toFixed(2)} €
                    </Typography>
                  )}
                </Box>
                <Typography variant="caption" sx={{ display: "block", mt: 1, opacity: 0.8 }}>
                  Cliquer pour changer la période
                </Typography>
              </Box>
            </Paper>
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => setOpenProductStatsModal(true)}
              sx={{
                borderRadius: "18px",
                py: 1.5,
                textTransform: "none",
                fontWeight: 800,
                borderColor: "divider",
                color: "text.primary",
                bgcolor: "background.paper",
                display: "flex",
                justifyContent: "space-between",
                px: 2.5,
                border: "1px solid",
                "&:active": { transform: "scale(0.98)" },
                "& .MuiButton-startIcon": { color: "primary.main" }
              }}
              startIcon={<MdTrendingUp size={24} />}
              endIcon={<MdChevronRight size={20} color="#ccc" />}
            >
              Analyse détaillée par produit
            </Button>
          </Grid>
          <Grid item xs={12}>
            <Button
              fullWidth
              variant="outlined"
              onClick={handleOpenFraisDialog}
              sx={{
                borderRadius: "18px",
                py: 1.5,
                textTransform: "none",
                fontWeight: 800,
                borderColor: "divider",
                color: "text.primary",
                bgcolor: "background.paper",
                display: "flex",
                justifyContent: "space-between",
                px: 2.5,
                border: "1px solid",
                "&:active": { transform: "scale(0.98)" },
                "& .MuiButton-startIcon": { color: "primary.main" }
              }}
              startIcon={<MdReceipt size={24} />}
              endIcon={<MdChevronRight size={20} color="#ccc" />}
            >
              Liste des frais
            </Button>
          </Grid>
        </Grid>
      </Box>

      {/* Détail des bénéfices par produit — Meilleures ventes */}
      {/* (Section supprimée car remplacée par le modal de performance) */}

      {/* Modal choix affichage bénéfice (par mois / annuel / global) */}
      <Dialog 
        open={openBenefitModal} 
        onClose={() => setOpenBenefitModal(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: isMobile ? "24px 24px 0 0" : "28px",
            position: isMobile ? "fixed" : "relative",
            bottom: isMobile ? 0 : "auto",
            m: isMobile ? 0 : 2,
            maxHeight: "90vh"
          }
        }}
      >
        <DialogTitle sx={{ 
          textAlign: "center", 
          fontWeight: 800, 
          pt: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1
        }}>
          {isMobile && (
            <Box sx={{ 
              width: 40, 
              height: 4, 
              bgcolor: "grey.300", 
              borderRadius: 2, 
              mb: 2 
            }} />
          )}
          Période d'affichage
        </DialogTitle>
        <DialogContent sx={{ pb: 4 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
            {/* Option: Par mois */}
            <Paper
              elevation={0}
              onClick={() => setBenefitViewMode("mois")}
              sx={{
                p: 2,
                borderRadius: "16px",
                border: "2px solid",
                borderColor: benefitViewMode === "mois" ? "primary.main" : "divider",
                bgcolor: benefitViewMode === "mois" ? "primary.50" : "background.paper",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: benefitViewMode === "mois" ? 2 : 0 }}>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: "12px", 
                  bgcolor: benefitViewMode === "mois" ? "primary.main" : "grey.100",
                  color: benefitViewMode === "mois" ? "white" : "grey.600"
                }}>
                  <MdCalendarMonth size={24} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                  Par mois
                </Typography>
                {benefitViewMode === "mois" && (
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "primary.main" }} />
                )}
              </Box>
              
              {benefitViewMode === "mois" && (
                <Box sx={{ display: "flex", gap: 1.5 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Mois</InputLabel>
                    <Select
                      value={benefitMonth}
                      label="Mois"
                      onChange={(e) => setBenefitMonth(Number(e.target.value))}
                      sx={{ borderRadius: "10px" }}
                    >
                      {["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"].map((label, i) => (
                        <MenuItem key={i} value={i + 1}>{label}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl fullWidth size="small">
                    <InputLabel>Année</InputLabel>
                    <Select
                      value={benefitYear}
                      label="Année"
                      onChange={(e) => setBenefitYear(Number(e.target.value))}
                      sx={{ borderRadius: "10px" }}
                    >
                      {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <MenuItem key={y} value={y}>{y}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              )}
            </Paper>

            {/* Option: Annuel */}
            <Paper
              elevation={0}
              onClick={() => setBenefitViewMode("annuel")}
              sx={{
                p: 2,
                borderRadius: "16px",
                border: "2px solid",
                borderColor: benefitViewMode === "annuel" ? "primary.main" : "divider",
                bgcolor: benefitViewMode === "annuel" ? "primary.50" : "background.paper",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: benefitViewMode === "annuel" ? 2 : 0 }}>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: "12px", 
                  bgcolor: benefitViewMode === "annuel" ? "primary.main" : "grey.100",
                  color: benefitViewMode === "annuel" ? "white" : "grey.600"
                }}>
                  <MdDateRange size={24} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                  Année complète
                </Typography>
                {benefitViewMode === "annuel" && (
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "primary.main" }} />
                )}
              </Box>
              
              {benefitViewMode === "annuel" && (
                <FormControl fullWidth size="small">
                  <InputLabel>Année</InputLabel>
                  <Select
                    value={benefitYear}
                    label="Année"
                    onChange={(e) => setBenefitYear(Number(e.target.value))}
                    sx={{ borderRadius: "10px" }}
                  >
                    {Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <MenuItem key={y} value={y}>{y}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Paper>

            {/* Option: Global */}
            <Paper
              elevation={0}
              onClick={() => setBenefitViewMode("global")}
              sx={{
                p: 2,
                borderRadius: "16px",
                border: "2px solid",
                borderColor: benefitViewMode === "global" ? "primary.main" : "divider",
                bgcolor: benefitViewMode === "global" ? "primary.50" : "background.paper",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box sx={{ 
                  p: 1, 
                  borderRadius: "12px", 
                  bgcolor: benefitViewMode === "global" ? "primary.main" : "grey.100",
                  color: benefitViewMode === "global" ? "white" : "grey.600"
                }}>
                  <MdPublic size={24} />
                </Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, flex: 1 }}>
                  Vue globale
                </Typography>
                {benefitViewMode === "global" && (
                  <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "primary.main" }} />
                )}
              </Box>
            </Paper>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            fullWidth 
            variant="contained" 
            onClick={() => setOpenBenefitModal(false)}
            sx={{ 
              borderRadius: "14px", 
              py: 1.5, 
              fontWeight: 700,
              textTransform: "none"
            }}
          >
            Appliquer les filtres
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal Performance Produits */}
      <Dialog 
        open={openProductStatsModal} 
        onClose={() => setOpenProductStatsModal(false)} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: isMobile ? "24px 24px 0 0" : "28px",
            position: isMobile ? "fixed" : "relative",
            bottom: isMobile ? 0 : "auto",
            m: isMobile ? 0 : 2,
            maxHeight: "90vh"
          }
        }}
      >
        <DialogTitle sx={{ 
          textAlign: "center", 
          fontWeight: 800, 
          pt: 3,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1
        }}>
          {isMobile && (
            <Box sx={{ 
              width: 40, 
              height: 4, 
              bgcolor: "grey.300", 
              borderRadius: 2, 
              mb: 2 
            }} />
          )}
          Performance des Produits
          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700 }}>
            {benefitViewMode === "mois"
              ? `${["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"][benefitMonth - 1]} ${benefitYear}`
              : benefitViewMode === "annuel"
              ? `Année ${benefitYear}`
              : "Toute la période"}
          </Typography>
        </DialogTitle>
        <DialogContent sx={{ pb: 4, px: 2 }}>
          {loadingResumeProduits ? (
            <Box sx={{ py: 6, textAlign: "center" }}>
              <LinearProgress sx={{ borderRadius: 2, height: 4, mb: 2 }} />
              <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary" }}>
                Analyse des ventes en cours...
              </Typography>
            </Box>
          ) : (resumeProduits?.produits || []).filter(p => p.ca_ventes > 0 || p.benefice > 0).length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center", opacity: 0.6 }}>
              <MdHistory size={48} color="#ccc" />
              <Typography variant="body2" sx={{ mt: 2, fontWeight: 700, color: "text.secondary" }}>
                Aucune donnée de performance
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
              {(() => {
                // % = part du bénéfice total représentée par ce produit
                const prods = (resumeProduits?.produits || []).filter(p => p.ca_ventes > 0 || p.benefice > 0);
                const totalBenefice = prods.reduce((acc, p) => acc + Number(p.benefice || 0), 0);
                const scoredProds = prods
                  .map(p => ({
                    ...p,
                    pctBenefice: totalBenefice > 0 ? (Number(p.benefice || 0) / totalBenefice) * 100 : 0,
                  }))
                  .sort((a, b) => b.pctBenefice - a.pctBenefice);

                const colors = [
                  "#2196f3", // Bleu
                  "#4caf50", // Vert
                  "#ff9800", // Orange
                  "#f44336", // Rouge
                  "#9c27b0", // Violet
                  "#00bcd4", // Cyan
                  "#e91e63", // Rose
                  "#3f51b5", // Indigo
                  "#ffc107", // Ambre
                  "#009688", // Teal
                ];

                return scoredProds.map((p, idx) => {
                  const pctBenefice = p.pctBenefice ?? 0;
                  const barColor = colors[idx % colors.length];
                  
                  return (
                    <Box key={p.cell_id}>
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", mb: 0.5 }}>
                        <Box sx={{ flex: 1, minWidth: 0, pr: 2 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.primary", fontSize: "0.9rem", lineHeight: 1.2 }}>
                            {idx + 1}. {p.nom_produit}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: "0.7rem" }}>
                            {p.quantite_vendue} u. • {p.benefice.toFixed(2)} €
                          </Typography>
                        </Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 900, color: barColor, fontSize: "0.85rem" }}>
                          {pctBenefice.toFixed(1)}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={Math.max(pctBenefice, 2)} 
                        sx={{ 
                          height: 6, 
                          borderRadius: 3,
                          bgcolor: "grey.100",
                          "& .MuiLinearProgress-bar": {
                            borderRadius: 3,
                            bgcolor: barColor
                          }
                        }} 
                      />
                    </Box>
                  );
                });
              })()}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button 
            fullWidth 
            variant="outlined" 
            onClick={() => setOpenProductStatsModal(false)}
            sx={{ 
              borderRadius: "14px", 
              py: 1.5, 
              fontWeight: 700,
              textTransform: "none",
              borderColor: "divider",
              color: "text.primary"
            }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );

  return (
    <Box
      sx={{
        minHeight: isMobile ? "100vh" : "auto",
        height: isMobile ? "100vh" : "auto",
        bgcolor: isDesktop ? "transparent" : "background.default",
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
          WebkitOverflowScrolling: "touch",
          // Réserve en bas pour que la navbar horizontale (MobileAppLayout) ne masque rien en fin de scroll
          pb: isMobile ? "120px" : 4,
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
              if (benefitViewMode === "mois") {
                fetchResume(selectedId, benefitYear, benefitMonth);
                fetchResumeProduits(selectedId, benefitYear, benefitMonth);
              } else if (benefitViewMode === "annuel") {
                fetchResume(selectedId, benefitYear, null);
                fetchResumeProduits(selectedId, benefitYear, null);
              } else {
                fetchResume(selectedId);
                fetchResumeProduits(selectedId);
              }
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

      {/* Modal modification mouvement individuel */}
      <Dialog
        open={openMouvementEditModal}
        onClose={() => {
          setOpenMouvementEditModal(false);
          setEditingMouvement(null);
          setMouvementForm(defaultMouvementForm);
        }}
        maxWidth="sm"
        fullWidth
        fullScreen={window.innerWidth < 600}
      >
        <DialogTitle>Modifier le mouvement</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel id="mouvement-edit-type-label">Type</InputLabel>
            <Select
              labelId="mouvement-edit-type-label"
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
          <Button
            onClick={() => {
              setOpenMouvementEditModal(false);
              setEditingMouvement(null);
              setMouvementForm(defaultMouvementForm);
            }}
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleSaveMouvementEdit}
            disabled={!mouvementForm.quantite || !mouvementForm.prix_unitaire}
            sx={{ minHeight: 44 }}
          >
            Enregistrer
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

                    {/* Grid de données — ou formulaire d'édition */}
                    {editingLigneId === ligne.id ? (
                      <Box sx={{ mt: 2 }}>
                        <Grid container spacing={2}>
                          <Grid item xs={6}>
                            <TextField
                              size="small"
                              fullWidth
                              label="Prix vente (€)"
                              type="number"
                              value={editLignePrix}
                              onChange={(e) => setEditLignePrix(e.target.value)}
                              inputProps={{ min: 0, step: 0.01 }}
                            />
                          </Grid>
                          <Grid item xs={6}>
                            <TextField
                              size="small"
                              fullWidth
                              label="Coût unitaire (€)"
                              type="number"
                              value={editLigneCout}
                              onChange={(e) => setEditLigneCout(e.target.value)}
                              inputProps={{ min: 0, step: 0.01 }}
                              placeholder="Optionnel"
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end", mt: 1 }}>
                              <Button size="small" variant="outlined" onClick={() => setEditingLigneId(null)} disabled={savingLigne}>
                                Annuler
                              </Button>
                              <Button size="small" variant="contained" onClick={() => handleSaveLigne(ligne.id)} disabled={savingLigne}>
                                {savingLigne ? "Enregistrement…" : "Enregistrer"}
                              </Button>
                            </Box>
                          </Grid>
                        </Grid>
                      </Box>
                    ) : (
                      <>
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
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 700, fontSize: "0.6rem" }}>
                                  BÉNÉFICE
                                </Typography>
                                <Typography variant="body1" sx={{ 
                                  fontWeight: 900, 
                                  color: (ligne.benefice ?? 0) >= 0 ? "success.main" : "error.main" 
                                }}>
                                  {(ligne.benefice ?? 0).toFixed(2)} €
                                </Typography>
                                <Button
                                  size="small"
                                  variant="text"
                                  onClick={() => {
                                    setEditingLigneId(ligne.id);
                                    setEditLignePrix(String(ligne.prix_vente ?? ""));
                                    setEditLigneCout(ligne.cout_unitaire != null ? String(ligne.cout_unitaire) : "");
                                  }}
                                  sx={{ minWidth: "auto", fontWeight: 700 }}
                                >
                                  Modifier
                                </Button>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      </>
                    )}
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

      {/* Dialog Liste des frais — filtre période = période bénéfice, formulaire date / description / montant / catégorie / récurrence */}
      <Dialog
        open={openFraisDialog}
        onClose={() => {
          setOpenFraisDialog(false);
          setEditingFrais(null);
        }}
        maxWidth="sm"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: {
            borderRadius: isMobile ? "24px 24px 0 0" : "28px",
            position: isMobile ? "fixed" : "relative",
            bottom: isMobile ? 0 : "auto",
            m: isMobile ? 0 : 2,
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 800,
            pt: 3,
            pb: 1,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Liste des frais
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
              {benefitViewMode === "mois"
                ? `${["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"][benefitMonth - 1]} ${benefitYear}`
                : benefitViewMode === "annuel"
                ? `Année ${benefitYear}`
                : "Toute la période"}
            </Typography>
          </Box>
          <IconButton onClick={() => setOpenFraisDialog(false)} size="small" sx={{ borderRadius: "12px" }}>
            <MdClose size={22} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ px: 2, pb: 2, bgcolor: "grey.50" }}>
          {/* Formulaire : ajout / édition */}
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2.5, 
              mb: 3, 
              borderRadius: "24px", 
              border: "1px solid", 
              borderColor: "divider",
              bgcolor: "background.paper",
              boxShadow: "0 4px 12px rgba(0,0,0,0.03)"
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
              <Box sx={{ p: 0.8, borderRadius: "10px", bgcolor: "primary.50", color: "primary.main" }}>
                <MdAdd size={20} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "text.primary" }}>
                {editingFrais ? "Modifier le frais" : "Ajouter un frais"}
              </Typography>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Date"
                    type="date"
                    value={fraisForm.date_frais}
                    onChange={(e) => setFraisForm((p) => ({ ...p, date_frais: e.target.value }))}
                    fullWidth
                    size="small"
                    InputLabelProps={{ shrink: true }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", bgcolor: "grey.50" } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Montant (€)"
                    type="number"
                    value={fraisForm.montant}
                    onChange={(e) => setFraisForm((p) => ({ ...p, montant: e.target.value }))}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0, step: 0.01 }}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", bgcolor: "grey.50" } }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label="Description"
                    placeholder="Ex: Frais banque TPE, Maintenance..."
                    value={fraisForm.description}
                    onChange={(e) => setFraisForm((p) => ({ ...p, description: e.target.value }))}
                    fullWidth
                    size="small"
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", bgcolor: "grey.50" } }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", bgcolor: "grey.50" } }}>
                    <InputLabel>Type</InputLabel>
                    <Select
                      value={fraisForm.category || "autre"}
                      label="Type"
                      onChange={(e) => setFraisForm((p) => ({ ...p, category: e.target.value }))}
                    >
                      <MenuItem value="bancaire">Frais bancaire / TPE</MenuItem>
                      <MenuItem value="maintenance">Maintenance / Entretien</MenuItem>
                      <MenuItem value="autre">Autre</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small" sx={{ "& .MuiOutlinedInput-root": { borderRadius: "14px", bgcolor: "grey.50" } }}>
                    <InputLabel>Récurrence</InputLabel>
                    <Select
                      value={fraisForm.recurrence || ""}
                      label="Récurrence"
                      onChange={(e) => setFraisForm((p) => ({ ...p, recurrence: e.target.value }))}
                    >
                      <MenuItem value="">Ponctuel</MenuItem>
                      <MenuItem value="mensuel">Mensuel</MenuItem>
                      <MenuItem value="hebdomadaire">Hebdomadaire</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              <Box sx={{ display: "flex", gap: 1.5, mt: 1 }}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleSaveFrais}
                  disabled={savingFrais || !fraisForm.montant}
                  sx={{ 
                    borderRadius: "14px", 
                    py: 1.2,
                    textTransform: "none", 
                    fontWeight: 800,
                    boxShadow: "0 4px 12px rgba(25, 118, 210, 0.2)"
                  }}
                >
                  {savingFrais ? "Enregistrement…" : editingFrais ? "Enregistrer les modifications" : "Ajouter le frais"}
                </Button>
                {editingFrais && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setEditingFrais(null);
                      setFraisForm({
                        description: "",
                        date_frais: new Date().toISOString().slice(0, 10),
                        montant: "",
                        category: "autre",
                        recurrence: "",
                      });
                    }}
                    sx={{ borderRadius: "14px", textTransform: "none", fontWeight: 700, px: 3 }}
                  >
                    Annuler
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>

          {/* Liste des frais (filtrée par période bénéfice) */}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, px: 0.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "text.secondary", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "1px" }}>
              Historique période
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "error.main", bgcolor: "error.50", px: 1.5, py: 0.5, borderRadius: "10px" }}>
              Total : -{fraisFilteredByPeriod.reduce((acc, f) => acc + Number(f.montant), 0).toFixed(2)} €
            </Typography>
          </Box>

          {fraisFilteredByPeriod.length === 0 ? (
            <Box sx={{ py: 6, textAlign: "center", bgcolor: "background.paper", borderRadius: "24px", border: "1px dashed", borderColor: "divider" }}>
              <MdReceipt size={40} style={{ color: "#ccc", marginBottom: 8 }} />
              <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                Aucun frais sur cette période
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {fraisFilteredByPeriod.map((f) => (
                <Card
                  key={f.id}
                  elevation={0}
                  sx={{
                    borderRadius: "20px",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                    transition: "all 0.2s",
                    "&:active": { transform: "scale(0.98)" }
                  }}
                >
                  <Box sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
                    <Box sx={{ 
                      width: 44, 
                      height: 44, 
                      borderRadius: "12px", 
                      bgcolor: f.category === "bancaire" ? "info.50" : f.category === "maintenance" ? "warning.50" : "grey.50",
                      color: f.category === "bancaire" ? "info.main" : f.category === "maintenance" ? "warning.main" : "grey.600",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0
                    }}>
                      {f.category === "bancaire" ? <MdCreditCard size={22} /> : f.category === "maintenance" ? <MdBuild size={22} /> : <MdReceipt size={22} />}
                    </Box>

                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, lineHeight: 1.2, mb: 0.5 }}>
                        {f.description || "Frais"}
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Typography variant="caption" sx={{ color: "text.secondary", fontWeight: 600 }}>
                          {f.date_frais ? new Date(f.date_frais).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }) : ""}
                        </Typography>
                        {f.recurrence && (
                          <Box sx={{ width: 4, height: 4, borderRadius: "50%", bgcolor: "divider" }} />
                        )}
                        <Typography variant="caption" sx={{ color: "primary.main", fontWeight: 700 }}>
                          {f.recurrence === "mensuel" ? "Mensuel" : f.recurrence === "hebdomadaire" ? "Hebdo" : ""}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ textAlign: "right", mr: 1 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 900, color: "error.main" }}>
                        -{Number(f.montant).toFixed(2)} €
                      </Typography>
                    </Box>

                    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                      <IconButton size="small" onClick={() => handleEditFrais(f)} sx={{ color: "primary.main", bgcolor: "primary.50", p: 0.5 }}>
                        <MdEdit size={16} />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDeleteFrais(f.id)} sx={{ color: "error.main", bgcolor: "error.50", p: 0.5 }}>
                        <MdDelete size={16} />
                      </IconButton>
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2 }}>
          <Button onClick={() => setOpenFraisDialog(false)} variant="contained" sx={{ borderRadius: "14px", fontWeight: 700, textTransform: "none" }}>
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
