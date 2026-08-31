import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import { Search as SearchIcon, Delete as DeleteIcon, Save as SaveIcon } from "@mui/icons-material";
import axios from "axios";
import React, { useState, useEffect, useMemo } from "react";

const emptyNewPeriode = () => ({ date_debut: "", date_fin: "", motif: "" });

const toDateInput = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};

const periodeDraftFrom = (periode) => ({
  date_debut: toDateInput(periode.date_debut),
  date_fin: toDateInput(periode.date_fin),
  motif: periode.motif || "",
});

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    bgcolor: "#fff",
    fontSize: "0.875rem",
    "& fieldset": { borderColor: "rgba(25, 118, 210, 0.25)" },
    "&:hover fieldset": { borderColor: "#1976d2" },
    "&.Mui-focused fieldset": { borderColor: "#1976d2" },
  },
  "& .MuiInputBase-input": { py: "8px" },
};

const ReactivateAgentModal = ({
  isOpen = false,
  handleClose = () => {},
  refreshAgents = () => {},
}) => {
  const [agents, setAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [dateRepriseByAgent, setDateRepriseByAgent] = useState({});
  const [newPeriodeByAgent, setNewPeriodeByAgent] = useState({});
  const [editByPeriode, setEditByPeriode] = useState({});

  const fetchAgents = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/agent/?include_inactive=true");
      const list = Array.isArray(response.data) ? response.data : [];
      setAgents(
        list.filter(
          (a) =>
            a.is_active === false ||
            (Array.isArray(a.periodes_inactivite) && a.periodes_inactivite.length > 0)
        )
      );
      setEditByPeriode({});
    } catch (error) {
      console.error("Erreur lors de la récupération des agents:", error);
      setMessage({
        type: "error",
        text: "Erreur lors de la récupération des agents",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAgents();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setDateRepriseByAgent({});
      setNewPeriodeByAgent({});
      setEditByPeriode({});
    }
  }, [isOpen]);

  const getEditDraft = (periode) =>
    editByPeriode[periode.id] || periodeDraftFrom(periode);

  const isPeriodeDirty = (periode) => {
    const draft = getEditDraft(periode);
    const original = periodeDraftFrom(periode);
    return (
      draft.date_debut !== original.date_debut ||
      draft.date_fin !== original.date_fin ||
      draft.motif !== original.motif
    );
  };

  const updateEditPeriode = (periodeId, field, value) => {
    setEditByPeriode((prev) => {
      const current =
        prev[periodeId] ||
        (() => {
          for (const agent of agents) {
            const found = (agent.periodes_inactivite || []).find(
              (p) => p.id === periodeId
            );
            if (found) return periodeDraftFrom(found);
          }
          return emptyNewPeriode();
        })();
      return {
        ...prev,
        [periodeId]: { ...current, [field]: value },
      };
    });
  };

  const handleReactivate = async (agentId) => {
    try {
      setIsLoading(true);
      const payload = {};
      const dateFin = dateRepriseByAgent[agentId];
      if (dateFin) {
        payload.date_fin = dateFin;
      }
      const response = await axios.post(`/api/agent/${agentId}/reactiver/`, payload);
      setMessage({ type: "success", text: response.data.message });
      await fetchAgents();
      refreshAgents();
    } catch (error) {
      console.error("Erreur lors de la réactivation:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Erreur lors de la réactivation",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPeriode = async (agentId) => {
    const form = newPeriodeByAgent[agentId] || emptyNewPeriode();
    if (!form.date_debut) {
      setMessage({ type: "error", text: "La date de début est requise." });
      return;
    }
    if (form.date_fin && form.date_fin < form.date_debut) {
      setMessage({
        type: "error",
        text: "La date de fin doit être postérieure ou égale à la date de début.",
      });
      return;
    }

    try {
      setIsLoading(true);
      const payload = {
        date_debut: form.date_debut,
        motif: form.motif || "",
      };
      if (form.date_fin) {
        payload.date_fin = form.date_fin;
      }
      await axios.post(`/api/agent/${agentId}/periodes-inactivite/`, payload);
      setMessage({ type: "success", text: "Période d'inactivité ajoutée." });
      setNewPeriodeByAgent((prev) => ({
        ...prev,
        [agentId]: emptyNewPeriode(),
      }));
      await fetchAgents();
      refreshAgents();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Erreur lors de l'ajout de la période",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePeriode = async (agentId, periode) => {
    const draft = getEditDraft(periode);
    if (!draft.date_debut) {
      setMessage({ type: "error", text: "La date de début est requise." });
      return;
    }
    if (draft.date_fin && draft.date_fin < draft.date_debut) {
      setMessage({
        type: "error",
        text: "La date de fin doit être postérieure ou égale à la date de début.",
      });
      return;
    }

    try {
      setIsLoading(true);
      await axios.patch(`/api/agent/${agentId}/periodes-inactivite/${periode.id}/`, {
        date_debut: draft.date_debut,
        date_fin: draft.date_fin || null,
        motif: draft.motif || "",
      });
      setMessage({ type: "success", text: "Période mise à jour." });
      await fetchAgents();
      refreshAgents();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Erreur lors de la modification",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePeriode = async (agentId, periodeId) => {
    try {
      setIsLoading(true);
      await axios.delete(`/api/agent/${agentId}/periodes-inactivite/${periodeId}/`);
      setMessage({ type: "success", text: "Période supprimée." });
      await fetchAgents();
      refreshAgents();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Erreur lors de la suppression",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateNewPeriode = (agentId, field, value) => {
    setNewPeriodeByAgent((prev) => ({
      ...prev,
      [agentId]: {
        ...(prev[agentId] || emptyNewPeriode()),
        [field]: value,
      },
    }));
  };

  const sortedPeriods = (agent) => {
    const periods = [...(agent.periodes_inactivite || [])];
    return periods.sort((a, b) => {
      const da = String(a.date_debut || "");
      const db = String(b.date_debut || "");
      return da.localeCompare(db);
    });
  };

  const filteredAgents = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return agents
      .filter((agent) => {
        const fullName = `${agent.name} ${agent.surname}`.toLowerCase();
        return fullName.includes(searchLower);
      })
      .sort((a, b) => {
        const nameA = `${a.surname} ${a.name}`.toLowerCase();
        const nameB = `${b.surname} ${b.name}`.toLowerCase();
        return nameA.localeCompare(nameB, "fr");
      });
  }, [agents, searchTerm]);

  const colTemplate = "1fr 1fr 140px 1.2fr 88px";
  const primary = "#1976d2";
  const primarySoft = "rgba(25, 118, 210, 0.08)";
  const primaryBorder = "rgba(25, 118, 210, 0.22)";

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 1, color: primary, fontWeight: 700 }}>
        Périodes d&apos;inactivité
        {agents.length > 0 && (
          <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 400, color: "#64748b" }}>
            {filteredAgents.length} agent{filteredAgents.length > 1 ? "s" : ""}
            {searchTerm && ` · « ${searchTerm} »`}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent>
        {message.text && (
          <Alert
            severity={message.type}
            sx={{ mb: 2 }}
            onClose={() => setMessage({ type: "", text: "" })}
          >
            {message.text}
          </Alert>
        )}

        {agents.length > 0 && (
          <TextField
            fullWidth
            placeholder="Rechercher un agent…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{
              mb: 2.5,
              "& .MuiOutlinedInput-root": {
                borderRadius: "10px",
                bgcolor: primarySoft,
                fontSize: "0.875rem",
                "& fieldset": { borderColor: primaryBorder },
                "&:hover fieldset": { borderColor: primary },
                "&.Mui-focused fieldset": { borderColor: primary },
              },
              "& .MuiInputBase-input": { py: "10px" },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: primary }} />
                </InputAdornment>
              ),
            }}
          />
        )}

        {isLoading && agents.length === 0 ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress size={28} sx={{ color: primary }} />
          </Box>
        ) : agents.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              Aucun agent avec période d&apos;inactivité
            </Typography>
          </Box>
        ) : filteredAgents.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography color="text.secondary">
              Aucun agent trouvé pour « {searchTerm} »
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {filteredAgents.map((agent) => {
              const periods = sortedPeriods(agent);
              const isCurrentlyInactive = agent.is_active === false;
              const form = newPeriodeByAgent[agent.id] || emptyNewPeriode();
              return (
                <Box
                  key={agent.id}
                  sx={{
                    border: `1px solid ${primaryBorder}`,
                    borderRadius: "12px",
                    overflow: "hidden",
                    bgcolor: "#fff",
                    boxShadow: "0 1px 3px rgba(25, 118, 210, 0.06)",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1.5,
                      px: 2,
                      py: 1.5,
                      background: `linear-gradient(90deg, ${primarySoft} 0%, #fff 100%)`,
                      borderBottom: `1px solid ${primaryBorder}`,
                      borderLeft: `4px solid ${primary}`,
                    }}
                  >
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                        {agent.surname} {agent.name}
                      </Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: "#64748b", mt: 0.25 }}>
                        {agent.type_paiement === "horaire" ? "Horaire" : "Journalier"}
                        {" · "}
                        <Box
                          component="span"
                          sx={{
                            color: isCurrentlyInactive ? "#dc004e" : "#059669",
                            fontWeight: 600,
                          }}
                        >
                          {isCurrentlyInactive ? "Inactif actuellement" : "Actif actuellement"}
                        </Box>
                      </Typography>
                    </Box>
                    {isCurrentlyInactive && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <TextField
                          type="date"
                          size="small"
                          value={dateRepriseByAgent[agent.id] || ""}
                          onChange={(e) =>
                            setDateRepriseByAgent((prev) => ({
                              ...prev,
                              [agent.id]: e.target.value,
                            }))
                          }
                          InputLabelProps={{ shrink: true }}
                          sx={{ width: 160, ...fieldSx }}
                        />
                        <Button
                          variant="contained"
                          onClick={() => handleReactivate(agent.id)}
                          disabled={isLoading}
                          size="small"
                          sx={{
                            textTransform: "none",
                            borderRadius: "8px",
                            bgcolor: "#059669",
                            boxShadow: "none",
                            "&:hover": { bgcolor: "#047857", boxShadow: "none" },
                          }}
                        >
                          Réactiver
                        </Button>
                      </Box>
                    )}
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: colTemplate,
                      gap: 1,
                      px: 2,
                      py: 1,
                      bgcolor: primarySoft,
                      borderBottom: `1px solid ${primaryBorder}`,
                    }}
                  >
                    {["Début", "Fin", "Statut", "Motif", ""].map((label) => (
                      <Typography
                        key={label || "actions"}
                        sx={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color: primary,
                          textTransform: "uppercase",
                          letterSpacing: "0.04em",
                        }}
                      >
                        {label}
                      </Typography>
                    ))}
                  </Box>

                  {periods.length === 0 && (
                    <Box px={2} py={1.5}>
                      <Typography sx={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                        Aucune période — ajoutez-en une ci-dessous
                      </Typography>
                    </Box>
                  )}

                  {periods.map((periode, idx) => {
                    const draft = getEditDraft(periode);
                    const hasEnd = Boolean(draft.date_fin);
                    const dirty = isPeriodeDirty(periode);
                    return (
                      <Box
                        key={periode.id}
                        sx={{
                          display: "grid",
                          gridTemplateColumns: colTemplate,
                          gap: 1,
                          px: 2,
                          py: 1,
                          alignItems: "center",
                          bgcolor: idx % 2 === 0 ? "#ffffff" : "#f3f4f6",
                          borderBottom: "1px solid #eef2ff",
                          "&:hover": { bgcolor: "rgba(25, 118, 210, 0.08)" },
                        }}
                      >
                        <TextField
                          type="date"
                          size="small"
                          value={draft.date_debut}
                          onChange={(e) =>
                            updateEditPeriode(periode.id, "date_debut", e.target.value)
                          }
                          disabled={isLoading}
                          sx={fieldSx}
                        />
                        <TextField
                          type="date"
                          size="small"
                          value={draft.date_fin}
                          onChange={(e) =>
                            updateEditPeriode(periode.id, "date_fin", e.target.value)
                          }
                          disabled={isLoading}
                          sx={fieldSx}
                        />
                        <Typography
                          sx={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: hasEnd ? "#64748b" : primary,
                          }}
                        >
                          {hasEnd ? "Période terminée" : "Période active"}
                        </Typography>
                        <TextField
                          size="small"
                          value={draft.motif}
                          onChange={(e) =>
                            updateEditPeriode(periode.id, "motif", e.target.value)
                          }
                          placeholder="—"
                          disabled={isLoading}
                          sx={fieldSx}
                        />
                        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5 }}>
                          <IconButton
                            size="small"
                            onClick={() => handleSavePeriode(agent.id, periode)}
                            disabled={isLoading || !dirty}
                            title="Enregistrer"
                            sx={{
                              color: dirty ? primary : "#cbd5e1",
                              "&:hover": { bgcolor: primarySoft },
                            }}
                          >
                            <SaveIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeletePeriode(agent.id, periode.id)}
                            disabled={isLoading}
                            title="Supprimer"
                            sx={{
                              color: "#94a3b8",
                              "&:hover": { color: "#dc004e", bgcolor: "rgba(220, 0, 78, 0.08)" },
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                    );
                  })}

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: colTemplate,
                      gap: 1,
                      px: 2,
                      py: 1.25,
                      alignItems: "center",
                      bgcolor: "rgba(25, 118, 210, 0.05)",
                      borderTop: `1px dashed ${primaryBorder}`,
                    }}
                  >
                    <TextField
                      type="date"
                      size="small"
                      value={form.date_debut}
                      onChange={(e) =>
                        updateNewPeriode(agent.id, "date_debut", e.target.value)
                      }
                      sx={fieldSx}
                    />
                    <TextField
                      type="date"
                      size="small"
                      value={form.date_fin}
                      onChange={(e) =>
                        updateNewPeriode(agent.id, "date_fin", e.target.value)
                      }
                      sx={fieldSx}
                    />
                    <Typography sx={{ fontSize: "0.85rem", color: primary, fontWeight: 500 }}>
                      Nouvelle
                    </Typography>
                    <TextField
                      size="small"
                      placeholder="Motif"
                      value={form.motif}
                      onChange={(e) =>
                        updateNewPeriode(agent.id, "motif", e.target.value)
                      }
                      sx={fieldSx}
                    />
                    <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        size="small"
                        onClick={() => handleAddPeriode(agent.id)}
                        disabled={isLoading || !form.date_debut}
                        sx={{
                          textTransform: "none",
                          borderRadius: "8px",
                          fontWeight: 600,
                          color: "#fff",
                          bgcolor: primary,
                          boxShadow: "none",
                          px: 1.5,
                          "&:hover": { bgcolor: "#1565c0", boxShadow: "none" },
                          "&.Mui-disabled": {
                            color: "#fff",
                            bgcolor: "rgba(25, 118, 210, 0.35)",
                          },
                        }}
                      >
                        Ajouter
                      </Button>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button
          onClick={handleClose}
          disabled={isLoading}
          sx={{ textTransform: "none", color: primary, fontWeight: 600 }}
        >
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReactivateAgentModal;
