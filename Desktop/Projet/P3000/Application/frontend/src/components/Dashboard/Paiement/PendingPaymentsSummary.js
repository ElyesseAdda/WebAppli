import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useDashboardFilters } from "../DashboardFiltersContext";
import { COLORS } from "../../../constants/colors";

const formatNumber = (number) => {
  if (number == null) return "";
  const formatted = parseFloat(number).toFixed(2);
  return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch (error) {
    return dateString;
  }
};

const formatYear = (year) => year.toString().slice(-2);

const PendingPaymentsSummary = () => {
  const { selectedYear, openAccordion, toggleAccordion } = useDashboardFilters();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingPayments, setPendingPayments] = useState([]);
  
  // ID unique pour cet accordéon
  const accordionId = "pending-payments-summary";
  const expanded = openAccordion === accordionId;

  useEffect(() => {
    fetchPendingPayments();
  }, [selectedYear]);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/pending-payments/", {
        params: {
          annee: selectedYear,
        },
      });
      setPendingPayments(response.data);
    } catch (err) {
      console.error("Erreur lors du chargement des paiements en attente:", err);
      setError("Impossible de charger les paiements en attente");
    } finally {
      setLoading(false);
    }
  };

  // Calculer les statistiques
  const nombrePaiements = pendingPayments.length;
  const nombreDossiers = new Set(pendingPayments.map((p) => p.chantier_id)).size;
  const montantHTCumule = pendingPayments.reduce((sum, payment) => {
    const montant = parseFloat(payment.montant_ht || 0);
    return sum + montant;
  }, 0);

  // Barre de progression fixée à 75% pour le style (non fonctionnelle)
  const pourcentageProgression = 75;

  const handlePreview = (payment) => {
    if (payment.type === "situation") {
      window.open(`/api/preview-situation-v2/${payment.id}/`, "_blank");
    } else if (payment.type === "facture") {
      window.open(`/api/preview-facture-v2/${payment.id}/`, "_blank");
    }
  };

  // Fonction pour vérifier si une date est proche (dans les 7 prochains jours)
  const isUpcoming = (dateString) => {
    if (!dateString) return false;
    const dateAttendue = new Date(dateString);
    dateAttendue.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = dateAttendue - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 7; // Dans les 7 prochains jours
  };

  if (loading) {
    return (
      <Paper
        sx={{
          p: 3,
          mb: 3,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: 200,
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          transition: "all 0.3s ease",
        }}
      >
        <CircularProgress />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #f1f5f9",
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          transition: "all 0.3s ease",
        }}
      >
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        width: expanded ? "1200px" : "400px",
        minWidth: "400px",
        mb: 3,
        flexShrink: 0,
        transition: "width 0.5s ease-in-out",
      }}
    >
      <Paper
        sx={{
          p: 3,
          pb: 4.5,
          width: expanded ? "1200px" : "400px",
          minWidth: "400px",
          maxHeight: expanded ? "none" : "200px",
          height: expanded ? "auto" : "200px",
          backgroundColor: "white",
          borderRadius: "16px",
          border: "1px solid #f1f5f9",
          boxShadow: expanded 
            ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" 
            : "0 1px 2px 0 rgb(0 0 0 / 0.05)",
          transition: "width 0.5s ease-in-out, height 1s ease-in-out, max-height 1s ease-in-out, box-shadow 0.6s ease-in-out",
          position: "relative",
          overflow: "visible",
          overflowY: expanded ? "visible" : "hidden",
          zIndex: 1,
          "&:hover": {
            boxShadow: expanded 
              ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
              : "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
          },
        }}
      >
        {/* Titre de la section */}
        <Typography
          variant="h6"
          component="h3"
          sx={{
            mb: 3,
            color: COLORS.textLight,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Prochains Paiements
        </Typography>

        {/* Section principale : Statistiques à gauche, Icône rapprochée */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 0.5,
            mb: 3,
          }}
        >
          {/* Statistiques à gauche */}
          <Box>
            {/* Nombre de paiements avec label */}
            <Box
              sx={{
                display: "flex",
                alignItems: "baseline",
                gap: 1,
                mb: 1,
              }}
            >
              <Typography
                variant="h3"
                component="span"
                sx={{
                  color: COLORS.text,
                  fontWeight: "bold",
                  lineHeight: 1,
                }}
              >
                {nombrePaiements}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: COLORS.textMuted,
                  fontWeight: 500,
                }}
              >
                PAIEMENTS
              </Typography>
            </Box>

            {/* Montant */}
            <Typography
              variant="h6"
              sx={{
                color: COLORS.textLight,
                fontWeight: 600,
              }}
            >
              Montant:{" "}
              <Box component="span" sx={{ color: COLORS.warning }}>
                {formatNumber(montantHTCumule)} €
              </Box>
            </Typography>
          </Box>

          {/* Icône circulaire - rapprochée des statistiques */}
          <Box
            sx={{
              backgroundColor: COLORS.warningLight,
              borderRadius: "50%",
              width: 100,
              height: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              alignSelf: "flex-start",
              position: "relative",
              bottom: "30px",
              right: "-40px",
            }}
          >
            <AccessTimeIcon
              sx={{
                fontSize: 50,
                color: COLORS.warning,
              }}
            />
          </Box>
        </Box>

        {/* Barre de progression mini - toujours visible en bas de la carte */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            width: "100%",
            height: "6px",
            backgroundColor: COLORS.backgroundAlt,
            borderRadius: "0 0 16px 16px",
            overflow: "hidden",
            zIndex: 2,
          }}
        >
          <Box
            sx={{
              height: "100%",
              width: `${pourcentageProgression}%`,
              backgroundColor: COLORS.warning,
              borderRadius: "0 0 0 16px",
              transition: "width 0.3s ease",
            }}
          />
        </Box>

        {/* Bouton discret en bas à droite - au-dessus de la barre de progression */}
        <IconButton
          onClick={() => toggleAccordion(accordionId)}
          sx={{
            position: "absolute",
            bottom: 18,
            right: 12,
            width: 32,
            height: 32,
            backgroundColor: "transparent",
            color: COLORS.textLight,
            zIndex: 2,
            "&:hover": {
              backgroundColor: COLORS.backgroundHover,
              color: COLORS.textMuted,
            },
            transition: "all 0.2s ease",
          }}
          size="small"
        >
          <ExpandMoreIcon
            sx={{
              fontSize: 20,
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.6s ease-in-out",
            }}
          />
        </IconButton>

        {/* Liste des paiements - affichée conditionnellement dans la carte */}
        {expanded && (
          <Box
            sx={{
              mt: 2,
              width: "100%",
              transition: "all 0.6s ease-in-out",
              animation: expanded ? "fadeIn 0.6s ease-in-out" : "none",
              "@keyframes fadeIn": {
                from: {
                  opacity: 0,
                  transform: "translateY(-10px)",
                },
                to: {
                  opacity: 1,
                  transform: "translateY(0)",
                },
              },
            }}
          >
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: COLORS.warningLight }}>
                    <TableCell sx={{ fontWeight: "bold", color: COLORS.warningDark }}>
                      Type
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", color: COLORS.warningDark }}>
                      N°
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", color: COLORS.warningDark }}>
                      Chantier
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", color: COLORS.warningDark }}
                      align="center"
                    >
                      Période
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", color: COLORS.warningDark }}
                      align="center"
                    >
                      Date Paiement Attendue
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", color: COLORS.warningDark }}
                      align="right"
                    >
                      Montant HT
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pendingPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          Aucun paiement en attente pour l'année {selectedYear}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingPayments.map((payment, index) => {
                      const upcoming = isUpcoming(payment.date_paiement_attendue);
                      return (
                        <TableRow
                          key={`${payment.type}-${payment.id}`}
                          hover
                          sx={{
                            backgroundColor: index % 2 === 0 ? COLORS.backgroundHover : "#fff",
                            "&:hover": {
                              backgroundColor: "action.hover",
                            },
                          }}
                        >
                          <TableCell>
                            <Chip
                              label={payment.type === "situation" ? "Situation" : "Facture"}
                              size="small"
                              sx={{
                                backgroundColor: payment.type === "situation" ? COLORS.infoLight : "#f3e8ff",
                                color: payment.type === "situation" ? COLORS.infoDark : COLORS.accentDark,
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography
                              onClick={() => handlePreview(payment)}
                              sx={{
                                cursor: "pointer",
                                color: COLORS.warningDark,
                                fontWeight: 600,
                                "&:hover": {
                                  textDecoration: "underline",
                                  color: COLORS.warning,
                                },
                              }}
                            >
                              {payment.numero}
                            </Typography>
                          </TableCell>
                          <TableCell>{payment.chantier_name || "-"}</TableCell>
                          <TableCell align="center">
                            {payment.type === "situation" && payment.mois
                              ? `${payment.mois.toString().padStart(2, "0")}/${formatYear(payment.annee)}`
                              : "-"}
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              sx={{
                                fontWeight: upcoming ? 600 : 500,
                                color: upcoming ? COLORS.warning : COLORS.textLight,
                              }}
                            >
                              {formatDate(payment.date_paiement_attendue)}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 500,
                              color: COLORS.warningDark,
                            }}
                          >
                            {formatNumber(payment.montant_ht || 0)} €
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default PendingPaymentsSummary;

