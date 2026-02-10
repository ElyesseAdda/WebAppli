import {
  Box,
  Button,
  Paper,
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

import {
  formatDate,
  formatMontant,
  formatNumberWithColor,
  getMoisName,
  extractSituationNumber,
  formatFactureNumero,
} from "../utils/formatters";
import {
  calculateDatePaiement,
  calculateRetard,
  calculerEcartMois,
} from "../utils/calculations";
import { COLORS } from "../../../../constants/colors";

const commonBodyCellStyle = {
  padding: "6px 8px",
  whiteSpace: "normal",
  wordWrap: "break-word",
  textAlign: "center",
  verticalAlign: "middle",
};

const commonCellStyle = {
  color: "white",
  padding: "6px 8px",
  whiteSpace: "normal",
  wordWrap: "break-word",
  textAlign: "center",
  minHeight: "60px",
  verticalAlign: "middle",
};
import React, { useState } from "react";

const TableauFacturationTable = ({
  situationsAvecSousTotaux,
  totaux,
  banques,
  calculerCumulSituationHT,
  onOpenDateModal,
  onOpenPaiementModal,
  onOpenBanqueModal,
  onNumeroCPChange,
}) => {
  const [showCumulColumn, setShowCumulColumn] = useState(false);
  // Calculer le nombre de lignes par mois (sans les sous-totaux) pour la fusion des cellules
  const calculerLignesParMois = () => {
    const lignesParMois = {};
    let currentMois = null;
    let count = 0;

    situationsAvecSousTotaux.forEach((item) => {
      if (item.isSousTotal) {
        // Quand on rencontre un sous-total, on enregistre le count pour le mois précédent
        if (currentMois !== null) {
          lignesParMois[currentMois] = count;
          count = 0;
        }
        currentMois = null;
      } else {
        // Déterminer le mois de l'item
        let mois;
        if (item.price_ht !== undefined) {
          // Facture
          const dateEnvoiFacture = item.date_envoi || item.date_creation;
          if (dateEnvoiFacture) {
            const date = new Date(dateEnvoiFacture);
            mois = date.getMonth() + 1;
          } else {
            mois = null;
          }
        } else {
          // Situation
          mois = item.mois;
        }

        if (mois !== currentMois) {
          // Nouveau mois
          if (currentMois !== null) {
            lignesParMois[currentMois] = count;
          }
          currentMois = mois;
          count = 1;
        } else {
          count++;
        }
      }
    });

    // Enregistrer le dernier mois
    if (currentMois !== null) {
      lignesParMois[currentMois] = count;
    }

    return lignesParMois;
  };

  const lignesParMois = calculerLignesParMois();
  let currentMois = null;
  let ligneMoisIndex = 0;

  return (
    <TableContainer component={Paper} sx={{ maxWidth: "100%", overflowX: "auto", width: "100%" }}>
      <Table size="small" sx={{ tableLayout: "auto", width: "100%" }}>
        <TableHead>
          <TableRow
            sx={{
              backgroundColor: "rgba(27, 120, 188, 1)",
              color: "white",
            }}
          >
            <TableCell sx={{ ...commonCellStyle }}>Mois</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>Client</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>Chantier</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>Banque</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>N° Situation</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>N° CP</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>N° Facture</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>Montant HT Situation</TableCell>
            {showCumulColumn && (
              <TableCell sx={{ ...commonCellStyle }}>Situation Cumul HT</TableCell>
            )}
            <TableCell sx={{ ...commonCellStyle }}>Date d'envoi</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>Date de paiement prévue</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>Montant reçu HT</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>Date de paiement réelle</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>Jours de retard</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>Écart Mois</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {situationsAvecSousTotaux.map((item, index) => {
            if (item.isSousTotal) {
              // Ligne de sous-total
              currentMois = null;
              ligneMoisIndex = 0;
              return (
                <TableRow
                  key={`sous-total-${item.mois}`}
                  sx={{
                    backgroundColor: COLORS.primary,
                    color: "white",
                    fontWeight: "bold",
                    "& td": {
                      fontWeight: "bold",
                      color: "white",
                    },
                  }}
                >
                  <TableCell
                    colSpan={showCumulColumn ? 15 : 14}
                    sx={{
                      ...commonBodyCellStyle,
                      padding: "8px 16px",
                      width: "100%",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        position: "relative",
                      }}
                    >
                      <Box sx={{ flex: 1 }} />
                      <Typography
                        sx={{
                          fontWeight: "bold",
                          color: "white",
                          fontSize: "1.1rem",
                          position: "absolute",
                          left: "50%",
                          transform: "translateX(-50%)",
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
                          {(parseFloat(item.sousTotal) || 0).toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} €
                        </span>
                      </Typography>
                      <Typography
                        onClick={() => setShowCumulColumn(!showCumulColumn)}
                        sx={{
                          fontWeight: "bold",
                          color: "white",
                          fontSize: "1rem",
                          flex: 1,
                          textAlign: "right",
                          cursor: "pointer",
                          "&:hover": {
                            textDecoration: "underline",
                          },
                        }}
                      >
                        Situation cumul :{" "}
                        <span
                          style={{
                            fontSize: "1rem",
                            fontWeight: "bold",
                            marginLeft: "5px",
                          }}
                        >
                          {(parseFloat(item.cumulCumulatif) || 0).toLocaleString("fr-FR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })} €
                        </span>
                      </Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              );
            } else if (item.price_ht !== undefined) {
              // Ligne de facture
              const facture = item;
              // Pour les factures, utiliser date_envoi (ou date_creation en fallback)
              const dateEnvoiFacture = facture.date_envoi || facture.date_creation;
              const datePaiementPrevue = calculateDatePaiement(
                dateEnvoiFacture,
                facture.delai_paiement,
                formatDate
              );
              
              // Déterminer le mois de la facture
              let moisFacture = null;
              let anneeFacture = null;
              if (dateEnvoiFacture) {
                const date = new Date(dateEnvoiFacture);
                moisFacture = date.getMonth() + 1;
                anneeFacture = date.getFullYear();
              }

              // Vérifier si c'est la première ligne du mois
              const isFirstRowOfMois = moisFacture !== currentMois;
              if (isFirstRowOfMois) {
                currentMois = moisFacture;
                ligneMoisIndex = 0;
              } else {
                ligneMoisIndex++;
              }

              const rowSpanMois = isFirstRowOfMois ? (lignesParMois[moisFacture] || 1) : 0;
              const moisDisplay = moisFacture && anneeFacture 
                ? `${getMoisName(moisFacture)} ${anneeFacture}`
                : "-";

              return (
                <TableRow
                  key={`facture-${facture.id}`}
                  sx={{
                    "&:nth-of-type(odd)": { backgroundColor: "#f5f5f5" },
                    "&:nth-of-type(even)": { backgroundColor: "#ffffff" },
                    "&:hover": { backgroundColor: "#f5f5f5" },
                  }}
                >
                  {isFirstRowOfMois ? (
                    <TableCell
                      rowSpan={rowSpanMois}
                      sx={{
                        ...commonBodyCellStyle,
                        verticalAlign: "middle",
                        textAlign: "center",
                        borderRight: "1px solid #e0e0e0",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color: "rgba(27, 120, 188, 1)",
                        }}
                      >
                        {moisDisplay}
                      </Typography>
                    </TableCell>
                  ) : null}
                  <TableCell sx={commonBodyCellStyle}>
                    <Typography
                      sx={{
                        fontSize: "0.8rem",
                        color: "text.primary",
                      }}
                    >
                      {facture.client_name || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.8rem",
                        color: (facture.state_facture === 'Payée' || facture.date_paiement)
                          ? "rgba(27, 120, 188, 1)"
                          : "error.main",
                      }}
                    >
                      {facture.chantier_name || facture.chantier?.chantier_name || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    -
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {facture.numero ? (
                      <Button
                        size="small"
                        onClick={() => {
                          const previewUrl = `/api/preview-facture/${facture.id}/`;
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
                        {formatFactureNumero(facture.numero)}
                      </Button>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {formatMontant(parseFloat(facture.price_ht) || 0)}
                  </TableCell>
                  {showCumulColumn && (
                    <TableCell sx={commonBodyCellStyle}>-</TableCell>
                  )}
                  <TableCell sx={commonBodyCellStyle}>
                    <Button
                      size="small"
                      onClick={() => onOpenDateModal(facture)}
                    >
                      {dateEnvoiFacture
                        ? formatDate(dateEnvoiFacture)
                        : "Définir date"}
                    </Button>
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {datePaiementPrevue}
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    <Button
                      size="small"
                      onClick={() => onOpenPaiementModal(facture)}
                    >
                      {facture.state_facture === 'Payée' && facture.price_ht
                        ? formatNumberWithColor(
                            parseFloat(facture.price_ht),
                            parseFloat(facture.price_ht)
                          )
                        : "Définir paiement"}
                    </Button>
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {facture.date_paiement
                      ? formatDate(facture.date_paiement)
                      : "-"}
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {calculateRetard(
                      datePaiementPrevue,
                      facture.date_paiement,
                      formatDate
                    )}
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {calculerEcartMois(facture)}
                  </TableCell>
                </TableRow>
              );
            } else {
              // Ligne de situation normale
              const situation = item;
              const cumul = calculerCumulSituationHT(situation);
              const datePaiementPrevue = calculateDatePaiement(
                situation.date_envoi,
                situation.delai_paiement,
                formatDate
              );

              // Vérifier si c'est la première ligne du mois
              const isFirstRowOfMois = situation.mois !== currentMois;
              if (isFirstRowOfMois) {
                currentMois = situation.mois;
                ligneMoisIndex = 0;
              } else {
                ligneMoisIndex++;
              }

              const rowSpanMois = isFirstRowOfMois ? (lignesParMois[situation.mois] || 1) : 0;
              const moisDisplay = situation.annee 
                ? `${getMoisName(situation.mois)} ${situation.annee}`
                : getMoisName(situation.mois);

              return (
                <TableRow
                  key={`${situation.chantier_id}-${situation.id}`}
                  sx={{
                    "&:nth-of-type(odd)": { backgroundColor: "#f5f5f5" },
                    "&:nth-of-type(even)": { backgroundColor: "#ffffff" },
                    "&:hover": { backgroundColor: "#f5f5f5" },
                  }}
                >
                  {isFirstRowOfMois ? (
                    <TableCell
                      rowSpan={rowSpanMois}
                      sx={{
                        ...commonBodyCellStyle,
                        verticalAlign: "middle",
                        textAlign: "center",
                        borderRight: "1px solid #e0e0e0",
                        backgroundColor: "#ffffff",
                      }}
                    >
                      <Typography
                        sx={{
                          fontWeight: 600,
                          fontSize: "0.9rem",
                          color: "rgba(27, 120, 188, 1)",
                        }}
                      >
                        {moisDisplay}
                      </Typography>
                    </TableCell>
                  ) : null}
                  <TableCell sx={commonBodyCellStyle}>
                    <Typography
                      sx={{
                        fontSize: "0.8rem",
                        color: "text.primary",
                      }}
                    >
                      {situation.client_name || "-"}
                    </Typography>
                  </TableCell>
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
                      onClick={() => onOpenBanqueModal(situation)}
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
                  <TableCell sx={commonBodyCellStyle}>
                    <TextField
                      size="small"
                      value={situation.numero_cp || ""}
                      onChange={(e) =>
                        onNumeroCPChange(situation.id, e.target.value)
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
                    {situation.numero_situation ? (
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
                        {formatFactureNumero(situation.numero_situation)}
                      </Button>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {formatMontant(
                      parseFloat(situation.montant_apres_retenues) || 0
                    )}
                  </TableCell>
                  {showCumulColumn && (
                    <TableCell
                      sx={{
                        ...commonBodyCellStyle,
                        color: "rgba(27, 120, 188, 1)",
                      }}
                    >
                      {formatNumberWithColor(cumul, cumul)}
                    </TableCell>
                  )}
                  <TableCell sx={commonBodyCellStyle}>
                    <Button
                      size="small"
                      onClick={() => onOpenDateModal(situation)}
                    >
                      {situation.date_envoi
                        ? formatDate(situation.date_envoi)
                        : "Définir date"}
                    </Button>
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {datePaiementPrevue}
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    <Button
                      size="small"
                      onClick={() => onOpenPaiementModal(situation)}
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
                      datePaiementPrevue,
                      situation.date_paiement_reel,
                      formatDate
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
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            <TableCell sx={commonBodyCellStyle}>
              {formatMontant(totaux.montantHTSituation)}
            </TableCell>
            {showCumulColumn && (
              <TableCell sx={commonBodyCellStyle}>-</TableCell>
            )}
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            <TableCell sx={commonBodyCellStyle}>
              {formatMontant(totaux.montantRecuHT)}
            </TableCell>
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            
            <TableCell sx={commonBodyCellStyle}>
              {formatMontant(totaux.ecartMois)}
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
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            <TableCell sx={commonBodyCellStyle}>
              {formatMontant(
                totaux.montantHTSituation - totaux.montantRecuHT
              )}
            </TableCell>
            {showCumulColumn && (
              <TableCell sx={commonBodyCellStyle}>-</TableCell>
            )}
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
};

export default TableauFacturationTable;

