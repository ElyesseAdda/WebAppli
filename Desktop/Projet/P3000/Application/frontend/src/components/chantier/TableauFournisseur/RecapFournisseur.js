import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import React from "react";

const RecapFournisseur = ({ data, selectedAnnee, organized, moisSorted }) => {
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

  // Formater un nombre avec 2 décimales
  const formatNumber = (num) => {
    return Number(num || 0).toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Calculer les totaux globaux pour l'année
  const calculerTotauxGlobaux = () => {
    let totalAPayer = 0;
    let totalAPayerTTC = 0;
    let totalPaye = 0;
    let totalEcart = 0;

    moisSorted.forEach((mois) => {
      const fournisseurs = organized[mois] || {};
      Object.values(fournisseurs).forEach((chantiers) => {
        chantiers.forEach((item) => {
          totalAPayer += item.a_payer || 0;
          totalAPayerTTC += item.a_payer_ttc || 0;
          totalPaye += item.paye || 0;
          totalEcart += item.ecart || 0;
        });
      });
    });

    return { totalAPayer, totalAPayerTTC, totalPaye, totalEcart };
  };

  // Calculer les totaux par fournisseur pour l'année
  const calculerTotauxParFournisseur = () => {
    const totauxParFournisseur = {};

    moisSorted.forEach((mois) => {
      const fournisseurs = organized[mois] || {};
      Object.keys(fournisseurs).forEach((fournisseur) => {
        if (!totauxParFournisseur[fournisseur]) {
          totauxParFournisseur[fournisseur] = {
            totalAPayer: 0,
            totalAPayerTTC: 0,
            totalPaye: 0,
            totalEcart: 0,
            mois: {},
          };
        }

        const chantiers = fournisseurs[fournisseur];
        chantiers.forEach((item) => {
          totauxParFournisseur[fournisseur].totalAPayer += item.a_payer || 0;
          totauxParFournisseur[fournisseur].totalAPayerTTC += item.a_payer_ttc || 0;
          totauxParFournisseur[fournisseur].totalPaye += item.paye || 0;
          totauxParFournisseur[fournisseur].totalEcart += item.ecart || 0;

          // Stocker les détails par mois
          if (!totauxParFournisseur[fournisseur].mois[mois]) {
            totauxParFournisseur[fournisseur].mois[mois] = {
              totalAPayer: 0,
              totalAPayerTTC: 0,
              totalPaye: 0,
              totalEcart: 0,
            };
          }

          totauxParFournisseur[fournisseur].mois[mois].totalAPayer += item.a_payer || 0;
          totauxParFournisseur[fournisseur].mois[mois].totalAPayerTTC += item.a_payer_ttc || 0;
          totauxParFournisseur[fournisseur].mois[mois].totalPaye += item.paye || 0;
          totauxParFournisseur[fournisseur].mois[mois].totalEcart += item.ecart || 0;
        });
      });
    });

    return totauxParFournisseur;
  };

  const totauxGlobaux = calculerTotauxGlobaux();
  const totauxParFournisseur = calculerTotauxParFournisseur();
  const fournisseursSorted = Object.keys(totauxParFournisseur).sort();

  // Trier les mois pour l'affichage
  const trierMois = (moisArray) => {
    return moisArray.sort((a, b) => {
      const [moisA, anneeA] = a.split("/").map(Number);
      const [moisB, anneeB] = b.split("/").map(Number);
      if (anneeA !== anneeB) return anneeA - anneeB;
      return moisA - moisB;
    });
  };

  return (
    <Box sx={{ width: "100%", mt: 3 }}>
      <Typography
        variant="h6"
        sx={{
          fontFamily: "Merriweather, serif",
          color: "white",
          fontWeight: "bold",
          mb: 2,
        }}
      >
        RÉCAPITULATIF ANNÉE {selectedAnnee}
      </Typography>

      {/* Récapitulatif global */}
      <Paper
        sx={{
          p: 2,
          mb: 3,
          backgroundColor: "rgba(27, 120, 188, 0.1)",
          border: "2px solid rgba(27, 120, 188, 0.3)",
        }}
      >
        <Typography
          variant="h6"
          sx={{
            color: "rgba(27, 120, 188, 1)",
            fontWeight: "bold",
            mb: 2,
          }}
        >
          Totaux Globaux
        </Typography>
        <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          <Box>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
              Montant à payer HT
            </Typography>
            <Typography
              sx={{
                fontSize: "1.1rem",
                fontWeight: "bold",
                color: "rgba(27, 120, 188, 1)",
              }}
            >
              {formatNumber(totauxGlobaux.totalAPayer)} €
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
              Montant à payer TTC
            </Typography>
            <Typography
              sx={{
                fontSize: "1.1rem",
                fontWeight: "bold",
                color: "rgba(27, 120, 188, 1)",
              }}
            >
              {formatNumber(totauxGlobaux.totalAPayerTTC)} €
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
              Montant payé
            </Typography>
            <Typography
              sx={{
                fontSize: "1.1rem",
                fontWeight: "bold",
                color: "rgba(46, 125, 50, 1)",
              }}
            >
              {formatNumber(totauxGlobaux.totalPaye)} €
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
              Écart
            </Typography>
            <Typography
              sx={{
                fontSize: "1.1rem",
                fontWeight: "bold",
                color:
                  totauxGlobaux.totalEcart > 0
                    ? "rgba(211, 47, 47, 1)"
                    : "rgba(46, 125, 50, 1)",
              }}
            >
              {formatNumber(totauxGlobaux.totalEcart)} €
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Accordéons par fournisseur */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {fournisseursSorted.map((fournisseur) => {
          const totaux = totauxParFournisseur[fournisseur];
          const moisFournisseur = trierMois(Object.keys(totaux.mois));
          const isPayeComplet =
            Math.abs(totaux.totalAPayer - totaux.totalPaye) < 0.01;

          return (
            <Accordion
              key={fournisseur}
              sx={{
                backgroundColor: "white",
                "&:before": {
                  display: "none",
                },
                boxShadow: 2,
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  backgroundColor: isPayeComplet
                    ? "rgba(46, 125, 50, 0.1)"
                    : "rgba(27, 120, 188, 0.1)",
                  "&:hover": {
                    backgroundColor: isPayeComplet
                      ? "rgba(46, 125, 50, 0.15)"
                      : "rgba(27, 120, 188, 0.15)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    width: "100%",
                    pr: 2,
                  }}
                >
                  <Typography
                    sx={{
                      fontWeight: "bold",
                      fontSize: "1rem",
                      color: isPayeComplet
                        ? "rgba(46, 125, 50, 1)"
                        : "rgba(27, 120, 188, 1)",
                    }}
                  >
                    {fournisseur}
                  </Typography>
                  <Box sx={{ display: "flex", gap: 3 }}>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: "text.secondary",
                        }}
                      >
                        À payer
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          fontWeight: "bold",
                          color: "rgba(27, 120, 188, 1)",
                        }}
                      >
                        {formatNumber(totaux.totalAPayer)} €
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: "text.secondary",
                        }}
                      >
                        Payé
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          fontWeight: "bold",
                          color: isPayeComplet
                            ? "rgba(46, 125, 50, 1)"
                            : "rgba(27, 120, 188, 1)",
                        }}
                      >
                        {formatNumber(totaux.totalPaye)} €
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography
                        sx={{
                          fontSize: "0.75rem",
                          color: "text.secondary",
                        }}
                      >
                        Écart
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.9rem",
                          fontWeight: "bold",
                          color:
                            totaux.totalEcart > 0
                              ? "rgba(211, 47, 47, 1)"
                              : "rgba(46, 125, 50, 1)",
                        }}
                      >
                        {formatNumber(totaux.totalEcart)} €
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow
                        sx={{
                          backgroundColor: "rgba(27, 120, 188, 0.1)",
                        }}
                      >
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            color: "rgba(27, 120, 188, 1)",
                          }}
                        >
                          Mois
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: "bold",
                            color: "rgba(27, 120, 188, 1)",
                          }}
                        >
                          Montant à payer HT
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: "bold",
                            color: "rgba(27, 120, 188, 1)",
                          }}
                        >
                          Montant à payer TTC
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: "bold",
                            color: "rgba(27, 120, 188, 1)",
                          }}
                        >
                          Montant payé
                        </TableCell>
                        <TableCell
                          align="right"
                          sx={{
                            fontWeight: "bold",
                            color: "rgba(27, 120, 188, 1)",
                          }}
                        >
                          Écart
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {moisFournisseur.map((mois) => {
                        const [moisNum, annee2digits] = mois
                          .split("/")
                          .map(Number);
                        const moisName = getMoisName(moisNum);
                        const anneeComplete =
                          annee2digits < 50
                            ? 2000 + annee2digits
                            : 1900 + annee2digits;
                        const totauxMois = totaux.mois[mois];

                        return (
                          <TableRow key={mois} hover>
                            <TableCell>
                              <Typography
                                sx={{
                                  fontWeight: 500,
                                  color: "text.primary",
                                }}
                              >
                                {moisName} {anneeComplete}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                sx={{
                                  color: "rgba(27, 120, 188, 1)",
                                  fontWeight: 500,
                                }}
                              >
                                {formatNumber(totauxMois.totalAPayer)} €
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                sx={{
                                  color: "rgba(27, 120, 188, 1)",
                                  fontWeight: 500,
                                }}
                              >
                                {formatNumber(totauxMois.totalAPayerTTC)} €
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                sx={{
                                  color: "rgba(46, 125, 50, 1)",
                                  fontWeight: 500,
                                }}
                              >
                                {formatNumber(totauxMois.totalPaye)} €
                              </Typography>
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                sx={{
                                  color:
                                    totauxMois.totalEcart > 0
                                      ? "rgba(211, 47, 47, 1)"
                                      : "rgba(46, 125, 50, 1)",
                                  fontWeight: 500,
                                }}
                              >
                                {formatNumber(totauxMois.totalEcart)} €
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Ligne de total */}
                      <TableRow
                        sx={{
                          backgroundColor: "rgba(27, 120, 188, 0.05)",
                          borderTop: "2px solid rgba(27, 120, 188, 0.3)",
                        }}
                      >
                        <TableCell>
                          <Typography
                            sx={{
                              fontWeight: "bold",
                              color: "rgba(27, 120, 188, 1)",
                            }}
                          >
                            TOTAL
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            sx={{
                              fontWeight: "bold",
                              color: "rgba(27, 120, 188, 1)",
                            }}
                          >
                            {formatNumber(totaux.totalAPayer)} €
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            sx={{
                              fontWeight: "bold",
                              color: "rgba(27, 120, 188, 1)",
                            }}
                          >
                            {formatNumber(totaux.totalAPayerTTC)} €
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            sx={{
                              fontWeight: "bold",
                              color: isPayeComplet
                                ? "rgba(46, 125, 50, 1)"
                                : "rgba(27, 120, 188, 1)",
                            }}
                          >
                            {formatNumber(totaux.totalPaye)} €
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography
                            sx={{
                              fontWeight: "bold",
                              color:
                                totaux.totalEcart > 0
                                  ? "rgba(211, 47, 47, 1)"
                                  : "rgba(46, 125, 50, 1)",
                            }}
                          >
                            {formatNumber(totaux.totalEcart)} €
                          </Typography>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>
    </Box>
  );
};

export default RecapFournisseur;

