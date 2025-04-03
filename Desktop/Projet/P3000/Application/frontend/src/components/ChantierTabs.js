import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
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

// Fonction pour formatter les montants en euros
const formatMontant = (montant) => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(montant || 0);
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
        // Utiliser le nouvel endpoint de résumé
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
    // Met à jour l'année lorsque la prop initialYear change
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

  // Créer un tableau avec les totaux par mois pour l'onglet résumé global
  const getTotalsMensuelsByMonth = () => {
    if (!resume.chantiers || resume.chantiers.length === 0) return [];

    // Initialiser les totaux mensuels
    const totauxMensuels = Array(12)
      .fill()
      .map((_, i) => ({
        month: i + 1,
        monthName: new Date(currentYear, i, 1).toLocaleString("fr-FR", {
          month: "long",
        }),
        cout_materiel: 0,
        cout_main_oeuvre: 0,
        marge_fourniture: 0,
        cout_sous_traitance: 0,
      }));

    // Agréger les données de tous les chantiers
    resume.chantiers.forEach((chantier) => {
      if (!chantier.stats_mensuelles) return;

      // Pour chaque mois, ajouter les valeurs de ce chantier
      for (let i = 1; i <= 12; i++) {
        const monthStats = chantier.stats_mensuelles[i] || {
          cout_materiel: 0,
          cout_main_oeuvre: 0,
          marge_fourniture: 0,
          cout_sous_traitance: 0,
        };

        totauxMensuels[i - 1].cout_materiel += monthStats.cout_materiel;
        totauxMensuels[i - 1].cout_main_oeuvre += monthStats.cout_main_oeuvre;
        totauxMensuels[i - 1].marge_fourniture += monthStats.marge_fourniture;
        totauxMensuels[i - 1].cout_sous_traitance +=
          monthStats.cout_sous_traitance;
      }
    });

    return totauxMensuels;
  };

  // Années pour le sélecteur
  const years = Array.from(
    new Array(10),
    (val, index) => new Date().getFullYear() - index
  );

  return (
    <Box sx={{ width: "100%" }}>
      {/* Sélecteur d'année */}
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
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
            {/* Cartes de résumé global */}
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
                      {resume.global_stats.total_chantiers_en_cours || 0} en
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
                    <Typography variant="h5">
                      {formatMontant(resume.global_stats.total_ht)}
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
                    <Typography variant="h5">
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
                      Marge Fourniture
                    </Typography>
                    <Typography variant="h5">
                      {formatMontant(
                        resume.global_stats.total_marge_fourniture
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Tableau des coûts mensuels globaux */}
            <Typography variant="h6" gutterBottom>
              Détail mensuel global
            </Typography>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Mois</TableCell>
                    <TableCell align="right">Coût Matériel</TableCell>
                    <TableCell align="right">Coût Main d'œuvre</TableCell>
                    <TableCell align="right">Marge Fourniture</TableCell>
                    <TableCell align="right">Coût Sous-traitance</TableCell>
                    <TableCell align="right">Total Dépenses</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {getTotalsMensuelsByMonth().map((monthData) => {
                    const totalDepenses =
                      monthData.cout_materiel +
                      monthData.cout_main_oeuvre +
                      monthData.cout_sous_traitance;

                    return (
                      <TableRow key={monthData.month}>
                        <TableCell component="th" scope="row">
                          {monthData.monthName}
                        </TableCell>
                        <TableCell align="right">
                          {formatMontant(monthData.cout_materiel)}
                        </TableCell>
                        <TableCell align="right">
                          {formatMontant(monthData.cout_main_oeuvre)}
                        </TableCell>
                        <TableCell align="right">
                          {formatMontant(monthData.marge_fourniture)}
                        </TableCell>
                        <TableCell align="right">
                          {formatMontant(monthData.cout_sous_traitance)}
                        </TableCell>
                        <TableCell align="right">
                          {formatMontant(totalDepenses)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </ChantierTabPanel>

      {/* Onglets des chantiers individuels */}
      {resume.chantiers.map((chantier, index) => {
        return (
          <ChantierTabPanel value={value} index={index + 1} key={chantier.id}>
            <Typography variant="h6" gutterBottom>
              {chantier.nom} - Statistiques {currentYear}
            </Typography>

            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box>
                {/* Carte de résumé du chantier */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Informations Générales
                        </Typography>
                        <Typography variant="body2">
                          Démarrage:{" "}
                          {new Date(chantier.date_debut).toLocaleDateString(
                            "fr-FR"
                          )}
                        </Typography>
                        <Typography variant="body2">
                          Fin prévue:{" "}
                          {chantier.date_fin
                            ? new Date(chantier.date_fin).toLocaleDateString(
                                "fr-FR"
                              )
                            : "Non définie"}
                        </Typography>
                        <Typography variant="body2">
                          Statut: {chantier.statut}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Montants Contractuels
                        </Typography>
                        <Typography variant="body2">
                          Montant HT: {formatMontant(chantier.montant_ht)}
                        </Typography>
                        <Typography variant="body2">
                          Montant TTC: {formatMontant(chantier.montant_ttc)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <Card>
                      <CardContent>
                        <Typography variant="subtitle1" gutterBottom>
                          Coûts Annuels
                        </Typography>
                        <Typography variant="body2">
                          Matériel:{" "}
                          {formatMontant(
                            chantier.stats_annuelles.cout_materiel
                          )}
                        </Typography>
                        <Typography variant="body2">
                          Main d'œuvre:{" "}
                          {formatMontant(
                            chantier.stats_annuelles.cout_main_oeuvre
                          )}
                        </Typography>
                        <Typography variant="body2">
                          Marge fourniture:{" "}
                          {formatMontant(
                            chantier.stats_annuelles.marge_fourniture
                          )}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Tableau des coûts mensuels */}
                <Typography variant="h6" gutterBottom>
                  Détail mensuel
                </Typography>
                <TableContainer component={Paper}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Mois</TableCell>
                        <TableCell align="right">Coût Matériel</TableCell>
                        <TableCell align="right">Coût Main d'œuvre</TableCell>
                        <TableCell align="right">Marge Fourniture</TableCell>
                        <TableCell align="right">Coût Sous-traitance</TableCell>
                        <TableCell align="right">Total Dépenses</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(
                        (month) => {
                          const monthName = new Date(
                            currentYear,
                            month - 1,
                            1
                          ).toLocaleString("fr-FR", { month: "long" });
                          const monthData = chantier.stats_mensuelles[
                            month
                          ] || {
                            cout_materiel: 0,
                            cout_main_oeuvre: 0,
                            marge_fourniture: 0,
                            cout_sous_traitance: 0,
                          };

                          const totalDepenses =
                            monthData.cout_materiel +
                            monthData.cout_main_oeuvre +
                            monthData.cout_sous_traitance;

                          return (
                            <TableRow key={month}>
                              <TableCell component="th" scope="row">
                                {monthName}
                              </TableCell>
                              <TableCell align="right">
                                {formatMontant(monthData.cout_materiel)}
                              </TableCell>
                              <TableCell align="right">
                                {formatMontant(monthData.cout_main_oeuvre)}
                              </TableCell>
                              <TableCell align="right">
                                {formatMontant(monthData.marge_fourniture)}
                              </TableCell>
                              <TableCell align="right">
                                {formatMontant(monthData.cout_sous_traitance)}
                              </TableCell>
                              <TableCell align="right">
                                {formatMontant(totalDepenses)}
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Box>
            )}
          </ChantierTabPanel>
        );
      })}
    </Box>
  );
};

export default ChantierTabs;
