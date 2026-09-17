import {

  Alert,

  Box,

  Button,

  Dialog,

  DialogActions,

  DialogContent,

  DialogTitle,

  IconButton,

  MenuItem,

  TextField,

  Typography,

  Tooltip,

} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";

import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import AddIcon from "@mui/icons-material/Add";

import PersonAddIcon from "@mui/icons-material/PersonAdd";

import axios from "axios";

import React, { useEffect, useMemo, useRef, useState } from "react";

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



const EVENT_TYPE_LABELS = {
  presence: "Présence",
  absence: "Absence",
  conge: "Congé",
  modification_horaire: "Horaire modifié",
  ecole: "École",
};

const EVENT_SUBTYPE_LABELS = {
  justifiee: "Justifiée",
  injustifiee: "Injustifiée",
  maladie: "Maladie",
  rtt: "RTT",
  paye: "Payé",
  sans_solde: "Sans solde",
  parental: "Parental",
  maternite: "Maternité",
  paternite: "Paternité",
};

const WORKDAY_INDEX = {
  dimanche: 0,
  lundi: 1,
  mardi: 2,
  mercredi: 3,
  jeudi: 4,
  vendredi: 5,
  samedi: 6,
};

const WEEKDAY_INDEXES = new Set([1, 2, 3, 4, 5]);

const ABSENCE_EVENT_TYPES = new Set(["absence", "conge"]);

const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const parseISODate = (iso) => {
  const [y, m, d] = String(iso || "").slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

const addDaysISO = (iso, n) => {
  const date = parseISODate(iso);
  if (!date) return "";
  date.setDate(date.getDate() + n);
  return toISODate(date);
};

const isWeekday = (iso) => {
  const date = parseISODate(iso);
  return Boolean(date && WEEKDAY_INDEXES.has(date.getDay()));
};

const nextWeekdayISO = (iso) => {
  let cursor = addDaysISO(iso, 1);
  while (cursor && !isWeekday(cursor)) {
    cursor = addDaysISO(cursor, 1);
  }
  return cursor;
};

const eachISODate = (startISO, endISO) => {
  const start = parseISODate(startISO);
  const end = parseISODate(endISO);
  if (!start || !end || start > end) return [];
  const days = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    days.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

const getDefaultStatsRange = () => {
  const now = new Date();
  return {
    start: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)),
    end: toISODate(now),
  };
};

const getEventTypeLabel = (type) => EVENT_TYPE_LABELS[type] || type || "Événement";

const getEventSubtypeLabel = (subtype) => {
  if (!subtype) return "Non précisée";
  return EVENT_SUBTYPE_LABELS[subtype] || subtype;
};

const getEventDesignation = (event) => {
  const typeLabel = getEventTypeLabel(event.event_type);
  if (!event.subtype) return typeLabel;
  return `${typeLabel} · ${getEventSubtypeLabel(event.subtype)}`;
};

const getContratCoverage = (contrats) =>
  (contrats || [])
    .map((contrat) => {
      const start = String(contrat?.date_debut_contrat || "").slice(0, 10);
      if (!start) return null;
      const end = String(getDateFinEffective(contrat) || "").slice(0, 10);
      return { start, end: end || null };
    })
    .filter(Boolean);

const isDayCoveredByContrat = (iso, coverage) => {
  if (!coverage.length) return true;
  return coverage.some(({ start, end }) => iso >= start && (!end || iso <= end));
};

const getWorkDaysInRange = (startISO, endISO, joursTravail, coverage = []) => {
  const indexes = new Set(
    (joursTravail || [])
      .map((j) => WORKDAY_INDEX[String(j).trim().toLowerCase()])
      .filter((n) => WEEKDAY_INDEXES.has(n))
  );
  if (!indexes.size) {
    WEEKDAY_INDEXES.forEach((n) => indexes.add(n));
  }
  return eachISODate(startISO, endISO).filter((iso) => {
    if (!isWeekday(iso)) return false;
    if (!indexes.has(parseISODate(iso).getDay())) return false;
    return isDayCoveredByContrat(iso, coverage);
  });
};

