import {
  Box,
  Chip,
  CircularProgress,
  Drawer,
  Divider,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import axios from "axios";
import React, { useEffect, useState } from "react";

const COULEURS_ACTION = {
  validation: "success",
  reouverture: "warning",
  ajout_element: "info",
  modif_element: "default",
  suppression_element: "error",
  modif_diagramme: "default",
};

const LIBELLES_ACTION = {
  validation: "Validation",
  reouverture: "Réouverture",
  ajout_element: "Ajout",
  modif_element: "Modification",
  suppression_element: "Suppression",
  modif_diagramme: "Diagramme",
};

const formatHorodatage = (valeur) => {
  if (!valeur) return "";
  const date = new Date(valeur);
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Journal des modifications d'un diagramme, alimenté après sa validation. */
const GanttHistoriqueDrawer = ({ open, onClose, diagrammeId }) => {
  const [entrees, setEntrees] = useState([]);
  const [chargement, setChargement] = useState(false);

  useEffect(() => {
    if (!open || !diagrammeId) return;
    setChargement(true);
    axios
      .get(`/api/gantt/diagrammes/${diagrammeId}/historique/`)
      .then((res) => setEntrees(res.data || []))
      .catch(() => setEntrees([]))
      .finally(() => setChargement(false));
  }, [open, diagrammeId]);

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <Box sx={{ width: 420, p: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 1,
          }}
        >
          <Typography variant="h6">Historique des modifications</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {chargement && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={28} />
          </Box>
        )}

        {!chargement && !entrees.length && (
          <Typography variant="body2" color="text.secondary">
            Aucune modification enregistrée. L'historique commence à la
            validation du diagramme.
          </Typography>
        )}

        {!chargement &&
          entrees.map((entree) => (
            <Box
              key={entree.id}
              sx={{
                mb: 1.5,
                pb: 1.5,
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
              >
                <Chip
                  label={LIBELLES_ACTION[entree.action] || entree.action}
                  size="small"
                  color={COULEURS_ACTION[entree.action] || "default"}
                />
                <Typography variant="caption" color="text.secondary">
                  {formatHorodatage(entree.date)}
                </Typography>
              </Box>
              <Typography variant="body2">{entree.description}</Typography>
              <Typography variant="caption" color="text.secondary">
                {entree.utilisateur_nom}
              </Typography>
            </Box>
          ))}
      </Box>
    </Drawer>
  );
};

export default GanttHistoriqueDrawer;
