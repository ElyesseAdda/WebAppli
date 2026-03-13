import React, { useEffect, useState, useCallback, useRef } from "react";
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
  IconButton,
  Button,
  Snackbar,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { MdVisibility, MdEdit } from "react-icons/md";
import { AiFillFilePdf } from "react-icons/ai";
import axios from "axios";
import { COLORS } from "../../constants/colors";
import { useRapports } from "../../hooks/useRapports";

const STATUT_LABELS = {
  a_faire: "A faire",
  en_cours: "En cours",
  termine: "Terminé",
};

const getStatusColor = (statut) => {
  if (statut === "termine") return "success";
  if (statut === "en_cours") return "warning";
  return "default";
};

const RapportsPageMobile = ({ onSelectRapport, onEditRapport }) => {
  const theme = useTheme();
  const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
  const { rapports, fetchRapports, loading } = useRapports();
  const [residences, setResidences] = useState([]);
  const [filters, setFilters] = useState({
    residence: "",
    logement: "",
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
    fetchRapports(cleanFilters);
  }, [fetchRapports, filters.residence, filters.logement]);

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
    <Box sx={{ p: 2, pb: 1 }}>
      {/* Filtres */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
          Filtrer
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Autocomplete
            options={residences}
            getOptionLabel={(opt) => opt?.nom || ""}
            value={residences.find((r) => r.id === filters.residence) || null}
            onChange={handleFilterResidence}
            renderInput={(params) => (
              <TextField {...params} label="Résidence" size="small" placeholder="Toutes" />
            )}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
          />
          <TextField
            label="Logement"
            size="small"
            value={logementInput}
            onChange={(e) => setLogementInput(e.target.value)}
            placeholder="Rechercher par nom de logement"
          />
        </Box>
      </Paper>

      {/* Liste en cartes */}
      {loading ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
          Chargement...
        </Typography>
      ) : rapports.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 2, border: "1px solid #e0e0e0" }}>
          <Typography variant="body2" color="text.secondary">
            Aucun rapport
          </Typography>
        </Paper>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: isSmall ? "1fr" : "repeat(2, 1fr)",
            gap: 2,
          }}
        >
          {rapports.map((rapport) => (
            <Card
              key={rapport.id}
              elevation={0}
              sx={{
                border: "1px solid #e0e0e0",
                borderRadius: 2,
                overflow: "hidden",
              }}
            >
              <CardActionArea
                onClick={() => onSelectRapport && onSelectRapport(rapport.id)}
                sx={{ minHeight: 44 }}
              >
                <CardContent sx={{ pb: 1, "&:last-child": { pb: 1.5 } }}>
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }} color="text.primary">
                      {rapport.residence_nom || "Sans résidence"}
                    </Typography>
                    <Chip
                      label={STATUT_LABELS[rapport.statut] || rapport.statut || "A faire"}
                      size="small"
                      color={getStatusColor(rapport.statut)}
                    />
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    Logement : {rapport.logement || "-"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {rapport.date ? new Date(rapport.date).toLocaleDateString("fr-FR") : "-"} · {rapport.titre_nom || "-"}
                  </Typography>
                </CardContent>
              </CardActionArea>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 0.5,
                  px: 1.5,
                  pb: 1.5,
                  pt: 0,
                }}
              >
                <Button
                  size="small"
                  startIcon={<MdVisibility />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectRapport && onSelectRapport(rapport.id);
                  }}
                  sx={{ minHeight: 44 }}
                >
                  Voir
                </Button>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => handleGeneratePDF(rapport, e)}
                  title="Télécharger PDF"
                  sx={{ minWidth: 44, minHeight: 44 }}
                >
                  <AiFillFilePdf style={{ fontSize: 22 }} />
                </IconButton>
                <IconButton
                  size="small"
                  color="primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditRapport && onEditRapport(rapport.id);
                  }}
                  title="Modifier"
                  sx={{ minWidth: 44, minHeight: 44 }}
                >
                  <MdEdit />
                </IconButton>
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
