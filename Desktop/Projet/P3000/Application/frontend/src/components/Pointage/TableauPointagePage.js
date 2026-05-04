import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import PieChartOutline from "@mui/icons-material/PieChartOutline";
import {
  Alert,
  Box,
  Checkbox,
  CircularProgress,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import PointageRecapCards from "./PointageRecapCards";
import PointageEditDialog from "./PointageEditDialog";
import PointageRepartitionAgenceModal, {
  repartitionSumMatchesMontant,
} from "./PointageRepartitionAgenceModal";

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatCurrency = (value) =>
  `${toNumber(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;

const formatCurrencyInTable = (value) => {
  const number = toNumber(value);
  return number === 0 ? "-" : formatCurrency(number);
};

const formatHours = (value) =>
  toNumber(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatMoneyInput = (value) =>
  toNumber(value).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const parseMoneyInput = (rawValue) => {
  const raw = String(rawValue || "").trim();
  if (!raw) return 0;

  let sanitized = raw.replace(/[^\d,.\-]/g, "").replace(/\s/g, "");
  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      sanitized = sanitized.replace(/\./g, "").replace(",", ".");
    } else {
      sanitized = sanitized.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    sanitized = sanitized.replace(",", ".");
  }

  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatWorkedTime = (hoursValue, agentTypePaiement) => {
  const hours = toNumber(hoursValue);
  if (agentTypePaiement === "journalier") {
    const days = hours / 8;
    return `${days.toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} j`;
  }
  return `${formatHours(hours)} h`;
};

const headerCellSx = {
  fontWeight: 700,
  backgroundColor: "#1976d2",
  color: "#fff",
  textAlign: "center",
};

const compactNumberColumnSx = {
  ...headerCellSx,
  width: 130,
  minWidth: 130,
  maxWidth: 130,
};

const commonBodyCellStyle = {
  padding: "6px 8px",
  whiteSpace: "normal",
  wordWrap: "break-word",
  textAlign: "center",
  verticalAlign: "middle",
};

const clickableValueSx = {
  cursor: "pointer",
  px: 1,
  py: 0.75,
  borderRadius: 1,
  border: "1px solid transparent",
  "&:hover": {
    backgroundColor: "rgba(27, 120, 188, 0.08)",
    borderColor: "rgba(27, 120, 188, 0.3)",
  },
};

const readOnlyValueSx = {
  px: 1,
  py: 0.75,
  borderRadius: 1,
};

const amountTextSx = {
  textAlign: "right",
  fontWeight: 500,
  fontSize: "0.8rem",
  lineHeight: 1.2,
};

const getPaiementCellSx = (paiementValue, datePaiementValue) => {
  const paid = toNumber(paiementValue) > 0;
  const dated = Boolean(String(datePaiementValue || "").trim());
  const ok = paid && dated;
  return {
    ...clickableValueSx,
    backgroundColor: ok ? "rgba(46, 125, 50, 0.12)" : "rgba(211, 47, 47, 0.12)",
    borderColor: ok ? "rgba(46, 125, 50, 0.35)" : "rgba(211, 47, 47, 0.35)",
    "&:hover": {
      backgroundColor: ok ? "rgba(46, 125, 50, 0.2)" : "rgba(211, 47, 47, 0.2)",
      borderColor: ok ? "rgba(46, 125, 50, 0.5)" : "rgba(211, 47, 47, 0.5)",
    },
  };
};

const getMontantChargeCellSx = (montantChargeValue) => {
  const hasValue = toNumber(montantChargeValue) > 0;
  return {
    ...clickableValueSx,
    backgroundColor: hasValue ? "rgba(46, 125, 50, 0.12)" : "rgba(211, 47, 47, 0.12)",
    borderColor: hasValue ? "rgba(46, 125, 50, 0.35)" : "rgba(211, 47, 47, 0.35)",
    "&:hover": {
      backgroundColor: hasValue ? "rgba(46, 125, 50, 0.2)" : "rgba(211, 47, 47, 0.2)",
      borderColor: hasValue ? "rgba(46, 125, 50, 0.5)" : "rgba(211, 47, 47, 0.5)",
    },
  };
};

const getTodayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const normalizeDatePaiement = (v) => {
  if (v === null || v === undefined || v === "") return "";
  const s = String(v);
  return s.length >= 10 ? s.slice(0, 10) : s;
};

const formatDateDisplay = (v) => {
  const n = normalizeDatePaiement(v);
  if (!n) return "-";
  const [y, m, d] = n.split("-");
  if (!y || !m || !d) return "-";
  return `${d}/${m}/${y}`;
};

const getMonthKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

/** Mois civil précédent pour une clé `YYYY-MM` (ex. 2024-03 → 2024-02). */
const normalizeRepartitionFromApi = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      agence_id:
        item?.agence_id === undefined || item?.agence_id === null || item?.agence_id === ""
          ? null
          : Number(item.agence_id),
      montant: toNumber(item?.montant),
    }))
    .filter((x) => x.montant > 0);
};

const hasAgencePartInRepartition = (rep) =>
  Array.isArray(rep) && rep.some((x) => x.agence_id !== null && toNumber(x.montant) > 0);

/** Inclus dans le tableau pour le mois `YYYY-MM` : effectif actuel, ou encore présent ce mois-là (désactivation). */
const agentVisibleForPointageMonth = (agent, monthKey) => {
  if (agent?.is_active === true) return true;
  const dd = agent?.date_desactivation;
  if (!dd) return false;
  const deactivationYm = String(dd).slice(0, 7);
  return String(monthKey) <= deactivationYm;
};

const getPreviousMonthKey = (monthKey) => {
  const [ys, ms] = String(monthKey).split("-");
  const y = Number.parseInt(ys, 10);
  const m = Number.parseInt(ms, 10);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return monthKey;
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const TableauPointagePage = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [monthKey, setMonthKey] = useState(getMonthKey());
  const [draftByAgent, setDraftByAgent] = useState({});
  const [hoursByAgent, setHoursByAgent] = useState({});
  const [brutByAgent, setBrutByAgent] = useState({});
  const [primeByAgent, setPrimeByAgent] = useState({});
  const [savingEmailAgentId, setSavingEmailAgentId] = useState(null);
  const [savingPointageKey, setSavingPointageKey] = useState("");
  const [selectedRecapGroup, setSelectedRecapGroup] = useState(null);
  const [agences, setAgences] = useState([]);
  const [repartitionModalRow, setRepartitionModalRow] = useState(null);
  const [editorState, setEditorState] = useState({
    open: false,
    agentId: null,
    field: "",
    label: "",
    value: "",
    inputType: "text",
    isCurrency: false,
  });
  const monthInputRef = useRef(null);

  const openMonthPicker = () => {
    const el = monthInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try {
        el.showPicker();
        return;
      } catch {
        /* navigateurs sans showPicker ou contexte non sécurisé */
      }
    }
    el.focus();
    el.click?.();
  };

  const monthDate = `${monthKey}-01`;

  useEffect(() => {
    let isCancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const prevMonthKey = getPreviousMonthKey(monthKey);
        const [yearStr, monthStr] = monthKey.split("-");
        const agentListParams = {
          year: Number(yearStr),
          month: Number(monthStr),
        };
        const [agentsRes, pointagesRes, pointagesPrevRes, scheduleSummaryRes, agentPrimesRes, agencesRes] =
          await Promise.all([
            axios.get("/api/agent/", { params: agentListParams }),
            axios.get(`/api/pointages-mensuels/?month=${monthKey}`),
            axios
              .get(`/api/pointages-mensuels/?month=${prevMonthKey}`)
              .catch(() => ({ data: [] })),
            axios.get(`/api/schedule/monthly_summary/?month=${monthKey}`).catch(() => ({ data: [] })),
            axios
              .get("/api/agent-primes/", {
                params: {
                  mois: Number(monthKey.split("-")[1]),
                  annee: Number(monthKey.split("-")[0]),
                },
              })
              .catch(() => ({ data: [] })),
            axios.get("/api/agences/").catch(() => ({ data: [] })),
          ]);
        if (isCancelled) return;
        setAgents(Array.isArray(agentsRes.data) ? agentsRes.data : []);
        setAgences(Array.isArray(agencesRes.data) ? agencesRes.data : []);
        const loadedPointages = Array.isArray(pointagesRes.data) ? pointagesRes.data : [];
        const scheduleSummary = Array.isArray(scheduleSummaryRes.data) ? scheduleSummaryRes.data : [];

        const aggregatedHours = {};
        const aggregatedBrut = {};
        scheduleSummary.forEach((chantier) => {
          const details = Array.isArray(chantier?.details) ? chantier.details : [];
          details.forEach((detail) => {
            const agentId = String(detail?.agent_id || "");
            if (!agentId) return;
            const totalHoursForDetail =
              toNumber(detail?.heures_normal) +
              toNumber(detail?.heures_samedi) +
              toNumber(detail?.heures_dimanche) +
              toNumber(detail?.heures_ferie) +
              toNumber(detail?.heures_overtime);
            aggregatedHours[agentId] = toNumber(aggregatedHours[agentId]) + totalHoursForDetail;

            const totalMontantForDetail =
              toNumber(detail?.montant_normal) +
              toNumber(detail?.montant_samedi) +
              toNumber(detail?.montant_dimanche) +
              toNumber(detail?.montant_ferie) +
              toNumber(detail?.montant_overtime);
            aggregatedBrut[agentId] =
              toNumber(aggregatedBrut[agentId]) + totalMontantForDetail;
          });
        });
        setHoursByAgent(aggregatedHours);
        setBrutByAgent(aggregatedBrut);
        const primes = Array.isArray(agentPrimesRes.data) ? agentPrimesRes.data : [];
        const aggregatedPrimes = {};
        primes.forEach((prime) => {
          const agentId = String(prime?.agent || "");
          if (!agentId) return;
          aggregatedPrimes[agentId] = toNumber(aggregatedPrimes[agentId]) + toNumber(prime?.montant);
        });
        setPrimeByAgent(aggregatedPrimes);

        const initialDraft = {};
        loadedPointages.forEach((p) => {
          initialDraft[String(p.agent)] = {
            id: p.id,
            salaireInitial: p.salaire_net_initial_hors_prime ?? 0,
            agence: Boolean(p.agence),
            repartition_montant_charge: normalizeRepartitionFromApi(p.repartition_montant_charge),
            montantCharge: p.montant_charge ?? 0,
            montantBrut: p.montant_brut ?? 0,
            accompte: p.accompte ?? 0,
            paiement: p.paiement ?? 0,
            datePaiement: normalizeDatePaiement(p.date_paiement),
            commentaire: p.commentaire || "",
            salaireOverridden: Boolean(p.salaire_overridden),
          };
        });

        const prevPointages = Array.isArray(pointagesPrevRes.data) ? pointagesPrevRes.data : [];
        const prevSalaireByAgent = {};
        prevPointages.forEach((p) => {
          prevSalaireByAgent[String(p.agent)] = toNumber(p.salaire_net_initial_hors_prime);
        });

        const agentsList = Array.isArray(agentsRes.data) ? agentsRes.data : [];
        agentsList.forEach((agent) => {
          if (!agentVisibleForPointageMonth(agent, monthKey)) return;
          const id = String(agent.id);
          const prevSal = prevSalaireByAgent[id];
          if (toNumber(prevSal) <= 0) return;

          const existing = initialDraft[id];
          if (!existing) {
            initialDraft[id] = {
              salaireInitial: prevSal,
              agence: false,
              repartition_montant_charge: [],
              montantCharge: 0,
              montantBrut: 0,
              accompte: 0,
              paiement: 0,
              datePaiement: "",
              commentaire: "",
              salaireOverridden: false,
            };
            return;
          }
          if (toNumber(existing.salaireInitial) === 0 && !existing.salaireOverridden) {
            initialDraft[id] = {
              ...existing,
              salaireInitial: prevSal,
            };
          }
        });

        setDraftByAgent(initialDraft);
      } catch {
        if (!isCancelled) {
          setError("Impossible de charger les données du tableau de pointage.");
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    };

    fetchData();
    return () => {
      isCancelled = true;
    };
  }, [monthKey]);

  const getMonthlyHours = (agent) => {
    const fromScheduleSummary = toNumber(hoursByAgent[String(agent?.id)]);
    if (fromScheduleSummary > 0) return fromScheduleSummary;

    const monthlyHours = Array.isArray(agent?.monthly_hours) ? agent.monthly_hours : [];
    const found = monthlyHours.find((item) =>
      String(item?.month || "").startsWith(monthKey)
    );
    return toNumber(found?.hours);
  };

  const rows = useMemo(() => {
    return agents
      .filter((agent) => agentVisibleForPointageMonth(agent, monthKey))
      .map((agent) => {
        const agentId = String(agent.id);
        const draft = draftByAgent[agentId] || {};
        const prime = toNumber(primeByAgent[agentId]);
        const totalHeures = getMonthlyHours(agent);
        const brutCalcule = toNumber(brutByAgent[agentId]);
        const brutPointage = toNumber(draft.montantBrut);
        const montantBrutAffiche = brutCalcule > 0 ? brutCalcule : brutPointage;

        return {
          id: agent.id,
          prenom: agent.name || "-",
          nom: agent.surname || "-",
          typePaiement: agent.type_paiement || "horaire",
          email: agent.email || "",
          totalHeures,
          salaireInitial: toNumber(draft.salaireInitial),
          agence: Boolean(draft.agence),
          repartition_montant_charge: Array.isArray(draft.repartition_montant_charge)
            ? draft.repartition_montant_charge
            : [],
          montantCharge: toNumber(draft.montantCharge),
          montantBrut: montantBrutAffiche,
          accompte: toNumber(draft.accompte),
          paiement: toNumber(draft.paiement),
          datePaiement: normalizeDatePaiement(draft.datePaiement),
          commentaire: draft.commentaire || "",
          pointageId: draft.id || null,
          salaireOverridden: Boolean(draft.salaireOverridden),
          prime,
        };
      });
  }, [agents, brutByAgent, draftByAgent, hoursByAgent, monthKey, primeByAgent]);

  const recapRows = useMemo(() => {
    if (selectedRecapGroup === "horaire") {
      return rows.filter((row) => row.typePaiement !== "journalier");
    }
    if (selectedRecapGroup === "journalier") {
      return rows.filter((row) => row.typePaiement === "journalier");
    }
    return rows;
  }, [rows, selectedRecapGroup]);

  const totals = useMemo(() => {
    const rowsHoraires = rows.filter((row) => row.typePaiement !== "journalier");

    const cumulChargeAgentsHoraires = rowsHoraires.reduce(
      (acc, row) => acc + toNumber(row.montantCharge),
      0
    );

    const totalNetPaiementHoraires = rowsHoraires.reduce(
      (acc, row) => acc + toNumber(row.paiement),
      0
    );
    const totalNetPaiementJournaliers = rows
      .filter((row) => row.typePaiement === "journalier")
      .reduce((acc, row) => acc + toNumber(row.paiement), 0);

    const cumulMensuelCharges = cumulChargeAgentsHoraires - totalNetPaiementHoraires;

    const totalNetPaiementTousAgents = rows.reduce((acc, row) => acc + toNumber(row.paiement), 0);
    const paiementValideVertTousAgents = rows.reduce((acc, row) => {
      const ok =
        toNumber(row.paiement) > 0 && Boolean(String(row.datePaiement || "").trim());
      return acc + (ok ? toNumber(row.paiement) : 0);
    }, 0);
    const resteAPayer = totalNetPaiementTousAgents - paiementValideVertTousAgents;

    return {
      cumulChargeAgentsHoraires,
      totalNetPaiementHoraires,
      totalNetPaiementJournaliers,
      cumulMensuelCharges,
      resteAPayer,
    };
  }, [rows]);

  const groupedRows = useMemo(() => {
    const sortByPrenom = (a, b) =>
      String(a.prenom || "").localeCompare(String(b.prenom || ""), "fr", {
        sensitivity: "base",
      });

    const journaliers = rows
      .filter((row) => row.typePaiement === "journalier")
      .sort(sortByPrenom);
    const horaires = rows
      .filter((row) => row.typePaiement !== "journalier")
      .sort(sortByPrenom);
    return [
      { key: "horaire", label: "Agents horaires", items: horaires },
      { key: "journalier", label: "Agents journaliers", items: journaliers },
    ];
  }, [rows]);

  const handleCellChange = (agentId, field, value) => {
    setDraftByAgent((prev) => ({
      ...prev,
      [agentId]: {
        ...(prev[agentId] || {}),
        [field]: value,
      },
    }));
  };

  const handleGroupRecapToggle = (groupKey) => {
    setSelectedRecapGroup((prev) => (prev === groupKey ? null : groupKey));
  };

  const pointageDraftFromApi = (data) => ({
    id: data.id,
    salaireInitial: data.salaire_net_initial_hors_prime,
    agence: Boolean(data.agence),
    repartition_montant_charge: normalizeRepartitionFromApi(data.repartition_montant_charge),
    montantCharge: data.montant_charge,
    montantBrut: data.montant_brut,
    accompte: data.accompte,
    paiement: data.paiement,
    datePaiement: normalizeDatePaiement(data.date_paiement),
    commentaire: data.commentaire || "",
    salaireOverridden: Boolean(data.salaire_overridden),
  });

  const savePointageField = async (agentId, field, value, isSalaryField = false) => {
    const key = `${agentId}-${field}`;
    try {
      setSavingPointageKey(key);
      const agentDraft = draftByAgent[String(agentId)] || {};
      const payload = {};
      if (field === "commentaire") {
        payload.commentaire = String(value || "");
      } else if (field === "agence") {
        payload.agence = Boolean(value);
        if (!value) {
          payload.repartition_montant_charge = [];
        }
      } else if (field === "date_paiement") {
        if (value === null || value === undefined || String(value).trim() === "") {
          payload.date_paiement = null;
        } else {
          payload.date_paiement = String(value).slice(0, 10);
        }
      } else if (field === "montant_charge") {
        const mcNew = toNumber(value);
        payload.montant_charge = mcNew;
        const rep = agentDraft.repartition_montant_charge;
        if (
          Array.isArray(rep) &&
          rep.length > 0 &&
          !repartitionSumMatchesMontant(rep, mcNew)
        ) {
          payload.repartition_montant_charge = [];
          payload.agence = false;
        }
      } else {
        payload[field] = toNumber(value);
      }
      if (isSalaryField) {
        payload.salaire_overridden = true;
      }

      if (agentDraft.id) {
        const { data } = await axios.patch(`/api/pointages-mensuels/${agentDraft.id}/`, payload);
        setDraftByAgent((prev) => ({
          ...prev,
          [String(agentId)]: {
            ...(prev[String(agentId)] || {}),
            ...pointageDraftFromApi(data),
          },
        }));
      } else {
        const createPayload = {
          agent: agentId,
          month: monthDate,
          salaire_net_initial_hors_prime: toNumber(agentDraft.salaireInitial),
          agence: Boolean(agentDraft.agence),
          repartition_montant_charge: Array.isArray(agentDraft.repartition_montant_charge)
            ? agentDraft.repartition_montant_charge
            : [],
          montant_charge: toNumber(agentDraft.montantCharge),
          montant_brut: toNumber(agentDraft.montantBrut),
          accompte: toNumber(agentDraft.accompte),
          paiement: toNumber(agentDraft.paiement),
          date_paiement: normalizeDatePaiement(agentDraft.datePaiement) || null,
          commentaire: String(agentDraft.commentaire || ""),
          salaire_overridden: Boolean(agentDraft.salaireOverridden),
          ...payload,
        };
        const { data } = await axios.post("/api/pointages-mensuels/", createPayload);
        setDraftByAgent((prev) => ({
          ...prev,
          [String(agentId)]: {
            ...(prev[String(agentId)] || {}),
            ...pointageDraftFromApi(data),
          },
        }));
      }
    } catch {
      setError("Erreur lors de la sauvegarde du pointage mensuel.");
    } finally {
      setSavingPointageKey("");
    }
  };

  const rowPointageSavingBusy = (rowId) =>
    Boolean(savingPointageKey && String(savingPointageKey).startsWith(`${rowId}-`));

  const saveAgenceToutMainOeuvre = async (row) => {
    const agentId = String(row.id);
    const key = `${row.id}-agence-reset`;
    try {
      setSavingPointageKey(key);
      setError("");
      const agentDraft = draftByAgent[agentId] || {};
      const payload = { repartition_montant_charge: [], agence: false };
      if (agentDraft.id) {
        const { data } = await axios.patch(`/api/pointages-mensuels/${agentDraft.id}/`, payload);
        setDraftByAgent((prev) => ({
          ...prev,
          [agentId]: { ...(prev[agentId] || {}), ...pointageDraftFromApi(data) },
        }));
      } else if (toNumber(row.montantCharge) > 0 || agentDraft.salaireInitial) {
        const createPayload = {
          agent: agentId,
          month: monthDate,
          salaire_net_initial_hors_prime: toNumber(agentDraft.salaireInitial),
          agence: false,
          repartition_montant_charge: [],
          montant_charge: toNumber(agentDraft.montantCharge),
          montant_brut: toNumber(agentDraft.montantBrut),
          accompte: toNumber(agentDraft.accompte),
          paiement: toNumber(agentDraft.paiement),
          date_paiement: normalizeDatePaiement(agentDraft.datePaiement) || null,
          commentaire: String(agentDraft.commentaire || ""),
          salaire_overridden: Boolean(agentDraft.salaireOverridden),
        };
        const { data } = await axios.post("/api/pointages-mensuels/", createPayload);
        setDraftByAgent((prev) => ({
          ...prev,
          [agentId]: { ...(prev[agentId] || {}), ...pointageDraftFromApi(data) },
        }));
      } else {
        handleCellChange(agentId, "agence", false);
        handleCellChange(agentId, "repartition_montant_charge", []);
      }
    } catch {
      setError("Erreur lors de la remise en main d'œuvre chantier.");
    } finally {
      setSavingPointageKey("");
    }
  };

  const saveRepartition = async (repartitionListe, agenceFlag) => {
    if (!repartitionModalRow) return;
    const agentId = String(repartitionModalRow.id);
    const savingKey = `${repartitionModalRow.id}-repartition`;
    try {
      setSavingPointageKey(savingKey);
      setError("");
      const agentDraft = draftByAgent[agentId] || {};
      const payload = {
        repartition_montant_charge: repartitionListe,
        agence: Boolean(agenceFlag),
      };
      if (agentDraft.id) {
        const { data } = await axios.patch(`/api/pointages-mensuels/${agentDraft.id}/`, payload);
        setDraftByAgent((prev) => ({
          ...prev,
          [agentId]: { ...(prev[agentId] || {}), ...pointageDraftFromApi(data) },
        }));
      } else {
        const createPayload = {
          agent: agentId,
          month: monthDate,
          salaire_net_initial_hors_prime: toNumber(agentDraft.salaireInitial),
          agence: Boolean(agenceFlag),
          repartition_montant_charge: repartitionListe,
          montant_charge: toNumber(agentDraft.montantCharge),
          montant_brut: toNumber(agentDraft.montantBrut),
          accompte: toNumber(agentDraft.accompte),
          paiement: toNumber(agentDraft.paiement),
          date_paiement: normalizeDatePaiement(agentDraft.datePaiement) || null,
          commentaire: String(agentDraft.commentaire || ""),
          salaire_overridden: Boolean(agentDraft.salaireOverridden),
        };
        const { data } = await axios.post("/api/pointages-mensuels/", createPayload);
        setDraftByAgent((prev) => ({
          ...prev,
          [agentId]: { ...(prev[agentId] || {}), ...pointageDraftFromApi(data) },
        }));
      }
      setRepartitionModalRow(null);
    } catch (err) {
      const data = err?.response?.data;
      let detail = "";
      if (data && typeof data === "object") {
        const first =
          (Array.isArray(data.non_field_errors) && data.non_field_errors[0]) ||
          Object.entries(data)
            .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : String(v)}`)
            .join(" ; ");
        detail = first ? ` (${first})` : "";
      } else if (err?.message) {
        detail = ` (${err.message})`;
      }
      console.error("saveRepartition", err?.response?.status, data || err);
      setError(`Erreur lors de l'enregistrement de la répartition.${detail}`);
    } finally {
      setSavingPointageKey("");
    }
  };

  const isAgenceChargeChecked = (row) => {
    const draft = draftByAgent[String(row.id)] || {};
    const rep = draft.repartition_montant_charge;
    const mc = toNumber(row.montantCharge);
    if (Array.isArray(rep) && rep.length > 0 && repartitionSumMatchesMontant(rep, mc)) {
      return hasAgencePartInRepartition(rep);
    }
    return Boolean(draft.agence);
  };

  const legacyAgenceSansRepartitionForRow = (row) => {
    const draft = draftByAgent[String(row.id)] || {};
    const rep = draft.repartition_montant_charge;
    const mc = toNumber(row.montantCharge);
    const hasValid =
      Array.isArray(rep) && rep.length > 0 && repartitionSumMatchesMontant(rep, mc);
    return Boolean(draft.agence && !hasValid);
  };

  const handleEmailBlur = async (agentId, value) => {
    const trimmedEmail = String(value || "").trim();
    try {
      setSavingEmailAgentId(agentId);
      await axios.patch(`/api/agent/${agentId}/`, {
        email: trimmedEmail || null,
      });
      setAgents((prev) =>
        prev.map((agent) =>
          String(agent.id) === String(agentId)
            ? { ...agent, email: trimmedEmail }
            : agent
        )
      );
    } catch {
      setError("Erreur lors de la sauvegarde de l'adresse mail de l'agent.");
    } finally {
      setSavingEmailAgentId(null);
    }
  };

  const openEditor = (row, field) => {
    const config = {
      salaireInitial: {
        field: "salaire_net_initial_hors_prime",
        label: "Salaire net initiale hors prime",
        value: row.salaireInitial,
        inputType: "text",
        isCurrency: true,
      },
      accompte: {
        field: "accompte",
        label: "Accompte",
        value: row.accompte,
        inputType: "text",
        isCurrency: true,
      },
      montantCharge: {
        field: "montant_charge",
        label: "Montant charge",
        value: row.montantCharge,
        inputType: "text",
        isCurrency: true,
      },
      paiement: {
        field: "paiement",
        label: "Paiement",
        value: row.paiement,
        inputType: "text",
        isCurrency: true,
      },
      datePaiement: {
        field: "date_paiement",
        label: "Date de paiement",
        value: row.datePaiement || getTodayYMD(),
        inputType: "date",
        isCurrency: false,
      },
      email: {
        field: "email",
        label: "Adresse mail",
        value: row.email || "",
        inputType: "email",
        isCurrency: false,
      },
      commentaire: {
        field: "commentaire",
        label: "Commentaire",
        value: row.commentaire || "",
        inputType: "text",
        isCurrency: false,
      },
    };
    const next = config[field];
    if (!next) return;
    setEditorState({
      open: true,
      agentId: row.id,
      ...next,
      value: next.isCurrency
        ? (toNumber(next.value) === 0 ? "" : formatMoneyInput(next.value))
        : next.value,
    });
  };

  const closeEditor = () => {
    setEditorState((prev) => ({ ...prev, open: false }));
  };

  const saveEditor = async () => {
    const { agentId, field, value, isCurrency } = editorState;
    if (!agentId || !field) return;
    if (field === "email") {
      await handleEmailBlur(agentId, value);
      closeEditor();
      return;
    }
    const normalizedValue = isCurrency ? parseMoneyInput(value) : value;
    if (isCurrency && normalizedValue === null) {
      setError("Montant invalide. Utilise un format du type 1234,56.");
      return;
    }
    if (field === "salaire_net_initial_hors_prime") {
      handleCellChange(String(agentId), "salaireInitial", normalizedValue);
      handleCellChange(String(agentId), "salaireOverridden", true);
      await savePointageField(agentId, field, normalizedValue, true);
    } else if (field === "date_paiement") {
      const trimmed = String(value || "").trim();
      const apiDate = trimmed ? trimmed.slice(0, 10) : null;
      handleCellChange(String(agentId), "datePaiement", apiDate || "");
      await savePointageField(agentId, "date_paiement", apiDate);
    } else if (
      field === "accompte" ||
      field === "paiement" ||
      field === "commentaire" ||
      field === "montant_charge" ||
      field === "montant_brut"
    ) {
      handleCellChange(
        String(agentId),
        field === "commentaire"
          ? "commentaire"
          : field === "montant_charge"
          ? "montantCharge"
          : field === "montant_brut"
          ? "montantBrut"
          : field,
        normalizedValue
      );
      await savePointageField(agentId, field, normalizedValue);
    }
    closeEditor();
  };

  const clearPaymentDate = async () => {
    const agentId = editorState.agentId;
    if (!agentId || editorState.field !== "date_paiement") return;
    handleCellChange(String(agentId), "datePaiement", "");
    await savePointageField(agentId, "date_paiement", null);
    closeEditor();
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          gap: 2,
          flexWrap: "wrap",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, color: "#fff" }}>
          Tableau de pointage des agents
        </Typography>
        <Box
          onClick={() => openMonthPicker()}
          sx={{
            display: "inline-flex",
            cursor: "pointer",
            "& .MuiTextField-root": { cursor: "pointer" },
            "& .MuiInputLabel-root": { cursor: "pointer" },
            "& .MuiOutlinedInput-root": { cursor: "pointer" },
            "& input": { cursor: "pointer", minWidth: "10.5rem" },
          }}
        >
          <TextField
            id="pointage-table-month"
            inputRef={monthInputRef}
            label="Mois"
            type="month"
            size="small"
            value={monthKey}
            onChange={(e) => setMonthKey(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              "& .MuiInputLabel-root": { color: "#fff" },
              "& .MuiInputBase-input": { color: "#fff" },
            }}
          />
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {!loading && error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {!loading && !error && (
        <>
          <PointageRecapCards
            totals={totals}
            formatCurrency={formatCurrency}
            selectedRecapGroup={selectedRecapGroup}
            onToggleGroup={handleGroupRecapToggle}
          />

          <TableContainer
            component={Paper}
            sx={{
              borderRadius: 2,
              maxWidth: "100%",
              overflowX: "auto",
              width: "100%",
              height: "auto",
              maxHeight: "none",
              overflowY: "visible",
              position: "relative",
            }}
          >
            <Table
              size="small"
              sx={{
                tableLayout: "auto",
                width: "100%",
              }}
            >
              <TableHead
                sx={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  backgroundColor: "rgba(27, 120, 188, 1)",
                }}
              >
                <TableRow>
                  <TableCell sx={headerCellSx}>Prenom</TableCell>
                  <TableCell sx={headerCellSx}>Nom</TableCell>
                  <TableCell sx={compactNumberColumnSx}>
                    Salaire net initiale hors prime
                  </TableCell>
                  <TableCell sx={compactNumberColumnSx}>Paiement</TableCell>
                  <TableCell sx={compactNumberColumnSx}>Date de paiement</TableCell>
                  <TableCell sx={compactNumberColumnSx}>Montant prévisionnel</TableCell>
                  <TableCell sx={compactNumberColumnSx}>Montant charge</TableCell>
                  <TableCell sx={headerCellSx}>
                    <Tooltip
                      title={
                        "Case : cocher pour ouvrir la répartition, décocher pour tout imputer à la main d'œuvre chantier. Icône : ouvrir le détail de répartition."
                      }
                    >
                      <span>Agence</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={compactNumberColumnSx}>Accompte</TableCell>
                  <TableCell sx={compactNumberColumnSx}>Prime</TableCell>
                  <TableCell sx={headerCellSx}>Adresse mail</TableCell>
                  <TableCell sx={headerCellSx}>Commentaire</TableCell>
                  <TableCell align="right" sx={headerCellSx}>
                    Total heures
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {groupedRows.map((group) => (
                  <React.Fragment key={group.key}>
                    <TableRow>
                      <TableCell
                        colSpan={13}
                        sx={{
                          backgroundColor: "rgba(27, 120, 188, 0.12)",
                          color: "rgba(27, 120, 188, 1)",
                          fontWeight: 700,
                          textAlign: "left",
                          cursor: "pointer",
                          userSelect: "none",
                          borderLeft:
                            selectedRecapGroup === group.key
                              ? "4px solid rgba(27, 120, 188, 1)"
                              : "none",
                        }}
                        onClick={() => handleGroupRecapToggle(group.key)}
                      >
                        {group.label} ({group.items.length})
                      </TableCell>
                    </TableRow>
                    {group.items.map((row) => (
                      <TableRow
                        key={`${group.key}-${row.id}`}
                        hover
                        sx={{
                          "&:nth-of-type(odd)": { backgroundColor: "#f5f5f5" },
                          "&:nth-of-type(even)": { backgroundColor: "#ffffff" },
                          "&:hover": { backgroundColor: "#f5f5f5" },
                        }}
                      >
                        <TableCell sx={commonBodyCellStyle}>{row.prenom}</TableCell>
                        <TableCell sx={commonBodyCellStyle}>{row.nom}</TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={clickableValueSx} onClick={() => openEditor(row, "salaireInitial")}>
                            <Typography sx={amountTextSx}>
                              {formatCurrencyInTable(row.salaireInitial)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box
                            sx={getPaiementCellSx(row.paiement, row.datePaiement)}
                            onClick={() => openEditor(row, "paiement")}
                          >
                            <Typography sx={amountTextSx}>
                              {formatCurrencyInTable(row.paiement)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={clickableValueSx} onClick={() => openEditor(row, "datePaiement")}>
                            <Typography sx={{ textAlign: "center", fontSize: "0.8rem" }}>
                              {formatDateDisplay(row.datePaiement)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={readOnlyValueSx}>
                            <Typography sx={amountTextSx}>
                              {formatCurrencyInTable(row.montantBrut)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={getMontantChargeCellSx(row.montantCharge)} onClick={() => openEditor(row, "montantCharge")}>
                            <Typography sx={amountTextSx}>
                              {formatCurrencyInTable(row.montantCharge)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 0.25,
                            }}
                          >
                            <Tooltip title="Cocher pour répartir (modal) ; décocher pour tout en main d'œuvre chantier">
                              <Checkbox
                                checked={isAgenceChargeChecked(row)}
                                onChange={(_e, checked) => {
                                  if (rowPointageSavingBusy(row.id)) return;
                                  if (checked) {
                                    setRepartitionModalRow(row);
                                  } else {
                                    void saveAgenceToutMainOeuvre(row);
                                  }
                                }}
                                disabled={rowPointageSavingBusy(row.id)}
                              />
                            </Tooltip>
                            <Tooltip title="Répartition détaillée (agences / chantier)">
                              <span>
                                <IconButton
                                  size="small"
                                  aria-label="Répartition agences et chantier"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (rowPointageSavingBusy(row.id)) return;
                                    setRepartitionModalRow(row);
                                  }}
                                  disabled={rowPointageSavingBusy(row.id)}
                                  sx={{ color: "rgba(27, 120, 188, 0.9)" }}
                                >
                                  <PieChartOutline fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={clickableValueSx} onClick={() => openEditor(row, "accompte")}>
                            <Typography sx={amountTextSx}>
                              {formatCurrencyInTable(row.accompte)}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          {formatCurrencyInTable(row.prime)}
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={clickableValueSx} onClick={() => openEditor(row, "email")}>
                            <Typography sx={{ textAlign: "left" }}>
                              {row.email || "-"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={commonBodyCellStyle}>
                          <Box sx={clickableValueSx} onClick={() => openEditor(row, "commentaire")}>
                            <Typography sx={{ textAlign: "left" }}>
                              {row.commentaire || "-"}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right" sx={commonBodyCellStyle}>
                          {formatWorkedTime(row.totalHeures, agents.find((a) => a.id === row.id)?.type_paiement)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
      <PointageRepartitionAgenceModal
        open={Boolean(repartitionModalRow)}
        onClose={() => {
          const k = savingPointageKey || "";
          const rid = repartitionModalRow?.id;
          if (
            k === `${rid}-repartition` ||
            k === `${rid}-agence-reset`
          ) {
            return;
          }
          setRepartitionModalRow(null);
        }}
        rowLabel={
          repartitionModalRow
            ? `${repartitionModalRow.prenom} ${repartitionModalRow.nom} — mois ${monthKey}`
            : ""
        }
        montantCharge={repartitionModalRow ? repartitionModalRow.montantCharge : 0}
        agences={agences}
        initialRepartition={
          repartitionModalRow ? repartitionModalRow.repartition_montant_charge : []
        }
        legacyAgenceSansRepartition={
          repartitionModalRow ? legacyAgenceSansRepartitionForRow(repartitionModalRow) : false
        }
        saving={
          savingPointageKey === `${repartitionModalRow?.id}-repartition` ||
          savingPointageKey === `${repartitionModalRow?.id}-agence-reset`
        }
        onSubmit={saveRepartition}
      />
      <PointageEditDialog
        editorState={editorState}
        setEditorState={setEditorState}
        closeEditor={closeEditor}
        saveEditor={saveEditor}
        savingPointageKey={savingPointageKey}
        savingEmailAgentId={savingEmailAgentId}
        onClearPaymentDate={clearPaymentDate}
      />
    </Box>
  );
};

export default TableauPointagePage;

