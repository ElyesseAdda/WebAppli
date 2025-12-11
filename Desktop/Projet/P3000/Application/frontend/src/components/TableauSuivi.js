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
import { useSituationsManager } from "../hooks/useSituationsManager";

const DateEnvoiModal = ({ open, onClose, situation, onSubmit }) => {
  const [dateEnvoi, setDateEnvoi] = useState("");
  const [delaiPaiement, setDelaiPaiement] = useState(45);

  useEffect(() => {
    if (situation) {
      // Si la situation n'a pas de date d'envoi, préremplir avec la date du jour
      const dateAujourdhui = new Date().toISOString().split("T")[0];
      setDateEnvoi(situation.date_envoi || dateAujourdhui);
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
      // Si la situation n'a pas de date de paiement réelle, préremplir avec la date du jour
      const dateAujourdhui = new Date().toISOString().split("T")[0];
      // Préremplir le montant reçu avec montant_reel_ht s'il existe, sinon avec montant_apres_retenues (montant HT situation)
      setMontantRecu(
        situation.montant_reel_ht || situation.montant_apres_retenues || ""
      );
      setDatePaiementReel(situation.date_paiement_reel || dateAujourdhui);
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
  const [devis, setDevis] = useState(null);
  const [avenants, setAvenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDateModal, setOpenDateModal] = useState(false);
  const [selectedSituation, setSelectedSituation] = useState(null);
  const [openPaiementModal, setOpenPaiementModal] = useState(false);

  // Utiliser le hook pour gérer les situations
  const { situations, updateDateEnvoi, updatePaiement } =
    useSituationsManager(selectedChantierId);

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

  // Charger la liste des chantiers
  useEffect(() => {
    const fetchChantiers = async () => {
      try {
        const response = await axios.get("/api/chantier/");
        setChantiers(response.data);

        // Vérifier s'il y a un chantier_id dans l'URL
        const params = new URLSearchParams(window.location.search);
        const chantierIdFromUrl = params.get("chantier_id");

        if (chantierIdFromUrl && response.data.length > 0) {
          // Vérifier si le chantier existe dans la liste
          const chantierExists = response.data.find(
            (c) => c.id.toString() === chantierIdFromUrl
          );
          if (chantierExists) {
            setSelectedChantierId(parseInt(chantierIdFromUrl));
          } else {
            setSelectedChantierId(response.data[0].id); // Fallback au premier chantier
          }
        } else if (response.data.length > 0) {
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

      const loadChantierData = async () => {
        try {
          // D'abord récupérer le chantier et ses devis
          const [chantierRes, devisRes, avenantsRes] = await Promise.all([
            axios.get(`/api/chantier/${selectedChantierId}/`),
            axios.get(`/api/devisa/?chantier=${selectedChantierId}`),
            axios.get(`/api/avenant_chantier/${selectedChantierId}/avenants/`),
          ]);

          setChantier(chantierRes.data);

          // Si il y a des devis, récupérer la structure du premier devis
          if (devisRes.data && devisRes.data.length > 0) {
            const premierDevis = devisRes.data[0];
            setDevis(premierDevis);

            // Récupérer la structure du devis
            try {
              const structureRes = await axios.get(
                `/api/devis-structure/${premierDevis.id}/structure/`
              );
              // Mettre à jour le devis avec la structure
              setDevis({ ...premierDevis, structure: structureRes.data });
            } catch (structureError) {
              console.warn(
                "Erreur lors du chargement de la structure du devis:",
                structureError
              );
              // Continuer même si la structure ne se charge pas
            }
          } else {
            setDevis(null);
          }

          if (avenantsRes.data.success) {
            setAvenants(avenantsRes.data.avenants);
          }
          setLoading(false);
        } catch (error) {
          console.error("Erreur lors du chargement des données:", error);
          setLoading(false);
        }
      };

      loadChantierData();
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
                        situations[0]?.montant_reel_ht
                      )
                    : formatNumberWithColor(
                        avenants[rowIndex - 1]?.montant_total || 0,
                        situations[rowIndex - 1]?.montant_reel_ht
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
                    avenants[rowIndex + 4]?.montant_total || 0,
                    situations[rowIndex + 4]?.montant_reel_ht
                  )}
                </TableCell>
                <TableCell
                  sx={{ borderRight: "1px solid rgba(224, 224, 224, 1)" }}
                >
                  {`AVENANT ${String(rowIndex + 10).padStart(2, "0")}`}
                </TableCell>
                <TableCell>
                  {formatNumberWithColor(
                    avenants[rowIndex + 9]?.montant_total || 0,
                    situations[rowIndex + 9]?.montant_reel_ht
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
      const montantRecuHT = parseFloat(situation.montant_reel_ht) || 0;
      const ecart = montantRecuHT - montantHTSituation;

      if (ecart === 0 || isNaN(ecart)) return "-";

      return formatMontant(ecart);
    };

    const calculerCumulSituationHT = (situations, indexCourant) => {
      return situations.slice(0, indexCourant + 1).reduce((sum, situation) => {
        // Utiliser le montant après retenues (montant_apres_retenues)
        const montantHT = parseFloat(situation.montant_apres_retenues) || 0;
        return sum + montantHT;
      }, 0);
    };

    const calculerCumulMontantRecu = (situations, indexCourant) => {
      return situations.slice(0, indexCourant + 1).reduce((sum, situation) => {
        const montantRecu = parseFloat(situation.montant_reel_ht) || 0;
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
              (parseFloat(situation.montant_reel_ht) || 0),
            ecartMois:
              totaux.ecartMois +
              (parseFloat(situation.montant_reel_ht || 0) -
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
      // Calculer le montant total cumulé avec montant_apres_retenues
      const montantTotalCumulHT = calculerCumulSituationHT(
        situationsTriees,
        situationsTriees.length - 1
      );
      const totalMontantRecuHT = calculerTotaux().montantRecuHT;
      return montantTotalCumulHT - totalMontantRecuHT;
    };

    const calculerPourcentageAvancement = () => {
      // Utiliser le pourcentage d'avancement de la dernière situation au lieu de calculer
      if (situationsTriees.length === 0) return 0;
      
      const derniereSituation = situationsTriees[situationsTriees.length - 1];
      return parseFloat(derniereSituation.pourcentage_avancement) || 0;
    };

    // Fonction pour obtenir toutes les lignes supplémentaires uniques
    const getAllLignesSupplementaires = () => {
      const allLignes = new Map();

      situations.forEach((situation) => {
        situation.lignes_supplementaires?.forEach((ligne) => {
          if (!allLignes.has(ligne.description)) {
            allLignes.set(ligne.description, ligne);
          }
        });
      });

      return Array.from(allLignes.values());
    };

    const lignesSupplementairesUniques = getAllLignesSupplementaires();

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
                <TableCell sx={{ ...commonCellStyle }}>Prorata</TableCell>
                {lignesSupplementairesUniques.map((ligne) => (
                  <TableCell
                    sx={{ ...commonCellStyle }}
                    key={ligne.description}
                  >
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
                    <TableCell sx={commonBodyCellStyle}>
                      {formatMoisAnnee(situation.mois, situation.annee)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="small"
                        onClick={() => {
                          const previewUrl = `/api/preview-situation/${situation.id}/`;
                          window.open(previewUrl, "_blank");
                        }}
                        sx={{
                          color: "rgba(27, 120, 188, 1)",
                          fontWeight: "bold",
                          fontSize: "0.75rem",
                          textTransform: "none",
                          minWidth: "auto",
                          padding: "2px 8px",
                          "&:hover": {
                            backgroundColor: "rgba(27, 120, 188, 0.1)",
                          },
                        }}
                      >
                        {extractSituationNumber(situation.numero_situation)}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {formatMontant(
                        parseFloat(situation.montant_apres_retenues) || 0
                      )}
                    </TableCell>
                    <TableCell>
                      {formatMontant(situation.retenue_garantie, true)}
                    </TableCell>
                    <TableCell>
                      {formatMontant(situation.montant_prorata, true)}
                    </TableCell>
                    {lignesSupplementairesUniques.map((ligneUnique) => {
                      const ligneSituation =
                        situation.lignes_supplementaires?.find(
                          (l) => l.description === ligneUnique.description
                        );
                      return (
                        <TableCell key={ligneUnique.description}>
                          {ligneSituation
                            ? formatMontant(
                                ligneSituation.montant,
                                false,
                                ligneSituation.type
                              )
                            : formatMontant(0, false)}
                        </TableCell>
                      );
                    })}
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
                        {situation.date_envoi
                          ? formatDate(situation.date_envoi)
                          : "Définir date"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {calculateDatePaiement(
                        situation.date_envoi,
                        situation.delai_paiement
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
                        {situation.montant_reel_ht
                          ? formatNumberWithColor(
                              situation.montant_reel_ht,
                              situation.montant_apres_retenues
                            )
                          : "Définir paiement"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {situation.date_paiement_reel
                        ? formatDate(situation.date_paiement_reel)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {calculateRetard(
                        calculateDatePaiement(
                          situation.date_envoi,
                          situation.delai_paiement
                        ),
                        situation.date_paiement_reel
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
                <TableCell>
                  {formatMontant(
                    situations.reduce(
                      (sum, s) => sum + (parseFloat(s.montant_prorata) || 0),
                      0
                    ),
                    true
                  )}
                </TableCell>
                {lignesSupplementairesUniques.map((ligneUnique) => (
                  <TableCell key={ligneUnique.description}>
                    {formatMontant(
                      situations.reduce((sum, s) => {
                        const ligneSup = s.lignes_supplementaires?.find(
                          (l) => l.description === ligneUnique.description
                        );
                        const montant = parseFloat(ligneSup?.montant || 0);
                        return (
                          sum +
                          (ligneSup?.type === "deduction" ? -montant : montant)
                        );
                      }, 0),
                      false,
                      ligneUnique.type
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
  const handleDateEnvoiChange = async (situationId, value) => {
    try {
      await updateDateEnvoi(situationId, value, undefined);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de la date d'envoi:", error);
    }
  };

  const handleDelaiPaiementChange = async (situationId, value) => {
    try {
      await updateDateEnvoi(situationId, undefined, value);
    } catch (error) {
      console.error(
        "Erreur lors de la mise à jour du délai de paiement:",
        error
      );
    }
  };

  const handleMontantReelChange = async (situationId, value) => {
    try {
      await updatePaiement(situationId, value, undefined);
    } catch (error) {
      console.error("Erreur lors de la mise à jour du montant réel:", error);
    }
  };

  const handleDatePaiementReelChange = async (situationId, value) => {
    try {
      await updatePaiement(situationId, undefined, value);
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
    // Comparer avec le montant après retenues (ce qui est facturé)
    return (
      Math.abs(
        parseFloat(situation.montant_apres_retenues) - parseFloat(montantRecu)
      ) > 0.01
    );
  };

  const handleDateModalSubmit = async (
    situationId,
    { dateEnvoi, delaiPaiement }
  ) => {
    try {
      await updateDateEnvoi(situationId, dateEnvoi, delaiPaiement);
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
      await updatePaiement(situationId, montantRecu, datePaiementReel);
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
