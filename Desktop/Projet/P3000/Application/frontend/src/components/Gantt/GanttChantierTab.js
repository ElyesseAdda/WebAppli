import AddIcon from "@mui/icons-material/Add";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  Box,
  Button,
  CircularProgress,
  IconButton,
  Paper,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import GanttStatutBadge from "./GanttStatutBadge";
import GanttTimeline from "./GanttTimeline";
import { formatDateFr } from "./ganttLayout";

/** Diagrammes de Gantt rattachés à un chantier, affichés dans sa fiche. */
const GanttChantierTab = ({ chantierId, isActive }) => {
  const navigate = useNavigate();
  const [diagrammes, setDiagrammes] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [detail, setDetail] = useState(null);

  const charger = useCallback(async () => {
    if (!chantierId) return;
    setChargement(true);
    try {
      const res = await axios.get("/api/gantt/diagrammes/", {
        params: { chantier_id: chantierId },
      });
      setDiagrammes(res.data || []);
      if (res.data && res.data.length) {
        const complet = await axios.get(
          `/api/gantt/diagrammes/${res.data[0].id}/`
        );
        setDetail(complet.data);
      } else {
        setDetail(null);
      }
    } catch (e) {
      setDiagrammes([]);
      setDetail(null);
    } finally {
      setChargement(false);
    }
  }, [chantierId]);

  useEffect(() => {
    if (isActive) charger();
  }, [isActive, charger]);

  const creer = async () => {
    try {
      const res = await axios.post("/api/gantt/diagrammes/", {
        nom: "Nouveau planning",
        description: "",
        chantier: chantierId,
        echelle: "semaine",
        elements: [],
      });
      navigate(`/gantt/${res.data.id}`);
    } catch (e) {
      // L'erreur reste silencieuse ici : l'écran dédié gère les messages.
    }
  };

  if (chargement) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography variant="h6">Plannings du chantier</Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={creer}>
          Nouveau planning
        </Button>
      </Box>

      {!diagrammes.length && (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Aucun diagramme de Gantt n'est rattaché à ce chantier.
          </Typography>
        </Paper>
      )}

      {diagrammes.map((diagramme) => (
        <Paper key={diagramme.id} sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {diagramme.nom}
            </Typography>
            <GanttStatutBadge statut={diagramme.statut} size="small" />
            <Typography variant="caption" color="text.secondary">
              {diagramme.date_debut
                ? `${formatDateFr(diagramme.date_debut)} au ${formatDateFr(
                    diagramme.date_fin
                  )}`
                : "Aucune ligne datée"}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <IconButton
              size="small"
              onClick={() => navigate(`/gantt/${diagramme.id}`)}
              title="Ouvrir le diagramme"
            >
              <OpenInNewIcon fontSize="small" />
            </IconButton>
          </Box>

          {detail && detail.id === diagramme.id && (
            <GanttTimeline
              elements={detail.elements}
              echelle={detail.echelle}
              compact
            />
          )}
        </Paper>
      ))}
    </Box>
  );
};

export default GanttChantierTab;
