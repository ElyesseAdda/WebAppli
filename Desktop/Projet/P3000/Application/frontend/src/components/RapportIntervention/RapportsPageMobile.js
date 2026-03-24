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
} from "@mui/material";
import { MdVisibility, MdEdit, MdArrowDownward, MdArrowUpward } from "react-icons/md";
import { AiFillFilePdf } from "react-icons/ai";
import axios from "axios";
import { COLORS } from "../../constants/colors";
import { useRapports } from "../../hooks/useRapports";
import "./rapports-mobile.css";

const STATUT_LABELS = {
  a_faire: "A faire",
  en_cours: "En cours",
  termine: "Terminé",
};

const TYPE_RAPPORT_LABELS = {
  intervention: "Rapport d'intervention",
  vigik_plus: "Vigik+",
};

const getStatusColor = (statut) => {
  if (statut === "termine") return "success";
  if (statut === "en_cours") return "warning";
  return "default";
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
  const { rapports, fetchRapports, loading } = useRapports();
  const [residences, setResidences] = useState([]);
  const [filters, setFilters] = useState({
    residence: "",
    logement: "",
    type_rapport: "",
  });
  const [logementInput, setLogementInput] = useState("");
  const logementDebounceRef = useRef(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

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
    fetchRapports(cleanFilters);
  }, [fetchRapports, filters.residence, filters.logement, filters.type_rapport]);

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

  const sortedRapports = useMemo(() => {
    return [...rapports].sort((a, b) => {
      const da = a.date ? new Date(a.date).getTime() : 0;
      const db = b.date ? new Date(b.date).getTime() : 0;
      if (da !== db) {
        return dateSortOrder === "desc" ? db - da : da - db;
      }
      return dateSortOrder === "desc" ? (b.id || 0) - (a.id || 0) : (a.id || 0) - (b.id || 0);
    });
  }, [rapports, dateSortOrder]);

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
  };

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
                onClick={() => setDateSortOrder((o) => (o === "desc" ? "asc" : "desc"))}
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
              onChange={(e) => setFilters((prev) => ({ ...prev, type_rapport: e.target.value }))}
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
        </Box>
      </Paper>

      {/* Liste en cartes — mobile first */}
      {loading ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          Chargement...
        </Typography>
      ) : rapports.length === 0 ? (
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
            Aucun rapport
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: isSmall ? "1fr" : "repeat(2, 1fr)",
            gap: { xs: 2, sm: 2.5 },
            maxWidth: "100%",
          }}
        >
          {sortedRapports.map((rapport) => (
            <Card
              key={rapport.id}
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
                onClick={() => onSelectRapport && onSelectRapport(rapport.id)}
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
                      label={STATUT_LABELS[rapport.statut] || rapport.statut || "A faire"}
                      size="small"
                      sx={getStatusChipSx(rapport.statut)}
                    />
                  </Box>
                  <Box sx={{ fontSize: "0.8125rem", mb: 0.5, color: "text.secondary" }}>
                    {TYPE_RAPPORT_LABELS[rapport.type_rapport] || rapport.type_rapport || "-"}
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
                    onSelectRapport && onSelectRapport(rapport.id);
                  }}
                  sx={btnRectSx(COLORS.primary, COLORS.background, COLORS.textOnDark)}
                >
                  Voir
                </Button>
                <Button
                  size="small"
                  startIcon={<AiFillFilePdf style={{ fontSize: 18 }} />}
                  onClick={(e) => handleGeneratePDF(rapport, e)}
                  sx={btnRectSx(COLORS.success, COLORS.background, COLORS.textOnDark)}
                >
                  PDF
                </Button>
                <Button
                  size="small"
                  startIcon={<MdEdit />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditRapport && onEditRapport(rapport.id);
                  }}
                  sx={btnRectSx(COLORS.accent, COLORS.background, COLORS.textOnDark)}
                >
                  Modifier
                </Button>
              </Box>
            </Card>
          ))}
        </Box>
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
    </Box>
  );
};

export default RapportsPageMobile;
