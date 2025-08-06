import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

const DateEnvoiModal = ({ open, onClose, situation, onSubmit }) => {
  const [dateEnvoi, setDateEnvoi] = useState("");
  const [delaiPaiement, setDelaiPaiement] = useState(45);

  useEffect(() => {
    if (situation) {
      setDateEnvoi(situation.date_envoi || "");
      setDelaiPaiement(situation.delai_paiement || 45);
    }
  }, [situation]);

  const handleSubmit = () => {
    onSubmit(situation.id, {
      dateEnvoi,
      delaiPaiement,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Date d'envoi et délai de paiement</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <TextField
            type="date"
            label="Date d'envoi"
            value={dateEnvoi}
            onChange={(e) => setDateEnvoi(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <Select
            value={delaiPaiement}
            onChange={(e) => setDelaiPaiement(e.target.value)}
            fullWidth
            label="Délai de paiement"
          >
            <MenuItem value={45}>45 jours</MenuItem>
            <MenuItem value={60}>60 jours</MenuItem>
          </Select>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained">
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const PaiementModal = ({ open, onClose, situation, onSubmit }) => {
  const [montantRecu, setMontantRecu] = useState("");
  const [datePaiementReel, setDatePaiementReel] = useState("");

  useEffect(() => {
    if (situation) {
      setMontantRecu(situation.montant_reel_ht || "");
      setDatePaiementReel(situation.date_paiement_reel || "");
    }
  }, [situation]);

  const handleSubmit = () => {
    onSubmit(situation.id, {
      montantRecu,
      datePaiementReel,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Montant reçu et date de paiement</DialogTitle>
      <DialogContent>
        <Box sx={{ p: 2 }}>
          <TextField
            type="number"
            label="Montant reçu HT"
            value={montantRecu}
            onChange={(e) => setMontantRecu(e.target.value)}
            fullWidth
            sx={{ mb: 2 }}
          />
          <TextField
            type="date"
            label="Date de paiement réelle"
            value={datePaiementReel}
            onChange={(e) => setDatePaiementReel(e.target.value)}
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} variant="contained">
          Valider
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const TableauFacturation = () => {
  const [chantiers, setChantiers] = useState([]);
  const [selectedMois, setSelectedMois] = useState("");
  const [selectedAnnee, setSelectedAnnee] = useState("");
  const [allSituations, setAllSituations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDateModal, setOpenDateModal] = useState(false);
  const [selectedSituation, setSelectedSituation] = useState(null);
  const [openPaiementModal, setOpenPaiementModal] = useState(false);
  const [vueGlobale, setVueGlobale] = useState(false);
  const [banques, setBanques] = useState([]);
  const [openBanqueModal, setOpenBanqueModal] = useState(false);
  const [selectedSituationForBanque, setSelectedSituationForBanque] =
    useState(null);
  const [openCreateBanqueModal, setOpenCreateBanqueModal] = useState(false);
  const [newBanqueName, setNewBanqueName] = useState("");

  const commonBodyCellStyle = {
    maxWidth: "100px",
    padding: "6px 8px",
    whiteSpace: "normal",
    wordWrap: "break-word",
    textAlign: "center",
    verticalAlign: "middle",
  };

  const formatNumberWithColor = (value, compareValue) => {
    const number = parseFloat(value) || 0;
    const compare = parseFloat(compareValue) || 0;
    const isDifferent = Math.abs(number - compare) > 0.01;

    let color = "text.primary"; // noir par défaut
    if (number === 0) {
      color = "text.primary";
    } else if (compareValue === undefined || compareValue === null) {
      color = "rgba(27, 120, 188, 1)";
    } else if (isDifferent) {
      color = "error.main";
    } else {
      color = "rgba(27, 120, 188, 1)";
    }

    return (
      <Typography
        sx={{
          color: color,
          fontWeight: 500,
          fontSize: "0.75rem",
          fontFamily: "Roboto, Arial, sans-serif",
          whiteSpace: "nowrap",
        }}
      >
        {number.toFixed(2)} €
      </Typography>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const year = date.getFullYear().toString().slice(-2); // 2 derniers chiffres
    return (
      date.toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: undefined,
      }) +
      "/" +
      year
    );
  };

  // Pour l'affichage mois/année (ex: 04/25)
  const formatMoisAnnee = (mois, annee) => {
    const moisStr = mois.toString().padStart(2, "0");
    const anneeStr = annee.toString().slice(-2);
    return `${moisStr}/${anneeStr}`;
  };

  // Fonction pour obtenir le nom du mois en français
  const getMoisName = (mois) => {
    const moisNames = {
      1: "Janvier",
      2: "Février",
      3: "Mars",
      4: "Avril",
      5: "Mai",
      6: "Juin",
      7: "Juillet",
      8: "Août",
      9: "Septembre",
      10: "Octobre",
      11: "Novembre",
      12: "Décembre",
    };
    return moisNames[mois] || mois.toString().padStart(2, "0");
  };

  // Charger la liste des chantiers et des banques
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [chantiersResponse, banquesResponse] = await Promise.all([
          axios.get("/api/chantier/"),
          axios.get("/api/banques/"),
        ]);
        setChantiers(chantiersResponse.data);
        setBanques(banquesResponse.data);
      } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
      }
    };
    fetchData();
  }, []);

  // Initialiser le mois et l'année actuels
  useEffect(() => {
    const now = new Date();
    setSelectedMois(now.getMonth() + 1);
    setSelectedAnnee(now.getFullYear());
  }, []);

  // Charger toutes les situations pour le mois/année sélectionnés ou vue globale
  useEffect(() => {
    if ((selectedMois && selectedAnnee) || vueGlobale) {
      setLoading(true);
      const fetchAllSituations = async () => {
        try {
          const allSituationsData = [];
          const allSituationsByChantier = {}; // Pour stocker toutes les situations par chantier

          // Récupérer les situations pour chaque chantier
          for (const chantier of chantiers) {
            try {
              const response = await axios.get(
                `/api/chantier/${chantier.id}/situations/`
              );
              const situations = response.data;

              // Stocker toutes les situations du chantier pour le calcul du cumul
              allSituationsByChantier[chantier.id] = situations;

              // Filtrer les situations selon le mode d'affichage
              let filteredSituations;
              if (vueGlobale) {
                // Vue globale : toutes les situations de l'année sélectionnée
                filteredSituations = situations.filter(
                  (situation) => situation.annee === selectedAnnee
                );
              } else {
                // Vue mensuelle : situations du mois/année sélectionnés
                filteredSituations = situations.filter(
                  (situation) =>
                    situation.mois === selectedMois &&
                    situation.annee === selectedAnnee
                );
              }

              // Ajouter le nom du chantier et toutes les situations du chantier à chaque situation
              const situationsWithChantier = filteredSituations.map(
                (situation) => ({
                  ...situation,
                  chantier_name: chantier.chantier_name,
                  chantier_id: chantier.id,
                  allSituationsChantier: situations, // Toutes les situations du chantier
                })
              );

              allSituationsData.push(...situationsWithChantier);
            } catch (error) {
              console.error(
                `Erreur lors du chargement des situations pour le chantier ${chantier.id}:`,
                error
              );
            }
          }

          setAllSituations(allSituationsData);
        } catch (error) {
          console.error("Erreur lors du chargement des situations:", error);
        } finally {
          setLoading(false);
        }
      };

      fetchAllSituations();
    }
  }, [selectedMois, selectedAnnee, chantiers, vueGlobale]);

  const renderTableauFacturation = () => {
    // Fonction helper pour extraire le numéro de situation
    const extractSituationNumber = (numeroSituation) => {
      if (!numeroSituation) return "-";
      const match = numeroSituation.match(/n°(\d+)/);
      return match ? parseInt(match[1]) : numeroSituation;
    };

    // Trier les situations selon le mode d'affichage
    const situationsTriees = [...allSituations].sort((a, b) => {
      if (vueGlobale) {
        // Vue globale : trier par chantier, puis par mois, puis par numéro de situation
        if (a.chantier_name !== b.chantier_name) {
          return a.chantier_name.localeCompare(b.chantier_name);
        }
        if (a.mois !== b.mois) {
          return a.mois - b.mois;
        }
        const numA = extractSituationNumber(a.numero_situation);
        const numB = extractSituationNumber(b.numero_situation);
        return numA - numB;
      } else {
        // Vue mensuelle : trier par chantier puis par numéro de situation
        if (a.chantier_name !== b.chantier_name) {
          return a.chantier_name.localeCompare(b.chantier_name);
        }
        const numA = extractSituationNumber(a.numero_situation);
        const numB = extractSituationNumber(b.numero_situation);
        return numA - numB;
      }
    });

    // Fonction helper pour formater les montants avec la couleur
    const formatMontant = (montant, forceNegative = false, type = null) => {
      const valeur = parseFloat(montant) || 0;
      const isNegatif = forceNegative || valeur < 0 || type === "deduction";
      const couleur = isNegatif ? "error.main" : "rgb(0, 168, 42)";

      return (
        <Typography
          sx={{
            color: couleur,
            fontFamily: "Roboto, Arial, sans-serif",
            fontWeight: 500,
            fontSize: "0.75rem",
            whiteSpace: "nowrap",
          }}
        >
          {isNegatif ? "-" : ""}
          {Math.abs(valeur).toFixed(2)} €
        </Typography>
      );
    };

    const commonCellStyle = {
      color: "white",
      maxWidth: "100px",
      padding: "6px 8px",
      whiteSpace: "normal",
      wordWrap: "break-word",
      textAlign: "center",
      minHeight: "60px",
      verticalAlign: "middle",
    };

    const calculerEcartMois = (situation) => {
      const montantHTSituation =
        parseFloat(situation.montant_apres_retenues) || 0;
      const montantRecuHT = parseFloat(situation.montant_reel_ht) || 0;
      const ecart = montantRecuHT - montantHTSituation;

      if (ecart === 0 || isNaN(ecart)) return "-";

      return formatMontant(ecart);
    };

    const calculerCumulSituationHT = (situation) => {
      // Récupérer toutes les situations du chantier
      const allSituationsChantier = situation.allSituationsChantier || [];

      // Trier les situations par mois/année puis par numéro
      const situationsTriees = [...allSituationsChantier].sort((a, b) => {
        // D'abord par année
        if (a.annee !== b.annee) {
          return a.annee - b.annee;
        }
        // Puis par mois
        if (a.mois !== b.mois) {
          return a.mois - b.mois;
        }
        // Puis par numéro de situation
        const numA = parseInt(a.numero_situation.match(/n°(\d+)/)?.[1] || 0);
        const numB = parseInt(b.numero_situation.match(/n°(\d+)/)?.[1] || 0);
        return numA - numB;
      });

      // Trouver l'index de la situation actuelle dans la liste triée
      const currentIndex = situationsTriees.findIndex(
        (s) => s.id === situation.id
      );

      if (currentIndex === -1) {
        return parseFloat(situation.montant_apres_retenues) || 0;
      }

      // Calculer le cumul jusqu'à la situation actuelle (inclusive)
      return situationsTriees.slice(0, currentIndex + 1).reduce((sum, s) => {
        const montantHT = parseFloat(s.montant_apres_retenues) || 0;
        return sum + montantHT;
      }, 0);
    };

    const calculerTotaux = () => {
      return allSituations.reduce(
        (totaux, situation) => {
          return {
            montantHTSituation:
              totaux.montantHTSituation +
              (parseFloat(situation.montant_apres_retenues) || 0),
            montantRecuHT:
              totaux.montantRecuHT +
              (parseFloat(situation.montant_reel_ht) || 0),
            ecartMois:
              totaux.ecartMois +
              (parseFloat(situation.montant_reel_ht || 0) -
                parseFloat(situation.montant_apres_retenues || 0)),
          };
        },
        {
          montantHTSituation: 0,
          montantRecuHT: 0,
          ecartMois: 0,
        }
      );
    };

    if (vueGlobale) {
      // Vue globale : afficher un seul tableau avec sous-totaux par mois
      const moisAvecSituations = {};

      // Grouper les situations par mois
      situationsTriees.forEach((situation) => {
        const mois = situation.mois;
        if (!moisAvecSituations[mois]) {
          moisAvecSituations[mois] = [];
        }
        moisAvecSituations[mois].push(situation);
      });

      // Trier les mois
      const moisTries = Object.keys(moisAvecSituations).sort(
        (a, b) => parseInt(a) - parseInt(b)
      );

      // Créer une liste avec les situations et les sous-totaux
      const situationsAvecSousTotaux = [];
      moisTries.forEach((mois) => {
        const situationsDuMois = moisAvecSituations[mois];
        situationsAvecSousTotaux.push(...situationsDuMois);

        // Ajouter une ligne de sous-total après chaque mois
        const sousTotalMois = situationsDuMois.reduce((total, situation) => {
          return total + (parseFloat(situation.montant_apres_retenues) || 0);
        }, 0);

        situationsAvecSousTotaux.push({
          isSousTotal: true,
          mois: parseInt(mois),
          sousTotal: sousTotalMois,
        });
      });

      return (
        <>
          <TableContainer
            component={Paper}
            sx={{ maxWidth: "100%", overflowX: "auto" }}
          >
            <Table size="small" sx={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: "rgba(27, 120, 188, 1)",
                    color: "white",
                  }}
                >
                  <TableCell sx={{ ...commonCellStyle }}>Chantier</TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>Banque</TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>Mois</TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    N° Situation
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>N° CP</TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>N° Facture</TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    Montant HT Situation
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    Situation Cumul HT
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    Date d'envoi
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    Date de paiement prévue
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    Montant reçu HT
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    Date de paiement réelle
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    Jours de retard
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>Écart Mois</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {situationsAvecSousTotaux.map((item, index) => {
                  if (item.isSousTotal) {
                    // Ligne de sous-total
                    return (
                      <TableRow
                        key={`sous-total-${item.mois}`}
                        sx={{
                          backgroundColor: "rgba(27, 120, 188, 1)",
                          fontWeight: "bold",
                          "& td": {
                            fontWeight: "bold",
                            color: "white",
                          },
                        }}
                      >
                        <TableCell
                          colSpan={14}
                          sx={{
                            ...commonBodyCellStyle,
                            textAlign: "center",
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: "bold",
                              color: "white",
                              fontSize: "1.1rem",
                            }}
                          >
                            Sous-total {getMoisName(item.mois)} :{" "}
                            <span
                              style={{
                                fontSize: "1rem",
                                fontWeight: "bold",
                                marginLeft: "5px",
                              }}
                            >
                              {(parseFloat(item.sousTotal) || 0).toFixed(2)} €
                            </span>
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  } else {
                    // Ligne de situation normale
                    const situation = item;
                    return (
                      <TableRow
                        key={`${situation.chantier_id}-${situation.id}`}
                        sx={{
                          "&:nth-of-type(odd)": { backgroundColor: "#f5f5f5" },
                          "&:nth-of-type(even)": { backgroundColor: "#ffffff" },
                          "&:hover": { backgroundColor: "#f5f5f5" },
                        }}
                      >
                        <TableCell sx={commonBodyCellStyle}>
                          <Typography
                            sx={{
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              color: situation.banque
                                ? "rgba(27, 120, 188, 1)"
                                : "error.main",
                            }}
                          >
                            {situation.chantier_name}
                          </Typography>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedSituationForBanque(situation);
                              setOpenBanqueModal(true);
                            }}
                            sx={{
                              color: situation.banque
                                ? "rgba(27, 120, 188, 1)"
                                : "rgba(27, 120, 188, 0.6)",
                              fontWeight: "bold",
                              fontSize: "0.75rem",
                              textTransform: "none",
                              minWidth: "auto",
                              padding: "2px 8px",
                              border: situation.banque
                                ? "none"
                                : "1px dashed rgba(27, 120, 188, 0.3)",
                            }}
                          >
                            {situation.banque
                              ? banques.find((b) => b.id === situation.banque)
                                  ?.nom_banque || "Banque inconnue"
                              : ""}
                          </Button>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          {situation.mois.toString().padStart(2, "0")}
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          {extractSituationNumber(situation.numero_situation)}
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <TextField
                            size="small"
                            value={situation.numero_cp || ""}
                            onChange={(e) =>
                              handleNumeroCPChange(situation.id, e.target.value)
                            }
                            placeholder="N° CP"
                            sx={{
                              "& .MuiInputBase-root": {
                                fontSize: "0.75rem",
                                height: "32px",
                              },
                              "& .MuiInputBase-input": {
                                padding: "4px 8px",
                                textAlign: "center",
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          {situation.numero_situation || "-"}
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          {formatMontant(
                            parseFloat(situation.montant_apres_retenues) || 0
                          )}
                        </TableCell>
                        <TableCell
                          sx={{
                            ...commonBodyCellStyle,
                            color: "rgba(27, 120, 188, 1)",
                          }}
                        >
                          {formatNumberWithColor(
                            calculerCumulSituationHT(situation),
                            calculerCumulSituationHT(situation)
                          )}
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedSituation(situation);
                              setOpenDateModal(true);
                            }}
                          >
                            {situation.date_envoi
                              ? formatDate(situation.date_envoi)
                              : "Définir date"}
                          </Button>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          {calculateDatePaiement(
                            situation.date_envoi,
                            situation.delai_paiement
                          )}
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedSituation(situation);
                              setOpenPaiementModal(true);
                            }}
                          >
                            {situation.montant_reel_ht
                              ? formatNumberWithColor(
                                  situation.montant_reel_ht,
                                  situation.montant_apres_retenues
                                )
                              : "Définir paiement"}
                          </Button>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          {situation.date_paiement_reel
                            ? formatDate(situation.date_paiement_reel)
                            : "-"}
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          {calculateRetard(
                            calculateDatePaiement(
                              situation.date_envoi,
                              situation.delai_paiement
                            ),
                            situation.date_paiement_reel
                          )}
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          {calculerEcartMois(situation)}
                        </TableCell>
                      </TableRow>
                    );
                  }
                })}
              </TableBody>
              <TableFooter>
                <TableRow
                  sx={{
                    backgroundColor: "rgba(27, 120, 188, 0.1)",
                    fontWeight: "bold",
                    "& td": {
                      fontWeight: "bold",
                      color: "rgba(27, 120, 188, 1)",
                    },
                  }}
                >
                  <TableCell
                    sx={{
                      textAlign: "center",
                      color: "black",
                      fontSize: "0.8rem",
                    }}
                  >
                    Total Global
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {formatMontant(calculerTotaux().montantHTSituation)}
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {formatMontant(calculerTotaux().montantRecuHT)}
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {formatMontant(calculerTotaux().ecartMois)}
                  </TableCell>
                </TableRow>

                {/* Ligne Reste à payer */}
                <TableRow
                  sx={{
                    backgroundColor: "rgba(255, 193, 7, 0.1)",
                    fontWeight: "bold",
                    "& td": {
                      fontWeight: "bold",
                      color: "rgba(255, 193, 7, 1)",
                    },
                  }}
                >
                  <TableCell sx={commonBodyCellStyle}>
                    <Typography
                      sx={{
                        fontWeight: "bold",
                        color: "rgba(255, 193, 7, 1)",
                        fontSize: "0.9rem",
                      }}
                    >
                      Reste à payer
                    </Typography>
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {formatMontant(
                      calculerTotaux().montantHTSituation -
                        calculerTotaux().montantRecuHT
                    )}
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        </>
      );
    } else {
      // Vue mensuelle : afficher un seul tableau
      return (
        <>
          <TableContainer
            component={Paper}
            sx={{ maxWidth: "100%", overflowX: "auto" }}
          >
            <Table size="small" sx={{ tableLayout: "fixed" }}>
              <TableHead>
                <TableRow
                  sx={{
                    backgroundColor: "rgba(27, 120, 188, 1)",
                    color: "white",
                  }}
                >
                  <TableCell sx={{ ...commonCellStyle }}>Chantier</TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>Banque</TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    N° Situation
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>N° CP</TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>N° Facture</TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    Montant HT Situation
                  </TableCell>

                  <TableCell sx={{ ...commonCellStyle }}>
                    Situation Cumul HT
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    Date d'envoi
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    Date de paiement prévue
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    Montant reçu HT
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    Date de paiement réelle
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>
                    Jours de retard
                  </TableCell>
                  <TableCell sx={{ ...commonCellStyle }}>Écart Mois</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {situationsTriees.map((situation, index) => {
                  return (
                    <TableRow
                      key={`${situation.chantier_id}-${situation.id}`}
                      sx={{
                        "&:nth-of-type(odd)": { backgroundColor: "#f5f5f5" },
                        "&:nth-of-type(even)": { backgroundColor: "#ffffff" },
                        "&:hover": { backgroundColor: "#f5f5f5" },
                      }}
                    >
                      <TableCell sx={commonBodyCellStyle}>
                        <Typography
                          sx={{
                            fontWeight: 600,
                            fontSize: "0.8rem",
                            color: situation.banque
                              ? "rgba(27, 120, 188, 1)"
                              : "error.main",
                          }}
                        >
                          {situation.chantier_name}
                        </Typography>
                      </TableCell>
                      <TableCell sx={commonBodyCellStyle}>
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedSituationForBanque(situation);
                            setOpenBanqueModal(true);
                          }}
                          sx={{
                            color: situation.banque
                              ? "rgba(27, 120, 188, 1)"
                              : "rgba(27, 120, 188, 0.6)",
                            fontWeight: "bold",
                            fontSize: "0.75rem",
                            textTransform: "none",
                            minWidth: "auto",
                            padding: "2px 8px",
                            border: situation.banque
                              ? "none"
                              : "1px dashed rgba(27, 120, 188, 0.3)",
                          }}
                        >
                          {situation.banque
                            ? banques.find((b) => b.id === situation.banque)
                                ?.nom_banque || "Banque inconnue"
                            : ""}
                        </Button>
                      </TableCell>
                      <TableCell sx={commonBodyCellStyle}>
                        {extractSituationNumber(situation.numero_situation)}
                      </TableCell>
                      <TableCell sx={commonBodyCellStyle}>
                        <TextField
                          size="small"
                          value={situation.numero_cp || ""}
                          onChange={(e) =>
                            handleNumeroCPChange(situation.id, e.target.value)
                          }
                          placeholder="N° CP"
                          sx={{
                            "& .MuiInputBase-root": {
                              fontSize: "0.75rem",
                              height: "32px",
                            },
                            "& .MuiInputBase-input": {
                              padding: "4px 8px",
                              textAlign: "center",
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell sx={commonBodyCellStyle}>
                        {situation.numero_situation || "-"}
                      </TableCell>
                      <TableCell sx={commonBodyCellStyle}>
                        {formatMontant(
                          parseFloat(situation.montant_apres_retenues) || 0
                        )}
                      </TableCell>

                      <TableCell
                        sx={{
                          ...commonBodyCellStyle,
                          color: "rgba(27, 120, 188, 1)",
                        }}
                      >
                        {formatNumberWithColor(
                          calculerCumulSituationHT(situation),
                          calculerCumulSituationHT(situation)
                        )}
                      </TableCell>
                      <TableCell sx={commonBodyCellStyle}>
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedSituation(situation);
                            setOpenDateModal(true);
                          }}
                        >
                          {situation.date_envoi
                            ? formatDate(situation.date_envoi)
                            : "Définir date"}
                        </Button>
                      </TableCell>
                      <TableCell sx={commonBodyCellStyle}>
                        {calculateDatePaiement(
                          situation.date_envoi,
                          situation.delai_paiement
                        )}
                      </TableCell>
                      <TableCell sx={commonBodyCellStyle}>
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedSituation(situation);
                            setOpenPaiementModal(true);
                          }}
                        >
                          {situation.montant_reel_ht
                            ? formatNumberWithColor(
                                situation.montant_reel_ht,
                                situation.montant_apres_retenues
                              )
                            : "Définir paiement"}
                        </Button>
                      </TableCell>
                      <TableCell sx={commonBodyCellStyle}>
                        {situation.date_paiement_reel
                          ? formatDate(situation.date_paiement_reel)
                          : "-"}
                      </TableCell>
                      <TableCell sx={commonBodyCellStyle}>
                        {calculateRetard(
                          calculateDatePaiement(
                            situation.date_envoi,
                            situation.delai_paiement
                          ),
                          situation.date_paiement_reel
                        )}
                      </TableCell>
                      <TableCell sx={commonBodyCellStyle}>
                        {calculerEcartMois(situation)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow
                  sx={{
                    backgroundColor: "rgba(27, 120, 188, 0.1)",
                    fontWeight: "bold",
                    "& td": {
                      fontWeight: "bold",
                      color: "rgba(27, 120, 188, 1)",
                    },
                  }}
                >
                  <TableCell
                    sx={{
                      textAlign: "center",
                      color: "black",
                      fontSize: "0.8rem",
                    }}
                  >
                    Total
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {formatMontant(calculerTotaux().montantHTSituation)}
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {formatMontant(calculerTotaux().montantRecuHT)}
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {formatMontant(calculerTotaux().ecartMois)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        </>
      );
    }
  };

  // Ajout des fonctions utilitaires
  const calculateDatePaiement = (dateEnvoi, delai) => {
    if (!dateEnvoi || !delai) return "-";

    try {
      const date = new Date(dateEnvoi);
      if (isNaN(date.getTime())) return "-";

      date.setDate(date.getDate() + parseInt(delai));
      return formatDate(date);
    } catch (error) {
      console.error("Erreur dans le calcul de la date de paiement:", error);
      return "-";
    }
  };

  const calculateRetard = (datePrevue, dateReelle) => {
    if (!datePrevue || !dateReelle || datePrevue === "-") {
      return "-";
    }

    try {
      // Convertir les dates en objets Date
      let datePrevueObj, dateReelleObj;

      // Traiter la date prévue (format DD/MM/YY)
      if (datePrevue.includes("/")) {
        const [jour, mois, annee] = datePrevue.split("/");
        const anneeComplete = annee.length === 2 ? `20${annee}` : annee;
        datePrevueObj = new Date(anneeComplete, mois - 1, jour);
      } else {
        datePrevueObj = new Date(datePrevue);
      }

      // Traiter la date réelle (format YYYY-MM-DD)
      dateReelleObj = new Date(dateReelle);

      // Vérifier que les dates sont valides
      if (isNaN(datePrevueObj.getTime()) || isNaN(dateReelleObj.getTime())) {
        return "-";
      }

      // Calculer la différence en millisecondes
      const differenceMs = dateReelleObj.getTime() - datePrevueObj.getTime();

      // Convertir en jours
      const differenceJours = Math.ceil(differenceMs / (1000 * 60 * 60 * 24));

      if (differenceJours > 0) {
        return `${differenceJours} jours de retard`;
      } else if (differenceJours < 0) {
        return `${Math.abs(differenceJours)} jours d'avance`;
      } else {
        return "À jour";
      }
    } catch (error) {
      console.error("Erreur dans le calcul du retard:", error);
      return "-";
    }
  };

  // Handlers pour les mises à jour
  const handleDateModalSubmit = async (
    situationId,
    { dateEnvoi, delaiPaiement }
  ) => {
    try {
      // Mettre à jour directement via l'API
      await axios.patch(`/api/situations/${situationId}/update/`, {
        date_envoi: dateEnvoi,
        delai_paiement: delaiPaiement,
      });

      // Mettre à jour l'état local
      setAllSituations((prev) =>
        prev.map((s) =>
          s.id === situationId
            ? { ...s, date_envoi: dateEnvoi, delai_paiement: delaiPaiement }
            : s
        )
      );
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      alert("Erreur lors de la mise à jour des données");
    }
  };

  const handlePaiementModalSubmit = async (
    situationId,
    { montantRecu, datePaiementReel }
  ) => {
    try {
      // Mettre à jour directement via l'API
      await axios.patch(`/api/situations/${situationId}/update/`, {
        montant_reel_ht: montantRecu,
        date_paiement_reel: datePaiementReel,
      });

      // Mettre à jour l'état local
      setAllSituations((prev) =>
        prev.map((s) =>
          s.id === situationId
            ? {
                ...s,
                montant_reel_ht: montantRecu,
                date_paiement_reel: datePaiementReel,
              }
            : s
        )
      );
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      alert("Erreur lors de la mise à jour des données");
    }
  };

  const handleNumeroCPChange = async (situationId, numeroCP) => {
    try {
      // Mettre à jour directement via l'API
      await axios.patch(`/api/situations/${situationId}/update/`, {
        numero_cp: numeroCP,
      });

      // Mettre à jour l'état local
      setAllSituations((prev) =>
        prev.map((s) =>
          s.id === situationId
            ? {
                ...s,
                numero_cp: numeroCP,
              }
            : s
        )
      );
    } catch (error) {
      console.error("Erreur lors de la mise à jour du numéro CP:", error);
      alert("Erreur lors de la mise à jour du numéro CP");
    }
  };

  const handleBanqueChange = async (situationId, banqueId) => {
    try {
      // Mettre à jour directement via l'API
      await axios.patch(`/api/situations/${situationId}/update/`, {
        banque: banqueId,
      });

      // Mettre à jour l'état local
      setAllSituations((prev) =>
        prev.map((s) =>
          s.id === situationId
            ? {
                ...s,
                banque: banqueId,
              }
            : s
        )
      );

      setOpenBanqueModal(false);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la banque:", error);
      alert("Erreur lors de la mise à jour de la banque");
    }
  };

  const handleCreateBanque = async () => {
    if (!newBanqueName.trim()) {
      alert("Le nom de la banque ne peut pas être vide");
      return;
    }

    try {
      const response = await axios.post("/api/banques/", {
        nom_banque: newBanqueName.trim(),
      });

      // Ajouter la nouvelle banque à la liste
      setBanques((prev) => [...prev, response.data]);

      // Fermer le modal et réinitialiser le nom
      setOpenCreateBanqueModal(false);
      setNewBanqueName("");

      alert("Banque créée avec succès !");
    } catch (error) {
      console.error("Erreur lors de la création de la banque:", error);
      alert("Erreur lors de la création de la banque");
    }
  };

  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            fontFamily: "Merriweather, serif",
            color: "white",
            fontWeight: "bold",
          }}
        >
          TABLEAU FACTURATION{" "}
          {vueGlobale
            ? `Année ${selectedAnnee}`
            : formatMoisAnnee(selectedMois, selectedAnnee)}
        </Typography>

        {/* Sélecteurs de mois et année */}
        <Box sx={{ display: "flex", gap: 2, mb: 2, alignItems: "center" }}>
          {!vueGlobale && (
            <Select
              value={selectedMois}
              onChange={(e) => setSelectedMois(e.target.value)}
              variant="standard"
              sx={{
                minWidth: 120,
                color: "rgba(27, 120, 188, 1)",
                backgroundColor: "white",
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((mois) => (
                <MenuItem key={mois} value={mois}>
                  {mois.toString().padStart(2, "0")}
                </MenuItem>
              ))}
            </Select>
          )}

          <Select
            value={selectedAnnee}
            onChange={(e) => setSelectedAnnee(e.target.value)}
            variant="standard"
            sx={{
              minWidth: 120,
              color: "rgba(27, 120, 188, 1)",
              backgroundColor: "white",
            }}
          >
            {Array.from(
              { length: 5 },
              (_, i) => new Date().getFullYear() - 2 + i
            ).map((annee) => (
              <MenuItem key={annee} value={annee}>
                {annee}
              </MenuItem>
            ))}
          </Select>

          {/* Bouton Vue Globale */}
          <Button
            variant={vueGlobale ? "contained" : "outlined"}
            onClick={() => setVueGlobale(!vueGlobale)}
            sx={{
              ml: 2,
              backgroundColor: vueGlobale ? "rgba(27, 120, 188, 1)" : "white",
              color: vueGlobale ? "white" : "rgba(27, 120, 188, 1)",
              borderColor: "rgba(27, 120, 188, 1)",
              border: "1px solid rgba(27, 120, 188, 1)",
              "&:hover": {
                backgroundColor: vueGlobale
                  ? "rgba(27, 120, 188, 0.8)"
                  : "rgba(27, 120, 188, 0.1)",
              },
            }}
          >
            {vueGlobale ? "Vue Mensuelle" : "Vue Globale"}
          </Button>
        </Box>
      </Box>

      {loading ? (
        <Typography>Chargement...</Typography>
      ) : (
        renderTableauFacturation()
      )}

      <DateEnvoiModal
        open={openDateModal}
        onClose={() => setOpenDateModal(false)}
        situation={selectedSituation}
        onSubmit={handleDateModalSubmit}
      />
      <PaiementModal
        open={openPaiementModal}
        onClose={() => setOpenPaiementModal(false)}
        situation={selectedSituation}
        onSubmit={handlePaiementModalSubmit}
      />

      {/* Modal de sélection de banque */}
      <Dialog open={openBanqueModal} onClose={() => setOpenBanqueModal(false)}>
        <DialogTitle>Sélectionner une banque</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, minWidth: 300 }}>
            {banques.map((banque) => (
              <Button
                key={banque.id}
                fullWidth
                variant="text"
                onClick={() =>
                  handleBanqueChange(selectedSituationForBanque?.id, banque.id)
                }
                sx={{
                  justifyContent: "flex-start",
                  textAlign: "left",
                  mb: 1,
                  p: 2,
                  border: "1px solid #e0e0e0",
                  "&:hover": {
                    backgroundColor: "rgba(27, 120, 188, 0.1)",
                    borderColor: "rgba(27, 120, 188, 1)",
                  },
                }}
              >
                {banque.nom_banque}
              </Button>
            ))}

            {/* Bouton pour créer une nouvelle banque */}
            <Button
              variant="contained"
              onClick={() => {
                setOpenBanqueModal(false);
                setOpenCreateBanqueModal(true);
              }}
              sx={{
                mt: 2,
                p: 1,
                backgroundColor: "rgba(27, 120, 188, 1)",
                color: "white",
                fontSize: "0.8rem",
                minWidth: "auto",
                "&:hover": {
                  backgroundColor: "rgba(27, 120, 188, 0.8)",
                },
              }}
            >
              + Ajouter une nouvelle banque
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBanqueModal(false)}>Annuler</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de création de banque */}
      <Dialog
        open={openCreateBanqueModal}
        onClose={() => setOpenCreateBanqueModal(false)}
      >
        <DialogTitle>Créer une nouvelle banque</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2, minWidth: 300 }}>
            <TextField
              fullWidth
              label="Nom de la banque"
              value={newBanqueName}
              onChange={(e) => setNewBanqueName(e.target.value)}
              sx={{ mb: 2 }}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  handleCreateBanque();
                }
              }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreateBanqueModal(false)}>
            Annuler
          </Button>
          <Button onClick={handleCreateBanque} variant="contained">
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TableauFacturation;
