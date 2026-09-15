export const DEVIS_TAGS = [
  { value: "En attente BDC", label: "En attente BDC", bg: "#fff3e0", color: "#e65100" },
  { value: "Envoyé", label: "Envoyé", bg: "#e3f2fd", color: "#1565c0" },
  { value: "Validé", label: "Validé", bg: "#e8f5e9", color: "#2e7d32" },
  { value: "Refusé", label: "Refusé", bg: "#ffebee", color: "#c62828" },
  { value: "Travaux non réalisés", label: "Travaux non réalisés", bg: "#fff8e1", color: "#f9a825" },
  { value: "Travaux en cours", label: "Travaux en cours", bg: "#ede7f6", color: "#6a1b9a" },
  { value: "Travaux réalisés", label: "Travaux réalisés", bg: "#e0f2f1", color: "#00695c" },
  { value: "BDC reçus", label: "BDC reçus", bg: "#e8eaf6", color: "#3949ab" },
  { value: "Faire Avenant", label: "Faire Avenant", bg: "#fce4ec", color: "#c2185b" },
  { value: "Faire TS", label: "Faire TS", bg: "#e0f7fa", color: "#00838f" },
];

export const DEVIS_TAG_VALUES = DEVIS_TAGS.map((tag) => tag.value);

const LEGACY_TAG_MAP = {
  "En Attente": "En attente BDC",
  "en attente": "En attente BDC",
  "En attente": "En attente BDC",
  "En attente de travaux": "Travaux non réalisés",
  "Travaux non réaliser": "Travaux non réalisés",
  "Travaux non realises": "Travaux non réalisés",
  "Travaux réalisé": "Travaux réalisés",
  "Travaux realisé": "Travaux réalisés",
  "BDC recus": "BDC reçus",
  Envoye: "Envoyé",
  Valide: "Validé",
  Refuse: "Refusé",
};

// Tags incompatibles : sélectionner l'un désélectionne les autres du même groupe
const EXCLUSIVE_TAG_GROUPS = [
  ["Validé", "Refusé"],
  ["En attente BDC", "BDC reçus"],
  ["Travaux non réalisés", "Travaux en cours", "Travaux réalisés"],
];

export const normalizeDevisTag = (status) => {
  if (!status) return "";
  return LEGACY_TAG_MAP[status] || status;
};

export const parseDevisTagsLabel = (value) => {
  if (!value || value === "—" || value === "Aucun tag") return [];
  return String(value)
    .split(/\s*(?:\/|\+)\s*/)
    .map((part) => normalizeDevisTag(part.trim()))
    .filter(Boolean);
};

export const getDevisTags = (devisOrTags, fallbackStatus) => {
  const rawTags = Array.isArray(devisOrTags)
    ? devisOrTags
    : devisOrTags?.tags;
  const status =
    fallbackStatus ??
    (Array.isArray(devisOrTags) ? "" : devisOrTags?.status);

  const source =
    Array.isArray(rawTags) && rawTags.length
      ? rawTags
      : parseDevisTagsLabel(status);

  const unique = [];
  source.forEach((item) => {
    const normalized = normalizeDevisTag(item);
    if (normalized && !unique.includes(normalized)) {
      unique.push(normalized);
    }
  });
  return unique;
};

export const formatDevisTagsLabel = (tags) =>
  tags.length ? tags.join(" + ") : "Aucun tag";

export const areDevisTagsEqual = (left, right) =>
  formatDevisTagsLabel([...left].sort()) ===
  formatDevisTagsLabel([...right].sort());

export const toggleDevisTag = (selected, tagValue) => {
  const exists = selected.includes(tagValue);
  if (exists) {
    return selected.filter((item) => item !== tagValue);
  }

  const exclusiveGroup = EXCLUSIVE_TAG_GROUPS.find((group) =>
    group.includes(tagValue)
  );
  const next = exclusiveGroup
    ? selected.filter((item) => !exclusiveGroup.includes(item))
    : [...selected];
  next.push(tagValue);
  return next;
};

export const getDevisTagMeta = (status) => {
  const normalized = normalizeDevisTag(status);
  return (
    DEVIS_TAGS.find((tag) => tag.value === normalized) || {
      value: normalized,
      label: normalized || "Aucun",
      bg: "#fff8e1",
      color: "#f57f17",
    }
  );
};

export const getDevisTagStyle = (status, { clickable = false } = {}) => {
  const tag = getDevisTagMeta(status);
  return {
    display: "inline-flex",
    alignItems: "center",
    px: 1.25,
    py: 0.35,
    borderRadius: 1,
    backgroundColor: tag.bg,
    color: tag.color,
    fontWeight: 600,
    fontSize: "0.8rem",
    cursor: clickable ? "pointer" : "default",
    userSelect: "none",
    whiteSpace: "nowrap",
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    "&:hover": clickable
      ? {
          transform: "translateY(-1px)",
          boxShadow: "0 2px 6px rgba(0,0,0,0.12)",
        }
      : undefined,
  };
};

export const formatDevisTagDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
