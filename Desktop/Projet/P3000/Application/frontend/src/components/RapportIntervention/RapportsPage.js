import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, TextField,
  Snackbar, Alert, Autocomplete, FormControl, InputLabel, Select, MenuItem,
  Tooltip, FormControlLabel, Checkbox, Pagination, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import {
  MdAdd, MdEdit, MdDelete, MdDescription, MdArrowDownward, MdArrowUpward,
  MdCheck, MdClose, MdThumbUp,
} from "react-icons/md";
import { AiFillFilePdf } from "react-icons/ai";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { alpha } from "@mui/material/styles";
import { COLORS } from "../../constants/colors";
import { useRapports, RAPPORTS_LIST_PAGE_SIZE } from "../../hooks/useRapports";
import StatusChangeModal from "../StatusChangeModal";
import { RegeneratePDFIconButton } from "../shared/RegeneratePDFButton";
import { DOCUMENT_TYPES } from "../../config/documentTypeConfig";

const STATUT_LABELS = {
  brouillon: "Brouillon",
  brouillon_serveur: "Brouillons",
  a_faire: "A faire",
  en_cours: "En cours",
  termine: "Terminé",
};

const TYPE_RAPPORT_LABELS = {
  intervention: "Rapport d'intervention",
  vigik_plus: "Vigik+",
};

/** En-têtes : même bleu que le bouton « Nouveau rapport » (infoDark), texte blanc */
const tableHeadCellSx = {
  fontWeight: 700,
  color: COLORS.textOnDark,
  backgroundColor: COLORS.infoDark || "#1976d2",
};

const getStatusStyles = (statut) => ({
  display: "inline-block",
  px: 1.5,
  py: 0.5,
  borderRadius: 1,
  backgroundColor:
    statut === "termine"
      ? "success.light"
      : statut === "en_cours"
      ? "warning.light"
      : statut === "brouillon_serveur"
      ? "#e0f2f1"
      : statut === "brouillon"
      ? "info.light"
      : "grey.200",
  color:
    statut === "termine"
      ? "success.dark"
      : statut === "en_cours"
      ? "warning.dark"
      : statut === "brouillon_serveur"
      ? "#00695c"
      : statut === "brouillon"
      ? "info.dark"
      : "grey.700",
  fontWeight: 500,
  textTransform: "capitalize",
  cursor: statut === "brouillon_serveur" ? "default" : "pointer",
  "&:hover": { opacity: statut === "brouillon_serveur" ? 1 : 0.9 },
});

