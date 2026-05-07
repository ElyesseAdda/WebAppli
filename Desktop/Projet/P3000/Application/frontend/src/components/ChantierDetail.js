import {
  AppBar,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  LinearProgress,
  ListItemButton,
  Paper,
  Stack,
  Tab,
  Tabs,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RecapFinancierProvider } from "./chantier/RecapFinancierContext";

// Composants des onglets
import CloseIcon from "@mui/icons-material/Close";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import ViewListIcon from "@mui/icons-material/ViewList";
import Fuse from "fuse.js";
import ChantierCommandesTab from "./chantier/ChantierCommandesTab";
import ChantierDocumentsTab from "./chantier/ChantierDocumentsTab";
import ChantierInfoTab from "./chantier/ChantierInfoTab";
import ChantierRecapFinancierTab from "./chantier/ChantierRecapFinancierTab";

// Déplace TabPanel en dehors du composant ChantierDetail
/** Filtres statut demandés pour la modale liste chantiers (valeurs API `state_chantier`) */
const MODAL_STATUT_OPTIONS = [
  { value: "En Cours", label: "En cours" },
  { value: "En attente", label: "En attente" },
  { value: "Terminé", label: "Terminé" },
];

/** Couleurs filtres / badges / modale édition (`state_chantier`) — En cours = vert, Terminé = rouge */
const statutPalette = (theme, key) => {
  const map = {
    all: {
      main: theme.palette.grey[700],
      dark: theme.palette.grey[900],
      border: alpha(theme.palette.grey[600], 0.45),
      subtle: alpha(theme.palette.grey[600], 0.14),
    },
    "En Cours": {
      main: theme.palette.success.main,
      dark: theme.palette.success.dark,
      border: alpha(theme.palette.success.main, 0.45),
      subtle: alpha(theme.palette.success.main, 0.14),
    },
    "En attente": {
      main: theme.palette.warning.main,
      dark: theme.palette.warning.dark,
      border: alpha(theme.palette.warning.main, 0.5),
      subtle: alpha(theme.palette.warning.main, 0.16),
    },
    Terminé: {
      main: theme.palette.error.main,
      dark: theme.palette.error.dark,
      border: alpha(theme.palette.error.main, 0.45),
      subtle: alpha(theme.palette.error.main, 0.14),
    },
  };
  return map[key] || map.all;
};

const sxModalStatutToggle = (theme, key) => {
  const p = statutPalette(theme, key);
  const contrast = theme.palette.getContrastText(p.main);
  return {
    px: 2,
    py: 0.75,
    textTransform: "none",
    fontWeight: 700,
    fontSize: "0.8125rem",
    letterSpacing: "0.01em",
    border: `1px solid ${p.border} !important`,
    bgcolor: theme.palette.background.paper,
    color: p.dark,
    "&.Mui-selected": {
      bgcolor: `${p.main} !important`,
      color: `${contrast} !important`,
      borderColor: `${p.dark} !important`,
      "&:hover": {
        bgcolor: `${p.dark} !important`,
      },
    },
    "&:hover": {
      bgcolor: p.subtle,
      borderColor: `${alpha(p.dark, 0.55)} !important`,
    },
  };
};

const BADGE_STATUT_COLORS = {
  "En Cours": "success",
  "En attente": "warning",
  Terminé: "error",
  Facturé: "info",
};

const ChantierListeStatutBadge = ({ state, onClick, disabled }) => {
  const option = MODAL_STATUT_OPTIONS.find((o) => o.value === state);
  const chipLabel =
    option?.label ??
    (state === "Facturé"
      ? "Facturé"
      : state
        ? state
        : "Autre");
  const color = BADGE_STATUT_COLORS[state] || "default";
  return (
    <Chip
      label={chipLabel}
      size="small"
      color={color}
      variant={color === "default" ? "outlined" : "filled"}
      onClick={onClick}
      disabled={disabled}
      clickable={Boolean(onClick)}
      sx={(theme) => {
        const pal =
          color !== "default" ? theme.palette[color] : theme.palette.grey;
        const main =
          color !== "default" ? pal.main : theme.palette.grey[600];
        return {
          fontWeight: 700,
          fontSize: "0.75rem",
          height: 28,
          letterSpacing: "0.03em",
          borderRadius: 2,
          cursor: onClick ? "pointer" : "default",
          boxShadow:
            onClick && color !== "default"
              ? `0 1px 3px ${alpha(main, 0.25)}`
              : undefined,
          "&:hover":
            onClick && color !== "default"
              ? {
                  boxShadow: `0 2px 6px ${alpha(main, 0.35)}`,
                  filter: "brightness(1.03)",
                }
              : undefined,
          "& .MuiChip-label": { px: 1.5, py: 0 },
        };
      }}
    />
  );
};

