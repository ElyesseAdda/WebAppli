import {
  Delete as DeleteIcon,
  Transform as TransformIcon,
  Visibility as VisibilityIcon,
  Folder as FolderIcon,
} from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
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
import React, { useEffect, useState } from "react";
import DrivePathSelector from "./Devis/DrivePathSelector";
import { COLORS } from "../constants/colors";

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

  useEffect(() => {
    fetchAppelsOffres();
  }, []);

  const fetchAppelsOffres = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/appels-offres/");
      setAppelsOffres(response.data);
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
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            color: "white",
            backgroundColor: "transparent",
          }}
        >
          Gestion des Appels d'Offres
        </Typography>

        {alertMessage && (
          <Alert severity={alertSeverity} sx={{ mb: 2 }}>
            {alertMessage}
          </Alert>
        )}

        <Paper elevation={3}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: COLORS.infoDark }}>
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
                {appelsOffres.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      <Typography variant="body1" color="textSecondary">
                        Aucun appel d'offres trouvé
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  appelsOffres.map((appelOffres) => (
                    <TableRow key={appelOffres.id}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {appelOffres.chantier_name}
                          </Typography>
                          {appelOffres.deja_transforme && (
                            <Chip
                              label="Transformé"
                              color="success"
                              size="small"
                              sx={{ fontSize: "0.7rem", height: "20px" }}
                            />
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
                        <Chip
                          label={getStatutLabel(appelOffres.statut)}
                          color={getStatutColor(appelOffres.statut)}
                          size="small"
                        />
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
