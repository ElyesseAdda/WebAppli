export const DEVIS_TAGS = [
  { value: "En attente BDC", label: "En attente BDC", bg: "#fff3e0", color: "#e65100" },
  { value: "BDC reçus", label: "BDC reçus", bg: "#e8eaf6", color: "#3949ab" },
  { value: "Validé", label: "Validé", bg: "#e8f5e9", color: "#2e7d32" },
  { value: "Refusé", label: "Refusé", bg: "#ffebee", color: "#c62828" },
  { value: "Travaux non réalisés", label: "Travaux non réalisés", bg: "#fff8e1", color: "#f9a825" },
  { value: "Travaux en cours", label: "Travaux en cours", bg: "#ede7f6", color: "#6a1b9a" },
  { value: "Travaux réalisés", label: "Travaux réalisés", bg: "#e0f2f1", color: "#00695c" },
  { value: "Faire Avenant", label: "Faire Avenant", bg: "#fce4ec", color: "#c2185b" },
  { value: "A facturer", label: "A facturer", bg: "#e0f7fa", color: "#00838f" },
  { value: "Facturé", label: "Facturé", bg: "#e8f5e9", color: "#1b5e20" },
];

export const DEVIS_TAG_VALUES = DEVIS_TAGS.map((tag) => tag.value);

// Groupes d'affichage = tags incompatibles sur la même ligne
export const DEVIS_TAG_ROWS = [
  {
    label: "Suivi BDC",
    values: ["En attente BDC", "BDC reçus"],
  },
  {
    label: "Décision",
    values: ["Validé", "Refusé"],
  },
  {
    label: "Travaux",
    values: ["Travaux non réalisés", "Travaux en cours", "Travaux réalisés"],
  },
  {
    label: "Actions",
    values: ["Faire Avenant", "A facturer", "Facturé"],
  },
];

export const DEVIS_ACTION_TAGS = ["Faire Avenant", "A facturer", "Facturé"];

export const TRANSFORM_TAG_BY_TYPE = {
  facture: "Facturé",
  cie: "Facturé",
  avenant: "Faire Avenant",
};

export const TRANSFORM_LABELS = {
  facture: "Transformation en facture",
  avenant: "Transformation en avenant",
  cie: "Transformation en facture CIE",
};

export const getTransformLabel = (transformType) =>
  TRANSFORM_LABELS[transformType] || "";

/** Construit les métadonnées document pour l'historique de transformation */
export const buildTransformDocumentMeta = (transformType, responseData = {}) => {
  const data = responseData || {};
  if (transformType === "facture") {
    const id = data.id || data.facture_id;
    const numero = data.numero || data.document_numero || "";
    return {
      transform_type: "facture",
      document_numero: numero ? String(numero) : "",
      preview_url: id ? `/api/preview-facture/${id}/` : data.preview_url || "",
    };
  }
  if (transformType === "cie") {
    const id = data.facture_id || data.id;
    const numero = data.numero_cie || data.document_numero || data.numero || "";
    return {
      transform_type: "cie",
      document_numero: numero ? String(numero) : "",
      preview_url:
        data.preview_url || (id ? `/api/preview-facture/${id}/` : ""),
    };
  }
  if (transformType === "avenant") {
    const avenantNumero = data.avenant_numero;
    const numeroTs = data.numero_ts;
    const devisId = data.devis_id;
    const documentNumero =
      data.document_numero ||
      (avenantNumero
        ? `Avenant n°${avenantNumero}`
        : numeroTs != null
          ? `TS n°${String(numeroTs).padStart(3, "0")}`
          : "");
    return {
      transform_type: "avenant",
      document_numero: documentNumero,
      preview_url:
        data.preview_url ||
        (devisId ? `/api/preview-saved-devis-v2/${devisId}/` : ""),
    };
  }
  return {
    transform_type: transformType || "",
    document_numero: data.document_numero || "",
    preview_url: data.preview_url || "",
  };
};

/** Remplace tous les tags par le seul tag d'action (ex. Facturé) */
export const setDevisActionTag = (devisOrTags, actionTag) => {
  if (!actionTag) return [];
  return [actionTag];
};

/** Met à jour les tags après transformation facture / avenant / CIE */
export const applyTransformTagToDevis = async (
  devis,
  transformType,
  axiosClient,
  documentResponse = null
) => {
  if (!devis?.id || !axiosClient) return null;
  const actionTag =
    TRANSFORM_TAG_BY_TYPE[transformType] ||
    (transformType === "CIE" ? "Facturé" : null);
  if (!actionTag) return null;

  const nextTags = setDevisActionTag(devis, actionTag);
  const documentMeta = buildTransformDocumentMeta(
    String(transformType || "").toLowerCase(),
    {
      ...(documentResponse || {}),
      devis_id: documentResponse?.devis_id || devis.id,
    }
  );
  const response = await axiosClient.put(
    `/api/list-devis/${devis.id}/update_status/`,
    { tags: nextTags, ...documentMeta }
  );
  return response?.data?.tags || nextTags;
};

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
  "Faire TS": "A facturer",
  Envoye: "Envoyé",
  Valide: "Validé",
  Refuse: "Refusé",
};

// Tags incompatibles : sélectionner l'un désélectionne les autres du même groupe
const EXCLUSIVE_TAG_GROUPS = DEVIS_TAG_ROWS.map((row) => row.values);

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

/** Toggle libre (sans exclusion) — pour le filtre multi-tags */
export const toggleFilterTag = (selected, tagValue) => {
  if (selected.includes(tagValue)) {
    return selected.filter((item) => item !== tagValue);
  }
  return [...selected, tagValue];
};

/** Normalise le filtre status (string legacy ou tableau) */
export const normalizeStatusFilter = (status) => {
  if (Array.isArray(status)) {
    return status.map(normalizeDevisTag).filter(Boolean);
  }
  if (!status || status === "Tous") return [];
  return [normalizeDevisTag(status)].filter(Boolean);
};

/** true si le devis possède tous les tags filtrés (ET — combinaison exacte requise) */
export const devisMatchesStatusFilter = (devis, statusFilter) => {
  const selected = normalizeStatusFilter(statusFilter);
  if (!selected.length) return true;
  const devisTags = getDevisTags(devis);
  return selected.every((tag) => devisTags.includes(tag));
};

export const formatStatusFilterLabel = (statusFilter) => {
  const selected = normalizeStatusFilter(statusFilter);
  if (!selected.length) return "Tous";
  if (selected.length === 1) return selected[0];
  return `${selected.length} tags`;
};

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
    px: 1.1,
    py: 0.4,
    borderRadius: "3px",
    border: `1px solid ${tag.color}40`,
    backgroundColor: tag.bg,
    color: tag.color,
    fontWeight: 600,
    fontSize: "0.75rem",
    letterSpacing: "0.01em",
    lineHeight: 1.25,
    cursor: clickable ? "pointer" : "default",
    userSelect: "none",
    whiteSpace: "nowrap",
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
