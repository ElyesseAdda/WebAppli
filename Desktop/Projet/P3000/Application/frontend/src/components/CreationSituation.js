import {
  Box,
  Button,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { FaChevronDown, FaChevronUp, FaTrash } from "react-icons/fa";

const MOIS = [
  { value: 1, label: "Janvier" },
  { value: 2, label: "Février" },
  { value: 3, label: "Mars" },
  { value: 4, label: "Avril" },
  { value: 5, label: "Mai" },
  { value: 6, label: "Juin" },
  { value: 7, label: "Juillet" },
  { value: 8, label: "Août" },
  { value: 9, label: "Septembre" },
  { value: 10, label: "Octobre" },
  { value: 11, label: "Novembre" },
  { value: 12, label: "Décembre" },
];

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxHeight: "90vh",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  overflow: "auto",
};

// Composant pour une ligne de partie
const PartieRow = ({ partie, handlePourcentageChange }) => {
  const [open, setOpen] = useState(false);

  // Calculer le pourcentage moyen et le montant de la partie directement
  let moyennePartie = 0;
  let montantPartie = 0;

  if (partie.sous_parties.length > 0) {
    let totalPourcentage = 0;
    partie.sous_parties.forEach((sousPartie) => {
      if (sousPartie.lignes.length > 0) {
        const pourcentageSousPartie =
          sousPartie.lignes.reduce(
            (acc, ligne) => acc + (ligne.pourcentage_actuel || 0),
            0
          ) / sousPartie.lignes.length;
        totalPourcentage += pourcentageSousPartie;

        montantPartie += sousPartie.lignes.reduce(
          (acc, ligne) =>
            acc + (ligne.total_ht * (ligne.pourcentage_actuel || 0)) / 100,
          0
        );
      }
    });
    moyennePartie = totalPourcentage / partie.sous_parties.length;
  }

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: "rgba(27, 120, 188, 1)",
          "& td": { color: "white", padding: "8px" },
        }}
      >
        <TableCell>
          <IconButton
            size="small"
            onClick={() => setOpen(!open)}
            sx={{ color: "white" }}
          >
            {open ? <FaChevronUp /> : <FaChevronDown />}
          </IconButton>
        </TableCell>
        <TableCell>{partie.titre}</TableCell>
        <TableCell align="center"></TableCell>
        <TableCell align="center"></TableCell>
        <TableCell align="center"></TableCell>
        <TableCell align="right">{moyennePartie.toFixed(2)}%</TableCell>
        <TableCell align="right">
          {montantPartie.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ padding: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box>
              {partie.sous_parties.map((sousPartie) => (
                <SousPartieTable
                  key={sousPartie.id}
                  sousPartie={sousPartie}
                  handlePourcentageChange={handlePourcentageChange}
                />
              ))}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

// Composant pour une sous-partie
const SousPartieTable = ({ sousPartie, handlePourcentageChange }) => {
  const [open, setOpen] = useState(false);

  // Calculer le pourcentage moyen et le montant de la sous-partie directement
  let moyenneSousPartie = 0;
  let montantSousPartie = 0;

  if (sousPartie.lignes.length > 0) {
    moyenneSousPartie =
      sousPartie.lignes.reduce(
        (acc, ligne) => acc + (ligne.pourcentage_actuel || 0),
        0
      ) / sousPartie.lignes.length;

    montantSousPartie = sousPartie.lignes.reduce(
      (acc, ligne) =>
        acc + (ligne.total_ht * (ligne.pourcentage_actuel || 0)) / 100,
      0
    );
  }

  const getComparisonColor = (current, previous) => {
    if (current < previous) return "error.main"; // Rouge
    if (current > previous) return "rgb(0, 223, 56)"; // Vert personnalisé
    return "text.primary"; // Noir
  };

  return (
    <Box>
      <Table>
        <TableBody>
          <TableRow
            sx={{
              backgroundColor: "rgb(157, 197, 226)",
              "& td": { padding: "8px" },
            }}
          >
            <TableCell>
              <IconButton size="small" onClick={() => setOpen(!open)}>
                {open ? <FaChevronUp /> : <FaChevronDown />}
              </IconButton>
            </TableCell>
            <TableCell>{sousPartie.description}</TableCell>
            <TableCell align="right"></TableCell>
            <TableCell align="right"></TableCell>
            <TableCell align="right"></TableCell>
            <TableCell align="right">{moyenneSousPartie.toFixed(2)}%</TableCell>
            <TableCell align="right">
              {montantSousPartie
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
              €
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <Table>
          <TableBody>
            {sousPartie.lignes.map((ligne, index) => (
              <TableRow
                key={ligne.id}
                sx={{
                  backgroundColor:
                    index % 2 === 0 ? "white" : "rgba(0, 0, 0, 0.05)",
                  "& td": { padding: "8px" },
                }}
              >
                <TableCell></TableCell>
                <TableCell>{ligne.description}</TableCell>
                <TableCell align="right">{ligne.quantite}</TableCell>
                <TableCell align="right">{ligne.prix_unitaire} €</TableCell>
                <TableCell align="right">{ligne.total_ht} €</TableCell>
                <TableCell align="right">
                  <TextField
                    type="number"
                    value={ligne.pourcentage_actuel || 0}
                    onChange={(e) =>
                      handlePourcentageChange(ligne.id, e.target.value)
                    }
                    onFocus={(e) => e.target.select()}
                    InputProps={{
                      inputProps: {
                        min: 0,
                        max: 100,
                        step: "any",
                      },
                    }}
                    size="small"
                    sx={{
                      width: "100px",
                      "& input": {
                        textAlign: "right",
                        color: getComparisonColor(
                          ligne.pourcentage_actuel || 0,
                          ligne.pourcentage_precedent || 0
                        ),
                      },
                    }}
                  />
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    color: getComparisonColor(
                      ligne.pourcentage_actuel || 0,
                      ligne.pourcentage_precedent || 0
                    ),
                    fontWeight: "bold",
                  }}
                >
                  {((ligne.total_ht * (ligne.pourcentage_actuel || 0)) / 100)
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                  €
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Collapse>
    </Box>
  );
};

// Composant pour une sous-partie Avenant
const AvenantSousPartieTable = ({ avenant, handlePourcentageChange }) => {
  const [open, setOpen] = useState(false);

  // Calculer le pourcentage moyen et le montant de l'avenant
  let moyenneSousPartie = 0;
  let montantSousPartie = 0;

  if (avenant.factures_ts && avenant.factures_ts.length > 0) {
    moyenneSousPartie =
      avenant.factures_ts.reduce(
        (acc, ts) => acc + (ts.pourcentage_actuel || 0),
        0
      ) / avenant.factures_ts.length;

    montantSousPartie = avenant.factures_ts.reduce(
      (acc, ts) => acc + (ts.montant_ht * (ts.pourcentage_actuel || 0)) / 100,
      0
    );
  }

  const getComparisonColor = (current, previous) => {
    if (current < previous) return "error.main"; // Rouge
    if (current > previous) return "rgb(0, 223, 56)"; // Vert personnalisé
    return "text.primary"; // Noir
  };

  return (
    <Box>
      <Table>
        <TableBody>
          <TableRow
            sx={{
              backgroundColor: "rgb(157, 197, 226)",
              "& td": { padding: "8px" },
            }}
          >
            <TableCell>
              <IconButton size="small" onClick={() => setOpen(!open)}>
                {open ? <FaChevronUp /> : <FaChevronDown />}
              </IconButton>
            </TableCell>
            <TableCell>Avenant n°{avenant.numero}</TableCell>
            <TableCell align="center"></TableCell>
            <TableCell align="center"></TableCell>
            <TableCell align="right">{avenant.montant_total} €</TableCell>
            <TableCell align="right">{moyenneSousPartie.toFixed(2)}%</TableCell>
            <TableCell align="right">
              {montantSousPartie
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
              €
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell style={{ padding: 0 }} colSpan={7}>
              <Collapse in={open} timeout="auto" unmountOnExit>
                <Table>
                  <TableBody>
                    {avenant.factures_ts.map((ts, index) => (
                      <TableRow
                        key={ts.id}
                        sx={{
                          backgroundColor:
                            index % 2 === 0 ? "white" : "rgba(0, 0, 0, 0.05)",
                          "& td": { padding: "8px" },
                        }}
                      >
                        <TableCell></TableCell>
                        <TableCell>
                          {ts.devis_numero ||
                            `TS n°${String(ts.numero_ts).padStart(3, "0")}`}
                          {ts.designation}
                        </TableCell>
                        <TableCell align="center"></TableCell>
                        <TableCell align="center"></TableCell>
                        <TableCell align="right">{ts.montant_ht} €</TableCell>
                        <TableCell align="right">
                          <TextField
                            type="number"
                            value={ts.pourcentage_actuel || 0}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              handlePourcentageChange(
                                ts.id,
                                newValue,
                                "avenant"
                              );
                            }}
                            onFocus={(e) => e.target.select()}
                            InputProps={{
                              inputProps: {
                                min: 0,
                                max: 100,
                                step: "any",
                              },
                            }}
                            size="small"
                            sx={{
                              width: "100px",
                              "& input": {
                                textAlign: "right",
                                color: getComparisonColor(
                                  ts.pourcentage_actuel || 0,
                                  ts.pourcentage_precedent || 0
                                ),
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            color: getComparisonColor(
                              ts.pourcentage_actuel || 0,
                              ts.pourcentage_precedent || 0
                            ),
                            fontWeight: "bold",
                          }}
                        >
                          {(
                            (ts.montant_ht * (ts.pourcentage_actuel || 0)) /
                            100
                          )
                            .toFixed(2)
                            .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                          €
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Collapse>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </Box>
  );
};

// Composant pour la partie Avenants
const AvenantsPartieRow = ({ avenants, handlePourcentageChange }) => {
  const [open, setOpen] = useState(false);

  // Calculer le pourcentage moyen et le montant total des avenants
  let moyennePartie = 0;
  let montantPartie = 0;

  if (avenants && avenants.length > 0) {
    let totalPourcentage = 0;
    avenants.forEach((avenant) => {
      if (avenant.factures_ts && avenant.factures_ts.length > 0) {
        const pourcentageAvenant =
          avenant.factures_ts.reduce(
            (acc, ts) => acc + (ts.pourcentage_actuel || 0),
            0
          ) / avenant.factures_ts.length;
        totalPourcentage += pourcentageAvenant;

        montantPartie += avenant.factures_ts.reduce(
          (acc, ts) =>
            acc + (ts.montant_ht * (ts.pourcentage_actuel || 0)) / 100,
          0
        );
      }
    });
    moyennePartie = totalPourcentage / avenants.length;
  }

  return (
    <>
      <TableRow
        sx={{
          backgroundColor: "rgba(27, 120, 188, 1)",
          "& td": { color: "white", padding: "8px" },
        }}
      >
        <TableCell>
          <IconButton
            size="small"
            onClick={() => setOpen(!open)}
            sx={{ color: "white" }}
          >
            {open ? <FaChevronUp /> : <FaChevronDown />}
          </IconButton>
        </TableCell>
        <TableCell>Avenants</TableCell>
        <TableCell align="center"></TableCell>
        <TableCell align="center"></TableCell>
        <TableCell align="right">
          {avenants
            ?.reduce((acc, av) => acc + parseFloat(av.montant_total), 0)
            .toFixed(2)
            .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
          €
        </TableCell>
        <TableCell align="right">{moyennePartie.toFixed(2)}%</TableCell>
        <TableCell align="right">
          {montantPartie.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell style={{ padding: 0 }} colSpan={7}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box>
              {avenants?.map((avenant) => (
                <AvenantSousPartieTable
                  key={avenant.id}
                  avenant={avenant}
                  handlePourcentageChange={handlePourcentageChange}
                />
              ))}
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const CreationSituation = ({ open, onClose, devis, chantier }) => {
  const [structure, setStructure] = useState([]);
  const [mois, setMois] = useState("");
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [commentaire, setCommentaire] = useState("");
  const [selectedChantier, setSelectedChantier] = useState(null);
  const [totalHT, setTotalHT] = useState(0);
  const [totalAvancement, setTotalAvancement] = useState(0);
  const [avenants, setAvenants] = useState([]);
  const [montantTotalAvenants, setMontantTotalAvenants] = useState(0);
  const [tauxProrata, setTauxProrata] = useState(2.5);
  const [montantHTMois, setMontantHTMois] = useState(0);
  const [lastSituation, setLastSituation] = useState(null);
  const [lignesSupplementaires, setLignesSupplementaires] = useState([]);
  const [retenueCIE, setRetenueCIE] = useState(0);
  const [facturesCIE, setFacturesCIE] = useState([]);
  const [calculatedValues, setCalculatedValues] = useState(null);
  const [existingSituation, setExistingSituation] = useState(null);

  useEffect(() => {
    if (devis?.id) {
      axios
        .get(`/api/devis-structure/${devis.id}/structure/`)
        .then((response) => {
          setStructure(response.data);
        })
        .catch((error) => {
          console.error("Erreur lors du chargement de la structure:", error);
          alert("Erreur lors du chargement des données");
        });

      // Charger le chantier si nécessaire
      if (devis.chantier && !chantier) {
        axios
          .get(`/api/chantier/${devis.chantier}/`)
          .then((response) => {
            setSelectedChantier(response.data);
          })
          .catch((error) => {
            console.error("Erreur lors du chargement du chantier:", error);
          });
      }

      // Utiliser price_ht au lieu de montant_ht
      setTotalHT(devis.price_ht || 0);
    }
  }, [devis]);

  // Charger les avenants
  useEffect(() => {
    if (chantier?.id) {
      axios
        .get(`/api/avenant_chantier/${chantier.id}/avenants/`)
        .then((response) => {
          if (response.data.success) {
            setAvenants(response.data.avenants);
          }
        })
        .catch((error) => {
          console.error("Erreur lors du chargement des avenants:", error);
        });
    }
  }, [chantier]);

  // Calculer l'avancement chaque fois que la structure change
  useEffect(() => {
    if (structure.length > 0 && totalHT > 0) {
      let sommeMontantsLignes = 0;
      structure.forEach((partie) => {
        partie.sous_parties.forEach((sousPartie) => {
          sousPartie.lignes.forEach((ligne) => {
            sommeMontantsLignes +=
              (ligne.total_ht * (ligne.pourcentage_actuel || 0)) / 100;
          });
        });
      });

      const pourcentageAvancement = (sommeMontantsLignes / totalHT) * 100;
      setTotalAvancement(pourcentageAvancement);
    }
  }, [structure, totalHT]);

  useEffect(() => {
    if (avenants && Array.isArray(avenants)) {
      const totalAvenants = avenants.reduce(
        (acc, av) => acc + parseFloat(av.montant_total || 0),
        0
      );
      setMontantTotalAvenants(totalAvenants);
    }
  }, [avenants]);

  useEffect(() => {
    if (open && chantier?.id && mois && annee) {
      const fetchSituationData = async () => {
        try {
          console.log("=== Vérification situation existante ===");

          // 1. Vérifier si une situation existe déjà pour ce mois/année
          const response = await axios.get(
            `/api/chantier/${chantier.id}/situations/by-month/`,
            {
              params: { mois, annee },
            }
          );
          const situations = response.data;

          if (situations.length > 0) {
            console.log("Situation existante trouvée pour ce mois");
            const currentSituation = situations[0];
            setExistingSituation(currentSituation);

            // Pré-remplir les champs avec les données existantes
            setTauxProrata(currentSituation.taux_prorata);
            setRetenueCIE(currentSituation.retenue_cie);

            // Mettre à jour la structure avec les pourcentages existants
            const newStructure = structure.map((partie) => ({
              ...partie,
              sous_parties: partie.sous_parties.map((sousPartie) => ({
                ...sousPartie,
                lignes: sousPartie.lignes.map((ligne) => {
                  const situationLigne = currentSituation.lignes.find(
                    (l) => l.ligne_devis === ligne.id
                  );
                  return {
                    ...ligne,
                    pourcentage_precedent: situationLigne
                      ? parseFloat(situationLigne.pourcentage_actuel)
                      : 0,
                    pourcentage_actuel: situationLigne
                      ? parseFloat(situationLigne.pourcentage_actuel)
                      : 0,
                  };
                }),
              })),
            }));
            setStructure(newStructure);

            // Mettre à jour les avenants
            if (avenants.length > 0) {
              const newAvenants = avenants.map((avenant) => ({
                ...avenant,
                factures_ts: (avenant.factures_ts || []).map((ts) => {
                  const situationTs = currentSituation?.lignes_avenant?.find(
                    (l) => l.facture_ts === ts.id
                  );
                  return {
                    ...ts,
                    pourcentage_precedent: situationTs
                      ? parseFloat(situationTs.pourcentage_actuel)
                      : 0,
                    pourcentage_actuel: situationTs
                      ? parseFloat(situationTs.pourcentage_actuel)
                      : 0,
                    montant_ht: parseFloat(ts.montant_ht || 0),
                  };
                }),
              }));

              console.log("Avenants avec pourcentages existants:", newAvenants);
              setAvenants(newAvenants);
            }

            // Mettre à jour les lignes supplémentaires
            if (currentSituation.lignes_supplementaires?.length > 0) {
              setLignesSupplementaires(currentSituation.lignes_supplementaires);
            }
          } else {
            console.log("Pas de situation existante pour ce mois");
            setExistingSituation(null);
            resetSituationData();
          }
        } catch (error) {
          console.error(
            "Erreur lors de la vérification de la situation:",
            error
          );
          setExistingSituation(null);
          resetSituationData();
        }
      };

      fetchSituationData();
    }
  }, [open, chantier, mois, annee]);

  // Fonction pour fusionner les lignes supplémentaires
  const mergeSupplementaryLines = (defaultLines, existingLines) => {
    const mergedLines = [...defaultLines];

    // Ajouter les lignes existantes qui ne sont pas dans les lignes par défaut
    existingLines.forEach((existingLine) => {
      const exists = mergedLines.some(
        (defaultLine) => defaultLine.description === existingLine.description
      );
      if (!exists) {
        mergedLines.push({
          ...existingLine,
          montant: "0.00", // Réinitialiser le montant pour la nouvelle situation
        });
      }
    });

    return mergedLines;
  };

  // Modifier la fonction d'initialisation
  const initializeSituationData = (
    situation,
    isNewSituation = false,
    mergedLignes = null
  ) => {
    setTauxProrata(situation.taux_prorata);
    setLastSituation(situation);

    // Mettre à jour les pourcentages de la structure
    const newStructure = structure.map((partie) => ({
      ...partie,
      sous_parties: partie.sous_parties.map((sousPartie) => ({
        ...sousPartie,
        lignes: sousPartie.lignes.map((ligne) => {
          const situationLigne = situation.situation_lignes.find(
            (l) => l.ligne_devis === ligne.id
          );
          return {
            ...ligne,
            pourcentage_precedent: situationLigne
              ? parseFloat(situationLigne.pourcentage_actuel)
              : 0,
            pourcentage_actuel: isNewSituation
              ? situationLigne
                ? parseFloat(situationLigne.pourcentage_actuel)
                : 0
              : situationLigne
              ? parseFloat(situationLigne.pourcentage_actuel)
              : 0,
          };
        }),
      })),
    }));
    setStructure(newStructure);

    // Mettre à jour les pourcentages des avenants
    if (avenants.length > 0) {
      const newAvenants = avenants.map((avenant) => ({
        ...avenant,
        factures_ts: (avenant.factures_ts || []).map((ts) => {
          const situationTs = situation.situation_lignes_avenants.find(
            (l) => l.facture_ts === ts.id
          );
          return {
            ...ts,
            pourcentage_precedent: situationTs
              ? parseFloat(situationTs.pourcentage_actuel)
              : 0,
            pourcentage_actuel: isNewSituation
              ? situationTs
                ? parseFloat(situationTs.pourcentage_actuel)
                : 0
              : situationTs
              ? parseFloat(situationTs.pourcentage_actuel)
              : 0,
          };
        }),
      }));
      setAvenants(newAvenants);
    }

    // Mettre à jour les lignes supplémentaires
    if (isNewSituation && mergedLignes) {
      setLignesSupplementaires(mergedLignes);
    } else if (
      !isNewSituation &&
      situation.situation_lignes_supplementaires?.length > 0
    ) {
      setLignesSupplementaires(situation.situation_lignes_supplementaires);
    } else {
      setLignesSupplementaires([]);
    }

    // Mettre à jour la retenue CIE
    if (situation.retenue_cie) {
      setRetenueCIE(parseFloat(situation.retenue_cie));
    }
  };

  // Fonction pour réinitialiser les données
  const resetSituationData = () => {
    setTauxProrata(2.5); // Valeur par défaut
    setLastSituation(null);
    setLignesSupplementaires([]);
    setRetenueCIE(0);

    // Réinitialiser la structure avec des pourcentages à 0
    const newStructure = structure.map((partie) => ({
      ...partie,
      sous_parties: partie.sous_parties.map((sousPartie) => ({
        ...sousPartie,
        lignes: sousPartie.lignes.map((ligne) => ({
          ...ligne,
          pourcentage_precedent: 0,
          pourcentage_actuel: 0,
        })),
      })),
    }));
    setStructure(newStructure);
  };

  // Calculer le montant HT du mois à partir des lignes
  useEffect(() => {
    console.log("=== Calcul du montant HT du mois ===");
    let montantActuel = 0;

    // Calculer le montant des lignes standard
    console.log("1. Calcul des lignes standard:");
    structure.forEach((partie) => {
      partie.sous_parties.forEach((sousPartie) => {
        sousPartie.lignes.forEach((ligne) => {
          const montantLigne =
            (parseFloat(ligne.total_ht || 0) *
              parseFloat(ligne.pourcentage_actuel || 0)) /
            100;
          console.log(`   - Ligne: ${ligne.description}`);
          console.log(`     Montant HT: ${ligne.total_ht} €`);
          console.log(`     Pourcentage: ${ligne.pourcentage_actuel}%`);
          console.log(`     Montant calculé: ${montantLigne.toFixed(2)} €`);
          montantActuel += montantLigne;
        });
      });
    });
    console.log(`Sous-total lignes standard: ${montantActuel.toFixed(2)} €`);

    // Ajouter le montant des TS (avenants)
    console.log("\n2. Calcul des avenants:");
    avenants?.forEach((avenant) => {
      console.log(`   Avenant: ${avenant.numero || "Sans numéro"}`);
      avenant.factures_ts?.forEach((ts) => {
        const montantTS =
          (parseFloat(ts.montant_ht || 0) *
            parseFloat(ts.pourcentage_actuel || 0)) /
          100;
        console.log(`     - TS: ${ts.numero_ts || "Sans numéro"}`);
        console.log(`       Montant HT: ${ts.montant_ht} €`);
        console.log(`       Pourcentage: ${ts.pourcentage_actuel}%`);
        console.log(`       Montant calculé: ${montantTS.toFixed(2)} €`);
        montantActuel += montantTS;
      });
    });
    console.log(
      `Montant total actuel (avec avenants): ${montantActuel.toFixed(2)} €`
    );

    // Récupération du montant cumulé précédent
    let montantCumulePrecedent = 0;
    if (lastSituation) {
      console.log(
        `Utilisation de la situation n°${lastSituation.numero_situation}`
      );
      montantCumulePrecedent = parseFloat(lastSituation.montant_ht_mois || 0);
    } else {
      console.log("Première situation - pas de montant cumulé précédent");
    }

    // Le montant HT du mois est la différence entre le montant actuel et le cumul précédent
    const montantHTMois = montantActuel - montantCumulePrecedent;

    console.log({
      numeroSituation: lastSituation?.numero_situation || "Nouvelle",
      montantActuel: montantActuel.toFixed(2),
      montantCumulePrecedent: montantCumulePrecedent.toFixed(2),
      montantHTMois: montantHTMois.toFixed(2),
    });

    setMontantHTMois(montantHTMois);
  }, [structure, avenants, lastSituation]);

  useEffect(() => {
    if (open && chantier?.id && mois && annee) {
      const fetchCIEFactures = async () => {
        try {
          const response = await axios.get(
            `/api/chantier/${chantier.id}/factures-cie/`,
            {
              params: { mois, annee },
            }
          );
          setRetenueCIE(response.data.total);
          setFacturesCIE(response.data.factures);
        } catch (error) {
          console.error("Erreur lors du chargement des factures CIE:", error);
        }
      };
      fetchCIEFactures();
    }
  }, [open, chantier, mois, annee]);

  const getComparisonColor = (current, previous) => {
    if (current < previous) return "error.main"; // Rouge
    if (current > previous) return "rgb(0, 223, 56)"; // Vert personnalisé
    return "text.primary"; // Noir
  };

  const handlePourcentageChange = (ligneId, value, type = "standard") => {
    let newValue = value === "" ? 0 : parseFloat(value);
    newValue = Math.min(Math.max(newValue, 0), 100);

    if (type === "avenant") {
      const newAvenants = avenants.map((avenant) => ({
        ...avenant,
        factures_ts: avenant.factures_ts.map((ts) => {
          if (ts.id === ligneId) {
            const montantCalcule =
              (parseFloat(ts.montant_ht || 0) * newValue) / 100;
            return {
              ...ts,
              pourcentage_actuel: newValue,
              montant: montantCalcule,
            };
          }
          return ts;
        }),
      }));
      console.log("Mise à jour des avenants:", newAvenants);
      setAvenants(newAvenants);
    } else {
      const newStructure = structure.map((partie) => ({
        ...partie,
        sous_parties: partie.sous_parties.map((sousPartie) => ({
          ...sousPartie,
          lignes: sousPartie.lignes.map((ligne) => {
            if (ligne.id === ligneId) {
              return {
                ...ligne,
                pourcentage_actuel: newValue,
              };
            }
            return ligne;
          }),
        })),
      }));
      setStructure(newStructure);
    }
  };

  // Ajouter la fonction pour récupérer le prochain numero_situation
  const getNextNumeroSituation = async (chantierId) => {
    try {
      const response = await axios.get(
        `/api/chantier/${chantierId}/situations/`
      );
      const situations = response.data;

      console.log("Situations existantes:", situations);

      // Si aucune situation, commencer à 1
      if (situations.length === 0) {
        console.log("Première situation -> numero_situation: 1");
        return 1;
      }

      // Trouver le plus grand numero_situation existant
      const maxNumero = Math.max(...situations.map((s) => s.numero_situation));
      const nextNumero = maxNumero + 1;
      console.log(
        `Dernier numero_situation: ${maxNumero}, prochain: ${nextNumero}`
      );

      return nextNumero;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération du numero_situation:",
        error
      );
      throw error;
    }
  };

  // Fonction de calcul existante
  const calculateMontants = () => {
    if (!structure.length) return;

    // Calcul du montant HT du mois
    let montantHtMois = 0;
    structure.forEach((partie) => {
      partie.sous_parties.forEach((sousPartie) => {
        sousPartie.lignes.forEach((ligne) => {
          const montant = parseFloat(ligne.total_ht || 0);
          const pourcentage = parseFloat(ligne.pourcentage_actuel || 0);
          montantHtMois += (montant * pourcentage) / 100;
        });
      });
    });

    const cumulPrecedent = lastSituation?.montant_total_cumul_ht || 0;
    const retenueGarantie = montantHtMois * 0.05;
    const montantProrata = montantHtMois * (parseFloat(tauxProrata) / 100);
    const montantApresRetenues =
      montantHtMois -
      retenueGarantie -
      montantProrata -
      parseFloat(retenueCIE || 0);
    const tva = montantApresRetenues * 0.2;
    const montantTotal = montantHtMois + parseFloat(cumulPrecedent);
    const pourcentageAvancement =
      totalHT > 0 ? (montantTotal / totalHT) * 100 : 0;

    setCalculatedValues({
      montant_ht_mois: montantHtMois.toFixed(2),
      montant_precedent: montantHtMois.toFixed(2),
      cumul_precedent: cumulPrecedent.toFixed(2),
      retenue_garantie: retenueGarantie.toFixed(2),
      montant_prorata: montantProrata.toFixed(2),
      retenue_cie: retenueCIE || "0.00",
      montant_apres_retenues: montantApresRetenues.toFixed(2),
      montant_total: montantTotal.toFixed(2),
      pourcentage_avancement: pourcentageAvancement.toFixed(2),
      tva: tva.toFixed(2),
    });
  };

  // Utiliser useEffect pour recalculer quand les données changent
  useEffect(() => {
    calculateMontants();
  }, [structure, avenants, tauxProrata, retenueCIE, lignesSupplementaires]);

  // Ajouter cette fonction de calcul
  const calculerCumulPrecedent = () => {
    let montantTotal = 0;

    // Calculer le total de toutes les lignes
    structure.forEach((partie) => {
      partie.sous_parties.forEach((sousPartie) => {
        sousPartie.lignes.forEach((ligne) => {
          const montantLigne =
            (ligne.total_ht * (ligne.pourcentage_actuel || 0)) / 100;
          montantTotal += montantLigne;
        });
      });
    });

    // Ajouter le montant des avenants
    avenants?.forEach((avenant) => {
      avenant.factures_ts?.forEach((ts) => {
        const montantTS = (ts.montant_ht * (ts.pourcentage_actuel || 0)) / 100;
        montantTotal += montantTS;
      });
    });

    // Soustraire le montant HT du mois actuel
    const cumulPrecedent = montantTotal - montantHTMois;
    return cumulPrecedent;
  };

  // Fonction de soumission avec gestion des erreurs améliorée
  const handleSubmit = async () => {
    try {
      if (!calculatedValues) {
        throw new Error("Les calculs ne sont pas disponibles");
      }

      // Fonction helper pour formater les nombres
      const formatNumber = (num) => {
        if (num === null || num === undefined) return "0.00";
        return parseFloat(num).toFixed(2);
      };

      const situationData = {
        chantier: chantier.id,
        devis: devis.id,
        mois: parseInt(mois),
        annee: parseInt(annee),
        lignes: structure.flatMap((partie) =>
          partie.sous_parties.flatMap((sousPartie) =>
            sousPartie.lignes.map((ligne) => ({
              ligne_devis: ligne.id,
              description: ligne.description,
              quantite: formatNumber(ligne.quantite),
              prix_unitaire: formatNumber(ligne.prix_unitaire),
              total_ht: formatNumber(ligne.total_ht),
              pourcentage_actuel: formatNumber(ligne.pourcentage_actuel),
              montant: formatNumber(
                (ligne.total_ht * ligne.pourcentage_actuel) / 100
              ),
            }))
          )
        ),
        montant_ht_mois: formatNumber(montantHTMois),
        cumul_precedent: formatNumber(calculerCumulPrecedent()),
        montant_total_cumul_ht: formatNumber(
          calculerCumulPrecedent() + montantHTMois
        ),
        retenue_garantie: formatNumber(montantHTMois * 0.05),
        montant_prorata: formatNumber(montantHTMois * (tauxProrata / 100)),
        retenue_cie: formatNumber(retenueCIE),
        montant_apres_retenues: formatNumber(calculerTotalNet()),
        tva: formatNumber(calculerTotalNet() * 0.2),
        montant_total_ttc: formatNumber(calculerTotalNet() * 1.2),
        pourcentage_avancement: formatNumber(
          ((calculerCumulPrecedent() + montantHTMois) / totalHT) * 100
        ),
        taux_prorata: formatNumber(tauxProrata),
        lignes_supplementaires: lignesSupplementaires.map((ligne) => ({
          description: ligne.description,
          montant: formatNumber(ligne.montant),
          type: ligne.type,
        })),
        lignes_avenant: avenants.flatMap((avenant) =>
          avenant.factures_ts.map((ts) => ({
            facture_ts: ts.id,
            avenant_id: avenant.id,
            montant_ht: formatNumber(ts.montant_ht || 0),
            pourcentage_actuel: formatNumber(ts.pourcentage_actuel || 0),
            montant: formatNumber(
              (ts.montant_ht * (ts.pourcentage_actuel || 0)) / 100
            ),
          }))
        ),
      };

      console.log("Données envoyées:", situationData); // Pour debug

      if (existingSituation) {
        // Mise à jour d'une situation existante
        await axios.put(
          `/api/situations/${existingSituation.id}/update/`,
          situationData
        );
      } else {
        // Création d'une nouvelle situation
        await axios.post("/api/situations/", situationData);
      }

      onClose();
    } catch (error) {
      console.error("Erreur lors de la sauvegarde:", error);
      alert(
        `Erreur lors de la ${existingSituation ? "mise à jour" : "création"}: ${
          error.response?.data?.error || error.message
        }`
      );
    }
  };

  const handleAjoutLigne = () => {
    setLignesSupplementaires([
      ...lignesSupplementaires,
      { description: "", montant: 0, type: "deduction" },
    ]);
  };

  const handleLigneChange = (index, field, value) => {
    const newLignes = [...lignesSupplementaires];
    newLignes[index][field] = value;
    setLignesSupplementaires(newLignes);
  };

  const handleSupprimerLigne = (index) => {
    setLignesSupplementaires(
      lignesSupplementaires.filter((_, i) => i !== index)
    );
  };

  // Calcul du total avec les lignes supplémentaires
  const calculerTotalNet = () => {
    let total = montantHTMois;

    // Retenue de garantie (5%)
    const retenueGarantie = total * 0.05;
    total -= retenueGarantie;

    // Compte prorata
    const compteProrata = total * (tauxProrata / 100);
    total -= compteProrata;

    // Retenue CIE
    total -= parseFloat(retenueCIE);

    // Lignes supplémentaires
    lignesSupplementaires.forEach((ligne) => {
      if (ligne.type === "deduction") {
        total -= parseFloat(ligne.montant);
      } else {
        total += parseFloat(ligne.montant);
      }
    });

    return total;
  };

  const updateCalculs = () => {
    if (!structure.length) return;

    // Calcul du montant total de toutes les lignes
    let montantTotalLignes = 0;
    let montantHtMois = 0;

    structure.forEach((partie) => {
      partie.sous_parties.forEach((sousPartie) => {
        sousPartie.lignes.forEach((ligne) => {
          const montant = parseFloat(ligne.montant || 0);
          const pourcentage = parseFloat(ligne.pourcentage_actuel || 0);
          const montantLigne = (montant * pourcentage) / 100;
          montantTotalLignes += montantLigne;
          montantHtMois += montantLigne;
        });
      });
    });

    // Le cumul des mois précédents est la différence entre le total et le montant du mois
    const cumulPrecedent = montantTotalLignes - montantHtMois;

    const retenueGarantie = montantHtMois * 0.05;
    const montantProrata = montantHtMois * (parseFloat(tauxProrata) / 100);
    const montantApresRetenues =
      montantHtMois -
      retenueGarantie -
      montantProrata -
      parseFloat(retenueCIE || 0);
    const tva = montantApresRetenues * 0.2;
    const montantTotal = montantTotalLignes; // Utiliser le montant total des lignes
    const pourcentageAvancement =
      totalHT > 0 ? (montantTotal / totalHT) * 100 : 0;

    setCalculatedValues({
      montant_ht_mois: montantHtMois.toFixed(2),
      montant_precedent: montantHtMois.toFixed(2),
      cumul_precedent: cumulPrecedent.toFixed(2),
      retenue_garantie: retenueGarantie.toFixed(2),
      montant_prorata: montantProrata.toFixed(2),
      retenue_cie: retenueCIE || "0.00",
      montant_apres_retenues: montantApresRetenues.toFixed(2),
      montant_total: montantTotal.toFixed(2),
      pourcentage_avancement: pourcentageAvancement.toFixed(2),
      tva: tva.toFixed(2),
    });
  };

  // Utiliser useEffect pour recalculer quand les données changent
  useEffect(() => {
    updateCalculs();
  }, [structure, avenants, tauxProrata, retenueCIE, lignesSupplementaires]);

  const renderCalculs = () => {
    if (!calculatedValues) return null;

    return (
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Typography variant="h6">Récapitulatif des montants</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography>
            Montant HT du mois: {calculatedValues.montant_ht_mois} €
          </Typography>
          <Typography>
            Montant précédent: {calculatedValues.montant_precedent} €
          </Typography>
          <Typography>
            Cumul précédent: {calculatedValues.cumul_precedent} €
          </Typography>
          <Typography>
            Retenue de garantie: {calculatedValues.retenue_garantie} €
          </Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography>
            Montant prorata: {calculatedValues.montant_prorata} €
          </Typography>
          <Typography>Retenue CIE: {calculatedValues.retenue_cie} €</Typography>
          <Typography>
            Montant après retenues: {calculatedValues.montant_apres_retenues} €
          </Typography>
          <Typography>TVA: {calculatedValues.tva} €</Typography>
        </Grid>
        <Grid item xs={12}>
          <Typography variant="h6">
            Montant total: {calculatedValues.montant_total} €
          </Typography>
          <Typography>
            Pourcentage d'avancement: {calculatedValues.pourcentage_avancement}{" "}
            %
          </Typography>
        </Grid>
      </Grid>
    );
  };

  if (!open || !devis || !chantier) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {existingSituation
          ? "Modification d'une situation"
          : "Création d'une situation"}
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <Typography variant="h6" component="h2">
            Création d'une situation - {chantier.chantier_name}
          </Typography>
          <Box
            sx={{
              border: "1px solid rgba(0, 0, 0, 0.23)",
              borderRadius: 1,
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              gap: 1,
            }}
          >
            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
              Montant HT:{" "}
              {totalHT.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} €
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
              Montant total des travaux HT:{" "}
              {(totalHT + montantTotalAvenants)
                .toFixed(2)
                .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
              €
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: "bold" }}>
              %Avancement: {totalAvancement.toFixed(2)}%
            </Typography>
          </Box>
        </Box>

        <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel>Mois</InputLabel>
            <Select
              value={mois}
              onChange={(e) => setMois(e.target.value)}
              label="Mois"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <MenuItem key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString("default", { month: "long" })}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Année"
            type="number"
            value={annee}
            onChange={(e) => setAnnee(e.target.value)}
          />
        </Box>

        <TextField
          fullWidth
          label="Taux compte prorata (%)"
          type="number"
          value={tauxProrata}
          onChange={(e) => setTauxProrata(e.target.value)}
          inputProps={{ step: "0.01", min: "0", max: "100" }}
          sx={{ mb: 3, width: "200px" }}
        />

        <TableContainer
          component={Paper}
          sx={{
            boxShadow: "0px 3px 8px rgba(0, 0, 0, 0.1)",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell />
                <TableCell>Description</TableCell>
                <TableCell align="right">Quantité</TableCell>
                <TableCell align="center">Prix unitaire</TableCell>
                <TableCell align="right">Total HT</TableCell>
                <TableCell align="right">% Avancement</TableCell>
                <TableCell align="right">Montant</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {structure.map((partie) => (
                <PartieRow
                  key={partie.id}
                  partie={partie}
                  handlePourcentageChange={handlePourcentageChange}
                />
              ))}
              <AvenantsPartieRow
                avenants={avenants}
                handlePourcentageChange={handlePourcentageChange}
              />
            </TableBody>
          </Table>
        </TableContainer>

        <TableContainer component={Paper} sx={{ mt: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Description</TableCell>
                <TableCell align="right">Montant</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Montant HT du mois */}

              {/* Cumul mois précédent */}
              <TableRow>
                <TableCell>Cumul mois précédent</TableCell>
                <TableCell align="right">
                  {calculerCumulPrecedent()
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* Montant total cumul HT */}
              <TableRow>
                <TableCell>Montant total cumul HT</TableCell>
                <TableCell align="right">
                  {(() => {
                    const cumulPrecedent = calculerCumulPrecedent();
                    const montantTotalCumul = cumulPrecedent + montantHTMois;

                    return montantTotalCumul
                      .toFixed(2)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
                  })()}{" "}
                  €
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Montant HT du mois</TableCell>
                <TableCell align="right">
                  {montantHTMois
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* Retenue de garantie */}
              <TableRow>
                <TableCell>Retenue de garantie (5% HT du mois)</TableCell>
                <TableCell align="right" sx={{ color: "error.main" }}>
                  -
                  {(montantHTMois * 0.05)
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* Compte prorata */}
              <TableRow>
                <TableCell>
                  Compte prorata ({tauxProrata}% HT du mois)
                </TableCell>
                <TableCell align="right" sx={{ color: "error.main" }}>
                  -
                  {(montantHTMois * (tauxProrata / 100))
                    .toFixed(2)
                    .replace(/\B(?=(\d{3})+(?!\d))/g, " ")}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* Retenue CIE */}
              <TableRow>
                <TableCell>Retenue CIE HT du mois</TableCell>
                <TableCell align="right">
                  <Box>
                    <TextField
                      type="number"
                      value={retenueCIE}
                      onChange={(e) => setRetenueCIE(e.target.value)}
                      inputProps={{ step: "0.01" }}
                      size="small"
                    />
                    {facturesCIE.length > 0 && (
                      <Typography
                        variant="caption"
                        display="block"
                        sx={{ mt: 1, color: "text.secondary" }}
                      >
                        Factures incluses :
                        {facturesCIE.map((f) => (
                          <div key={f.id}>
                            {f.numero}: {f.montant_ht.toFixed(2)}€
                          </div>
                        ))}
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              </TableRow>

              {/* Lignes supplémentaires */}
              {lignesSupplementaires.map((ligne, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      <TextField
                        size="small"
                        value={ligne.description}
                        onChange={(e) =>
                          handleLigneChange(
                            index,
                            "description",
                            e.target.value
                          )
                        }
                        placeholder="Description"
                        fullWidth
                      />
                      <Select
                        size="small"
                        value={ligne.type}
                        onChange={(e) =>
                          handleLigneChange(index, "type", e.target.value)
                        }
                      >
                        <MenuItem value="deduction">Déduction</MenuItem>
                        <MenuItem value="addition">Addition</MenuItem>
                      </Select>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                      {ligne.type === "deduction" && "-"}
                      <TextField
                        size="small"
                        type="number"
                        value={ligne.montant}
                        onChange={(e) =>
                          handleLigneChange(
                            index,
                            "montant",
                            parseFloat(e.target.value)
                          )
                        }
                        inputProps={{ step: "0.01" }}
                      />
                      <IconButton
                        size="small"
                        onClick={() => handleSupprimerLigne(index)}
                        sx={{ color: "red" }}
                      >
                        <FaTrash />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {/* Montant total du mois HT après retenues */}
              <TableRow>
                <TableCell>Montant total du mois HT après retenues</TableCell>
                <TableCell align="right">
                  {(() => {
                    let montantTotal =
                      montantHTMois -
                      montantHTMois * 0.05 -
                      montantHTMois * (tauxProrata / 100) -
                      parseFloat(retenueCIE || 0);

                    // Appliquer les lignes supplémentaires
                    lignesSupplementaires.forEach((ligne) => {
                      if (ligne.type === "deduction") {
                        montantTotal -= parseFloat(ligne.montant || 0);
                      } else {
                        montantTotal += parseFloat(ligne.montant || 0);
                      }
                    });

                    return montantTotal
                      .toFixed(2)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
                  })()}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* TVA */}
              <TableRow>
                <TableCell>TVA (20%)</TableCell>
                <TableCell align="right">
                  {(() => {
                    let montantBase =
                      montantHTMois -
                      montantHTMois * 0.05 -
                      montantHTMois * (tauxProrata / 100) -
                      parseFloat(retenueCIE || 0);

                    // Appliquer les lignes supplémentaires
                    lignesSupplementaires.forEach((ligne) => {
                      if (ligne.type === "deduction") {
                        montantBase -= parseFloat(ligne.montant || 0);
                      } else {
                        montantBase += parseFloat(ligne.montant || 0);
                      }
                    });

                    return (montantBase * 0.2)
                      .toFixed(2)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
                  })()}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* Montant total TTC à payer */}
              <TableRow sx={{ "& td": { fontWeight: "bold" } }}>
                <TableCell>Montant total TTC à payer</TableCell>
                <TableCell align="right">
                  {(() => {
                    let montantBase =
                      montantHTMois -
                      montantHTMois * 0.05 -
                      montantHTMois * (tauxProrata / 100) -
                      parseFloat(retenueCIE || 0);

                    // Appliquer les lignes supplémentaires
                    lignesSupplementaires.forEach((ligne) => {
                      if (ligne.type === "deduction") {
                        montantBase -= parseFloat(ligne.montant || 0);
                      } else {
                        montantBase += parseFloat(ligne.montant || 0);
                      }
                    });

                    return (montantBase * 1.2)
                      .toFixed(2)
                      .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
                  })()}{" "}
                  €
                </TableCell>
              </TableRow>

              {/* Lignes supplémentaires */}
              <TableRow>
                <TableCell colSpan={2}>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAjoutLigne}
                    sx={{ mb: 2 }}
                  >
                    Ajouter une ligne
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSubmit} color="primary">
          {existingSituation
            ? "Mettre à jour la situation"
            : "Créer la situation"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreationSituation;
