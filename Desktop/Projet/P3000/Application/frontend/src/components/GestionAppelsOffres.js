import {
  Transform as TransformIcon,
  Visibility as VisibilityIcon,
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

const GestionAppelsOffres = () => {
  const [appelsOffres, setAppelsOffres] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedAppelOffres, setSelectedAppelOffres] = useState(null);
  const [nouveauStatut, setNouveauStatut] = useState("");
  const [raisonRefus, setRaisonRefus] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertSeverity, setAlertSeverity] = useState("success");

  useEffect(() => {
    fetchAppelsOffres();
  }, []);

  const fetchAppelsOffres = async () => {
    try {
      setLoading(true);
      const response = await axios.get("/api/appels-offres/");
      setAppelsOffres(response.data);
    } catch (error) {
      console.error("Erreur lors du chargement des appels d'offres:", error);
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

  const handleTransformerEnChantier = async (appelOffresId) => {
    try {
      const response = await axios.post(
        `/api/appels-offres/${appelOffresId}/transformer_en_chantier/`
      );
      showAlert("Appel d'offres transformé en chantier avec succès !");
      fetchAppelsOffres();
    } catch (error) {
      console.error("Erreur lors de la transformation:", error);
      const errorMessage =
        error.response?.data?.error || "Erreur lors de la transformation";
      showAlert(errorMessage, "error");
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
      console.error("Erreur lors de la mise à jour:", error);
      const errorMessage =
        error.response?.data?.error || "Erreur lors de la mise à jour";
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
                        <Typography variant="subtitle1" fontWeight="bold">
                          {appelOffres.chantier_name}
                        </Typography>
                        {appelOffres.description && (
                          <Typography variant="body2" color="textSecondary">
                            {appelOffres.description}
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
                            <Tooltip title="Transformer en chantier">
                              <IconButton
                                color="success"
                                onClick={() =>
                                  handleTransformerEnChantier(appelOffres.id)
                                }
                                size="small"
                              >
                                <TransformIcon />
                              </IconButton>
                            </Tooltip>
                          )}

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
    </Container>
  );
};

export default GestionAppelsOffres;
