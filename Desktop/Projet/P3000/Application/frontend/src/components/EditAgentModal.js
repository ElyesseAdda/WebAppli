import { Box, Button, MenuItem, Select, TextField, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Typography, IconButton, Divider } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import { formatPeriodeInactivite, agentUsesContratVisibility, agentVisibleForRange, monthRangeBounds } from "../utils/agentEffectif";

const EditAgentModal = ({ isOpen, handleClose, refreshAgents, agents = [] }) => {
  const agentsEffectif = React.useMemo(() => {
    const now = new Date();
    const { start, end } = monthRangeBounds(now.getMonth() + 1, now.getFullYear());
    return agents.filter((a) => agentVisibleForRange(a, start, end));
  }, [agents]);

  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const agentDropdownRef = useRef(null);

  const [agentData, setAgentData] = React.useState({
    id: "",
    name: "",
    surname: "",
    email: "",
    address: "",
    phone_Number: "",
    taux_Horaire: "",
    type_paiement: "horaire",
    taux_journalier: "",
    conge: "",
    heure_debut: "",
    heure_fin: "",
    heure_pause_debut: "",
    heure_pause_fin: "",
    jours_travail: [],
    is_active: true,
    date_desactivation: null,
    periodes_inactivite: [],
    contrats: [],
  });
  
  const [showDesactivationDialog, setShowDesactivationDialog] = React.useState(false);
  const [dateDesactivation, setDateDesactivation] = React.useState("");
  const [dateFinDesactivation, setDateFinDesactivation] = React.useState("");
  const [nouvellePeriode, setNouvellePeriode] = React.useState({ date_debut: "", date_fin: "", motif: "" });
  const [dateReactivation, setDateReactivation] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState({ type: "", text: "" });

  const joursOptions = [
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
    "dimanche",
  ];

  const refreshAgentPeriodes = async (agentId) => {
    if (!agentId) return;
    try {
      const response = await axios.get(`/api/agent/${agentId}/periodes-inactivite/`);
      setAgentData((prev) => ({
        ...prev,
        periodes_inactivite: response.data || [],
      }));
    } catch (error) {
      console.error("Erreur chargement périodes:", error);
    }
  };

  const handleAgentSelect = async (selectedAgent) => {
    if (!selectedAgent) return;

    let agent = selectedAgent;
    try {
      const response = await axios.get(`/api/agent/${selectedAgent.id}/`);
      agent = response.data;
    } catch (error) {
      console.error("Erreur chargement agent:", error);
    }

    setAgentData({
      ...agent,
      heure_debut: agent.heure_debut
        ? agent.heure_debut.slice(0, 5)
        : "",
      heure_fin: agent.heure_fin
        ? agent.heure_fin.slice(0, 5)
        : "",
      heure_pause_debut: agent.heure_pause_debut
        ? agent.heure_pause_debut.slice(0, 5)
        : "",
      heure_pause_fin: agent.heure_pause_fin
        ? agent.heure_pause_fin.slice(0, 5)
        : "",
      jours_travail: agent.jours_travail
        ? agent.jours_travail.split(",").map((j) => j.trim())
        : [],
      is_active: agent.is_active !== undefined ? agent.is_active : true,
      date_desactivation: agent.date_desactivation || null,
      periodes_inactivite: agent.periodes_inactivite || [],
      contrats: agent.contrats || [],
      phone_Number:
        agent.phone_Number != null && agent.phone_Number !== ""
          ? String(agent.phone_Number)
          : "",
    });
    setAgentSearchQuery("");
    setAgentDropdownOpen(false);
    setNouvellePeriode({ date_debut: "", date_fin: "", motif: "" });
    setDateReactivation("");
  };

  // Fermer la liste au clic à l'extérieur
  useEffect(() => {
    if (!isOpen || !agentDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target)) {
        setAgentDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, agentDropdownOpen]);

  // Réinitialiser la recherche à la fermeture du modal
  useEffect(() => {
    if (!isOpen) {
      setAgentSearchQuery("");
      setAgentDropdownOpen(false);
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAgentData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleJoursChange = (e) => {
    const { value } = e.target;
    setAgentData((prevData) => ({
      ...prevData,
      jours_travail: value,
    }));
  };

  const handleSubmit = async () => {
    if (!agentData.id) {
      console.error("Aucun agent sélectionné pour la mise à jour.");
      return;
    }

    try {
      const jours_travail_uniques = Array.from(
        new Set(agentData.jours_travail.map((j) => j.trim()))
      );
      const agentDataToSubmit = {
        name: agentData.name,
        surname: agentData.surname,
        email: agentData.email || null,
        address: agentData.address,
        phone_Number: String(agentData.phone_Number).trim(),
        type_paiement: agentData.type_paiement || "horaire",
        taux_Horaire: agentData.taux_Horaire
          ? parseFloat(agentData.taux_Horaire)
          : null,
        taux_journalier: agentData.taux_journalier
          ? parseFloat(agentData.taux_journalier)
          : null,
        conge: agentData.conge ? agentData.conge : null,
        heure_debut: agentData.heure_debut || null,
        heure_fin: agentData.heure_fin || null,
        heure_pause_debut: agentData.heure_pause_debut || null,
        heure_pause_fin: agentData.heure_pause_fin || null,
        jours_travail: jours_travail_uniques.join(","),
      };
      if (agentData.type_paiement === "journalier") {
        agentDataToSubmit.taux_Horaire = null;
        agentDataToSubmit.heure_debut = null;
        agentDataToSubmit.heure_fin = null;
        agentDataToSubmit.heure_pause_debut = null;
        agentDataToSubmit.heure_pause_fin = null;
      } else {
        agentDataToSubmit.taux_journalier = null;
      }
      console.log(
        "[DEBUG] Données envoyées à l'API pour modification agent:",
        agentDataToSubmit
      );
      await axios.put(`/api/agent/${agentData.id}/`, agentDataToSubmit);
      handleClose();
      refreshAgents();
    } catch (error) {
      console.error("Erreur détaillée:", error.response?.data);
      console.error("Erreur lors de la mise à jour de l'agent", error);
    }
  };

  const handleDesactiver = () => {
    if (!agentData.id) {
      setMessage({ type: "error", text: "Aucun agent sélectionné." });
      return;
    }
    const today = new Date().toISOString().split('T')[0];
    setDateDesactivation(today);
    setDateFinDesactivation("");
    setShowDesactivationDialog(true);
  };

  const confirmDesactivation = async () => {
    if (!dateDesactivation) {
      setMessage({ type: "error", text: "Veuillez sélectionner une date de désactivation." });
      return;
    }

    setIsLoading(true);
    try {
      const payload = { date_desactivation: dateDesactivation };
      if (dateFinDesactivation) {
        payload.date_fin = dateFinDesactivation;
      }
      const response = await axios.post(`/api/agent/${agentData.id}/desactiver/`, payload);
      
      setMessage({ type: "success", text: response.data.message });
      setShowDesactivationDialog(false);
      setDateDesactivation("");
      setDateFinDesactivation("");
      refreshAgents();
      
      setAgentData(prev => ({
        ...prev,
        is_active: response.data.agent?.is_active ?? false,
        date_desactivation: response.data.agent?.date_desactivation ?? dateDesactivation,
      }));
      await refreshAgentPeriodes(agentData.id);
    } catch (error) {
      console.error("Erreur lors de la désactivation:", error);
      setMessage({ 
        type: "error", 
        text: error.response?.data?.error || "Erreur lors de la désactivation" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactiver = async () => {
    if (!agentData.id) {
      setMessage({ type: "error", text: "Aucun agent sélectionné." });
      return;
    }

    setIsLoading(true);
    try {
      const payload = {};
      if (dateReactivation) {
        payload.date_fin = dateReactivation;
      }
      const response = await axios.post(`/api/agent/${agentData.id}/reactiver/`, payload);
      
      setMessage({ type: "success", text: response.data.message });
      refreshAgents();
      setDateReactivation("");
      
      setAgentData(prev => ({
        ...prev,
        is_active: response.data.agent?.is_active ?? true,
        date_desactivation: response.data.agent?.date_desactivation ?? null,
      }));
      await refreshAgentPeriodes(agentData.id);
    } catch (error) {
      console.error("Erreur lors de la réactivation:", error);
      setMessage({ 
        type: "error", 
        text: error.response?.data?.error || "Erreur lors de la réactivation" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddPeriode = async () => {
    if (!agentData.id || !nouvellePeriode.date_debut) {
      setMessage({ type: "error", text: "La date de début est requise." });
      return;
    }
    setIsLoading(true);
    try {
      const payload = {
        date_debut: nouvellePeriode.date_debut,
        motif: nouvellePeriode.motif || "",
      };
      if (nouvellePeriode.date_fin) {
        payload.date_fin = nouvellePeriode.date_fin;
      }
      await axios.post(`/api/agent/${agentData.id}/periodes-inactivite/`, payload);
      setMessage({ type: "success", text: "Période d'inactivité ajoutée." });
      setNouvellePeriode({ date_debut: "", date_fin: "", motif: "" });
      refreshAgents();
      const agentRes = await axios.get(`/api/agent/${agentData.id}/`);
      setAgentData((prev) => ({
        ...prev,
        is_active: agentRes.data.is_active,
        date_desactivation: agentRes.data.date_desactivation,
        periodes_inactivite: agentRes.data.periodes_inactivite || [],
      }));
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Erreur lors de l'ajout de la période",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePeriode = async (periodeId) => {
    if (!agentData.id || !periodeId) return;
    setIsLoading(true);
    try {
      await axios.delete(`/api/agent/${agentData.id}/periodes-inactivite/${periodeId}/`);
      setMessage({ type: "success", text: "Période supprimée." });
      refreshAgents();
      const agentRes = await axios.get(`/api/agent/${agentData.id}/`);
      setAgentData((prev) => ({
        ...prev,
        is_active: agentRes.data.is_active,
        date_desactivation: agentRes.data.date_desactivation,
        periodes_inactivite: agentRes.data.periodes_inactivite || [],
      }));
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Erreur lors de la suppression",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog 
        open={isOpen} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Modifier l'agent</DialogTitle>
        <DialogContent>
          {/* Message d'alerte */}
          {message.text && (
            <Alert 
              severity={message.type} 
              sx={{ mb: 2 }}
              onClose={() => setMessage({ type: "", text: "" })}
            >
              {message.text}
            </Alert>
          )}
          
          <Box ref={agentDropdownRef} sx={{ position: "relative", marginTop: 2, marginBottom: 2 }}>
            <Typography component="label" sx={{ display: "block", fontSize: 12, color: "text.secondary", mb: 0.5 }}>
              Agent
            </Typography>
            <input
              type="tel"
            inputMode="tel"
              placeholder="Rechercher un agent..."
              value={
                agentData.id
                  ? `${agentData.name || ""} ${agentData.surname || ""}`.trim()
                  : agentSearchQuery
              }
              onChange={(e) => {
                setAgentSearchQuery(e.target.value);
                if (agentData.id) {
                  setAgentData({
                    id: "",
                    name: "",
                    surname: "",
                    email: "",
                    address: "",
                    phone_Number: "",
                    taux_Horaire: "",
                    type_paiement: "horaire",
                    taux_journalier: "",
                    conge: "",
                    heure_debut: "",
                    heure_fin: "",
                    heure_pause_debut: "",
                    heure_pause_fin: "",
                    jours_travail: [],
                    is_active: true,
                    date_desactivation: null,
                    periodes_inactivite: [],
                    contrats: [],
                  });
                }
                setAgentDropdownOpen(true);
              }}
              onFocus={() => setAgentDropdownOpen(true)}
              style={{
                width: "100%",
                padding: "14px 12px",
                border: "2px solid #e0e0e0",
                borderRadius: "8px",
                fontSize: "14px",
                boxSizing: "border-box",
              }}
            />
            {agentDropdownOpen && (
              <ul
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  margin: 0,
                  marginTop: "4px",
                  padding: 0,
                  listStyle: "none",
                  maxHeight: "240px",
                  overflowY: "auto",
                  backgroundColor: "#fff",
                  border: "2px solid #1976d2",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 10,
                }}
              >
                {(() => {
                  const sorted = [...agentsEffectif].sort((a, b) => {
                    const na = `${a.name || ""} ${a.surname || ""}`.trim();
                    const nb = `${b.name || ""} ${b.surname || ""}`.trim();
                    return na.localeCompare(nb, "fr");
                  });
                  const filtered = agentSearchQuery.trim()
                    ? sorted.filter((agent) => {
                        const full = `${agent.name || ""} ${agent.surname || ""}`.toLowerCase();
                        return full.includes(agentSearchQuery.trim().toLowerCase());
                      })
                    : sorted;
                  if (filtered.length === 0) {
                    return (
                      <li style={{ padding: "12px 14px", color: "#666", fontSize: "14px" }}>
                        Aucun agent trouvé
                      </li>
                    );
                  }
                  return filtered.map((agent) => (
                    <li
                      key={agent.id}
                      onClick={() => handleAgentSelect(agent)}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        fontSize: "14px",
                        borderBottom: "1px solid #eee",
                        backgroundColor: agentData.id === agent.id ? "#e3f2fd" : "transparent",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#e3f2fd";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor =
                          agentData.id === agent.id ? "#e3f2fd" : "transparent";
                      }}
                    >
                      {`${agent.name || ""} ${agent.surname || ""}`.trim()}
                    </li>
                  ));
                })()}
              </ul>
            )}
          </Box>
          
          {/* Statut de l'agent */}
          {agentData.id && (
            <Box sx={{ mb: 2, p: 2, bgcolor: agentData.is_active ? '#e8f5e8' : '#ffebee', borderRadius: 1 }}>
              {agentUsesContratVisibility(agentData) ? (
                <>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Effectif :</strong> géré par les dates de contrat (carte agent).
                  </Typography>
                  <Typography variant="body2" color={agentData.is_active ? 'success.main' : 'error.main'} sx={{ mt: 0.5 }}>
                    <strong>Aujourd&apos;hui :</strong>{' '}
                    {agentData.is_active ? 'Actif (contrat en cours)' : 'Hors contrat'}
                  </Typography>
                </>
              ) : (
                <>
                  <Typography variant="body2" color={agentData.is_active ? 'success.main' : 'error.main'}>
                    <strong>Statut :</strong> {agentData.is_active ? 'Actif dans l\'effectif' : 'Retiré de l\'effectif'}
                  </Typography>
                  {!agentData.is_active && agentData.date_desactivation && (
                    <Typography variant="body2" color="error.main">
                      <strong>Date de désactivation :</strong> {new Date(agentData.date_desactivation).toLocaleDateString('fr-FR')}
                    </Typography>
                  )}
                  {!agentData.is_active && (
                    <TextField
                      label="Date de reprise (optionnel)"
                      type="date"
                      value={dateReactivation}
                      onChange={(e) => setDateReactivation(e.target.value)}
                      fullWidth
                      margin="normal"
                      size="small"
                      InputLabelProps={{ shrink: true }}
                      helperText="Laissez vide pour reprendre aujourd'hui"
                    />
                  )}
                </>
              )}
            </Box>
          )}

          {/* Périodes d'inactivité (legacy — masqué si contrats avec dates) */}
          {agentData.id && !agentUsesContratVisibility(agentData) && (
            <Box sx={{ mb: 2, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Périodes d&apos;inactivité
              </Typography>
              {(agentData.periodes_inactivite || []).length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Aucune période enregistrée
                </Typography>
              ) : (
                (agentData.periodes_inactivite || []).map((periode) => (
                  <Box
                    key={periode.id}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      py: 0.5,
                    }}
                  >
                    <Typography variant="body2">
                      {formatPeriodeInactivite(periode)}
                      {periode.motif ? ` — ${periode.motif}` : ''}
                      {periode.date_fin ? " — période terminée" : " — période active"}
                    </Typography>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeletePeriode(periode.id)}
                      disabled={isLoading}
                      aria-label="Supprimer la période"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))
              )}
              <Divider sx={{ my: 1.5 }} />
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Ajouter une période (ex. absence en août uniquement)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                <TextField
                  label="Début"
                  type="date"
                  value={nouvellePeriode.date_debut}
                  onChange={(e) =>
                    setNouvellePeriode((p) => ({ ...p, date_debut: e.target.value }))
                  }
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Fin (optionnel)"
                  type="date"
                  value={nouvellePeriode.date_fin}
                  onChange={(e) =>
                    setNouvellePeriode((p) => ({ ...p, date_fin: e.target.value }))
                  }
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Motif"
                  value={nouvellePeriode.motif}
                  onChange={(e) =>
                    setNouvellePeriode((p) => ({ ...p, motif: e.target.value }))
                  }
                  size="small"
                  sx={{ minWidth: 140 }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleAddPeriode}
                  disabled={isLoading || !nouvellePeriode.date_debut}
                >
                  Ajouter
                </Button>
              </Box>
            </Box>
          )}
          
          <TextField
            label="Nom"
            name="name"
            value={agentData.name}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Prénom"
            name="surname"
            value={agentData.surname}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Adresse mail"
            name="email"
            value={agentData.email || ""}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Adresse"
            name="address"
            value={agentData.address}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Numéro de téléphone"
            name="phone_Number"
            type="tel"
            inputProps={{ inputMode: "tel" }}
            value={agentData.phone_Number}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Type de paiement"
            name="type_paiement"
            value={agentData.type_paiement || "horaire"}
            onChange={handleChange}
            fullWidth
            margin="normal"
            select
          >
            <MenuItem value="horaire">Horaire</MenuItem>
            <MenuItem value="journalier">Journalier</MenuItem>
          </TextField>
          {agentData.type_paiement === "horaire" && (
            <TextField
              label="Taux horaire"
              name="taux_Horaire"
              value={agentData.taux_Horaire}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
          )}
          {agentData.type_paiement === "journalier" && (
            <TextField
              label="Taux journalier"
              name="taux_journalier"
              value={agentData.taux_journalier}
              onChange={handleChange}
              fullWidth
              margin="normal"
            />
          )}
          <TextField
            label="Congé"
            name="conge"
            value={agentData.conge}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          {agentData.type_paiement === "horaire" && (
            <>
              <TextField
                label="Heure de début"
                name="heure_debut"
                type="time"
                value={agentData.heure_debut}
                onChange={handleChange}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Heure de fin"
                name="heure_fin"
                type="time"
                value={agentData.heure_fin}
                onChange={handleChange}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Heure de pause début"
                name="heure_pause_debut"
                type="time"
                value={agentData.heure_pause_debut}
                onChange={handleChange}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Heure de pause fin"
                name="heure_pause_fin"
                type="time"
                value={agentData.heure_pause_fin}
                onChange={handleChange}
                fullWidth
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </>
          )}
          <TextField
            label="Jours de travail"
            name="jours_travail"
            value={agentData.jours_travail}
            onChange={handleJoursChange}
            fullWidth
            margin="normal"
            select
            SelectProps={{ multiple: true }}
          >
            {joursOptions.map((jour) => (
              <MenuItem key={jour} value={jour}>
                {jour}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        
        <DialogActions>
          <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'space-between' }}>
            <Box>
              {agentData.id && !agentUsesContratVisibility(agentData) && (
                <>
                  {agentData.is_active ? (
                    <Button 
                      variant="contained" 
                      color="error" 
                      onClick={handleDesactiver}
                      disabled={isLoading}
                    >
                      Retirer de l'effectif
                    </Button>
                  ) : (
                    <Button 
                      variant="contained" 
                      color="success" 
                      onClick={handleReactiver}
                      disabled={isLoading}
                    >
                      Remettre dans l'effectif
                    </Button>
                  )}
                </>
              )}
            </Box>
            <Box>
              <Button variant="contained" color="primary" onClick={handleSubmit}>
                Enregistrer
              </Button>
              <Button onClick={handleClose} sx={{ ml: 1 }}>
                Annuler
              </Button>
            </Box>
          </Box>
        </DialogActions>
      </Dialog>
      
      {/* Dialog de confirmation de désactivation */}
      <Dialog open={showDesactivationDialog} onClose={() => setShowDesactivationDialog(false)}>
        <DialogTitle>Confirmer la désactivation</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Êtes-vous sûr de vouloir retirer <strong>{agentData.name} {agentData.surname}</strong> de l&apos;effectif ?
          </Typography>
          <TextField
            label="Date de début"
            type="date"
            value={dateDesactivation}
            onChange={(e) => setDateDesactivation(e.target.value)}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="Date de fin (optionnel)"
            type="date"
            value={dateFinDesactivation}
            onChange={(e) => setDateFinDesactivation(e.target.value)}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
            helperText="Laissez vide pour une absence jusqu'à réactivation manuelle"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDesactivationDialog(false)}>
            Annuler
          </Button>
          <Button 
            onClick={confirmDesactivation} 
            color="error" 
            variant="contained"
            disabled={isLoading || !dateDesactivation}
          >
            {isLoading ? "Désactivation..." : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditAgentModal;