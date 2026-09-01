import {
  Alert,
  Box,
  Button,
  Dialog,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import "../../static/css/agentCarte.css";

const EMPTY_AGENT = {
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
  type_contrat: "",
  fin_periode_essai: "",
  date_debut_contrat: "",
  date_fin_contrat: "",
  carte_btp: false,
  photo_url: "",
};

const joursOptions = [
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
  "dimanche",
];

const formatDateForInput = (val) => {
  if (!val) return "";
  return String(val).slice(0, 10);
};

const AgentCarteModal = ({ isOpen, handleClose, refreshAgents, agents = [] }) => {
  const agentsEffectif = React.useMemo(
    () => agents.filter((a) => a.is_active !== false),
    [agents]
  );

  const [agentSearchQuery, setAgentSearchQuery] = useState("");
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);
  const agentDropdownRef = useRef(null);
  const photoInputRef = useRef(null);

  const [agentData, setAgentData] = useState(EMPTY_AGENT);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const handleAgentSelect = (selectedAgent) => {
    if (!selectedAgent) return;
    setAgentData({
      ...EMPTY_AGENT,
      ...selectedAgent,
      heure_debut: selectedAgent.heure_debut
        ? selectedAgent.heure_debut.slice(0, 5)
        : "",
      heure_fin: selectedAgent.heure_fin
        ? selectedAgent.heure_fin.slice(0, 5)
        : "",
      heure_pause_debut: selectedAgent.heure_pause_debut
        ? selectedAgent.heure_pause_debut.slice(0, 5)
        : "",
      heure_pause_fin: selectedAgent.heure_pause_fin
        ? selectedAgent.heure_pause_fin.slice(0, 5)
        : "",
      jours_travail: selectedAgent.jours_travail
        ? selectedAgent.jours_travail.split(",").map((j) => j.trim())
        : [],
      fin_periode_essai: formatDateForInput(selectedAgent.fin_periode_essai),
      date_debut_contrat: formatDateForInput(selectedAgent.date_debut_contrat),
      date_fin_contrat: formatDateForInput(selectedAgent.date_fin_contrat),
      carte_btp: Boolean(selectedAgent.carte_btp),
      photo_url: selectedAgent.photo_url || "",
    });
    setAgentSearchQuery("");
    setAgentDropdownOpen(false);
    setMessage({ type: "", text: "" });
  };

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

  useEffect(() => {
    if (!isOpen) {
      setAgentSearchQuery("");
      setAgentDropdownOpen(false);
      setMessage({ type: "", text: "" });
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAgentData((prev) => ({ ...prev, [name]: value }));
  };

  const handleJoursChange = (e) => {
    setAgentData((prev) => ({ ...prev, jours_travail: e.target.value }));
  };

  const handleSubmit = async () => {
    if (!agentData.id) {
      setMessage({ type: "error", text: "Veuillez sélectionner un agent." });
      return;
    }
    if (isLoading) return;
    setIsLoading(true);
    try {
      const joursTravailUniques = Array.from(
        new Set(agentData.jours_travail.map((j) => j.trim()))
      );
      const payload = {
        name: agentData.name,
        surname: agentData.surname,
        email: agentData.email || null,
        address: agentData.address,
        phone_Number: String(agentData.phone_Number),
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
        jours_travail: joursTravailUniques.join(","),
        type_contrat: agentData.type_contrat || null,
        fin_periode_essai: agentData.fin_periode_essai || null,
        date_debut_contrat: agentData.date_debut_contrat || null,
        date_fin_contrat:
          agentData.type_contrat === "cdd"
            ? agentData.date_fin_contrat || null
            : null,
        carte_btp: Boolean(agentData.carte_btp),
      };

      if (agentData.type_paiement === "journalier") {
        payload.taux_Horaire = null;
        payload.heure_debut = null;
        payload.heure_fin = null;
        payload.heure_pause_debut = null;
        payload.heure_pause_fin = null;
      } else {
        payload.taux_journalier = null;
      }

      await axios.put(`/api/agent/${agentData.id}/`, payload);
      setMessage({ type: "success", text: "Carte agent enregistrée." });
      refreshAgents();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Erreur lors de l'enregistrement.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (agentDropdownOpen) {
      setAgentDropdownOpen(false);
      return;
    }
    handleSubmit();
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !agentData.id) return;
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await axios.post(
        `/api/agent/${agentData.id}/upload_photo/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setAgentData((prev) => ({
        ...prev,
        photo_url: res.data.photo_url || "",
      }));
      setMessage({ type: "success", text: "Photo mise à jour." });
      refreshAgents();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Erreur lors de l'upload de la photo.",
      });
    } finally {
      setIsUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handlePhotoDelete = async () => {
    if (!agentData.id || !agentData.photo_url) return;
    setIsUploadingPhoto(true);
    try {
      await axios.delete(`/api/agent/${agentData.id}/delete_photo/`);
      setAgentData((prev) => ({ ...prev, photo_url: "" }));
      setMessage({ type: "success", text: "Photo supprimée." });
      refreshAgents();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Erreur lors de la suppression.",
      });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const sortedAgents = [...agentsEffectif].sort((a, b) => {
    const na = `${a.name || ""} ${a.surname || ""}`.trim();
    const nb = `${b.name || ""} ${b.surname || ""}`.trim();
    return na.localeCompare(nb, "fr");
  });

  const filteredAgents = agentSearchQuery.trim()
    ? sortedAgents.filter((agent) => {
        const full = `${agent.name || ""} ${agent.surname || ""}`.toLowerCase();
        return full.includes(agentSearchQuery.trim().toLowerCase());
      })
    : sortedAgents;

  const renderField = (label, name, type = "text", options = null, extra = {}) => (
    <div className={`agent-carte-field ${extra.fullWidth ? "full-width" : ""}`}>
      <label htmlFor={`carte-${name}`}>{label}</label>
      {options ? (
        <TextField
          id={`carte-${name}`}
          name={name}
          value={agentData[name] ?? ""}
          onChange={handleChange}
          select
          size="small"
          fullWidth
          disabled={!agentData.id}
          {...extra.fieldProps}
        >
          {options.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
      ) : (
        <TextField
          id={`carte-${name}`}
          name={name}
          type={type}
          value={agentData[name] ?? ""}
          onChange={handleChange}
          size="small"
          fullWidth
          disabled={!agentData.id}
          InputLabelProps={type === "date" || type === "time" ? { shrink: true } : undefined}
          {...extra.fieldProps}
        />
      )}
    </div>
  );

  return (
    <Dialog
      open={isOpen}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      scroll="paper"
      className="agent-carte-modal"
    >
      <form className="agent-carte-form" onSubmit={handleFormSubmit} noValidate>
        <div className="agent-carte">
          <div className="agent-carte-header">
            <div>
              <div className="agent-carte-header-title">Carte Agent</div>
              <div className="agent-carte-header-subtitle">
                Informations contractuelles et identité
              </div>
            </div>
            <IconButton onClick={handleClose} sx={{ color: "#fff" }} size="small" type="button">
              <CloseIcon />
            </IconButton>
          </div>

          <div className="agent-carte-content">
        <div className="agent-carte-search">
          {message.text && (
            <Alert
              severity={message.type}
              sx={{ mb: 2 }}
              onClose={() => setMessage({ type: "", text: "" })}
            >
              {message.text}
            </Alert>
          )}

          <Box ref={agentDropdownRef} sx={{ position: "relative", mb: 2 }}>
            <Typography
              component="label"
              sx={{ display: "block", fontSize: 12, color: "text.secondary", mb: 0.5 }}
            >
              Sélectionner un agent
            </Typography>
            <input
              type="text"
              placeholder="Rechercher un agent..."
              value={
                agentData.id
                  ? `${agentData.name || ""} ${agentData.surname || ""}`.trim()
                  : agentSearchQuery
              }
              onChange={(e) => {
                setAgentSearchQuery(e.target.value);
                if (agentData.id) {
                  setAgentData(EMPTY_AGENT);
                }
                setAgentDropdownOpen(true);
              }}
              onFocus={() => setAgentDropdownOpen(true)}
              style={{
                width: "100%",
                padding: "12px 14px",
                border: "2px solid #d0dce8",
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
                  maxHeight: "200px",
                  overflowY: "auto",
                  backgroundColor: "#fff",
                  border: "2px solid #1b78bc",
                  borderRadius: "8px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  zIndex: 10,
                }}
              >
                {filteredAgents.length === 0 ? (
                  <li style={{ padding: "12px 14px", color: "#666", fontSize: "14px" }}>
                    Aucun agent trouvé
                  </li>
                ) : (
                  filteredAgents.map((agent) => (
                    <li
                      key={agent.id}
                      onClick={() => handleAgentSelect(agent)}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        fontSize: "14px",
                        borderBottom: "1px solid #eee",
                        backgroundColor:
                          agentData.id === agent.id ? "#e3f2fd" : "transparent",
                      }}
                    >
                      {`${agent.name || ""} ${agent.surname || ""}`.trim()}
                    </li>
                  ))
                )}
              </ul>
            )}
          </Box>
        </div>

        {agentData.id && (
          <div className="agent-carte-body">
            <div className="agent-carte-photo-zone">
              <div
                className="agent-carte-photo"
                onClick={() => photoInputRef.current?.click()}
                title="Cliquer pour ajouter ou modifier la photo"
              >
                {agentData.photo_url ? (
                  <img src={agentData.photo_url} alt="Photo agent" />
                ) : (
                  <div className="agent-carte-photo-placeholder">
                    <PhotoCameraIcon sx={{ fontSize: 36 }} />
                    <span>Ajouter une photo</span>
                  </div>
                )}
              </div>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handlePhotoUpload}
              />
              <div className="agent-carte-photo-actions">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PhotoCameraIcon />}
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                >
                  {isUploadingPhoto ? "..." : "Photo"}
                </Button>
                {agentData.photo_url && (
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    startIcon={<DeleteOutlineIcon />}
                    onClick={handlePhotoDelete}
                    disabled={isUploadingPhoto}
                  >
                    Suppr.
                  </Button>
                )}
              </div>
            </div>

            <div className="agent-carte-fields">
              <div className="agent-carte-section-title">Identité</div>
              {renderField("Nom", "name")}
              {renderField("Prénom", "surname")}
              {renderField("Adresse mail", "email", "email", null, { fullWidth: true })}
              {renderField("Adresse", "address", "text", null, { fullWidth: true })}
              {renderField("Téléphone", "phone_Number")}

              <div className="agent-carte-section-title">Contrat</div>
              {renderField("Type de contrat", "type_contrat", "text", [
                { value: "", label: "—" },
                { value: "cdi", label: "CDI" },
                { value: "cdd", label: "CDD" },
              ])}
              {renderField("Fin période d'essai", "fin_periode_essai", "date")}
              {renderField("Début contrat", "date_debut_contrat", "date")}
              {agentData.type_contrat === "cdd" &&
                renderField("Fin contrat (CDD)", "date_fin_contrat", "date")}
              {renderField("Carte BTP", "carte_btp", "text", [
                { value: "false", label: "Non" },
                { value: "true", label: "Oui" },
              ], {
                fieldProps: {
                  value: agentData.carte_btp ? "true" : "false",
                  onChange: (e) =>
                    setAgentData((prev) => ({
                      ...prev,
                      carte_btp: e.target.value === "true",
                    })),
                },
              })}

              <div className="agent-carte-section-title">Rémunération</div>
              {renderField("Type de paiement", "type_paiement", "text", [
                { value: "horaire", label: "Horaire" },
                { value: "journalier", label: "Journalier" },
              ])}
              {agentData.type_paiement === "horaire" &&
                renderField("Taux horaire (€)", "taux_Horaire", "number")}
              {agentData.type_paiement === "journalier" &&
                renderField("Taux journalier (€)", "taux_journalier", "number")}
              {renderField("Congé (jours)", "conge", "number")}

              {agentData.type_paiement === "horaire" && (
                <>
                  <div className="agent-carte-section-title">Horaires</div>
                  {renderField("Heure début", "heure_debut", "time")}
                  {renderField("Heure fin", "heure_fin", "time")}
                  {renderField("Pause début", "heure_pause_debut", "time")}
                  {renderField("Pause fin", "heure_pause_fin", "time")}
                </>
              )}

              <div className="agent-carte-field full-width">
                <label htmlFor="carte-jours">Jours de travail</label>
                <TextField
                  id="carte-jours"
                  name="jours_travail"
                  value={agentData.jours_travail}
                  onChange={handleJoursChange}
                  select
                  SelectProps={{ multiple: true }}
                  size="small"
                  fullWidth
                >
                  {joursOptions.map((jour) => (
                    <MenuItem key={jour} value={jour}>
                      {jour}
                    </MenuItem>
                  ))}
                </TextField>
              </div>
            </div>
          </div>
        )}

        {!agentData.id && (
          <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>
            <Typography variant="body1">
              Sélectionnez un agent pour afficher et modifier sa carte.
            </Typography>
          </Box>
        )}
          </div>

          <div className="agent-carte-footer">
            <Button type="button" onClick={handleClose}>
              Fermer
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!agentData.id || isLoading}
            >
              {isLoading ? "Enregistrement..." : "Enregistrer"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
};

export default AgentCarteModal;
