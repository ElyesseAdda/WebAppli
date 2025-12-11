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
import React, { useEffect, useState } from "react";
import { FaSync } from "react-icons/fa";
import { useRecapFinancier } from "./RecapFinancierContext";
import RecapSection from "./RecapSection";
import RecapSyntheseSection from "./RecapSyntheseSection";

const CATEGORY_COLORS = {
  materiel: "#0088FE",
  main_oeuvre: "#00C49F",
  sous_traitant: "#FFBB28",
  situation: "#8884d8",
  facture: "#FF8042",
};

const ChantierRecapFinancierTab = ({ chantierId }) => {
  const {
    filters,
    setFilters,
    openAccordions,
    setOpenAccordions,
    periode,
    setPeriode,
    global,
    setGlobal,
  } = useRecapFinancier();

  // State local pour la donnée API et le statut
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
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

  // Récupérer les données API (autres catégories)
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `/api/chantier/${chantierId}/recap-financier/`;
      if (!global) {
        url += `?mois=${periode.mois}&annee=${periode.annee}`;
      }
      const res = await axios.get(url);
      setData(res.data);
      
      // Recharger aussi la main d'oeuvre depuis les mêmes données
      const mainOeuvre = res.data.sorties?.paye?.main_oeuvre || {
        total: 0,
        documents: [],
      };
      setMainOeuvreData(mainOeuvre);
    } catch (err) {
      setError("Erreur lors du chargement des données financières.");
    } finally {
      setLoading(false);
    }
  };

  // Récupérer la main d'oeuvre depuis l'API recap-financier
  useEffect(() => {
    const fetchMainOeuvre = async () => {
      if (!chantierId) {
        setMainOeuvreData({ total: 0, documents: [] });
        return;
      }

      try {
        let url = `/api/chantier/${chantierId}/recap-financier/`;
        if (!global && periode?.mois && periode?.annee) {
          url += `?mois=${periode.mois}&annee=${periode.annee}`;
        }

        const res = await axios.get(url);

        // Extraire la main d'œuvre des données recap-financier
        const mainOeuvre = res.data.sorties?.paye?.main_oeuvre || {
          total: 0,
          documents: [],
        };

        setMainOeuvreData(mainOeuvre);
      } catch (e) {
        setMainOeuvreData({ total: 0, documents: [] });
      }
    };
    fetchMainOeuvre();
  }, [chantierId, periode.mois, periode.annee, global]);

  useEffect(() => {
    if (chantierId) {
      fetchData();
    }
    // eslint-disable-next-line
  }, [chantierId, JSON.stringify(periode), global]);

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
      {/* Section de synthèse financière */}
      <RecapSyntheseSection data={data} />
      <Paper sx={{ p: 2, mb: 3 }}>
        <Box display="flex" alignItems="center" gap={2}>
          <Typography variant="h5" sx={{ flex: 1 }}>
            Récapitulatif Financier du Chantier
          </Typography>
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
            onClick={fetchData}
            color="primary"
            sx={{ ml: 1 }}
            startIcon={<FaSync />}
          >
            Actualiser
          </Button>
        </Box>
      </Paper>
      {loading ? (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={200}
        >
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : data ? (
        <Grid container spacing={3}>
          {/* Sorties */}
          <Grid item xs={12} md={6}>
            <RecapSection
              title={`Dépenses`}
              data={getDepensesData()}
              colors={CATEGORY_COLORS}
              chantierId={chantierId}
              periode={periode}
              refreshRecap={fetchData}
            />
            <RecapSection
              title={`Dépenses restantes`}
              data={data.sorties.reste_a_payer}
              colors={CATEGORY_COLORS}
              chantierId={chantierId}
              periode={periode}
              refreshRecap={fetchData}
            />
          </Grid>
          {/* Entrées */}
          <Grid item xs={12} md={6}>
            <RecapSection
              title={`Paiements reçus`}
              data={data.entrees.paye}
              colors={CATEGORY_COLORS}
              chantierId={chantierId}
              periode={periode}
              refreshRecap={fetchData}
            />
            <RecapSection
              title={`Paiements en attente`}
              data={data.entrees.reste_a_encaisser}
              colors={CATEGORY_COLORS}
              chantierId={chantierId}
              periode={periode}
              refreshRecap={fetchData}
            />
          </Grid>
        </Grid>
      ) : null}
    </Box>
  );
};

export default ChantierRecapFinancierTab;