const formatPct = (value, workDays) => {
  if (!workDays) return "—";
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded.toFixed(0) : rounded.toFixed(1)} %`;
};

const formatJours = (value) => {
  if (value == null || value === "" || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const CONGE_INFO_TEXT = [
  "Cliquez sur Acquis, En cours, Prévision ou Pris pour indiquer le réel à ce jour.",
  "Le calcul continue ensuite : mois clos, congés posés, prévision restante.",
  "2,5 jours par mois travaillé (lundi-vendredi), prorata selon le contrat.",
  "Plafond 30 jours. Reset le 31 mai, sans report automatique.",
].join("\n");

const CONGE_KPI_ITEMS = [
  { id: "acquis", label: "Acquis", valueKey: "acquis_clos" },
  { id: "en_cours", label: "En cours", valueKey: "en_cours" },
  { id: "previsionnel", label: "Prévision", valueKey: "previsionnel" },
  { id: "pris", label: "Pris", valueKey: "pris" },
];

const congeMonthDetail = (m) => {
  const parts = [`${formatJours(m.acquis)} j`];
  if (m.phase === "previsionnel" || m.statut === "previsionnel") parts.push("prév.");
  else if (m.statut === "prorata") parts.push("prorata");
  if (m.pris) parts.push(`${m.pris} pris`);
  return parts.join(" · ");
};

const CONGE_PHASE_LABELS = {
  clos: "Mois clos",
  en_cours: "Mois en cours",
  previsionnel: "Prévision",
};

const congeMonthKey = (m) => (m ? `${m.annee}-${m.mois}` : "");

const buildAgentPresenceStats = (events, startISO, endISO, joursTravail, contrats = []) => {
  const coverage = getContratCoverage(contrats);
  const workDays = getWorkDaysInRange(startISO, endISO, joursTravail, coverage);
  const workDaySet = new Set(workDays);
  const absenceByDay = new Map();
  const ecoleByDay = new Map();
  const recapDays = [];

  (events || []).forEach((event) => {
    const eventStart = String(event.start_date || "").slice(0, 10);
    const eventEnd = String(event.end_date || event.start_date || "").slice(0, 10);
    if (!eventStart) return;
    const from = eventStart < startISO ? startISO : eventStart;
    const to = (eventEnd || eventStart) > endISO ? endISO : eventEnd || eventStart;
    const designation = getEventDesignation(event);
    eachISODate(from, to).forEach((iso) => {
      const item = {
        date: iso,
        type: event.event_type,
        subtype: event.subtype || "",
        designation,
      };
      if (!isWeekday(iso)) return;
      if (ABSENCE_EVENT_TYPES.has(event.event_type)) {
        if (isDayCoveredByContrat(iso, coverage)) recapDays.push(item);
        if (workDaySet.has(iso) && !absenceByDay.has(iso)) {
          absenceByDay.set(iso, item);
        }
      } else if (event.event_type === "ecole" && workDaySet.has(iso) && !ecoleByDay.has(iso)) {
        ecoleByDay.set(iso, item);
      }
    });
  });

  ecoleByDay.forEach((_, iso) => {
    if (absenceByDay.has(iso)) ecoleByDay.delete(iso);
  });

  const uniqueRecapDays = [];
  const seen = new Set();
  recapDays
    .sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type))
    .forEach((item) => {
      const key = `${item.date}-${item.type}-${item.subtype}`;
      if (seen.has(key)) return;
      seen.add(key);
      uniqueRecapDays.push(item);
    });

  const groups = [];
  uniqueRecapDays.forEach((item) => {
    const last = groups[groups.length - 1];
    const consecutive =
      last &&
      last.type === item.type &&
      last.subtype === item.subtype &&
      nextWeekdayISO(last.endDate) === item.date;
    if (consecutive) {
      last.endDate = item.date;
      last.days += 1;
    } else {
      groups.push({
        type: item.type,
        subtype: item.subtype,
        designation: item.designation,
        startDate: item.date,
        endDate: item.date,
        days: 1,
      });
    }
  });

  const byDesignation = [];
  const designationMap = new Map();
  groups.forEach((group) => {
    if (!designationMap.has(group.designation)) {
      const entry = {
        designation: group.designation,
        type: group.type,
        days: 0,
      };
      designationMap.set(group.designation, entry);
      byDesignation.push(entry);
    }
    designationMap.get(group.designation).days += group.days;
  });
  byDesignation.sort((a, b) => b.days - a.days);

  const absenceDays = absenceByDay.size;
  const ecoleDays = ecoleByDay.size;
  const presenceDays = Math.max(0, workDays.length - absenceDays - ecoleDays);
  const workCount = workDays.length;

  return {
    workDays: workCount,
    presenceDays,
    absenceDays,
    ecoleDays,
    hasContratCoverage: coverage.length > 0,
    presencePct: workCount ? (presenceDays / workCount) * 100 : 0,
    absencePct: workCount ? (absenceDays / workCount) * 100 : 0,
    groups,
    byDesignation,
  };
};



const getDateFinEffective = (contrat) => {

  if (contrat?.type_contrat !== "cdd") {

    return contrat?.date_fin_contrat || "";

  }

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

  const fin = formatDateFr(getDateFinEffective(contrat));



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

  const [contratDeleteIndex, setContratDeleteIndex] = useState(null);

  const [isCreating, setIsCreating] = useState(false);

  const [agentDeleteOpen, setAgentDeleteOpen] = useState(false);

  const [agentDeletePreview, setAgentDeletePreview] = useState(null);

  const [isLoadingDeletePreview, setIsLoadingDeletePreview] = useState(false);

  const [isDeletingAgent, setIsDeletingAgent] = useState(false);

  const defaultStatsRange = getDefaultStatsRange();

  const [agentEvents, setAgentEvents] = useState([]);

  const [isLoadingEvents, setIsLoadingEvents] = useState(false);

  const [statsDateStart, setStatsDateStart] = useState(defaultStatsRange.start);

  const [statsDateEnd, setStatsDateEnd] = useState(defaultStatsRange.end);

  const [statsRecapOpen, setStatsRecapOpen] = useState(false);

  const [statsPreset, setStatsPreset] = useState("month");

  const [congeData, setCongeData] = useState(null);

  const [isLoadingConges, setIsLoadingConges] = useState(false);

  const [congeDialogOpen, setCongeDialogOpen] = useState(false);

  const [kpiEdit, setKpiEdit] = useState(null);
  const [kpiDraft, setKpiDraft] = useState("");
  const [kpiSaving, setKpiSaving] = useState(false);
  const kpiSkipSaveRef = useRef(false);
  const [selectedCongeMonth, setSelectedCongeMonth] = useState(null);



  const activeContrat = contrats[activeContratIndex] || null;



  const resetAgentSelection = () => {

    setAgentData(EMPTY_AGENT);

    setContrats([]);

    setActiveContratIndex(0);

    setDeletedContratIds([]);

    setDeletedAvenantIds([]);

    setAgentEvents([]);

    setStatsRecapOpen(false);

    setCongeData(null);

    setCongeDialogOpen(false);
    setSelectedCongeMonth(null);

  };



  const handleStartCreate = () => {

    resetAgentSelection();

    setContrats([{ ...EMPTY_CONTRAT }]);

    setActiveContratIndex(0);

    setIsCreating(true);

    setAgentSearchQuery("");

    setAgentDropdownOpen(false);

    setMessage({ type: "", text: "" });

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
      phone_Number:
        agent.phone_Number != null && agent.phone_Number !== ""
          ? String(agent.phone_Number)
          : "",
    });
    setContrats(buildContratsFromAgent(agent));
    setActiveContratIndex(0);
    setDeletedContratIds([]);
    setDeletedAvenantIds([]);
    setAgentSearchQuery("");
    setAgentDropdownOpen(false);
    setIsCreating(false);
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

      setContratDeleteIndex(null);

      setIsCreating(false);

      setAgentEvents([]);

      setStatsRecapOpen(false);

      setCongeDialogOpen(false);

      setCongeData(null);

      const range = getDefaultStatsRange();

      setStatsDateStart(range.start);

      setStatsDateEnd(range.end);

      setStatsPreset("month");

    }

  }, [isOpen]);



  useEffect(() => {

    if (!isOpen || !agentData.id) {

      setAgentEvents([]);

      setIsLoadingEvents(false);

      return undefined;

    }

    let cancelled = false;

    setIsLoadingEvents(true);

    axios

      .get("/api/events/", { params: { agent_id: agentData.id } })

      .then((res) => {

        if (!cancelled) setAgentEvents(Array.isArray(res.data) ? res.data : []);

      })

      .catch(() => {

        if (!cancelled) setAgentEvents([]);

      })

      .finally(() => {

        if (!cancelled) setIsLoadingEvents(false);

      });

    return () => {

      cancelled = true;

    };

  }, [isOpen, agentData.id]);



  const congeYear = Number(String(statsDateEnd || "").slice(0, 4)) || new Date().getFullYear();
  const congeRefDate = statsDateEnd || new Date().toISOString().slice(0, 10);



  useEffect(() => {

    if (!isOpen || !agentData.id) {

      setCongeData(null);

      setIsLoadingConges(false);

      return undefined;

    }

    let cancelled = false;

    setIsLoadingConges(true);

    axios

      .get(`/api/agent/${agentData.id}/conges/`, { params: { date: congeRefDate } })

      .then((res) => {

        if (!cancelled) setCongeData(res.data);

      })

      .catch(() => {

        if (!cancelled) setCongeData(null);

      })

      .finally(() => {

        if (!cancelled) setIsLoadingConges(false);

      });

    return () => {

      cancelled = true;

    };

  }, [isOpen, agentData.id, congeRefDate, agentEvents]);



  const refreshConges = async () => {

    if (!agentData.id) return;

    const res = await axios.get(`/api/agent/${agentData.id}/conges/`, {

      params: { date: congeRefDate },

    });

    setCongeData(res.data);

  };

  useEffect(() => {
    if (!selectedCongeMonth) return;
    const next = (congeData?.mois || []).find(
      (m) => congeMonthKey(m) === congeMonthKey(selectedCongeMonth)
    );
    if (!next) {
      setSelectedCongeMonth(null);
      return;
    }
    if (next !== selectedCongeMonth) setSelectedCongeMonth(next);
  }, [congeData, selectedCongeMonth]);



  const startKpiEdit = (item) => {
    if (kpiSaving) return;
    setKpiEdit(item.id);
    const current = congeData?.[item.valueKey] ?? 0;
    setKpiDraft(String(current));
  };

  const saveKpiEdit = async () => {
    if (kpiSkipSaveRef.current) {
      kpiSkipSaveRef.current = false;
      return;
    }
    const field = kpiEdit;
    if (!field || !agentData.id) {
      setKpiEdit(null);
      return;
    }
    const jours = Number(String(kpiDraft).replace(",", "."));
    if (Number.isNaN(jours) || jours < 0) {
      setMessage({ type: "error", text: "Indiquez un nombre de jours valide (0 ou plus)." });
      setKpiEdit(null);
      return;
    }
    setKpiSaving(true);
    try {
      const res = await axios.post(`/api/agent/${agentData.id}/conges/setup/`, { field, jours });
      setCongeData(res.data);
    } catch (error) {
      setMessage({ type: "error", text: formatApiError(error, "Impossible d'enregistrer le compteur.") });
    } finally {
      setKpiSaving(false);
      setKpiEdit((current) => (current === field ? null : current));
    }
  };

  const presenceStats = useMemo(() => {

    const start = statsDateStart <= statsDateEnd ? statsDateStart : statsDateEnd;

    const end = statsDateStart <= statsDateEnd ? statsDateEnd : statsDateStart;

    return buildAgentPresenceStats(

      agentEvents,

      start,

      end,

      agentData.jours_travail || [],

      contrats

    );

  }, [agentEvents, statsDateStart, statsDateEnd, agentData.jours_travail, contrats]);



  const applyStatsPreset = (preset) => {

    const now = new Date();

    setStatsPreset(preset);

    if (preset === "month") {

      setStatsDateStart(toISODate(new Date(now.getFullYear(), now.getMonth(), 1)));

      setStatsDateEnd(toISODate(now));

      return;

    }

    if (preset === "quarter") {

      const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);

      setStatsDateStart(toISODate(start));

      setStatsDateEnd(toISODate(now));

      return;

    }

    if (preset === "year") {

      setStatsDateStart(toISODate(new Date(now.getFullYear(), 0, 1)));

      setStatsDateEnd(toISODate(now));

    }

  };



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



  const requestDeleteContrat = (index) => {

    setContratDeleteIndex(index);

  };



  const cancelDeleteContrat = () => {

    setContratDeleteIndex(null);

  };



  const confirmDeleteContrat = () => {

    if (contratDeleteIndex === null) return;

    handleDeleteContrat(contratDeleteIndex);

    setContratDeleteIndex(null);

  };



  const requestDeleteAgent = async () => {

    if (!agentData.id || isCreating) return;

    setAgentDeleteOpen(true);

    setAgentDeletePreview(null);

    setIsLoadingDeletePreview(true);

    try {

      const res = await axios.get(`/api/agent/${agentData.id}/delete_preview/`);

      setAgentDeletePreview(res.data);

    } catch (error) {

      setAgentDeletePreview(null);

      setMessage({

        type: "error",

        text:

          error.response?.data?.error ||

          "Impossible de charger l'aperçu de suppression.",

      });

      setAgentDeleteOpen(false);

    } finally {

      setIsLoadingDeletePreview(false);

    }

  };



  const cancelDeleteAgent = () => {

    if (isDeletingAgent) return;

    setAgentDeleteOpen(false);

    setAgentDeletePreview(null);

  };



  const confirmDeleteAgent = async () => {

    if (!agentData.id || isDeletingAgent) return;

    setIsDeletingAgent(true);

    try {

      await axios.delete(`/api/agent/${agentData.id}/`);

      setAgentDeleteOpen(false);

      setAgentDeletePreview(null);

      resetAgentSelection();

      setIsCreating(false);

      setAgentSearchQuery("");

      setMessage({ type: "success", text: "Agent supprimé avec succès." });

      if (typeof refreshAgents === "function") {

        await refreshAgents();

      }

    } catch (error) {

      setMessage({

        type: "error",

        text:

          error.response?.data?.error ||

          "Erreur lors de la suppression de l'agent.",

      });

    } finally {

      setIsDeletingAgent(false);

    }

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

        date_fin_contrat: c.date_fin_contrat || null,

        carte_btp: Boolean(c.carte_btp),

      };

      const hasContent =

        payload.libelle ||

        payload.type_contrat ||

        payload.date_debut_contrat ||

        payload.date_fin_contrat ||

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

    await axios.post(`/api/agent/${agentId}/sync-effectif/`);

  };



  const handleSubmit = async () => {

    if (!agentData.id && !isCreating) {

      setMessage({ type: "error", text: "Veuillez sélectionner un agent." });

      return;

    }

    const name = String(agentData.name || "").trim();

    const surname = String(agentData.surname || "").trim();

    const phone = String(agentData.phone_Number || "").trim();

    if (!name || !surname) {

      setMessage({ type: "error", text: "Le nom et le prénom sont requis." });

      return;

    }

    if (!phone) {

      setMessage({ type: "error", text: "Le numéro de téléphone est requis." });

      return;

    }

    if (isLoading) return;

    setIsLoading(true);

    try {

      const joursTravailUniques = Array.from(

        new Set((agentData.jours_travail || []).map((j) => j.trim()))

      );

      const payload = {

        name,

        surname,

        email: agentData.email || null,

        address: agentData.address,

        phone_Number: phone,

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



      const isNew = !agentData.id;

      let agentId = agentData.id;

      if (isNew) {

        const res = await axios.post("/api/agent/", payload);

        agentId = res.data.id;

      } else {

        await axios.put(`/api/agent/${agentId}/`, payload);

      }

      await syncContrats(agentId);

      if (isNew) {

        await handleAgentSelect({ id: agentId });

        setMessage({ type: "success", text: "Agent créé." });

      } else {

        setMessage({ type: "success", text: "Carte agent enregistrée." });

      }

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

    const allowedExt = /\.(jpe?g|png|gif|webp|bmp|tiff?|heic|heif|ico)$/i;
    const allowedMimePrefix = /^image\//;
    const nameOk = allowedExt.test(file.name || "");
    const mimeOk = !file.type || allowedMimePrefix.test(file.type);
    if (!nameOk && !mimeOk) {
      setMessage({
        type: "error",
        text: "Format non supporté. Formats acceptés : JPG, PNG, GIF, WebP, BMP, TIFF, HEIC.",
      });
      if (photoInputRef.current) photoInputRef.current.value = "";
      return;
    }

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

          disabled={!agentData.id && !isCreating}

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

          disabled={!agentData.id && !isCreating}

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

    const fieldValue = extra.fieldProps?.value ?? activeContrat[name] ?? "";

    const showClear = Boolean(extra.clearable && fieldValue);

    return (

      <div className={`agent-carte-field ${extra.fullWidth ? "full-width" : ""}`}>

        <div className="agent-carte-field-label-row">

          <label htmlFor={fieldId}>{label}</label>

          {showClear && (

            <Button

              type="button"

              size="small"

              onClick={() => updateActiveContrat(name, "")}

              sx={{

                minWidth: "auto",

                px: 0.75,

                py: 0,

                textTransform: "none",

                fontSize: "0.75rem",

                color: "#64748b",

              }}

            >

              Effacer

            </Button>

          )}

        </div>

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

    <>

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

                {isCreating && !agentData.id

                  ? "Création d'un nouvel agent"

                  : "Informations contractuelles et identité"}

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



              <Box sx={{ position: "relative", mb: 2 }}>

                <Typography

                  component="label"

                  sx={{ display: "block", fontSize: 12, color: "text.secondary", mb: 0.5 }}

                >

                  {isCreating && !agentData.id ? "Nouvel agent" : "Sélectionner un agent"}

                </Typography>

                <div className="agent-carte-search-row">

                <Box ref={agentDropdownRef} className="agent-carte-search-field">

                <input

                  type="text"

                  placeholder="Rechercher un agent..."

                  value={

                    agentDropdownOpen

                      ? agentSearchQuery

                      : agentData.id

                      ? getAgentLabel(agentData)

                      : isCreating

                      ? "Nouvel agent"

                      : agentSearchQuery

                  }

                  onChange={(e) => {

                    setAgentSearchQuery(e.target.value);

                    setAgentDropdownOpen(true);

                  }}

                  onFocus={() => {

                    if (agentData.id || isCreating) {

                      setAgentSearchQuery("");

                    }

                    setAgentDropdownOpen(true);

                  }}

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

                <Button

                  type="button"

                  variant={isCreating && !agentData.id ? "contained" : "outlined"}

                  startIcon={<PersonAddIcon />}

                  onClick={handleStartCreate}

                  className="agent-carte-new-agent-btn"

                  sx={{

                    whiteSpace: "nowrap",

                    textTransform: "none",

                    fontWeight: 600,

                    minHeight: 46,

                    px: 1.75,

                  }}

                >

                  Nouvel agent

                </Button>

                </div>

              </Box>

            </div>



          <div className="agent-carte-content">

            {(agentData.id || isCreating) && (

              <div className="agent-carte-body">

                <div className="agent-carte-photo-zone">

                  <div

                    className="agent-carte-photo"

                    onClick={() => {

                      if (!agentData.id) return;

                      photoInputRef.current?.click();

                    }}

                    title={

                      agentData.id

                        ? "Cliquer pour ajouter ou modifier la photo"

                        : "Enregistrez l'agent pour ajouter une photo"

                    }

                  >

                    {agentData.photo_url ? (

                      <img src={agentData.photo_url} alt="Photo agent" />

                    ) : (

                      <div className="agent-carte-photo-placeholder">

                        <PhotoCameraIcon sx={{ fontSize: 36 }} />

                        <span>{agentData.id ? "Ajouter une photo" : "Après création"}</span>

                      </div>

                    )}

                  </div>

                  <input

                    ref={photoInputRef}

                    type="file"

                    accept=".jpg,.jpeg,.png,.gif,.webp,.bmp,.tif,.tiff,.heic,.heif,.ico,image/jpeg,image/png,image/gif,image/webp,image/bmp,image/tiff,image/heic,image/heif,image/x-icon"

                    style={{ display: "none" }}

                    onChange={handlePhotoUpload}

                  />

                  <div className="agent-carte-photo-actions">

                    <Button

                      size="small"

                      variant="outlined"

                      startIcon={<PhotoCameraIcon />}

                      onClick={() => photoInputRef.current?.click()}

                      disabled={isUploadingPhoto || !agentData.id}

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



                  {agentData.id && (

                    <div className="agent-carte-stats">

                      <div className="agent-carte-stats-dates">

                        <label>

                          Du

                          <input

                            type="date"

                            value={statsDateStart}

                            onChange={(e) => {

                              setStatsPreset("custom");

                              setStatsDateStart(e.target.value);

                            }}

                            onKeyDown={(e) => {

                              if (e.key === "Enter") e.preventDefault();

                            }}

                          />

                        </label>

                        <label>

                          Au

                          <input

                            type="date"

                            value={statsDateEnd}

                            onChange={(e) => {

                              setStatsPreset("custom");

                              setStatsDateEnd(e.target.value);

                            }}

                            onKeyDown={(e) => {

                              if (e.key === "Enter") e.preventDefault();

                            }}

                          />

                        </label>

                      </div>

                      <div className="agent-carte-stats-presets">

                        {[

                          { id: "month", label: "Mois" },

                          { id: "quarter", label: "3 mois" },

                          { id: "year", label: "Année" },

                        ].map((preset) => (

                          <button

                            key={preset.id}

                            type="button"

                            className={`agent-carte-stats-preset${

                              statsPreset === preset.id ? " active" : ""

                            }`}

                            onClick={() => applyStatsPreset(preset.id)}

                          >

                            {preset.label}

                          </button>

                        ))}

                      </div>

                      <button

                        type="button"

                        className="agent-carte-stats-summary"

                        onClick={() => setStatsRecapOpen(true)}

                        disabled={isLoadingEvents}

                        title="Voir le récapitulatif des absences"

                      >

                        {isLoadingEvents ? (

                          <span className="agent-carte-stats-empty">Chargement...</span>

                        ) : (

                          <>

                            <div className="agent-carte-stats-row">

                              <span>Présence</span>

                              <strong>{formatPct(presenceStats.presencePct, presenceStats.workDays)}</strong>

                            </div>

                            <div className="agent-carte-stats-bar">

                              <span

                                className="agent-carte-stats-bar-fill presence"

                                style={{ width: `${presenceStats.presencePct}%` }}

                              />

                            </div>

                            <div className="agent-carte-stats-row">

                              <span>Absence</span>

                              <strong>{formatPct(presenceStats.absencePct, presenceStats.workDays)}</strong>

                            </div>

                            <div className="agent-carte-stats-bar">

                              <span

                                className="agent-carte-stats-bar-fill absence"

                                style={{ width: `${presenceStats.absencePct}%` }}

                              />

                            </div>

                            <div className="agent-carte-stats-meta">

                              {presenceStats.workDays

                                ? `${presenceStats.presenceDays} prés. · ${presenceStats.absenceDays} abs.${
                                    presenceStats.ecoleDays
                                      ? ` · ${presenceStats.ecoleDays} école`
                                      : ""
                                  } / ${presenceStats.workDays} j. sous contrat`

                                : presenceStats.hasContratCoverage

                                ? "Aucun jour sous contrat"

                                : "Aucun jour ouvré"}

                            </div>

                            <div className="agent-carte-stats-hint">

                              Cliquer pour le détail

                            </div>

                          </>

                        )}

                      </button>

                      <button
                        type="button"
                        className="agent-carte-conges-summary"
                        onClick={() => setCongeDialogOpen(true)}
                        disabled={isLoadingConges || !congeData}
                        title="Gérer les congés"
                      >
                        {isLoadingConges || !congeData ? (
                          <span className="agent-carte-stats-empty">Congés...</span>
                        ) : (
                          <>
                            <div className="agent-carte-conges-title">
                              Congés {congeData.periode_courte || congeData.periode_label || congeData.year}
                            </div>
                            <div className="agent-carte-stats-row">
                              <span>Acquis</span>
                              <strong>{formatJours(congeData.acquis_clos ?? congeData.acquis)} j</strong>
                            </div>
                            <div className="agent-carte-stats-row">
                              <span>En cours</span>
                              <strong>{formatJours(congeData.en_cours_annee ?? congeData.en_cours)} j</strong>
                            </div>
                            <div className="agent-carte-stats-row">
                              <span>Pris</span>
                              <strong>{formatJours(congeData.pris)} j</strong>
                            </div>
                            <div className="agent-carte-stats-row">
                              <span>Solde</span>
                              <strong>{formatJours(congeData.solde)} j</strong>
                            </div>
                            <div className="agent-carte-stats-hint">
                              Reset {congeData.reset_le || "31 mai"}
                            </div>
                          </>
                        )}
                      </button>

                    </div>

                  )}

                </div>



                <div className="agent-carte-fields">

                  <div className="agent-carte-section-title">Identité</div>

                  {renderField("Nom", "name")}

                  {renderField("Prénom", "surname")}

                  {renderField("Adresse mail", "email", "email", null, { fullWidth: true })}

                  {renderField("Adresse", "address", "text", null, { fullWidth: true })}

                  {renderField("Téléphone", "phone_Number", "tel", null, {
                    fieldProps: {
                      inputMode: "tel",
                    },
                  })}



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

                                  requestDeleteContrat(index);

                                }}

                                onKeyDown={(e) => {

                                  if (e.key === "Enter" || e.key === " ") {

                                    e.preventDefault();

                                    e.stopPropagation();

                                    requestDeleteContrat(index);

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

                      {activeContrat?.type_contrat === "cdi" &&

                        renderContratField("Date de sortie", "date_fin_contrat", "date", null, {

                          clearable: true,

                        })}



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



            {!agentData.id && !isCreating && (

              <Box sx={{ p: 4, textAlign: "center", color: "text.secondary" }}>

                <Typography variant="body1">

                  Sélectionnez un agent ou créez-en un nouveau.

                </Typography>

              </Box>

            )}

          </div>



          <div className="agent-carte-footer">

            <div className="agent-carte-footer-left">

              {agentData.id && !isCreating && (

                <Button

                  type="button"

                  color="error"

                  variant="outlined"

                  startIcon={<DeleteOutlineIcon />}

                  onClick={requestDeleteAgent}

                  disabled={isLoading || isDeletingAgent}

                >

                  Supprimer l'agent

                </Button>

              )}

            </div>

            <div className="agent-carte-footer-right">

              <Button type="button" onClick={handleClose}>

                Fermer

              </Button>

              <Button

                type="submit"

                variant="contained"

                color="primary"

                disabled={(!agentData.id && !isCreating) || isLoading}

              >

                {isLoading

                  ? "Enregistrement..."

                  : isCreating && !agentData.id

                  ? "Créer l'agent"

                  : "Enregistrer"}

              </Button>

            </div>

          </div>

        </div>

      </form>

    </Dialog>



    <Dialog

      open={contratDeleteIndex !== null}

      onClose={cancelDeleteContrat}

      maxWidth="xs"

      fullWidth

    >

      <DialogTitle>Supprimer ce contrat ?</DialogTitle>

      <DialogContent>

        {contratDeleteIndex !== null && (

          <>

            <Typography>

              Voulez-vous supprimer le contrat{" "}

              <strong>

                {getContratTabLabel(contrats[contratDeleteIndex], contratDeleteIndex)}

              </strong>

              {getContratTabDates(contrats[contratDeleteIndex]) && (

                <>

                  {" "}

                  ({getContratTabDates(contrats[contratDeleteIndex])})

                </>

              )}

              {" "}?

            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>

              Les avenants associés seront également supprimés. La suppression

              sera définitive après enregistrement de la carte agent.

            </Typography>

          </>

        )}

      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>

        <Button type="button" onClick={cancelDeleteContrat}>

          Annuler

        </Button>

        <Button

          type="button"

          variant="contained"

          color="error"

          onClick={confirmDeleteContrat}

        >

          Supprimer

        </Button>

      </DialogActions>

    </Dialog>



    <Dialog

      open={agentDeleteOpen}

      onClose={cancelDeleteAgent}

      maxWidth="sm"

      fullWidth

    >

      <DialogTitle>Supprimer cet agent ?</DialogTitle>

      <DialogContent>

        <Typography gutterBottom>

          Vous êtes sur le point de supprimer définitivement{" "}

          <strong>

            {getAgentLabel(agentData) || "cet agent"}

          </strong>

          .

        </Typography>



        {isLoadingDeletePreview && (

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>

            Analyse des éléments liés...

          </Typography>

        )}



        {!isLoadingDeletePreview && agentDeletePreview && (

          <>

            {agentDeletePreview.will_delete?.length > 0 && (

              <Alert severity="error" sx={{ mt: 2 }}>

                <Typography variant="body2" fontWeight="bold" gutterBottom>

                  Cette action supprimera définitivement :

                </Typography>

                <Box component="ul" sx={{ pl: 2, m: 0 }}>

                  {agentDeletePreview.will_delete.map((item) => (

                    <Box component="li" key={item.key} sx={{ mb: 0.75 }}>

                      <Typography variant="body2">

                        {item.label} ({item.count})

                      </Typography>

                      {item.chantiers?.length > 0 && (

                        <Typography

                          variant="caption"

                          color="text.secondary"

                          component="div"

                        >

                          Chantiers : {item.chantiers.join(", ")}

                        </Typography>

                      )}

                    </Box>

                  ))}

                </Box>

              </Alert>

            )}



            {agentDeletePreview.will_detach?.length > 0 && (

              <Alert severity="warning" sx={{ mt: 2 }}>

                <Typography variant="body2" fontWeight="bold" gutterBottom>

                  Ces éléments seront détachés (conservés) :

                </Typography>

                <Box component="ul" sx={{ pl: 2, m: 0 }}>

                  {agentDeletePreview.will_detach.map((item) => (

                    <Box component="li" key={item.key} sx={{ mb: 0.5 }}>

                      <Typography variant="body2">

                        {item.label} ({item.count})

                      </Typography>

                    </Box>

                  ))}

                </Box>

              </Alert>

            )}



            {!agentDeletePreview.has_related && (

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>

                Aucun élément lié détecté pour cet agent.

              </Typography>

            )}

          </>

        )}



        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>

          Cette action est irréversible. Pour un retrait temporaire de

          l&apos;effectif, utilisez plutôt la désactivation.

        </Typography>

      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>

        <Button

          type="button"

          onClick={cancelDeleteAgent}

          disabled={isDeletingAgent}

        >

          Annuler

        </Button>

        <Button

          type="button"

          variant="contained"

          color="error"

          onClick={confirmDeleteAgent}

          disabled={isLoadingDeletePreview || isDeletingAgent}

        >

          {isDeletingAgent ? "Suppression..." : "Supprimer définitivement"}

        </Button>

      </DialogActions>

    </Dialog>

    <Dialog
      open={statsRecapOpen}
      onClose={() => setStatsRecapOpen(false)}
      maxWidth="sm"
      fullWidth
      className="agent-carte-stats-recap-dialog"
    >
      <DialogTitle sx={{ pr: 6, position: "relative" }}>
        Récapitulatif des absences
        <IconButton
          aria-label="Fermer"
          onClick={() => setStatsRecapOpen(false)}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {getAgentLabel(agentData) || "Agent"} · du {formatDateFr(statsDateStart)} au {formatDateFr(statsDateEnd)}
        </Typography>
        <div className="agent-carte-stats-recap-kpis">
          <div>
            <strong>{formatPct(presenceStats.presencePct, presenceStats.workDays)}</strong>
            <span>Présence</span>
          </div>
          <div>
            <strong>{formatPct(presenceStats.absencePct, presenceStats.workDays)}</strong>
            <span>Absence</span>
          </div>
          <div>
            <strong>{presenceStats.absenceDays}</strong>
            <span>Jours d&apos;absence</span>
          </div>
        </div>
        {presenceStats.byDesignation.length > 0 && (
          <div className="agent-carte-stats-recap-tags">
            {presenceStats.byDesignation.map((item) => (
              <span
                key={item.designation}
                className={`agent-carte-stats-recap-tag ${item.type}`}
              >
                {item.designation} · {item.days} j
              </span>
            ))}
          </div>
        )}
        {presenceStats.groups.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            Aucune absence ni congé sur cette période.
          </Typography>
        ) : (
          <ul className="agent-carte-stats-recap-list">
            {presenceStats.groups.map((group) => (
              <li key={`${group.type}-${group.subtype}-${group.startDate}`}>
                <div className="agent-carte-stats-recap-dates">
                  {formatDateFr(group.startDate)}
                  {group.startDate !== group.endDate ? ` → ${formatDateFr(group.endDate)}` : ""}
                </div>
                <div className="agent-carte-stats-recap-info">
                  <strong>{group.designation}</strong>
                  <span>
                    {group.days} jour{group.days > 1 ? "s" : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button type="button" onClick={() => setStatsRecapOpen(false)}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>

    <Dialog
      open={congeDialogOpen}
      onClose={() => {
        setKpiEdit(null);
        setSelectedCongeMonth(null);
        setCongeDialogOpen(false);
      }}
      maxWidth={selectedCongeMonth ? "md" : "sm"}
      fullWidth
      className={`agent-carte-conges-dialog${selectedCongeMonth ? " has-month-detail" : ""}`}
    >
      <div className="agent-carte-conges-dialog-split">
        <div className="agent-carte-conges-dialog-main">
      <DialogTitle sx={{ pr: 1, pb: 1 }}>
        <div className="agent-carte-conges-dialog-head">
          <div>
            <div className="agent-carte-conges-dialog-kicker">Congés payés</div>
            <div className="agent-carte-conges-dialog-period">
              {congeData?.periode_label || congeData?.periode_courte || congeYear}
            </div>
          </div>
          <div className="agent-carte-conges-dialog-actions">
            <Tooltip
              arrow
              enterTouchDelay={0}
              title={
                <Typography component="span" sx={{ whiteSpace: "pre-line", fontSize: "0.78rem", display: "block" }}>
                  {CONGE_INFO_TEXT}
                </Typography>
              }
            >
              <IconButton size="small" aria-label="Règles de calcul">
                <InfoOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <IconButton
              aria-label="Fermer"
              onClick={() => {
                setSelectedCongeMonth(null);
                setCongeDialogOpen(false);
              }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </div>
        </div>
      </DialogTitle>
      <DialogContent dividers>
        <div className="agent-carte-conges-hero">
          <strong>{formatJours(congeData?.solde)} j</strong>
          <span>Solde disponible</span>
        </div>
        <div className="agent-carte-conges-kpis">
          {CONGE_KPI_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`agent-carte-conges-kpi${congeData?.setup?.[item.id] ? " is-set" : ""}`}
              onClick={() => startKpiEdit(item)}
              disabled={kpiSaving}
              title="Cliquer pour définir le nombre"
            >
              {kpiEdit === item.id ? (
                <input
                  autoFocus
                  type="number"
                  min="0"
                  step="0.5"
                  value={kpiDraft}
                  aria-label={item.label}
                  onChange={(e) => setKpiDraft(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  onBlur={saveKpiEdit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      e.currentTarget.blur();
                    }
                    if (e.key === "Escape") {
                      e.preventDefault();
                      kpiSkipSaveRef.current = true;
                      setKpiEdit(null);
                    }
                  }}
                />
              ) : (
                <strong>{formatJours(congeData?.[item.valueKey] ?? (item.id === "acquis" ? congeData?.acquis : 0))}</strong>
              )}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <section className="agent-carte-conges-section">
          <div className="agent-carte-conges-section-title">Acquisition</div>
          <ul className="agent-carte-conges-months">
            {(congeData?.mois || [])
              .filter((m) => {
                const phase = m.phase || m.statut;
                if (phase === "previsionnel" || phase === "futur") return false;
                return Number(m.acquis) > 0 || Number(m.pris) > 0 || phase === "en_cours";
              })
              .map((m) => {
                const isOpen = congeMonthKey(selectedCongeMonth) === congeMonthKey(m);
                return (
                  <li key={congeMonthKey(m)}>
                    <button
                      type="button"
                      className={`agent-carte-conges-month agent-carte-conges-month-${m.phase || m.statut || "clos"}${isOpen ? " is-open" : ""}`}
                      onClick={() => setSelectedCongeMonth(isOpen ? null : m)}
                    >
                      <span>{m.label}</span>
                      <span>{congeMonthDetail(m)}</span>
                    </button>
                  </li>
                );
              })}
          </ul>
        </section>

        {congeData?.prises?.length > 0 && (
          <section className="agent-carte-conges-section">
            <div className="agent-carte-conges-section-title">Posés</div>
            <ul className="agent-carte-conges-moves">
              {congeData.prises.map((group) => (
                <li key={`${group.start}-${group.end}`}>
                  <span>
                    {formatDateFr(group.start)}
                    {group.start !== group.end ? ` → ${formatDateFr(group.end)}` : ""}
                  </span>
                  <strong>-{group.days} j</strong>
                </li>
              ))}
            </ul>
          </section>
        )}

        {congeData?.autres_conges?.length > 0 && (
          <section className="agent-carte-conges-section">
            <div className="agent-carte-conges-section-title">Autres</div>
            <ul className="agent-carte-conges-moves">
              {congeData.autres_conges.map((group) => (
                <li key={`other-${group.start}-${group.designation}`}>
                  <span>
                    {formatDateFr(group.start)}
                    {group.start !== group.end ? ` → ${formatDateFr(group.end)}` : ""}
                    {" · "}
                    {group.designation}
                  </span>
                  <strong>{group.days} j</strong>
                </li>
              ))}
            </ul>
          </section>
        )}
      </DialogContent>
        </div>
        {selectedCongeMonth && (
          <aside className="agent-carte-conges-month-panel">
            {(() => {
              const detail = selectedCongeMonth.detail || {};
              const phase = detail.phase || selectedCongeMonth.phase;
              const rows = [
                ["Jours ouvrés du mois", detail.jours_ouvres_mois ?? selectedCongeMonth.jours_ouvres_mois],
                ["Jours écoulés", detail.jours_ecoules],
                ["Sous contrat", detail.jours_contrat ?? selectedCongeMonth.jours_ouvres_contrat],
                ["Hors contrat", detail.hors_contrat],
                ["Non acquis", detail.non_acquis ?? selectedCongeMonth.jours_non_acquis],
                ["Jours comptés", detail.jours_comptes],
                ["Congés posés", detail.pris ?? selectedCongeMonth.pris],
              ].filter(([label, value]) => {
                if (value === undefined || value === null) return false;
                if (label === "Hors contrat" && !value) return false;
                return true;
              });
              return (
                <>
                  <div className="agent-carte-conges-month-panel-head">
                    <div>
                      <div className="agent-carte-conges-dialog-kicker">
                        {CONGE_PHASE_LABELS[phase] || "Détail"}
                      </div>
                      <strong>{selectedCongeMonth.label}</strong>
                      {detail.au ? (
                        <span>
                          Du {formatDateFr(detail.du)} au {formatDateFr(detail.au)}
                        </span>
                      ) : null}
                    </div>
                    <IconButton
                      size="small"
                      aria-label="Fermer le détail"
                      onClick={() => setSelectedCongeMonth(null)}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </div>

                  <div className="agent-carte-conges-month-formula">
                    <span>
                      {formatJours(detail.taux ?? 2.5)} × {detail.jours_comptes ?? 0} /{" "}
                      {detail.jours_ouvres_mois ?? selectedCongeMonth.jours_ouvres_mois ?? 0}
                    </span>
                    <strong>{formatJours(detail.acquis ?? selectedCongeMonth.acquis)} j acquis</strong>
                    <em>2,5 j × jours comptés / jours ouvrés du mois</em>
                    {detail.plafond ? <em>Plafond annuel de 30 j appliqué</em> : null}
                  </div>

                  <div className="agent-carte-conges-month-kpis">
                    {[
                      ["Présence", detail.presence],
                      ["Absence", detail.absence],
                      ["Congés", detail.conge],
                      ["École", detail.ecole],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <strong>{value ?? 0}</strong>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>

                  <dl className="agent-carte-conges-month-rows">
                    {rows.map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value} j</dd>
                      </div>
                    ))}
                  </dl>

                  {(detail.evenements || []).length > 0 && (
                    <>
                      <div className="agent-carte-conges-section-title">Événements</div>
                      <ul className="agent-carte-conges-moves">
                        {detail.evenements.map((item) => (
                          <li key={`${item.type}-${item.start}-${item.designation}`}>
                            <span>
                              {formatDateFr(item.start)}
                              {item.start !== item.end ? ` → ${formatDateFr(item.end)}` : ""}
                              {" · "}
                              {item.designation}
                              {item.compte === false ? " · non acquis" : ""}
                            </span>
                            <strong>{item.days} j</strong>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              );
            })()}
          </aside>
        )}
      </div>
    </Dialog>

  </>

  );

};



export default AgentCarteModal;


