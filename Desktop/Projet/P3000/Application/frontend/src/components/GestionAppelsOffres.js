import {
  Delete as DeleteIcon,
  Transform as TransformIcon,
  Visibility as VisibilityIcon,
  Folder as FolderIcon,
  Sync as SyncIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Close as CloseIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon,
  UnfoldMore as UnfoldMoreIcon,
  Clear as ClearAllIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import DrivePathSelector from "./Devis/DrivePathSelector";

// Fonction pour slugifier un texte (similaire à custom_slugify du backend)
const customSlugify = (text) => {
  if (!text) return '';
  // Remplacer les espaces multiples par un seul espace
  text = text.trim().replace(/\s+/g, ' ');
  // Remplacer les espaces par des tirets
  text = text.replace(/\s/g, '-');
  // Supprimer les caractères spéciaux sauf les tirets
  text = text.replace(/[^a-zA-Z0-9-]/g, '');
  // Supprimer les tirets multiples
  text = text.replace(/-+/g, '-');
  // Supprimer les tirets en début et fin
  text = text.replace(/^-+|-+$/g, '');
  return text;
};

// Fonction utilitaire pour nettoyer le drive_path (retirer les préfixes Appels_Offres/ et Chantiers/)
const cleanDrivePath = (drivePath) => {
  if (!drivePath) {
    return null;
  }
  
  let path = String(drivePath).trim();
  
  // Retirer les préfixes Appels_Offres/ et Chantiers/
  if (path.startsWith('Appels_Offres/')) {
    path = path.substring('Appels_Offres/'.length);
  } else if (path.startsWith('Chantiers/')) {
    path = path.substring('Chantiers/'.length);
  }
  
  // Nettoyer les slashes en début et fin
  path = path.replace(/^\/+|\/+$/g, '');
  
  // Retourner null si vide après nettoyage
  if (!path) {
    return null;
  }
  
  return path;
};

const SORT_FIELDS = {
  chantier_name: "Nom du projet",
  societe: "Société",
  montant_ht: "Montant HT",
  statut: "Statut",
  date_debut: "Date",
};

const GestionAppelsOffres = () => {
  const [appelsOffres, setAppelsOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAppelOffres, setSelectedAppelOffres] = useState(null);
  const [nouveauStatut, setNouveauStatut] = useState("");
  const [raisonRefus, setRaisonRefus] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("success");
  const [transformingId, setTransformingId] = useState(null);
  const [showDrivePathModal, setShowDrivePathModal] = useState(false);
  const [selectedAppelOffresForDrivePath, setSelectedAppelOffresForDrivePath] = useState(null);
  const [showTransformModal, setShowTransformModal] = useState(false);
  const [selectedAppelOffresForTransform, setSelectedAppelOffresForTransform] = useState(null);
  const [syncingMontants, setSyncingMontants] = useState(false);

  // --- Filtres ---
  const [filterStatut, setFilterStatut] = useState(null);
  const [filterSearch, setFilterSearch] = useState("");
  const [filterTransforme, setFilterTransforme] = useState("tous"); // "tous" | "oui" | "non"
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterMontantMin, setFilterMontantMin] = useState("");
  const [filterMontantMax, setFilterMontantMax] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // --- Tri ---
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  useEffect(() => {
    fetchAppelsOffres();
  }, []);

  const sortOrderStatut = (ao) => {
    if (ao.deja_transforme) return 0;
    if (ao.statut === "valide") return 1;
    if (ao.statut === "en_attente") return 2;
    if (ao.statut === "refuse") return 3;
    return 4;
  };

  const fetchAppelsOffres = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/appels-offres/");
      const sorted = [...(response.data || [])].sort(
        (a, b) => sortOrderStatut(a) - sortOrderStatut(b)
      );
      setAppelsOffres(sorted);
    } catch (error) {
      showAlert("Erreur lors du chargement des appels d'offres", "error");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, severity = "success") => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setTimeout(() => setAlertMessage(""), 5000);
  };

  const handleRafraichirMontants = async () => {
    try {
      setSyncingMontants(true);
      const response = await axios.post("/api/appels-offres/sync_montants_depuis_devis/", {});
      const { updated, skipped, errors } = response.data;
      fetchAppelsOffres();
      if (errors > 0) {
        showAlert(
          `${updated} montant(s) mis à jour. ${errors} erreur(s).`,
          "warning"
        );
      } else if (updated > 0) {
        showAlert(
          `${updated} appel(s) d'offres mis à jour depuis le devis de chantier.`,
          "success"
        );
      } else {
        showAlert(
          "Aucune mise à jour nécessaire (montants déjà à jour).",
          "info"
        );
      }
    } catch (error) {
      const msg = error.response?.data?.error || "Erreur lors du rafraîchissement des montants";
      showAlert(msg, "error");
    } finally {
      setSyncingMontants(false);
    }
  };

  const handleTransformerEnChantier = (appelOffres) => {
    // Ouvrir le modal pour sélectionner le drive_path
    setSelectedAppelOffresForTransform(appelOffres);
    setShowTransformModal(true);
  };

  const handleConfirmTransform = async (selectedPath) => {
    if (!selectedAppelOffresForTransform) {
      return;
    }

    const appelOffresId = selectedAppelOffresForTransform.id;
    
    // ✅ Empêcher les clics multiples
    if (transformingId === appelOffresId) {
      return;
    }
    
    try {
      setTransformingId(appelOffresId);
      
      // ✅ Utiliser le chemin validé par l'utilisateur tel quel, sans modification
      const drivePathValue = selectedPath ? String(selectedPath).trim() : null;
      
      // Appeler l'API avec le drive_path tel quel (sans modification)
      const response = await axios.post(
        `/api/appels-offres/${appelOffresId}/transformer_en_chantier/`,
        { drive_path: drivePathValue }
      );
      showAlert("Appel d'offres transformé en chantier avec succès !");
      fetchAppelsOffres();
      setShowTransformModal(false);
      setSelectedAppelOffresForTransform(null);
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Erreur lors de la transformation";
      showAlert(errorMessage, "error");
      
      // ✅ Si l'appel d'offres a déjà été transformé, recharger la liste pour mettre à jour l'état
      if (error.response?.data?.deja_transforme) {
        fetchAppelsOffres();
      }
    } finally {
      setTransformingId(null);
    }
  };

  const handleMettreAJourStatut = async () => {
    try {
      await axios.post(
        `/api/appels-offres/${selectedAppelOffres.id}/mettre_a_jour_statut/`,
        {
          statut: nouveauStatut,
          raison_refus: raisonRefus,
        }
      );
      setDialogOpen(false);
      fetchAppelsOffres();
      showAlert("Statut mis à jour avec succès !");
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Erreur lors de la mise à jour";
      showAlert(errorMessage, "error");
    }
  };

  const handleSupprimerAppelOffres = async () => {
    try {
      await axios.delete(
        `/api/appels-offres/${selectedAppelOffres.id}/supprimer_appel_offres/`
      );
      setDeleteDialogOpen(false);
      fetchAppelsOffres();
      showAlert("Appel d'offres supprimé avec succès !");
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Erreur lors de la suppression";
      showAlert(errorMessage, "error");
    }
  };

  const getStatutColor = (statut) => {
    const colors = {
      en_attente: "warning",
      valide: "success",
      refuse: "error",
    };
    return colors[statut] || "default";
  };

  const getStatutLabel = (statut) => {
    const labels = {
      en_attente: "En attente validation",
      valide: "Validé",
      refuse: "Refusé",
    };
    return labels[statut] || statut;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(montant || 0);
  };

  const statsByStatut = useMemo(() => {
    const validé = appelsOffres.filter((ao) => ao.statut === "valide");
    const enAttente = appelsOffres.filter((ao) => ao.statut === "en_attente");
    const refuse = appelsOffres.filter((ao) => ao.statut === "refuse");
    const sum = (list) => list.reduce((acc, ao) => acc + (ao.montant_ht || 0), 0);
    return {
      tous: { sum: sum(appelsOffres), count: appelsOffres.length },
      valide: { sum: sum(validé), count: validé.length },
      en_attente: { sum: sum(enAttente), count: enAttente.length },
      refuse: { sum: sum(refuse), count: refuse.length },
    };
  }, [appelsOffres]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const activeFiltersChips = useMemo(() => {
    const chips = [];
    if (filterStatut) chips.push({ key: "statut", label: `Statut : ${getStatutLabel(filterStatut)}`, onDelete: () => setFilterStatut(null) });
    if (filterSearch.trim()) chips.push({ key: "search", label: `Recherche : "${filterSearch.trim()}"`, onDelete: () => setFilterSearch("") });
    if (filterTransforme !== "tous") chips.push({ key: "transforme", label: filterTransforme === "oui" ? "Transformé en chantier" : "Non transformé", onDelete: () => setFilterTransforme("tous") });
    if (filterDateFrom) chips.push({ key: "dateFrom", label: `Depuis : ${new Date(filterDateFrom).toLocaleDateString("fr-FR")}`, onDelete: () => setFilterDateFrom("") });
    if (filterDateTo) chips.push({ key: "dateTo", label: `Jusqu'au : ${new Date(filterDateTo).toLocaleDateString("fr-FR")}`, onDelete: () => setFilterDateTo("") });
    if (filterMontantMin) chips.push({ key: "montantMin", label: `Min : ${formatMontant(Number(filterMontantMin))}`, onDelete: () => setFilterMontantMin("") });
    if (filterMontantMax) chips.push({ key: "montantMax", label: `Max : ${formatMontant(Number(filterMontantMax))}`, onDelete: () => setFilterMontantMax("") });
    return chips;
  }, [filterStatut, filterSearch, filterTransforme, filterDateFrom, filterDateTo, filterMontantMin, filterMontantMax]);

  const resetAllFilters = () => {
    setFilterStatut(null);
    setFilterSearch("");
    setFilterTransforme("tous");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterMontantMin("");
    setFilterMontantMax("");
  };

  const appelsOffresFiltered = useMemo(() => {
    let list = [...appelsOffres];

    if (filterStatut) list = list.filter((ao) => ao.statut === filterStatut);

    if (filterSearch.trim()) {
      const q = filterSearch.trim().toLowerCase();
      list = list.filter(
        (ao) =>
          (ao.chantier_name || "").toLowerCase().includes(q) ||
          (ao.societe?.nom_societe || "").toLowerCase().includes(q)
      );
    }

    if (filterTransforme === "oui") list = list.filter((ao) => ao.deja_transforme);
    if (filterTransforme === "non") list = list.filter((ao) => !ao.deja_transforme);

    if (filterDateFrom) list = list.filter((ao) => ao.date_debut && ao.date_debut >= filterDateFrom);
    if (filterDateTo) list = list.filter((ao) => ao.date_debut && ao.date_debut <= filterDateTo);

    if (filterMontantMin !== "") list = list.filter((ao) => (ao.montant_ht || 0) >= Number(filterMontantMin));
    if (filterMontantMax !== "") list = list.filter((ao) => (ao.montant_ht || 0) <= Number(filterMontantMax));

    if (sortField) {
      list.sort((a, b) => {
        let va, vb;
        if (sortField === "societe") {
          va = a.societe?.nom_societe || "";
          vb = b.societe?.nom_societe || "";
        } else if (sortField === "montant_ht") {
          va = a.montant_ht || 0;
          vb = b.montant_ht || 0;
        } else if (sortField === "date_debut") {
          va = a.date_debut || "";
          vb = b.date_debut || "";
        } else {
          va = (a[sortField] || "").toString().toLowerCase();
          vb = (b[sortField] || "").toString().toLowerCase();
        }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [appelsOffres, filterStatut, filterSearch, filterTransforme, filterDateFrom, filterDateTo, filterMontantMin, filterMontantMax, sortField, sortDir]);

  const filteredTotals = useMemo(() => ({
    count: appelsOffresFiltered.length,
    sumHT: appelsOffresFiltered.reduce((acc, ao) => acc + (ao.montant_ht || 0), 0),
    sumTTC: appelsOffresFiltered.reduce((acc, ao) => acc + (ao.montant_ttc || 0), 0),
  }), [appelsOffresFiltered]);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography>Chargement des appels d'offres...</Typography>
        </Box>
      </Container>
    );
  }

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <UnfoldMoreIcon sx={{ fontSize: 16, opacity: 0.4 }} />;
    return sortDir === "asc"
      ? <ArrowUpwardIcon sx={{ fontSize: 16 }} />
      : <ArrowDownwardIcon sx={{ fontSize: 16 }} />;
  };

  const SortableHeader = ({ field, label, align = "left" }) => (
    <TableCell
      align={align}
      onClick={() => handleSort(field)}
      sx={{
        color: "white",
        fontWeight: "bold",
        cursor: "pointer",
        userSelect: "none",
        whiteSpace: "nowrap",
        "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
      }}
    >
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
        {label}
        <SortIcon field={field} />
      </Box>
    </TableCell>
  );

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>

        {/* ── En-tête ── */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 2 }}>
          <Typography variant="h4" sx={{ color: "white", backgroundColor: "transparent" }}>
            Gestion des Appels d'Offres
          </Typography>
          <Tooltip title="Rafraîchir les montants de tous les appels d'offres à partir de leur devis associé">
            <span>
              <Button
                variant="outlined"
                startIcon={<SyncIcon />}
                onClick={handleRafraichirMontants}
                disabled={syncingMontants}
                size="small"
                sx={{ backgroundColor: "white" }}
              >
                {syncingMontants ? "Rafraîchissement…" : "Rafraîchir les montants"}
              </Button>
            </span>
          </Tooltip>
        </Box>

        {alertMessage && (
          <Alert severity={alertSeverity} sx={{ mb: 2 }}>
            {alertMessage}
          </Alert>
        )}

        {/* ── Cards statuts ── */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, mb: 3, alignItems: "stretch" }}>
          {[
            { key: null, label: "Tous", color: "#6366f1", lightBg: "#eef2ff", stats: statsByStatut.tous },
            { key: "valide", label: "Validé", color: "#10b981", lightBg: "#ecfdf5", stats: statsByStatut.valide },
            { key: "en_attente", label: "En attente", color: "#f59e0b", lightBg: "#fffbeb", stats: statsByStatut.en_attente },
            { key: "refuse", label: "Refusé", color: "#ef4444", lightBg: "#fef2f2", stats: statsByStatut.refuse },
          ].map(({ key, label, color, lightBg, stats }) => {
            const isActive = filterStatut === key;
            return (
              <Box
                key={label}
                onClick={() => setFilterStatut(key)}
                sx={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2,
                  py: 1,
                  borderRadius: "12px",
                  border: `1.5px solid ${isActive ? color : "transparent"}`,
                  bgcolor: isActive ? lightBg : "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(8px)",
                  boxShadow: isActive ? `0 0 0 1px ${color}22, 0 4px 12px ${color}18` : "0 1px 3px rgba(0,0,0,0.08)",
                  transition: "all 0.25s cubic-bezier(.4,0,.2,1)",
                  minWidth: 140,
                  position: "relative",
                  overflow: "hidden",
                  "&:hover": { border: `1.5px solid ${color}88`, boxShadow: `0 4px 16px ${color}20`, transform: "translateY(-1px)" },
                  "&::before": isActive ? { content: '""', position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, ${color}, ${color}99)`, borderRadius: "12px 12px 0 0" } : {},
                }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color, flexShrink: 0, boxShadow: isActive ? `0 0 8px ${color}66` : "none", transition: "box-shadow 0.25s ease" }} />
                <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: isActive ? color : "text.secondary", lineHeight: 1.2, transition: "color 0.25s ease" }}>
                    {label}
                    <Box component="span" sx={{ ml: 0.5, fontSize: "0.62rem", fontWeight: 700, bgcolor: isActive ? color : "rgba(0,0,0,0.1)", color: isActive ? "#fff" : "text.secondary", px: 0.7, py: 0.1, borderRadius: "6px", transition: "all 0.25s ease" }}>
                      {stats.count}
                    </Box>
                  </Typography>
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: isActive ? color : "text.primary", lineHeight: 1.3, whiteSpace: "nowrap", transition: "color 0.25s ease" }}>
                    {formatMontant(stats.sum)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* ── Barre de filtres ── */}
        <Paper elevation={3} sx={{ mb: 2, borderRadius: "14px", overflow: "hidden" }}>

          {/* En-tête bleu identique au header du tableau */}
          <Box sx={{ backgroundColor: "#1976d2", px: 2, py: 1, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <FilterListIcon sx={{ color: "white", fontSize: 18 }} />
              <Typography sx={{ color: "white", fontWeight: "bold", fontSize: "0.85rem", letterSpacing: "0.03em" }}>
                Filtres
              </Typography>
              {activeFiltersChips.length > 0 && (
                <Box sx={{ bgcolor: "rgba(255,255,255,0.25)", color: "white", fontSize: "0.65rem", fontWeight: 700, px: 0.8, py: 0.1, borderRadius: "6px" }}>
                  {activeFiltersChips.length} actif{activeFiltersChips.length > 1 ? "s" : ""}
                </Box>
              )}
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                onClick={() => setShowAdvancedFilters((v) => !v)}
                sx={{
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1.2,
                  py: 0.35,
                  borderRadius: "8px",
                  border: "1.5px solid rgba(255,255,255,0.4)",
                  bgcolor: showAdvancedFilters ? "rgba(255,255,255,0.2)" : "transparent",
                  transition: "all 0.2s ease",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
                }}
              >
                <Typography sx={{ color: "white", fontSize: "0.72rem", fontWeight: 600, lineHeight: 1 }}>
                  Filtres avancés
                </Typography>
                {(filterDateFrom || filterDateTo || filterMontantMin || filterMontantMax) && (
                  <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#fbbf24", boxShadow: "0 0 5px #fbbf2499" }} />
                )}
              </Box>
              {activeFiltersChips.length > 0 && (
                <Tooltip title="Réinitialiser tous les filtres">
                  <IconButton size="small" onClick={resetAllFilters} sx={{ color: "rgba(255,255,255,0.75)", p: 0.5, "&:hover": { color: "white", bgcolor: "rgba(255,255,255,0.15)" } }}>
                    <ClearAllIcon sx={{ fontSize: 18 }} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Ligne principale : recherche + toggle transformé */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, px: 2, py: 1.5, flexWrap: "wrap" }}>
            <TextField
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Rechercher par projet ou société…"
              size="small"
              sx={{ flexGrow: 1, minWidth: 220 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: filterSearch ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setFilterSearch("")}><CloseIcon fontSize="small" /></IconButton>
                  </InputAdornment>
                ) : null,
              }}
            />

            {/* Toggle Transformé */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                Transformé en chantier :
              </Typography>
              <Box sx={{ display: "flex", borderRadius: "8px", border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
                {[
                  { value: "tous", label: "Tous" },
                  { value: "oui",  label: "Oui",  color: "#10b981", bg: "#ecfdf5" },
                  { value: "non",  label: "Non",  color: "#f59e0b", bg: "#fffbeb" },
                ].map(({ value, label, color = "#1976d2", bg = "#e3f2fd" }, i, arr) => {
                  const sel = filterTransforme === value;
                  return (
                    <Box
                      key={value}
                      onClick={() => setFilterTransforme(value)}
                      sx={{
                        cursor: "pointer",
                        px: 1.5,
                        py: 0.6,
                        bgcolor: sel ? bg : "transparent",
                        borderRight: i < arr.length - 1 ? "1px solid" : "none",
                        borderColor: "divider",
                        transition: "background 0.15s ease",
                        "&:hover": { bgcolor: sel ? bg : "action.hover" },
                      }}
                    >
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: sel ? 700 : 500, color: sel ? color : "text.secondary", lineHeight: 1 }}>
                        {label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>

          {/* Filtres avancés */}
          <Collapse in={showAdvancedFilters}>
            <Divider />
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, px: 2, py: 1.5, bgcolor: "#f8faff" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                  Période :
                </Typography>
                <TextField type="date" label="Du" size="small" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ width: 155 }} />
                <TextField type="date" label="Au" size="small" value={filterDateTo}   onChange={(e) => setFilterDateTo(e.target.value)}   InputLabelProps={{ shrink: true }} sx={{ width: 155 }} />
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 600, fontSize: "0.78rem", whiteSpace: "nowrap" }}>
                  Montant HT :
                </Typography>
                <TextField type="number" label="Min (€)" size="small" value={filterMontantMin} onChange={(e) => setFilterMontantMin(e.target.value)} sx={{ width: 130 }} inputProps={{ min: 0 }} />
                <TextField type="number" label="Max (€)" size="small" value={filterMontantMax} onChange={(e) => setFilterMontantMax(e.target.value)} sx={{ width: 130 }} inputProps={{ min: 0 }} />
              </Box>
            </Box>
          </Collapse>

          {/* Chips filtres actifs */}
          {activeFiltersChips.length > 0 && (
            <>
              <Divider />
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8, px: 2, py: 1, bgcolor: "#f5f7ff" }}>
                {activeFiltersChips.map((chip) => (
                  <Chip
                    key={chip.key}
                    label={chip.label}
                    onDelete={chip.onDelete}
                    size="small"
                    sx={{ fontSize: "0.72rem", bgcolor: "#eef2ff", color: "#4338ca", border: "1px solid #c7d2fe", "& .MuiChip-deleteIcon": { color: "#818cf8", "&:hover": { color: "#ef4444" } } }}
                  />
                ))}
              </Box>
            </>
          )}
        </Paper>

        {/* ── Résumé des résultats filtrés ── */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, px: 0.5 }}>
          <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 500 }}>
            {filteredTotals.count} résultat{filteredTotals.count > 1 ? "s" : ""}
            {appelsOffres.length !== filteredTotals.count && ` sur ${appelsOffres.length}`}
          </Typography>
          {filteredTotals.count > 0 && (
            <Typography variant="body2" sx={{ color: "text.primary", fontWeight: 600 }}>
              Cumul HT : <Box component="span" sx={{ color: "#4338ca", fontWeight: 700 }}>{formatMontant(filteredTotals.sumHT)}</Box>
            </Typography>
          )}
        </Box>

        {/* ── Tableau ── */}
        <Paper elevation={3} sx={{ borderRadius: "14px", overflow: "hidden" }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#1976d2" }}>
                  <SortableHeader field="chantier_name" label="Nom du projet" />
                  <SortableHeader field="societe" label="Société" />
                  <SortableHeader field="montant_ht" label="Montant estimé" align="right" />
                  <SortableHeader field="statut" label="Statut" />
                  <SortableHeader field="date_debut" label="Date" />
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appelsOffresFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 5 }}>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                        <SearchIcon sx={{ fontSize: 40, color: "text.disabled" }} />
                        <Typography variant="body1" color="textSecondary">
                          {appelsOffres.length === 0 ? "Aucun appel d'offres trouvé" : "Aucun résultat pour ces filtres"}
                        </Typography>
                        {activeFiltersChips.length > 0 && (
                          <Button size="small" startIcon={<ClearAllIcon />} onClick={resetAllFilters} sx={{ mt: 0.5 }}>
                            Réinitialiser les filtres
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  appelsOffresFiltered.map((appelOffres) => (
                    <TableRow
                      key={appelOffres.id}
                      sx={{ "&:hover": { bgcolor: "rgba(99,102,241,0.04)" }, transition: "background 0.15s" }}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                          <Typography variant="subtitle2" fontWeight="bold">
                            {appelOffres.chantier_name}
                          </Typography>
                          {appelOffres.deja_transforme && (
                            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1, py: 0.25, borderRadius: "6px", bgcolor: "#ecfdf5", border: "1px solid #10b98133" }}>
                              <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: "#10b981", boxShadow: "0 0 6px #10b98155" }} />
                              <Typography sx={{ fontSize: "0.68rem", fontWeight: 600, color: "#10b981", lineHeight: 1 }}>Transformé</Typography>
                            </Box>
                          )}
                        </Box>
                        {appelOffres.description && (
                          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.25 }}>{appelOffres.description}</Typography>
                        )}
                        {appelOffres.deja_transforme && appelOffres.chantier_transformé_name && (
                          <Typography variant="body2" color="success.main" sx={{ mt: 0.5, fontStyle: "italic", fontSize: "0.75rem" }}>
                            Chantier : {appelOffres.chantier_transformé_name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {appelOffres.societe ? (
                          <Typography variant="body2" fontWeight={500}>{appelOffres.societe.nom_societe}</Typography>
                        ) : (
                          <Typography variant="body2" color="textSecondary">—</Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={600}>{formatMontant(appelOffres.montant_ht)}</Typography>
                        <Typography variant="caption" color="textSecondary">TTC : {formatMontant(appelOffres.montant_ttc)}</Typography>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const statutStyles = {
                            valide: { color: "#10b981", bg: "#ecfdf5", border: "#10b98133" },
                            en_attente: { color: "#f59e0b", bg: "#fffbeb", border: "#f59e0b33" },
                            refuse: { color: "#ef4444", bg: "#fef2f2", border: "#ef444433" },
                          };
                          const s = statutStyles[appelOffres.statut] || { color: "#6b7280", bg: "#f3f4f6", border: "#6b728033" };
                          return (
                            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.5, py: 0.5, borderRadius: "8px", bgcolor: s.bg, border: `1px solid ${s.border}` }}>
                              <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: s.color, boxShadow: `0 0 6px ${s.color}55` }} />
                              <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: s.color, lineHeight: 1 }}>
                                {getStatutLabel(appelOffres.statut)}
                              </Typography>
                            </Box>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{formatDate(appelOffres.date_debut)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                          {appelOffres.statut === "valide" && (
                            <Tooltip title={appelOffres.deja_transforme ? `Déjà transformé : ${appelOffres.chantier_transformé_name || "N/A"}` : "Transformer en chantier"}>
                              <span>
                                <IconButton
                                  color={appelOffres.deja_transforme ? "default" : "success"}
                                  onClick={() => !appelOffres.deja_transforme && handleTransformerEnChantier(appelOffres)}
                                  disabled={appelOffres.deja_transforme || transformingId === appelOffres.id}
                                  size="small"
                                >
                                  <TransformIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}
                          <Tooltip title="Modifier le chemin du drive">
                            <IconButton color="info" size="small" onClick={() => { setSelectedAppelOffresForDrivePath(appelOffres); setShowDrivePathModal(true); }}>
                              <FolderIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Modifier le statut">
                            <IconButton color="primary" size="small" onClick={() => { setSelectedAppelOffres(appelOffres); setNouveauStatut(appelOffres.statut); setRaisonRefus(appelOffres.raison_refus || ""); setDialogOpen(true); }}>
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer l'appel d'offres">
                            <IconButton color="error" size="small" onClick={() => { setSelectedAppelOffres(appelOffres); setDeleteDialogOpen(true); }}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>

              {/* ── Pied de tableau : totaux cumulés ── */}
              {filteredTotals.count > 0 && (
                <TableFooter>
                  <TableRow sx={{ bgcolor: "rgba(99,102,241,0.06)", "& td": { borderTop: "2px solid rgba(99,102,241,0.2)" } }}>
                    <TableCell colSpan={2}>
                      <Typography variant="body2" fontWeight={700} sx={{ color: "#4338ca" }}>
                        Total — {filteredTotals.count} appel{filteredTotals.count > 1 ? "s" : ""}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={700} sx={{ color: "#4338ca" }}>
                        {formatMontant(filteredTotals.sumHT)}
                      </Typography>
                      <Typography variant="caption" sx={{ color: "#6366f1" }}>
                        TTC : {formatMontant(filteredTotals.sumTTC)}
                      </Typography>
                    </TableCell>
                    <TableCell colSpan={3} />
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* Dialog pour modifier le statut */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Modifier le statut de l'appel d'offres</DialogTitle>
        <DialogContent>
          {selectedAppelOffres && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedAppelOffres.chantier_name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Société:{" "}
                {selectedAppelOffres.societe
                  ? selectedAppelOffres.societe.nom_societe
                  : "Non spécifiée"}
              </Typography>
            </Box>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Nouveau statut</InputLabel>
            <Select
              value={nouveauStatut}
              onChange={(e) => setNouveauStatut(e.target.value)}
              label="Nouveau statut"
            >
              <MenuItem value="en_attente">En attente validation</MenuItem>
              <MenuItem value="valide">Validé</MenuItem>
              <MenuItem value="refuse">Refusé</MenuItem>
            </Select>
          </FormControl>

          {nouveauStatut === "refuse" && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Raison du refus"
              value={raisonRefus}
              onChange={(e) => setRaisonRefus(e.target.value)}
              placeholder="Expliquez la raison du refus..."
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleMettreAJourStatut}
            variant="contained"
            disabled={!nouveauStatut}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          {selectedAppelOffres && (
            <Box>
              <Typography variant="h6" gutterBottom color="error">
                ⚠️ Attention : Cette action est irréversible !
              </Typography>
              <Typography variant="body1" gutterBottom>
                Êtes-vous sûr de vouloir supprimer l'appel d'offres :
              </Typography>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
                {selectedAppelOffres.chantier_name}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Société:{" "}
                {selectedAppelOffres.societe
                  ? selectedAppelOffres.societe.nom_societe
                  : "Non spécifiée"}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Statut: {getStatutLabel(selectedAppelOffres.statut)}
              </Typography>
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  ⚠️ Cette action supprimera définitivement :
                </Typography>
                <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>L'appel d'offres et toutes ses données</li>
                  <li>Tous les devis associés à cet appel d'offres</li>
                  <li>Tous les dossiers et fichiers dans le Drive</li>
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, fontWeight: "bold" }}>
                  Cette action est irréversible !
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleSupprimerAppelOffres}
            variant="contained"
            color="error"
          >
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal pour modifier le chemin du drive */}
      {selectedAppelOffresForDrivePath && (
        <DrivePathSelector
          open={showDrivePathModal}
          onClose={() => {
            setShowDrivePathModal(false);
            setSelectedAppelOffresForDrivePath(null);
          }}
          onSelect={async (selectedPath) => {
            try {
              // ✅ Nettoyer le chemin : retirer les préfixes Appels_Offres/ et Chantiers/
              const drivePathValue = cleanDrivePath(selectedPath);
              
              // Appeler l'API pour mettre à jour le drive_path
              await axios.put(
                `/api/appels-offres/${selectedAppelOffresForDrivePath.id}/update_drive_path/`,
                { drive_path: drivePathValue }
              );
              
              showAlert("Chemin du drive mis à jour avec succès !", "success");
              fetchAppelsOffres(); // Recharger la liste pour afficher le nouveau chemin
              setShowDrivePathModal(false);
              setSelectedAppelOffresForDrivePath(null);
            } catch (error) {
              const errorMessage =
                error.response?.data?.error || "Erreur lors de la mise à jour du chemin";
              showAlert(errorMessage, "error");
            }
          }}
          defaultPath={selectedAppelOffresForDrivePath.drive_path || ''}
        />
      )}

      {/* Modal pour transformer en chantier avec sélection du drive_path */}
      {selectedAppelOffresForTransform && (
        <DrivePathSelector
          open={showTransformModal}
          onClose={() => {
            setShowTransformModal(false);
            setSelectedAppelOffresForTransform(null);
          }}
          onSelect={handleConfirmTransform}
          defaultPath={(() => {
            // Utiliser le drive_path de l'appel d'offres et remplacer Appels_Offres/ par Chantiers/
            const appelOffres = selectedAppelOffresForTransform;
            if (appelOffres.drive_path) {
              let drivePath = appelOffres.drive_path;
              // Remplacer le préfixe Appels_Offres/ par Chantiers/
              if (drivePath.startsWith('Appels_Offres/')) {
                drivePath = drivePath.replace('Appels_Offres/', 'Chantiers/');
              } else if (!drivePath.startsWith('Chantiers/')) {
                // Si le chemin n'a pas de préfixe, ajouter Chantiers/
                drivePath = `Chantiers/${drivePath}`;
              }
              return drivePath;
            }
            // Fallback : calculer le chemin par défaut à partir de la société et du nom du chantier
            if (appelOffres.societe && appelOffres.chantier_name) {
              const societeSlug = customSlugify(appelOffres.societe.nom_societe);
              const chantierSlug = customSlugify(appelOffres.chantier_name);
              if (societeSlug && chantierSlug) {
                return `Chantiers/${societeSlug}/${chantierSlug}`;
              }
            }
            return 'Chantiers/';
          })()}
        />
      )}
    </Container>
  );
};

export default GestionAppelsOffres;
