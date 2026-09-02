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

import AddIcon from "@mui/icons-material/Add";

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

  photo_url: "",

};



const EMPTY_AVENANT = {
  id: null,
  numero: null,
  libelle: "",
  date_fin_contrat: "",
};



const EMPTY_CONTRAT = {

  id: null,

  libelle: "",

  type_contrat: "",

  fin_periode_essai: "",

  date_debut_contrat: "",

  date_fin_contrat: "",

  carte_btp: false,

  created_at: null,

  avenants: [],

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



const formatApiError = (error, fallback) => {

  const data = error?.response?.data;

  if (!data) return fallback;

  if (typeof data === "string") return data;

  if (data.error) return data.error;

  if (typeof data === "object") {

    const parts = Object.entries(data).flatMap(([key, val]) => {

      if (Array.isArray(val)) return val.map((msg) => `${key}: ${msg}`);

      if (typeof val === "string") return [`${key}: ${val}`];

      return [];

    });

    if (parts.length) return parts.join(" · ");

  }

  return fallback;

};



const sortContratsDesc = (list) =>

  [...list].sort((a, b) => {

    const da = a.date_debut_contrat || a.created_at || "";

    const db = b.date_debut_contrat || b.created_at || "";

    return String(db).localeCompare(String(da));

  });



const mapAvenantFromApi = (a) => ({
  id: a.id,
  numero: a.numero,
  libelle: a.libelle || "",
  date_fin_contrat: formatDateForInput(a.date_fin_contrat),
});



const mapContratFromApi = (c) => ({
  id: c.id,
  libelle: c.libelle || "",
  type_contrat: c.type_contrat || "",
  fin_periode_essai: formatDateForInput(c.fin_periode_essai),
  date_debut_contrat: formatDateForInput(c.date_debut_contrat),
  date_fin_contrat: formatDateForInput(c.date_fin_contrat),
  date_fin_effective: formatDateForInput(c.date_fin_effective),
  carte_btp: Boolean(c.carte_btp),
  created_at: c.created_at || null,
  avenants: [...(c.avenants || []).map(mapAvenantFromApi)].sort(
    (a, b) => (a.numero || 0) - (b.numero || 0)
  ),
});



const buildContratsFromAgent = (selectedAgent) => {

  if (Array.isArray(selectedAgent.contrats) && selectedAgent.contrats.length > 0) {

    return sortContratsDesc(selectedAgent.contrats.map(mapContratFromApi));

  }

  if (

    selectedAgent.type_contrat ||

    selectedAgent.date_debut_contrat ||

    selectedAgent.fin_periode_essai

  ) {

    return sortContratsDesc([

      mapContratFromApi({

        id: null,

        libelle: selectedAgent.type_contrat

          ? `${selectedAgent.type_contrat.toUpperCase()}${

              selectedAgent.date_debut_contrat

                ? ` ${String(selectedAgent.date_debut_contrat).slice(0, 7).replace("-", "/")}`

                : ""

            }`

          : "Contrat initial",

        type_contrat: selectedAgent.type_contrat,

        fin_periode_essai: selectedAgent.fin_periode_essai,

        date_debut_contrat: selectedAgent.date_debut_contrat,

        date_fin_contrat: selectedAgent.date_fin_contrat,

        carte_btp: selectedAgent.carte_btp,

      }),

    ]);

  }

  return [];

};



const getContratTabLabel = (c, index) => {

  if (c.libelle?.trim()) return c.libelle.trim();

  if (c.type_contrat && c.date_debut_contrat) {

    const [y, m] = String(c.date_debut_contrat).slice(0, 10).split("-");

    if (y && m) return `${c.type_contrat.toUpperCase()} ${m}/${y}`;

    return c.type_contrat.toUpperCase();

  }

  if (c.type_contrat) return c.type_contrat.toUpperCase();

  return `Contrat ${index + 1}`;

};



const formatDateFr = (val) => {

  if (!val) return "";

  const [y, m, d] = String(val).slice(0, 10).split("-");

  if (!y || !m || !d) return "";

  return `${d}/${m}/${y}`;

};



const getDateFinEffective = (contrat) => {

  const avenants = contrat?.avenants || [];

  if (avenants.length > 0) {

    const withDate = avenants.filter((a) => a.date_fin_contrat);

    if (withDate.length > 0) {

      return [...withDate].sort((a, b) =>

        String(b.date_fin_contrat).localeCompare(String(a.date_fin_contrat))

      )[0].date_fin_contrat;

    }

  }

  return contrat?.date_fin_effective || contrat?.date_fin_contrat || "";

};



const getContratTabDates = (contrat) => {

  const debut = formatDateFr(contrat?.date_debut_contrat);

  const fin =

    contrat?.type_contrat === "cdd"

      ? formatDateFr(getDateFinEffective(contrat))

      : "";



  if (debut && fin) return `${debut} → ${fin}`;

  if (debut) return `Depuis ${debut}`;

  if (fin) return `Jusqu'au ${fin}`;

  return "";

};



const AgentCarteModal = ({ isOpen, handleClose, refreshAgents, agents = [] }) => {

  const getAgentLabel = (agent) =>
    `${agent?.name || ""} ${agent?.surname || ""}`.trim();

  const sortedAgents = React.useMemo(
    () =>
      [...agents].sort((a, b) => {
        const na = getAgentLabel(a).toLowerCase();
        const nb = getAgentLabel(b).toLowerCase();
        return na.localeCompare(nb, "fr", { sensitivity: "base" });
      }),
    [agents]
  );



  const [agentSearchQuery, setAgentSearchQuery] = useState("");

  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);

  const agentDropdownRef = useRef(null);

  const photoInputRef = useRef(null);



  const [agentData, setAgentData] = useState(EMPTY_AGENT);

  const [contrats, setContrats] = useState([]);

  const [activeContratIndex, setActiveContratIndex] = useState(0);

  const [deletedContratIds, setDeletedContratIds] = useState([]);

  const [deletedAvenantIds, setDeletedAvenantIds] = useState([]);

  const [isLoading, setIsLoading] = useState(false);

  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [message, setMessage] = useState({ type: "", text: "" });



  const activeContrat = contrats[activeContratIndex] || null;



  const resetAgentSelection = () => {

    setAgentData(EMPTY_AGENT);

    setContrats([]);

    setActiveContratIndex(0);

    setDeletedContratIds([]);

    setDeletedAvenantIds([]);

  };



  const handleAgentSelect = async (selectedAgent) => {
    if (!selectedAgent) return;

    let agent = selectedAgent;
    try {
      const res = await axios.get(`/api/agent/${selectedAgent.id}/`);
      agent = res.data;
    } catch (error) {
      console.error("Erreur chargement agent:", error);
    }

    setAgentData({
      ...EMPTY_AGENT,
      ...agent,
      heure_debut: agent.heure_debut ? agent.heure_debut.slice(0, 5) : "",
      heure_fin: agent.heure_fin ? agent.heure_fin.slice(0, 5) : "",
      heure_pause_debut: agent.heure_pause_debut
        ? agent.heure_pause_debut.slice(0, 5)
        : "",
      heure_pause_fin: agent.heure_pause_fin ? agent.heure_pause_fin.slice(0, 5) : "",
      jours_travail: agent.jours_travail
        ? agent.jours_travail.split(",").map((j) => j.trim())
        : [],
      photo_url: agent.photo_url || "",
    });
    setContrats(buildContratsFromAgent(agent));
    setActiveContratIndex(0);
    setDeletedContratIds([]);
    setDeletedAvenantIds([]);
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



  const updateActiveContrat = (field, value) => {

    setContrats((prev) =>

      prev.map((c, i) => (i === activeContratIndex ? { ...c, [field]: value } : c))

    );

  };



  const handleAddContrat = () => {

    setContrats((prev) => [{ ...EMPTY_CONTRAT }, ...prev]);

    setActiveContratIndex(0);

  };



  const handleDeleteContrat = (index) => {

    const target = contrats[index];

    if (target?.id) {

      setDeletedContratIds((prev) => [...prev, target.id]);

      setDeletedAvenantIds((prev) =>

        prev.filter((item) => item.contratIndex !== index)

      );

    }

    const next = contrats.filter((_, i) => i !== index);

    setContrats(next);

    setDeletedAvenantIds((prev) =>

      prev.map((item) => {

        if (item.contratIndex < index) return item;

        if (item.contratIndex > index) {

          return { ...item, contratIndex: item.contratIndex - 1 };

        }

        return null;

      }).filter(Boolean)

    );

    setActiveContratIndex((prev) => {

      if (next.length === 0) return 0;

      if (index < prev) return prev - 1;

      if (index === prev) return Math.min(prev, next.length - 1);

      return prev;

    });

  };



  const updateActiveContratAvenant = (avenantIndex, field, value) => {

    setContrats((prev) =>

      prev.map((c, i) => {

        if (i !== activeContratIndex) return c;

        const avenants = (c.avenants || []).map((a, j) =>

          j === avenantIndex ? { ...a, [field]: value } : a

        );

        return { ...c, avenants };

      })

    );

  };



  const handleAddAvenant = () => {

    setContrats((prev) =>

      prev.map((c, i) =>

        i === activeContratIndex

          ? { ...c, avenants: [...(c.avenants || []), { ...EMPTY_AVENANT }] }

          : c

      )

    );

  };



  const handleDeleteAvenant = (avenantIndex) => {

    const avenant = activeContrat?.avenants?.[avenantIndex];

    if (avenant?.id) {

      setDeletedAvenantIds((prev) => [

        ...prev,

        { contratIndex: activeContratIndex, avenantId: avenant.id },

      ]);

    }

    setContrats((prev) =>

      prev.map((c, i) => {

        if (i !== activeContratIndex) return c;

        return {

          ...c,

          avenants: (c.avenants || []).filter((_, j) => j !== avenantIndex),

        };

      })

    );

  };



  const syncAvenantsForContrat = async (agentId, contratId, contratIndex, avenants) => {

    const toDelete = deletedAvenantIds

      .filter((item) => item.contratIndex === contratIndex)

      .map((item) => item.avenantId);



    for (const avenantId of toDelete) {

      await axios.delete(

        `/api/agent/${agentId}/contrats/${contratId}/avenants/${avenantId}/`

      );

    }



    for (const avenant of avenants || []) {

      if (!avenant.date_fin_contrat) continue;

      const payload = {

        libelle: avenant.libelle || "",

        date_fin_contrat: avenant.date_fin_contrat,

      };

      if (avenant.id) {

        await axios.patch(

          `/api/agent/${agentId}/contrats/${contratId}/avenants/${avenant.id}/`,

          payload

        );

      } else {

        await axios.post(

          `/api/agent/${agentId}/contrats/${contratId}/avenants/`,

          payload

        );

      }

    }

  };



  const syncContrats = async (agentId) => {

    for (const id of deletedContratIds) {

      await axios.delete(`/api/agent/${agentId}/contrats/${id}/`);

    }



    for (let contratIndex = 0; contratIndex < contrats.length; contratIndex += 1) {

      const c = contrats[contratIndex];

      const payload = {

        libelle: c.libelle || "",

        type_contrat: c.type_contrat || null,

        fin_periode_essai: c.fin_periode_essai || null,

        date_debut_contrat: c.date_debut_contrat || null,

        date_fin_contrat:

          c.type_contrat === "cdd" ? c.date_fin_contrat || null : null,

        carte_btp: Boolean(c.carte_btp),

      };

      const hasContent =

        payload.libelle ||

        payload.type_contrat ||

        payload.date_debut_contrat ||

        payload.fin_periode_essai;



      let contratId = c.id;

      if (c.id) {

        await axios.patch(`/api/agent/${agentId}/contrats/${c.id}/`, payload);

      } else if (hasContent) {

        const res = await axios.post(`/api/agent/${agentId}/contrats/`, payload);

        contratId = res.data.id;

      }



      if (contratId && c.type_contrat === "cdd") {

        await syncAvenantsForContrat(agentId, contratId, contratIndex, c.avenants);

      }

    }



    const agentRes = await axios.get(`/api/agent/${agentId}/`);

    const updated = sortContratsDesc(

      (agentRes.data.contrats || []).map(mapContratFromApi)

    );

    setContrats(updated);

    setDeletedContratIds([]);

    setDeletedAvenantIds([]);

    setActiveContratIndex(0);

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

      await syncContrats(agentData.id);

      setMessage({ type: "success", text: "Carte agent enregistrée." });

      refreshAgents();

    } catch (error) {

      setMessage({

        type: "error",

        text: formatApiError(error, "Erreur lors de l'enregistrement."),

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



  const filteredAgents = agentSearchQuery.trim()

    ? sortedAgents.filter((agent) => {

        const full = getAgentLabel(agent).toLowerCase();

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

            <MenuItem key={String(opt.value)} value={opt.value}>

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



  const renderContratField = (

    label,

    name,

    type = "text",

    options = null,

    extra = {}

  ) => {

    if (!activeContrat) return null;

    const fieldId = `carte-contrat-${name}`;

    return (

      <div className={`agent-carte-field ${extra.fullWidth ? "full-width" : ""}`}>

        <label htmlFor={fieldId}>{label}</label>

        {options ? (

          <TextField

            id={fieldId}

            name={name}

            value={extra.fieldProps?.value ?? activeContrat[name] ?? ""}

            onChange={

              extra.fieldProps?.onChange ||

              ((e) => updateActiveContrat(name, e.target.value))

            }

            select

            size="small"

            fullWidth

            {...extra.fieldProps}

          >

            {options.map((opt) => (

              <MenuItem key={String(opt.value)} value={opt.value}>

                {opt.label}

              </MenuItem>

            ))}

          </TextField>

        ) : (

          <TextField

            id={fieldId}

            name={name}

            type={type}

            value={activeContrat[name] ?? ""}

            onChange={(e) => updateActiveContrat(name, e.target.value)}

            size="small"

            fullWidth

            InputLabelProps={type === "date" || type === "time" ? { shrink: true } : undefined}

          />

        )}

      </div>

    );

  };



  const renderAvenantField = (avenantIndex, label, field, type = "text", extra = {}) => {

    const avenant = activeContrat?.avenants?.[avenantIndex];

    if (!avenant) return null;

    const fieldId = `carte-avenant-${avenantIndex}-${field}`;

    return (

      <div className={`agent-carte-field ${extra.fullWidth ? "full-width" : ""}`}>

        <div className="agent-carte-field-label-row">

          <label htmlFor={fieldId}>{label}</label>

          {field === "libelle" && (

            <IconButton

              type="button"

              size="small"

              color="error"

              onClick={() => handleDeleteAvenant(avenantIndex)}

              aria-label="Supprimer l'avenant"

              sx={{ p: 0.25 }}

            >

              <DeleteOutlineIcon sx={{ fontSize: 16 }} />

            </IconButton>

          )}

        </div>

        <TextField

          id={fieldId}

          type={type}

          value={avenant[field] ?? ""}

          onChange={(e) => updateActiveContratAvenant(avenantIndex, field, e.target.value)}

          size="small"

          fullWidth

          placeholder={extra.placeholder}

          InputLabelProps={type === "date" ? { shrink: true } : undefined}

        />

      </div>

    );

  };



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



          <div className={`agent-carte-search${agentDropdownOpen ? " is-open" : ""}`}>

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

                      ? getAgentLabel(agentData)

                      : agentSearchQuery

                  }

                  onChange={(e) => {

                    setAgentSearchQuery(e.target.value);

                    if (agentData.id) {

                      resetAgentSelection();

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

                  <ul className="agent-carte-agent-dropdown">

                    {filteredAgents.length === 0 ? (

                      <li className="agent-carte-agent-dropdown-empty">Aucun agent trouvé</li>

                    ) : (

                      filteredAgents.map((agent) => (

                        <li

                          key={agent.id}

                          onClick={() => handleAgentSelect(agent)}

                          className={

                            agentData.id === agent.id

                              ? "agent-carte-agent-dropdown-item active"

                              : "agent-carte-agent-dropdown-item"

                          }

                        >

                          {getAgentLabel(agent)}

                          {agent.is_active === false && (

                            <span className="agent-carte-agent-inactive-tag"> (inactif)</span>

                          )}

                        </li>

                      ))

                    )}

                  </ul>

                )}

              </Box>

            </div>



          <div className="agent-carte-content">

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

                      type="button"

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

                        type="button"

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



                  <div className="agent-carte-section-title agent-carte-contrat-header">

                    <span>Contrat</span>

                    <Button

                      type="button"

                      size="small"

                      variant="outlined"

                      startIcon={<AddIcon />}

                      onClick={handleAddContrat}

                      className="agent-carte-add-contrat-btn"

                    >

                      Ajouter

                    </Button>

                  </div>



                  {contrats.length > 0 ? (

                    <>

                      <div className="agent-carte-contrat-tabs full-width">

                        {contrats.map((c, index) => (

                          <button

                            key={c.id || `new-${index}`}

                            type="button"

                            className={`agent-carte-contrat-tab${

                              index === activeContratIndex ? " active" : ""

                            }${index === 0 ? " latest" : ""}`}

                            onClick={() => setActiveContratIndex(index)}

                          >

                            <div className="agent-carte-contrat-tab-main">

                              <span className="agent-carte-contrat-tab-label">

                                {getContratTabLabel(c, index)}

                              </span>

                              {getContratTabDates(c) && (

                                <span className="agent-carte-contrat-tab-dates">

                                  {getContratTabDates(c)}

                                </span>

                              )}

                            </div>

                            {index === 0 && (

                              <span className="agent-carte-contrat-tab-badge">Récent</span>

                            )}

                            {contrats.length > 1 && (

                              <span

                                className="agent-carte-contrat-tab-close"

                                role="button"

                                tabIndex={0}

                                onClick={(e) => {

                                  e.stopPropagation();

                                  handleDeleteContrat(index);

                                }}

                                onKeyDown={(e) => {

                                  if (e.key === "Enter" || e.key === " ") {

                                    e.preventDefault();

                                    e.stopPropagation();

                                    handleDeleteContrat(index);

                                  }

                                }}

                              >

                                ×

                              </span>

                            )}

                          </button>

                        ))}

                      </div>



                      {renderContratField("Libellé", "libelle", "text", null, {

                        fullWidth: true,

                      })}

                      {renderContratField("Type de contrat", "type_contrat", "text", [

                        { value: "", label: "—" },

                        { value: "cdi", label: "CDI" },

                        { value: "cdd", label: "CDD" },

                      ])}

                      {renderContratField("Fin période d'essai", "fin_periode_essai", "date")}

                      {renderContratField("Début contrat", "date_debut_contrat", "date")}

                      {activeContrat?.type_contrat === "cdd" &&

                        renderContratField("Fin contrat (CDD)", "date_fin_contrat", "date")}



                      {renderContratField("Carte BTP", "carte_btp", "text", [

                        { value: "false", label: "Non" },

                        { value: "true", label: "Oui" },

                      ], {

                        fieldProps: {

                          value: activeContrat.carte_btp ? "true" : "false",

                          onChange: (e) =>

                            updateActiveContrat("carte_btp", e.target.value === "true"),

                        },

                      })}



                      {activeContrat?.type_contrat === "cdd" && (

                        <>

                          <div className="agent-carte-section-title agent-carte-avenants-header full-width">

                            <span>Avenants CDD</span>

                            <Button

                              type="button"

                              size="small"

                              variant="outlined"

                              startIcon={<AddIcon />}

                              onClick={handleAddAvenant}

                              className="agent-carte-add-contrat-btn"

                            >

                              Ajouter

                            </Button>

                          </div>



                          {getDateFinEffective(activeContrat) && (

                            <div className="agent-carte-avenant-effective full-width">

                              <Typography variant="caption" color="text.secondary">

                                Fin effective :{" "}

                                <strong>

                                  {formatDateFr(getDateFinEffective(activeContrat))}

                                </strong>

                              </Typography>

                            </div>

                          )}



                          {(activeContrat.avenants || []).length === 0 && (

                            <div className="agent-carte-no-avenant full-width">

                              <Typography variant="body2" color="text.secondary">

                                Aucun avenant. Ajoutez-en un pour prolonger la date de fin du CDD.

                              </Typography>

                            </div>

                          )}



                          {(activeContrat.avenants || []).map((avenant, avenantIndex) => (

                            <React.Fragment key={avenant.id || `new-avenant-${avenantIndex}`}>

                              {renderAvenantField(

                                avenantIndex,

                                `Avenant ${avenant.numero || avenantIndex + 1} — Libellé`,

                                "libelle",

                                "text",

                                { placeholder: "Renouvellement, prolongation…" }

                              )}

                              {renderAvenantField(

                                avenantIndex,

                                `Avenant ${avenant.numero || avenantIndex + 1} — Nouvelle fin CDD`,

                                "date_fin_contrat",

                                "date"

                              )}

                            </React.Fragment>

                          ))}

                        </>

                      )}

                    </>

                  ) : (

                    <div className="agent-carte-no-contrat full-width">

                      <Typography variant="body2" color="text.secondary">

                        Aucun contrat enregistré. Cliquez sur « Ajouter » pour en créer un.

                      </Typography>

                    </div>

                  )}



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


