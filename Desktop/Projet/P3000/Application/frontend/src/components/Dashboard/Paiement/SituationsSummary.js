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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DescriptionIcon from "@mui/icons-material/Description";
import React, { useEffect, useState } from "react";
import axios from "axios";
import { useDashboardFilters } from "../DashboardFiltersContext";
import StatusChangeModal from "../../StatusChangeModal";

const formatNumber = (number) => {
  if (number == null) return "";
  const formatted = parseFloat(number).toFixed(2);
  return formatted.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const formatYear = (year) => year.toString().slice(-2);

const SituationsSummary = () => {
  const { selectedYear, openAccordion, toggleAccordion } = useDashboardFilters();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [situations, setSituations] = useState([]);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [situationToUpdate, setSituationToUpdate] = useState(null);
  
  // ID unique pour cet accordéon
  const accordionId = "situations-summary";
  const expanded = openAccordion === accordionId;
  
  // Options de statut pour les situations
  const statusOptions = [
    { value: "brouillon", label: "Brouillon" },
    { value: "validee", label: "Validée" },
    { value: "facturee", label: "Facturée" },
  ];

  useEffect(() => {
    fetchSituations();
  }, [selectedYear]);

  const fetchSituations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get("/api/situations/by-year/", {
        params: {
          annee: selectedYear,
        },
      });
      setSituations(response.data);
    } catch (err) {
      console.error("Erreur lors du chargement des situations:", err);
      setError("Impossible de charger les situations");
    } finally {
      setLoading(false);
    }
  };

  // Calculer les statistiques
  const nombreSituations = situations.length;
  const nombreDossiers = new Set(situations.map((s) => s.chantier_id)).size;
  const montantHTCumule = situations.reduce((sum, situation) => {
    // Utiliser montant_apres_retenues ou montant_total selon ce qui est disponible
    const montant = parseFloat(situation.montant_apres_retenues || situation.montant_total || 0);
    return sum + montant;
  }, 0);

  // Calculer le pourcentage de situations validées/facturées pour la barre de progression
  const situationsValidees = situations.filter(
    (s) => s.statut === "validee" || s.statut === "facturee"
  ).length;
  const pourcentageValidees =
    nombreSituations > 0 ? (situationsValidees / nombreSituations) * 100 : 0;

  const handlePreviewSituation = (situationId) => {
    window.open(`/api/preview-situation-v2/${situationId}/`, "_blank");
  };

  const handleStatusClick = (situation) => {
    setSituationToUpdate(situation);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      if (!situationToUpdate) return;
      
      await axios.patch(`/api/situations/${situationToUpdate.id}/`, {
        statut: newStatus,
      });
      
      // Mettre à jour la situation dans l'état local
      setSituations((prevSituations) =>
        prevSituations.map((situation) =>
          situation.id === situationToUpdate.id
            ? { ...situation, statut: newStatus }
            : situation
        )
      );
      
      setShowStatusModal(false);
      setSituationToUpdate(null);
    } catch (error) {
      console.error("Erreur lors de la modification du statut:", error);
      setError("Erreur lors de la modification du statut");
      setShowStatusModal(false);
      setSituationToUpdate(null);
    }
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
          borderRadius: "16px", // rounded-2xl
          border: "1px solid #f1f5f9", // border-slate-100
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)", // shadow-sm
          transition: "all 0.3s ease", // transition-all duration-300
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
          borderRadius: "16px", // rounded-2xl
          border: "1px solid #f1f5f9", // border-slate-100
          boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)", // shadow-sm
          transition: "all 0.3s ease", // transition-all duration-300
        }}
      >
        <Alert severity="error">{error}</Alert>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper
        sx={{
          p: 3,
          pb: 4.5, // Padding en bas pour laisser de la place à la barre de progression
          mb: 3,
          width: expanded ? "1200px" : "400px", // Largeur animable avec valeurs spécifiques (1200px quand ouvert)
          minWidth: "400px", // Largeur minimale
          maxHeight: expanded ? "none" : "200px",
          height: expanded ? "auto" : "200px",
          backgroundColor: "white",
          borderRadius: "16px", // rounded-2xl
          border: "1px solid #f1f5f9", // border-slate-100
          boxShadow: expanded 
            ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)" 
            : "0 1px 2px 0 rgb(0 0 0 / 0.05)", // shadow plus forte quand ouvert
          transition: "width 0.5s ease-in-out, height 1s ease-in-out, max-height 1s ease-in-out, box-shadow 0.6s ease-in-out", // transition width plus rapide (0.5s)
          position: "relative", // Pour positionner le bouton et la barre de progression
          overflow: expanded ? "visible" : "visible", // Toujours visible pour la barre de progression
          overflowY: expanded ? "visible" : "hidden", // Masquer le contenu vertical quand fermé
          zIndex: expanded ? 10 : 1, // Passer devant les autres éléments quand ouvert
          "&:hover": {
            boxShadow: expanded 
              ? "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)"
              : "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)", // hover:shadow-md
          },
        }}
      >
      {/* Titre de la section */}
      <Typography
        variant="h6"
        component="h3"
        sx={{
          mb: 3,
          color: "#64748b", // text-slate-500
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        Situations Entrées
      </Typography>

      {/* Section principale : Statistiques à gauche, Icône rapprochée */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 0.5, // Très proche
          mb: 3,
        }}
      >
        {/* Statistiques à gauche */}
        <Box>
          {/* Nombre de situations avec label */}
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
                color: "#1e293b", // text-slate-800 - gris très foncé
                fontWeight: "bold",
                lineHeight: 1,
              }}
            >
              {nombreSituations}
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: "#94a3b8", // text-slate-400 - gris clair
                fontWeight: 500,
              }}
            >
              SITUATIONS
            </Typography>
          </Box>

          {/* Montant */}
          <Typography
            variant="h6"
            sx={{
              color: "#64748b", // text-slate-500 - gris moyen
              fontWeight: 600,
            }}
          >
            Montant:{" "}
            <Box component="span" sx={{ color: "#6366f1" }}>
              {formatNumber(montantHTCumule)} €
            </Box>
          </Typography>
        </Box>

        {/* Icône circulaire - rapprochée des statistiques */}
        <Box
          sx={{
            backgroundColor: "#eef2ff", // bg-indigo-50 - fond indigo très clair
            borderRadius: "50%", // cercle
            width: 100, // 100px
            height: 100, // 100px
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            alignSelf: "flex-start", // Alignée en haut
            position: "relative",
            bottom: "30px",
            right: "-40px",
            
          }}
        >
          <DescriptionIcon
            sx={{
              fontSize: 50, // Proportionnel à la taille du cercle
              color: "#1976d2", // bleu de l'application
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
          height: "6px", // h-1.5 (1.5 * 4px = 6px)
          backgroundColor: "#f8fafc", // bg-slate-50
          borderRadius: "0 0 16px 16px", // Arrondi en bas pour correspondre au Paper
          overflow: "hidden",
          zIndex: 2, // Au-dessus du contenu pour être toujours visible
        }}
      >
        <Box
          sx={{
            height: "100%",
            width: `${pourcentageValidees}%`, // Pourcentage de situations validées/facturées
            backgroundColor: "#6366f1", // indigo-500 - barre de progression
            borderRadius: "0 0 0 16px", // Arrondi en bas à gauche
            transition: "width 0.3s ease",
          }}
        />
      </Box>

      {/* Bouton discret en bas à droite - au-dessus de la barre de progression */}
      <IconButton
        onClick={() => toggleAccordion(accordionId)}
        sx={{
          position: "absolute",
          bottom: 18, // Au-dessus de la barre de progression (6px + 12px de marge)
          right: 12,
          width: 32,
          height: 32,
          backgroundColor: "transparent",
          color: "#9ca3af", // gris discret
          zIndex: 2, // Au-dessus de la barre de progression
          "&:hover": {
            backgroundColor: "#f3f4f6", // gris très clair au hover
            color: "#374151", // gris foncé au hover
          },
          transition: "all 0.2s ease",
        }}
        size="small"
      >
        <ExpandMoreIcon
          sx={{
            fontSize: 20,
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.6s ease-in-out", // transition plus lente
          }}
        />
      </IconButton>

      {/* Liste des situations - affichée conditionnellement dans la carte */}
      {expanded && (
        <Box
          sx={{
            mt: 2,
            width: "100%",
            // Pas de maxHeight ni overflow pour afficher tout le tableau
            transition: "all 0.6s ease-in-out", // transition plus lente
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
                <TableRow sx={{ backgroundColor: "#eef2ff" }}> {/* bg-indigo-50 */}
                  <TableCell sx={{ fontWeight: "bold", color: "#4f46e5" }}>
                    N° Situation
                  </TableCell>
                  <TableCell sx={{ fontWeight: "bold", color: "#4f46e5" }}>
                    Chantier
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: "bold", color: "#4f46e5" }}
                    align="center"
                  >
                    Période
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: "bold", color: "#4f46e5" }}
                    align="center"
                  >
                    % Avancement
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: "bold", color: "#4f46e5" }}
                    align="right"
                  >
                    Montant HT
                  </TableCell>
                  <TableCell
                    sx={{ fontWeight: "bold", color: "#4f46e5" }}
                    align="center"
                  >
                    Statut
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {situations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                      <Typography variant="body2" color="text.secondary">
                        Aucune situation pour l'année {selectedYear}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  situations.map((situation, index) => (
                    <TableRow
                      key={situation.id}
                      hover
                      sx={{
                        backgroundColor: index % 2 === 0 ? "#fafafa" : "#fff",
                        "&:hover": {
                          backgroundColor: "action.hover",
                        },
                      }}
                    >
                      <TableCell>
                        <Typography
                          onClick={() => handlePreviewSituation(situation.id)}
                          sx={{
                            cursor: "pointer",
                            color: "#4f46e5", // indigo-600
                            fontWeight: 600,
                            "&:hover": {
                              textDecoration: "underline",
                              color: "#6366f1", // indigo-500 au hover
                            },
                          }}
                        >
                          {situation.numero_situation}
                        </Typography>
                      </TableCell>
                      <TableCell>{situation.chantier_name || "-"}</TableCell>
                      <TableCell align="center">
                        {`${situation.mois.toString().padStart(2, "0")}/${formatYear(situation.annee)}`}
                      </TableCell>
                      <TableCell align="center">
                        {formatNumber(situation.pourcentage_avancement || 0)}%
                      </TableCell>
                      <TableCell
                        align="right"
                        sx={{
                          fontWeight: 500,
                          color: "#4f46e5", // indigo-600 - texte montant
                        }}
                      >
                        {formatNumber(
                          situation.montant_apres_retenues ||
                            situation.montant_total ||
                            0
                        )}{" "}
                        €
                      </TableCell>
                      <TableCell align="center">
                        <Typography
                          variant="body2"
                          onClick={() => handleStatusClick(situation)}
                          sx={{
                            display: "inline-block",
                            px: 1.5,
                            py: 0.5,
                            borderRadius: 1,
                            backgroundColor:
                              situation.statut === "facturee"
                                ? "success.light"
                                : situation.statut === "validee"
                                ? "info.light"
                                : "warning.light",
                            color:
                              situation.statut === "facturee"
                                ? "success.dark"
                                : situation.statut === "validee"
                                ? "info.dark"
                                : "warning.dark",
                            fontWeight: 500,
                            textTransform: "capitalize",
                            cursor: "pointer",
                            "&:hover": {
                              opacity: 0.8,
                              transform: "scale(1.05)",
                            },
                            transition: "all 0.2s ease",
                          }}
                        >
                          {situation.statut === "facturee"
                            ? "Facturée"
                            : situation.statut === "validee"
                            ? "Validée"
                            : "Brouillon"}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
      </Paper>

      {/* Modal de changement de statut */}
      <StatusChangeModal
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setSituationToUpdate(null);
        }}
        currentStatus={situationToUpdate?.statut || "brouillon"}
        onStatusChange={handleStatusUpdate}
        statusOptions={statusOptions}
        title="Modifier le statut de la situation"
        type="situation"
      />
    </Box>
  );
};

export default SituationsSummary;

