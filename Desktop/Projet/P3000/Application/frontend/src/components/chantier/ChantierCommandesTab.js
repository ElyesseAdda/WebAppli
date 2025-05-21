import {
  Add as AddIcon,
  Edit as EditIcon,
  Visibility as ViewIcon,
} from "@mui/icons-material";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const ChantierCommandesTab = ({ chantierData }) => {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCommandes = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await axios.get(
          `/api/chantier/${chantierData?.id}/bons_commande/`
        );
        setCommandes(response.data);
      } catch (error) {
        console.error("Erreur lors du chargement des commandes:", error);
        setError("Impossible de charger les commandes. Veuillez réessayer.");
      } finally {
        setLoading(false);
      }
    };

    if (chantierData?.id) {
      fetchCommandes();
    }
  }, [chantierData?.id]);

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

  const getStatusColor = (status) => {
    switch (status) {
      case "en_attente":
        return "warning";
      case "livre_chantier":
        return "success";
      case "retrait_magasin":
        return "info";
      default:
        return "default";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "en_attente":
        return "En attente";
      case "livre_chantier":
        return "Livré chantier";
      case "retrait_magasin":
        return "Retrait magasin";
      default:
        return status;
    }
  };

  const handleViewCommande = (commandeId) => {
    navigate(`/ModificationBC/${commandeId}`);
  };

  const handleCreateCommande = () => {
    navigate("/BonCommande", { state: { chantierId: chantierData?.id } });
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography variant="h6">Bons de commande</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={handleCreateCommande}
                >
                  Nouveau bon de commande
                </Button>
              </Box>

              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Numéro</TableCell>
                      <TableCell>Fournisseur</TableCell>
                      <TableCell>Date de commande</TableCell>
                      <TableCell>Montant total</TableCell>
                      <TableCell>Statut</TableCell>
                      <TableCell>Statut paiement</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {commandes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center">
                          Aucun bon de commande disponible
                        </TableCell>
                      </TableRow>
                    ) : (
                      commandes.map((commande) => (
                        <TableRow key={commande.id}>
                          <TableCell>{commande.numero}</TableCell>
                          <TableCell>{commande.fournisseur}</TableCell>
                          <TableCell>
                            {formatDate(commande.date_commande)}
                          </TableCell>
                          <TableCell>
                            {formatMontant(commande.montant_total)}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={getStatusLabel(commande.statut)}
                              color={getStatusColor(commande.statut)}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={commande.statut_paiement}
                              color={
                                commande.statut_paiement === "paye"
                                  ? "success"
                                  : commande.statut_paiement === "paye_partiel"
                                  ? "warning"
                                  : "error"
                              }
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Tooltip title="Voir les détails">
                              <IconButton
                                size="small"
                                onClick={() => handleViewCommande(commande.id)}
                              >
                                <ViewIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Modifier">
                              <IconButton
                                size="small"
                                onClick={() => handleViewCommande(commande.id)}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChantierCommandesTab;
