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
  Tab,
  Tabs,
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
  /** Onglet principal Dépenses (0) / Paiements (1) dans le bloc commun */
  const [depensesPaiementsTab, setDepensesPaiementsTab] = useState(0);
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
          p: 2,
          mb: 3,
          position: "sticky",
          top: 0,
          zIndex: (theme) => theme.zIndex.appBar - 1,
          bgcolor: "background.paper",
          boxShadow: (theme) => theme.shadows[2],
        }}
      >
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <Typography variant="h5" sx={{ flex: 1, minWidth: 200 }}>
            Récapitulatif Financier du Chantier
          </Typography>
          {refreshing ? (
            <CircularProgress size={22} thickness={5} aria-label="Mise à jour des données" />
          ) : null}
          <FormControl sx={{ minWidth: 120 }} size="small">
            <InputLabel>Mois</InputLabel>
            <Select
              value={periode.mois}
              label="Mois"
              onChange={handleMoisChange}
              disabled={global}
            >
              {moisOptions.map((mois, idx) => (
                <MenuItem key={mois} value={idx + 1}>
                  {mois}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 100 }} size="small">
            <InputLabel>Année</InputLabel>
            <Select
              value={periode.annee}
              label="Année"
              onChange={handleAnneeChange}
              disabled={global}
            >
              {anneeOptions.map((annee) => (
                <MenuItem key={annee} value={annee}>
                  {annee}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant={global ? "contained" : "outlined"}
            color="primary"
            onClick={handleGlobal}
            sx={{ ml: 2 }}
          >
            {global ? "Désactiver" : "Global"}
          </Button>
          <Button
            onClick={() => void handleActualiserTout()}
            color="primary"
            sx={{ ml: 1 }}
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
                <Tabs
                  value={depensesPaiementsTab}
                  onChange={(_, v) => setDepensesPaiementsTab(v)}
                  sx={{
                    mb: 2,
                    borderBottom: 1,
                    borderColor: "divider",
                    minHeight: 42,
                    "& .MuiTab-root": { fontWeight: 700, textTransform: "none" },
                  }}
                >
                  <Tab label="Dépenses" />
                  <Tab label="Paiements" />
                </Tabs>
                <Box
                  sx={{
                    display: depensesPaiementsTab === 0 ? "block" : "none",
                  }}
                  aria-hidden={depensesPaiementsTab !== 0}
                >
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
                </Box>
                <Box
                  sx={{
                    display: depensesPaiementsTab === 1 ? "block" : "none",
                  }}
                  aria-hidden={depensesPaiementsTab !== 1}
                >
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
                </Box>
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
