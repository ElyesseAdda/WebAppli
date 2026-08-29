import AddIcon from "@mui/icons-material/Add";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Snackbar,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  calculerBarre,
  calculerBornes,
  calculerPeriodes,
  formatDateFr,
} from "./ganttLayout";
import GanttStatutBadge from "./GanttStatutBadge";

const LARGEUR_LIBELLES = 300;

/**
 * Vue globale : chaque diagramme est réduit à une seule barre récapitulative
 * sur un axe temporel commun. Le clic ouvre le diagramme détaillé.
 */
const ListeGantt = () => {
  const navigate = useNavigate();
  const [onglet, setOnglet] = useState(0);
  const [diagrammes, setDiagrammes] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [recherche, setRecherche] = useState("");
  const [dialogOuvert, setDialogOuvert] = useState(false);
  const [nouveauNom, setNouveauNom] = useState("");
  const [nouveauChantier, setNouveauChantier] = useState(null);
  const [erreur, setErreur] = useState(null);

  const lie = onglet === 0 ? "oui" : "non";

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const res = await axios.get("/api/gantt/diagrammes/", {
        params: { lie },
      });
      setDiagrammes(res.data || []);
    } catch (e) {
      setErreur("Impossible de charger les diagrammes.");
      setDiagrammes([]);
    } finally {
      setChargement(false);
    }
  }, [lie]);

  useEffect(() => {
    charger();
  }, [charger]);

  useEffect(() => {
    axios
      .get("/api/chantier/")
      .then((res) => setChantiers(res.data || []))
      .catch(() => setChantiers([]));
  }, []);

  const diagrammesFiltres = useMemo(() => {
    const terme = recherche.trim().toLowerCase();
    if (!terme) return diagrammes;
    return diagrammes.filter(
      (d) =>
        (d.nom || "").toLowerCase().includes(terme) ||
        (d.chantier_nom || "").toLowerCase().includes(terme)
    );
  }, [diagrammes, recherche]);

  // Axe temporel commun à tous les diagrammes affichés
  const axe = useMemo(() => {
    const bornes = calculerBornes(
      diagrammesFiltres.filter((d) => d.date_debut && d.date_fin)
    );
    return calculerPeriodes(bornes, "mois");
  }, [diagrammesFiltres]);

  const creer = async () => {
    if (!nouveauNom.trim()) {
      setErreur("Le nom du diagramme est obligatoire.");
      return;
    }
    try {
      const res = await axios.post("/api/gantt/diagrammes/", {
        nom: nouveauNom.trim(),
        description: "",
        chantier: nouveauChantier ? nouveauChantier.id : null,
        echelle: "semaine",
        elements: [],
      });
      setDialogOuvert(false);
      setNouveauNom("");
      setNouveauChantier(null);
      navigate(`/gantt/${res.data.id}`);
    } catch (e) {
      setErreur("Impossible de créer le diagramme.");
    }
  };

  const largeurPeriode = axe.periodes.length ? 100 / axe.periodes.length : 100;

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mb: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Diagrammes de Gantt
        </Typography>
        <Box sx={{ flex: 1 }} />
        <TextField
          size="small"
          placeholder="Rechercher..."
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setNouveauChantier(null);
            setDialogOuvert(true);
          }}
        >
          Nouveau diagramme
        </Button>
      </Box>

      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={onglet}
          onChange={(event, valeur) => setOnglet(valeur)}
          sx={{ borderBottom: "1px solid #e0e0e0" }}
        >
          <Tab label="Diagrammes de chantier" />
          <Tab label="Diagrammes indépendants" />
        </Tabs>

        {chargement && (
          <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
            <CircularProgress />
          </Box>
        )}

        {!chargement && !diagrammesFiltres.length && (
          <Box sx={{ p: 5, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {onglet === 0
                ? "Aucun diagramme lié à un chantier pour le moment."
                : "Aucun diagramme indépendant pour le moment."}
            </Typography>
          </Box>
        )}

        {!chargement && diagrammesFiltres.length > 0 && (
          <Box sx={{ overflowX: "auto" }}>
            <Box sx={{ minWidth: 800 }}>
              {/* En-tête de l'axe commun */}
              <Box
                sx={{
                  display: "flex",
                  backgroundColor: "#f5f7fa",
                  borderBottom: "1px solid #e0e0e0",
                }}
              >
                <Box
                  sx={{
                    width: LARGEUR_LIBELLES,
                    minWidth: LARGEUR_LIBELLES,
                    borderRight: "1px solid #e0e0e0",
                    px: 1.5,
                    py: 1,
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  Diagramme
                </Box>
                <Box sx={{ flex: 1, display: "flex" }}>
                  {axe.periodes.map((periode) => (
                    <Box
                      key={periode.cle}
                      sx={{
                        width: `${largeurPeriode}%`,
                        borderRight: "1px solid #e8e8e8",
                        textAlign: "center",
                        fontSize: 11,
                        py: 1,
                        color: "text.secondary",
                        textTransform: "capitalize",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                      }}
                    >
                      {periode.libelle}
                    </Box>
                  ))}
                  {!axe.periodes.length && (
                    <Box sx={{ py: 1, px: 1.5, fontSize: 12 }}>
                      Aucune date renseignée
                    </Box>
                  )}
                </Box>
              </Box>

              {diagrammesFiltres.map((diagramme) => {
                const barre = calculerBarre(
                  diagramme.date_debut,
                  diagramme.date_fin,
                  axe
                );
                return (
                  <Box
                    key={diagramme.id}
                    onClick={() => navigate(`/gantt/${diagramme.id}`)}
                    sx={{
                      display: "flex",
                      minHeight: 48,
                      borderBottom: "1px solid #f0f0f0",
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "rgba(25,118,210,0.04)" },
                    }}
                  >
                    <Box
                      sx={{
                        width: LARGEUR_LIBELLES,
                        minWidth: LARGEUR_LIBELLES,
                        borderRight: "1px solid #e0e0e0",
                        px: 1.5,
                        py: 1,
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 600, flex: 1 }}
                          noWrap
                        >
                          {diagramme.nom}
                        </Typography>
                        <GanttStatutBadge statut={diagramme.statut} size="small" />
                      </Box>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {diagramme.chantier_nom
                          ? diagramme.chantier_nom
                          : "Sans chantier"}
                        {" · "}
                        {diagramme.nb_lignes} ligne
                        {diagramme.nb_lignes > 1 ? "s" : ""}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        flex: 1,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          pointerEvents: "none",
                        }}
                      >
                        {axe.periodes.map((periode) => (
                          <Box
                            key={periode.cle}
                            sx={{
                              width: `${largeurPeriode}%`,
                              borderRight: "1px solid #f4f4f4",
                            }}
                          />
                        ))}
                      </Box>

                      {barre ? (
                        <Box
                          sx={{
                            position: "absolute",
                            left: `${barre.gauche}%`,
                            width: `${barre.largeur}%`,
                            height: 20,
                            borderRadius: "4px",
                            backgroundColor:
                              diagramme.statut === "termine"
                                ? "#2e7d32"
                                : "#ed6c02",
                            display: "flex",
                            alignItems: "center",
                            px: 1,
                            boxSizing: "border-box",
                          }}
                          title={`${formatDateFr(
                            diagramme.date_debut
                          )} au ${formatDateFr(diagramme.date_fin)}`}
                        >
                          {barre.largeur > 18 && (
                            <Typography
                              sx={{
                                fontSize: 10,
                                color: "#fff",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                              }}
                            >
                              {formatDateFr(diagramme.date_debut)} →{" "}
                              {formatDateFr(diagramme.date_fin)}
                            </Typography>
                          )}
                        </Box>
                      ) : (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ pl: 1.5 }}
                        >
                          Aucune ligne datée
                        </Typography>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </Paper>

      <Dialog
        open={dialogOuvert}
        onClose={() => setDialogOuvert(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Nouveau diagramme de Gantt</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Nom du diagramme"
            value={nouveauNom}
            onChange={(e) => setNouveauNom(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <Autocomplete
            options={chantiers}
            value={nouveauChantier}
            getOptionLabel={(option) => option.chantier_name || ""}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            onChange={(event, option) => setNouveauChantier(option)}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Chantier lié (optionnel)"
                placeholder="Aucun chantier"
              />
            )}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Le diagramme est enregistré immédiatement comme brouillon : vous
            pourrez le reprendre plus tard, et vos collègues aussi.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOuvert(false)}>Annuler</Button>
          <Button variant="contained" onClick={creer}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(erreur)}
        autoHideDuration={6000}
        onClose={() => setErreur(null)}
      >
        <Alert severity="error" onClose={() => setErreur(null)}>
          {erreur}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ListeGantt;
