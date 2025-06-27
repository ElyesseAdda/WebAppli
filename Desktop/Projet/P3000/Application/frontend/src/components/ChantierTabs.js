import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

// Composant pour l'affichage du contenu de l'onglet d'un chantier
function ChantierTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`chantier-tabpanel-${index}`}
      aria-labelledby={`chantier-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Fonction pour formater les montants en euros
const formatMontant = (montant) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(montant || 0);
};

// Fonction pour formater les pourcentages
const formatPourcentage = (value) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
};

// Fonction pour déterminer la couleur en fonction de la comparaison
const getComparisonColor = (reel, estime) => {
  if (reel === estime) return "text.secondary";
  if (reel > estime) return "error.main";
  return "success.main";
};

// Composant pour afficher les indicateurs de rentabilité
const RentabiliteIndicators = ({ data }) => {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Marge Brute
            </Typography>
            <Typography
              variant="h5"
              color={getComparisonColor(data.marge_brute, data.marge_estimee)}
            >
              {formatMontant(data.marge_brute)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estimé: {formatMontant(data.marge_estimee)}
            </Typography>
            <Typography
              variant="body2"
              color={getComparisonColor(
                data.taux_marge_brute,
                data.taux_marge_estimee
              )}
            >
              Taux de marge: {formatPourcentage(data.taux_marge_brute)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estimé: {formatPourcentage(data.taux_marge_estimee)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Coût Total
            </Typography>
            <Typography
              variant="h5"
              color={getComparisonColor(
                data.cout_total_reel,
                data.cout_total_estime
              )}
            >
              {formatMontant(data.cout_total_reel)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Estimé: {formatMontant(data.cout_total_estime)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Matériel: {formatMontant(data.cout_materiel)}
            </Typography>
            <Typography
              variant="body2"
              color={getComparisonColor(
                data.cout_materiel,
                data.cout_estime_materiel
              )}
            >
              Estimé: {formatMontant(data.cout_estime_materiel)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Main d'œuvre: {formatMontant(data.cout_main_oeuvre)}
            </Typography>
            <Typography
              variant="body2"
              color={getComparisonColor(
                data.cout_main_oeuvre,
                data.cout_estime_main_oeuvre
              )}
            >
              Estimé: {formatMontant(data.cout_estime_main_oeuvre)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Sous-traitance: {formatMontant(data.cout_sous_traitance)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="subtitle1" gutterBottom>
              Écarts Estimé/Réel
            </Typography>
            <Typography variant="body2">
              Matériel: {formatMontant(data.ecart_materiel)}
            </Typography>
            <Typography variant="body2">
              Main d'œuvre: {formatMontant(data.ecart_main_oeuvre)}
            </Typography>
            <Typography variant="body2">
              Total:{" "}
              {formatMontant(data.ecart_materiel + data.ecart_main_oeuvre)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Composant pour afficher le taux d'occupation des ressources
const ResourcesIndicator = ({ data }) => {
  const chartData = Object.entries(data.taux_occupation_mensuel).map(
    ([month, taux]) => ({
      month: new Date(2024, parseInt(month) - 1).toLocaleString("fr-FR", {
        month: "short",
      }),
      taux,
    })
  );

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Taux d'occupation des équipes
        </Typography>
        <Typography variant="subtitle1" gutterBottom>
          Moyenne: {formatPourcentage(data.moyenne_occupation)}
        </Typography>
        <Box sx={{ height: 300, mt: 2 }}>
          {/* <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => `${value}%`} />
              <Tooltip
                formatter={(value) => [`${value}%`, "Taux d'occupation"]}
              />
              <Bar dataKey="taux" fill="#8884d8" name="Taux d'occupation" />
            </BarChart>
          </ResponsiveContainer> */}
        </Box>
      </CardContent>
    </Card>
  );
};

// Composant pour afficher les paiements clients
const PaiementsSection = ({ data }) => {
  // Vérifier si les données sont définies
  if (!data) {
    return (
      <Typography variant="body1" color="text.secondary">
        Aucune donnée de paiement disponible
      </Typography>
    );
  }

  // Préparer les données pour le graphique des créances par âge
  const creancesData = [
    { name: "< 30 jours", value: data.creances_age?.moins_30_jours || 0 },
    { name: "30-60 jours", value: data.creances_age?.["30_60_jours"] || 0 },
    { name: "60-90 jours", value: data.creances_age?.["60_90_jours"] || 0 },
    { name: "> 90 jours", value: data.creances_age?.plus_90_jours || 0 },
  ];

  // Calculer le total des créances
  const totalCreances = data.total_en_attente || 0;

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Âge des créances
            </Typography>
            <Box sx={{ height: 300 }}>
              {/* <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={creancesData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {creancesData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [formatMontant(value), "Montant"]}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer> */}
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Trésorerie bloquée
            </Typography>
            <Typography variant="h4" color="error">
              {formatMontant(totalCreances)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total des créances en attente
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Nombre de factures en attente: {data.nombre_en_attente || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Nombre de factures en retard: {data.nombre_retardees || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pourcentage de trésorerie bloquée:{" "}
              {formatPourcentage(data.pourcentage_tresorerie_bloquee || 0)}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const ChantierTabs = ({ initialYear }) => {
  const [value, setValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [currentYear, setCurrentYear] = useState(
    initialYear || new Date().getFullYear()
  );
  const [resume, setResume] = useState({
    global_stats: {},
    chantiers: [],
  });

  // Récupérer les statistiques résumées pour tous les chantiers
  useEffect(() => {
    const fetchResumeData = async () => {
      setLoading(true);
      try {
        const response = await axios.get("/api/dashboard/resume/", {
          params: {
            year: currentYear,
          },
        });
        setResume(response.data);
      } catch (error) {
        console.error("Erreur lors du chargement des statistiques:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchResumeData();
  }, [currentYear]);

  useEffect(() => {
    if (initialYear && initialYear !== currentYear) {
      setCurrentYear(initialYear);
    }
  }, [initialYear]);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleYearChange = (event) => {
    setCurrentYear(event.target.value);
  };

  // Ajouter un onglet pour le résumé global
  const tabs = [
    { id: "resume", label: "Résumé Global" },
    ...resume.chantiers.map((chantier) => ({
      id: chantier.id,
      label: chantier.nom,
    })),
  ];

  // Années pour le sélecteur
  const years = Array.from(
    new Array(10),
    (val, index) => new Date().getFullYear() - index
  );

  return (
    <Box sx={{ width: "100%" }}>
      {/* En-tête avec sélecteurs */}
      <Box sx={{ mb: 2, display: "flex", justifyContent: "space-between" }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel id="year-select-label">Année</InputLabel>
          <Select
            labelId="year-select-label"
            id="year-select"
            value={currentYear}
            label="Année"
            onChange={handleYearChange}
          >
            {years.map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <Tabs
          value={value}
          onChange={handleChange}
          variant="scrollable"
          scrollButtons="auto"
          aria-label="onglets des chantiers"
        >
          {tabs.map((tab, index) => (
            <Tab key={tab.id} label={tab.label} id={`chantier-tab-${index}`} />
          ))}
        </Tabs>
      </Box>

      {/* Onglet Résumé Global */}
      <ChantierTabPanel value={value} index={0}>
        <Typography variant="h6" gutterBottom>
          Résumé Global des Chantiers - {currentYear}
        </Typography>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Box>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Chantiers
                    </Typography>
                    <Typography variant="h5">
                      {resume.chantiers.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {resume.global_stats.nombre_chantiers_en_cours || 0} en
                      cours
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Montant Total HT
                    </Typography>
                    <Typography
                      variant="h5"
                      color={getComparisonColor(
                        resume.global_stats.total_montant_ht,
                        resume.global_stats.total_montant_estime_ht
                      )}
                    >
                      {formatMontant(resume.global_stats.total_montant_ht)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Estimé:{" "}
                      {formatMontant(
                        resume.global_stats.total_montant_estime_ht
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Coût Matériel
                    </Typography>
                    <Typography
                      variant="h5"
                      color={getComparisonColor(
                        resume.global_stats.total_cout_materiel,
                        resume.global_stats.total_cout_estime_materiel
                      )}
                    >
                      {formatMontant(resume.global_stats.total_cout_materiel)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Estimé:{" "}
                      {formatMontant(
                        resume.global_stats.total_cout_estime_materiel
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={3}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Coût Main d'œuvre
                    </Typography>
                    <Typography
                      variant="h5"
                      color={getComparisonColor(
                        resume.global_stats.total_cout_main_oeuvre,
                        resume.global_stats.total_cout_estime_main_oeuvre
                      )}
                    >
                      {formatMontant(
                        resume.global_stats.total_cout_main_oeuvre
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Estimé:{" "}
                      {formatMontant(
                        resume.global_stats.total_cout_estime_main_oeuvre
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Section Paiements */}
            <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
              Paiements Clients
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Factures en attente
                    </Typography>
                    <Typography variant="h5">
                      {formatMontant(
                        resume.global_stats.paiements?.total_en_attente || 0
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {resume.global_stats.paiements?.nombre_en_attente || 0}{" "}
                      factures
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="subtitle1" gutterBottom>
                      Factures en retard
                    </Typography>
                    <Typography variant="h5" color="error">
                      {formatMontant(
                        resume.global_stats.paiements?.total_retardees || 0
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {resume.global_stats.paiements?.nombre_retardees || 0}{" "}
                      factures
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </ChantierTabPanel>

      {/* Onglets des chantiers individuels */}
      {resume.chantiers.map((chantier, index) => (
        <ChantierTabPanel key={chantier.id} value={value} index={index + 1}>
          <Typography variant="h6" gutterBottom>
            {chantier.nom}
          </Typography>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              {/* Informations de base */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Informations générales
                      </Typography>
                      <Typography variant="body2">
                        Statut: {chantier.state_chantier}
                      </Typography>
                      <Typography variant="body2">
                        Date de début:{" "}
                        {new Date(chantier.dates.debut).toLocaleDateString()}
                      </Typography>
                      {chantier.dates.fin && (
                        <Typography variant="body2">
                          Date de fin:{" "}
                          {new Date(chantier.dates.fin).toLocaleDateString()}
                        </Typography>
                      )}
                      <Typography variant="body2">
                        Adresse: {chantier.adresse.rue},{" "}
                        {chantier.adresse.ville} {chantier.adresse.code_postal}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Typography variant="subtitle1" gutterBottom>
                        Montants
                      </Typography>
                      <Typography variant="body2">
                        Montant HT: {formatMontant(chantier.montants.ht)}
                      </Typography>
                      <Typography variant="body2">
                        Montant TTC: {formatMontant(chantier.montants.ttc)}
                      </Typography>
                      <Typography
                        variant="body2"
                        color={getComparisonColor(
                          chantier.rentabilite.cout_materiel,
                          chantier.rentabilite.cout_estime_materiel
                        )}
                      >
                        Coût Matériel:{" "}
                        {formatMontant(chantier.rentabilite.cout_materiel)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Estimé:{" "}
                        {formatMontant(
                          chantier.rentabilite.cout_estime_materiel
                        )}
                      </Typography>
                      <Typography
                        variant="body2"
                        color={getComparisonColor(
                          chantier.rentabilite.cout_main_oeuvre,
                          chantier.rentabilite.cout_estime_main_oeuvre
                        )}
                      >
                        Coût Main d'œuvre:{" "}
                        {formatMontant(chantier.rentabilite.cout_main_oeuvre)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Estimé:{" "}
                        {formatMontant(
                          chantier.rentabilite.cout_estime_main_oeuvre
                        )}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Coût Sous-traitance:{" "}
                        {formatMontant(
                          chantier.rentabilite.cout_sous_traitance
                        )}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Indicateurs de rentabilité */}
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Rentabilité
              </Typography>
              <RentabiliteIndicators data={chantier.rentabilite} />

              {/* Taux d'occupation des ressources */}
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Ressources
              </Typography>
              <ResourcesIndicator data={chantier.ressources} />

              {/* Paiements clients */}
              <Typography variant="h6" gutterBottom sx={{ mt: 4 }}>
                Paiements Clients
              </Typography>
              <PaiementsSection data={chantier.paiements} />
            </Box>
          )}
        </ChantierTabPanel>
      ))}
    </Box>
  );
};

export default ChantierTabs;
