import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Box,
  Typography,
  Paper,
  Card,
  CardContent,
  CardActionArea,
  Chip,
  TextField,
  Autocomplete,
  Button,
  IconButton,
  Tooltip,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Pagination,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { MdVisibility, MdEdit, MdArrowDownward, MdArrowUpward, MdCheck, MdClose, MdThumbUp } from "react-icons/md";
import { AiFillFilePdf } from "react-icons/ai";
import axios from "axios";
import { alpha } from "@mui/material/styles";
import { COLORS } from "../../constants/colors";
import { useRapports, RAPPORTS_LIST_PAGE_SIZE } from "../../hooks/useRapports";
import "./rapports-mobile.css";

const STATUT_LABELS = {
  brouillon: "Brouillon",
  brouillon_serveur: "Brouillon serveur",
  a_faire: "A faire",
  en_cours: "En cours",
  termine: "Terminé",
};

const TYPE_RAPPORT_LABELS = {
  intervention: "Rapport d'intervention",
  vigik_plus: "Vigik+",
};

/** Couleurs des badges de statut (rectangulaires, cohérent avec COLORS) */
const getStatusChipSx = (statut) => {
  const base = {
    flexShrink: 0,
    fontWeight: 600,
    fontSize: "0.75rem",
    borderRadius: 1,
    minHeight: 32,
    px: 2,
    border: "1px solid",
  };
  if (statut === "termine") {
    return { ...base, color: COLORS.successDark, backgroundColor: COLORS.successLight, borderColor: COLORS.success };
  }
  if (statut === "en_cours") {
    return { ...base, color: COLORS.accentDark, backgroundColor: COLORS.accentLight, borderColor: COLORS.accent };
  }
  if (statut === "brouillon") {
    return { ...base, color: COLORS.infoDark || "#1565c0", backgroundColor: "#e3f2fd", borderColor: COLORS.infoDark || "#1976d2" };
  }
  if (statut === "brouillon_serveur") {
    return {
      ...base,
      color: "#6a1b9a",
      backgroundColor: "#f3e5f5",
      borderColor: "#8e24aa",
    };
  }
  return { ...base, color: COLORS.primary, backgroundColor: COLORS.backgroundAlt, borderColor: COLORS.primary };
};

/** Style commun pour boutons rectangulaires (mobile) : bordure + texte coloré, hover inversé */
const btnRectSx = (borderColor, bgColor, hoverTextColor) => ({
  minHeight: 48,
  minWidth: "auto",
  px: 2,
  borderRadius: 1,
  fontWeight: 600,
  fontSize: "0.8125rem",
  color: borderColor,
  backgroundColor: bgColor,
  border: `1px solid ${borderColor}`,
  "&:hover": {
    backgroundColor: borderColor,
    color: hoverTextColor,
    borderColor,
  },
});

