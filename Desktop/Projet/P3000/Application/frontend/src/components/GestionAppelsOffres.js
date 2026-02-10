import {
  Delete as DeleteIcon,
  Transform as TransformIcon,
  Visibility as VisibilityIcon,
  Folder as FolderIcon,
  Sync as SyncIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
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
  Tooltip,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import DrivePathSelector from "./Devis/DrivePathSelector";

// Fonction pour slugifier un texte (similaire à custom_slugify du backend)
const customSlugify = (text) => {
  if (!text) return '';
  // Remplacer les espaces multiples par un seul espace
  text = text.trim().replace(/\s+/g, ' ');
  // Remplacer les espaces par des tirets
  text = text.replace(/\s/g, '-');
  // Supprimer les caractères spéciaux sauf les tirets
  text = text.replace(/[^a-zA-Z0-9-]/g, '');
  // Supprimer les tirets multiples
  text = text.replace(/-+/g, '-');
  // Supprimer les tirets en début et fin
  text = text.replace(/^-+|-+$/g, '');
  return text;
};

// Fonction utilitaire pour nettoyer le drive_path (retirer les préfixes Appels_Offres/ et Chantiers/)
const cleanDrivePath = (drivePath) => {
  if (!drivePath) {
    return null;
  }
  
  let path = String(drivePath).trim();
  
  // Retirer les préfixes Appels_Offres/ et Chantiers/
  if (path.startsWith('Appels_Offres/')) {
    path = path.substring('Appels_Offres/'.length);
  } else if (path.startsWith('Chantiers/')) {
    path = path.substring('Chantiers/'.length);
  }
  
  // Nettoyer les slashes en début et fin
  path = path.replace(/^\/+|\/+$/g, '');
  
  // Retourner null si vide après nettoyage
  if (!path) {
    return null;
  }
  
  return path;
};

const GestionAppelsOffres = () => {
  const [appelsOffres, setAppelsOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAppelOffres, setSelectedAppelOffres] = useState(null);
  const [nouveauStatut, setNouveauStatut] = useState("");
  const [raisonRefus, setRaisonRefus] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("success");
  const [transformingId, setTransformingId] = useState(null); // ✅ Pour empêcher les clics multiples
  const [showDrivePathModal, setShowDrivePathModal] = useState(false);
  const [selectedAppelOffresForDrivePath, setSelectedAppelOffresForDrivePath] = useState(null);
  const [showTransformModal, setShowTransformModal] = useState(false);
  const [selectedAppelOffresForTransform, setSelectedAppelOffresForTransform] = useState(null);
  const [syncingMontants, setSyncingMontants] = useState(false);
  const [filterStatut, setFilterStatut] = useState(null); // null = tous, 'valide' | 'en_attente' | 'refuse'

  useEffect(() => {
    fetchAppelsOffres();
  }, []);

  const sortOrderStatut = (ao) => {
    if (ao.deja_transforme) return 0;
    if (ao.statut === "valide") return 1;
    if (ao.statut === "en_attente") return 2;
    if (ao.statut === "refuse") return 3;
    return 4;
  };

  const fetchAppelsOffres = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/appels-offres/");
      const sorted = [...(response.data || [])].sort(
        (a, b) => sortOrderStatut(a) - sortOrderStatut(b)
      );
      setAppelsOffres(sorted);
    } catch (error) {
      showAlert("Erreur lors du chargement des appels d'offres", "error");
    } finally {
      setLoading(false);
    }
  };

  const showAlert = (message, severity = "success") => {
    setAlertMessage(message);
    setAlertSeverity(severity);
    setTimeout(() => setAlertMessage(""), 5000);
  };

  const handleRafraichirMontants = async () => {
    try {
      setSyncingMontants(true);
      const response = await axios.post("/api/appels-offres/sync_montants_depuis_devis/", {});
      const { updated, skipped, errors } = response.data;
      fetchAppelsOffres();
      if (errors > 0) {
        showAlert(
          `${updated} montant(s) mis à jour. ${errors} erreur(s).`,
          "warning"
        );
      } else if (updated > 0) {
        showAlert(
          `${updated} appel(s) d'offres mis à jour depuis le devis de chantier.`,
          "success"
        );
      } else {
        showAlert(
          "Aucune mise à jour nécessaire (montants déjà à jour).",
          "info"
        );
      }
    } catch (error) {
      const msg = error.response?.data?.error || "Erreur lors du rafraîchissement des montants";
      showAlert(msg, "error");
    } finally {
      setSyncingMontants(false);
    }
  };

  const handleTransformerEnChantier = (appelOffres) => {
    // Ouvrir le modal pour sélectionner le drive_path
    setSelectedAppelOffresForTransform(appelOffres);
    setShowTransformModal(true);
  };

  const handleConfirmTransform = async (selectedPath) => {
    if (!selectedAppelOffresForTransform) {
      return;
    }

    const appelOffresId = selectedAppelOffresForTransform.id;
    
    // ✅ Empêcher les clics multiples
    if (transformingId === appelOffresId) {
      return;
    }
    
    try {
      setTransformingId(appelOffresId);
      
      // ✅ Utiliser le chemin validé par l'utilisateur tel quel, sans modification
      const drivePathValue = selectedPath ? String(selectedPath).trim() : null;
      
      // Appeler l'API avec le drive_path tel quel (sans modification)
      const response = await axios.post(
        `/api/appels-offres/${appelOffresId}/transformer_en_chantier/`,
        { drive_path: drivePathValue }
      );
      showAlert("Appel d'offres transformé en chantier avec succès !");
      fetchAppelsOffres();
      setShowTransformModal(false);
      setSelectedAppelOffresForTransform(null);
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Erreur lors de la transformation";
      showAlert(errorMessage, "error");
      
      // ✅ Si l'appel d'offres a déjà été transformé, recharger la liste pour mettre à jour l'état
      if (error.response?.data?.deja_transforme) {
        fetchAppelsOffres();
      }
    } finally {
      setTransformingId(null);
    }
  };

  const handleMettreAJourStatut = async () => {
    try {
      await axios.post(
        `/api/appels-offres/${selectedAppelOffres.id}/mettre_a_jour_statut/`,
        {
          statut: nouveauStatut,
          raison_refus: raisonRefus,
        }
      );
      setDialogOpen(false);
      fetchAppelsOffres();
      showAlert("Statut mis à jour avec succès !");
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Erreur lors de la mise à jour";
      showAlert(errorMessage, "error");
    }
  };

  const handleSupprimerAppelOffres = async () => {
    try {
      await axios.delete(
        `/api/appels-offres/${selectedAppelOffres.id}/supprimer_appel_offres/`
      );
      setDeleteDialogOpen(false);
      fetchAppelsOffres();
      showAlert("Appel d'offres supprimé avec succès !");
    } catch (error) {
      const errorMessage =
        error.response?.data?.error || "Erreur lors de la suppression";
      showAlert(errorMessage, "error");
    }
  };

  const getStatutColor = (statut) => {
    const colors = {
      en_attente: "warning",
      valide: "success",
      refuse: "error",
    };
    return colors[statut] || "default";
  };

  const getStatutLabel = (statut) => {
    const labels = {
      en_attente: "En attente validation",
      valide: "Validé",
      refuse: "Refusé",
    };
    return labels[statut] || statut;
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("fr-FR");
  };

  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(montant || 0);
  };

  const statsByStatut = useMemo(() => {
    const validé = appelsOffres.filter((ao) => ao.statut === "valide");
    const enAttente = appelsOffres.filter((ao) => ao.statut === "en_attente");
    const refuse = appelsOffres.filter((ao) => ao.statut === "refuse");
    const sum = (list) => list.reduce((acc, ao) => acc + (ao.montant_ht || 0), 0);
    return {
      tous: { sum: sum(appelsOffres), count: appelsOffres.length },
      valide: { sum: sum(validé), count: validé.length },
      en_attente: { sum: sum(enAttente), count: enAttente.length },
      refuse: { sum: sum(refuse), count: refuse.length },
    };
  }, [appelsOffres]);

  const appelsOffresFiltered =
    filterStatut == null
      ? appelsOffres
      : appelsOffres.filter((ao) => ao.statut === filterStatut);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ mt: 4, textAlign: "center" }}>
          <Typography>Chargement des appels d'offres...</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 2 }}>
          <Typography
            variant="h4"
            sx={{
              color: "white",
              backgroundColor: "transparent",
            }}
          >
            Gestion des Appels d'Offres
          </Typography>
          <Tooltip title="Rafraîchir les montants des appels transformés à partir du devis de chantier actuel">
            <span>
              <Button
                variant="outlined"
                startIcon={<SyncIcon />}
                onClick={handleRafraichirMontants}
                disabled={syncingMontants}
                size="small"
                sx={{ backgroundColor: "white" }}
              >
                {syncingMontants ? "Rafraîchissement…" : "Rafraîchir les montants"}
              </Button>
            </span>
          </Tooltip>
        </Box>

        {alertMessage && (
          <Alert severity={alertSeverity} sx={{ mb: 2 }}>
            {alertMessage}
          </Alert>
        )}

        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            mb: 3,
            alignItems: "stretch",
          }}
        >
          {[
            { key: null, label: "Tous", color: "#6366f1", lightBg: "#eef2ff", stats: statsByStatut.tous },
            { key: "valide", label: "Validé", color: "#10b981", lightBg: "#ecfdf5", stats: statsByStatut.valide },
            { key: "en_attente", label: "En attente", color: "#f59e0b", lightBg: "#fffbeb", stats: statsByStatut.en_attente },
            { key: "refuse", label: "Refusé", color: "#ef4444", lightBg: "#fef2f2", stats: statsByStatut.refuse },
          ].map(({ key, label, color, lightBg, stats }) => {
            const isActive = filterStatut === key;
            return (
              <Box
                key={label}
                onClick={() => setFilterStatut(key)}
                sx={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  px: 2,
                  py: 1,
                  borderRadius: "12px",
                  border: `1.5px solid ${isActive ? color : "transparent"}`,
                  bgcolor: isActive ? lightBg : "rgba(255,255,255,0.06)",
                  backdropFilter: "blur(8px)",
                  boxShadow: isActive
                    ? `0 0 0 1px ${color}22, 0 4px 12px ${color}18`
                    : "0 1px 3px rgba(0,0,0,0.08)",
                  transition: "all 0.25s cubic-bezier(.4,0,.2,1)",
                  minWidth: 140,
                  position: "relative",
                  overflow: "hidden",
                  "&:hover": {
                    border: `1.5px solid ${color}88`,
                    boxShadow: `0 4px 16px ${color}20`,
                    transform: "translateY(-1px)",
                  },
                  "&::before": isActive ? {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: `linear-gradient(90deg, ${color}, ${color}99)`,
                    borderRadius: "12px 12px 0 0",
                  } : {},
                }}
              >
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: color,
                    flexShrink: 0,
                    boxShadow: isActive ? `0 0 8px ${color}66` : "none",
                    transition: "box-shadow 0.25s ease",
                  }}
                />
                <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      color: isActive ? color : "text.secondary",
                      lineHeight: 1.2,
                      transition: "color 0.25s ease",
                    }}
                  >
                    {label}
                    <Box
                      component="span"
                      sx={{
                        ml: 0.5,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        bgcolor: isActive ? color : "rgba(0,0,0,0.1)",
                        color: isActive ? "#fff" : "text.secondary",
                        px: 0.7,
                        py: 0.1,
                        borderRadius: "6px",
                        transition: "all 0.25s ease",
                      }}
                    >
                      {stats.count}
                    </Box>
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: isActive ? color : "text.primary",
                      lineHeight: 1.3,
                      whiteSpace: "nowrap",
                      transition: "color 0.25s ease",
                    }}
                  >
                    {formatMontant(stats.sum)}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>

        <Paper elevation={3}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: "#1976d2" }}>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    Nom du projet
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    Société
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    Montant estimé
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    Statut
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    Date création
                  </TableCell>
                  <TableCell sx={{ color: "white", fontWeight: "bold" }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {appelsOffresFiltered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body1" color="textSecondary">
                        {appelsOffres.length === 0
                          ? "Aucun appel d'offres trouvé"
                          : `Aucun appel d'offres avec le statut sélectionné. Cliquez sur « Tous » pour tout afficher.`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  appelsOffresFiltered.map((appelOffres) => (
                    <TableRow key={appelOffres.id}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {appelOffres.chantier_name}
                          </Typography>
                          {appelOffres.deja_transforme && (
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.5,
                                px: 1,
                                py: 0.25,
                                borderRadius: "6px",
                                bgcolor: "#ecfdf5",
                                border: "1px solid #10b98133",
                              }}
                            >
                              <Box
                                sx={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: "50%",
                                  bgcolor: "#10b981",
                                  boxShadow: "0 0 6px #10b98155",
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: "0.68rem",
                                  fontWeight: 600,
                                  color: "#10b981",
                                  lineHeight: 1,
                                }}
                              >
                                Transformé
                              </Typography>
                            </Box>
                          )}
                        </Box>
                        {appelOffres.description && (
                          <Typography variant="body2" color="textSecondary">
                            {appelOffres.description}
                          </Typography>
                        )}
                        {appelOffres.deja_transforme && appelOffres.chantier_transformé_name && (
                          <Typography variant="body2" color="success.main" sx={{ mt: 0.5, fontStyle: "italic" }}>
                            Chantier : {appelOffres.chantier_transformé_name}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {appelOffres.societe ? (
                          <Typography>
                            {appelOffres.societe.nom_societe}
                          </Typography>
                        ) : (
                          <Typography color="textSecondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          HT: {formatMontant(appelOffres.montant_ht)}
                        </Typography>
                        <Typography variant="body2">
                          TTC: {formatMontant(appelOffres.montant_ttc)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const statutStyles = {
                            valide: { color: "#10b981", bg: "#ecfdf5", border: "#10b98133" },
                            en_attente: { color: "#f59e0b", bg: "#fffbeb", border: "#f59e0b33" },
                            refuse: { color: "#ef4444", bg: "#fef2f2", border: "#ef444433" },
                          };
                          const s = statutStyles[appelOffres.statut] || { color: "#6b7280", bg: "#f3f4f6", border: "#6b728033" };
                          return (
                            <Box
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.75,
                                px: 1.5,
                                py: 0.5,
                                borderRadius: "8px",
                                bgcolor: s.bg,
                                border: `1px solid ${s.border}`,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 7,
                                  height: 7,
                                  borderRadius: "50%",
                                  bgcolor: s.color,
                                  boxShadow: `0 0 6px ${s.color}55`,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: "0.75rem",
                                  fontWeight: 600,
                                  color: s.color,
                                  lineHeight: 1,
                                }}
                              >
                                {getStatutLabel(appelOffres.statut)}
                              </Typography>
                            </Box>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        {formatDate(appelOffres.date_debut)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                          {appelOffres.statut === "valide" && (
                            <Tooltip 
                              title={
                                appelOffres.deja_transforme
                                  ? `Déjà transformé en chantier : ${appelOffres.chantier_transformé_name || "N/A"}`
                                  : "Transformer en chantier"
                              }
                            >
                              <span>
                                <IconButton
                                  color={appelOffres.deja_transforme ? "default" : "success"}
                                  onClick={() =>
                                    !appelOffres.deja_transforme && 
                                    handleTransformerEnChantier(appelOffres)
                                  }
                                  disabled={appelOffres.deja_transforme || transformingId === appelOffres.id}
                                  size="small"
                                >
                                  <TransformIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          )}

                          <Tooltip title="Modifier le chemin du drive">
                            <IconButton
                              color="info"
                              onClick={() => {
                                setSelectedAppelOffresForDrivePath(appelOffres);
                                setShowDrivePathModal(true);
                              }}
                              size="small"
                            >
                              <FolderIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Modifier le statut">
                            <IconButton
                              color="primary"
                              onClick={() => {
                                setSelectedAppelOffres(appelOffres);
                                setNouveauStatut(appelOffres.statut);
                                setRaisonRefus(appelOffres.raison_refus || "");
                                setDialogOpen(true);
                              }}
                              size="small"
                            >
                              <VisibilityIcon />
                            </IconButton>
                          </Tooltip>

                          <Tooltip title="Supprimer l'appel d'offres">
                            <IconButton
                              color="error"
                              onClick={() => {
                                setSelectedAppelOffres(appelOffres);
                                setDeleteDialogOpen(true);
                              }}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* Dialog pour modifier le statut */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Modifier le statut de l'appel d'offres</DialogTitle>
        <DialogContent>
          {selectedAppelOffres && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedAppelOffres.chantier_name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Société:{" "}
                {selectedAppelOffres.societe
                  ? selectedAppelOffres.societe.nom_societe
                  : "Non spécifiée"}
              </Typography>
            </Box>
          )}

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Nouveau statut</InputLabel>
            <Select
              value={nouveauStatut}
              onChange={(e) => setNouveauStatut(e.target.value)}
              label="Nouveau statut"
            >
              <MenuItem value="en_attente">En attente validation</MenuItem>
              <MenuItem value="valide">Validé</MenuItem>
              <MenuItem value="refuse">Refusé</MenuItem>
            </Select>
          </FormControl>

          {nouveauStatut === "refuse" && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Raison du refus"
              value={raisonRefus}
              onChange={(e) => setRaisonRefus(e.target.value)}
              placeholder="Expliquez la raison du refus..."
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleMettreAJourStatut}
            variant="contained"
            disabled={!nouveauStatut}
          >
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          {selectedAppelOffres && (
            <Box>
              <Typography variant="h6" gutterBottom color="error">
                ⚠️ Attention : Cette action est irréversible !
              </Typography>
              <Typography variant="body1" gutterBottom>
                Êtes-vous sûr de vouloir supprimer l'appel d'offres :
              </Typography>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: "bold" }}>
                {selectedAppelOffres.chantier_name}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Société:{" "}
                {selectedAppelOffres.societe
                  ? selectedAppelOffres.societe.nom_societe
                  : "Non spécifiée"}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Statut: {getStatutLabel(selectedAppelOffres.statut)}
              </Typography>
              <Alert severity="error" sx={{ mt: 2 }}>
                <Typography variant="body2" fontWeight="bold" gutterBottom>
                  ⚠️ Cette action supprimera définitivement :
                </Typography>
                <Typography variant="body2" component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>L'appel d'offres et toutes ses données</li>
                  <li>Tous les devis associés à cet appel d'offres</li>
                  <li>Tous les dossiers et fichiers dans le Drive</li>
                </Typography>
                <Typography variant="body2" sx={{ mt: 1, fontWeight: "bold" }}>
                  Cette action est irréversible !
                </Typography>
              </Alert>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
          <Button
            onClick={handleSupprimerAppelOffres}
            variant="contained"
            color="error"
          >
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal pour modifier le chemin du drive */}
      {selectedAppelOffresForDrivePath && (
        <DrivePathSelector
          open={showDrivePathModal}
          onClose={() => {
            setShowDrivePathModal(false);
            setSelectedAppelOffresForDrivePath(null);
          }}
          onSelect={async (selectedPath) => {
            try {
              // ✅ Nettoyer le chemin : retirer les préfixes Appels_Offres/ et Chantiers/
              const drivePathValue = cleanDrivePath(selectedPath);
              
              // Appeler l'API pour mettre à jour le drive_path
              await axios.put(
                `/api/appels-offres/${selectedAppelOffresForDrivePath.id}/update_drive_path/`,
                { drive_path: drivePathValue }
              );
              
              showAlert("Chemin du drive mis à jour avec succès !", "success");
              fetchAppelsOffres(); // Recharger la liste pour afficher le nouveau chemin
              setShowDrivePathModal(false);
              setSelectedAppelOffresForDrivePath(null);
            } catch (error) {
              const errorMessage =
                error.response?.data?.error || "Erreur lors de la mise à jour du chemin";
              showAlert(errorMessage, "error");
            }
          }}
          defaultPath={selectedAppelOffresForDrivePath.drive_path || ''}
        />
      )}

      {/* Modal pour transformer en chantier avec sélection du drive_path */}
      {selectedAppelOffresForTransform && (
        <DrivePathSelector
          open={showTransformModal}
          onClose={() => {
            setShowTransformModal(false);
            setSelectedAppelOffresForTransform(null);
          }}
          onSelect={handleConfirmTransform}
          defaultPath={(() => {
            // Utiliser le drive_path de l'appel d'offres et remplacer Appels_Offres/ par Chantiers/
            const appelOffres = selectedAppelOffresForTransform;
            if (appelOffres.drive_path) {
              let drivePath = appelOffres.drive_path;
              // Remplacer le préfixe Appels_Offres/ par Chantiers/
              if (drivePath.startsWith('Appels_Offres/')) {
                drivePath = drivePath.replace('Appels_Offres/', 'Chantiers/');
              } else if (!drivePath.startsWith('Chantiers/')) {
                // Si le chemin n'a pas de préfixe, ajouter Chantiers/
                drivePath = `Chantiers/${drivePath}`;
              }
              return drivePath;
            }
            // Fallback : calculer le chemin par défaut à partir de la société et du nom du chantier
            if (appelOffres.societe && appelOffres.chantier_name) {
              const societeSlug = customSlugify(appelOffres.societe.nom_societe);
              const chantierSlug = customSlugify(appelOffres.chantier_name);
              if (societeSlug && chantierSlug) {
                return `Chantiers/${societeSlug}/${chantierSlug}`;
              }
            }
            return 'Chantiers/';
          })()}
        />
      )}
    </Container>
  );
};

export default GestionAppelsOffres;