const RapportsPage = () => {
  const navigate = useNavigate();
  const { rapports, rapportsCount, fetchRapports, deleteRapport, patchRapport, deleteRapportBrouillon, loading } = useRapports();
  const [brouillonsServeur, setBrouillonsServeur] = useState([]);
  const [filters, setFilters] = useState({
    technicien: "",
    client_societe: "",
    residence: "",
    date_creation: "",
    type_rapport: "",
  });
  const [residences, setResidences] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [rapportToUpdate, setRapportToUpdate] = useState(null);
  /** Tri par date : desc = plus récent d'abord, asc = plus ancien d'abord */
  const [dateSortOrder, setDateSortOrder] = useState("desc");
  /** Par défaut : masquer les rapports au statut terminé */
  const [showTermines, setShowTermines] = useState(false);
  /** Afficher uniquement les rapports avec état devis à faire (V) */
  const [showOnlyDevisAFaireV, setShowOnlyDevisAFaireV] = useState(false);
  const [listPage, setListPage] = useState(1);
  const [devisDialogOpen, setDevisDialogOpen] = useState(false);
  const [rapportForDevis, setRapportForDevis] = useState(null);
  const [devisOptions, setDevisOptions] = useState([]);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const thumbClickTimeoutRef = useRef(null);

  useEffect(() => {
    axios.get("/api/residences/").then((res) => {
      setResidences(res.data?.results || res.data || []);
    }).catch(() => {});
  }, []);

  const loadRapports = useCallback(() => {
    const cleanFilters = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v) cleanFilters[k] = v;
    });
    if (showOnlyDevisAFaireV) {
      cleanFilters.devis_a_faire = "true";
      cleanFilters.devis_fait = "false";
    }
    axios
      .get("/api/rapports-intervention-brouillons/")
      .then((r) => {
        const d = r.data;
        setBrouillonsServeur(Array.isArray(d) ? d : []);
      })
      .catch(() => setBrouillonsServeur([]));
    return fetchRapports(cleanFilters, {
      page: listPage,
      pageSize: RAPPORTS_LIST_PAGE_SIZE,
      ordering: dateSortOrder === "desc" ? "-date" : "date",
      excludeStatutTermine: !showTermines,
      onlyStatutTermine: showTermines,
    });
  }, [fetchRapports, filters, listPage, dateSortOrder, showTermines, showOnlyDevisAFaireV]);

  const brouillonsFiltres = useMemo(() => {
    return brouillonsServeur.filter((b) => {
      if (filters.residence && Number(b.residence) !== Number(filters.residence)) return false;
      if (filters.type_rapport && b.type_rapport !== filters.type_rapport) return false;
      if (filters.date_creation) {
        const ds = b.date ? String(b.date).slice(0, 10) : "";
        if (ds !== filters.date_creation) return false;
      }
      if (filters.technicien) {
        const t = String(b.technicien || "").toLowerCase();
        if (!t.includes(String(filters.technicien).toLowerCase())) return false;
      }
      if (filters.client_societe && Number(b.client_societe) !== Number(filters.client_societe)) return false;
      if (showOnlyDevisAFaireV && (!b.devis_a_faire || b.devis_fait)) return false;
      return true;
    });
  }, [brouillonsServeur, filters, showOnlyDevisAFaireV]);

  const brouillonsSorted = useMemo(() => {
    return [...brouillonsFiltres].sort((a, b) => {
      const ta = new Date(a.updated_at || 0).getTime();
      const tb = new Date(b.updated_at || 0).getTime();
      return dateSortOrder === "desc" ? tb - ta : ta - tb;
    });
  }, [brouillonsFiltres, dateSortOrder]);

  const displayRapports =
    listPage === 1 && !showTermines ? [...brouillonsSorted, ...rapports] : rapports;

  const showInitialLoading =
    loading &&
    rapports.length === 0 &&
    (listPage > 1 || showTermines || brouillonsSorted.length === 0);

  useEffect(() => {
    loadRapports();
  }, [loadRapports]);

  const handleDelete = async (row) => {
    if (row?.is_brouillon_serveur) {
      if (!window.confirm("Supprimer ce brouillon en ligne ?")) return;
      try {
        await deleteRapportBrouillon(row.id);
        setSnackbar({ open: true, message: "Brouillon supprimé", severity: "success" });
        loadRapports();
      } catch {
        setSnackbar({ open: true, message: "Erreur lors de la suppression du brouillon", severity: "error" });
      }
      return;
    }
    if (!window.confirm("Supprimer ce rapport ?")) return;
    try {
      await deleteRapport(row.id);
      setSnackbar({ open: true, message: "Rapport supprime", severity: "success" });
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Erreur lors de la suppression", severity: "error" });
    }
  };

  const handleStatusClick = (e, rapport) => {
    e.stopPropagation();
    setRapportToUpdate(rapport);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async (newStatut) => {
    if (!rapportToUpdate) return;
    try {
      await patchRapport(rapportToUpdate.id, { statut: newStatut });
      if (newStatut === "termine") {
        setSnackbar({ open: true, message: "Téléversement vers le Drive en cours...", severity: "info" });
        try {
          await axios.get(
            `/api/generate-rapport-intervention-pdf-drive/?rapport_id=${rapportToUpdate.id}`
          );
          setSnackbar({
            open: true,
            message: "Statut mis à jour et rapport téléversé dans le Drive",
            severity: "success",
          });
        } catch (driveErr) {
          setSnackbar({
            open: true,
            message:
              driveErr.response?.data?.error ||
              "Statut mis à jour mais erreur lors du téléversement Drive",
            severity: "warning",
          });
        }
      } else {
        setSnackbar({ open: true, message: "Statut mis à jour", severity: "success" });
      }
      setShowStatusModal(false);
      setRapportToUpdate(null);
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Erreur lors de la mise à jour du statut", severity: "error" });
    }
  };

  const handleGeneratePDF = async (rapport) => {
    try {
      setSnackbar({ open: true, message: "Téléchargement en cours...", severity: "info" });
      const response = await axios.post(
        "/api/generate-rapport-intervention-pdf/",
        { rapport_id: rapport.id },
        { responseType: "blob", headers: { "Content-Type": "application/json" } }
      );
      if (response.headers["content-type"] === "application/pdf") {
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });
        const pdfUrl = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = pdfUrl;
        const cd = response.headers["content-disposition"];
        let filename = `rapport_intervention_${rapport.id}.pdf`;
        if (cd) {
          const match = cd.match(/filename=["']?([^"';]+)["']?/i) || cd.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
          if (match) {
            try {
              filename = decodeURIComponent(match[1].trim().replace(/^["']|["']$/g, ""));
            } catch {
              filename = match[1].trim().replace(/^["']|["']$/g, "");
            }
          }
        }
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(pdfUrl);
        setSnackbar({ open: true, message: "Téléchargement terminé avec succès", severity: "success" });
      } else {
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const err = JSON.parse(reader.result);
            setSnackbar({ open: true, message: `Erreur: ${err.error || "Erreur inconnue"}`, severity: "error" });
          } catch {
            setSnackbar({ open: true, message: "Erreur lors du téléchargement", severity: "error" });
          }
        };
        reader.readAsText(response.data);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || "Erreur lors de la génération du PDF.",
        severity: "error",
      });
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    setListPage(1);
  };

  const openDevisDialogForRapport = async (rapport) => {
    try {
      const params = { page_size: 200 };
      if (rapport?.chantier) params.chantier = rapport.chantier;
      const [devisRes, rapportsRes] = await Promise.all([
        axios.get("/api/devisa/", { params }),
        axios.get("/api/rapports-intervention/", { params: { page_size: 500 } }),
      ]);
      const devisList = devisRes.data?.results || devisRes.data || [];
      const rapportsList = rapportsRes.data?.results || rapportsRes.data || [];
      const usedDevisIds = new Set(
        (Array.isArray(rapportsList) ? rapportsList : [])
          .filter((r) => r?.id !== rapport?.id)
          .map((r) => r?.devis_lie)
          .filter(Boolean)
      );
      const filteredDevis = (Array.isArray(devisList) ? devisList : []).filter(
        (d) => !usedDevisIds.has(d.id) || d.id === rapport?.devis_lie
      );
      setDevisOptions(filteredDevis);
      const currentDevis = filteredDevis.find((d) => d.id === rapport?.devis_lie) || null;
      setSelectedDevis(currentDevis);
      setRapportForDevis(rapport);
      setDevisDialogOpen(true);
    } catch {
      setSnackbar({ open: true, message: "Impossible de charger la liste des devis", severity: "error" });
    }
  };

  const handleConfirmDevisFait = async () => {
    if (!rapportForDevis?.id || !selectedDevis?.id) return;
    try {
      await patchRapport(rapportForDevis.id, {
        devis_a_faire: true,
        devis_fait: true,
        devis_lie: selectedDevis.id,
      });
      setSnackbar({ open: true, message: "Devis lié et rapport marqué comme devis fait", severity: "success" });
      setDevisDialogOpen(false);
      setRapportForDevis(null);
      setSelectedDevis(null);
      loadRapports();
    } catch (err) {
      const msg = err?.response?.data?.devis_lie?.[0] || "Impossible de lier ce devis";
      setSnackbar({ open: true, message: msg, severity: "error" });
    }
  };

  const handleDevisIconClick = async (e, rapport) => {
    e.stopPropagation();
    if (rapport.devis_a_faire) {
      await openDevisDialogForRapport(rapport);
    }
  };

  const handleBlueThumbClick = (e, rapport) => {
    e.stopPropagation();
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
    }
    thumbClickTimeoutRef.current = setTimeout(() => {
      if (rapport.devis_lie_preview_url) {
        window.open(rapport.devis_lie_preview_url, "_blank");
      } else {
        setSnackbar({ open: true, message: "Devis marqué fait mais aucun devis lié", severity: "warning" });
      }
      thumbClickTimeoutRef.current = null;
    }, 220);
  };

  const handleBlueThumbDoubleClick = async (e, rapport) => {
    e.stopPropagation();
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
      thumbClickTimeoutRef.current = null;
    }
    await openDevisDialogForRapport(rapport);
  };

  const handleResetToDevisAFaire = async () => {
    if (!rapportForDevis?.id) return;
    try {
      await patchRapport(rapportForDevis.id, {
        devis_a_faire: true,
        devis_fait: false,
        devis_lie: null,
      });
      setSnackbar({ open: true, message: "Rapport repassé en devis à faire", severity: "success" });
      setDevisDialogOpen(false);
      setRapportForDevis(null);
      setSelectedDevis(null);
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Impossible de repasser en devis à faire", severity: "error" });
    }
  };

  useEffect(() => () => {
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
    }
  }, []);

  const listPageCount = Math.max(1, Math.ceil(rapportsCount / RAPPORTS_LIST_PAGE_SIZE));

  useEffect(() => {
    if (!loading && listPage > listPageCount) {
      setListPage(listPageCount);
    }
  }, [loading, listPage, listPageCount]);

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MdDescription size={32} color={COLORS.accent || "#46acc2"} />
          <Typography variant="h4" component="h1" sx={{ color: COLORS.textOnDark }}>
            Rapports d'intervention
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<MdAdd />}
          onClick={() => navigate("/RapportIntervention/nouveau")}
          sx={{ backgroundColor: COLORS.infoDark || "#1976d2", "&:hover": { backgroundColor: "#1565c0" } }}
        >
          Nouveau rapport
        </Button>
      </Box>

      {/* Filtres */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <Autocomplete
            options={residences}
            getOptionLabel={(opt) => opt?.nom || ""}
            value={residences.find((r) => r.id === filters.residence) || null}
            onChange={(_, val) => handleFilterChange("residence", val?.id || "")}
            renderInput={(params) => <TextField {...params} label="Résidence" size="small" />}
            sx={{ minWidth: 200 }}
          />

          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="filter-type-rapport-label">Type de rapport</InputLabel>
            <Select
              labelId="filter-type-rapport-label"
              label="Type de rapport"
              value={filters.type_rapport}
              onChange={(e) => handleFilterChange("type_rapport", e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="intervention">{TYPE_RAPPORT_LABELS.intervention}</MenuItem>
              <MenuItem value="vigik_plus">{TYPE_RAPPORT_LABELS.vigik_plus}</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Date de création du rapport"
            type="date"
            size="small"
            value={filters.date_creation}
            onChange={(e) => handleFilterChange("date_creation", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          <Tooltip
            title={
              dateSortOrder === "desc"
                ? "Plus récent d'abord — cliquer pour plus ancien d'abord"
                : "Plus ancien d'abord — cliquer pour plus récent d'abord"
            }
          >
            <IconButton
              size="small"
              onClick={() => {
                setDateSortOrder((o) => (o === "desc" ? "asc" : "desc"));
                setListPage(1);
              }}
              sx={{
                alignSelf: "center",
                color: "text.secondary",
                opacity: 0.65,
                "&:hover": { opacity: 1, backgroundColor: "action.hover" },
              }}
              aria-label={
                dateSortOrder === "desc"
                  ? "Tri par date : plus récent d'abord"
                  : "Tri par date : plus ancien d'abord"
              }
            >
              {dateSortOrder === "desc" ? (
                <MdArrowDownward size={20} />
              ) : (
                <MdArrowUpward size={20} />
              )}
            </IconButton>
          </Tooltip>

          <Box
            sx={{
              alignSelf: "center",
              display: "inline-flex",
              alignItems: "center",
              pl: 0.75,
              pr: 2,
              py: 0.75,
              borderRadius: 3,
              border: "1.5px solid",
              borderColor: showTermines ? COLORS.accent : COLORS.border,
              bgcolor: showTermines ? alpha(COLORS.accent, 0.1) : alpha(COLORS.primary, 0.03),
              transition: "border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
              boxShadow: showTermines
                ? `0 1px 0 ${alpha(COLORS.accent, 0.25)}, 0 4px 14px ${alpha(COLORS.accent, 0.12)}`
                : `inset 0 1px 0 ${alpha("#fff", 0.8)}`,
              "&:hover": {
                borderColor: COLORS.accent,
                bgcolor: showTermines ? alpha(COLORS.accent, 0.14) : alpha(COLORS.accent, 0.06),
                boxShadow: `0 2px 12px ${alpha(COLORS.primary, 0.08)}`,
              },
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  disableRipple
                  checked={showTermines}
                  onChange={(e) => {
                    setShowTermines(e.target.checked);
                    setListPage(1);
                  }}
                  sx={{
                    p: 0.65,
                    color: COLORS.borderDark,
                    transition: "color 0.2s ease, transform 0.15s ease",
                    "& .MuiSvgIcon-root": { fontSize: 22, borderRadius: "6px" },
                    "&.Mui-checked": {
                      color: COLORS.accent,
                      transform: "scale(1.02)",
                    },
                    "&:hover": { bgcolor: alpha(COLORS.accent, 0.08) },
                  }}
                />
              }
              label={
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    fontSize: "0.8125rem",
                    color: showTermines ? COLORS.primary : COLORS.textMuted,
                    lineHeight: 1.25,
                  }}
                >
                  Afficher terminés
                </Typography>
              }
              sx={{ m: 0, gap: 0.75, userSelect: "none", alignItems: "center" }}
            />
          </Box>

          <Box
            sx={{
              alignSelf: "center",
              display: "inline-flex",
              alignItems: "center",
              pl: 0.75,
              pr: 2,
              py: 0.75,
              borderRadius: 3,
              border: "1.5px solid",
              borderColor: showOnlyDevisAFaireV ? COLORS.success : COLORS.border,
              bgcolor: showOnlyDevisAFaireV ? alpha(COLORS.success, 0.1) : alpha(COLORS.primary, 0.03),
              transition: "border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
              boxShadow: showOnlyDevisAFaireV
                ? `0 1px 0 ${alpha(COLORS.success, 0.25)}, 0 4px 14px ${alpha(COLORS.success, 0.12)}`
                : `inset 0 1px 0 ${alpha("#fff", 0.8)}`,
              "&:hover": {
                borderColor: COLORS.success,
                bgcolor: showOnlyDevisAFaireV ? alpha(COLORS.success, 0.14) : alpha(COLORS.success, 0.06),
                boxShadow: `0 2px 12px ${alpha(COLORS.success, 0.08)}`,
              },
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  disableRipple
                  checked={showOnlyDevisAFaireV}
                  onChange={(e) => {
                    setShowOnlyDevisAFaireV(e.target.checked);
                    setListPage(1);
                  }}
                  sx={{
                    p: 0.65,
                    color: COLORS.borderDark,
                    transition: "color 0.2s ease, transform 0.15s ease",
                    "& .MuiSvgIcon-root": { fontSize: 22, borderRadius: "6px" },
                    "&.Mui-checked": {
                      color: COLORS.success,
                      transform: "scale(1.02)",
                    },
                    "&:hover": { bgcolor: alpha(COLORS.success, 0.08) },
                  }}
                />
              }
              label={
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    letterSpacing: "0.03em",
                    fontSize: "0.8125rem",
                    color: showOnlyDevisAFaireV ? COLORS.primary : COLORS.textMuted,
                    lineHeight: 1.25,
                  }}
                >
                  Devis à faire
                </Typography>
              }
              sx={{ m: 0, gap: 0.75, userSelect: "none", alignItems: "center" }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Liste paginée côté serveur (tri + filtre terminés) */}
      {showInitialLoading ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 2, border: "1px solid #e0e0e0" }}>
          <Typography variant="body1" color="text.secondary">
            Chargement...
          </Typography>
        </Paper>
      ) : !loading && rapportsCount === 0 && (showTermines || brouillonsFiltres.length === 0) ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 2, border: "1px solid #e0e0e0" }}>
          <Typography variant="body1" color="text.secondary">
            Aucun rapport d&apos;intervention ne correspond à ces critères.
          </Typography>
          {!showTermines ? (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 480, mx: "auto" }}>
              Les rapports terminés sont masqués par défaut — cochez « Afficher terminés » pour les afficher.
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5, maxWidth: 480, mx: "auto" }}>
              Aucun rapport terminé ne correspond à ces critères.
            </Typography>
          )}
        </Paper>
      ) : (
        <>
        <Paper elevation={0} sx={{ borderRadius: 2, border: "1px solid #e0e0e0", overflow: "hidden" }}>
          <TableContainer sx={{ maxHeight: "calc(100vh - 280px)" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ ...tableHeadCellSx, minWidth: 140 }}>Résidence</TableCell>
                  <TableCell sx={tableHeadCellSx}>Date</TableCell>
                  <TableCell sx={tableHeadCellSx}>Type</TableCell>
                  <TableCell sx={tableHeadCellSx}>Lieu d&apos;intervention / Adresse</TableCell>
                  <TableCell sx={tableHeadCellSx}>Titre</TableCell>
                  <TableCell sx={tableHeadCellSx}>Technicien</TableCell>
                  <TableCell sx={tableHeadCellSx}>Client</TableCell>
                  <TableCell sx={{ ...tableHeadCellSx, textAlign: "center" }}>Devis à faire</TableCell>
                  <TableCell sx={tableHeadCellSx}>Statut</TableCell>
                  <TableCell sx={{ ...tableHeadCellSx, textAlign: "center" }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRapports.map((rapport) => {
                  const rowKey = rapport.is_brouillon_serveur ? `br-${rapport.id}` : rapport.id;
                  const st = rapport.statut || "a_faire";
                  return (
                  <TableRow
                    key={rowKey}
                    hover
                    sx={{ cursor: "pointer" }}
                    onClick={() => {
                      if (rapport.is_brouillon_serveur) {
                        navigate(`/RapportIntervention/nouveau?brouillon=${rapport.id}`);
                      } else {
                        window.open(`/api/preview-rapport-intervention/${rapport.id}/`, "_blank");
                      }
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600 }}>
                      {rapport.residence_nom || "Sans résidence"}
                    </TableCell>
                    <TableCell>{rapport.date ? new Date(rapport.date).toLocaleDateString("fr-FR") : "-"}</TableCell>
                    <TableCell>{TYPE_RAPPORT_LABELS[rapport.type_rapport] || rapport.type_rapport || "-"}</TableCell>
                    <TableCell sx={{ fontWeight: 500, maxWidth: 220 }}>
                      {rapport.type_rapport === "vigik_plus"
                        ? (rapport.adresse_vigik || "-")
                        : (rapport.logement || "-")}
                    </TableCell>
                    <TableCell>{rapport.titre_nom || "-"}</TableCell>
                    <TableCell>{rapport.technicien || "-"}</TableCell>
                    <TableCell>{rapport.client_societe_nom || "-"}</TableCell>
                    <TableCell sx={{ textAlign: "center" }}>
                      {rapport.is_brouillon_serveur ? (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      ) : rapport.devis_fait ? (
                        <IconButton
                          size="small"
                          onClick={(e) => handleBlueThumbClick(e, rapport)}
                          onDoubleClick={(e) => handleBlueThumbDoubleClick(e, rapport)}
                          title={rapport.devis_lie_numero ? `Devis ${rapport.devis_lie_numero} (double-clic pour corriger)` : "Voir le devis lié (double-clic pour corriger)"}
                        >
                          <MdThumbUp size={20} color="#1565c0" />
                        </IconButton>
                      ) : rapport.devis_a_faire ? (
                        <IconButton size="small" onClick={(e) => handleDevisIconClick(e, rapport)} title="Cliquer pour lier le devis et marquer fait">
                          <MdCheck size={20} color="#2e7d32" />
                        </IconButton>
                      ) : (
                        <MdClose size={20} color="#c62828" title="Non" />
                      )}
                    </TableCell>
                    <TableCell
                      onClick={(e) => {
                        if (rapport.is_brouillon_serveur) e.stopPropagation();
                        else handleStatusClick(e, rapport);
                      }}
                      sx={
                        rapport.is_brouillon_serveur
                          ? { cursor: "default" }
                          : { cursor: "pointer", "&:hover": { backgroundColor: "rgba(27, 120, 188, 0.08)" } }
                      }
                    >
                      <Typography variant="body2" sx={getStatusStyles(st)}>
                        {STATUT_LABELS[st] || st || "A faire"}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ textAlign: "center", whiteSpace: "nowrap" }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!rapport.is_brouillon_serveur && (
                        <>
                      <IconButton
                        size="small"
                        onClick={() => handleGeneratePDF(rapport)}
                        sx={{ color: "success.main", "&:hover": { backgroundColor: "rgba(46, 125, 50, 0.04)" } }}
                        title="Télécharger le PDF"
                      >
                        <AiFillFilePdf style={{ fontSize: "20px" }} />
                      </IconButton>
                      <RegeneratePDFIconButton
                        documentType={rapport.type_rapport === "vigik_plus" ? DOCUMENT_TYPES.RAPPORT_VIGIK_PLUS : DOCUMENT_TYPES.RAPPORT_INTERVENTION}
                        documentData={rapport}
                        size="small"
                        color="primary"
                        tooltipPlacement="top"
                      />
                        </>
                      )}
                      <IconButton size="small" color="primary"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (rapport.is_brouillon_serveur) {
                            navigate(`/RapportIntervention/nouveau?brouillon=${rapport.id}`);
                          } else {
                            navigate(`/RapportIntervention/${rapport.id}`);
                          }
                        }}
                      >
                        <MdEdit />
                      </IconButton>
                      <IconButton size="small" color="error" onClick={() => handleDelete(rapport)}>
                        <MdDelete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
        {listPageCount > 1 && (
          <Stack alignItems="center" sx={{ py: 2 }}>
            <Pagination
              count={listPageCount}
              page={listPage}
              onChange={(_, p) => setListPage(p)}
              color="primary"
              showFirstButton
              showLastButton
              size="small"
              siblingCount={1}
              boundaryCount={1}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {rapportsCount} rapport{rapportsCount > 1 ? "s" : ""} au total — {RAPPORTS_LIST_PAGE_SIZE} par page
            </Typography>
          </Stack>
        )}
        </>
      )}

      <StatusChangeModal
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setRapportToUpdate(null);
        }}
        currentStatus={rapportToUpdate?.statut}
        onStatusChange={handleStatusUpdate}
        type="rapport"
        title="Modifier le statut du rapport"
      />

      <Dialog open={devisDialogOpen} onClose={() => setDevisDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Lier un devis (devis fait)</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={devisOptions}
            value={selectedDevis}
            onChange={(_, v) => setSelectedDevis(v)}
            getOptionLabel={(opt) => `${opt?.numero || "Sans numéro"}${opt?.chantier_name ? ` — ${opt.chantier_name}` : ""}`}
            renderInput={(params) => <TextField {...params} label="Choisir un devis" size="small" sx={{ mt: 1 }} />}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
          />
        </DialogContent>
        <DialogActions>
          {rapportForDevis?.devis_fait && (
            <Button color="warning" onClick={handleResetToDevisAFaire}>
              Repasser en devis à faire (V)
            </Button>
          )}
          <Button onClick={() => setDevisDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleConfirmDevisFait} disabled={!selectedDevis}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RapportsPage;
