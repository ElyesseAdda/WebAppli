import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import HistoryIcon from "@mui/icons-material/History";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import SearchIcon from "@mui/icons-material/Search";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import TaskAltIcon from "@mui/icons-material/TaskAlt";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  CircularProgress,
  Drawer,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material";

const LARGEUR = 440;

const STYLES_ACTION = {
  validation: {
    label: "Validation",
    dot: "#34d399",
    icon: TaskAltIcon,
    theme: { bg: "#ecfdf5", border: "#a7f3d0", color: "#047857" },
  },
  reouverture: {
    label: "Réouverture",
    dot: "#fbbf24",
    icon: LockOpenOutlinedIcon,
    theme: { bg: "#fffbeb", border: "#fde68a", color: "#b45309" },
  },
  ajout_element: {
    label: "Ajout",
    dot: "#38bdf8",
    icon: AddCircleOutlineIcon,
    theme: { bg: "#f0f9ff", border: "#bae6fd", color: "#0369a1" },
  },
  modif_element: {
    label: "Modification",
    dot: "#64748b",
    icon: EditOutlinedIcon,
    theme: { bg: "#f8fafc", border: "#e2e8f0", color: "#334155" },
  },
  suppression_element: {
    label: "Suppression",
    dot: "#f87171",
    icon: DeleteOutlineIcon,
    theme: { bg: "#fef2f2", border: "#fecaca", color: "#b91c1c" },
  },
  modif_diagramme: {
    label: "Diagramme",
    dot: "#818cf8",
    icon: SettingsOutlinedIcon,
    theme: { bg: "#eef2ff", border: "#c7d2fe", color: "#4338ca" },
  },
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

const formatJour = (valeur) => {
  if (!valeur) return "";
  const date = new Date(valeur);
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatHeure = (valeur) => {
  if (!valeur) return "";
  const date = new Date(valeur);
  return date.toLocaleTimeString("fr-FR", {
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
    STYLES_ACTION[entree.action]?.label,
    entree.action,
    formatHorodatage(entree.date),
  ]
    .filter(Boolean)
    .join(" ");

const initialesUtilisateur = (nom) => {
  if (!nom) return "?";
  const parties = nom.trim().split(/\s+/).filter(Boolean);
  if (parties.length >= 2) {
    return `${parties[0][0]}${parties[parties.length - 1][0]}`.toUpperCase();
  }
  return nom.slice(0, 2).toUpperCase();
};

const surlignerGuillemets = (texte) => {
  const segments = String(texte).split(/(«[^»]+»)/g);
  return segments.map((segment, index) =>
    segment.startsWith("«") ? (
      <Box
        key={index}
        component="span"
        sx={{ fontWeight: 600, color: "#1565c0" }}
      >
        {segment}
      </Box>
    ) : (
      segment
    )
  );
};

/** Met en valeur les changements « avant → après » ou « … devient … ». */
const DescriptionHistorique = ({ description }) => {
  if (!description) return null;

  if (description.includes(" → ")) {
    const [avant, apres] = description.split(" → ");
    return (
      <Typography variant="body2" component="div" sx={{ lineHeight: 1.55 }}>
        {surlignerGuillemets(avant)}
        <Box
          component="span"
          sx={{
            display: "inline-flex",
            alignItems: "center",
            mx: 0.75,
            px: 0.75,
            py: 0.125,
            borderRadius: 1,
            fontSize: 12,
            fontWeight: 700,
            color: "#64748b",
            bgcolor: "#f1f5f9",
          }}
        >
          →
        </Box>
        <Box component="span" sx={{ fontWeight: 600, color: "#047857" }}>
          {apres}
        </Box>
      </Typography>
    );
  }

  const matchDevient = description.match(/^(.*?) devient « (.+) »$/);
  if (matchDevient) {
    const [, prefixe, nouvelleValeur] = matchDevient;
    return (
      <Typography variant="body2" component="div" sx={{ lineHeight: 1.55 }}>
        {surlignerGuillemets(prefixe)}
        <Box component="span" sx={{ color: "text.secondary" }}>
          {" "}
          devient{" "}
        </Box>
        <Box component="span" sx={{ fontWeight: 600, color: "#047857" }}>
          « {nouvelleValeur} »
        </Box>
      </Typography>
    );
  }

  return (
    <Typography variant="body2" sx={{ lineHeight: 1.55 }}>
      {surlignerGuillemets(description)}
    </Typography>
  );
};

const BadgeAction = ({ action }) => {
  const config = STYLES_ACTION[action] || STYLES_ACTION.modif_element;
  const Icone = config.icon;

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.25,
        borderRadius: "999px",
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        border: "1px solid",
        borderColor: config.theme.border,
        backgroundColor: config.theme.bg,
        color: config.theme.color,
        lineHeight: 1.4,
        flexShrink: 0,
      }}
    >
      <Icone sx={{ fontSize: 13 }} />
      {config.label}
    </Box>
  );
};

const EntreeHistorique = ({ entree }) => {
  const config = STYLES_ACTION[entree.action] || STYLES_ACTION.modif_element;

  return (
    <Box sx={{ display: "flex", gap: 1.5, position: "relative" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          pt: 0.75,
          flexShrink: 0,
        }}
      >
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: "50%",
            bgcolor: config.dot,
            boxShadow: `0 0 0 3px ${config.theme.bg}, 0 0 8px ${config.dot}55`,
            zIndex: 1,
          }}
        />
      </Box>

      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          border: "1px solid",
          borderColor: "#eef2f6",
          bgcolor: "#fff",
          boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          transition: "box-shadow 0.15s ease, border-color 0.15s ease",
          "&:hover": {
            borderColor: config.theme.border,
            boxShadow: "0 4px 12px rgba(15, 23, 42, 0.06)",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
            mb: 1,
          }}
        >
          <BadgeAction action={entree.action} />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ whiteSpace: "nowrap", pt: 0.25 }}
          >
            {formatHeure(entree.date)}
          </Typography>
        </Box>

        <DescriptionHistorique description={entree.description} />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            mt: 1.25,
            pt: 1,
            borderTop: "1px solid #f1f5f9",
          }}
        >
          <Avatar
            sx={{
              width: 24,
              height: 24,
              fontSize: 10,
              fontWeight: 700,
              bgcolor: "#546e7a",
            }}
          >
            {initialesUtilisateur(entree.utilisateur_nom)}
          </Avatar>
          <Typography variant="caption" color="text.secondary" noWrap>
            {entree.utilisateur_nom}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

