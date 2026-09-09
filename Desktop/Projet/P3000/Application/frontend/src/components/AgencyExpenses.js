import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import { createFilterOptions } from "@mui/material/Autocomplete";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FaEdit, FaTrash, FaChevronRight, FaChevronDown } from "react-icons/fa";
import { FilterCell, StyledTextField } from "../styles/tableStyles";

/** Euros formatés localement (espaces milliers, virgule décimale), ex. 12 270,30 € */
function formatMontantEuroFR(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0,00 €";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

/** Montant utilisé pour totaux et affichage : montant_paye si suivi non nul, sinon amount (planning : amount uniquement). */
function effectiveAgencyTableAmount(row) {
  if (!row) return 0;
  if (row.isPlanningRow) return parseFloat(row.amount) || 0;
  const paye = row.montant_paye;
  if (paye != null && paye !== "" && Number(paye) !== 0) return Number(paye);
  return parseFloat(row.amount) || 0;
}

const sumMontantPlanningAgent = (d) =>
  Number(d?.montant_normal || 0) +
  Number(d?.montant_samedi || 0) +
  Number(d?.montant_dimanche || 0) +
  Number(d?.montant_ferie || 0) +
  Number(d?.montant_overtime || 0);

const asExpenseList = (data) => {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

const expenseLineAmount = (e) => {
  if (!e) return 0;
  const paye = e.montant_paye;
  if (paye != null && paye !== "" && Number(paye) !== 0) return Number(paye);
  return Number.parseFloat(e.amount) || 0;
};

const isPointageExpense = (e) =>
  Boolean(
    e &&
      e.category === "Pointage" &&
      e.agent != null &&
      e.agent !== "" &&
      expenseLineAmount(e) > 0
  );

const isAjustementSousTraitant = (e) =>
  Boolean(
    e &&
      e.category === "Ajustement Sous-traitant" &&
      e.agent != null &&
      e.agent !== ""
  );

const chantierIdForExpense = (e, scopedToAgence, agenceChantierById) => {
  if (scopedToAgence) return null;
  if (e?.agence == null) return null;
  return agenceChantierById[String(e.agence)] ?? null;
};

const SYSTEM_CATEGORIES = [
  "Planning agence",
  "Pointage",
  "Ajustement Sous-traitant",
];

const CUSTOM_CATEGORIES_STORAGE_KEY = "p3000_agency_expense_custom_categories";

const filterCategoryOptions = createFilterOptions({
  stringify: (option) =>
    typeof option === "string" ? option : option?.inputValue || option?.title || "",
});

const MONTH_LABELS_FR = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i)
    .toLocaleString("fr-FR", { month: "long" })
    .replace(/^./, (c) => c.toUpperCase())
);

const loadStoredCustomCategories = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(CUSTOM_CATEGORIES_STORAGE_KEY) || "[]");
    if (!Array.isArray(raw)) return [];
    return raw.map((c) => String(c || "").trim()).filter(Boolean);
  } catch {
    return [];
  }
};

const persistCustomCategories = (list) => {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_STORAGE_KEY, JSON.stringify(list));
  } catch {
    /* ignore quota / private mode */
  }
};

const uniquePreserveOrder = (items) => {
  const seen = new Set();
  const out = [];
  (items || []).forEach((item) => {
    const v = String(item || "").trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(v);
  });
  return out;
};

const normalizeCategoryName = (value) => String(value || "").trim().slice(0, 50);

const designationKey = (description) =>
  (description || "").trim().toLowerCase() || "(sans désignation)";

const stripInternalExpenseIds = (text) =>
  String(text || "")
    .replace(/\s*\[POINTAGE_ID:[^\]]+\]\s*/gi, "")
    .replace(/\s*\[PRIME_ID:\d+\]\s*/gi, "")
    .replace(/\s*\[AGENCE:[^\]]+\]\s*/gi, "")
    .replace(/\s*—\s*Pointage\s*/gi, "")
    .replace(/\s*—\s*$/g, "")
    .trim();

const AGENT_DETAIL_CATEGORIES = new Set([
  "Pointage",
  "Prime",
  "Ajustement Sous-traitant",
  "Planning agence",
]);

const expenseDesignationLabel = (expense) => {
  if (!expense) return "Sans désignation";
  if (expense.agent_name) return String(expense.agent_name).trim();
  const cleaned = stripInternalExpenseIds(expense.description);
  if (AGENT_DETAIL_CATEGORIES.has(expense.category)) {
    return cleaned.split("—")[0].split(" - ")[0].trim() || "Agent";
  }
  return cleaned || "Sans désignation";
};

const groupExpensesByDesignation = (expenses) => {
  const map = {};
  (expenses || []).forEach((e) => {
    if (!e || e.is_recurring_template) return;
    const label = expenseDesignationLabel(e);
    const key =
      e.agent != null && e.agent !== ""
        ? `agent-${e.agent}`
        : designationKey(label);
    if (!map[key]) {
      map[key] = {
        key,
        label,
        lines: [],
        total: 0,
      };
    }
    map[key].lines.push(e);
    map[key].total += expenseLineAmount(e);
  });
  Object.values(map).forEach((group) => {
    const byMonth = {};
    group.lines.forEach((line) => {
      const monthNum = Number(line.month) || 0;
      if (!byMonth[monthNum]) {
        byMonth[monthNum] = {
          ...line,
          description: group.label,
          amount: 0,
          montant_paye: 0,
        };
      }
      const amt = expenseLineAmount(line);
      byMonth[monthNum].amount = Number(byMonth[monthNum].amount || 0) + amt;
      if (line.commentaire && !byMonth[monthNum].commentaire) {
        byMonth[monthNum].commentaire = line.commentaire;
      }
    });
    group.lines = Object.values(byMonth).sort(
      (a, b) => Number(a.month || 0) - Number(b.month || 0)
    );
  });
  return Object.values(map).sort(
    (a, b) => b.total - a.total || a.label.localeCompare(b.label, "fr")
  );
};

const buildAgenceChantierMap = (agences) => {
  const map = {};
  (agences || []).forEach((ag) => {
    if (ag && ag.id != null) {
      map[String(ag.id)] = ag.chantier ?? null;
    }
  });
  return map;
};

/** Clé agent(+chantier) pour savoir si le planning est remplacé par un montant chargé. */
const pointageCoverageKey = (agentId, chantierId, scopedToAgence) => {
  if (scopedToAgence) return String(agentId);
  return `${agentId}:${chantierId ?? ""}`;
};

const yearlyPointageCoverageKey = (month, agentId, chantierId, scopedToAgence) =>
  `${Number(month)}:${pointageCoverageKey(agentId, chantierId, scopedToAgence)}`;

const buildPointageCoverageKeys = (pointageExpenses, scopedToAgence, agenceChantierById) => {
  const keys = new Set();
  (pointageExpenses || []).forEach((e) => {
    if (!isPointageExpense(e)) return;
    const chantierId = scopedToAgence
      ? null
      : e.agence != null
        ? agenceChantierById[String(e.agence)]
        : null;
    keys.add(
      yearlyPointageCoverageKey(e.month, e.agent, chantierId, scopedToAgence)
    );
  });
  return keys;
};

