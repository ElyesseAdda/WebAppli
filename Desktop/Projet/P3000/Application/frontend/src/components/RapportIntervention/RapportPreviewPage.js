import React, { useEffect, useState } from "react";
import { Box, Button, Typography, CircularProgress } from "@mui/material";
import { MdArrowBack, MdEdit } from "react-icons/md";
import { useParams, useNavigate } from "react-router-dom";
import { useRapports } from "../../hooks/useRapports";
import RapportPreview from "./RapportPreview";
import { COLORS } from "../../constants/colors";

const RapportPreviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchRapport, loading } = useRapports();
  const [rapport, setRapport] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setError(null);
    fetchRapport(id)
      .then((data) => {
        if (!cancelled) setRapport(data);
      })
      .catch(() => {
        if (!cancelled) setError("Rapport introuvable");
      });
    return () => { cancelled = true; };
  }, [id, fetchRapport]);

  if (loading && !rapport) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !rapport) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<MdArrowBack />} onClick={() => navigate("/RapportsIntervention")} sx={{ mb: 2 }}>
          Retour
        </Button>
        <Typography color="error">{error || "Rapport introuvable"}</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 1 }}>
        <Button
          startIcon={<MdArrowBack />}
          onClick={() => navigate("/RapportsIntervention")}
          sx={{ color: COLORS.textOnDark }}
        >
          Retour à la liste
        </Button>
        <Button
          variant="contained"
          startIcon={<MdEdit />}
          onClick={() => navigate(`/RapportIntervention/${id}`)}
          sx={{ backgroundColor: COLORS.infoDark || "#1976d2", "&:hover": { backgroundColor: "#1565c0" } }}
        >
          Modifier
        </Button>
      </Box>
      <RapportPreview rapport={rapport} />
    </Box>
  );
};

export default RapportPreviewPage;
