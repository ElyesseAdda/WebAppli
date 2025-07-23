import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  LinearProgress,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import axios from "axios";
import dayjs from "dayjs";
import React, { useEffect, useRef } from "react";
import {
  FaCheckCircle,
  FaChevronDown,
  FaClipboardList,
  FaExclamationCircle,
  FaFileInvoice,
  FaHandshake,
  FaHourglassHalf,
  FaTable,
} from "react-icons/fa";
import SituationCreationModal from "../CreationDocument/SituationCreationModal";
import SousTraitanceModal from "../SousTraitance/SousTraitanceModal";

const ChantierInfoTab = ({ chantierData, onUpdate, state, setState }) => {
  const {
    openSousTraitance = false,
    openSituationModal = false,
    filters = {},
    openAccordions = {},
  } = state;
  const setOpenSousTraitance = (val) =>
    setState({ ...state, openSousTraitance: val });
  const setOpenSituationModal = (val) =>
    setState({ ...state, openSituationModal: val });
  const setFilters = (newFilters) =>
    setState({ ...state, filters: newFilters });
  const setOpenAccordions = (newOpen) =>
    setState({ ...state, openAccordions: newOpen });

  // State local pour tout ce qui n'a pas besoin d'être global
  const [tauxFacturationData, setTauxFacturationData] = React.useState(null);
  const [loadingTaux, setLoadingTaux] = React.useState(false);
  const [openModal, setOpenModal] = React.useState(false);
  const [selectedSituation, setSelectedSituation] = React.useState(null);
  const [dateEnvoi, setDateEnvoi] = React.useState(null);
  const [delaiPaiement, setDelaiPaiement] = React.useState("");
  const [devisChantier, setDevisChantier] = React.useState(null);
  const [loadingDevis, setLoadingDevis] = React.useState(false);
  const [openPaiementModal, setOpenPaiementModal] = React.useState(false);
  const [selectedSituationPaiement, setSelectedSituationPaiement] =
    React.useState(null);
  const [montantRecu, setMontantRecu] = React.useState("");
  const [datePaiementReel, setDatePaiementReel] = React.useState("");
  const [mainOeuvreReelle, setMainOeuvreReelle] = React.useState(0);
  const [loadingMainOeuvre, setLoadingMainOeuvre] = React.useState(false);

  const hasLoadedTaux = useRef(false);
  useEffect(() => {
    if (!chantierData?.id) return;
    if (!hasLoadedTaux.current) {
      setLoadingTaux(true);
      axios
        .get(`/api/chantier/${chantierData.id}/taux-facturation/`)
        .then((res) => setTauxFacturationData(res.data))
        .finally(() => setLoadingTaux(false));
      hasLoadedTaux.current = true;
    }
  }, [chantierData?.id]);

  useEffect(() => {
    if (chantierData?.id) {
      setLoadingDevis(true);
      axios
        .get("/api/devisa/", {
          params: {
            chantier: chantierData.id,
            devis_chantier: true,
          },
        })
        .then((res) => {
          setDevisChantier(
            res.data && res.data.length > 0 ? res.data[0] : null
          );
        })
        .catch(() => setDevisChantier(null))
        .finally(() => setLoadingDevis(false));
    }
  }, [chantierData?.id]);

  // Récupérer la main d'œuvre réelle depuis l'API recap-financier
  useEffect(() => {
    const fetchMainOeuvreReelle = async () => {
      if (!chantierData?.id) {
        setMainOeuvreReelle(0);
        return;
      }

      setLoadingMainOeuvre(true);
      try {
        // Récupérer les données depuis l'API recap-financier (global)
        const res = await axios.get(
          `/api/chantier/${chantierData.id}/recap-financier/`
        );

        // Extraire la main d'œuvre des données recap-financier
        const mainOeuvre = res.data.sorties?.paye?.main_oeuvre || { total: 0 };
        setMainOeuvreReelle(mainOeuvre.total || 0);
      } catch (error) {
        console.error(
          "Erreur lors du chargement de la main d'œuvre réelle:",
          error
        );
        setMainOeuvreReelle(0);
      } finally {
        setLoadingMainOeuvre(false);
      }
    };

    fetchMainOeuvreReelle();
  }, [chantierData?.id]);

  const handleSousTraitanceUpdate = () => {
    if (onUpdate) {
      onUpdate();
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(montant || 0);
  };

  // Données factices pour l'exemple, à remplacer par les vraies données du backend
  const tauxFacturation = chantierData?.taux_facturation || 50; // en %
  const nombreDevis = chantierData?.stats_devis?.envoyes || 11;
  const statsDevis = chantierData?.stats_devis || {
    termines: 6,
    en_cours: 2,
    attente_signature: 3,
    refuses: 1,
  };

  const MultiColorProgressBar = ({ pourcentages, montants }) => (
    <Box
      sx={{
        display: "flex",
        height: 16,
        borderRadius: 8,
        overflow: "hidden",
        mb: 1,
      }}
    >
      {/* Non envoyées */}
      {pourcentages?.non_envoye > 0 && (
        <Tooltip
          title={`Non envoyées : ${montants.non_envoye.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
          })}`}
        >
          <Box
            sx={{ width: `${pourcentages.non_envoye}%`, background: "#ff9800" }}
          />
        </Tooltip>
      )}
      {/* En attente paiement */}
      {pourcentages?.en_attente > 0 && (
        <Tooltip
          title={`En attente paiement : ${montants.en_attente.toLocaleString(
            "fr-FR",
            { style: "currency", currency: "EUR" }
          )}`}
        >
          <Box
            sx={{ width: `${pourcentages.en_attente}%`, background: "#1976d2" }}
          />
        </Tooltip>
      )}
      {/* Retard de paiement */}
      {pourcentages?.retard > 0 && (
        <Tooltip
          title={`Retard de paiement : ${montants.retard.toLocaleString(
            "fr-FR",
            { style: "currency", currency: "EUR" }
          )}`}
        >
          <Box
            sx={{ width: `${pourcentages.retard}%`, background: "#d32f2f" }}
          />
        </Tooltip>
      )}
      {/* Payées */}
      {pourcentages?.paye > 0 && (
        <Tooltip
          title={`Payées : ${montants.paye.toLocaleString("fr-FR", {
            style: "currency",
            currency: "EUR",
          })}`}
        >
          <Box sx={{ width: `${pourcentages.paye}%`, background: "#2e7d32" }} />
        </Tooltip>
      )}
    </Box>
  );

  const handleOpenModal = (situation) => {
    setSelectedSituation(situation);
    setDateEnvoi(situation.date_envoi ? dayjs(situation.date_envoi) : null);
    setDelaiPaiement(situation.delai_paiement || "");
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setSelectedSituation(null);
    setDateEnvoi(null);
    setDelaiPaiement("");
  };

  const handleSaveDates = async () => {
    if (!dateEnvoi || !delaiPaiement) return;
    try {
      await axios.patch(`/api/situations/${selectedSituation.id}/`, {
        date_envoi: dateEnvoi,
        delai_paiement: Number(delaiPaiement),
      });
      setOpenModal(false);
      setSelectedSituation(null);
      setDateEnvoi(null);
      setDelaiPaiement("");
      // Recharge les données
      axios
        .get(`/api/chantier/${chantierData.id}/taux-facturation/`)
        .then((res) => setTauxFacturationData(res.data));
    } catch (error) {
      alert("Erreur lors de la mise à jour des dates.");
    }
  };

  const isRetardPaiement = (situation) => {
    if (
      situation.date_envoi &&
      !situation.date_paiement_reel &&
      situation.delai_paiement
    ) {
      const dateLimite = new Date(
        new Date(situation.date_envoi).getTime() +
          situation.delai_paiement * 24 * 60 * 60 * 1000
      );
      return new Date() > dateLimite;
    }
    return false;
  };

  const { montants, pourcentages, situations } = tauxFacturationData || {};

  const getCategorieColor = (categorie) => {
    switch (categorie) {
      case "non_envoye":
        return "#ff9800"; // orange
      case "en_attente":
        return "#1976d2"; // bleu
      case "retard":
        return "#d32f2f"; // rouge
      case "paye":
        return "#2e7d32"; // vert
      default:
        return "inherit";
    }
  };

  const handleOpenPaiementModal = (situation) => {
    setSelectedSituationPaiement(situation);
    setMontantRecu(situation.montant_recu || "");
    setDatePaiementReel(situation.date_paiement_reel || "");
    setOpenPaiementModal(true);
  };

  return (
    <Box>
      {/* Nouvelle section d'informations principales */}
      <Card
        sx={{
          mb: 3,
          borderRadius: "10px",
          backgroundColor: "white",
          boxShadow: 4,
        }}
      >
        <CardContent>
          <Grid container spacing={4}>
            {/* Nom du chantier */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Nom du chantier :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                }}
              >
                {chantierData?.nom || "Non défini"}
              </Typography>
            </Grid>

            {/* Nom client */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Nom client :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                }}
              >
                {chantierData?.societe?.client?.nom || "Non défini"}
              </Typography>
            </Grid>

            {/* Société */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Société :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                }}
              >
                {chantierData?.societe?.nom || "Non défini"}
              </Typography>
            </Grid>

            {/* Date de création */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Date de création :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                }}
              >
                {formatDate(chantierData?.dates?.debut)}
              </Typography>
            </Grid>

            {/* Statut */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: "#6e6e6e",
                  mb: 1,
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                Statut :
              </Typography>
              <Typography
                variant="h6"
                sx={{
                  fontFamily: "Roboto, Arial, sans-serif",
                  fontWeight: 700,
                  fontSize: "1.1rem",
                  color: "text.primary",
                  display: "inline-block",
                }}
              >
                <span
                  style={{
                    backgroundColor:
                      chantierData?.statut === "En Cours"
                        ? "rgba(46, 125, 50, 0.1)"
                        : chantierData?.statut === "Terminé"
                        ? "rgba(211, 47, 47, 0.1)"
                        : "#e0e0e0",
                    color:
                      chantierData?.statut === "En Cours"
                        ? "#2e7d32"
                        : chantierData?.statut === "Terminé"
                        ? "#d32f2f"
                        : "#757575",
                    borderRadius: 8,
                    padding: "2px 12px",
                    fontWeight: 700,
                    fontSize: "1.1rem",
                  }}
                >
                  {chantierData?.statut || "Non défini"}
                </span>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Bouton Sous-traitance */}
      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <Button
          variant="contained"
          startIcon={<FaHandshake />}
          onClick={() => setOpenSousTraitance(true)}
          sx={{
            backgroundColor: "#1976d2",
            boxShadow: 3,
            "&:hover": {
              backgroundColor: "#1565c0",
              boxShadow: 5,
            },
          }}
        >
          Gérer les sous-traitants
        </Button>
        <Button
          variant="contained"
          startIcon={<FaClipboardList />}
          color="success"
          onClick={() => setOpenSituationModal(true)}
          sx={{
            backgroundColor: "#388e3c",
            boxShadow: 3,
            "&:hover": {
              backgroundColor: "#2e7d32",
              boxShadow: 5,
            },
          }}
        >
          Gérer les situations
        </Button>
        <Button
          variant="contained"
          startIcon={<FaFileInvoice />}
          onClick={() => {
            window.open(
              `/CreationDevis?chantier_id=${chantierData?.id}`,
              "_blank"
            );
          }}
          sx={{
            backgroundColor: "#ff9800",
            color: "white",
            boxShadow: 3,
            "&:hover": {
              backgroundColor: "#fb8c00",
              boxShadow: 5,
            },
          }}
        >
          Créer un nouveau devis
        </Button>
        <Button
          variant="contained"
          startIcon={<FaTable />}
          onClick={() => {
            window.open(
              `/TableauSuivi?chantier_id=${chantierData?.id}`,
              "_blank"
            );
          }}
          sx={{
            backgroundColor: "#424242",
            color: "white",
            boxShadow: 3,
            "&:hover": {
              backgroundColor: "#212121",
              boxShadow: 5,
            },
          }}
        >
          Afficher tableau suivi
        </Button>
      </Box>

      {/* Modal de sous-traitance */}
      <SousTraitanceModal
        open={openSousTraitance}
        onClose={() => setOpenSousTraitance(false)}
        chantierId={chantierData?.id}
        onUpdate={handleSousTraitanceUpdate}
      />

      {/* Situation Creation Modal */}
      <SituationCreationModal
        open={openSituationModal}
        onClose={() => setOpenSituationModal(false)}
        devis={devisChantier}
        chantier={chantierData}
        onCreated={() => {
          axios
            .get(`/api/chantier/${chantierData.id}/taux-facturation/`)
            .then((res) => setTauxFacturationData(res.data));
        }}
      />

      {/* Blocs Réel/Prévisionnel à gauche, Taux de facturation à droite */}
      <Grid container spacing={3}>
        {/* Colonne gauche : Réel & Prévisionnel */}
        <Grid item xs={12} md={4}>
          <Grid container spacing={3}>
            {/* Bloc Prévisionnel */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Titre Prévisionnel */}
                <Card
                  sx={{
                    borderRadius: "10px",
                    backgroundColor: "white",
                    boxShadow: 4,
                  }}
                >
                  <CardContent sx={{ pt: 0.5, pb: 0 + " !important" }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textAlign: "center",
                        fontSize: "1rem",
                        mb: 0,
                        fontFamily: "Roboto Slab, serif",
                      }}
                    >
                      Prévisionnel
                    </Typography>
                  </CardContent>
                </Card>

                {/* Main d'œuvre prévisionnelle */}
                <Card
                  sx={{
                    borderRadius: "10px",
                    backgroundColor: "white",
                    boxShadow: 4,
                  }}
                >
                  <CardContent sx={{ py: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        alignItems: "center",
                        textAlign: "center",
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color: "#388e3c",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Main d'œuvre
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_estime_main_oeuvre)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            color: "#d32f2f",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Matériel
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_estime_materiel)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            color: "#1976d2",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Sous-traitance
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_sous_traitance)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                {/* Total Prévisionnel */}
                <Card
                  sx={{
                    borderRadius: "10px",
                    backgroundColor: "white",
                    boxShadow: 4,
                  }}
                >
                  <CardContent>
                    <Typography
                      align="center"
                      sx={{
                        fontWeight: 700,
                        color: "#1976d2",
                        fontFamily: "Roboto, Arial, sans-serif",
                      }}
                    >
                      Total:{" "}
                      {formatMontant(
                        (chantierData?.cout_estime_main_oeuvre || 0) +
                          (chantierData?.cout_estime_materiel || 0) +
                          (chantierData?.cout_sous_traitance || 0)
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
            {/* Bloc Réel */}
            <Grid item xs={12} sm={6}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {/* Titre Réel */}
                <Card
                  sx={{
                    borderRadius: "10px",
                    backgroundColor: "white",
                    boxShadow: 4,
                  }}
                >
                  <CardContent sx={{ pt: 0.5, pb: 0 + " !important" }}>
                    <Typography
                      variant="subtitle2"
                      sx={{
                        fontWeight: 700,
                        textAlign: "center",
                        fontSize: "1rem",
                        mb: 0,
                        fontFamily: "Roboto Slab, serif",
                      }}
                    >
                      Réel
                    </Typography>
                  </CardContent>
                </Card>

                {/* Main d'œuvre réelle */}
                <Card
                  sx={{
                    borderRadius: "10px",
                    backgroundColor: "white",
                    boxShadow: 4,
                  }}
                >
                  <CardContent sx={{ py: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 1,
                        alignItems: "center",
                        textAlign: "center",
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            color: "#388e3c",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Main d'œuvre
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {loadingMainOeuvre ? (
                            <span style={{ color: "#1976d2" }}>
                              Chargement...
                            </span>
                          ) : (
                            formatMontant(mainOeuvreReelle)
                          )}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            color: "#d32f2f",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Matériel
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_materiel)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          sx={{
                            color: "#1976d2",
                            fontWeight: 600,
                            fontSize: "1rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          Sous-traitance
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: "0.95rem",
                            fontFamily: "Roboto, Arial, sans-serif",
                          }}
                        >
                          {formatMontant(chantierData?.cout_sous_traitance)}
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
                {/* Total Réel */}
                <Card
                  sx={{
                    borderRadius: "10px",
                    backgroundColor: "white",
                    boxShadow: 4,
                  }}
                >
                  <CardContent>
                    <Typography
                      align="center"
                      sx={{
                        fontWeight: 700,
                        color: "#1976d2",
                        fontFamily: "Roboto, Arial, sans-serif",
                      }}
                    >
                      Total:{" "}
                      {formatMontant(
                        (mainOeuvreReelle || 0) +
                          (chantierData?.cout_materiel || 0) +
                          (chantierData?.cout_sous_traitance || 0)
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Grid>
            {/* Carte de marge unique */}
            <Grid item xs={12}>
              <Card
                sx={{
                  borderRadius: "10px",
                  backgroundColor: "white",
                  boxShadow: 4,
                }}
              >
                <CardContent>
                  <Typography
                    align="center"
                    sx={{
                      fontWeight: 700,
                      fontFamily: "Roboto, Arial, sans-serif",
                      color:
                        (chantierData?.cout_estime_main_oeuvre || 0) +
                          (chantierData?.cout_estime_materiel || 0) +
                          (chantierData?.cout_sous_traitance || 0) -
                          ((chantierData?.cout_main_oeuvre || 0) +
                            (chantierData?.cout_materiel || 0) +
                            (chantierData?.cout_sous_traitance || 0)) >=
                        0
                          ? "#2e7d32"
                          : "#d32f2f",
                    }}
                  >
                    Marge:{" "}
                    {formatMontant(
                      (chantierData?.cout_estime_main_oeuvre || 0) +
                        (chantierData?.cout_estime_materiel || 0) +
                        (chantierData?.cout_sous_traitance || 0) -
                        ((mainOeuvreReelle || 0) +
                          (chantierData?.cout_materiel || 0) +
                          (chantierData?.cout_sous_traitance || 0))
                    )}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
        {/* Colonne droite : Taux de facturation */}
        <Grid item xs={12} md={8}>
          <Card
            sx={{
              borderRadius: "10px",
              backgroundColor: "white",
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              mt: 3,
              boxShadow: 4,
            }}
          >
            <CardContent sx={{ pt: 0.5, pb: 0.5 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  variant="subtitle1"
                  sx={{
                    fontWeight: 700,
                    fontFamily: "Roboto Slab, serif",
                  }}
                >
                  Taux de facturation :
                </Typography>
                <Box sx={{ textAlign: "right" }}>
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: 700,
                      color: "#1976d2",
                      fontFamily: "Roboto, Arial, sans-serif",
                    }}
                  >
                    Total facturé :{" "}
                    {formatMontant(tauxFacturationData?.montant_total)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      color: "#6e6e6e",
                      fontFamily: "Roboto, Arial, sans-serif",
                    }}
                  >
                    Marché :{" "}
                    {formatMontant(
                      chantierData?.montant_marche || chantierData?.montant_ht
                    )}
                  </Typography>
                </Box>
              </Box>
              {loadingTaux ? (
                <LinearProgress />
              ) : tauxFacturationData ? (
                <>
                  <MultiColorProgressBar
                    pourcentages={pourcentages}
                    montants={montants}
                  />
                  {/* Légende */}
                  <Box
                    sx={{
                      display: "flex",
                      gap: 2,
                      alignItems: "center",
                      mb: 2,
                      fontWeight: 400,
                      fontSize: "0.65rem",
                    }}
                  >
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        bgcolor: "#ff9800",
                        borderRadius: "50%",
                      }}
                    />{" "}
                    <Typography component="span" sx={{ fontSize: "0.85rem" }}>
                      Non envoyées
                    </Typography>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        bgcolor: "#1976d2",
                        borderRadius: "50%",
                      }}
                    />{" "}
                    <Typography component="span" sx={{ fontSize: "0.85rem" }}>
                      En attente paiement
                    </Typography>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        bgcolor: "#2e7d32",
                        borderRadius: "50%",
                      }}
                    />{" "}
                    <Typography component="span" sx={{ fontSize: "0.85rem" }}>
                      Payées
                    </Typography>
                    <Box
                      sx={{
                        width: 16,
                        height: 16,
                        bgcolor: "#d32f2f",
                        borderRadius: "50%",
                      }}
                    />{" "}
                    <Typography component="span" sx={{ fontSize: "0.85rem" }}>
                      Retard de paiement
                    </Typography>
                  </Box>
                  {/* Accordéon des situations */}
                  {situations.map((situation) => (
                    <Accordion key={situation.id}>
                      <AccordionSummary expandIcon={<FaChevronDown />}>
                        <Typography sx={{ fontWeight: 700 }}>
                          {situation.numero_situation} – {situation.mois}/
                          {situation.annee}
                        </Typography>
                        <Typography
                          sx={{
                            ml: 2,
                            fontWeight: 700,
                            color: getCategorieColor(situation.categorie),
                          }}
                        >
                          {situation.montant_apres_retenues.toLocaleString(
                            "fr-FR",
                            { style: "currency", currency: "EUR" }
                          )}
                        </Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        {!situation.date_envoi ? (
                          <>
                            <Typography color="warning.main">
                              Date d'envoi et délai de paiement non définis
                            </Typography>
                            <Button
                              variant="outlined"
                              onClick={() => handleOpenModal(situation)}
                            >
                              Définir les dates
                            </Button>
                          </>
                        ) : (
                          <>
                            <Typography>
                              Date d'envoi :{" "}
                              {new Date(
                                situation.date_envoi
                              ).toLocaleDateString("fr-FR")}
                            </Typography>
                            <Typography>
                              Délai de paiement : {situation.delai_paiement}{" "}
                              jours
                            </Typography>
                            <Typography>
                              Date limite de paiement :{" "}
                              {situation.date_envoi && situation.delai_paiement
                                ? new Date(
                                    new Date(situation.date_envoi).getTime() +
                                      situation.delai_paiement *
                                        24 *
                                        60 *
                                        60 *
                                        1000
                                  ).toLocaleDateString("fr-FR")
                                : "-"}
                            </Typography>
                            <Typography>
                              Statut de paiement :{" "}
                              {situation.date_paiement_reel ? (
                                <>
                                  <FaCheckCircle
                                    color="#2e7d32"
                                    style={{ verticalAlign: "middle" }}
                                  />{" "}
                                  Payée
                                </>
                              ) : isRetardPaiement(situation) ? (
                                <>
                                  <FaExclamationCircle
                                    color="#d32f2f"
                                    style={{ verticalAlign: "middle" }}
                                  />{" "}
                                  Retard de paiement
                                </>
                              ) : situation.date_envoi ? (
                                <>
                                  <FaHourglassHalf
                                    color="#1976d2"
                                    style={{ verticalAlign: "middle" }}
                                  />{" "}
                                  En attente
                                </>
                              ) : (
                                <>
                                  <FaExclamationCircle
                                    color="#ff9800"
                                    style={{ verticalAlign: "middle" }}
                                  />{" "}
                                  Non envoyée
                                </>
                              )}
                            </Typography>
                            {!situation.date_paiement_reel && (
                              <Button
                                variant="outlined"
                                color="success"
                                sx={{ mt: 1, mb: 1 }}
                                onClick={() =>
                                  handleOpenPaiementModal(situation)
                                }
                              >
                                Définir paiement
                              </Button>
                            )}
                          </>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  ))}
                </>
              ) : (
                <Typography color="error">
                  Aucune donnée de facturation disponible.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog open={openModal} onClose={handleCloseModal}>
        <DialogTitle>Date d'envoi et délai de paiement</DialogTitle>
        <DialogContent>
          <Box sx={{ p: 2 }}>
            <TextField
              type="date"
              label="Date d'envoi"
              value={
                dateEnvoi
                  ? typeof dateEnvoi === "string"
                    ? dateEnvoi
                    : dayjs(dateEnvoi).format("YYYY-MM-DD")
                  : ""
              }
              onChange={(e) => setDateEnvoi(e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              InputLabelProps={{ shrink: true }}
            />
            <Select
              value={delaiPaiement}
              onChange={(e) => setDelaiPaiement(e.target.value)}
              fullWidth
              displayEmpty
              sx={{ mb: 2 }}
            >
              <MenuItem value="">
                <em>Choisir un délai</em>
              </MenuItem>
              <MenuItem value={45}>45 jours</MenuItem>
              <MenuItem value={60}>60 jours</MenuItem>
            </Select>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Annuler</Button>
          <Button
            onClick={handleSaveDates}
            disabled={!dateEnvoi || !delaiPaiement}
            variant="contained"
          >
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openPaiementModal}
        onClose={() => setOpenPaiementModal(false)}
      >
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
          <Button onClick={() => setOpenPaiementModal(false)}>Annuler</Button>
          <Button
            onClick={async () => {
              try {
                await axios.patch(
                  `/api/situations/${selectedSituationPaiement.id}/`,
                  {
                    montant_recu: montantRecu,
                    date_paiement_reel: datePaiementReel,
                  }
                );
                setOpenPaiementModal(false);
                setSelectedSituationPaiement(null);
                setMontantRecu("");
                setDatePaiementReel("");
                // Rafraîchir les données
                axios
                  .get(`/api/chantier/${chantierData.id}/taux-facturation/`)
                  .then((res) => setTauxFacturationData(res.data));
              } catch (error) {
                alert("Erreur lors de la mise à jour du paiement.");
              }
            }}
            variant="contained"
            disabled={!montantRecu || !datePaiementReel}
          >
            Valider
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChantierInfoTab;