const EtatVide = ({ icone: Icone, titre, sousTitre }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      py: 6,
      px: 3,
    }}
  >
    <Box
      sx={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#f1f5f9",
        color: "#64748b",
        mb: 2,
      }}
    >
      <Icone sx={{ fontSize: 28 }} />
    </Box>
    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
      {titre}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {sousTitre}
    </Typography>
  </Box>
);

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

  const groupesParJour = useMemo(() => {
    const groupes = [];
    entreesFiltrees.forEach((entree) => {
      const jour = formatJour(entree.date);
      const dernier = groupes[groupes.length - 1];
      if (dernier?.jour === jour) {
        dernier.entrees.push(entree);
      } else {
        groupes.push({ jour, entrees: [entree] });
      }
    });
    return groupes;
  }, [entreesFiltrees]);

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: LARGEUR,
          maxWidth: "100vw",
          bgcolor: "#f8fafc",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <Box
          sx={{
            px: 2,
            pt: 2,
            pb: 1.5,
            bgcolor: "#fff",
            borderBottom: "1px solid #e2e8f0",
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1,
              mb: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: "#eceff1",
                  color: "#546e7a",
                }}
              >
                <HistoryIcon fontSize="small" />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontSize: 17, lineHeight: 1.3 }}>
                  Historique
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Modifications depuis la validation
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ mt: -0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          {!chargement && entrees.length > 0 && (
            <>
              <TextField
                fullWidth
                size="small"
                placeholder="Rechercher une modification…"
                value={recherche}
                onChange={(event) => setRecherche(event.target.value)}
                sx={{
                  mb: 1,
                  "& .MuiOutlinedInput-root": {
                    bgcolor: "#f8fafc",
                    borderRadius: 2,
                  },
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
              />
              <Typography variant="caption" color="text.secondary">
                {recherche
                  ? `${entreesFiltrees.length} résultat${entreesFiltrees.length > 1 ? "s" : ""} sur ${entrees.length}`
                  : `${entrees.length} entrée${entrees.length > 1 ? "s" : ""}`}
              </Typography>
            </>
          )}
        </Box>

        <Box sx={{ flex: 1, overflow: "auto", px: 2, py: 2 }}>
          {chargement && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {!chargement && !entrees.length && (
            <EtatVide
              icone={HistoryIcon}
              titre="Aucune modification"
              sousTitre="L'historique commence à la validation du diagramme."
            />
          )}

          {!chargement &&
            entrees.length > 0 &&
            recherche &&
            !entreesFiltrees.length && (
              <EtatVide
                icone={SearchIcon}
                titre="Aucun résultat"
                sousTitre={`Aucune entrée ne correspond à « ${recherche} ».`}
              />
            )}

          {!chargement &&
            groupesParJour.map((groupe) => (
              <Box key={groupe.jour} sx={{ mb: 1 }}>
                <Typography
                  variant="overline"
                  sx={{
                    display: "block",
                    mb: 1.5,
                    color: "#64748b",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "capitalize",
                  }}
                >
                  {groupe.jour}
                </Typography>

                <Box
                  sx={{
                    position: "relative",
                    pl: 0.5,
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      left: 9,
                      top: 8,
                      bottom: 16,
                      width: 2,
                      bgcolor: "#e2e8f0",
                      borderRadius: 1,
                    },
                  }}
                >
                  {groupe.entrees.map((entree) => (
                    <EntreeHistorique key={entree.id} entree={entree} />
                  ))}
                </Box>
              </Box>
            ))}
        </Box>
      </Box>
    </Drawer>
  );
};

export default GanttHistoriqueDrawer;
