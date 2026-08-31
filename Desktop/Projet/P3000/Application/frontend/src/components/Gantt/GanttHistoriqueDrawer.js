import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Chip,
  CircularProgress,
  Drawer,
  Divider,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";

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

const normaliserRecherche = (valeur) =>
  String(valeur || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const texteEntreeHistorique = (entree) =>
  [
    entree.description,
    entree.utilisateur_nom,
    LIBELLES_ACTION[entree.action],
    entree.action,
    formatHorodatage(entree.date),
  ]
    .filter(Boolean)
    .join(" ");

/** Journal des modifications d'un diagramme, alimenté après sa validation. */
const GanttHistoriqueDrawer = ({ open, onClose, diagrammeId }) => {
  const [entrees, setEntrees] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    if (!open || !diagrammeId) return;
    setChargement(true);
    setRecherche("");
    axios
      .get(`/api/gantt/diagrammes/${diagrammeId}/historique/`)
      .then((res) => setEntrees(res.data || []))
      .catch(() => setEntrees([]))
      .finally(() => setChargement(false));
  }, [open, diagrammeId]);

  const entreesFiltrees = useMemo(() => {
    const terme = normaliserRecherche(recherche);
    if (!terme) return entrees;
    return entrees.filter((entree) =>
      normaliserRecherche(texteEntreeHistorique(entree)).includes(terme)
    );
  }, [entrees, recherche]);

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

        {!chargement && entrees.length > 0 && (
          <TextField
            fullWidth
            size="small"
            placeholder="Rechercher (description, auteur, type, date…)"
            value={recherche}
            onChange={(event) => setRecherche(event.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          />
        )}

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

        {!chargement && entrees.length > 0 && recherche && !entreesFiltrees.length && (
          <Typography variant="body2" color="text.secondary">
            Aucun résultat pour « {recherche} ».
          </Typography>
        )}

        {!chargement && entrees.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
            {recherche
              ? `${entreesFiltrees.length} résultat${entreesFiltrees.length > 1 ? "s" : ""} sur ${entrees.length}`
              : `${entrees.length} entrée${entrees.length > 1 ? "s" : ""}`}
          </Typography>
        )}

        {!chargement &&
          entreesFiltrees.map((entree) => (
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
