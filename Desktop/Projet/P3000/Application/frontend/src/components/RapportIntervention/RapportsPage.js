import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, IconButton, TextField,
  Snackbar, Alert, Autocomplete, Collapse,
} from "@mui/material";
import {
  MdAdd, MdEdit, MdDelete, MdDescription,
  MdExpandMore, MdExpandLess,
} from "react-icons/md";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../../constants/colors";
import { useRapports } from "../../hooks/useRapports";
import StatusChangeModal from "../StatusChangeModal";

const STATUT_LABELS = {
  a_faire: "A faire",
  en_cours: "En cours",
  termine: "Terminé",
};

const getStatusStyles = (statut) => ({
  display: "inline-block",
  px: 1.5,
  py: 0.5,
  borderRadius: 1,
  backgroundColor:
    statut === "termine"
      ? "success.light"
      : statut === "en_cours"
      ? "warning.light"
      : "grey.200",
  color:
    statut === "termine"
      ? "success.dark"
      : statut === "en_cours"
      ? "warning.dark"
      : "grey.700",
  fontWeight: 500,
  textTransform: "capitalize",
  cursor: "pointer",
  "&:hover": { opacity: 0.9 },
});

const RapportsPage = () => {
  const navigate = useNavigate();
  const { rapports, fetchRapports, deleteRapport, patchRapport, loading } = useRapports();
  const [filters, setFilters] = useState({
    technicien: "",
    client_societe: "",
    residence: "",
    date_creation: "",
  });
  const [residences, setResidences] = useState([]);
  const [expandedResidences, setExpandedResidences] = useState({});
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [rapportToUpdate, setRapportToUpdate] = useState(null);

  useEffect(() => {
    axios.get("/api/residences/").then((res) => {
      setResidences(res.data?.results || res.data || []);
    }).catch(() => {});
  }, []);

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

  const handleStatusClick = (e, rapport) => {
    e.stopPropagation();
    setRapportToUpdate(rapport);
    setShowStatusModal(true);
  };

  const handleStatusUpdate = async (newStatut) => {
    if (!rapportToUpdate) return;
    try {
      await patchRapport(rapportToUpdate.id, { statut: newStatut });
      setSnackbar({ open: true, message: "Statut mis à jour", severity: "success" });
      setShowStatusModal(false);
      setRapportToUpdate(null);
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Erreur lors de la mise à jour du statut", severity: "error" });
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const toggleResidence = (key) => {
    setExpandedResidences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const groupedRapports = useMemo(() => {
    const groups = {};
    rapports.forEach((r) => {
      const key = r.residence_nom || "Sans residence";
      if (!groups[key]) {
        groups[key] = {
          residence_nom: r.residence_nom || "Sans residence",
          residence_adresse: r.residence_adresse || "",
          client_societe_nom: r.client_societe_nom || "",
          rapports: [],
        };
      }
      groups[key].rapports.push(r);
    });
    Object.values(groups).forEach((g) => {
      g.rapports.sort((a, b) => (a.logement || "").localeCompare(b.logement || ""));
    });
    return Object.values(groups).sort((a, b) => a.residence_nom.localeCompare(b.residence_nom));
  }, [rapports]);

  useEffect(() => {
    const initial = {};
    groupedRapports.forEach((g) => {
      if (expandedResidences[g.residence_nom] === undefined) {
        initial[g.residence_nom] = true;
      }
    });
    if (Object.keys(initial).length > 0) {
      setExpandedResidences((prev) => ({ ...prev, ...initial }));
    }
  }, [groupedRapports]);

  return (
    <Box sx={{ p: 3 }}>
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
          <Autocomplete
            options={residences}
            getOptionLabel={(opt) => opt?.nom || ""}
            value={residences.find((r) => r.id === filters.residence) || null}
            onChange={(_, val) => handleFilterChange("residence", val?.id || "")}
            renderInput={(params) => <TextField {...params} label="Residence" size="small" />}
            sx={{ minWidth: 200 }}
          />

          <TextField
            label="Date de création du rapport"
            type="date"
            size="small"
            value={filters.date_creation}
            onChange={(e) => handleFilterChange("date_creation", e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      </Paper>

      {/* Tableau groupe par residence */}
      {rapports.length === 0 ? (
        <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 2, border: "1px solid #e0e0e0" }}>
          <Typography variant="body1" color="text.secondary">
            {loading ? "Chargement..." : "Aucun rapport d'intervention"}
          </Typography>
        </Paper>
      ) : (
        groupedRapports.map((group) => (
          <Paper key={group.residence_nom} elevation={0} sx={{ mb: 2, borderRadius: 2, border: "1px solid #e0e0e0", overflow: "hidden" }}>
            <Box
              onClick={() => toggleResidence(group.residence_nom)}
              sx={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                px: 2, py: 1.5, cursor: "pointer",
                backgroundColor: "#f5f5f5", "&:hover": { backgroundColor: "#eeeeee" },
              }}
            >
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                  {group.residence_nom}
                  <Chip label={`${group.rapports.length} rapport(s)`} size="small" sx={{ ml: 1 }} />
                </Typography>
                {group.residence_adresse && (
                  <Typography variant="caption" color="text.secondary">{group.residence_adresse}</Typography>
                )}
                {group.client_societe_nom && (
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                    Client: {group.client_societe_nom}
                  </Typography>
                )}
              </Box>
              <IconButton size="small">
                {expandedResidences[group.residence_nom] ? <MdExpandLess /> : <MdExpandMore />}
              </IconButton>
            </Box>

            <Collapse in={expandedResidences[group.residence_nom] !== false}>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Logement</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Titre</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Technicien</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                      <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {group.rapports.map((rapport) => (
                      <TableRow key={rapport.id} hover sx={{ cursor: "pointer" }}
                        onClick={() => window.open(`/api/preview-rapport-intervention/${rapport.id}/`, "_blank")}
                      >
                        <TableCell>{new Date(rapport.date).toLocaleDateString("fr-FR")}</TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{rapport.logement || "-"}</TableCell>
                        <TableCell>{rapport.titre_nom || "-"}</TableCell>
                        <TableCell>{rapport.technicien || "-"}</TableCell>
                        <TableCell
                          onClick={(e) => handleStatusClick(e, rapport)}
                          sx={{ cursor: "pointer", "&:hover": { backgroundColor: "rgba(27, 120, 188, 0.08)" } }}
                        >
                          <Typography variant="body2" sx={getStatusStyles(rapport.statut || "a_faire")}>
                            {STATUT_LABELS[rapport.statut] || rapport.statut || "A faire"}
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ textAlign: "center", whiteSpace: "nowrap" }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <IconButton size="small" color="primary"
                            onClick={(e) => { e.stopPropagation(); navigate(`/RapportIntervention/${rapport.id}`); }}
                          >
                            <MdEdit />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => handleDelete(rapport.id)}>
                            <MdDelete />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </Paper>
        ))
      )}

      <StatusChangeModal
        open={showStatusModal}
        onClose={() => {
          setShowStatusModal(false);
          setRapportToUpdate(null);
        }}
        currentStatus={rapportToUpdate?.statut}
        onStatusChange={handleStatusUpdate}
        type="rapport"
        title="Modifier le statut du rapport"
      />

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
