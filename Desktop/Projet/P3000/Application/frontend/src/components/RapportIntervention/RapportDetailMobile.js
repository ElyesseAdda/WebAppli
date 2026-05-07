import React, { useEffect, useState, useCallback } from "react";
import { Box, Button, Typography, CircularProgress, Snackbar, Alert } from "@mui/material";
import { MdArrowBack, MdEdit } from "react-icons/md";
import { AiFillFilePdf } from "react-icons/ai";
import axios from "axios";
import { useRapports } from "../../hooks/useRapports";
import RapportPreview from "./RapportPreview";
import { COLORS } from "../../constants/colors";

const RapportDetailMobile = ({ rapportId, onBack, onEdit }) => {
  const { fetchRapport } = useRapports();
  const [rapport, setRapport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  useEffect(() => {
    if (!rapportId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchRapport(rapportId)
      .then((data) => {
        if (!cancelled) setRapport(data);
      })
      .catch(() => {
        if (!cancelled) setError("Rapport introuvable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [rapportId, fetchRapport]);

  const handleGeneratePDF = useCallback(async () => {
    if (!rapportId) return;
    try {
      setSnackbar({ open: true, message: "Telechargement en cours...", severity: "info" });
      const response = await axios.post(
        "/api/generate-rapport-intervention-pdf/",
        { rapport_id: rapportId },
        { responseType: "blob", headers: { "Content-Type": "application/json" } }
      );
      if (response.headers["content-type"] === "application/pdf") {
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });
        const pdfUrl = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = pdfUrl;
        const cd = response.headers["content-disposition"];
        let filename = `rapport_intervention_${rapportId}.pdf`;
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
        setSnackbar({ open: true, message: "Telechargement termine", severity: "success" });
      } else {
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const err = JSON.parse(reader.result);
            setSnackbar({ open: true, message: err.error || "Erreur", severity: "error" });
          } catch {
            setSnackbar({ open: true, message: "Erreur telechargement", severity: "error" });
          }
        };
        reader.readAsText(response.data);
      }
    } catch (err) {
      setSnackbar({
        open: true,
        message: err.response?.data?.error || "Erreur generation PDF",
        severity: "error",
      });
    }
  }, [rapportId]);

  if (loading && !rapport) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 280, p: 2 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !rapport) {
    return (
      <Box sx={{ p: 2 }}>
        <Button startIcon={<MdArrowBack />} onClick={onBack} sx={{ mb: 2 }}>
          Retour
        </Button>
        <Typography color="error">{error || "Rapport introuvable"}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, pb: 4 }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1,
          alignItems: "center",
          mb: 2,
        }}
      >
        <Button startIcon={<MdArrowBack />} onClick={onBack} sx={{ minHeight: 44 }}>
          Retour
        </Button>
        <Button
          variant="contained"
          startIcon={<AiFillFilePdf />}
          onClick={handleGeneratePDF}
          sx={{
            backgroundColor: "#e65100",
            color: "#fff",
            minHeight: 44,
            "&:hover": { backgroundColor: "#bf360c" },
          }}
        >
          Telecharger PDF
        </Button>
        <Button
          variant="contained"
          startIcon={<MdEdit />}
          onClick={() => onEdit && onEdit(rapportId)}
          sx={{
            backgroundColor: COLORS.infoDark || "#1976d2",
            minHeight: 44,
            "&:hover": { backgroundColor: "#1565c0" },
          }}
        >
          Modifier
        </Button>
      </Box>
      <RapportPreview rapport={rapport} />
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

export default RapportDetailMobile;
