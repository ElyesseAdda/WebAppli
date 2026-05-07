import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Box, Button, Typography, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Autocomplete, TextField, Snackbar, Alert,
} from "@mui/material";
import { MdAdd, MdEdit, MdDelete, MdLink, MdCheck, MdClose, MdThumbUp } from "react-icons/md";
import { AiFillFilePdf } from "react-icons/ai";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { COLORS } from "../../constants/colors";
import { useRapports } from "../../hooks/useRapports";
import StatusChangeModal from "../StatusChangeModal";
import { RegeneratePDFIconButton } from "../shared/RegeneratePDFButton";
import { DOCUMENT_TYPES } from "../../config/documentTypeConfig";

const STATUT_LABELS = {
  brouillon: "Brouillon",
  brouillon_serveur: "Brouillons",
  a_faire: "A faire",
  en_cours: "En cours",
  termine: "Terminé",
};

const TYPE_RAPPORT_LABELS = {
  intervention: "Rapport d'intervention",
  vigik_plus: "Vigik+",
};

const tableHeadCellSx = {
  fontWeight: 700,
  color: COLORS.textOnDark,
  backgroundColor: COLORS.infoDark || "#1976d2",
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
      : statut === "brouillon_serveur"
      ? "#e0f2f1"
      : statut === "brouillon"
      ? "info.light"
      : "grey.200",
  color:
    statut === "termine"
      ? "success.dark"
      : statut === "en_cours"
      ? "warning.dark"
      : statut === "brouillon_serveur"
      ? "#00695c"
      : statut === "brouillon"
      ? "info.dark"
      : "grey.700",
  fontWeight: 500,
  textTransform: "capitalize",
  cursor: statut === "brouillon_serveur" ? "default" : "pointer",
  "&:hover": { opacity: statut === "brouillon_serveur" ? 1 : 0.9 },
});