const TabPanel = ({ children, value, index }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`chantier-tabpanel-${index}`}
    aria-labelledby={`chantier-tab-${index}`}
    style={{ display: value === index ? "block" : "none" }}
  >
    <Box sx={{ p: 3 }}>{children}</Box>
  </div>
);

const ChantierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [chantierData, setChantierData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // États persistants pour chaque sous-onglet
  const [documentsState, setDocumentsState] = useState({});
  const [uiState, setUiState] = useState({
    commandes: {
      filters: {
        numero: "",
        fournisseur: "",
        date_creation: "",
        montant_total: "",
        statut: "",
        statut_paiement: "",
        montant_paye: "",
        reste_a_payer: "",
      },
      openAccordions: {},
    },
    // ... autres onglets plus tard
  });
  const [infoState, setInfoState] = useState({});

  // --- BARRE DE RECHERCHE CHANTIER ---
  const [chantiers, setChantiers] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [history, setHistory] = useState([]);

  /** Modale : liste complète des chantiers */
  const [modalListeOpen, setModalListeOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState("");
  /** 'all' = tous les statuts ; sinon un seul `state_chantier` à la fois */
  const [modalStatutFiltre, setModalStatutFiltre] = useState("all");
  const [listeModalLoading, setListeModalLoading] = useState(false);
  /** PATCH statut en cours (par id chantier) */
  const [statutSavingId, setStatutSavingId] = useState(null);
  /** Modale secondaire : édition statut depuis un badge */
  const [statutEditContext, setStatutEditContext] = useState(null);
  const [statutEditDraft, setStatutEditDraft] = useState("En Cours");

  // Ref pour la barre de recherche et le dropdown
  const searchBarRef = useRef(null);

  const fermerEditionStatut = useCallback(() => {
    setStatutEditContext(null);
  }, []);

  const handleModalStatutChange = useCallback(async (chantierId, newStatut) => {
    setStatutSavingId(chantierId);
    try {
      await axios.patch(`/api/chantier/${chantierId}/`, {
        state_chantier: newStatut,
      });
      setChantiers((prev) =>
        prev.map((c) =>
          Number(c.id) === Number(chantierId)
            ? { ...c, state_chantier: newStatut }
            : c
        )
      );
      if (String(chantierId) === String(id)) {
        setChantierData((prev) =>
          prev ? { ...prev, statut: newStatut } : prev
        );
      }
      return true;
    } catch (err) {
      console.error(err);
      const msg =
        err.response?.data?.detail ||
        err.response?.data?.state_chantier?.[0] ||
        (typeof err.response?.data === "string"
          ? err.response.data
          : null) ||
        "Impossible de mettre à jour le statut du chantier.";
      alert(msg);
      return false;
    } finally {
      setStatutSavingId(null);
    }
  }, [id]);

  const ouvrirEditionStatutDepuisListe = useCallback((chantier, e) => {
    e.preventDefault();
    e.stopPropagation();
    setStatutEditContext(chantier);
    let initial = chantier.state_chantier;
    if (!MODAL_STATUT_OPTIONS.some((o) => o.value === initial)) {
      initial = initial === "Facturé" ? "Terminé" : "En Cours";
    }
    setStatutEditDraft(initial);
  }, []);

  const confirmerEditionStatut = useCallback(async () => {
    if (!statutEditContext) return;
    if (statutEditDraft === statutEditContext.state_chantier) {
      fermerEditionStatut();
      return;
    }
    const ok = await handleModalStatutChange(
      statutEditContext.id,
      statutEditDraft
    );
    if (ok) fermerEditionStatut();
  }, [
    statutEditContext,
    statutEditDraft,
    handleModalStatutChange,
    fermerEditionStatut,
  ]);

  const chantiersModalFiltres = useMemo(() => {
    let list = [...chantiers];
    if (modalStatutFiltre !== "all") {
      list = list.filter((c) => c.state_chantier === modalStatutFiltre);
    }
    list.sort((a, b) =>
      String(a.chantier_name || "").localeCompare(
        String(b.chantier_name || ""),
        "fr",
        { sensitivity: "base" }
      )
    );
    if (!modalSearch.trim()) return list;
    const fuse = new Fuse(list, {
      keys: ["chantier_name"],
      threshold: 0.4,
    });
    return fuse.search(modalSearch.trim()).map((r) => r.item);
  }, [chantiers, modalStatutFiltre, modalSearch]);

  const fermerModalListe = () => {
    setModalListeOpen(false);
    setModalSearch("");
    setModalStatutFiltre("all");
    setStatutEditContext(null);
  };

  // Charger l'historique depuis localStorage
  useEffect(() => {
    const hist = JSON.parse(localStorage.getItem("chantier_history") || "[]");
    setHistory(hist);
  }, []);

  // Fonction pour nettoyer et mettre à jour l'historique
  const cleanHistory = useCallback((freshChantiers) => {
    const hist = JSON.parse(localStorage.getItem("chantier_history") || "[]");
    const validChantierIds = freshChantiers.map((c) => c.id);

    const updatedHistory = hist
      .filter((chantier) => validChantierIds.includes(chantier.id))
      .map((chantier) => {
        const freshChantier = freshChantiers.find((c) => c.id === chantier.id);
        if (freshChantier) {
          return {
            id: chantier.id,
            chantier_name:
              freshChantier.nom ||
              freshChantier.chantier_name ||
              chantier.chantier_name,
          };
        }
        return chantier;
      });

    const hasChanges =
      updatedHistory.length !== hist.length ||
      updatedHistory.some(
        (updated, index) =>
          hist[index] && updated.chantier_name !== hist[index].chantier_name
      );

    if (hasChanges) {
      setHistory(updatedHistory);
      localStorage.setItem("chantier_history", JSON.stringify(updatedHistory));
    }
  }, []);

  /** Liste chantiers (API) — réutilisé au montage, à l’ouverture modale, icône refresh */
  const fetchChantiersList = useCallback(
    async (opts = {}) => {
      const fromModal = Boolean(opts.fromModal);
      if (fromModal) setListeModalLoading(true);
      try {
        const res = await axios.get("/api/chantier/");
        setChantiers(res.data);
        cleanHistory(res.data);
      } catch (e) {
        console.error("Erreur lors du chargement des chantiers:", e);
      } finally {
        if (fromModal) setListeModalLoading(false);
      }
    },
    [cleanHistory]
  );

  useEffect(() => {
    fetchChantiersList();
  }, [fetchChantiersList]);

  useEffect(() => {
    if (!modalListeOpen) return;
    fetchChantiersList({ fromModal: true });
  }, [modalListeOpen, fetchChantiersList]);

  // Recherche fuzzy avec Fuse.js
  useEffect(() => {
    if (!searchValue) {
      setSearchResults([]);
      return;
    }
    const fuse = new Fuse(chantiers, {
      keys: ["chantier_name"],
      threshold: 0.4, // tolère les fautes
    });
    setSearchResults(fuse.search(searchValue).map((r) => r.item));
  }, [searchValue, chantiers]);

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchBarRef.current &&
        !searchBarRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Gérer la sélection d'un chantier
  const handleSelectChantier = async (chantier) => {
    try {
      // Récupérer les données fraîches du chantier depuis l'API
      const response = await axios.get(`/api/chantier/${chantier.id}/details/`);
      const freshChantierData = response.data;

      // Créer un objet chantier avec les données fraîches pour l'historique
      const updatedChantier = {
        id: freshChantierData.id,
        chantier_name: freshChantierData.nom || freshChantierData.chantier_name,
      };

      // Mettre à jour l'historique avec les données fraîches
      let newHistory = [
        updatedChantier,
        ...history.filter((c) => c.id !== updatedChantier.id),
      ];
      if (newHistory.length > 5) newHistory = newHistory.slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem("chantier_history", JSON.stringify(newHistory));

      const cidMerge = freshChantierData.id;
      const nomMerge =
        freshChantierData.nom || freshChantierData.chantier_name;
      const statutMerge =
        freshChantierData.statut ?? freshChantierData.state_chantier;
      if (cidMerge != null && nomMerge != null) {
        setChantiers((prev) => {
          const idx = prev.findIndex((c) => String(c.id) === String(cidMerge));
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            chantier_name: nomMerge,
            ...(statutMerge != null ? { state_chantier: statutMerge } : {}),
          };
          return next;
        });
      }

      setShowDropdown(false);
      setSearchValue("");
      setModalListeOpen(false);
      setModalSearch("");
      setModalStatutFiltre("all");

      // Rediriger vers le chantier sélectionné
      navigate(`/ChantierDetail/${updatedChantier.id}`);
    } catch (error) {
      console.error("Erreur lors de la sélection du chantier:", error);

      if (error.response?.status === 404) {
        // Si le chantier n'existe plus, le retirer de l'historique
        const filteredHistory = history.filter((c) => c.id !== chantier.id);
        setHistory(filteredHistory);
        localStorage.setItem(
          "chantier_history",
          JSON.stringify(filteredHistory)
        );
        alert("Ce chantier n'existe plus ou a été supprimé.");
      } else {
        // Autre erreur (500, réseau, etc.) - essayer de rafraîchir l'historique
        console.log("Tentative de rafraîchissement de l'historique...");
        await refreshHistory();
        alert("Erreur de connexion. L'historique a été mis à jour.");
      }
    }
  };

  const refreshHistory = useCallback(async () => {
    await fetchChantiersList();
  }, [fetchChantiersList]);

  // Afficher la liste à afficher (historique ou résultats)
  const displayList = searchValue ? searchResults : history;
  // --- FIN BARRE DE RECHERCHE ---

  const fetchChantierData = async () => {
    if (!id) {
      setError("ID du chantier manquant");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/chantier/${id}/details/`);
      const d = response.data;
      setChantierData(d);

      const cid = d.id ?? parseInt(id, 10);
      const nom = d.nom ?? d.chantier_name;
      const statut = d.statut ?? d.state_chantier;
      if (cid != null && nom != null) {
        setChantiers((prev) => {
          const idx = prev.findIndex((c) => String(c.id) === String(cid));
          if (idx === -1) return prev;
          const next = [...prev];
          next[idx] = {
            ...next[idx],
            chantier_name: nom,
            ...(statut != null ? { state_chantier: statut } : {}),
          };
          return next;
        });
      }

      // Sauvegarder le dernier chantier consulté dans localStorage
      localStorage.setItem("last_visited_chantier", id);
    } catch (error) {
      console.error(
        "Erreur lors du chargement des données du chantier:",
        error
      );
      console.log("Status de l'erreur:", error.response?.status);
      console.log("Tentative de redirection...");

      // Si le chantier n'existe pas (404 ou 500), rediriger intelligemment
      if (error.response?.status === 404 || error.response?.status === 500) {
        try {
          const chantiersResponse = await axios.get("/api/chantier/");
          if (chantiersResponse.data && chantiersResponse.data.length > 0) {
            // D'abord essayer de rediriger vers le dernier chantier visité s'il existe et est valide
            const lastVisitedId = localStorage.getItem("last_visited_chantier");
            const lastVisitedExists = lastVisitedId && 
              chantiersResponse.data.some(c => c.id === parseInt(lastVisitedId));
            
            let targetChantier;
            if (lastVisitedExists && lastVisitedId !== id) {
              // Le dernier chantier visité existe et est différent de celui qui a échoué
              targetChantier = chantiersResponse.data.find(c => c.id === parseInt(lastVisitedId));
              console.log(`Redirection vers le dernier chantier visité: ${lastVisitedId}`);
            } else {
              // Sinon, prendre le premier chantier disponible
              targetChantier = chantiersResponse.data[0];
              console.log(`Redirection vers le premier chantier: ${targetChantier.id}`);
              
              // Nettoyer le dernier chantier sauvegardé s'il n'existe plus
              if (error.response?.status === 404) {
                localStorage.removeItem("last_visited_chantier");
              }
            }
            
            navigate(`/ChantierDetail/${targetChantier.id}`);
            return;
          }
        } catch (redirectError) {
          console.error("Erreur lors de la redirection:", redirectError);
        }
      }

      setError(
        "Impossible de charger les données du chantier. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  // Charger le dernier chantier consulté si aucun ID dans l'URL ou au premier chargement
  useEffect(() => {
    const lastVisitedId = localStorage.getItem("last_visited_chantier");
    
    // Si aucun ID dans l'URL et qu'il y a un dernier chantier visité, y rediriger
    if (!id && lastVisitedId) {
      navigate(`/ChantierDetail/${lastVisitedId}`, { replace: true });
      return;
    }
    
    // Si un ID est présent, vérifier s'il faut rediriger vers le dernier visité
    // (par exemple si on arrive sur l'ID 1 par défaut mais qu'un autre chantier a été visité)
    if (id && lastVisitedId && id !== lastVisitedId) {
      // Vérifier si c'est vraiment le premier chargement (pas de données de chantier)
      if (!chantierData) {
        // Rediriger vers le dernier chantier visité au lieu du chantier par défaut
        navigate(`/ChantierDetail/${lastVisitedId}`, { replace: true });
      }
    }
  }, []); // Exécuter seulement au montage du composant

  useEffect(() => {
    if (id) {
      fetchChantierData();
    }
  }, [id]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  if (!chantierData) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <Typography color="error">Chantier non trouvé</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <RecapFinancierProvider>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ flexGrow: 1 }}>
          {/* BARRE DE RECHERCHE CHANTIER */}
          <Box
            sx={{
              mb: 3,
              display: "flex",
              alignItems: "flex-start",
              gap: 1,
            }}
          >
            <Box
              ref={searchBarRef}
              sx={(theme) => ({
                position: "relative",
                flex: 1,
                maxWidth: 500,
                zIndex: showDropdown ? theme.zIndex.modal : "auto",
              })}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "24px",
                  background: "#fff",
                  boxShadow: 1,
                  px: 2,
                  py: 1,
                  border: "1px solid #e0e0e0",
                }}
              >
                <SearchIcon sx={{ color: "#757575", mr: 1 }} />
                <input
                  type="text"
                  placeholder="Rechercher un chantier..."
                  value={searchValue}
                  onChange={(e) => {
                    setSearchValue(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  style={{
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontSize: 18,
                    flex: 1,
                  }}
                />
                <RefreshIcon
                  sx={{
                    color: "#757575",
                    ml: 1,
                    cursor: "pointer",
                    "&:hover": { color: "primary.main" },
                  }}
                  onClick={refreshHistory}
                  title="Rafraîchir l'historique"
                />
              </Box>
              {/* Dropdown suggestions */}
              {showDropdown && displayList.length > 0 && (
                <Paper
                  sx={(theme) => ({
                    position: "absolute",
                    top: 44,
                    left: 0,
                    right: 0,
                    zIndex: theme.zIndex.modal + 1,
                    maxHeight: 300,
                    overflowY: "auto",
                    borderRadius: 2,
                  })}
                  elevation={4}
                >
                  {displayList.map((chantier) => (
                    <Box
                      key={chantier.id}
                      sx={{
                        px: 2,
                        py: 1.2,
                        cursor: "pointer",
                        "&:hover": { background: "#f5f5f5" },
                        fontWeight: id == chantier.id ? 700 : 400,
                        color:
                          id == chantier.id ? "primary.main" : "text.primary",
                      }}
                      onClick={() => handleSelectChantier(chantier)}
                    >
                      {chantier.chantier_name}
                    </Box>
                  ))}
                </Paper>
              )}
            </Box>
            <Tooltip title="Liste de tous les chantiers">
              <IconButton
                aria-label="Ouvrir la liste des chantiers"
                onClick={() => setModalListeOpen(true)}
                sx={{
                  mt: 0.25,
                  borderRadius: "24px",
                  border: "1px solid #e0e0e0",
                  backgroundColor: "#fff",
                  boxShadow: 1,
                  "&:hover": {
                    backgroundColor: "#f5f5f5",
                  },
                }}
              >
                <ViewListIcon sx={{ color: "#757575" }} />
              </IconButton>
            </Tooltip>
          </Box>

          <Dialog
            open={modalListeOpen}
            onClose={fermerModalListe}
            fullWidth
            maxWidth="sm"
            scroll="paper"
            PaperProps={{
              elevation: 8,
              sx: {
                borderRadius: 3,
                overflow: "hidden",
              },
            }}
          >
            <DialogTitle
              sx={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 2,
                pr: 1,
                py: 2.5,
                px: 3,
                background: (theme) =>
                  `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.light, 0.06)} 55%, ${alpha(theme.palette.background.paper, 1)} 100%)`,
                borderBottom: "1px solid",
                borderColor: "divider",
              }}
            >
              <Stack direction="row" spacing={1.75} alignItems="flex-start" sx={{ minWidth: 0 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.14),
                    color: "primary.main",
                    flexShrink: 0,
                  }}
                >
                  <ViewListIcon fontSize="small" />
                </Box>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    variant="h6"
                    component="div"
                    sx={{ fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.25 }}
                  >
                    Catalogue chantiers
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                    Parcourez, filtrez et ouvrez un chantier en un clic.
                  </Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="flex-start">
                <Tooltip title="Actualiser les statuts">
                  <span>
                    <IconButton
                      aria-label="Actualiser la liste des chantiers"
                      onClick={() => fetchChantiersList({ fromModal: true })}
                      disabled={listeModalLoading}
                      size="small"
                      sx={{
                        color: "text.secondary",
                        "&:hover": {
                          bgcolor: (theme) => alpha(theme.palette.common.black, 0.06),
                        },
                      }}
                    >
                      <RefreshIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <IconButton
                  aria-label="Fermer"
                  onClick={fermerModalListe}
                  size="small"
                  sx={{
                    color: "text.secondary",
                    "&:hover": { bgcolor: (theme) => alpha(theme.palette.common.black, 0.06) },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent
              sx={{
                position: "relative",
                pt: 3,
                pb: 3,
                px: 3,
                bgcolor: (theme) => alpha(theme.palette.grey[500], 0.04),
              }}
            >
              {listeModalLoading ? (
                <LinearProgress
                  sx={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 3,
                    borderRadius: 0,
                  }}
                />
              ) : null}
              <Stack spacing={2.5}>
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      display: "block",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "text.secondary",
                      mb: 1,
                      fontSize: "0.68rem",
                    }}
                  >
                    Recherche par nom
                  </Typography>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Ex. résidence, école, rénovation…"
                    label="Mot-clé"
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon sx={{ color: "text.secondary", fontSize: 20 }} />
                        </InputAdornment>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        borderRadius: 2,
                        bgcolor: "background.paper",
                      },
                    }}
                  />
                </Box>

                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      display: "block",
                      fontWeight: 700,
                      letterSpacing: "0.12em",
                      color: "text.secondary",
                      mb: 1,
                      fontSize: "0.68rem",
                    }}
                  >
                    Statut du chantier
                  </Typography>
                  <ToggleButtonGroup
                    value={modalStatutFiltre}
                    exclusive
                    onChange={(event, val) =>
                      setModalStatutFiltre(val ?? "all")
                    }
                    aria-label="Filtrer par statut"
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 1,
                      "& .MuiToggleButtonGroup-grouped": {
                        m: "0 !important",
                        border: "none !important",
                        borderRadius: "999px !important",
                      },
                    }}
                  >
                    <ToggleButton
                      value="all"
                      aria-label="Tous les statuts"
                      sx={(theme) => sxModalStatutToggle(theme, "all")}
                    >
                      Tous
                    </ToggleButton>
                    {MODAL_STATUT_OPTIONS.map((opt) => (
                      <ToggleButton
                        key={opt.value}
                        value={opt.value}
                        aria-label={opt.label}
                        sx={(theme) => sxModalStatutToggle(theme, opt.value)}
                      >
                        {opt.label}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>

                <Box>
                  <Stack
                    direction="row"
                    alignItems="baseline"
                    justifyContent="space-between"
                    sx={{ mb: 1.25 }}
                  >
                    <Typography
                      variant="overline"
                      sx={{
                        fontWeight: 700,
                        letterSpacing: "0.12em",
                        color: "text.secondary",
                        fontSize: "0.68rem",
                      }}
                    >
                      Résultats
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                      {chantiersModalFiltres.length} chantier
                      {chantiersModalFiltres.length !== 1 ? "s" : ""}
                    </Typography>
                  </Stack>

                  <Stack
                    spacing={1.25}
                    sx={{
                      maxHeight: 340,
                      overflow: "auto",
                      pr: 0.5,
                      mr: -0.5,
                    }}
                  >
                    {chantiersModalFiltres.length === 0 ? (
                      <Paper
                        variant="outlined"
                        sx={{
                          py: 4,
                          px: 2,
                          borderRadius: 2,
                          borderStyle: "dashed",
                          bgcolor: "background.paper",
                          textAlign: "center",
                        }}
                      >
                        <Typography variant="subtitle2" color="text.secondary" fontWeight={600}>
                          Aucun chantier à afficher
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                          Élargissez les filtres ou modifiez votre recherche.
                        </Typography>
                      </Paper>
                    ) : (
                      chantiersModalFiltres.map((chantier) => {
                        const selected = String(id) === String(chantier.id);
                        return (
                          <Paper
                            key={chantier.id}
                            elevation={0}
                            variant="outlined"
                            sx={{
                              borderRadius: 2,
                              overflow: "visible",
                              borderColor: selected ? "primary.main" : "divider",
                              bgcolor: selected
                                ? (theme) => alpha(theme.palette.primary.main, 0.06)
                                : "background.paper",
                              transition: "border-color 0.18s ease, box-shadow 0.18s ease",
                              "&:hover": {
                                borderColor: "primary.light",
                                boxShadow: (theme) => theme.shadows[3],
                              },
                            }}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                py: 0.5,
                                pl: 0.5,
                                pr: 1.25,
                              }}
                            >
                              <ListItemButton
                                onClick={() => handleSelectChantier(chantier)}
                                sx={{
                                  flex: 1,
                                  minWidth: 0,
                                  alignItems: "flex-start",
                                  py: 1.25,
                                  px: 1.5,
                                  borderRadius: 2,
                                  overflow: "visible",
                                  "& .MuiTouchRipple-root": {
                                    borderRadius: 2,
                                  },
                                }}
                              >
                                <Typography
                                  variant="subtitle2"
                                  component="div"
                                  fontWeight={700}
                                  sx={{
                                    lineHeight: 1.35,
                                    wordBreak: "break-word",
                                    overflowWrap: "anywhere",
                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden",
                                    textAlign: "left",
                                  }}
                                >
                                  {chantier.chantier_name}
                                </Typography>
                              </ListItemButton>
                              <Tooltip title="Modifier le statut">
                                <Box
                                  component="span"
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  sx={{ flexShrink: 0, ml: "auto", alignSelf: "flex-start" }}
                                >
                                  <ChantierListeStatutBadge
                                    state={chantier.state_chantier}
                                    onClick={(e) =>
                                      ouvrirEditionStatutDepuisListe(chantier, e)
                                    }
                                    disabled={statutSavingId === chantier.id}
                                  />
                                </Box>
                              </Tooltip>
                            </Box>
                          </Paper>
                        );
                      })
                    )}
                  </Stack>
                </Box>
              </Stack>
            </DialogContent>
          </Dialog>

          <Dialog
            open={Boolean(statutEditContext)}
            onClose={fermerEditionStatut}
            maxWidth="xs"
            fullWidth
            disableRestoreFocus
            PaperProps={{ sx: { borderRadius: 3 } }}
          >
            <DialogTitle sx={{ pr: 5, position: "relative" }}>
              Modifier le statut
              <IconButton
                aria-label="Fermer"
                onClick={fermerEditionStatut}
                size="small"
                disabled={statutSavingId === statutEditContext?.id}
                sx={{ position: "absolute", right: 12, top: 12 }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </DialogTitle>
            <DialogContent>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>
                {statutEditContext?.chantier_name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                Choisissez le nouveau statut puis validez.
              </Typography>
              <Typography
                variant="overline"
                sx={{
                  display: "block",
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: "text.secondary",
                  mb: 1,
                  fontSize: "0.68rem",
                }}
              >
                Statut
              </Typography>
              <ToggleButtonGroup
                exclusive
                orientation="vertical"
                fullWidth
                value={statutEditDraft}
                onChange={(event, val) => {
                  if (val != null) setStatutEditDraft(val);
                }}
                sx={{ gap: 1, "& .MuiToggleButtonGroup-grouped": { borderRadius: "12px !important" } }}
              >
                {MODAL_STATUT_OPTIONS.map((opt) => (
                  <ToggleButton
                    key={opt.value}
                    value={opt.value}
                    aria-label={opt.label}
                    sx={(theme) => ({
                      ...sxModalStatutToggle(theme, opt.value),
                      justifyContent: "flex-start",
                      py: 1.1,
                    })}
                  >
                    {opt.label}
                  </ToggleButton>
                ))}
              </ToggleButtonGroup>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2.5, pt: 1 }}>
              <Button
                onClick={fermerEditionStatut}
                color="inherit"
                disabled={statutSavingId === statutEditContext?.id}
              >
                Annuler
              </Button>
              <Button
                variant="contained"
                onClick={confirmerEditionStatut}
                disabled={
                  !statutEditContext ||
                  statutSavingId === statutEditContext?.id ||
                  statutEditDraft === statutEditContext?.state_chantier
                }
              >
                {statutSavingId === statutEditContext?.id ? (
                  <CircularProgress size={22} color="inherit" />
                ) : (
                  "Enregistrer"
                )}
              </Button>
            </DialogActions>
          </Dialog>

          {/* Nom du chantier et Tabs */}
          <AppBar
            position="static"
            color="default"
            elevation={0}
            sx={{
              backgroundColor: "white",
              borderRadius: "10px",
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                borderBottom: 1,
                borderColor: "divider",
                backgroundColor: "white",
                borderRadius: "10px",
                p: 2,
                gap: 4,
              }}
            >
              {/* Nom du chantier */}
              <Typography
                variant="h5"
                sx={{
                  fontWeight: "bold",
                  color: "black",
                  backgroundColor: "white",
                  width: "auto",
                  flexShrink: 0,
                  minWidth: "200px",
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                {chantierData.nom || "Chantier"}
              </Typography>

              {/* Onglets */}
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                aria-label="chantier tabs"
                variant="fullWidth"
                sx={{
                  flex: 1,
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontSize: "1.1rem",
                    fontWeight: 500,
                    minWidth: 120,
                    color: "text.primary",
                    fontFamily: "Roboto, Arial, sans-serif",
                    "&.Mui-selected": {
                      color: "primary.main",
                      fontWeight: 700,
                    },
                  },
                  "& .MuiTabs-flexContainer": {
                    justifyContent: "space-between",
                    px: 2,
                  },
                }}
              >
                <Tab label="Informations" />
                <Tab label="Documents" />
                <Tab label="Commandes" />
                <Tab label="Récap Financier" />
              </Tabs>
            </Box>
          </AppBar>

          {/* Contenu des onglets - tous les TabPanel sont toujours montés */}
          <TabPanel value={selectedTab} index={0}>
            <ChantierInfoTab
              chantierData={chantierData}
              onUpdate={fetchChantierData}
              state={infoState}
              setState={setInfoState}
            />
          </TabPanel>
          <TabPanel value={selectedTab} index={1}>
            <ChantierDocumentsTab
              chantierData={chantierData}
              state={documentsState}
              setState={setDocumentsState}
              isActive={selectedTab === 1}
            />
          </TabPanel>
          <Paper
            elevation={0}
            sx={{
              mt: 2,
              borderRadius: "10px",
              "& .MuiTypography-h6": {
                fontWeight: "bold",
                color: "text.primary",
                fontSize: "1.1rem",
                mb: 1,
                backgroundColor: "transparent",
              },
              "& .MuiChip-root": {
                height: "24px",
                fontSize: "0.875rem",
              },
            }}
          >
            <TabPanel value={selectedTab} index={2}>
              <ChantierCommandesTab
                chantierData={chantierData}
                state={uiState.commandes}
                setState={(newState) =>
                  setUiState((prev) => ({
                    ...prev,
                    commandes: { ...prev.commandes, ...newState },
                  }))
                }
              />
            </TabPanel>
            <TabPanel value={selectedTab} index={3}>
              <ChantierRecapFinancierTab
                chantierId={id}
                isActive={selectedTab === 3}
              />
            </TabPanel>
          </Paper>
        </Box>
      </Container>
    </RecapFinancierProvider>
  );
};

export default ChantierDetail;