const AgencyExpenses = () => {
  const { agenceId } = useParams();
  const [expenses, setExpenses] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "",
  });
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [filters, setFilters] = useState({
    description: "",
    category: "Tous",
    amount: "",
  });
  const [originalExpenses, setOriginalExpenses] = useState([]);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [yearlyTotal, setYearlyTotal] = useState(0);
  /** Décomposition du total annuel (tableau vs planning, aligné dashboard sur la somme). */
  const [yearlyTotalTableau, setYearlyTotalTableau] = useState(0);
  const [yearlyTotalPlanning, setYearlyTotalPlanning] = useState(0);
  /** Totaux annuels par catégorie (dépenses saisies + planning agence sur 12 mois) */
  const [yearlyCategoryTotals, setYearlyCategoryTotals] = useState({});
  const [yearlyCategoryLoading, setYearlyCategoryLoading] = useState(false);
  const [planningAgence, setPlanningAgence] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceStart, setRecurrenceStart] = useState("");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const [agenceName, setAgenceName] = useState("");
  const [agenceChantierId, setAgenceChantierId] = useState(null);
  const [agencesList, setAgencesList] = useState([]);
  const [yearlyRefresh, setYearlyRefresh] = useState(0);
  const triggerYearlyRefresh = () => setYearlyRefresh((n) => n + 1);
  const [expandedAgentGroups, setExpandedAgentGroups] = useState({});
  const [customCategories, setCustomCategories] = useState(loadStoredCustomCategories);
  const [categoryDetail, setCategoryDetail] = useState({
    open: false,
    cat: "",
    total: 0,
    loading: false,
    groups: [],
  });
  const [expandedDesignations, setExpandedDesignations] = useState({});
  const [yearlySchedMonths, setYearlySchedMonths] = useState([]);
  const [yearlyPointageList, setYearlyPointageList] = useState([]);

  const agenceParam = agenceId ? `&agence_id=${agenceId}` : "";
  const scheduleParam = agenceChantierId
    ? `&agence=1&chantier_id=${agenceChantierId}`
    : "&agence=1";
  const scheduleReady = !agenceId || !!agenceChantierId;

  const rememberCategory = (cat) => {
    const name = normalizeCategoryName(cat);
    if (!name) return name;
    const isSystem = SYSTEM_CATEGORIES.some(
      (c) => c.toLowerCase() === name.toLowerCase()
    );
    if (isSystem) return name;
    setCustomCategories((prev) => {
      if (prev.some((c) => c.toLowerCase() === name.toLowerCase())) return prev;
      const next = [...prev, name];
      persistCustomCategories(next);
      return next;
    });
    return name;
  };

  const usedCategories = useMemo(() => {
    const fromYear = Object.entries(yearlyCategoryTotals)
      .filter(([, total]) => Number(total) > 0)
      .map(([cat]) => cat);
    const fromMonth = (originalExpenses || []).map((e) => e.category);
    return uniquePreserveOrder([...fromYear, ...fromMonth]);
  }, [yearlyCategoryTotals, originalExpenses]);

  const formCategoryOptions = useMemo(() => {
    const current = isEditing ? editingExpense?.category : newExpense.category;
    return uniquePreserveOrder([
      ...customCategories,
      ...usedCategories,
      current,
    ]).filter(
      (c) => !SYSTEM_CATEGORIES.some((s) => s.toLowerCase() === c.toLowerCase())
    );
  }, [customCategories, usedCategories, isEditing, editingExpense?.category, newExpense.category]);

  const filterCategoryList = useMemo(() => {
    return uniquePreserveOrder([...usedCategories, ...customCategories]);
  }, [usedCategories, customCategories]);

  const categoriesWithPlanning = useMemo(
    () => uniquePreserveOrder([...usedCategories, ...SYSTEM_CATEGORIES, ...customCategories]),
    [usedCategories, customCategories]
  );

  useEffect(() => {
    if (!agenceId) { setAgenceChantierId(null); return; }
    let cancelled = false;
    axios.get(`/api/agences/${agenceId}/`).then((res) => {
      if (cancelled) return;
      setAgenceName(res.data.nom || "");
      setAgenceChantierId(res.data.chantier || null);
    }).catch(() => { if (!cancelled) { setAgenceName(""); setAgenceChantierId(null); } });
    return () => { cancelled = true; };
  }, [agenceId]);

  useEffect(() => {
    let cancelled = false;
    axios
      .get("/api/agences/")
      .then((res) => {
        if (!cancelled) setAgencesList(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) setAgencesList([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Chargement des données mensuelles (dépenses du tableau)
  useEffect(() => {
    fetchMonthlyExpenses();
  }, [selectedMonth, selectedYear, agenceId]);

  // Chargement consolidé : totaux annuels + planning mensuel (2 appels au lieu de ~50)
  useEffect(() => {
    if (!scheduleReady) return;
    let cancelled = false;
    const loadYearlyAndPlanning = async () => {
      setYearlyCategoryLoading(true);
      try {
        const scheduleYearParam = agenceChantierId
          ? `&agence=1&chantier_id=${agenceChantierId}`
          : "&agence=1";
        const monthStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;

        const [expYearRes, schedYearRes, planMonthRes, pointageYearRes, ajustementYearRes] =
          await Promise.all([
          axios.get(
            `/api/agency-expenses-month/yearly_summary/?year=${selectedYear}${agenceParam}`
          ),
          axios.get(
            `/api/schedule/yearly_summary/?year=${selectedYear}${scheduleYearParam}`
          ).catch(() => ({ data: { months: [] } })),
          axios.get(
            `/api/schedule/monthly_summary/?month=${encodeURIComponent(monthStr)}${scheduleYearParam}`
          ).catch(() => ({ data: {} })),
          axios
            .get(
              `/api/agency-expenses-month/?year=${selectedYear}&category=Pointage${agenceParam}`
            )
            .catch(() => ({ data: [] })),
          axios
            .get(
              `/api/agency-expenses-month/?year=${selectedYear}&category=${encodeURIComponent(
                "Ajustement Sous-traitant"
              )}${agenceParam}`
            )
            .catch(() => ({ data: [] })),
        ]);

        if (cancelled) return;

        const expMonths = expYearRes.data?.months || [];
        const schedMonths = schedYearRes.data?.months || [];
        const pointageYearList = asExpenseList(pointageYearRes.data);
        const ajustementYearList = asExpenseList(ajustementYearRes.data);
        const scopedToAgence = Boolean(agenceId);
        const agenceChantierById = buildAgenceChantierMap(agencesList);
        const pointageCoverage = buildPointageCoverageKeys(
          pointageYearList,
          scopedToAgence,
          agenceChantierById
        );

        const hiddenAjustementTotal = ajustementYearList.reduce((acc, e) => {
          if (!isAjustementSousTraitant(e)) return acc;
          const key = yearlyPointageCoverageKey(
            e.month,
            e.agent,
            chantierIdForExpense(e, scopedToAgence, agenceChantierById),
            scopedToAgence
          );
          if (!pointageCoverage.has(key)) return acc;
          return acc + expenseLineAmount(e);
        }, 0);

        const netPlanningMontant = (sm, monthNum) => {
          const details = sm.details || [];
          if (!details.length) {
            return Number(sm.total_montant) || 0;
          }
          return details.reduce((acc, d) => {
            const key = yearlyPointageCoverageKey(
              monthNum,
              d.agent_id,
              d.chantier_id,
              scopedToAgence
            );
            if (pointageCoverage.has(key)) return acc;
            return acc + sumMontantPlanningAgent(d);
          }, 0);
        };

        const categoryMerged = {};
        let yearTotal = 0;
        let sumTableau = 0;
        let sumPlanning = 0;
        for (let i = 0; i < 12; i++) {
          const em = expMonths[i] || { total: 0, totals_by_category: [] };
          const sm = schedMonths[i] || { total_montant: 0, details: [] };
          const monthNum = Number(sm.month) || i + 1;
          const tEm = Number(em.total) || 0;
          const tSm = netPlanningMontant(sm, monthNum);
          sumTableau += tEm;
          sumPlanning += tSm;
          yearTotal += tEm + tSm;
          (em.totals_by_category || []).forEach(({ category, total }) => {
            const c = category || "Autres";
            categoryMerged[c] = (categoryMerged[c] || 0) + (Number(total) || 0);
          });
          categoryMerged["Planning agence"] =
            (categoryMerged["Planning agence"] || 0) + tSm;
        }

        if (hiddenAjustementTotal) {
          const catAjust = "Ajustement Sous-traitant";
          categoryMerged[catAjust] = Math.max(
            0,
            (categoryMerged[catAjust] || 0) - hiddenAjustementTotal
          );
          sumTableau -= hiddenAjustementTotal;
          yearTotal -= hiddenAjustementTotal;
        }

        setYearlyCategoryTotals(categoryMerged);
        setYearlyTotal(yearTotal);
        setYearlyTotalTableau(sumTableau);
        setYearlyTotalPlanning(sumPlanning);
        setPlanningAgence(planMonthRes.data);
        setYearlySchedMonths(schedMonths);
        setYearlyPointageList(pointageYearList);
      } catch (e) {
        console.error("Erreur chargement données annuelles/planning:", e);
        if (!cancelled) {
          setYearlyCategoryTotals({});
          setYearlyTotal(0);
          setYearlyTotalTableau(0);
          setYearlyTotalPlanning(0);
          setPlanningAgence(null);
          setYearlySchedMonths([]);
          setYearlyPointageList([]);
        }
      } finally {
        if (!cancelled) setYearlyCategoryLoading(false);
      }
    };
    loadYearlyAndPlanning();
    return () => { cancelled = true; };
  }, [selectedMonth, selectedYear, agenceId, agenceChantierId, agenceParam, scheduleReady, yearlyRefresh, agencesList]);

  const fetchMonthlyExpenses = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `/api/agency-expenses-month/monthly_summary/?month=${
          selectedMonth + 1
        }&year=${selectedYear}${agenceParam}`
      );
      const fetched = response.data?.expenses || [];
      setOriginalExpenses(fetched);
      setExpenses(fetched);
    } catch (error) {
      console.error("Erreur lors du chargement des dépenses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.description || !newExpense.amount) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }
    if (!normalizeCategoryName(newExpense.category)) {
      alert("Veuillez renseigner une catégorie");
      return;
    }

    try {
      setLoading(true);

      // Extraire mois/année de la date de début (en gérant les fuseaux horaires)
      let startMonth, startYear;
      if (recurrenceStart) {
        // Parser la date YYYY-MM-DD directement sans conversion de fuseau horaire
        const [yearStr, monthStr] = recurrenceStart.split("-");
        startYear = parseInt(yearStr, 10);
        startMonth = parseInt(monthStr, 10) - 1; // 0-indexed pour JS
      } else {
        startMonth = selectedMonth;
        startYear = selectedYear;
      }

      // Normaliser les dates au premier du mois (format YYYY-MM-DD)
      const startDateNormalized = `${startYear}-${String(startMonth + 1).padStart(2, "0")}-01`;
      
      // Traiter la date de fin de la même manière
      let endDateNormalized = null;
      if (recurrenceEnd) {
        const [endYearStr, endMonthStr] = recurrenceEnd.split("-");
        const endYear = parseInt(endYearStr, 10);
        const endMonth = parseInt(endMonthStr, 10);
        endDateNormalized = `${endYear}-${String(endMonth).padStart(2, "0")}-01`;
      }

      // Si une date de fin est spécifiée, c'est automatiquement récurrent
      const effectiveIsRecurring = isRecurring || !!endDateNormalized;

      const categoryName = rememberCategory(newExpense.category);

      const expenseData = {
        description: newExpense.description,
        amount: parseFloat(newExpense.amount),
        category: categoryName,
        month: startMonth + 1,
        year: startYear,
        date_paiement: startDateNormalized,
        is_recurring_template: effectiveIsRecurring,
        recurrence_start: effectiveIsRecurring ? startDateNormalized : null,
        recurrence_end: effectiveIsRecurring && endDateNormalized ? endDateNormalized : null,
        ...(agenceId ? { agence: parseInt(agenceId, 10) } : {}),
      };

      const response = await axios.post("/api/agency-expenses-month/", expenseData);

      // Générer les occurrences si c'est un template récurrent
      if (effectiveIsRecurring && response?.data?.id) {
        await axios.post(
          `/api/agency-expenses-month/${response.data.id}/recurring_generate/`,
          {
            horizon_months: 60, // 5 ans
          }
        );
      }

      setOpenDialog(false);
      await fetchMonthlyExpenses();
      triggerYearlyRefresh();

      setNewExpense({
        description: "",
        amount: "",
        category: "",
      });
      setIsRecurring(false);
      setRecurrenceStart("");
      setRecurrenceEnd("");
    } catch (error) {
      console.error("Erreur lors de l'ajout de la dépense:", error);
      alert("Erreur lors de l'ajout de la dépense");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    try {
      setLoading(true);
      await axios.delete(`/api/agency-expenses-month/${id}/`);
      await fetchMonthlyExpenses();
      triggerYearlyRefresh();
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      alert("Erreur lors de la suppression de la dépense");
    } finally {
      setLoading(false);
    }
  };

  const openDeleteConfirm = (expense) => {
    setExpenseToDelete(expense);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!expenseToDelete) return;
    await handleDeleteExpense(expenseToDelete.id);
    setConfirmDeleteOpen(false);
    setExpenseToDelete(null);
  };

  const handleEditExpense = (expense) => {
    setEditingExpense({
      ...expense,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
    });
    setIsRecurring(false);
    setRecurrenceStart("");
    setRecurrenceEnd("");
    setIsEditing(true);
    setOpenDialog(true);
  };

  const handleSaveExpense = async () => {
    if (isEditing) {
      try {
        setLoading(true);

        const categoryName = rememberCategory(editingExpense.category);
        if (!categoryName) {
          alert("Veuillez renseigner une catégorie");
          setLoading(false);
          return;
        }

        const updateData = {
          description: editingExpense.description,
          amount: parseFloat(editingExpense.amount),
          category: categoryName,
        };

        await axios.patch(
          `/api/agency-expenses-month/${editingExpense.id}/`,
          updateData
        );

        setOpenDialog(false);
        await fetchMonthlyExpenses();
        triggerYearlyRefresh();
        setIsEditing(false);
        setEditingExpense(null);
      } catch (error) {
        console.error("Erreur lors de la modification:", error);
        alert("Erreur lors de la modification de la dépense");
      } finally {
        setLoading(false);
      }
    } else {
      handleAddExpense();
    }
  };

  const handleCloseRecurrence = async () => {
    const targetId =
      editingExpense?.recurrence_parent || editingExpense?.id || null;
    if (!targetId) {
      alert("Aucune récurrence associée à cette dépense.");
      return;
    }
    try {
      setLoading(true);
      // Normaliser au premier du mois sans problème de fuseau horaire
      const stopDate = `${editingExpense.year}-${String(editingExpense.month).padStart(2, "0")}-01`;
      await axios.post(
        `/api/agency-expenses-month/${targetId}/close_at_month/`,
        {
          stop_date: stopDate,
        }
      );
      setOpenDialog(false);
      setIsEditing(false);
      setEditingExpense(null);
      await fetchMonthlyExpenses();
      triggerYearlyRefresh();
    } catch (error) {
      console.error("Erreur lors de l'arrêt de la récurrence:", error);
      alert("Erreur lors de l'arrêt de la récurrence");
    } finally {
      setLoading(false);
    }
  };

  const sumHeuresPlanningAgent = (d) =>
    Number(d.heures_normal || 0) +
    Number(d.heures_samedi || 0) +
    Number(d.heures_dimanche || 0) +
    Number(d.heures_ferie || 0) +
    Number(d.heures_overtime || 0);

  /** Même règle que LaborCostsSummary (Résumé des heures) : journalier → jours (÷8), horaire → h */
  const formatHeuresCommeResume = (heures, typePaiement) => {
    const h = Number(heures) || 0;
    if (typePaiement === "journalier") {
      const jours = h / 8;
      return jours === 1 ? "1j" : `${jours}j`;
    }
    return `${h.toFixed(2)} h`;
  };

  const planningCommentKey = (comment) => {
    const s = comment || "";
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
    }
    return String(Math.abs(h));
  };

  const monthlyPointageCoverage = useMemo(() => {
    const keys = new Set();
    const scopedToAgence = Boolean(agenceId);
    const agenceChantierById = buildAgenceChantierMap(agencesList);
    originalExpenses.forEach((e) => {
      if (!isPointageExpense(e)) return;
      keys.add(
        pointageCoverageKey(
          e.agent,
          chantierIdForExpense(e, scopedToAgence, agenceChantierById),
          scopedToAgence
        )
      );
    });
    return keys;
  }, [originalExpenses, agenceId, agencesList]);

  const planningRowsVirtual = useMemo(() => {
    if (!planningAgence?.details?.length) return [];
    const scopedToAgence = Boolean(agenceId);
    return planningAgence.details
      .filter((row) => {
        const key = pointageCoverageKey(
          row.agent_id,
          row.chantier_id,
          scopedToAgence
        );
        return !monthlyPointageCoverage.has(key);
      })
      .map((row, idx) => {
        const cmt = (row.comment || "").trim();
        const suffix = planningCommentKey(cmt);
        const chantierLabel = row.chantier_nom ? `${row.chantier_nom} — ` : "";
        const heuresLabel = formatHeuresCommeResume(
          sumHeuresPlanningAgent(row),
          row.type_paiement
        );
        return {
          id: `planning-agence-${row.agent_id}-${suffix}-${idx}`,
          agent_id: row.agent_id,
          chantier_id: row.chantier_id,
          description: `${row.agent_nom} — ${chantierLabel}${heuresLabel}`,
          planningComment: cmt,
          category: "Planning agence",
          amount: sumMontantPlanningAgent(row),
          isPlanningRow: true,
        };
      });
  }, [planningAgence, monthlyPointageCoverage, agenceId]);

  const planningRowsFiltered = useMemo(() => {
    return planningRowsVirtual.filter((row) => {
      if (filters.description) {
        const q = filters.description.toLowerCase();
        const inDesc = row.description.toLowerCase().includes(q);
        const inPlanningComment =
          row.isPlanningRow &&
          (row.planningComment || "").toLowerCase().includes(q);
        if (!inDesc && !inPlanningComment) return false;
      }
      if (
        filters.category &&
        filters.category !== "Tous" &&
        row.category !== filters.category
      ) {
        return false;
      }
      if (filters.amount) {
        const expenseAmount = String(row.amount);
        const filterAmount = filters.amount;
        if (!expenseAmount.includes(filterAmount.toString())) return false;
      }
      return true;
    });
  }, [planningRowsVirtual, filters]);

  const expensesForTable = useMemo(() => {
    const scopedToAgence = Boolean(agenceId);
    const agenceChantierById = buildAgenceChantierMap(agencesList);
    return expenses.filter((e) => {
      if (!isAjustementSousTraitant(e)) return true;
      const key = pointageCoverageKey(
        e.agent,
        chantierIdForExpense(e, scopedToAgence, agenceChantierById),
        scopedToAgence
      );
      return !monthlyPointageCoverage.has(key);
    });
  }, [expenses, monthlyPointageCoverage, agenceId, agencesList]);

  const tableRowsCombined = useMemo(() => {
    const allRows = [...expensesForTable, ...planningRowsFiltered];
    
    // Identifier les lignes liées à un agent (Planning, Pointage, Prime, Ajustement Sous-traitant)
    const agentCategories = new Set([
      "Planning agence",
      "Pointage",
      "Prime",
      "Ajustement Sous-traitant",
    ]);
    const agentGroups = {};
    const standaloneRows = [];
    
    allRows.forEach((row) => {
      if (!agentCategories.has(row.category)) {
        standaloneRows.push(row);
        return;
      }
      
      // Déterminer l'identifiant agent
      let agentKey = null;
      let agentLabel = null;
      
      if (row.isPlanningRow) {
        agentKey = row.agent_id != null ? `agent-${row.agent_id}` : null;
        if (!agentKey) {
          const match = row.id?.toString().match(/planning-agence-(\d+)/);
          agentKey = match ? `agent-${match[1]}` : null;
        }
        agentLabel = row.description?.split("—")[0]?.trim() || "Agent";
      } else if (row.category === "Pointage") {
        agentKey = row.agent ? `agent-${row.agent}` : null;
        agentLabel =
          row.agent_name ||
          row.description?.split("—")[0]?.trim()?.replace(/\s*\[POINTAGE_ID:.*$/i, "").trim() ||
          "Agent";
      } else if (row.category === "Prime") {
        agentKey = row.agent ? `agent-${row.agent}` : null;
        agentLabel = row.agent_name || row.description?.split(" - ")[1]?.trim() || "Agent";
      } else if (row.category === "Ajustement Sous-traitant") {
        agentKey = row.agent ? `agent-${row.agent}` : null;
        // Description format: "Nom Prénom - Description"
        agentLabel = row.agent_name || row.description?.split(" - ")[0]?.trim() || "Agent";
      }
      
      if (!agentKey) {
        standaloneRows.push(row);
        return;
      }
      
      if (!agentGroups[agentKey]) {
        agentGroups[agentKey] = { label: agentLabel, rows: [] };
      }
      agentGroups[agentKey].rows.push(row);
    });
    
    // Construire le résultat final avec les groupes agents
    const result = [...standaloneRows];
    
    Object.entries(agentGroups).forEach(([key, group]) => {
      const totalAmount = group.rows.reduce((sum, r) => sum + effectiveAgencyTableAmount(r), 0);
      
      // Ligne de header (total agent)
      result.push({
        id: `group-header-${key}`,
        description: group.label,
        category: "",
        amount: totalAmount,
        isGroupHeader: true,
        agentKey: key,
        subRowCount: group.rows.length,
      });
      
      // Sous-lignes détaillées
      group.rows.forEach((row) => {
        result.push({
          ...row,
          isSubRow: true,
          agentKey: key,
        });
      });
    });
    
    return result;
  }, [expensesForTable, planningRowsFiltered]);

  /** Catégories avec montant annuel > 0, ordre fixe puis catégories « extra » triées */
  const yearlyCategoryDisplayRows = useMemo(() => {
    const rows = [];
    const seen = new Set();
    for (const cat of categoriesWithPlanning) {
      const total = Number(yearlyCategoryTotals[cat]) || 0;
      if (total > 0) {
        rows.push({ cat, total });
        seen.add(cat);
      }
    }
    Object.keys(yearlyCategoryTotals)
      .filter((k) => !seen.has(k))
      .sort((a, b) => a.localeCompare(b, "fr"))
      .forEach((cat) => {
        const total = Number(yearlyCategoryTotals[cat]) || 0;
        if (total > 0) rows.push({ cat, total });
      });
    return rows;
  }, [yearlyCategoryTotals, categoriesWithPlanning]);

  /** Total mensuel : une seule fois chaque ligne réelle (pas les en-têtes de groupe qui dupliquent la somme). */
  const monthlyTotalDisplayed = useMemo(() => {
    return tableRowsCombined.reduce((total, row) => {
      if (row.isGroupHeader) return total;
      return total + effectiveAgencyTableAmount(row);
    }, 0);
  }, [tableRowsCombined]);


  const getExpenseCommentaire = (expense) => {
    if (expense.category === "Prime" && expense.description) {
      const parts = expense.description.split(" - ");
      if (parts.length >= 3) {
        let description = parts.slice(2).join(" - ");
        description = description
          .replace(/\s*\[(PRIME_)?ID:\d+\]\s*$/g, "")
          .trim();
        return description || "-";
      }
    }
    return "-";
  };

  const getExpenseDescriptionCourte = (expense) => {
    if (expense.category === "Pointage" && expense.description) {
      return expense.description
        .replace(/\s*—\s*Pointage\s*/i, " — ")
        .replace(/\s*\[POINTAGE_ID:[^\]]+\]\s*/gi, "")
        .replace(/\s*—\s*$/, "")
        .trim() || expense.description;
    }
    if (expense.category === "Prime" && expense.description) {
      const parts = expense.description.split(" - ");
      if (parts.length >= 3) {
        let desc = parts.slice(2).join(" - ");
        desc = desc.replace(/\s*\[PRIME_ID:\d+\]\s*$/g, "").trim();
        return `Prime - ${desc}`;
      }
      if (parts.length >= 2) {
        return `${parts[0]} - ${parts[1]}`;
      }
    }
    return expense.description;
  };

  const handleFilterChange = (field) => (event) => {
    const newFilters = {
      ...filters,
      [field]: event.target.value,
    };
    setFilters(newFilters);

    const filtered = originalExpenses.filter((expense) => {
      if (
        newFilters.description &&
        !expense.description
          .toLowerCase()
          .includes(newFilters.description.toLowerCase())
      ) {
        return false;
      }

      if (
        newFilters.category &&
        newFilters.category !== "Tous" &&
        expense.category !== newFilters.category
      ) {
        return false;
      }

      if (newFilters.amount) {
        const expenseAmount = expense.amount;
        const filterAmount = newFilters.amount;
        return expenseAmount.toString().includes(filterAmount.toString());
      }

      return true;
    });

    setExpenses(filtered);
  };

  const setExpenseCategoryValue = (value) => {
    const next = normalizeCategoryName(
      typeof value === "string" ? value : value?.inputValue || value?.title || ""
    );
    if (isEditing) {
      setEditingExpense((prev) => (prev ? { ...prev, category: next } : prev));
    } else {
      setNewExpense((prev) => ({ ...prev, category: next }));
    }
  };

  const closeCategoryDetail = () => {
    setCategoryDetail((prev) => ({ ...prev, open: false, loading: false }));
    setExpandedDesignations({});
  };

  const openCategoryDetail = async (cat, total) => {
    const categoryName = cat || "";
    setExpandedDesignations({});
    setCategoryDetail({
      open: true,
      cat: categoryName,
      total: Number(total) || 0,
      loading: true,
      groups: [],
    });

    try {
      let groups = [];
      const scopedToAgence = Boolean(agenceId);
      const agenceChantierById = buildAgenceChantierMap(agencesList);
      const pointageCoverage = buildPointageCoverageKeys(
        yearlyPointageList,
        scopedToAgence,
        agenceChantierById
      );

      if (categoryName === "Planning agence") {
        const map = {};
        (yearlySchedMonths || []).forEach((sm, idx) => {
          const monthNum = Number(sm.month) || idx + 1;
          (sm.details || []).forEach((d) => {
            const key = yearlyPointageCoverageKey(
              monthNum,
              d.agent_id,
              d.chantier_id,
              scopedToAgence
            );
            if (pointageCoverage.has(key)) return;
            const label = (d.agent_nom || "Agent").trim();
            const groupKey = designationKey(label);
            if (!map[groupKey]) {
              map[groupKey] = { key: groupKey, label, lines: [], total: 0 };
            }
            const amount = sumMontantPlanningAgent(d);
            map[groupKey].lines.push({
              id: `planning-${monthNum}-${d.agent_id}-${d.chantier_id || ""}`,
              month: monthNum,
              amount,
              commentaire: d.comment || "",
              description: d.chantier_nom
                ? `${label} — ${d.chantier_nom}`
                : label,
            });
            map[groupKey].total += amount;
          });
        });
        Object.values(map).forEach((group) => {
          group.lines.sort((a, b) => Number(a.month || 0) - Number(b.month || 0));
        });
        groups = Object.values(map).sort(
          (a, b) => b.total - a.total || a.label.localeCompare(b.label, "fr")
        );
      } else {
        const response = await axios.get(
          `/api/agency-expenses-month/?year=${selectedYear}&category=${encodeURIComponent(
            categoryName
          )}${agenceParam}`
        );
        let list = asExpenseList(response.data);
        if (categoryName === "Ajustement Sous-traitant") {
          list = list.filter((e) => {
            if (!isAjustementSousTraitant(e)) return true;
            const key = yearlyPointageCoverageKey(
              e.month,
              e.agent,
              chantierIdForExpense(e, scopedToAgence, agenceChantierById),
              scopedToAgence
            );
            return !pointageCoverage.has(key);
          });
        }
        groups = groupExpensesByDesignation(list);
      }

      setCategoryDetail({
        open: true,
        cat: categoryName,
        total: groups.reduce((acc, g) => acc + g.total, 0),
        loading: false,
        groups,
      });
    } catch (error) {
      console.error("Erreur lors du chargement du détail catégorie:", error);
      setCategoryDetail({
        open: true,
        cat: categoryName,
        total: Number(total) || 0,
        loading: false,
        groups: [],
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
        <Typography sx={{ fontWeight: "bold", color: "white" }} variant="h5">
          Dépenses {agenceName ? `- ${agenceName}` : "de l'Agence"} (Système Mensuel)
        </Typography>
        <Button
          variant="contained"
          onClick={() => {
            setIsEditing(false);
            setEditingExpense(null);
            setOpenDialog(true);
          }}
        >
          Ajouter une dépense
        </Button>
      </Box>

      <Box sx={{ mb: 3, display: "flex", gap: 2 }}>
        <Select
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(Number(e.target.value))}
          sx={{
            minWidth: 150,
            backgroundColor: "rgba(27, 120, 188, 1)",
            color: "white",
            "& .MuiSvgIcon-root": {
              color: "white",
            },
          }}
        >
          {Array.from({ length: 12 }, (_, i) => (
            <MenuItem key={i} value={i}>
              {new Date(2000, i)
                .toLocaleString("default", { month: "long" })
                .charAt(0)
                .toUpperCase() +
                new Date(2000, i)
                  .toLocaleString("default", { month: "long" })
                  .slice(1)}
            </MenuItem>
          ))}
        </Select>
        <Select
          value={selectedYear}
          onChange={(e) => setSelectedYear(Number(e.target.value))}
          sx={{
            minWidth: 100,
            backgroundColor: "rgba(27, 120, 188, 1)",
            color: "white",
            "& .MuiSvgIcon-root": {
              color: "white",
            },
          }}
        >
          {Array.from({ length: 5 }, (_, i) => (
            <MenuItem key={i} value={new Date().getFullYear() - 2 + i}>
              {new Date().getFullYear() - 2 + i}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <FilterCell>
                <StyledTextField
                  size="small"
                  fullWidth
                  value={filters.description}
                  onChange={handleFilterChange("description")}
                  placeholder="Description..."
                />
              </FilterCell>
              <FilterCell>
                <Autocomplete
                  size="small"
                  fullWidth
                  options={uniquePreserveOrder(["Tous", filters.category, ...filterCategoryList])}
                  value={filters.category || "Tous"}
                  disableClearable
                  autoHighlight
                  selectOnFocus
                  handleHomeEndKeys
                  onChange={(_, value) =>
                    handleFilterChange("category")({
                      target: { value: value || "Tous" },
                    })
                  }
                  filterOptions={(options, state) => {
                    const q = (state.inputValue || "").trim().toLowerCase();
                    if (!q) return options;
                    return options.filter((o) =>
                      String(o).toLowerCase().includes(q)
                    );
                  }}
                  renderInput={(params) => (
                    <StyledTextField
                      {...params}
                      size="small"
                      placeholder="Catégorie..."
                      sx={{
                        "& .MuiInputBase-input": {
                          textAlign: "center",
                          color: "white",
                        },
                        "& .MuiSvgIcon-root": {
                          color: "white",
                        },
                      }}
                    />
                  )}
                />
              </FilterCell>
              <FilterCell>
                <StyledTextField
                  type="number"
                  size="small"
                  sx={{
                    "& .MuiInputBase-input": {
                      textAlign: "center",
                    },
                  }}
                  fullWidth
                  value={filters.amount}
                  onChange={handleFilterChange("amount")}
                  placeholder="Montant..."
                />
              </FilterCell>
              <FilterCell>
                <Typography variant="caption" sx={{ color: "#fff", px: 1 }}>
                  Commentaire
                </Typography>
              </FilterCell>
              <FilterCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {tableRowsCombined.map((row, index) => {
              // Ligne de header de groupe agent
              if (row.isGroupHeader) {
                const isExpanded = !!expandedAgentGroups[row.agentKey];
                return (
                  <TableRow
                    key={row.id}
                    sx={{
                      backgroundColor: "rgba(27, 120, 188, 0.08)",
                      borderTop: "2px solid rgba(27, 120, 188, 0.3)",
                      cursor: "pointer",
                      "&:hover": { backgroundColor: "rgba(27, 120, 188, 0.14)" },
                    }}
                    onClick={() => setExpandedAgentGroups((prev) => ({
                      ...prev,
                      [row.agentKey]: !prev[row.agentKey],
                    }))}
                  >
                    <TableCell
                      sx={{
                        textAlign: "left",
                        fontWeight: 700,
                        color: "rgba(27, 120, 188, 1)",
                        fontSize: "0.9rem",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {isExpanded ? (
                        <FaChevronDown style={{ marginRight: 8, fontSize: "0.7rem" }} />
                      ) : (
                        <FaChevronRight style={{ marginRight: 8, fontSize: "0.7rem" }} />
                      )}
                      {row.description}
                      <Typography component="span" sx={{ ml: 1, fontSize: "0.75rem", color: "#888", fontWeight: 400 }}>
                        ({row.subRowCount} ligne{row.subRowCount > 1 ? "s" : ""})
                      </Typography>
                    </TableCell>
                    <TableCell align="center" sx={{ color: "#888", fontSize: "0.75rem" }}>
                      Total agent
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{ fontWeight: 700, color: "rgba(27, 120, 188, 1)", fontSize: "0.9rem" }}
                    >
                      {formatMontantEuroFR(effectiveAgencyTableAmount(row))}
                    </TableCell>
                    <TableCell />
                    <TableCell />
                  </TableRow>
                );
              }
              
              // Sous-ligne d'un groupe agent (masquée si groupe fermé)
              if (row.isSubRow) {
                if (!expandedAgentGroups[row.agentKey]) return null;
                const sourceColor = row.isPlanningRow
                  ? "#6a1b9a"
                  : row.category === "Prime"
                    ? "#f57c00"
                    : row.category === "Pointage"
                      ? "#2e7d32"
                      : row.category === "Ajustement Sous-traitant"
                        ? "#1976d2"
                        : "#333";
                const sourceDot = (
                  <span style={{
                    width: 8, height: 8, borderRadius: "50%",
                    backgroundColor: sourceColor,
                    display: "inline-block", marginRight: 6, flexShrink: 0,
                  }} />
                );
                
                let displayDescription = row.description;
                if (row.isPlanningRow) {
                  displayDescription = row.description;
                } else if (row.category === "Prime") {
                  displayDescription = getExpenseDescriptionCourte(row);
                } else if (row.category === "Pointage") {
                  displayDescription = getExpenseDescriptionCourte(row);
                } else if (row.category === "Ajustement Sous-traitant") {
                  displayDescription = row.description;
                }
                
                return (
                  <TableRow
                    key={row.id}
                    sx={{
                      backgroundColor: row.isPlanningRow
                        ? "rgba(123, 31, 162, 0.04)"
                        : row.category === "Prime"
                          ? "rgba(255, 152, 0, 0.04)"
                          : row.category === "Pointage"
                            ? "rgba(46, 125, 50, 0.04)"
                            : "rgba(25, 118, 210, 0.04)",
                      "&:hover": { backgroundColor: "rgba(27, 120, 188, 0.08)" },
                    }}
                  >
                    <TableCell
                      sx={{
                        textAlign: "left",
                        fontWeight: 500,
                        color: sourceColor,
                        pl: 4,
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {sourceDot}
                      {displayDescription}
                    </TableCell>
                    <TableCell align="center" sx={{ fontSize: "0.8rem", color: sourceColor }}>
                      {row.category}
                    </TableCell>
                    <TableCell align="center" sx={{ color: sourceColor }}>
                      {formatMontantEuroFR(effectiveAgencyTableAmount(row))}
                    </TableCell>
                    <TableCell sx={{ minWidth: 160, maxWidth: 280, verticalAlign: "top" }}>
                      {row.isPlanningRow ? (
                        <Typography
                          variant="body2"
                          sx={{
                            fontSize: "0.82rem",
                            color: "#555",
                            lineHeight: 1.4,
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-word",
                            py: 0.5,
                          }}
                        >
                          {row.planningComment ? row.planningComment : "—"}
                        </Typography>
                      ) : row.category === "Prime" ? null : row.category === "Pointage" ? null : (
                        <TextField
                          size="small"
                          variant="standard"
                          fullWidth
                          multiline
                          minRows={1}
                          maxRows={6}
                          placeholder="—"
                          defaultValue={row.commentaire || ""}
                          onBlur={(e) => {
                            const val = e.target.value.trim();
                            if (val !== (row.commentaire || "")) {
                              axios
                                .patch(`/api/agency-expenses-month/${row.id}/`, { commentaire: val || null })
                                .catch(() => {});
                            }
                          }}
                          InputProps={{
                            disableUnderline: true,
                            sx: {
                              fontSize: "0.82rem", color: "#555", lineHeight: 1.4,
                              alignItems: "flex-start",
                              "&:hover": { borderBottom: "1px solid #ccc" },
                              "&.Mui-focused": { borderBottom: "1px solid #1976d2" },
                            },
                          }}
                        />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: "flex", gap: 1 }}>
                        {row.isPlanningRow ? (
                          <Typography variant="caption" sx={{ color: "#666", fontStyle: "italic", padding: "8px" }}>
                            Planning hebdo
                          </Typography>
                        ) : row.category === "Prime" ? (
                          <Typography variant="caption" sx={{ color: "#666", fontStyle: "italic", padding: "8px" }}>
                            Gérer via "Gérer les Primes"
                          </Typography>
                        ) : row.category === "Pointage" ? (
                          <Typography variant="caption" sx={{ color: "#666", fontStyle: "italic", padding: "8px" }}>
                            Gérer via Tableau de pointage
                          </Typography>
                        ) : row.category === "Ajustement Sous-traitant" ? (
                          <Typography variant="caption" sx={{ color: "#666", fontStyle: "italic", padding: "8px" }}>
                            Gérer via Tableau Sous-traitant
                          </Typography>
                        ) : (
                          <>
                            <IconButton size="small" color="primary" onClick={() => handleEditExpense(row)} disabled={loading}>
                              <FaEdit />
                            </IconButton>
                            <IconButton size="small" color="error" onClick={() => openDeleteConfirm(row)} disabled={loading}>
                              <FaTrash />
                            </IconButton>
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              }
              
              // Ligne standard (non groupée)
              return (
                <TableRow
                  key={row.id}
                  sx={{
                    backgroundColor: index % 2 === 0 ? "#ffffff" : "#f5f5f5",
                    "&:hover": { backgroundColor: "rgba(27, 120, 188, 0.1)" },
                  }}
                >
                  <TableCell
                    sx={{ textAlign: "left", fontWeight: "bold", color: "rgba(27, 120, 188, 1)" }}
                  >
                    {getExpenseDescriptionCourte(row)}
                  </TableCell>
                  <TableCell align="center">{row.category}</TableCell>
                  <TableCell align="center">
                    {formatMontantEuroFR(effectiveAgencyTableAmount(row))}
                  </TableCell>
                  <TableCell sx={{ minWidth: 160, maxWidth: 280, verticalAlign: "top" }}>
                    <TextField
                      size="small"
                      variant="standard"
                      fullWidth
                      multiline
                      minRows={1}
                      maxRows={6}
                      placeholder="—"
                      defaultValue={row.commentaire || ""}
                      onBlur={(e) => {
                        const val = e.target.value.trim();
                        if (val !== (row.commentaire || "")) {
                          axios
                            .patch(`/api/agency-expenses-month/${row.id}/`, { commentaire: val || null })
                            .catch(() => {});
                        }
                      }}
                      InputProps={{
                        disableUnderline: true,
                        sx: {
                          fontSize: "0.82rem", color: "#555", lineHeight: 1.4,
                          alignItems: "flex-start",
                          "&:hover": { borderBottom: "1px solid #ccc" },
                          "&.Mui-focused": { borderBottom: "1px solid #1976d2" },
                        },
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      {row.category === "Pointage" ? (
                        <Typography variant="caption" sx={{ color: "#666", fontStyle: "italic", padding: "8px" }}>
                          Gérer via Tableau de pointage
                        </Typography>
                      ) : (
                        <>
                          <IconButton size="small" color="primary" onClick={() => handleEditExpense(row)} disabled={loading}>
                            <FaEdit />
                          </IconButton>
                          <IconButton size="small" color="error" onClick={() => openDeleteConfirm(row)} disabled={loading}>
                            <FaTrash />
                          </IconButton>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell colSpan={2} sx={{ fontWeight: "bold" }}>
                Total Mensuel
              </TableCell>
              <TableCell
                align="center"
                sx={{ fontWeight: "bold", color: "rgba(27, 120, 188, 1)" }}
              >
                {formatMontantEuroFR(monthlyTotalDisplayed)}
              </TableCell>
              <TableCell />
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <Stack spacing={2} sx={{ mt: 2, width: "100%" }}>
        {/* Total annuel */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "rgba(27, 120, 188, 0.28)",
            background:
              "linear-gradient(180deg, rgba(27, 120, 188, 0.1) 0%, #ffffff 50%)",
          }}
        >
          <Box
            sx={{
              px: { xs: 2, sm: 2.5 },
              py: 2,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
              <Typography
                variant="overline"
                sx={{
                  letterSpacing: 1,
                  color: "text.secondary",
                  fontWeight: 600,
                  display: "block",
                }}
              >
                Total annuel
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.35 }}>
                Dépenses saisies + planning agence (hors planning et ajustements déjà remplacés par un montant chargé)
              </Typography>
              <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.5, lineHeight: 1.4 }}>
                Détail : tableau mensuel {formatMontantEuroFR(yearlyTotalTableau)} · planning{" "}
                {formatMontantEuroFR(yearlyTotalPlanning)}
                {" (planning et ajustements sous-traitant d’un agent disparaissent dès qu’un montant chargé est imputé à l’agence)"}
              </Typography>
            </Box>
            <Box
              sx={{
                display: "flex",
                alignItems: "baseline",
                gap: 1.5,
                flexWrap: "wrap",
              }}
            >
              <Typography
                variant="h4"
                component="span"
                sx={{
                  fontWeight: 800,
                  fontVariantNumeric: "tabular-nums",
                  color: "rgba(27, 120, 188, 1)",
                  lineHeight: 1.15,
                }}
              >
                {formatMontantEuroFR(yearlyTotal)}
              </Typography>
              <Box
                sx={{
                  px: 1.25,
                  py: 0.35,
                  borderRadius: 1,
                  bgcolor: "rgba(27, 120, 188, 0.14)",
                  border: "1px solid rgba(27, 120, 188, 0.3)",
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: "rgba(27, 120, 188, 1)" }}
                >
                  {selectedYear}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Coûts annuels par catégorie (12 mois + planning agence) */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "rgba(27, 120, 188, 0.2)",
            background:
              "linear-gradient(145deg, rgba(27, 120, 188, 0.06) 0%, #fff 42%, #fafbfc 100%)",
            maxWidth: 640,
          }}
        >
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            borderBottom: "1px solid rgba(27, 120, 188, 0.12)",
            background: "rgba(27, 120, 188, 0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          <Box>
            <Typography
              variant="subtitle1"
              sx={{ fontWeight: 700, color: "rgba(27, 120, 188, 1)", letterSpacing: 0.2 }}
            >
              Coût annuel par catégorie
            </Typography>
            <Typography variant="caption" sx={{ color: "text.secondary", display: "block", mt: 0.35 }}>
              Synthèse sur les 12 mois — cliquez une catégorie pour voir les désignations regroupées
            </Typography>
          </Box>
          <Box
            sx={{
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              bgcolor: "rgba(27, 120, 188, 0.12)",
              border: "1px solid rgba(27, 120, 188, 0.25)",
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: 700, color: "rgba(27, 120, 188, 1)", letterSpacing: 0.5 }}
            >
              {selectedYear}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ p: 2 }}>
          {yearlyCategoryLoading ? (
            <Typography color="text.secondary" sx={{ py: 1 }}>
              Chargement…
            </Typography>
          ) : yearlyCategoryDisplayRows.length === 0 ? (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ py: 1.5, fontStyle: "italic" }}
            >
              Aucune dépense pour cette année (toutes les catégories sont à 0 €).
            </Typography>
          ) : (
            <Stack spacing={0}>
              {yearlyCategoryDisplayRows.map(({ cat, total }, index) => (
                <Box
                  key={cat}
                  role="button"
                  tabIndex={0}
                  onClick={() => openCategoryDetail(cat, total)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      openCategoryDetail(cat, total);
                    }
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    py: 1.35,
                    px: 1.5,
                    borderRadius: 1,
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                    borderBottom:
                      index < yearlyCategoryDisplayRows.length - 1
                        ? "1px solid rgba(0, 0, 0, 0.06)"
                        : "none",
                    "&:hover": {
                      backgroundColor: "rgba(27, 120, 188, 0.1)",
                    },
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 600,
                      color: "text.primary",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      color: "rgba(27, 120, 188, 1)",
                      whiteSpace: "nowrap",
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: "rgba(27, 120, 188, 0.08)",
                    }}
                  >
                    {formatMontantEuroFR(total)}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </Box>
      </Paper>
      </Stack>

      {/* Dialog pour ajouter/modifier une dépense */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {isEditing
            ? "Modifier la dépense"
            : "Ajouter une nouvelle dépense"}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 2 }}>
            <TextField
              label="Description"
              value={
                isEditing ? editingExpense.description : newExpense.description
              }
              onChange={(e) =>
                isEditing
                  ? setEditingExpense({
                      ...editingExpense,
                      description: e.target.value,
                    })
                  : setNewExpense({
                      ...newExpense,
                      description: e.target.value,
                    })
              }
              fullWidth
            />
            <Autocomplete
              freeSolo
              selectOnFocus
              clearOnBlur
              handleHomeEndKeys
              autoHighlight
              options={formCategoryOptions}
              noOptionsText="Aucune catégorie — tapez pour en créer une"
              value={isEditing ? editingExpense?.category || "" : newExpense.category}
              onChange={(_, newValue) => setExpenseCategoryValue(newValue)}
              onInputChange={(event, newInputValue, reason) => {
                if (reason === "input" || reason === "clear") {
                  setExpenseCategoryValue(newInputValue);
                }
              }}
              filterOptions={(options, params) => {
                const filtered = filterCategoryOptions(options, params);
                const inputValue = normalizeCategoryName(params.inputValue);
                if (!inputValue) return filtered;
                const exists = options.some(
                  (option) =>
                    String(option).toLowerCase() === inputValue.toLowerCase()
                );
                if (!exists) {
                  filtered.push({
                    inputValue,
                    title: `Créer « ${inputValue} »`,
                  });
                }
                return filtered;
              }}
              getOptionLabel={(option) => {
                if (typeof option === "string") return option;
                if (option?.inputValue) return option.inputValue;
                return option?.title || "";
              }}
              isOptionEqualToValue={(option, value) => {
                const left = typeof option === "string" ? option : option?.inputValue;
                const right = typeof value === "string" ? value : value?.inputValue;
                return String(left || "").toLowerCase() === String(right || "").toLowerCase();
              }}
              renderOption={(props, option) => {
                const isCreate = typeof option !== "string";
                return (
                  <li {...props} key={isCreate ? `create-${option.inputValue}` : option}>
                    {isCreate ? option.title : option}
                  </li>
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Catégorie"
                  helperText="Choisissez une catégorie existante ou tapez-en une nouvelle"
                  placeholder="Nouvelle catégorie…"
                  inputProps={{ ...params.inputProps, maxLength: 50 }}
                />
              )}
            />
            <TextField
              label="Montant"
              type="number"
              value={isEditing ? editingExpense.amount : newExpense.amount}
              onChange={(e) =>
                isEditing
                  ? setEditingExpense({
                      ...editingExpense,
                      amount: e.target.value,
                    })
                  : setNewExpense({ ...newExpense, amount: e.target.value })
              }
              fullWidth
              inputProps={{ step: "0.01", min: "0" }}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={isRecurring}
                  onChange={(e) => setIsRecurring(e.target.checked)}
                  disabled={isEditing}
                />
              }
              label="Dépense récurrente"
            />
            <TextField
              label="Date de début"
              type="date"
              disabled={isEditing}
              value={
                isEditing
                  ? `${editingExpense.year}-${String(editingExpense.month).padStart(2, "0")}-01`
                  : recurrenceStart ||
                    `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`
              }
              onChange={(e) => setRecurrenceStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Date de fin (optionnelle)"
              type="date"
              disabled={isEditing}
              value={
                isEditing
                  ? editingExpense.recurrence_end || ""
                  : recurrenceEnd
              }
              onChange={(e) => setRecurrenceEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenDialog(false);
              setIsEditing(false);
              setEditingExpense(null);
              setIsRecurring(false);
              setRecurrenceStart("");
              setRecurrenceEnd("");
            }}
          >
            Annuler
          </Button>
          {isEditing && editingExpense?.recurrence_parent && (
            <Button
              onClick={handleCloseRecurrence}
              color="warning"
              disabled={loading}
            >
              Arrêter la récurrence à ce mois
            </Button>
          )}
          <Button onClick={handleSaveExpense} variant="contained">
            {isEditing ? "Modifier" : "Ajouter"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Détail annuel d'une catégorie, regroupé par désignation */}
      <Dialog
        open={categoryDetail.open}
        onClose={closeCategoryDetail}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ pb: 0.5 }}>
          {categoryDetail.cat
            ? `${categoryDetail.cat.charAt(0).toUpperCase()}${categoryDetail.cat.slice(1)}`
            : "Catégorie"}
          <Typography
            component="span"
            sx={{
              display: "block",
              fontSize: "0.85rem",
              color: "text.secondary",
              fontWeight: 400,
              mt: 0.5,
            }}
          >
            Désignations regroupées · {selectedYear}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              mt: 1.5,
              mb: 2,
              p: 1.5,
              borderRadius: 1,
              backgroundColor: "rgba(27, 120, 188, 0.08)",
              border: "1px solid rgba(27, 120, 188, 0.2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {categoryDetail.loading
                ? "Chargement…"
                : `${categoryDetail.groups.length} désignation${
                    categoryDetail.groups.length > 1 ? "s" : ""
                  }`}
            </Typography>
            <Typography
              sx={{
                fontWeight: 800,
                color: "rgba(27, 120, 188, 1)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {formatMontantEuroFR(categoryDetail.total)}
            </Typography>
          </Box>

          {categoryDetail.loading ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              Chargement des dépenses…
            </Typography>
          ) : categoryDetail.groups.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, fontStyle: "italic" }}>
              Aucune dépense pour cette catégorie sur {selectedYear}.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {categoryDetail.groups.map((group) => {
                const isOpen = !!expandedDesignations[group.key];
                return (
                  <Paper
                    key={group.key}
                    variant="outlined"
                    sx={{
                      overflow: "hidden",
                      borderColor: isOpen
                        ? "rgba(27, 120, 188, 0.45)"
                        : "rgba(0,0,0,0.12)",
                    }}
                  >
                    <Box
                      onClick={() =>
                        setExpandedDesignations((prev) => ({
                          ...prev,
                          [group.key]: !prev[group.key],
                        }))
                      }
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1.5,
                        px: 1.5,
                        py: 1.15,
                        cursor: "pointer",
                        backgroundColor: isOpen
                          ? "rgba(27, 120, 188, 0.08)"
                          : "transparent",
                        "&:hover": { backgroundColor: "rgba(27, 120, 188, 0.08)" },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", minWidth: 0, flex: 1 }}>
                        {isOpen ? (
                          <FaChevronDown style={{ marginRight: 8, fontSize: "0.7rem", flexShrink: 0 }} />
                        ) : (
                          <FaChevronRight style={{ marginRight: 8, fontSize: "0.7rem", flexShrink: 0 }} />
                        )}
                        <Typography
                          sx={{
                            fontWeight: 700,
                            color: "rgba(27, 120, 188, 1)",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {group.label}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatMontantEuroFR(group.total)}
                      </Typography>
                    </Box>
                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                      <Box sx={{ px: 1.5, pb: 1.25 }}>
                        {group.lines.map((line, idx) => (
                          <Box
                            key={line.id || `${group.key}-${idx}`}
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              gap: 2,
                              py: 0.7,
                              borderTop: "1px solid rgba(0,0,0,0.06)",
                            }}
                          >
                            <Box sx={{ minWidth: 0 }}>
                              <Typography sx={{ fontSize: "0.82rem", fontWeight: 600 }}>
                                {line.month
                                  ? MONTH_LABELS_FR[Number(line.month) - 1] || `Mois ${line.month}`
                                  : "—"}
                              </Typography>
                              {line.commentaire ? (
                                <Typography
                                  sx={{
                                    fontSize: "0.75rem",
                                    color: "text.secondary",
                                    whiteSpace: "pre-wrap",
                                  }}
                                >
                                  {line.commentaire}
                                </Typography>
                              ) : null}
                            </Box>
                            <Typography
                              sx={{
                                fontSize: "0.82rem",
                                fontWeight: 600,
                                fontVariantNumeric: "tabular-nums",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatMontantEuroFR(
                                expenseLineAmount(line) || Number(line.amount) || 0
                              )}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Collapse>
                  </Paper>
                );
              })}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeCategoryDetail} variant="contained">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer cette dépense pour le mois de{" "}
            {new Date(selectedYear, selectedMonth)
              .toLocaleString("default", { month: "long" })
              .charAt(0)
              .toUpperCase() +
              new Date(selectedYear, selectedMonth)
                .toLocaleString("default", { month: "long" })
                .slice(1)}{" "}
            {selectedYear} ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>Annuler</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={loading}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AgencyExpenses;
