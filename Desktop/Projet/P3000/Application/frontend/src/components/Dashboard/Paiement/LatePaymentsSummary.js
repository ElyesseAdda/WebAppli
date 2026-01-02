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
import WarningIcon from "@mui/icons-material/Warning";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useDashboardFilters } from "../DashboardFiltersContext";

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

const LatePaymentsSummary = () => {
  const { selectedYear, openAccordion, toggleAccordion } = useDashboardFilters();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [latePayments, setLatePayments] = useState([]);
  
  // ID unique pour cet accordéon
  const accordionId = "late-payments-summary";
  const expanded = openAccordion === accordionId;

  useEffect(() => {
    fetchLatePayments();
  }, []); // Pas de dépendance sur selectedYear : les paiements en retard restent affichés quelle que soit l'année

  const fetchLatePayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/late-payments/");
      setLatePayments(response.data);
    } catch (err) {
      console.error("Erreur lors du chargement des paiements en retard:", err);
      setError("Impossible de charger les paiements en retard");
    } finally {
      setLoading(false);
    }
  };

  // Calculer les statistiques
  const nombrePaiements = latePayments.length;
  const nombreDossiers = new Set(latePayments.map((p) => p.chantier_id)).size;
  const montantHTCumule = latePayments.reduce((sum, payment) => {
    const montant = parseFloat(payment.montant_ht || 0);
    return sum + montant;
  }, 0);

  // Barre de progression fixée à 100% pour le style (non fonctionnelle)
  const pourcentageProgression = 100;

  const handlePreview = (payment) => {
    if (payment.type === "situation") {
      window.open(`/api/preview-situation-v2/${payment.id}/`, "_blank");
    } else if (payment.type === "facture") {
      window.open(`/api/preview-facture-v2/${payment.id}/`, "_blank");
    }
  };

  // Fonction pour calculer le nombre de jours de retard
  const getDaysLate = (dateString) => {
    if (!dateString) return 0;
    const dateAttendue = new Date(dateString);
    dateAttendue.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = today - dateAttendue;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
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
            color: "#64748b",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Paiements en Retard
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
                  color: "#1e293b",
                  fontWeight: "bold",
                  lineHeight: 1,
                }}
              >
                {nombrePaiements}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: "#94a3b8",
                  fontWeight: 500,
                }}
              >
                RETARDS
              </Typography>
            </Box>

            {/* Montant */}
            <Typography
              variant="h6"
              sx={{
                color: "#64748b",
                fontWeight: 600,
              }}
            >
              Montant:{" "}
              <Box component="span" sx={{ color: "#dc2626" }}>
                {formatNumber(montantHTCumule)} €
              </Box>
            </Typography>
          </Box>

          {/* Icône circulaire - rapprochée des statistiques */}
          <Box
            sx={{
              backgroundColor: "#fee2e2",
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
            <WarningIcon
              sx={{
                fontSize: 50,
                color: "#dc2626",
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
            backgroundColor: "#f8fafc",
            borderRadius: "0 0 16px 16px",
            overflow: "hidden",
            zIndex: 2,
          }}
        >
          <Box
            sx={{
              height: "100%",
              width: `${pourcentageProgression}%`,
              backgroundColor: "#dc2626",
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
            color: "#9ca3af",
            zIndex: 2,
            "&:hover": {
              backgroundColor: "#f3f4f6",
              color: "#374151",
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
                  <TableRow sx={{ backgroundColor: "#fee2e2" }}>
                    <TableCell sx={{ fontWeight: "bold", color: "#991b1b" }}>
                      Type
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", color: "#991b1b" }}>
                      N°
                    </TableCell>
                    <TableCell sx={{ fontWeight: "bold", color: "#991b1b" }}>
                      Chantier
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", color: "#991b1b" }}
                      align="center"
                    >
                      Période
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", color: "#991b1b" }}
                      align="center"
                    >
                      Date Paiement Attendue
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", color: "#991b1b" }}
                      align="center"
                    >
                      Jours de Retard
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: "bold", color: "#991b1b" }}
                      align="right"
                    >
                      Montant HT
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {latePayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          Aucun paiement en retard pour l'année {selectedYear}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    latePayments.map((payment, index) => {
                      const joursRetard = getDaysLate(payment.date_paiement_attendue);
                      return (
                        <TableRow
                          key={`${payment.type}-${payment.id}`}
                          hover
                          sx={{
                            backgroundColor: index % 2 === 0 ? "#fafafa" : "#fff",
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
                                backgroundColor: payment.type === "situation" ? "#dbeafe" : "#f3e8ff",
                                color: payment.type === "situation" ? "#1e40af" : "#6b21a8",
                                fontWeight: 600,
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <Typography
                              onClick={() => handlePreview(payment)}
                              sx={{
                                cursor: "pointer",
                                color: "#991b1b",
                                fontWeight: 600,
                                "&:hover": {
                                  textDecoration: "underline",
                                  color: "#dc2626",
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
                                fontWeight: 500,
                                color: "#991b1b",
                              }}
                            >
                              {formatDate(payment.date_paiement_attendue)}
                            </Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography
                              sx={{
                                fontWeight: 600,
                                color: "#dc2626",
                              }}
                            >
                              {joursRetard} jour{joursRetard > 1 ? "s" : ""}
                            </Typography>
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{
                              fontWeight: 500,
                              color: "#991b1b",
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

export default LatePaymentsSummary;

