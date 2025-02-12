import {
  Box,
  FormControl,
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
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

const SituationMensuelle = ({ chantier_id }) => {
  const [mois, setMois] = useState(new Date().getMonth() + 1);
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [situation, setSituation] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchSituation = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/situation-mensuelle/${chantier_id}/${mois}/${annee}/`
      );
      setSituation(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération de la situation:", error);
      alert("Erreur lors de la récupération de la situation mensuelle");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chantier_id && mois && annee) {
      fetchSituation();
    }
  }, [chantier_id, mois, annee]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Situation Mensuelle CIE
      </Typography>

      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <Select
            value={mois}
            onChange={(e) => setMois(e.target.value)}
            size="small"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <MenuItem key={m} value={m}>
                {new Date(2000, m - 1).toLocaleString("default", {
                  month: "long",
                })}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          type="number"
          value={annee}
          onChange={(e) => setAnnee(e.target.value)}
          size="small"
          sx={{ width: 100 }}
        />
      </Box>

      {loading ? (
        <Typography>Chargement...</Typography>
      ) : situation ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>N° Facture</TableCell>
                <TableCell>Désignation</TableCell>
                <TableCell align="right">Montant HT</TableCell>
                <TableCell align="right">Montant TTC</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {situation.factures.map((facture) => (
                <TableRow key={facture.id}>
                  <TableCell>{facture.numero}</TableCell>
                  <TableCell>{facture.designation}</TableCell>
                  <TableCell align="right">
                    {facture.price_ht.toFixed(2)} €
                  </TableCell>
                  <TableCell align="right">
                    {facture.price_ttc.toFixed(2)} €
                  </TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell colSpan={2} sx={{ fontWeight: "bold" }}>
                  Total
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold" }}>
                  {situation.total_ht.toFixed(2)} €
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: "bold" }}>
                  {situation.total_ttc.toFixed(2)} €
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography>Aucune donnée disponible pour cette période</Typography>
      )}
    </Box>
  );
};

export default SituationMensuelle;
