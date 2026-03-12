import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, TextField,
  MenuItem, Select, FormControl, InputLabel, Snackbar, Alert,
} from "@mui/material";
import {
  MdAdd, MdEdit, MdDelete, MdPictureAsPdf, MdDescription, MdVisibility,
} from "react-icons/md";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../../constants/colors";
import { useRapports } from "../../hooks/useRapports";

const STATUT_COLORS = {
  brouillon: "default",
  en_cours: "warning",
  valide: "success",
};

const STATUT_LABELS = {
  brouillon: "Brouillon",
  en_cours: "En cours",
  valide: "Valide",
};

const RapportsPage = () => {
  const navigate = useNavigate();
  const { rapports, fetchRapports, deleteRapport, loading } = useRapports();
  const [filters, setFilters] = useState({
    statut: "",
    technicien: "",
    client_societe: "",
    date_debut: "",
    date_fin: "",
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const loadRapports = useCallback(() => {
    const cleanFilters = {};
    Object.entries(filters).forEach(([k, v]) => {
      if (v) cleanFilters[k] = v;
    });
    fetchRapports(cleanFilters);
  }, [fetchRapports, filters]);

  useEffect(() => {
    loadRapports();
  }, [loadRapports]);

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce rapport ?")) return;
    try {
      await deleteRapport(id);
      setSnackbar({ open: true, message: "Rapport supprime", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "Erreur lors de la suppression", severity: "error" });
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MdDescription size={32} color={COLORS.accent || "#46acc2"} />
          <Typography variant="h4" component="h1" sx={{ color: COLORS.textOnDark }}>
            Rapports d'intervention
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<MdAdd />}
          onClick={() => navigate("/RapportIntervention/nouveau")}
          sx={{ backgroundColor: COLORS.infoDark || "#1976d2", "&:hover": { backgroundColor: "#1565c0" } }}
        >
          Nouveau rapport
        </Button>
      </Box>

      {/* Filtres */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center" }}>
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Statut</InputLabel>
            <Select
              value={filters.statut}
              label="Statut"
              onChange={(e) => handleFilterChange("statut", e.target.value)}
            >
              <MenuItem value="">Tous</MenuItem>
              <MenuItem value="brouillon">Brouillon</MenuItem>
              <MenuItem value="en_cours">En cours</MenuItem>
              <MenuItem value="valide">Valide</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Date debut"
            type="date"
            size="small"
            value={filters.date_debut}
            onChange={(e) => handleFilterChange("date_debut", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Date fin"
            type="date"
            size="small"
            value={filters.date_fin}
            onChange={(e) => handleFilterChange("date_fin", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Paper>

      {/* Tableau */}
      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Titre</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Technicien</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Client</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Chantier</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Adresse</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Prestations</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rapports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    {loading ? "Chargement..." : "Aucun rapport d'intervention"}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rapports.map((rapport) => (
                <TableRow key={rapport.id} hover sx={{ cursor: "pointer" }}
                  onClick={() => navigate(`/RapportIntervention/${rapport.id}`)}
                >
                  <TableCell>
                    {new Date(rapport.date).toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{rapport.titre_nom || "-"}</TableCell>
                  <TableCell>{rapport.technicien || "-"}</TableCell>
                  <TableCell>{rapport.client_societe_nom || "-"}</TableCell>
                  <TableCell>{rapport.chantier_nom || "-"}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {rapport.adresse_residence || "-"}
                  </TableCell>
                  <TableCell>
                    <Chip label={rapport.nb_prestations || 0} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={STATUT_LABELS[rapport.statut] || rapport.statut}
                      size="small"
                      color={STATUT_COLORS[rapport.statut] || "default"}
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: "center", whiteSpace: "nowrap" }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => navigate(`/RapportIntervention/${rapport.id}`)}
                    >
                      <MdEdit />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(rapport.id)}
                    >
                      <MdDelete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RapportsPage;
