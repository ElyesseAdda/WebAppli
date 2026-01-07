import {
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
} from "../utils/formatters";
import {
  calculateDatePaiement,
  calculateRetard,
  calculerEcartMois,
} from "../utils/calculations";

const commonBodyCellStyle = {
  maxWidth: "100px",
  padding: "6px 8px",
  whiteSpace: "normal",
  wordWrap: "break-word",
  textAlign: "center",
  verticalAlign: "middle",
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
import React from "react";

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
  return (
    <TableContainer component={Paper} sx={{ maxWidth: "100%", overflowX: "auto" }}>
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
            <TableCell sx={{ ...commonCellStyle }}>N° Situation</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>N° CP</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>N° Facture</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>Montant HT Situation</TableCell>
            <TableCell sx={{ ...commonCellStyle }}>Situation Cumul HT</TableCell>
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
              
              // Déterminer le mois de la facture (utiliser date_envoi avec vérification de l'année)
              let moisFacture = "-";
              if (dateEnvoiFacture) {
                const date = new Date(dateEnvoiFacture);
                moisFacture = (date.getMonth() + 1).toString().padStart(2, "0");
              }

              return (
                <TableRow
                  key={`facture-${facture.id}`}
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
                        color: "rgba(27, 120, 188, 1)",
                      }}
                    >
                      {facture.chantier_name || facture.chantier?.chantier_name || "-"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    -
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {moisFacture}
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
                        {facture.numero}
                      </Button>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>
                    {formatMontant(parseFloat(facture.price_ht) || 0)}
                  </TableCell>
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
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
                  <TableCell sx={commonBodyCellStyle}>-</TableCell>
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
                    {situation.mois.toString().padStart(2, "0")}
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
                        {situation.numero_situation}
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
                  <TableCell
                    sx={{
                      ...commonBodyCellStyle,
                      color: "rgba(27, 120, 188, 1)",
                    }}
                  >
                    {formatNumberWithColor(cumul, cumul)}
                  </TableCell>
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
            <TableCell sx={commonBodyCellStyle}>
              {formatMontant(totaux.montantHTSituation)}
            </TableCell>
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
            <TableCell sx={commonBodyCellStyle}>
              {formatMontant(totaux.montantRecuHT)}
            </TableCell>
            <TableCell sx={commonBodyCellStyle}>-</TableCell>
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
            <TableCell sx={commonBodyCellStyle}>
              {formatMontant(
                totaux.montantHTSituation - totaux.montantRecuHT
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
  );
};

export default TableauFacturationTable;

