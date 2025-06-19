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
      setMontantRecu(situation.montant_recu || "");
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

const TableauSuivi = () => {
  const [chantiers, setChantiers] = useState([]);
  const [selectedChantierId, setSelectedChantierId] = useState("");
  const [chantier, setChantier] = useState(null);
  const [situations, setSituations] = useState([]);
  const [devis, setDevis] = useState(null);
  const [avenants, setAvenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateEnvoi, setDateEnvoi] = useState({});
  const [delaiPaiement, setDelaiPaiement] = useState({});
  const [montantReelHT, setMontantReelHT] = useState({});
  const [datePaiementReel, setDatePaiementReel] = useState({});
  const [openDateModal, setOpenDateModal] = useState(false);
  const [selectedSituation, setSelectedSituation] = useState(null);
  const [openPaiementModal, setOpenPaiementModal] = useState(false);

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
      color = "rgba(27, 120, 188, 1)"; // bleu si pas de valeur de comparaison
    } else if (isDifferent) {
      color = "error.main"; // rouge si différent
    } else {
      color = "rgba(27, 120, 188, 1)"; // bleu si égal et non nul
    }

    return (
      <Typography
        sx={{
          color: color,
          fontWeight: 400,
          fontSize: "0.875rem",
          fontFamily: "Roboto, Arial, sans-serif",
        }}
      >
        {number.toFixed(2)} €
      </Typography>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // Charger la liste des chantiers
  useEffect(() => {
    const fetchChantiers = async () => {
      try {
        const response = await axios.get("/api/chantier/");
        setChantiers(response.data);
        if (response.data.length > 0) {
          setSelectedChantierId(response.data[0].id); // Sélectionner le premier chantier par défaut
        }
      } catch (error) {
        console.error("Erreur lors du chargement des chantiers:", error);
      }
    };
    fetchChantiers();
  }, []);

  // Charger les données du chantier sélectionné
  useEffect(() => {
    if (selectedChantierId) {
      setLoading(true);
      Promise.all([
        axios.get(`/api/chantier/${selectedChantierId}/`),
        axios.get(`/api/chantier/${selectedChantierId}/situations/`),
        axios.get(`/api/devis-structure/${selectedChantierId}/structure/`),
        axios.get(`/api/avenant_chantier/${selectedChantierId}/avenants/`),
      ])
        .then(([chantierRes, situationsRes, devisRes, avenantsRes]) => {
          setChantier(chantierRes.data);
          setSituations(situationsRes.data);

          // Initialiser les dates, délais et montants
          const dateEnvoiInit = {};
          const delaiPaiementInit = {};
          const montantReelHTInit = {};
          const datePaiementReelInit = {};

          situationsRes.data.forEach((situation) => {
            dateEnvoiInit[situation.id] = situation.date_envoi || "";
            delaiPaiementInit[situation.id] = situation.delai_paiement || 45;
            montantReelHTInit[situation.id] = situation.montant_reel_ht || "";
            datePaiementReelInit[situation.id] =
              situation.date_paiement_reel || "";
          });

          setDateEnvoi(dateEnvoiInit);
          setDelaiPaiement(delaiPaiementInit);
          setMontantReelHT(montantReelHTInit);
          setDatePaiementReel(datePaiementReelInit);

          setDevis(devisRes.data);
          if (avenantsRes.data.success) {
            setAvenants(avenantsRes.data.avenants);
          }
          setLoading(false);
        })
        .catch((error) => {
          console.error("Erreur lors du chargement des données:", error);
          setLoading(false);
        });
    }
  }, [selectedChantierId]);

  const renderTableauRappel = () => {
    return (
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table size="small">
          <TableHead>
            <TableRow
              sx={{
                backgroundColor: "rgba(27, 120, 188, 1)",
                color: "white",
                Width: "0px",
                maxWidth: "0px",
              }}
            >
              <TableCell
                sx={{
                  color: "white",
                  width: "0px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  borderRight: "1px solid rgba(224, 224, 224, 1)",
                }}
              >
                N°
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  width: "0px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  borderRight: "2px solid rgba(224, 224, 224, 1)",
                }}
              >
                MONTANT HT
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  width: "0px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  borderRight: "1px solid rgba(224, 224, 224, 1)",
                }}
              >
                N°
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  width: "0px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  borderRight: "2px solid rgba(224, 224, 224, 1)",
                }}
              >
                MONTANT HT
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  width: "0px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  borderRight: "1px solid rgba(224, 224, 224, 1)",
                }}
              >
                N°
              </TableCell>
              <TableCell
                sx={{
                  color: "white",
                  width: "0px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                MONTANT HT
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {[...Array(6)].map((_, rowIndex) => (
              <TableRow key={rowIndex}>
                <TableCell
                  sx={{ borderRight: "1px solid rgba(224, 224, 224, 1)" }}
                >
                  {rowIndex === 0
                    ? "MARCHÉ"
                    : `AVENANT ${String(rowIndex).padStart(2, "0")}`}
                </TableCell>
                <TableCell
                  sx={{ borderRight: "2px solid rgba(224, 224, 224, 1)" }}
                >
                  {rowIndex === 0
                    ? formatNumberWithColor(
                        chantier?.montant_ht,
                        montantReelHT[0]
                      )
                    : formatNumberWithColor(
                        avenants[rowIndex - 1]?.montant_total,
                        montantReelHT[rowIndex - 1]
                      )}
                </TableCell>
                <TableCell
                  sx={{ borderRight: "1px solid rgba(224, 224, 224, 1)" }}
                >
                  {`AVENANT ${String(rowIndex + 5).padStart(2, "0")}`}
                </TableCell>
                <TableCell
                  sx={{ borderRight: "2px solid rgba(224, 224, 224, 1)" }}
                >
                  {formatNumberWithColor(
                    avenants[rowIndex + 4]?.montant_total,
                    montantReelHT[rowIndex + 4]
                  )}
                </TableCell>
                <TableCell
                  sx={{ borderRight: "1px solid rgba(224, 224, 224, 1)" }}
                >
                  {`AVENANT ${String(rowIndex + 10).padStart(2, "0")}`}
                </TableCell>
                <TableCell>
                  {formatNumberWithColor(
                    avenants[rowIndex + 9]?.montant_total,
                    montantReelHT[rowIndex + 9]
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderTableauFacturation = () => {
    // Fonction helper pour extraire le numéro de situation
    const extractSituationNumber = (numeroSituation) => {
      if (!numeroSituation) return "-";
      const match = numeroSituation.match(/n°(\d+)/);
      return match ? parseInt(match[1]) : numeroSituation;
    };

    // Trier les situations par numéro
    const situationsTriees = [...situations].sort((a, b) => {
      const numA = extractSituationNumber(a.numero_situation);
      const numB = extractSituationNumber(b.numero_situation);
      return numA - numB;
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
            fontWeight: 400,
            fontSize: "0.875rem",
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
      // Permettre le retour à la ligne
      whiteSpace: "normal",
      wordWrap: "break-word",
      // Centrer le texte
      textAlign: "center",
      // Hauteur minimale pour assurer la lisibilité
      minHeight: "60px",
      verticalAlign: "middle",
    };

    const calculerEcartMois = (situation) => {
      const montantHTSituation =
        parseFloat(situation.montant_apres_retenues) || 0;
      const montantRecuHT = parseFloat(montantReelHT[situation.id]) || 0;
      const ecart = montantRecuHT - montantHTSituation;

      if (ecart === 0 || isNaN(ecart)) return "-";

      return formatMontant(ecart);
    };

    const calculerCumulSituationHT = (situations, indexCourant) => {
      return situations.slice(0, indexCourant + 1).reduce((sum, situation) => {
        // Utiliser le montant HT situation (montant_apres_retenues)
        const montantHT = parseFloat(situation.montant_apres_retenues) || 0;
        return sum + montantHT;
      }, 0);
    };

    const calculerCumulMontantRecu = (situations, indexCourant) => {
      return situations.slice(0, indexCourant + 1).reduce((sum, situation) => {
        const montantRecu = parseFloat(montantReelHT[situation.id]) || 0;
        return sum + montantRecu;
      }, 0);
    };

    const calculerTotaux = () => {
      return situations.reduce(
        (totaux, situation) => {
          return {
            montantHTSituation:
              totaux.montantHTSituation +
              (parseFloat(situation.montant_apres_retenues) || 0),
            rg: totaux.rg + (parseFloat(situation.retenue_garantie) || 0),
            netAPayer:
              totaux.netAPayer +
              ((parseFloat(situation.montant_apres_retenues) || 0) +
                (parseFloat(situation.tva) || 0)),
            montantRecuHT:
              totaux.montantRecuHT +
              (parseFloat(montantReelHT[situation.id]) || 0),
            ecartMois:
              totaux.ecartMois +
              (parseFloat(montantReelHT[situation.id] || 0) -
                parseFloat(situation.montant_apres_retenues || 0)),
          };
        },
        {
          montantHTSituation: 0,
          rg: 0,
          netAPayer: 0,
          montantRecuHT: 0,
          ecartMois: 0,
        }
      );
    };

    const calculerResteAPayer = () => {
      const montantTotalMarche = calculerMontantTotalMarche();
      const totalMontantRecuHT = calculerTotaux().montantRecuHT;
      return montantTotalMarche - totalMontantRecuHT;
    };

    const calculerPourcentageAvancement = () => {
      const derniereSituation = situationsTriees[situationsTriees.length - 1];
      if (!derniereSituation) return 0;
      return parseFloat(derniereSituation.pourcentage_avancement) || 0;
    };

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
                <TableCell sx={{ ...commonCellStyle }}>Mois</TableCell>
                <TableCell sx={{ ...commonCellStyle }}>N° Situation</TableCell>
                <TableCell sx={{ ...commonCellStyle }}>
                  Montant HT Situation
                </TableCell>
                <TableCell sx={{ ...commonCellStyle }}>RG</TableCell>
                {situations[0]?.lignes_supplementaires?.map((ligne) => (
                  <TableCell sx={{ ...commonCellStyle }} key={ligne.id}>
                    {ligne.description.length > 20
                      ? ligne.description.substring(0, 20) + "..."
                      : ligne.description}
                  </TableCell>
                ))}
                <TableCell sx={{ ...commonCellStyle }}>Net à payer</TableCell>
                <TableCell sx={{ ...commonCellStyle }}>
                  Situation Cumul HT
                </TableCell>
                <TableCell sx={{ ...commonCellStyle }}>Date d'envoi</TableCell>
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
                <TableCell sx={{ ...commonCellStyle }}>
                  Montant cumul HT
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {situationsTriees.map((situation, index) => {
                const cumulHT = situationsTriees
                  .slice(0, index + 1)
                  .reduce(
                    (sum, s) => sum + (parseFloat(s.montant_total) || 0),
                    0
                  );

                return (
                  <TableRow
                    key={situation.id}
                    sx={{
                      "&:nth-of-type(odd)": { backgroundColor: "#f5f5f5" },
                      "&:nth-of-type(even)": { backgroundColor: "#ffffff" },
                      "&:hover": { backgroundColor: "#f5f5f5" },
                    }}
                  >
                    <TableCell
                      sx={commonBodyCellStyle}
                    >{`${situation.mois}/${situation.annee}`}</TableCell>
                    <TableCell>
                      {extractSituationNumber(situation.numero_situation)}
                    </TableCell>
                    <TableCell>
                      {formatMontant(
                        parseFloat(situation.montant_apres_retenues) || 0
                      )}
                    </TableCell>
                    <TableCell>
                      {formatMontant(situation.retenue_garantie, true)}
                    </TableCell>
                    {situation.lignes_supplementaires?.map((ligne) => (
                      <TableCell key={ligne.id}>
                        {formatMontant(ligne.montant, false, ligne.type)}
                      </TableCell>
                    ))}
                    <TableCell>
                      {formatMontant(
                        (parseFloat(situation.montant_apres_retenues) || 0) +
                          (parseFloat(situation.tva) || 0)
                      )}
                    </TableCell>

                    <TableCell sx={{ color: "rgba(27, 120, 188, 1)" }}>
                      {formatNumberWithColor(
                        calculerCumulSituationHT(situationsTriees, index),
                        calculerCumulSituationHT(situationsTriees, index)
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedSituation(situation);
                          setOpenDateModal(true);
                        }}
                      >
                        {dateEnvoi[situation.id]
                          ? formatDate(dateEnvoi[situation.id])
                          : "Définir date"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {calculateDatePaiement(
                        dateEnvoi[situation.id],
                        delaiPaiement[situation.id]
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => {
                          setSelectedSituation(situation);
                          setOpenPaiementModal(true);
                        }}
                      >
                        {montantReelHT[situation.id]
                          ? formatNumberWithColor(
                              montantReelHT[situation.id],
                              situation.montant_apres_retenues
                            )
                          : "Définir paiement"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {datePaiementReel[situation.id]
                        ? formatDate(datePaiementReel[situation.id])
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {calculateRetard(
                        calculateDatePaiement(
                          dateEnvoi[situation.id],
                          delaiPaiement[situation.id]
                        ),
                        datePaiementReel[situation.id]
                      )}
                    </TableCell>
                    <TableCell>{calculerEcartMois(situation)}</TableCell>
                    <TableCell>
                      {formatNumberWithColor(
                        calculerCumulMontantRecu(situationsTriees, index),
                        calculerCumulSituationHT(situationsTriees, index)
                      )}
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
                <TableCell>-</TableCell>
                <TableCell>
                  {formatMontant(calculerTotaux().montantHTSituation)}
                </TableCell>
                <TableCell>
                  {formatMontant(calculerTotaux().rg, true)}
                </TableCell>
                {situations[0]?.lignes_supplementaires?.map((ligne) => (
                  <TableCell key={ligne.id}>
                    {formatMontant(
                      situations.reduce((sum, s) => {
                        const ligneSup = s.lignes_supplementaires.find(
                          (l) => l.description === ligne.description
                        );
                        const montant = parseFloat(ligneSup?.montant || 0);
                        return (
                          sum +
                          (ligneSup?.type === "deduction" ? -montant : montant)
                        );
                      }, 0),
                      false,
                      ligne.type
                    )}
                  </TableCell>
                ))}
                <TableCell>
                  {formatMontant(calculerTotaux().netAPayer)}
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>
                  {formatMontant(calculerTotaux().montantRecuHT)}
                </TableCell>
                <TableCell>-</TableCell>
                <TableCell>-</TableCell>
                <TableCell>
                  {formatMontant(calculerTotaux().ecartMois)}
                </TableCell>
                <TableCell>-</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
        <Box
          sx={{
            mt: 2,
            p: 2,
            backgroundColor: "rgba(27, 120, 188, 0.1)",
            borderRadius: 1,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: "Roboto, Arial, sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                color: "rgba(27, 120, 188, 1)",
                mb: 1,
              }}
            >
              Montant total du marché :{" "}
              {formatMontant(calculerMontantTotalMarche())}
            </Typography>
            <Typography
              sx={{
                fontFamily: "Roboto, Arial, sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                color: "error.main",
              }}
            >
              Pourcentage d'avancement :{" "}
              {calculerPourcentageAvancement().toFixed(2)}%
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center" }}>
            <Typography
              sx={{
                fontFamily: "Roboto, Arial, sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                color: "rgba(27, 120, 188, 1)",
                mr: 2,
              }}
            >
              Reste à payer HT :
            </Typography>
            {formatMontant(calculerResteAPayer())}
          </Box>
        </Box>
      </>
    );
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
    console.log("Dates reçues:", { datePrevue, dateReelle });

    if (!datePrevue || !dateReelle || datePrevue === "-") {
      console.log("Une des dates est invalide ou manquante");
      return "-";
    }

    try {
      // Convertir la date réelle du format YYYY-MM-DD vers DD/MM/YYYY
      const [annee, mois, jour] = dateReelle.split("-");
      const dateReelleFormatted = `${jour}/${mois}/${annee}`;

      // Convertir les dates du format "DD/MM/YYYY"
      const [jourPrevue, moisPrevue, anneePrevue] = datePrevue
        .split("/")
        .map(Number);
      const [jourReelle, moisReelle, anneeReelle] = dateReelleFormatted
        .split("/")
        .map(Number);

      // Vérifier si les conversions sont valides
      if (
        isNaN(jourPrevue) ||
        isNaN(moisPrevue) ||
        isNaN(anneePrevue) ||
        isNaN(jourReelle) ||
        isNaN(moisReelle) ||
        isNaN(anneeReelle)
      ) {
        console.log("Conversion en nombres échouée");
        return "-";
      }

      const joursParMois = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      let totalJours = 0;

      // Différence en années
      const joursAnnees = (anneeReelle - anneePrevue) * 365;
      totalJours += joursAnnees;

      // Différence en mois
      let joursMois = 0;
      if (moisReelle !== moisPrevue) {
        if (moisReelle > moisPrevue) {
          for (let m = moisPrevue; m < moisReelle; m++) {
            joursMois += joursParMois[m - 1];
          }
        }
      }
      totalJours += joursMois;

      // Différence en jours
      const joursJours = jourReelle - jourPrevue;
      totalJours += joursJours;

      if (totalJours > 0) {
        return `${totalJours} jours de retard`;
      } else if (totalJours < 0) {
        return `${Math.abs(totalJours)} jours d'avance`;
      } else {
        return `${totalJours} jours`;
      }
    } catch (error) {
      console.error("Erreur détaillée dans le calcul du retard:", error);
      return "-";
    }
  };

  // Handlers pour les mises à jour
  const handleDateEnvoiChange = async (situationId, value) => {
    try {
      setDateEnvoi((prev) => ({ ...prev, [situationId]: value }));
      await axios.patch(`/api/situations/${situationId}/`, {
        date_envoi: value,
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la date d'envoi:", error);
    }
  };

  const handleDelaiPaiementChange = async (situationId, value) => {
    try {
      setDelaiPaiement((prev) => ({ ...prev, [situationId]: value }));
      await axios.patch(`/api/situations/${situationId}/`, {
        delai_paiement: value,
      });
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour du délai de paiement:",
        error
      );
    }
  };

  const handleMontantReelChange = async (situationId, value) => {
    try {
      setMontantReelHT((prev) => ({ ...prev, [situationId]: value }));
      await axios.patch(`/api/situations/${situationId}/`, {
        montant_reel_ht: value,
      });
    } catch (error) {
      console.error("Erreur lors de la mise à jour du montant réel:", error);
    }
  };

  const handleDatePaiementReelChange = async (situationId, value) => {
    try {
      setDatePaiementReel((prev) => ({ ...prev, [situationId]: value }));
      await axios.patch(`/api/situations/${situationId}/`, {
        date_paiement_reel: value,
      });
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour de la date de paiement réelle:",
        error
      );
    }
  };

  // Vérifier si le montant reçu est différent
  const isMontantDifferent = (situationId, montantRecu) => {
    const situation = situations.find((s) => s.id === situationId);
    if (!situation || !montantRecu) return false;
    return (
      Math.abs(
        parseFloat(situation.montant_total_cumul_ht) - parseFloat(montantRecu)
      ) > 0.01
    );
  };

  const handleDateModalSubmit = async (
    situationId,
    { dateEnvoi, delaiPaiement }
  ) => {
    try {
      await axios.patch(`/api/situations/${situationId}/`, {
        date_envoi: dateEnvoi,
        delai_paiement: delaiPaiement,
      });

      // Mettre à jour les états locaux
      setDateEnvoi((prev) => ({ ...prev, [situationId]: dateEnvoi }));
      setDelaiPaiement((prev) => ({ ...prev, [situationId]: delaiPaiement }));
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
      await axios.patch(`/api/situations/${situationId}/`, {
        montant_reel_ht: montantRecu,
        date_paiement_reel: datePaiementReel,
      });

      setMontantReelHT((prev) => ({ ...prev, [situationId]: montantRecu }));
      setDatePaiementReel((prev) => ({
        ...prev,
        [situationId]: datePaiementReel,
      }));
    } catch (error) {
      console.error("Erreur lors de la mise à jour:", error);
      alert("Erreur lors de la mise à jour des données");
    }
  };

  const calculerMontantTotalMarche = () => {
    // Montant HT du devis initial (marché)
    const montantDevis = parseFloat(chantier?.montant_ht) || 0;

    // Somme des montants HT des avenants
    const montantAvenants = avenants.reduce((sum, avenant) => {
      return sum + (parseFloat(avenant.montant_total) || 0);
    }, 0);

    return montantDevis + montantAvenants;
  };

  const params = new URLSearchParams(window.location.search);
  const chantierId = params.get("chantier_id");

  // Ajouter le sélecteur de chantier en haut du composant
  return (
    <Box sx={{ width: "100%", p: 2 }}>
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h5"
          gutterBottom
          sx={{ fontFamily: "Merriweather, serif", color: "white" }}
        >
          Tableau de suivi
        </Typography>
        <Select
          value={selectedChantierId}
          onChange={(e) => setSelectedChantierId(e.target.value)}
          variant="standard"
          sx={{
            minWidth: 200,
            color: "rgba(27, 120, 188, 1)",
            backgroundColor: "white",
          }}
        >
          {chantiers.map((chantier) => (
            <MenuItem key={chantier.id} value={chantier.id}>
              {chantier.chantier_name}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {loading ? (
        <Typography>Chargement...</Typography>
      ) : (
        <>
          {renderTableauRappel()}
          {renderTableauFacturation()}
        </>
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
    </Box>
  );
};

export default TableauSuivi;
