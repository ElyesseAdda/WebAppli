import {
  Autocomplete,
  Box,
  Button,
  Checkbox,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  LinearProgress,
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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { createFilterOptions } from "@mui/material/Autocomplete";
import axios from "axios";
import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { FaChevronRight, FaChevronDown } from "react-icons/fa";
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

const MONTH_NAMES_FR = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const formatMonthLabel = (year, month) => {
  const name = MONTH_NAMES_FR[(Number(month) || 1) - 1] || "";
  if (!name || !year) return "—";
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`;
};

const formatIsoDayFR = (iso) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ""));
  if (!match) return "—";
  return `${match[3]}/${match[2]}/${match[1]}`;
};

const expenseReferenceDate = (row) => {
  const raw = row?.date_paiement_reel || row?.date_paiement;
  const day = String(raw || "").slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
  const year = Number(row?.year);
  const month = Number(row?.month);
  if (year && month) return `${year}-${String(month).padStart(2, "0")}-01`;
  return "";
};

const enumerateMonths = (startYear, startMonth, endYear, endMonth, limit = 24) => {
  let y = Number(startYear);
  let m = Number(startMonth);
  let endY = Number(endYear);
  let endM = Number(endMonth);
  if (!y || !m || !endY || !endM) return { months: [], truncated: false };
  if (y * 12 + m > endY * 12 + endM) {
    [y, endY] = [endY, y];
    [m, endM] = [endM, m];
  }
  const months = [];
  let truncated = false;
  while (y * 12 + m <= endY * 12 + endM) {
    if (months.length >= limit) {
      truncated = true;
      break;
    }
    months.push({ year: y, month: m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return { months, truncated };
};

const monthOverlapsIso = (year, month, startIso, endIso) => {
  const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
  const last = new Date(year, month, 0).getDate();
  const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return monthStart <= endIso && monthEnd >= startIso;
};

const localIsoDate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const UI = {
  brand: "rgba(27, 120, 188, 1)",
  brandSoft: "rgba(27, 120, 188, 0.08)",
  positive: "#1b7a4a",
  positiveSoft: "rgba(27, 122, 74, 0.08)",
  text: "#0f172a",
  textMuted: "#64748b",
  textFaint: "#94a3b8",
  border: "#e2e8f0",
  borderSoft: "#f1f5f9",
  surface: "#f8fafc",
  shadow: "0 1px 3px rgba(15, 23, 42, 0.06), 0 1px 2px rgba(15, 23, 42, 0.04)",
};

const SOURCE_COLORS = {
  "Planning agence": "#6a1b9a",
  Prime: "#f57c00",
  Pointage: "#2e7d32",
  "Ajustement Sous-traitant": "#1976d2",
};

const periodSelectSx = {
  minWidth: 140,
  bgcolor: "#fff",
  fontSize: "0.875rem",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: UI.border },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#cbd5e1" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: UI.brand },
};

const periodDateSx = {
  minWidth: 160,
  bgcolor: "#fff",
  "& .MuiOutlinedInput-notchedOutline": { borderColor: UI.border },
  "& .MuiInputBase-input": { fontSize: "0.875rem" },
};

const toolbarLabelSx = { color: UI.textMuted, fontSize: "0.85rem", fontWeight: 500 };

const managedSourceInfo = (row) => {
  if (row.isPlanningRow) return { label: "Planning", tooltip: "Géré via le planning hebdo" };
  if (row.category === "Prime") return { label: "Primes", tooltip: "Géré via « Gérer les Primes »" };
  if (row.category === "Pointage") return { label: "Pointage", tooltip: "Géré via le tableau de pointage" };
  if (row.category === "Ajustement Sous-traitant") {
    return { label: "Sous-traitant", tooltip: "Géré via le tableau sous-traitant" };
  }
  return null;
};

function CategoryPill({ category, isPlanning }) {
  if (!category) return null;
  const dot = SOURCE_COLORS[isPlanning ? "Planning agence" : category];
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.25,
        py: 0.35,
        borderRadius: "999px",
        bgcolor: UI.borderSoft,
        color: "#475569",
        fontSize: "0.78rem",
        fontWeight: 500,
        whiteSpace: "nowrap",
      }}
    >
      {dot ? (
        <Box
          component="span"
          sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: dot, flexShrink: 0 }}
        />
      ) : null}
      {category}
    </Box>
  );
}

function KpiCard({ label, value, hint, color, accent, info }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.25,
        borderRadius: 2,
        border: `1px solid ${UI.border}`,
        borderTop: `3px solid ${accent}`,
        boxShadow: UI.shadow,
        minWidth: 0,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <Typography
          sx={{
            fontSize: "0.72rem",
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: UI.textMuted,
          }}
        >
          {label}
        </Typography>
        {info ? (
          <Tooltip title={info} arrow placement="top">
            <InfoOutlinedIcon sx={{ fontSize: 15, color: UI.textFaint, cursor: "help" }} />
          </Tooltip>
        ) : null}
      </Box>
      <Typography
        sx={{
          mt: 0.75,
          fontSize: "1.55rem",
          fontWeight: 800,
          letterSpacing: "-0.01em",
          lineHeight: 1.15,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </Typography>
      {hint ? (
        <Typography sx={{ mt: 0.75, fontSize: "0.75rem", color: UI.textFaint, lineHeight: 1.4 }}>
          {hint}
        </Typography>
      ) : null}
    </Paper>
  );
}

const MonthMenuItems = () =>
  MONTH_NAMES_FR.map((name, index) => (
    <MenuItem key={name} value={index}>
      {name.charAt(0).toUpperCase() + name.slice(1)}
    </MenuItem>
  ));

const YearMenuItems = () => {
  const current = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, index) => {
    const year = current - 2 + index;
    return (
      <MenuItem key={year} value={year}>
        {year}
      </MenuItem>
    );
  });
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

const sortCategoriesAlpha = (items) =>
  [...(items || [])].sort((a, b) => compareAlphaFR(a, b));

const compareAlphaFR = (a, b) =>
  String(a || "").localeCompare(String(b || ""), "fr", { sensitivity: "base" });

const repeatDesignationKey = (row) => {
  const name = String(row?.description || "").trim().toLowerCase();
  const category = String(row?.category || "").trim().toLowerCase();
  const kind = row?.is_montant_positif ? "avoir" : "depense";
  return `${kind}|${category}|${name}`;
};

const AGENT_AMOUNT_CATEGORIES = new Set([
  "Pointage",
  "Prime",
  "Ajustement Sous-traitant",
  "Planning agence",
]);

const agentPeriodKey = (row) => {
  const isPlanning = Boolean(row?.isPlanningRow || row?.category === "Planning agence");
  if (!isPlanning && !AGENT_AMOUNT_CATEGORIES.has(row?.category)) return null;
  const id = isPlanning ? (row.agent_id ?? row.agent) : row.agent;
  if (id != null && id !== "") return `agent-${id}`;
  const name = agentPeriodLabel(row).trim().toLowerCase();
  return name && name !== "agent" ? `name-${name}` : null;
};

const agentPeriodLabel = (row) => {
  if (row?.agent_name) return String(row.agent_name).trim();
  if (row?.isPlanningRow || row?.category === "Planning agence") {
    return String(row.description || "").split("—")[0].trim() || "Agent";
  }
  return expenseDesignationLabel(row);
};

const rowsToBlocks = (rows) => {
  const blocks = [];
  let index = 0;
  while (index < rows.length) {
    const row = rows[index];
    if (row.isGroupHeader) {
      const grouped = [row];
      index += 1;
      while (
        index < rows.length &&
        rows[index].isSubRow &&
        rows[index].agentKey === row.agentKey
      ) {
        grouped.push(rows[index]);
        index += 1;
      }
      blocks.push({ sortKey: row.description, rows: grouped });
    } else {
      blocks.push({ sortKey: row.description, rows: [row] });
      index += 1;
    }
  }
  return blocks;
};

const groupPeriodTableRows = (sortedRows) => {
  const others = [];
  const buckets = new Map();
  const order = [];
  (sortedRows || []).forEach((row) => {
    const key = agentPeriodKey(row);
    if (!key) {
      others.push(row);
      return;
    }
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key).push(row);
  });

  const blocks = rowsToBlocks(groupRepeatingDesignations(others));
  order.forEach((key) => {
    const group = [...buckets.get(key)].sort((a, b) => {
      const yearDiff = (Number(a.year) || 0) - (Number(b.year) || 0);
      if (yearDiff !== 0) return yearDiff;
      const monthDiff = (Number(a.month) || 0) - (Number(b.month) || 0);
      if (monthDiff !== 0) return monthDiff;
      return compareAlphaFR(a.description, b.description);
    });
    const months = new Set(group.map((row) => `${row.year}-${Number(row.month) || 0}`));
    const label =
      group.map(agentPeriodLabel).find((name) => name && name !== "Agent") || "Agent";
    if (group.length < 2) {
      group.forEach((row) => blocks.push({ sortKey: label, rows: [row] }));
      return;
    }
    const categories = [
      ...new Set(group.map((row) => (row.isPlanningRow ? "Planning agence" : row.category))),
    ];
    const singleCategory = categories.length === 1 ? categories[0] : "";
    const agentKey = `agent-months-${key}`;
    blocks.push({
      sortKey: label,
      rows: [
        {
          id: agentKey,
          description: label,
          category: singleCategory,
          amount: group.reduce((sum, row) => sum + effectiveAgencyTableAmount(row), 0),
          is_montant_positif: false,
          isPlanningRow: singleCategory === "Planning agence",
          isGroupHeader: true,
          isRepeatGroup: Boolean(singleCategory),
          isAgentMonthGroup: true,
          agentKey,
          subRowCount: group.length,
          monthCount: months.size,
          periodLabel:
            months.size === 1
              ? group[0].periodLabel || formatMonthLabel(group[0].year, group[0].month)
              : "",
        },
        ...group.map((row) => ({
          ...row,
          isSubRow: true,
          isRepeatChild: true,
          agentKey,
        })),
      ],
    });
  });

  blocks.sort((a, b) => compareAlphaFR(a.sortKey, b.sortKey));
  return blocks.flatMap((block) => block.rows);
};

const groupRepeatingDesignations = (rows) => {
  const buckets = new Map();
  const order = [];
  (rows || []).forEach((row) => {
    const key = repeatDesignationKey(row);
    if (!buckets.has(key)) {
      buckets.set(key, []);
      order.push(key);
    }
    buckets.get(key).push(row);
  });
  const result = [];
  order.forEach((key) => {
    const group = buckets.get(key);
    if (group.length < 2) {
      result.push(group[0]);
      return;
    }
    const positive = Boolean(group[0].is_montant_positif);
    result.push({
      id: `repeat-${key}`,
      description: group[0].description,
      category: group[0].category,
      amount: group.reduce((sum, row) => sum + effectiveAgencyTableAmount(row), 0),
      is_montant_positif: positive,
      isPlanningRow: false,
      isGroupHeader: true,
      isRepeatGroup: true,
      agentKey: `repeat-${key}`,
      subRowCount: group.length,
    });
    group.forEach((row) => {
      result.push({
        ...row,
        isSubRow: true,
        isRepeatChild: true,
        agentKey: `repeat-${key}`,
      });
    });
  });
  return result;
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

const formatDetailAmount = (value, asPositive) => {
  const amount = Math.abs(Number(value) || 0);
  if (!amount) return formatMontantEuroFR(0);
  if (asPositive) return `+ ${formatMontantEuroFR(amount)}`;
  return `− ${formatMontantEuroFR(amount)}`;
};

const groupExpensesByDesignation = (expenses) => {
  const map = {};
  (expenses || []).forEach((e) => {
    if (!e) return;
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
        expenseTotal: 0,
        positiveTotal: 0,
      };
    }
    map[key].lines.push(e);
    const amount = Math.abs(expenseLineAmount(e));
    if (e.is_montant_positif) map[key].positiveTotal += amount;
    else map[key].expenseTotal += amount;
  });
  Object.values(map).forEach((group) => {
    const byMonth = {};
    group.lines.forEach((line) => {
      const monthNum = Number(line.month) || 0;
      const positive = Boolean(line.is_montant_positif);
      const bucketKey = `${monthNum}-${positive ? "p" : "d"}`;
      if (!byMonth[bucketKey]) {
        byMonth[bucketKey] = {
          ...line,
          description: group.label,
          amount: 0,
          montant_paye: 0,
          is_montant_positif: positive,
        };
      }
      byMonth[bucketKey].amount += Math.abs(expenseLineAmount(line));
      if (line.commentaire && !byMonth[bucketKey].commentaire) {
        byMonth[bucketKey].commentaire = line.commentaire;
      }
    });
    group.lines = Object.values(byMonth).sort((a, b) => {
      const monthDiff = Number(a.month || 0) - Number(b.month || 0);
      if (monthDiff !== 0) return monthDiff;
      return a.is_montant_positif === b.is_montant_positif
        ? 0
        : a.is_montant_positif
          ? 1
          : -1;
    });
    group.total = group.expenseTotal - group.positiveTotal;
  });
  return Object.values(map).sort(
    (a, b) => compareAlphaFR(a.label, b.label)
  );
};

const detailAmountView = (expenseTotal, positiveTotal) => {
  const expenses = Number(expenseTotal) || 0;
  const positives = Number(positiveTotal) || 0;
  const signed = positives - expenses;
  if (signed > 0) return { text: formatDetailAmount(signed, true), positive: true };
  if (signed < 0) return { text: formatDetailAmount(signed, false), positive: false };
  return { text: formatMontantEuroFR(0), positive: false };
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

const COST_ACCENT = {
  main: "rgba(27, 120, 188, 1)",
  soft: "rgba(27, 120, 188, 0.08)",
  softStrong: "rgba(27, 120, 188, 0.12)",
  border: "rgba(27, 120, 188, 0.2)",
  borderHeader: "rgba(27, 120, 188, 0.12)",
  badgeBorder: "rgba(27, 120, 188, 0.25)",
  hover: "rgba(27, 120, 188, 0.1)",
  amountBg: "rgba(27, 120, 188, 0.08)",
  gradient:
    "linear-gradient(145deg, rgba(27, 120, 188, 0.06) 0%, #fff 42%, #fafbfc 100%)",
};

const POSITIVE_ACCENT = {
  main: "#1b7a4a",
  soft: "rgba(27, 122, 74, 0.08)",
  softStrong: "rgba(27, 122, 74, 0.12)",
  border: "rgba(27, 122, 74, 0.28)",
  borderHeader: "rgba(27, 122, 74, 0.16)",
  badgeBorder: "rgba(27, 122, 74, 0.3)",
  hover: "rgba(27, 122, 74, 0.1)",
  amountBg: "rgba(27, 122, 74, 0.1)",
  gradient:
    "linear-gradient(145deg, rgba(27, 122, 74, 0.08) 0%, #fff 42%, #fafbfc 100%)",
};

function CategoryYearCard({
  title,
  subtitle,
  year,
  totalCaption,
  loading,
  rows,
  emptyText,
  accent,
  onOpen,
  showTotal,
}) {
  const total = (rows || []).reduce((sum, row) => sum + (Number(row.total) || 0), 0);
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2,
        overflow: "hidden",
        border: `1px solid ${UI.border}`,
        boxShadow: UI.shadow,
        bgcolor: "#fff",
        minWidth: 0,
      }}
    >
      <Box
        sx={{
          px: 2.5,
          py: 2,
          borderBottom: `1px solid ${UI.borderSoft}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", gap: 1.5, minWidth: 0 }}>
          <Box
            sx={{ width: 4, alignSelf: "stretch", borderRadius: 1, bgcolor: accent.main, flexShrink: 0 }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700, color: UI.text, fontSize: "0.98rem" }}>
              {title}
            </Typography>
            <Typography sx={{ color: UI.textMuted, fontSize: "0.78rem", mt: 0.25 }}>
              {subtitle}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ textAlign: "right", flexShrink: 0 }}>
          <Typography
            sx={{
              fontWeight: 800,
              fontSize: "1.15rem",
              color: accent.main,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.2,
            }}
          >
            {showTotal && !loading ? formatMontantEuroFR(total) : "—"}
          </Typography>
          <Typography sx={{ color: UI.textFaint, fontSize: "0.72rem", mt: 0.25 }}>
            {totalCaption || `Total ${year}`}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ py: 1 }}>
        {loading ? (
          <Box sx={{ px: 2.5, py: 2 }}>
            <LinearProgress sx={{ borderRadius: 1 }} />
          </Box>
        ) : !rows?.length ? (
          <Typography sx={{ px: 2.5, py: 2.5, color: UI.textFaint, fontSize: "0.85rem" }}>
            {emptyText}
          </Typography>
        ) : (
          <Stack spacing={0}>
            {rows.map(({ cat, total: rowTotal }) => {
              const share = total > 0 ? Math.min(100, (rowTotal / total) * 100) : 0;
              return (
                <Box
                  key={cat}
                  role="button"
                  tabIndex={0}
                  onClick={() => onOpen(cat, rowTotal)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onOpen(cat, rowTotal);
                    }
                  }}
                  sx={{
                    px: 2.5,
                    py: 1.1,
                    cursor: "pointer",
                    transition: "background-color 0.15s ease",
                    "&:hover": { backgroundColor: UI.surface },
                    "&:hover .category-chevron": { color: accent.main },
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontWeight: 500,
                        color: UI.text,
                        fontSize: "0.875rem",
                        flex: 1,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </Typography>
                    <Typography
                      sx={{ color: UI.textFaint, fontSize: "0.75rem", fontVariantNumeric: "tabular-nums" }}
                    >
                      {share.toFixed(0)} %
                    </Typography>
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.875rem",
                        fontVariantNumeric: "tabular-nums",
                        color: UI.text,
                        whiteSpace: "nowrap",
                        minWidth: 110,
                        textAlign: "right",
                      }}
                    >
                      {formatMontantEuroFR(rowTotal)}
                    </Typography>
                    <ChevronRightRoundedIcon
                      className="category-chevron"
                      sx={{ fontSize: 18, color: "#cbd5e1", transition: "color 0.15s ease" }}
                    />
                  </Box>
                  <Box sx={{ mt: 0.75, mr: 3.5, height: 4, borderRadius: 2, bgcolor: UI.borderSoft }}>
                    <Box
                      sx={{
                        width: `${share}%`,
                        height: "100%",
                        borderRadius: 2,
                        bgcolor: accent.main,
                        opacity: 0.7,
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
      </Box>
    </Paper>
  );
}

const AgencyExpenses = () => {
  const { agenceId } = useParams();
  const [expenses, setExpenses] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [periodMode, setPeriodMode] = useState("mois");
  const [rangeStartMonth, setRangeStartMonth] = useState(0);
  const [rangeStartYear, setRangeStartYear] = useState(new Date().getFullYear());
  const [rangeEndMonth, setRangeEndMonth] = useState(new Date().getMonth());
  const [rangeEndYear, setRangeEndYear] = useState(new Date().getFullYear());
  const [rangeStartDate, setRangeStartDate] = useState(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`
  );
  const [rangeEndDate, setRangeEndDate] = useState(localIsoDate(new Date()));
  const [periodSchedules, setPeriodSchedules] = useState([]);
  const [periodTruncated, setPeriodTruncated] = useState(false);
  const [tableReload, setTableReload] = useState(0);
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
  const [yearlyPositiveTotals, setYearlyPositiveTotals] = useState({});
  const [yearlyCategoryLoading, setYearlyCategoryLoading] = useState(false);
  const [entryKind, setEntryKind] = useState("depense");
  const [planningAgence, setPlanningAgence] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceStart, setRecurrenceStart] = useState("");
  const [recurrenceEnd, setRecurrenceEnd] = useState("");
  const [agenceName, setAgenceName] = useState("");
  const [agenceChantierId, setAgenceChantierId] = useState(null);
  const [agenceResolved, setAgenceResolved] = useState(!agenceId);
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
    positive: false,
  });
  const [expandedDesignations, setExpandedDesignations] = useState({});
  const [yearlySchedMonths, setYearlySchedMonths] = useState([]);
  const [yearlyPointageList, setYearlyPointageList] = useState([]);

  const agenceParam = agenceId ? `&agence_id=${agenceId}` : "";
  const scheduleParam = agenceChantierId
    ? `&agence=1&chantier_id=${agenceChantierId}`
    : "&agence=1";
  const scheduleReady = !agenceId || agenceResolved;

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
    const fromYear = Object.entries({ ...yearlyCategoryTotals, ...yearlyPositiveTotals })
      .filter(([, total]) => Number(total) > 0)
      .map(([cat]) => cat);
    const fromMonth = (originalExpenses || []).map((e) => e.category);
    return uniquePreserveOrder([...fromYear, ...fromMonth]);
  }, [yearlyCategoryTotals, yearlyPositiveTotals, originalExpenses]);

  const formCategoryOptions = useMemo(() => {
    const current = isEditing ? editingExpense?.category : newExpense.category;
    return sortCategoriesAlpha(
      uniquePreserveOrder([
        ...customCategories,
        ...usedCategories,
        current,
      ]).filter(
        (c) => !SYSTEM_CATEGORIES.some((s) => s.toLowerCase() === c.toLowerCase())
      )
    );
  }, [customCategories, usedCategories, isEditing, editingExpense?.category, newExpense.category]);

  const filterCategoryList = useMemo(() => {
    return sortCategoriesAlpha(
      uniquePreserveOrder([...usedCategories, ...customCategories])
    );
  }, [usedCategories, customCategories]);

  const categoriesWithPlanning = useMemo(
    () => uniquePreserveOrder([...usedCategories, ...SYSTEM_CATEGORIES, ...customCategories]),
    [usedCategories, customCategories]
  );

  useEffect(() => {
    if (!agenceId) {
      setAgenceChantierId(null);
      setAgenceResolved(true);
      return;
    }
    let cancelled = false;
    setAgenceResolved(false);
    axios.get(`/api/agences/${agenceId}/`).then((res) => {
      if (cancelled) return;
      setAgenceName(res.data.nom || "");
      setAgenceChantierId(res.data.chantier || null);
    }).catch(() => {
      if (!cancelled) {
        setAgenceName("");
        setAgenceChantierId(null);
      }
    }).finally(() => {
      if (!cancelled) setAgenceResolved(true);
    });
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

  // Tableau : un mois, une plage de mois, ou une plage de jours.
  useEffect(() => {
    let cancelled = false;
    const loadTable = async () => {
      setLoading(true);
      try {
        let months = [];
        let truncated = false;
        let dayStart = rangeStartDate;
        let dayEnd = rangeEndDate;
        if (periodMode === "mois") {
          months = [{ year: selectedYear, month: selectedMonth + 1 }];
        } else if (periodMode === "jour") {
          if (dayStart > dayEnd) [dayStart, dayEnd] = [dayEnd, dayStart];
          const enumerated = enumerateMonths(
            Number(dayStart.slice(0, 4)),
            Number(dayStart.slice(5, 7)),
            Number(dayEnd.slice(0, 4)),
            Number(dayEnd.slice(5, 7))
          );
          months = enumerated.months;
          truncated = enumerated.truncated;
        } else {
          const enumerated = enumerateMonths(
            rangeStartYear,
            rangeStartMonth + 1,
            rangeEndYear,
            rangeEndMonth + 1
          );
          months = enumerated.months;
          truncated = enumerated.truncated;
        }
        if (cancelled) return;
        setPeriodTruncated(truncated);

        const responses = await Promise.all(
          months.map(({ year, month }) =>
            axios
              .get(
                `/api/agency-expenses-month/monthly_summary/?month=${month}&year=${year}${agenceParam}`
              )
              .then((r) =>
                (r.data?.expenses || []).map((expense) => {
                  const stamped = {
                    ...expense,
                    year: expense.year || year,
                    month: expense.month || month,
                  };
                  return {
                    ...stamped,
                    periodLabel:
                      periodMode === "jour"
                        ? formatIsoDayFR(expenseReferenceDate(stamped))
                        : formatMonthLabel(stamped.year, stamped.month),
                  };
                })
              )
              .catch(() => [])
          )
        );
        let fetched = responses.flat();
        if (periodMode === "jour") {
          fetched = fetched.filter((expense) => {
            const iso = expenseReferenceDate(expense);
            return iso && iso >= dayStart && iso <= dayEnd;
          });
        }

        let schedules = [];
        if (periodMode !== "mois" && months.length) {
          const years = [...new Set(months.map((item) => item.year))];
          const yearPayloads = await Promise.all(
            years.map(async (year) => {
              try {
                const res = await axios.get(
                  `/api/schedule/yearly_summary/?year=${year}${scheduleParam}`
                );
                return { year, months: res.data?.months || [] };
              } catch {
                return { year, months: [] };
              }
            })
          );
          const wanted = new Set(months.map((item) => `${item.year}-${item.month}`));
          yearPayloads.forEach(({ year, months: scheduleMonths }) => {
            scheduleMonths.forEach((scheduleMonth, index) => {
              const monthNum = Number(scheduleMonth.month) || index + 1;
              if (!wanted.has(`${year}-${monthNum}`)) return;
              if (
                periodMode === "jour" &&
                !monthOverlapsIso(year, monthNum, dayStart, dayEnd)
              ) {
                return;
              }
              schedules.push({
                year,
                month: monthNum,
                details: scheduleMonth.details || [],
              });
            });
          });
        }

        if (cancelled) return;
        setOriginalExpenses(fetched);
        setExpenses(fetched);
        setPeriodSchedules(schedules);
      } catch (error) {
        console.error("Erreur lors du chargement des dépenses:", error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadTable();
    return () => {
      cancelled = true;
    };
  }, [
    periodMode,
    selectedMonth,
    selectedYear,
    rangeStartMonth,
    rangeStartYear,
    rangeEndMonth,
    rangeEndYear,
    rangeStartDate,
    rangeEndDate,
    agenceId,
    agenceParam,
    scheduleParam,
    tableReload,
  ]);

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
        const positiveMerged = {};
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
          (em.positive_totals_by_category || []).forEach(({ category, total }) => {
            const c = category || "Autres";
            positiveMerged[c] = (positiveMerged[c] || 0) + (Number(total) || 0);
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
        setYearlyPositiveTotals(positiveMerged);
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
          setYearlyPositiveTotals({});
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

  const reloadTable = () => setTableReload((n) => n + 1);

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
        is_montant_positif: entryKind === "positif",
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
      reloadTable();
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
      reloadTable();
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
        reloadTable();
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
      reloadTable();
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

  const expensesForTable = useMemo(() => {
    const scopedToAgence = Boolean(agenceId);
    const agenceChantierById = buildAgenceChantierMap(agencesList);
    if (periodMode !== "mois") {
      const coverage = buildPointageCoverageKeys(
        originalExpenses,
        scopedToAgence,
        agenceChantierById
      );
      return expenses.filter((e) => {
        if (!isAjustementSousTraitant(e)) return true;
        const key = yearlyPointageCoverageKey(
          e.month,
          e.agent,
          chantierIdForExpense(e, scopedToAgence, agenceChantierById),
          scopedToAgence
        );
        return !coverage.has(key);
      });
    }
    return expenses.filter((e) => {
      if (!isAjustementSousTraitant(e)) return true;
      const key = pointageCoverageKey(
        e.agent,
        chantierIdForExpense(e, scopedToAgence, agenceChantierById),
        scopedToAgence
      );
      return !monthlyPointageCoverage.has(key);
    });
  }, [expenses, monthlyPointageCoverage, agenceId, agencesList, periodMode, originalExpenses]);

  const planningRowsVirtual = useMemo(() => {
    const scopedToAgence = Boolean(agenceId);
    if (periodMode !== "mois") {
      const agenceChantierById = buildAgenceChantierMap(agencesList);
      const coverage = buildPointageCoverageKeys(
        originalExpenses,
        scopedToAgence,
        agenceChantierById
      );
      const rows = [];
      periodSchedules.forEach((scheduleMonth) => {
        (scheduleMonth.details || []).forEach((row, idx) => {
          const key = yearlyPointageCoverageKey(
            scheduleMonth.month,
            row.agent_id,
            row.chantier_id,
            scopedToAgence
          );
          if (coverage.has(key)) return;
          const cmt = (row.comment || "").trim();
          const suffix = planningCommentKey(cmt);
          const chantierLabel = row.chantier_nom ? `${row.chantier_nom} — ` : "";
          const heuresLabel = formatHeuresCommeResume(
            sumHeuresPlanningAgent(row),
            row.type_paiement
          );
          rows.push({
            id: `planning-agence-${scheduleMonth.year}-${scheduleMonth.month}-${row.agent_id}-${suffix}-${idx}`,
            agent_id: row.agent_id,
            agent_name: row.agent_nom,
            chantier_id: row.chantier_id,
            description: `${row.agent_nom} — ${chantierLabel}${heuresLabel}`,
            planningComment: cmt,
            category: "Planning agence",
            amount: sumMontantPlanningAgent(row),
            isPlanningRow: true,
            year: scheduleMonth.year,
            month: scheduleMonth.month,
            periodLabel: formatMonthLabel(scheduleMonth.year, scheduleMonth.month),
          });
        });
      });
      return rows;
    }
    if (!planningAgence?.details?.length) return [];
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
          agent_name: row.agent_nom,
          chantier_id: row.chantier_id,
          description: `${row.agent_nom} — ${chantierLabel}${heuresLabel}`,
          planningComment: cmt,
          category: "Planning agence",
          amount: sumMontantPlanningAgent(row),
          isPlanningRow: true,
          year: selectedYear,
          month: selectedMonth + 1,
          periodLabel: formatMonthLabel(selectedYear, selectedMonth + 1),
        };
      });
  }, [periodMode, periodSchedules, originalExpenses, planningAgence, monthlyPointageCoverage, agenceId, agencesList, selectedYear, selectedMonth]);

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

  const tableRowsCombined = useMemo(() => {
    const allRows = [...expensesForTable, ...planningRowsFiltered];
    if (periodMode !== "mois") {
      const sorted = [...allRows].sort((a, b) => {
        const nameDiff = compareAlphaFR(a.description, b.description);
        if (nameDiff !== 0) return nameDiff;
        const yearDiff = (Number(a.year) || 0) - (Number(b.year) || 0);
        if (yearDiff !== 0) return yearDiff;
        return (Number(a.month) || 0) - (Number(b.month) || 0);
      });
      return groupPeriodTableRows(sorted);
    }
 
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
    
    const blocks = standaloneRows.map((row) => ({
      sortKey: row.description,
      rows: [row],
    }));

    Object.entries(agentGroups).forEach(([key, group]) => {
      if (group.rows.length < 2) {
        group.rows.forEach((row) => blocks.push({ sortKey: group.label, rows: [row] }));
        return;
      }
      const totalAmount = group.rows.reduce((sum, r) => sum + effectiveAgencyTableAmount(r), 0);
      const subRows = [...group.rows]
        .sort((a, b) => compareAlphaFR(a.description, b.description))
        .map((row) => ({
          ...row,
          isSubRow: true,
          agentKey: key,
        }));
      blocks.push({
        sortKey: group.label,
        rows: [
          {
            id: `group-header-${key}`,
            description: group.label,
            category: "",
            amount: totalAmount,
            isGroupHeader: true,
            agentKey: key,
            subRowCount: group.rows.length,
          },
          ...subRows,
        ],
      });
    });

    blocks.sort((a, b) => compareAlphaFR(a.sortKey, b.sortKey));
    return blocks.flatMap((block) => block.rows);
  }, [expensesForTable, planningRowsFiltered, periodMode]);

  const buildYearlyCategoryRows = (totals) =>
    Object.keys(totals || {})
      .filter((cat) => (Number(totals[cat]) || 0) > 0)
      .sort((a, b) => compareAlphaFR(a, b))
      .map((cat) => ({ cat, total: Number(totals[cat]) || 0 }));

  /** Catégories de la période affichée (même périmètre que le tableau, hors filtres texte). */
  const periodRowsForCategories = useMemo(() => {
    const scopedToAgence = Boolean(agenceId);
    const agenceChantierById = buildAgenceChantierMap(agencesList);
    if (periodMode !== "mois") {
      const coverage = buildPointageCoverageKeys(
        originalExpenses,
        scopedToAgence,
        agenceChantierById
      );
      return originalExpenses.filter((e) => {
        if (!isAjustementSousTraitant(e)) return true;
        const key = yearlyPointageCoverageKey(
          e.month,
          e.agent,
          chantierIdForExpense(e, scopedToAgence, agenceChantierById),
          scopedToAgence
        );
        return !coverage.has(key);
      });
    }
    return originalExpenses.filter((e) => {
      if (!isAjustementSousTraitant(e)) return true;
      const key = pointageCoverageKey(
        e.agent,
        chantierIdForExpense(e, scopedToAgence, agenceChantierById),
        scopedToAgence
      );
      return !monthlyPointageCoverage.has(key);
    });
  }, [originalExpenses, monthlyPointageCoverage, agenceId, agencesList, periodMode]);

  const periodCategoryTotals = useMemo(() => {
    const costs = {};
    const positives = {};
    periodRowsForCategories.forEach((row) => {
      const cat = row.category || "Autres";
      const amount = Math.abs(effectiveAgencyTableAmount(row));
      if (!amount) return;
      if (row.is_montant_positif) positives[cat] = (positives[cat] || 0) + amount;
      else costs[cat] = (costs[cat] || 0) + amount;
    });
    planningRowsVirtual.forEach((row) => {
      const amount = Math.abs(Number(row.amount) || 0);
      if (!amount) return;
      const cat = row.category || "Planning agence";
      costs[cat] = (costs[cat] || 0) + amount;
    });
    return { costs, positives };
  }, [periodRowsForCategories, planningRowsVirtual]);

  const periodCategoryDisplayRows = useMemo(
    () => buildYearlyCategoryRows(periodCategoryTotals.costs),
    [periodCategoryTotals, categoriesWithPlanning]
  );

  const periodPositiveDisplayRows = useMemo(
    () => buildYearlyCategoryRows(periodCategoryTotals.positives),
    [periodCategoryTotals, categoriesWithPlanning]
  );

  /** Total mensuel : une seule fois chaque ligne réelle (pas les en-têtes de groupe qui dupliquent la somme). */
  const monthlyTotalDisplayed = useMemo(() => {
    return tableRowsCombined.reduce((total, row) => {
      if (row.isGroupHeader || row.is_montant_positif) return total;
      return total + effectiveAgencyTableAmount(row);
    }, 0);
  }, [tableRowsCombined]);

  const monthlyPositiveTotal = useMemo(() => {
    return tableRowsCombined.reduce((total, row) => {
      if (row.isGroupHeader || !row.is_montant_positif) return total;
      return total + effectiveAgencyTableAmount(row);
    }, 0);
  }, [tableRowsCombined]);

  const monthlyNetTotal = monthlyPositiveTotal - monthlyTotalDisplayed;

  const yearlyPositiveSum = useMemo(
    () =>
      Object.values(yearlyPositiveTotals).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0
      ),
    [yearlyPositiveTotals]
  );

  const yearlySignedTotal = yearlyPositiveSum - yearlyTotal;


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

  const openCategoryDetail = (cat, total, positive = false) => {
    const categoryName = cat || "";
    setExpandedDesignations({});
    const source =
      categoryName === "Planning agence"
        ? planningRowsVirtual
        : periodRowsForCategories.filter((row) => {
            if ((row.category || "") !== categoryName) return false;
            if (positive) return Boolean(row.is_montant_positif);
            return true;
          });
    const groups = groupExpensesByDesignation(source);
    setCategoryDetail({
      open: true,
      cat: categoryName,
      total: Number(total) || groups.reduce((acc, group) => acc + group.total, 0),
      loading: false,
      groups,
      positive,
    });
  };

  const isPositiveEntry = isEditing
    ? Boolean(editingExpense?.is_montant_positif)
    : entryKind === "positif";

  const isDefaultMode = periodMode === "mois";

  const periodLabel = isDefaultMode
    ? formatMonthLabel(selectedYear, selectedMonth + 1)
    : periodMode === "mois-range"
      ? `${formatMonthLabel(rangeStartYear, rangeStartMonth + 1)} au ${formatMonthLabel(
          rangeEndYear,
          rangeEndMonth + 1
        )}`
      : `${formatIsoDayFR(rangeStartDate)} au ${formatIsoDayFR(rangeEndDate)}`;

  const visibleRowCount = tableRowsCombined.filter((row) => !row.isSubRow).length;

  const openEntryDialog = (kind) => {
    setIsEditing(false);
    setEditingExpense(null);
    setEntryKind(kind);
    setOpenDialog(true);
  };

  const renderCommentCell = (row) => {
    if (row.isPlanningRow) {
      return (
        <Typography
          sx={{
            fontSize: "0.82rem",
            color: UI.textMuted,
            lineHeight: 1.4,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {row.planningComment || "—"}
        </Typography>
      );
    }
    if (row.category === "Prime" || row.category === "Pointage") {
      return <Typography sx={{ fontSize: "0.82rem", color: "#cbd5e1" }}>—</Typography>;
    }
    return (
      <TextField
        size="small"
        variant="standard"
        fullWidth
        multiline
        minRows={1}
        maxRows={6}
        placeholder="Ajouter un commentaire…"
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
            fontSize: "0.82rem",
            color: "#475569",
            lineHeight: 1.4,
            alignItems: "flex-start",
            px: 1,
            py: 0.5,
            borderRadius: 1,
            border: "1px solid transparent",
            transition: "border-color 0.15s ease, background-color 0.15s ease",
            "& textarea::placeholder": { color: "#cbd5e1", opacity: 1 },
            "&:hover": { borderColor: UI.border, bgcolor: "#fff" },
            "&.Mui-focused": { borderColor: UI.brand, bgcolor: "#fff" },
          },
        }}
      />
    );
  };

  const renderRowActions = (row) => {
    const managed = managedSourceInfo(row);
    if (managed) {
      return (
        <Tooltip title={managed.tooltip} arrow>
          <Chip
            size="small"
            variant="outlined"
            icon={<LockOutlinedIcon sx={{ fontSize: "14px !important" }} />}
            label={managed.label}
            sx={{
              height: 24,
              fontSize: "0.72rem",
              color: UI.textMuted,
              borderColor: UI.border,
              bgcolor: "#fff",
              "& .MuiChip-icon": { color: UI.textFaint },
            }}
          />
        </Tooltip>
      );
    }
    return (
      <Box sx={{ display: "flex", justifyContent: "center", gap: 0.5 }}>
        <Tooltip title="Modifier" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => handleEditExpense(row)}
              disabled={loading}
              sx={{ color: UI.textMuted, "&:hover": { color: UI.brand, bgcolor: UI.brandSoft } }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Supprimer" arrow>
          <span>
            <IconButton
              size="small"
              onClick={() => openDeleteConfirm(row)}
              disabled={loading}
              sx={{
                color: UI.textMuted,
                "&:hover": { color: "#b91c1c", bgcolor: "rgba(185, 28, 28, 0.08)" },
              }}
            >
              <DeleteOutlineRoundedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    );
  };

  const columnCount = isDefaultMode ? 5 : 6;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1600, mx: "auto" }}>
      {/* En-tête */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: { xs: "flex-start", md: "flex-end" },
          flexDirection: { xs: "column", md: "row" },
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography
            sx={{
              color: "rgba(255,255,255,0.75)",
              fontSize: "0.75rem",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Agence · Suivi mensuel
          </Typography>
          <Typography
            variant="h5"
            sx={{ color: "#fff", fontWeight: 700, mt: 0.5, letterSpacing: "-0.01em" }}
          >
            {agenceName ? `Dépenses — ${agenceName}` : "Dépenses de l'agence"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            startIcon={<AddRoundedIcon />}
            onClick={() => openEntryDialog("positif")}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              color: "#fff",
              borderColor: "rgba(255,255,255,0.6)",
              "&:hover": { borderColor: "#fff", bgcolor: "rgba(255,255,255,0.1)" },
            }}
          >
            Ajouter un avoir
          </Button>
          <Button
            variant="contained"
            disableElevation
            startIcon={<AddRoundedIcon />}
            onClick={() => openEntryDialog("depense")}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              bgcolor: "#fff",
              color: UI.brand,
              "&:hover": { bgcolor: "#f1f5f9" },
            }}
          >
            Ajouter une dépense
          </Button>
        </Box>
      </Box>

      {/* Indicateurs clés */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
          gap: 2,
          mb: 3,
        }}
      >
        <KpiCard
          label="Dépenses"
          value={`− ${formatMontantEuroFR(monthlyTotalDisplayed)}`}
          hint={periodLabel}
          color={UI.text}
          accent={UI.brand}
        />
        <KpiCard
          label="Avoirs"
          value={`+ ${formatMontantEuroFR(monthlyPositiveTotal)}`}
          hint={periodLabel}
          color={UI.positive}
          accent={UI.positive}
        />
        <KpiCard
          label={isDefaultMode ? "Solde du mois" : "Solde de la période"}
          value={
            monthlyNetTotal > 0
              ? `+ ${formatMontantEuroFR(monthlyNetTotal)}`
              : formatMontantEuroFR(monthlyNetTotal)
          }
          hint="Avoirs moins dépenses"
          color={monthlyNetTotal > 0 ? UI.positive : UI.brand}
          accent={monthlyNetTotal > 0 ? UI.positive : UI.brand}
        />
        <KpiCard
          label={`Solde annuel ${selectedYear}`}
          value={
            yearlyCategoryLoading
              ? "…"
              : formatDetailAmount(yearlySignedTotal, yearlySignedTotal > 0)
          }
          hint={`Dépenses ${formatDetailAmount(yearlyTotalTableau, false)} · Planning ${formatDetailAmount(
            yearlyTotalPlanning,
            false
          )} · Avoirs ${formatDetailAmount(yearlyPositiveSum, true)}`}
          info="Le planning et les ajustements sous-traitant d’un agent disparaissent dès qu’un montant chargé est imputé à l’agence."
          color={yearlySignedTotal > 0 ? UI.positive : UI.text}
          accent="#0f172a"
        />
      </Box>

      {/* Tableau des dépenses */}
      <Paper
        elevation={0}
        sx={{
          borderRadius: 2,
          border: `1px solid ${UI.border}`,
          boxShadow: UI.shadow,
          overflow: "hidden",
          mb: 3,
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            borderBottom: `1px solid ${UI.borderSoft}`,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={periodMode}
              onChange={(_, value) => {
                if (value) setPeriodMode(value);
              }}
              sx={{
                bgcolor: UI.surface,
                p: 0.4,
                borderRadius: 1.5,
                border: `1px solid ${UI.border}`,
                "& .MuiToggleButton-root": {
                  border: 0,
                  borderRadius: "6px !important",
                  color: UI.textMuted,
                  textTransform: "none",
                  fontWeight: 500,
                  fontSize: "0.82rem",
                  px: 1.5,
                  py: 0.5,
                },
                "& .Mui-selected": {
                  bgcolor: "#fff !important",
                  color: `${UI.brand} !important`,
                  fontWeight: 600,
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.1)",
                },
              }}
            >
              <ToggleButton value="mois">Un mois</ToggleButton>
              <ToggleButton value="mois-range">De mois à mois</ToggleButton>
              <ToggleButton value="jour">De jour à jour</ToggleButton>
            </ToggleButtonGroup>

            {periodMode === "mois" ? (
              <>
                <Select
                  size="small"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  sx={{ ...periodSelectSx, minWidth: 150 }}
                >
                  {MonthMenuItems()}
                </Select>
                <Select
                  size="small"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  sx={{ ...periodSelectSx, minWidth: 100 }}
                >
                  {YearMenuItems()}
                </Select>
              </>
            ) : null}

            {periodMode === "mois-range" ? (
              <>
                <Typography sx={toolbarLabelSx}>Du</Typography>
                <Select
                  size="small"
                  value={rangeStartMonth}
                  onChange={(e) => setRangeStartMonth(Number(e.target.value))}
                  sx={periodSelectSx}
                >
                  {MonthMenuItems()}
                </Select>
                <Select
                  size="small"
                  value={rangeStartYear}
                  onChange={(e) => setRangeStartYear(Number(e.target.value))}
                  sx={{ ...periodSelectSx, minWidth: 100 }}
                >
                  {YearMenuItems()}
                </Select>
                <Typography sx={toolbarLabelSx}>au</Typography>
                <Select
                  size="small"
                  value={rangeEndMonth}
                  onChange={(e) => setRangeEndMonth(Number(e.target.value))}
                  sx={periodSelectSx}
                >
                  {MonthMenuItems()}
                </Select>
                <Select
                  size="small"
                  value={rangeEndYear}
                  onChange={(e) => {
                    const year = Number(e.target.value);
                    setRangeEndYear(year);
                    setSelectedYear(year);
                  }}
                  sx={{ ...periodSelectSx, minWidth: 100 }}
                >
                  {YearMenuItems()}
                </Select>
              </>
            ) : null}

            {periodMode === "jour" ? (
              <>
                <Typography sx={toolbarLabelSx}>Du</Typography>
                <TextField
                  type="date"
                  size="small"
                  value={rangeStartDate}
                  onChange={(e) => setRangeStartDate(e.target.value)}
                  sx={periodDateSx}
                />
                <Typography sx={toolbarLabelSx}>au</Typography>
                <TextField
                  type="date"
                  size="small"
                  value={rangeEndDate}
                  onChange={(e) => setRangeEndDate(e.target.value)}
                  sx={periodDateSx}
                />
              </>
            ) : null}

            {!isDefaultMode ? (
              <Tooltip
                arrow
                title={
                  (periodMode === "jour"
                    ? "Les dépenses et les avoirs sont filtrés par leur date. Le planning agence est inclus pour chaque mois touché par la période."
                    : "Les dépenses et les avoirs de chaque mois de la période sont listés, avec le mois de chacun.") +
                  (periodTruncated ? " Affichage limité aux 24 premiers mois." : "")
                }
              >
                <InfoOutlinedIcon sx={{ fontSize: 18, color: UI.textFaint, cursor: "help" }} />
              </Tooltip>
            ) : null}
          </Box>

          <Typography sx={{ color: UI.textMuted, fontSize: "0.82rem" }}>
            {visibleRowCount} ligne{visibleRowCount > 1 ? "s" : ""}
            {periodTruncated ? " · limité à 24 mois" : ""}
          </Typography>
        </Box>

        <Box sx={{ height: 3 }}>{loading ? <LinearProgress sx={{ height: 3 }} /> : null}</Box>

        <TableContainer>
          <Table
            size="small"
            sx={{
              "& .MuiTableCell-head": { py: 1 },
              "& .MuiTableCell-body": {
                borderBottom: `1px solid ${UI.borderSoft}`,
                py: 1.1,
                fontSize: "0.875rem",
                color: UI.text,
              },
            }}
          >
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
                {!isDefaultMode ? (
                  <FilterCell align="center">
                    <Typography variant="caption" sx={{ color: "#fff", fontWeight: 600 }}>
                      {periodMode === "jour" ? "Date" : "Mois"}
                    </Typography>
                  </FilterCell>
                ) : null}
                <FilterCell>
                  <Autocomplete
                    size="small"
                    fullWidth
                    options={uniquePreserveOrder(["Tous", ...filterCategoryList, filters.category])}
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
                      const filtered = q
                        ? options.filter((o) => String(o).toLowerCase().includes(q))
                        : options;
                      const rest = sortCategoriesAlpha(filtered.filter((o) => o !== "Tous"));
                      return filtered.includes("Tous") ? ["Tous", ...rest] : rest;
                    }}
                    renderInput={(params) => (
                      <StyledTextField
                        {...params}
                        size="small"
                        placeholder="Catégorie..."
                        sx={{
                          "& .MuiInputBase-input": { textAlign: "center", color: "white" },
                          "& .MuiSvgIcon-root": { color: "white" },
                        }}
                      />
                    )}
                  />
                </FilterCell>
                <FilterCell>
                  <StyledTextField
                    type="number"
                    size="small"
                    sx={{ "& .MuiInputBase-input": { textAlign: "center" } }}
                    fullWidth
                    value={filters.amount}
                    onChange={handleFilterChange("amount")}
                    placeholder="Montant..."
                  />
                </FilterCell>
                <FilterCell>
                  <Typography variant="caption" sx={{ color: "#fff", fontWeight: 600, px: 1 }}>
                    Commentaire
                  </Typography>
                </FilterCell>
                <FilterCell align="center" sx={{ width: 140 }}>
                  <Typography variant="caption" sx={{ color: "#fff", fontWeight: 600 }}>
                    Actions
                  </Typography>
                </FilterCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && tableRowsCombined.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columnCount} sx={{ py: 6, textAlign: "center" }}>
                    <Typography sx={{ color: UI.textMuted, fontWeight: 500 }}>
                      Aucune dépense ni avoir sur cette période
                    </Typography>
                    <Typography sx={{ color: UI.textFaint, fontSize: "0.8rem", mt: 0.5 }}>
                      Utilisez « Ajouter une dépense » pour saisir une première ligne.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : null}

              {tableRowsCombined
                .filter((row) => !row.isSubRow || expandedAgentGroups[row.agentKey])
                .map((row, index) => {
                const striped = index % 2 === 1;
                if (row.isGroupHeader) {
                  const isExpanded = !!expandedAgentGroups[row.agentKey];
                  const positiveGroup = Boolean(row.is_montant_positif);
                  return (
                    <TableRow
                      key={row.id}
                      onClick={() =>
                        setExpandedAgentGroups((prev) => ({
                          ...prev,
                          [row.agentKey]: !prev[row.agentKey],
                        }))
                      }
                      sx={{
                        cursor: "pointer",
                        bgcolor: positiveGroup
                          ? "rgba(27, 122, 74, 0.06)"
                          : isExpanded
                            ? "#e8f1f8"
                            : striped
                              ? "#f1f5f9"
                              : "#fff",
                        "&:hover": { bgcolor: positiveGroup ? "rgba(27, 122, 74, 0.14)" : UI.brandSoft },
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {isExpanded ? (
                            <ExpandMoreRoundedIcon sx={{ fontSize: 20, color: UI.textMuted }} />
                          ) : (
                            <ChevronRightRoundedIcon sx={{ fontSize: 20, color: UI.textMuted }} />
                          )}
                          <Box>
                            <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: UI.text }}>
                              {row.description}
                            </Typography>
                            {positiveGroup ? (
                              <Typography sx={{ fontSize: "0.72rem", color: UI.positive, fontWeight: 600 }}>
                                Avoir
                              </Typography>
                            ) : null}
                          </Box>
                          <Box
                            component="span"
                            sx={{
                              px: 0.9,
                              py: 0.1,
                              borderRadius: "999px",
                              bgcolor: UI.borderSoft,
                              color: UI.textMuted,
                              fontSize: "0.72rem",
                              fontWeight: 600,
                            }}
                          >
                            {row.subRowCount}
                          </Box>
                        </Box>
                      </TableCell>
                      {!isDefaultMode ? (
                        <TableCell align="center">
                          <Typography sx={{ color: UI.textFaint, fontSize: "0.78rem" }}>
                            {row.isAgentMonthGroup
                              ? row.monthCount > 1
                                ? `${row.monthCount} mois`
                                : row.periodLabel || ""
                              : `${row.subRowCount} mois`}
                          </Typography>
                        </TableCell>
                      ) : null}
                      <TableCell align="center">
                        {row.isRepeatGroup ? (
                          <CategoryPill category={row.category} />
                        ) : (
                          <Typography sx={{ color: UI.textFaint, fontSize: "0.78rem" }}>
                            Total agent
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                          color: positiveGroup ? `${UI.positive} !important` : undefined,
                        }}
                      >
                        {positiveGroup ? "+ " : ""}
                        {formatMontantEuroFR(effectiveAgencyTableAmount(row))}
                      </TableCell>
                      <TableCell />
                      <TableCell />
                    </TableRow>
                  );
                }

                if (row.isSubRow) {
                  if (!expandedAgentGroups[row.agentKey]) return null;
                  const displayDescription = row.isRepeatChild
                    ? getExpenseDescriptionCourte(row)
                    : row.category === "Prime" || row.category === "Pointage"
                      ? getExpenseDescriptionCourte(row)
                      : row.description;
                  const positiveRow = Boolean(row.is_montant_positif);
                  return (
                    <TableRow
                      key={row.id}
                      sx={{
                        bgcolor: striped ? "#f1f5f9" : "#fff",
                        "&:hover": { bgcolor: UI.brandSoft },
                      }}
                    >
                      <TableCell sx={{ pl: 6.5 }}>
                        <Typography sx={{ fontSize: "0.85rem", color: "#334155" }}>
                          {displayDescription}
                        </Typography>
                      </TableCell>
                      {!isDefaultMode ? (
                        <TableCell
                          align="center"
                          sx={{ color: `${UI.textMuted} !important`, whiteSpace: "nowrap" }}
                        >
                          {row.periodLabel || formatMonthLabel(row.year, row.month)}
                        </TableCell>
                      ) : null}
                      <TableCell align="center">
                        <CategoryPill category={row.category} isPlanning={row.isPlanningRow} />
                      </TableCell>
                      <TableCell
                        align="center"
                        sx={{
                          color: positiveRow ? `${UI.positive} !important` : "#334155",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {positiveRow ? "+ " : ""}
                        {formatMontantEuroFR(effectiveAgencyTableAmount(row))}
                      </TableCell>
                      <TableCell sx={{ minWidth: 180, maxWidth: 300, verticalAlign: "top" }}>
                        {renderCommentCell(row)}
                      </TableCell>
                      <TableCell align="center">{renderRowActions(row)}</TableCell>
                    </TableRow>
                  );
                }

                const positiveRow = Boolean(row.is_montant_positif);
                return (
                  <TableRow
                    key={row.id}
                    sx={{
                      bgcolor: positiveRow
                        ? striped
                          ? "rgba(27, 122, 74, 0.09)"
                          : "rgba(27, 122, 74, 0.04)"
                        : striped
                          ? "#f1f5f9"
                          : "#fff",
                      "&:hover": {
                        bgcolor: positiveRow ? "rgba(27, 122, 74, 0.14)" : UI.brandSoft,
                      },
                      "& > td:first-of-type": {
                        boxShadow: positiveRow ? `inset 3px 0 0 ${UI.positive}` : "none",
                      },
                    }}
                  >
                    <TableCell>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: UI.text }}>
                        {getExpenseDescriptionCourte(row)}
                      </Typography>
                      {positiveRow ? (
                        <Typography sx={{ fontSize: "0.72rem", color: UI.positive, fontWeight: 600 }}>
                          Avoir
                        </Typography>
                      ) : null}
                    </TableCell>
                    {!isDefaultMode ? (
                      <TableCell
                        align="center"
                        sx={{
                          color: `${UI.textMuted} !important`,
                          whiteSpace: "nowrap",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {row.periodLabel || formatMonthLabel(row.year, row.month)}
                      </TableCell>
                    ) : null}
                    <TableCell align="center">
                      <CategoryPill category={row.category} isPlanning={row.isPlanningRow} />
                    </TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        fontVariantNumeric: "tabular-nums",
                        color: positiveRow ? `${UI.positive} !important` : undefined,
                      }}
                    >
                      {positiveRow ? "+ " : ""}
                      {formatMontantEuroFR(effectiveAgencyTableAmount(row))}
                    </TableCell>
                    <TableCell sx={{ minWidth: 180, maxWidth: 300, verticalAlign: "top" }}>
                      {renderCommentCell(row)}
                    </TableCell>
                    <TableCell align="center">{renderRowActions(row)}</TableCell>
                  </TableRow>
                );
              })}

              <TableRow
                sx={{
                  bgcolor: UI.surface,
                  "& > td": { borderTop: `2px solid ${UI.border}`, borderBottom: 0, py: 1.5 },
                }}
              >
                <TableCell colSpan={isDefaultMode ? 2 : 3}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      flexWrap: "wrap",
                    }}
                  >
                    <Typography sx={{ fontWeight: 700, fontSize: "0.875rem", color: UI.text }}>
                      {isDefaultMode ? "Total du mois" : "Total de la période"}
                    </Typography>
                    <Box sx={{ display: "flex", gap: 2.5, fontVariantNumeric: "tabular-nums" }}>
                      <Typography sx={{ fontSize: "0.82rem", color: UI.textMuted }}>
                        Dépenses{" "}
                        <Box component="span" sx={{ fontWeight: 700, color: UI.text }}>
                          − {formatMontantEuroFR(monthlyTotalDisplayed)}
                        </Box>
                      </Typography>
                      <Typography sx={{ fontSize: "0.82rem", color: UI.textMuted }}>
                        Avoirs{" "}
                        <Box component="span" sx={{ fontWeight: 700, color: UI.positive }}>
                          + {formatMontantEuroFR(monthlyPositiveTotal)}
                        </Box>
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell
                  align="center"
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.95rem !important",
                    fontVariantNumeric: "tabular-nums",
                    whiteSpace: "nowrap",
                    color: `${monthlyNetTotal > 0 ? UI.positive : UI.brand} !important`,
                  }}
                >
                  {monthlyNetTotal > 0
                    ? `+ ${formatMontantEuroFR(monthlyNetTotal)}`
                    : formatMontantEuroFR(monthlyNetTotal)}
                </TableCell>
                <TableCell />
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Synthèse annuelle */}
      <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.5, mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, color: UI.text, fontSize: "1.05rem" }}>
          {isDefaultMode ? "Synthèse du mois" : "Synthèse de la période"}
        </Typography>
        <Typography sx={{ color: UI.textMuted, fontSize: "0.8rem" }}>
          {periodLabel} — cliquez une catégorie pour le détail
        </Typography>
      </Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <CategoryYearCard
          title="Dépenses par catégorie"
          subtitle={
            isDefaultMode
              ? "Mois sélectionné, planning agence inclus"
              : "Période sélectionnée, planning agence inclus"
          }
          year={selectedYear}
          totalCaption={periodLabel}
          loading={loading}
          rows={periodCategoryDisplayRows}
          emptyText="Aucune dépense sur cette période."
          accent={COST_ACCENT}
          onOpen={(cat, total) => openCategoryDetail(cat, total, false)}
          showTotal
        />
        <CategoryYearCard
          title="Avoirs par catégorie"
          subtitle={isDefaultMode ? "Mois sélectionné" : "Période sélectionnée"}
          year={selectedYear}
          totalCaption={periodLabel}
          loading={loading}
          rows={periodPositiveDisplayRows}
          emptyText="Aucun avoir sur cette période."
          accent={POSITIVE_ACCENT}
          onOpen={(cat, total) => openCategoryDetail(cat, total, true)}
          showTotal
        />
      </Box>

      {/* Dialog pour ajouter/modifier une dépense */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {isEditing
            ? isPositiveEntry
              ? "Modifier l'avoir"
              : "Modifier la dépense"
            : isPositiveEntry
              ? "Ajouter un avoir"
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
                const strings = sortCategoriesAlpha(
                  filtered.filter((option) => typeof option === "string")
                );
                const createOpts = filtered.filter(
                  (option) => typeof option !== "string"
                );
                const inputValue = normalizeCategoryName(params.inputValue);
                if (!inputValue) return [...strings, ...createOpts];
                const exists = options.some(
                  (option) =>
                    String(option).toLowerCase() === inputValue.toLowerCase()
                );
                if (!exists) {
                  createOpts.push({
                    inputValue,
                    title: `Créer « ${inputValue} »`,
                  });
                }
                return [...strings, ...createOpts];
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
              label={isPositiveEntry ? "Montant récurrent" : "Dépense récurrente"}
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
          <Button
            onClick={handleSaveExpense}
            variant="contained"
            color={isPositiveEntry ? "success" : "primary"}
          >
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
            {categoryDetail.positive ? "Avoirs · " : ""}
            Désignations regroupées · {periodLabel}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              mt: 1.5,
              mb: 2,
              p: 1.5,
              borderRadius: 1,
              backgroundColor: categoryDetail.positive
                ? "rgba(27, 122, 74, 0.08)"
                : "rgba(27, 120, 188, 0.08)",
              border: categoryDetail.positive
                ? "1px solid rgba(27, 122, 74, 0.28)"
                : "1px solid rgba(27, 120, 188, 0.2)",
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
                color:
                  !categoryDetail.loading &&
                  detailAmountView(
                    categoryDetail.groups.reduce((sum, group) => sum + (group.expenseTotal || 0), 0),
                    categoryDetail.groups.reduce((sum, group) => sum + (group.positiveTotal || 0), 0)
                  ).positive
                    ? "#1b7a4a"
                    : categoryDetail.positive
                      ? "#1b7a4a"
                      : "rgba(27, 120, 188, 1)",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {categoryDetail.loading
                ? formatMontantEuroFR(categoryDetail.total)
                : detailAmountView(
                    categoryDetail.groups.reduce((sum, group) => sum + (group.expenseTotal || 0), 0),
                    categoryDetail.groups.reduce((sum, group) => sum + (group.positiveTotal || 0), 0)
                  ).text}
            </Typography>
          </Box>

          {categoryDetail.loading ? (
            <Typography color="text.secondary" sx={{ py: 2 }}>
              {categoryDetail.positive
                ? "Chargement des avoirs…"
                : "Chargement des dépenses…"}
            </Typography>
          ) : categoryDetail.groups.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 2, fontStyle: "italic" }}>
              {categoryDetail.positive
                ? `Aucun avoir pour cette catégorie sur ${periodLabel}.`
                : `Aucune dépense pour cette catégorie sur ${periodLabel}.`}
            </Typography>
          ) : (
            <Stack spacing={1}>
              {categoryDetail.groups.map((group) => {
                const isOpen = !!expandedDesignations[group.key];
                const groupAmount = detailAmountView(group.expenseTotal, group.positiveTotal);
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
                          color: groupAmount.positive ? "#1b7a4a" : "inherit",
                        }}
                      >
                        {groupAmount.text}
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
                                color: line.is_montant_positif ? "#1b7a4a" : "inherit",
                              }}
                            >
                              {formatDetailAmount(line.amount, Boolean(line.is_montant_positif))}
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
            Êtes-vous sûr de vouloir supprimer{" "}
            {expenseToDelete?.is_montant_positif ? "cet avoir" : "cette dépense"}{" "}
            pour le mois de{" "}
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
