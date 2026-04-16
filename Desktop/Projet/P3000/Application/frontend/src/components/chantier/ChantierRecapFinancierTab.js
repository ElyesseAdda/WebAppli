import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { FaSync } from "react-icons/fa";
import { useRecapFinancier } from "./RecapFinancierContext";
import RecapSection from "./RecapSection";
import RecapTabsSection from "./RecapTabsSection";
import RecapSyntheseSection from "./RecapSyntheseSection";

const CATEGORY_COLORS = {
  materiel: "#0088FE",
  main_oeuvre: "#00C49F",
  sous_traitant: "#0D9488",
  situation: "#8884d8",
  facture: "#FF8042",
};

const ChantierRecapFinancierTab = ({ chantierId, isActive = true }) => {
  const { periode, setPeriode, global, setGlobal } = useRecapFinancier();

  // State local pour la donnée API et le statut
  const [data, setData] = useState(null);
  const [tauxFacturationData, setTauxFacturationData] = useState(null);
  const [syntheseMensuelle, setSyntheseMensuelle] = useState(null);
  const [syntheseMensuelleLoading, setSyntheseMensuelleLoading] = useState(false);
  /** Incrémenté après un « Actualiser » pour réinitialiser la vue mois dans la synthèse */
  const [syntheseUiResetKey, setSyntheseUiResetKey] = useState(0);
  /** Premier chargement ou changement de chantier : masque le corps du récap */
  const [loading, setLoading] = useState(false);
  /** Changement mois / année / global : mise à jour sans démonter la page */
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Main d'oeuvre Schedule
  const [mainOeuvreData, setMainOeuvreData] = useState({
    total: 0,
    documents: [],
  });

  // Générer les options de mois/année
  const moisOptions = [
    "Janvier",
    "Février",
    "Mars",
    "Avril",
    "Mai",
    "Juin",
    "Juillet",
    "Août",
    "Septembre",
    "Octobre",
    "Novembre",
    "Décembre",
  ];
  const anneeCourante = new Date().getFullYear();
  const anneeOptions = Array.from(
    { length: 5 },
    (_, i) => anneeCourante - 2 + i
  );

  const lastChantierIdRef = useRef(null);

  // Récupérer les données API (récap + taux facturation) — une seule requête récap par rafraîchissement
  const fetchData = useCallback(
    async (opts = {}) => {
      const { background = false } = opts;
      if (!chantierId) return;

      if (background) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        let url = `/api/chantier/${chantierId}/recap-financier/`;
        if (!global) {
          url += `?mois=${periode.mois}&annee=${periode.annee}`;
        }
        const res = await axios.get(url);
        setData(res.data);

        const mainOeuvre = res.data.sorties?.paye?.main_oeuvre || {
          total: 0,
          documents: [],
        };
        setMainOeuvreData(mainOeuvre);

        try {
          const resTaux = await axios.get(
            `/api/chantier/${chantierId}/taux-facturation/`
          );
          setTauxFacturationData(resTaux.data);
        } catch {
          setTauxFacturationData(null);
        }
      } catch (err) {
        setError("Erreur lors du chargement des données financières.");
      } finally {
        if (background) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [chantierId, global, periode.mois, periode.annee]
  );

  const fetchSyntheseMensuelle = useCallback(async () => {
    if (!chantierId) return;
    setSyntheseMensuelleLoading(true);
    try {
      const res = await axios.get(`/api/chantier/${chantierId}/recap-synthese-mensuelle/`);
      setSyntheseMensuelle(res.data);
    } catch {
      setSyntheseMensuelle(null);
    } finally {
      setSyntheseMensuelleLoading(false);
    }
  }, [chantierId]);

  const handleActualiserTout = useCallback(async () => {
    await Promise.all([fetchData({ background: true }), fetchSyntheseMensuelle()]);
    setSyntheseUiResetKey((k) => k + 1);
  }, [fetchData, fetchSyntheseMensuelle]);

  /** Changement de chantier → rechargement complet ; mois/année/global → mise à jour en tâche de fond */
  useEffect(() => {
    if (!chantierId) return;
    const switched = lastChantierIdRef.current !== chantierId;
    if (switched) {
      lastChantierIdRef.current = chantierId;
      setData(null);
      setTauxFacturationData(null);
      setMainOeuvreData({ total: 0, documents: [] });
      setError(null);
      fetchData({ background: false });
      return;
    }
    fetchData({ background: true });
  }, [chantierId, periode.mois, periode.annee, global, fetchData]);

  /** Séries mensuelles pour le graphique de synthèse (indépendant du mois / global du récap) */
  useEffect(() => {
    if (!chantierId) return;
    void fetchSyntheseMensuelle();
  }, [chantierId, fetchSyntheseMensuelle]);

  /** Retour sur l’onglet récap : rafraîchir sans masquer l’UI (évite doublon au 1er montage si isActive déjà true) */
  const prevIsActiveRef = useRef(isActive);
  useEffect(() => {
    if (
      chantierId &&
      isActive &&
      !prevIsActiveRef.current &&
      data != null
    ) {
      fetchData({ background: true });
    }
    prevIsActiveRef.current = isActive;
  }, [chantierId, isActive, data, fetchData]);

  const refreshRecapSilently = useCallback(
    () => fetchData({ background: true }),
    [fetchData]
  );

  // Gestion du changement de période
  const handleMoisChange = (e) => {
    setPeriode({ ...periode, mois: Number(e.target.value) });
    setGlobal(false);
  };
  const handleAnneeChange = (e) => {
    setPeriode({ ...periode, annee: Number(e.target.value) });
    setGlobal(false);
  };
  const handleGlobal = () => {
    setGlobal(!global);
  };

  // Fusionner la main d'oeuvre Schedule avec les autres catégories
  const getDepensesData = () => {
    // On part de la structure existante, mais on remplace main_oeuvre par la version Schedule
    const depenses = data?.sorties?.paye ? { ...data.sorties.paye } : {};
    depenses.main_oeuvre = mainOeuvreData;
    return depenses;
  };

  return (
    <Box sx={{ p: 2 }}>
      <Paper
        sx={{
          px: 1.5,
          pt: 1.35,
          pb: 1,
          mb: 2,
          position: "sticky",
          top: 8,
          // Doit rester sous les overlays/listes de recherche chantier
          zIndex: (theme) => theme.zIndex.appBar - 200,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2.5,
          boxShadow: "0 2px 12px 0 rgba(0,0,0,0.05)",
          backdropFilter: "blur(4px)",
        }}
      >
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Typography
            variant="h6"
            sx={{ flex: 1, minWidth: 200, fontWeight: 700, fontSize: { xs: "1rem", md: "1.08rem" } }}
          >
            Récapitulatif Financier du Chantier
          </Typography>
          {refreshing ? (
            <CircularProgress size={18} thickness={5} aria-label="Mise à jour des données" />
          ) : null}
          <FormControl sx={{ minWidth: 108 }} size="small">
            <InputLabel>Mois</InputLabel>
            <Select
              value={periode.mois}
              label="Mois"
              onChange={handleMoisChange}
              disabled={global}
              sx={{ fontSize: "0.83rem" }}
            >
              {moisOptions.map((mois, idx) => (
                <MenuItem key={mois} value={idx + 1} sx={{ fontSize: "0.83rem" }}>
                  {mois}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 92 }} size="small">
            <InputLabel>Année</InputLabel>
            <Select
              value={periode.annee}
              label="Année"
              onChange={handleAnneeChange}
              disabled={global}
              sx={{ fontSize: "0.83rem" }}
            >
              {anneeOptions.map((annee) => (
                <MenuItem key={annee} value={annee} sx={{ fontSize: "0.83rem" }}>
                  {annee}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant={global ? "contained" : "outlined"}
            color="primary"
            onClick={handleGlobal}
            size="small"
            sx={{ ml: 0.5, minHeight: 34, px: 1.2, fontSize: "0.73rem", fontWeight: 700 }}
          >
            {global ? "Désactiver" : "Global"}
          </Button>
          <Button
            onClick={() => void handleActualiserTout()}
            color="primary"
            size="small"
            sx={{ ml: 0.25, minHeight: 34, px: 1.2, fontSize: "0.73rem", fontWeight: 700 }}
            startIcon={<FaSync />}
            disabled={refreshing}
          >
            Actualiser
          </Button>
        </Box>
      </Paper>
      {loading && !data ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={200}
        >
          <CircularProgress />
        </Box>
      ) : data ? (
        <>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          ) : null}
          <RecapSyntheseSection
            data={data}
            depensesPaye={getDepensesData()}
            tauxFacturation={tauxFacturationData}
            syntheseMensuelle={syntheseMensuelle}
            syntheseMensuelleLoading={syntheseMensuelleLoading}
            syntheseUiResetKey={syntheseUiResetKey}
            chantierId={chantierId}
            onRecapRefresh={refreshRecapSilently}
            global={global}
            periode={periode}
            setGlobal={setGlobal}
            setPeriode={setPeriode}
          />
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  mb: 3,
                  borderRadius: 4,
                  boxShadow: "0 4px 24px 0 rgba(0,0,0,0.06)",
                }}
              >
                <Grid container spacing={3} alignItems="stretch">
                  <Grid item xs={12} xl={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        height: "100%",
                        p: 2,
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.default",
                      }}
                    >
                      <Box
                        sx={{
                          mb: 2,
                          pb: 1,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 800,
                            color: "text.primary",
                            textTransform: "uppercase",
                            letterSpacing: 1.4,
                            fontSize: "0.9rem",
                            lineHeight: 1.2,
                          }}
                        >
                          Dépenses
                        </Typography>
                      </Box>
                      <RecapTabsSection
                        title="Dépenses"
                        hideOuterChrome
                        tabs={[
                          { label: "Payées", data: getDepensesData() },
                          { label: "Restantes", data: data.sorties.reste_a_payer },
                        ]}
                        colors={CATEGORY_COLORS}
                        chantierId={chantierId}
                        periode={periode}
                        refreshRecap={refreshRecapSilently}
                        showDocumentsPane
                      />
                    </Paper>
                  </Grid>
                  <Grid item xs={12} xl={6}>
                    <Paper
                      elevation={0}
                      sx={{
                        height: "100%",
                        p: 2,
                        borderRadius: 3,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                      }}
                    >
                      <Box
                        sx={{
                          mb: 2,
                          pb: 1,
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 800,
                            color: "text.primary",
                            textTransform: "uppercase",
                            letterSpacing: 1.4,
                            fontSize: "0.9rem",
                            lineHeight: 1.2,
                          }}
                        >
                          Paiements
                        </Typography>
                      </Box>
                      <RecapTabsSection
                        title="Paiements"
                        hideOuterChrome
                        tabs={[
                          { label: "Reçus", data: data.entrees.paye },
                          { label: "En attente", data: data.entrees.reste_a_encaisser },
                        ]}
                        colors={CATEGORY_COLORS}
                        chantierId={chantierId}
                        periode={periode}
                        refreshRecap={refreshRecapSilently}
                        showDocumentsPane
                        documentsPaneVariant="paiements"
                      />
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          </Grid>
        </>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : null}
    </Box>
  );
};

export default ChantierRecapFinancierTab;
