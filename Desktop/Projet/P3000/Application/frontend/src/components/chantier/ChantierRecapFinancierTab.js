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
import RecapSection from "./RecapSection";

const CATEGORY_COLORS = {
  materiel: "#0088FE",
  main_oeuvre: "#00C49F",
  sous_traitant: "#FFBB28",
  situation: "#8884d8",
  facture: "#FF8042",
};

const ChantierRecapFinancierTab = ({ chantierId }) => {
  const [periode, setPeriode] = useState({
    mois: new Date().getMonth() + 1,
    annee: new Date().getFullYear(),
  });
  const [global, setGlobal] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  // Récupérer les données API
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
    } catch (err) {
      setError("Erreur lors du chargement des données financières.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chantierId) {
      fetchData();
    }
    // eslint-disable-next-line
  }, [chantierId, periode, global]);

  // Gestion du changement de période
  const handleMoisChange = (e) => {
    setPeriode((prev) => ({ ...prev, mois: Number(e.target.value) }));
    setGlobal(false);
  };
  const handleAnneeChange = (e) => {
    setPeriode((prev) => ({ ...prev, annee: Number(e.target.value) }));
    setGlobal(false);
  };
  const handleGlobal = () => {
    setGlobal(true);
  };

  return (
    <Box sx={{ p: 2 }}>
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
            Tout le chantier
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
              title={`Sorties - Payé`}
              data={data.sorties.paye}
              colors={CATEGORY_COLORS}
            />
            <RecapSection
              title={`Sorties - Reste à payer`}
              data={data.sorties.reste_a_payer}
              colors={CATEGORY_COLORS}
            />
          </Grid>
          {/* Entrées */}
          <Grid item xs={12} md={6}>
            <RecapSection
              title={`Entrées - Payé`}
              data={data.entrees.paye}
              colors={CATEGORY_COLORS}
            />
            <RecapSection
              title={`Entrées - Reste à encaisser`}
              data={data.entrees.reste_a_encaisser}
              colors={CATEGORY_COLORS}
            />
          </Grid>
        </Grid>
      ) : null}
    </Box>
  );
};

export default ChantierRecapFinancierTab;
