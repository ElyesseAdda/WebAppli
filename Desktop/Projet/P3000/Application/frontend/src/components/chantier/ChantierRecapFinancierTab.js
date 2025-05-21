import {
  Box,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ChantierRecapFinancierTab = ({ chantierData }) => {
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinancialData = async () => {
      try {
        const response = await axios.get(
          `/api/chantiers/${chantierData?.id}/financial-summary/`
        );
        setFinancialData(response.data);
      } catch (error) {
        console.error(
          "Erreur lors du chargement des données financières:",
          error
        );
      } finally {
        setLoading(false);
      }
    };

    if (chantierData?.id) {
      fetchFinancialData();
    }
  }, [chantierData?.id]);

  const formatMontant = (montant) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(montant || 0);
  };

  const formatPourcentage = (value) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "percent",
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(value / 100);
  };

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Grid container spacing={3}>
        {/* Résumé financier */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Résumé Financier
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Montant Total HT
                  </Typography>
                  <Typography variant="h5">
                    {formatMontant(financialData?.montant_total_ht)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Coûts Totaux
                  </Typography>
                  <Typography variant="h5">
                    {formatMontant(financialData?.couts_totaux)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Marge
                  </Typography>
                  <Typography variant="h5" color="primary">
                    {formatMontant(financialData?.marge)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Détail des coûts */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Détail des Coûts
              </Typography>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Montant</TableCell>
                      <TableCell align="right">% du total</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Matériel</TableCell>
                      <TableCell align="right">
                        {formatMontant(financialData?.cout_materiel)}
                      </TableCell>
                      <TableCell align="right">
                        {formatPourcentage(
                          (financialData?.cout_materiel /
                            financialData?.couts_totaux) *
                            100
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Main d'œuvre</TableCell>
                      <TableCell align="right">
                        {formatMontant(financialData?.cout_main_oeuvre)}
                      </TableCell>
                      <TableCell align="right">
                        {formatPourcentage(
                          (financialData?.cout_main_oeuvre /
                            financialData?.couts_totaux) *
                            100
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Sous-traitance</TableCell>
                      <TableCell align="right">
                        {formatMontant(financialData?.cout_sous_traitance)}
                      </TableCell>
                      <TableCell align="right">
                        {formatPourcentage(
                          (financialData?.cout_sous_traitance /
                            financialData?.couts_totaux) *
                            100
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Graphique de répartition */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Répartition des Coûts
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      {
                        name: "Matériel",
                        montant: financialData?.cout_materiel,
                      },
                      {
                        name: "Main d'œuvre",
                        montant: financialData?.cout_main_oeuvre,
                      },
                      {
                        name: "Sous-traitance",
                        montant: financialData?.cout_sous_traitance,
                      },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatMontant(value)} />
                    <Legend />
                    <Bar dataKey="montant" name="Montant" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Suivi des paiements */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Suivi des Paiements
              </Typography>
              <TableContainer component={Paper} elevation={0}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Type</TableCell>
                      <TableCell align="right">Montant</TableCell>
                      <TableCell align="right">Statut</TableCell>
                      <TableCell align="right">Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {financialData?.paiements?.map((paiement) => (
                      <TableRow key={paiement.id}>
                        <TableCell>{paiement.type}</TableCell>
                        <TableCell align="right">
                          {formatMontant(paiement.montant)}
                        </TableCell>
                        <TableCell align="right">{paiement.statut}</TableCell>
                        <TableCell align="right">
                          {new Date(paiement.date).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
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

export default ChantierRecapFinancierTab;