const ChantierRapportsList = ({ chantierData }) => {
  const navigate = useNavigate();
  const { rapports, fetchRapports, lierChantier, deleteRapport, patchRapport, deleteRapportBrouillon, loading } = useRapports();
  const [brouillonsServeur, setBrouillonsServeur] = useState([]);
  const [linkDialog, setLinkDialog] = useState(false);
  const [allRapports, setAllRapports] = useState([]);
  const [selectedRapport, setSelectedRapport] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [rapportToUpdate, setRapportToUpdate] = useState(null);
  const [devisDialogOpen, setDevisDialogOpen] = useState(false);
  const [rapportForDevis, setRapportForDevis] = useState(null);
  const [devisOptions, setDevisOptions] = useState([]);
  const [selectedDevis, setSelectedDevis] = useState(null);
  const thumbClickTimeoutRef = useRef(null);

  const loadRapports = useCallback(async () => {
    if (!chantierData?.id) return;
    const cid = chantierData.id;
    axios
      .get("/api/rapports-intervention-brouillons/")
      .then((r) => {
        const d = r.data;
        const list = Array.isArray(d) ? d : [];
        setBrouillonsServeur(list.filter((b) => Number(b.chantier) === Number(cid)));
      })
      .catch(() => setBrouillonsServeur([]));
    await fetchRapports({ chantier: cid }, { page: 1, pageSize: 200 });
  }, [chantierData?.id, fetchRapports]);

  const brouillonsSorted = useMemo(() => {
    return [...brouillonsServeur].sort(
      (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    );
  }, [brouillonsServeur]);

  const displayRapports = useMemo(() => [...brouillonsSorted, ...rapports], [brouillonsSorted, rapports]);

  useEffect(() => {
    loadRapports();
  }, [loadRapports]);

  const handleOpenLinkDialog = async () => {
    try {
      const res = await axios.get("/api/rapports-intervention/", {
        params: { sans_chantier: "true", page_size: 200 },
      });
      const list = res.data?.results ?? [];
      setAllRapports(Array.isArray(list) ? list : []);
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

  const handleDelete = async (row) => {
    if (row?.is_brouillon_serveur) {
      if (!window.confirm("Supprimer ce brouillon en ligne ?")) return;
      try {
        await deleteRapportBrouillon(row.id);
        setSnackbar({ open: true, message: "Brouillon supprimé", severity: "success" });
        loadRapports();
      } catch {
        setSnackbar({ open: true, message: "Erreur lors de la suppression du brouillon", severity: "error" });
      }
      return;
    }
    if (!window.confirm("Supprimer ce rapport ?")) return;
    try {
      await deleteRapport(row.id);
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
      if (newStatut === "termine") {
        setSnackbar({ open: true, message: "Téléversement vers le Drive en cours...", severity: "info" });
        try {
          await axios.get(
            `/api/generate-rapport-intervention-pdf-drive/?rapport_id=${rapportToUpdate.id}`
          );
          setSnackbar({
            open: true,
            message: "Statut mis à jour et rapport téléversé dans le Drive",
            severity: "success",
          });
        } catch (driveErr) {
          setSnackbar({
            open: true,
            message:
              driveErr.response?.data?.error ||
              "Statut mis à jour mais erreur lors du téléversement Drive",
            severity: "warning",
          });
        }
      } else {
        setSnackbar({ open: true, message: "Statut mis à jour", severity: "success" });
      }
      setShowStatusModal(false);
      setRapportToUpdate(null);
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Erreur lors de la mise à jour du statut", severity: "error" });
    }
  };

  const handleGeneratePDF = async (rapport) => {
    try {
      setSnackbar({ open: true, message: "Téléchargement en cours...", severity: "info" });
      const response = await axios.post(
        "/api/generate-rapport-intervention-pdf/",
        { rapport_id: rapport.id },
        { responseType: "blob", headers: { "Content-Type": "application/json" } }
      );
      if (response.headers["content-type"] === "application/pdf") {
        const pdfBlob = new Blob([response.data], { type: "application/pdf" });
        const pdfUrl = window.URL.createObjectURL(pdfBlob);
        const link = document.createElement("a");
        link.href = pdfUrl;
        const cd = response.headers["content-disposition"];
        let filename = `rapport_intervention_${rapport.id}.pdf`;
        if (cd) {
          const match = cd.match(/filename=["']?([^"';]+)["']?/i) || cd.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
          if (match) {
            try {
              filename = decodeURIComponent(match[1].trim().replace(/^["']|["']$/g, ""));
            } catch {
              filename = match[1].trim().replace(/^["']|["']$/g, "");
            }
          }
        }
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(pdfUrl);
        setSnackbar({ open: true, message: "Téléchargement terminé avec succès", severity: "success" });
      } else {
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const err = JSON.parse(reader.result);
            setSnackbar({ open: true, message: `Erreur: ${err.error || "Erreur inconnue"}`, severity: "error" });
          } catch {
            setSnackbar({ open: true, message: "Erreur lors du téléchargement", severity: "error" });
          }
        };
        reader.readAsText(response.data);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.error || "Erreur lors de la génération du PDF.",
        severity: "error",
      });
    }
  };

  const openDevisDialogForRapport = async (rapport) => {
    try {
      const params = { page_size: 200 };
      if (rapport?.chantier) params.chantier = rapport.chantier;
      const [devisRes, rapportsRes] = await Promise.all([
        axios.get("/api/devisa/", { params }),
        axios.get("/api/rapports-intervention/", { params: { page_size: 500 } }),
      ]);
      const devisList = devisRes.data?.results || devisRes.data || [];
      const rapportsList = rapportsRes.data?.results || rapportsRes.data || [];
      const usedDevisIds = new Set(
        (Array.isArray(rapportsList) ? rapportsList : [])
          .filter((r) => r?.id !== rapport?.id)
          .map((r) => r?.devis_lie)
          .filter(Boolean)
      );
      const filteredDevis = (Array.isArray(devisList) ? devisList : []).filter(
        (d) => !usedDevisIds.has(d.id) || d.id === rapport?.devis_lie
      );
      setDevisOptions(filteredDevis);
      const currentDevis = filteredDevis.find((d) => d.id === rapport?.devis_lie) || null;
      setSelectedDevis(currentDevis);
      setRapportForDevis(rapport);
      setDevisDialogOpen(true);
    } catch {
      setSnackbar({ open: true, message: "Impossible de charger la liste des devis", severity: "error" });
    }
  };

  const handleConfirmDevisFait = async () => {
    if (!rapportForDevis?.id || !selectedDevis?.id) return;
    try {
      await patchRapport(rapportForDevis.id, {
        devis_a_faire: true,
        devis_fait: true,
        devis_lie: selectedDevis.id,
      });
      setSnackbar({ open: true, message: "Devis lié et rapport marqué comme devis fait", severity: "success" });
      setDevisDialogOpen(false);
      setRapportForDevis(null);
      setSelectedDevis(null);
      loadRapports();
    } catch (err) {
      const msg = err?.response?.data?.devis_lie?.[0] || "Impossible de lier ce devis";
      setSnackbar({ open: true, message: msg, severity: "error" });
    }
  };

  const handleDevisIconClick = async (e, rapport) => {
    e.stopPropagation();
    if (rapport.devis_a_faire) {
      await openDevisDialogForRapport(rapport);
    }
  };

  const handleBlueThumbClick = (e, rapport) => {
    e.stopPropagation();
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
    }
    thumbClickTimeoutRef.current = setTimeout(() => {
      if (rapport.devis_lie_preview_url) {
        window.open(rapport.devis_lie_preview_url, "_blank");
      } else {
        setSnackbar({ open: true, message: "Devis marqué fait mais aucun devis lié", severity: "warning" });
      }
      thumbClickTimeoutRef.current = null;
    }, 220);
  };

  const handleBlueThumbDoubleClick = async (e, rapport) => {
    e.stopPropagation();
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
      thumbClickTimeoutRef.current = null;
    }
    await openDevisDialogForRapport(rapport);
  };

  const handleResetToDevisAFaire = async () => {
    if (!rapportForDevis?.id) return;
    try {
      await patchRapport(rapportForDevis.id, {
        devis_a_faire: true,
        devis_fait: false,
        devis_lie: null,
      });
      setSnackbar({ open: true, message: "Rapport repassé en devis à faire", severity: "success" });
      setDevisDialogOpen(false);
      setRapportForDevis(null);
      setSelectedDevis(null);
      loadRapports();
    } catch {
      setSnackbar({ open: true, message: "Impossible de repasser en devis à faire", severity: "error" });
    }
  };

  useEffect(() => () => {
    if (thumbClickTimeoutRef.current) {
      clearTimeout(thumbClickTimeoutRef.current);
    }
  }, []);

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textOnDark }}>
          Rapports d&apos;intervention ({displayRapports.length})
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
            <TableRow>
              <TableCell sx={tableHeadCellSx}>Date</TableCell>
              <TableCell sx={tableHeadCellSx}>Type</TableCell>
              <TableCell sx={tableHeadCellSx}>Titre</TableCell>
              <TableCell sx={tableHeadCellSx}>Technicien</TableCell>
              <TableCell sx={tableHeadCellSx}>Résidence</TableCell>
              <TableCell sx={tableHeadCellSx}>Logement/Adresse</TableCell>
              <TableCell sx={{ ...tableHeadCellSx, textAlign: "center" }}>Devis à faire</TableCell>
              <TableCell sx={tableHeadCellSx}>Statut</TableCell>
              <TableCell sx={{ ...tableHeadCellSx, textAlign: "center" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayRapports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} sx={{ textAlign: "center", py: 3 }}>
                  <Typography variant="body2" color="text.secondary">
                    {loading ? "Chargement..." : "Aucun rapport lie a ce chantier"}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              displayRapports.map((rapport) => {
                const rowKey = rapport.is_brouillon_serveur ? `br-${rapport.id}` : rapport.id;
                const st = rapport.statut || "a_faire";
                return (
                <TableRow
                  key={rowKey}
                  hover
                  sx={{ cursor: "pointer" }}
                  onClick={() => {
                    if (rapport.is_brouillon_serveur) {
                      navigate(`/RapportIntervention/nouveau?brouillon=${rapport.id}`);
                    } else {
                      window.open(`/api/preview-rapport-intervention/${rapport.id}/`, "_blank");
                    }
                  }}
                >
                  <TableCell>{rapport.date ? new Date(rapport.date).toLocaleDateString("fr-FR") : "-"}</TableCell>
                  <TableCell>{TYPE_RAPPORT_LABELS[rapport.type_rapport] || rapport.type_rapport || "-"}</TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>{rapport.titre_nom || "-"}</TableCell>
                  <TableCell>{rapport.technicien || "-"}</TableCell>
                  <TableCell sx={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {rapport.residence_nom || "-"}
                  </TableCell>
                  <TableCell sx={{ fontWeight: 500 }}>
                    {rapport.type_rapport === "vigik_plus"
                      ? (rapport.adresse_vigik || "-")
                      : (rapport.logement || "-")}
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }}>
                    {rapport.is_brouillon_serveur ? (
                      <Typography variant="caption" color="text.disabled">—</Typography>
                    ) : rapport.devis_fait ? (
                      <IconButton
                        size="small"
                        onClick={(e) => handleBlueThumbClick(e, rapport)}
                        onDoubleClick={(e) => handleBlueThumbDoubleClick(e, rapport)}
                        title={rapport.devis_lie_numero ? `Devis ${rapport.devis_lie_numero} (double-clic pour corriger)` : "Voir le devis lié (double-clic pour corriger)"}
                      >
                        <MdThumbUp size={20} color="#1565c0" />
                      </IconButton>
                    ) : rapport.devis_a_faire ? (
                      <IconButton size="small" onClick={(e) => handleDevisIconClick(e, rapport)} title="Cliquer pour lier le devis et marquer fait">
                        <MdCheck size={20} color="#2e7d32" />
                      </IconButton>
                    ) : (
                      <MdClose size={20} color="#c62828" title="Non" />
                    )}
                  </TableCell>
                  <TableCell
                    onClick={(e) => {
                      if (rapport.is_brouillon_serveur) e.stopPropagation();
                      else handleStatusClick(e, rapport);
                    }}
                    sx={
                      rapport.is_brouillon_serveur
                        ? { cursor: "default" }
                        : { cursor: "pointer", "&:hover": { backgroundColor: "rgba(27, 120, 188, 0.08)" } }
                    }
                  >
                    <Typography variant="body2" sx={getStatusStyles(st)}>
                      {STATUT_LABELS[st] || st || "A faire"}
                    </Typography>
                  </TableCell>
                  <TableCell sx={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                    {!rapport.is_brouillon_serveur && (
                      <>
                    <IconButton
                      size="small"
                      onClick={() => handleGeneratePDF(rapport)}
                      sx={{ color: "success.main", "&:hover": { backgroundColor: "rgba(46, 125, 50, 0.04)" } }}
                      title="Télécharger le PDF"
                    >
                      <AiFillFilePdf style={{ fontSize: "20px" }} />
                    </IconButton>
                    <RegeneratePDFIconButton
                      documentType={rapport.type_rapport === "vigik_plus" ? DOCUMENT_TYPES.RAPPORT_VIGIK_PLUS : DOCUMENT_TYPES.RAPPORT_INTERVENTION}
                      documentData={{ ...rapport, chantier: chantierData }}
                      size="small"
                      color="primary"
                      tooltipPlacement="top"
                    />
                      </>
                    )}
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() =>
                        rapport.is_brouillon_serveur
                          ? navigate(`/RapportIntervention/nouveau?brouillon=${rapport.id}`)
                          : navigate(`/RapportIntervention/${rapport.id}`)
                      }
                    >
                      <MdEdit />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(rapport)}>
                      <MdDelete />
                    </IconButton>
                  </TableCell>
                </TableRow>
                );
              })
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

      <Dialog open={devisDialogOpen} onClose={() => setDevisDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Lier un devis (devis fait)</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={devisOptions}
            value={selectedDevis}
            onChange={(_, v) => setSelectedDevis(v)}
            getOptionLabel={(opt) => `${opt?.numero || "Sans numéro"}${opt?.chantier_name ? ` — ${opt.chantier_name}` : ""}`}
            renderInput={(params) => <TextField {...params} label="Choisir un devis" size="small" sx={{ mt: 1 }} />}
            isOptionEqualToValue={(a, b) => a?.id === b?.id}
          />
        </DialogContent>
        <DialogActions>
          {rapportForDevis?.devis_fait && (
            <Button color="warning" onClick={handleResetToDevisAFaire}>
              Repasser en devis à faire (V)
            </Button>
          )}
          <Button onClick={() => setDevisDialogOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleConfirmDevisFait} disabled={!selectedDevis}>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>

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
