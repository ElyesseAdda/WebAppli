import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Button, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, TextField, Snackbar, Alert,
} from "@mui/material";
import { MdAdd, MdEdit, MdDelete, MdLink } from "react-icons/md";
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

const ChantierRapportsList = ({ chantierData }) => {
  const navigate = useNavigate();
  const { rapports, fetchRapports, lierChantier, deleteRapport, patchRapport, loading } = useRapports();
  const [linkDialog, setLinkDialog] = useState(false);
  const [allRapports, setAllRapports] = useState([]);
  const [selectedRapport, setSelectedRapport] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [rapportToUpdate, setRapportToUpdate] = useState(null);

  const loadRapports = useCallback(async () => {
    if (!chantierData?.id) return;
    await fetchRapports({ chantier: chantierData.id });
  }, [chantierData?.id, fetchRapports]);

  useEffect(() => {
    loadRapports();
  }, [loadRapports]);

  const handleOpenLinkDialog = async () => {
    try {
      const res = await fetch("/api/rapports-intervention/");
      const data = await res.json();
      const unlinked = (Array.isArray(data) ? data : []).filter((r) => !r.chantier);
      setAllRapports(unlinked);
    } catch {
      setAllRapports([]);
    }
    setLinkDialog(true);
  };

  const handleLinkRapport = async () => {
    if (!selectedRapport || !chantierData?.id) return;
    try {
      await lierChantier(selectedRapport.id, chantierData.id);
      setSnackbar({ open: true, message: "Rapport lie au chantier", severity: "success" });
      setLinkDialog(false);
      setSelectedRapport(null);
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Erreur lors de la liaison", severity: "error" });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer ce rapport ?")) return;
    try {
      await deleteRapport(id);
      setSnackbar({ open: true, message: "Rapport supprime", severity: "success" });
      loadRapports();
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

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textOnDark }}>
          Rapports d'intervention ({rapports.length})
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<MdLink />}
            onClick={handleOpenLinkDialog}
          >
            Lier un rapport
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<MdAdd />}
            onClick={() => navigate(`/RapportIntervention/nouveau?chantier=${chantierData?.id}`)}
            sx={{ backgroundColor: COLORS.infoDark || "#1976d2" }}
          >
            Nouveau rapport
          </Button>
        </Box>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Titre</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Technicien</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Residence</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rapports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} sx={{ textAlign: "center", py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? "Chargement..." : "Aucun rapport lie a ce chantier"}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rapports.map((rapport) => (
                <TableRow
                  key={rapport.id}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => window.open(`/api/preview-rapport-intervention/${rapport.id}/`, "_blank")}
                >
                  <TableCell>{new Date(rapport.date).toLocaleDateString("fr-FR")}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{rapport.titre_nom || "-"}</TableCell>
                  <TableCell>{rapport.technicien || "-"}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {rapport.residence_nom || "-"}
                  </TableCell>
                  <TableCell
                    onClick={(e) => handleStatusClick(e, rapport)}
                    sx={{ cursor: "pointer", "&:hover": { backgroundColor: "rgba(27, 120, 188, 0.08)" } }}
                  >
                    <Typography variant="body2" sx={getStatusStyles(rapport.statut || "a_faire")}>
                      {STATUT_LABELS[rapport.statut] || rapport.statut || "A faire"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                    <IconButton size="small" color="primary" onClick={() => navigate(`/RapportIntervention/${rapport.id}`)}>
                      <MdEdit />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(rapport.id)}>
                      <MdDelete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog pour lier un rapport existant */}
      <Dialog open={linkDialog} onClose={() => setLinkDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Lier un rapport existant</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={allRapports}
            getOptionLabel={(opt) =>
              `${opt.titre_nom || "Sans titre"} - ${new Date(opt.date).toLocaleDateString("fr-FR")} - ${opt.technicien || ""}`
            }
            value={selectedRapport}
            onChange={(_, val) => setSelectedRapport(val)}
            renderInput={(params) => (
              <TextField {...params} label="Rechercher un rapport non lie" size="small" sx={{ mt: 1 }} />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLinkDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleLinkRapport} disabled={!selectedRapport}>
            Lier
          </Button>
        </DialogActions>
      </Dialog>

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
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChantierRapportsList;