const RapportsPageMobile = ({ onSelectRapport, onEditRapport }) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const { rapports, rapportsCount, fetchRapports, loading } = useRapports();
  const [brouillonsServeur, setBrouillonsServeur] = useState([]);
  const [residences, setResidences] = useState([]);
  const [filters, setFilters] = useState({
    residence: "",
    logement: "",
    type_rapport: "",
  });
  const [logementInput, setLogementInput] = useState("");
  const logementDebounceRef = useRef(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [dateSortOrder, setDateSortOrder] = useState("desc");
  const [showTermines, setShowTermines] = useState(false);
  const [showOnlyDevisAFaireV, setShowOnlyDevisAFaireV] = useState(false);
  const [listPage, setListPage] = useState(1);
  const skipNextLogementPageResetRef = useRef(true);
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
    if (filters.residence) cleanFilters.residence = filters.residence;
    if (filters.logement) cleanFilters.logement = filters.logement;
    if (filters.type_rapport) cleanFilters.type_rapport = filters.type_rapport;
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
    });
  }, [fetchRapports, filters.residence, filters.logement, filters.type_rapport, listPage, dateSortOrder, showTermines, showOnlyDevisAFaireV]);

  const brouillonsFiltres = useMemo(() => {
    const log = (filters.logement || "").trim().toLowerCase();
    return brouillonsServeur.filter((b) => {
      if (filters.residence && Number(b.residence) !== Number(filters.residence)) return false;
      if (filters.type_rapport && b.type_rapport !== filters.type_rapport) return false;
      if (log && !String(b.logement || "").toLowerCase().includes(log)) return false;
      if (showOnlyDevisAFaireV && (!b.devis_a_faire || b.devis_fait)) return false;
      return true;
    });
  }, [brouillonsServeur, filters.residence, filters.logement, filters.type_rapport, showOnlyDevisAFaireV]);

  const brouillonsSorted = useMemo(() => {
    return [...brouillonsFiltres].sort((a, b) => {
      const ta = new Date(a.updated_at || 0).getTime();
      const tb = new Date(b.updated_at || 0).getTime();
      return dateSortOrder === "desc" ? tb - ta : ta - tb;
    });
  }, [brouillonsFiltres, dateSortOrder]);

  const displayRapports = listPage === 1 ? [...brouillonsSorted, ...rapports] : rapports;

  const showInitialLoading =
    loading && rapports.length === 0 && (listPage > 1 || brouillonsSorted.length === 0);

  useEffect(() => {
    loadRapports();
  }, [loadRapports]);

  useEffect(() => {
    if (logementDebounceRef.current) clearTimeout(logementDebounceRef.current);
    logementDebounceRef.current = setTimeout(() => {
      setFilters((prev) => ({ ...prev, logement: logementInput.trim() }));
    }, 300);
    return () => {
      if (logementDebounceRef.current) clearTimeout(logementDebounceRef.current);
    };
  }, [logementInput]);

  useEffect(() => {
    if (skipNextLogementPageResetRef.current) {
      skipNextLogementPageResetRef.current = false;
      return;
    }
    setListPage(1);
  }, [filters.logement]);

  const listPageCount = Math.max(1, Math.ceil(rapportsCount / RAPPORTS_LIST_PAGE_SIZE));

  useEffect(() => {
    if (!loading && listPage > listPageCount) {
      setListPage(listPageCount);
    }
  }, [loading, listPage, listPageCount]);

  const handleGeneratePDF = async (rapport, e) => {
    if (e) e.stopPropagation();
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
        setSnackbar({ open: true, message: "Téléchargement terminé", severity: "success" });
      } else {
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const err = JSON.parse(reader.result);
            setSnackbar({ open: true, message: err.error || "Erreur", severity: "error" });
          } catch {
            setSnackbar({ open: true, message: "Erreur téléchargement", severity: "error" });
          }
        };
        reader.readAsText(response.data);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || "Erreur génération PDF",
        severity: "error",
      });
    }
  };

  const handleFilterResidence = (_, value) => {
    setFilters((prev) => ({ ...prev, residence: value?.id || "" }));
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
      await axios.patch(`/api/rapports-intervention/${rapportForDevis.id}/`, {
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
      await axios.patch(`/api/rapports-intervention/${rapportForDevis.id}/`, {
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

  return (
    <Box
      className="rapports-mobile-layout"
      sx={{
        p: 2,
        pb: 1,
        px: { xs: 2, sm: 2.5 },
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
      }}
    >
      {/* Filtres — usage mobile : tactile, lisible, réinitialisable */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2,
          borderRadius: 2,
          border: `1px solid ${COLORS.border || "#e0e0e0"}`,
          backgroundColor: COLORS.background || "#fff",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, flexWrap: "wrap", gap: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, color: COLORS.primary, fontSize: "1rem" }}>
            Filtrer
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Tooltip
              title={
                dateSortOrder === "desc"
                  ? "Plus récent d'abord — toucher pour plus ancien d'abord"
                  : "Plus ancien d'abord — toucher pour plus récent d'abord"
              }
            >
              <IconButton
                size="small"
                onClick={() => {
                  setDateSortOrder((o) => (o === "desc" ? "asc" : "desc"));
                  setListPage(1);
                }}
                sx={{
                  color: COLORS.textMuted,
                  opacity: 0.75,
                  "&:hover": { opacity: 1, backgroundColor: COLORS.backgroundAlt },
                }}
                aria-label={
                  dateSortOrder === "desc"
                    ? "Tri par date : plus récent d'abord"
                    : "Tri par date : plus ancien d'abord"
                }
              >
                {dateSortOrder === "desc" ? (
                  <MdArrowDownward size={22} />
                ) : (
                  <MdArrowUpward size={22} />
                )}
              </IconButton>
            </Tooltip>
            {(filters.residence || filters.logement || filters.type_rapport) && (
              <Button
                size="small"
                onClick={() => {
                  setFilters({ residence: "", logement: "", type_rapport: "" });
                  setLogementInput("");
                  setShowOnlyDevisAFaireV(false);
                  setListPage(1);
                }}
                sx={{
                  minHeight: 40,
                  px: 1.5,
                  borderRadius: 1,
                  fontWeight: 600,
                  fontSize: "0.8125rem",
                  color: COLORS.textMuted,
                  border: `1px solid ${COLORS.border}`,
                  "&:hover": { backgroundColor: COLORS.backgroundAlt, borderColor: COLORS.primary },
                }}
              >
                Réinitialiser
              </Button>
            )}
          </Box>
        </Box>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Autocomplete
            options={residences}
            getOptionLabel={(opt) => opt?.nom || ""}
            value={residences.find((r) => r.id === filters.residence) || null}
            onChange={handleFilterResidence}
            fullWidth
            renderInput={(params) => (
              <TextField
                {...params}
                label="Résidence"
                placeholder="Toutes les résidences"
                size="small"
                sx={{
                  "& .MuiOutlinedInput-root": {
                    minHeight: 48,
                    borderRadius: 1,
                    fontSize: "1rem",
                    backgroundColor: COLORS.backgroundAlt,
                    "& fieldset": { borderColor: COLORS.border },
                    "&:hover fieldset": { borderColor: COLORS.primary },
                    "&.Mui-focused fieldset": { borderWidth: 2, borderColor: COLORS.accent },
                  },
                  "& .MuiInputLabel-outlined": { color: COLORS.textMuted },
                }}
              />
            )}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
            slotProps={{
              paper: { sx: { borderRadius: 2, mt: 1, boxShadow: 2 } },
              listbox: { sx: { maxHeight: 280, py: 0 } },
            }}
          />
          <TextField
            fullWidth
            label="Logement"
            value={logementInput}
            onChange={(e) => setLogementInput(e.target.value)}
            placeholder="Rechercher par nom de logement"
            size="small"
            sx={{
              "& .MuiOutlinedInput-root": {
                minHeight: 48,
                borderRadius: 1,
                fontSize: "1rem",
                backgroundColor: COLORS.backgroundAlt,
                "& fieldset": { borderColor: COLORS.border },
                "&:hover fieldset": { borderColor: COLORS.primary },
                "&.Mui-focused fieldset": { borderWidth: 2, borderColor: COLORS.accent },
              },
              "& .MuiInputLabel-outlined": { color: COLORS.textMuted },
            }}
          />
          <FormControl fullWidth size="small">
            <InputLabel id="mobile-filter-type-rapport-label">Type de rapport</InputLabel>
            <Select
              labelId="mobile-filter-type-rapport-label"
              label="Type de rapport"
              value={filters.type_rapport}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, type_rapport: e.target.value }));
                setListPage(1);
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  minHeight: 48,
                  borderRadius: 1,
                  backgroundColor: COLORS.backgroundAlt,
                },
              }}
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="intervention">{TYPE_RAPPORT_LABELS.intervention}</MenuItem>
              <MenuItem value="vigik_plus">{TYPE_RAPPORT_LABELS.vigik_plus}</MenuItem>
            </Select>
          </FormControl>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              pl: 1,
              pr: 2,
              py: 1.1,
              borderRadius: 2.5,
              border: "1.5px solid",
              borderColor: showTermines ? COLORS.accent : COLORS.border,
              bgcolor: showTermines ? alpha(COLORS.accent, 0.1) : alpha(COLORS.primary, 0.03),
              transition: "border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
              boxShadow: showTermines
                ? `0 1px 0 ${alpha(COLORS.accent, 0.2)}, 0 4px 16px ${alpha(COLORS.accent, 0.1)}`
                : `inset 0 1px 0 ${alpha("#fff", 0.9)}`,
              WebkitTapHighlightColor: "transparent",
              "@media (hover: hover)": {
                "&:hover": {
                  borderColor: COLORS.accent,
                  bgcolor: showTermines ? alpha(COLORS.accent, 0.14) : alpha(COLORS.accent, 0.06),
                  boxShadow: `0 2px 12px ${alpha(COLORS.primary, 0.07)}`,
                },
              },
              "&:active": {
                transform: "scale(0.995)",
                transition: "transform 0.1s ease",
              },
            }}
          >
            <FormControlLabel
              sx={{
                m: 0,
                width: "100%",
                mx: 0,
                gap: 1.25,
                alignItems: "center",
                userSelect: "none",
                justifyContent: "flex-start",
              }}
              control={
                <Checkbox
                  disableRipple
                  checked={showTermines}
                  onChange={(e) => {
                    setShowTermines(e.target.checked);
                    setListPage(1);
                  }}
                  sx={{
                    p: 0.75,
                    color: COLORS.borderDark,
                    transition: "color 0.2s ease, transform 0.15s ease",
                    "& .MuiSvgIcon-root": { fontSize: 24, borderRadius: "7px" },
                    "&.Mui-checked": {
                      color: COLORS.accent,
                      transform: "scale(1.03)",
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
                    fontSize: "0.9375rem",
                    color: showTermines ? COLORS.primary : COLORS.textMuted,
                    lineHeight: 1.35,
                  }}
                >
                  Afficher terminés
                </Typography>
              }
            />
          </Box>
          <Box
            sx={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              pl: 1,
              pr: 2,
              py: 1.1,
              borderRadius: 2.5,
              border: "1.5px solid",
              borderColor: showOnlyDevisAFaireV ? COLORS.success : COLORS.border,
              bgcolor: showOnlyDevisAFaireV ? alpha(COLORS.success, 0.1) : alpha(COLORS.primary, 0.03),
              transition: "border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease",
              boxShadow: showOnlyDevisAFaireV
                ? `0 1px 0 ${alpha(COLORS.success, 0.2)}, 0 4px 16px ${alpha(COLORS.success, 0.1)}`
                : `inset 0 1px 0 ${alpha("#fff", 0.9)}`,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <FormControlLabel
              sx={{
                m: 0,
                width: "100%",
                mx: 0,
                gap: 1.25,
                alignItems: "center",
                userSelect: "none",
                justifyContent: "flex-start",
              }}
              control={
                <Checkbox
                  disableRipple
                  checked={showOnlyDevisAFaireV}
                  onChange={(e) => {
                    setShowOnlyDevisAFaireV(e.target.checked);
                    setListPage(1);
                  }}
                  sx={{
                    p: 0.75,
                    color: COLORS.borderDark,
                    transition: "color 0.2s ease, transform 0.15s ease",
                    "& .MuiSvgIcon-root": { fontSize: 24, borderRadius: "7px" },
                    "&.Mui-checked": {
                      color: COLORS.success,
                      transform: "scale(1.03)",
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
                    fontSize: "0.9375rem",
                    color: showOnlyDevisAFaireV ? COLORS.primary : COLORS.textMuted,
                    lineHeight: 1.35,
                  }}
                >
                  Devis à faire
                </Typography>
              }
            />
          </Box>
        </Box>
      </Paper>

      {/* Liste paginée — mobile first */}
      {showInitialLoading ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          Chargement...
        </Typography>
      ) : !loading && rapportsCount === 0 && brouillonsFiltres.length === 0 ? (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            textAlign: "center",
            borderRadius: 2,
            border: `1px solid ${COLORS.border || "#e0e0e0"}`,
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Aucun rapport ne correspond à ces critères.
          </Typography>
          {!showTermines && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5, px: 1 }}>
              Les rapports terminés sont masqués — cochez « Afficher terminés » pour les inclure.
            </Typography>
          )}
        </Paper>
      ) : (
        <>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: isSmall ? "1fr" : "repeat(2, 1fr)",
            gap: { xs: 2, sm: 2.5 },
            maxWidth: "100%",
          }}
        >
          {displayRapports.map((rapport) => {
            const rowKey = rapport.is_brouillon_serveur ? `br-${rapport.id}` : rapport.id;
            const st = rapport.statut || "a_faire";
            return (
            <Card
              key={rowKey}
              elevation={0}
              sx={{
                border: `1px solid ${COLORS.border || "#e0e0e0"}`,
                borderRadius: 2,
                overflow: "hidden",
                backgroundColor: COLORS.background || "#fff",
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
                transition: "box-shadow 0.2s ease, border-color 0.2s ease",
                "&:active": { borderColor: COLORS.accent || "#46acc2" },
              }}
            >
              <CardActionArea
                onClick={() => {
                  if (onSelectRapport) onSelectRapport(rapport);
                }}
                sx={{
                  minHeight: 48,
                  flex: 1,
                  display: "block",
                  "&.MuiCardActionArea-focusHighlight": { backgroundColor: "transparent" },
                }}
              >
                <CardContent
                  sx={{
                    p: 2,
                    pb: 1.5,
                    "&:last-child": { pb: 1.5 },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 1,
                      mb: 1.5,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      sx={{
                        fontWeight: 700,
                        fontSize: { xs: "0.95rem", sm: "1rem" },
                        lineHeight: 1.3,
                        color: COLORS.primaryDark || COLORS.primary,
                        flex: 1,
                        minWidth: 0,
                        wordBreak: "break-word",
                      }}
                    >
                      {rapport.residence_nom || "Sans résidence"}
                    </Typography>
                    <Chip
                      label={STATUT_LABELS[st] || st || "A faire"}
                      size="small"
                      sx={getStatusChipSx(st)}
                    />
                  </Box>
                  <Box sx={{ fontSize: "0.8125rem", mb: 0.5, color: "text.secondary" }}>
                    {TYPE_RAPPORT_LABELS[rapport.type_rapport] || rapport.type_rapport || "-"}
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
                    <Typography component="span" variant="body2" sx={{ color: COLORS.primary, fontWeight: 600, fontSize: "0.8125rem" }}>
                      Devis à faire :
                    </Typography>
                    {rapport.is_brouillon_serveur ? (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    ) : rapport.devis_fait ? (
                      <IconButton
                        size="small"
                        onClick={(e) => handleBlueThumbClick(e, rapport)}
                        onDoubleClick={(e) => handleBlueThumbDoubleClick(e, rapport)}
                        title={rapport.devis_lie_numero ? `Devis ${rapport.devis_lie_numero} (double-clic pour corriger)` : "Voir le devis lié (double-clic pour corriger)"}
                      >
                        <MdThumbUp size={18} color="#1565c0" />
                      </IconButton>
                    ) : rapport.devis_a_faire ? (
                      <IconButton size="small" onClick={(e) => handleDevisIconClick(e, rapport)} title="Cliquer pour lier le devis et marquer fait">
                        <MdCheck size={18} color="#2e7d32" />
                      </IconButton>
                    ) : (
                      <MdClose size={18} color="#c62828" title="Non" />
                    )}
                  </Box>
                  {rapport.client_societe_nom && (
                    <Box sx={{ fontSize: "0.8125rem", mb: 0.5, color: "text.secondary" }}>
                      Client : {rapport.client_societe_nom}
                    </Box>
                  )}
                  <Box sx={{ fontSize: "0.875rem", mb: 0.5, lineHeight: 1.4 }}>
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ color: COLORS.primary, fontWeight: 600, fontSize: "inherit" }}
                    >
                      Lieu d&apos;intervention :{" "}
                    </Typography>
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ color: COLORS.accent, fontSize: "inherit" }}
                    >
                      {rapport.type_rapport === "vigik_plus"
                        ? (rapport.adresse_vigik || "-")
                        : (rapport.logement || "-")}
                    </Typography>
                  </Box>
                  <Box sx={{ fontSize: "0.8125rem", lineHeight: 1.4 }}>
                    <Typography
                      component="span"
                      variant="body2"
                      sx={{ color: COLORS.accent, fontWeight: 600, fontSize: "inherit" }}
                    >
                      {rapport.date ? new Date(rapport.date).toLocaleDateString("fr-FR") : "-"}
                    </Typography>
                    {rapport.titre_nom && (
                      <>
                        <Typography component="span" variant="body2" sx={{ color: COLORS.textMuted, fontSize: "inherit" }}>
                          {" · "}
                        </Typography>
                        <Typography component="span" variant="body2" sx={{ color: COLORS.textLight, fontSize: "inherit" }}>
                          {rapport.titre_nom}
                        </Typography>
                      </>
                    )}
                  </Box>
                </CardContent>
              </CardActionArea>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "stretch",
                  justifyContent: "flex-end",
                  gap: 1,
                  px: 1.5,
                  py: 1.5,
                  borderTop: `1px solid ${COLORS.borderLight || "#eee"}`,
                  backgroundColor: COLORS.backgroundAlt || "#f8f9fa",
                  flexWrap: "wrap",
                }}
              >
                <Button
                  size="small"
                  startIcon={<MdVisibility />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onSelectRapport) onSelectRapport(rapport);
                  }}
                  sx={btnRectSx(COLORS.primary, COLORS.background, COLORS.textOnDark)}
                >
                  Voir
                </Button>
                {!rapport.is_brouillon_serveur && (
                <Button
                  size="small"
                  startIcon={<AiFillFilePdf style={{ fontSize: 18 }} />}
                  onClick={(e) => handleGeneratePDF(rapport, e)}
                  sx={btnRectSx(COLORS.success, COLORS.background, COLORS.textOnDark)}
                >
                  PDF
                </Button>
                )}
                <Button
                  size="small"
                  startIcon={<MdEdit />}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onEditRapport) onEditRapport(rapport);
                  }}
                  sx={btnRectSx(COLORS.accent, COLORS.background, COLORS.textOnDark)}
                >
                  Modifier
                </Button>
              </Box>
            </Card>
          );
          })}
        </Box>
        {listPageCount > 1 && (
          <Stack alignItems="center" sx={{ py: 2, pb: 1 }}>
            <Pagination
              count={listPageCount}
              page={listPage}
              onChange={(_, p) => setListPage(p)}
              color="primary"
              showFirstButton
              showLastButton
              size="small"
              siblingCount={0}
              boundaryCount={1}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
              {rapportsCount} au total — {RAPPORTS_LIST_PAGE_SIZE} par page
            </Typography>
          </Stack>
        )}
        </>
      )}

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>

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
    </Box>
  );
};

export default RapportsPageMobile;
