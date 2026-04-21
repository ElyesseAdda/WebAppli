import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Box, Button, TextField, Typography, Paper, MenuItem, Select,
  FormControl, InputLabel, Autocomplete, Chip, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  useTheme,
  useMediaQuery,
  IconButton,
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import {
  MdAdd, MdPictureAsPdf, MdArrowBack, MdDelete, MdChevronLeft, MdChevronRight, MdClose,
  MdCheckCircle, MdErrorOutline,
} from "react-icons/md";
import axios from "axios";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { COLORS } from "../../constants/colors";
import { useRapports } from "../../hooks/useRapports";
import PrestationSection from "./PrestationSection";
import SignaturePad from "./SignaturePad";
import elekableLogo from "../../img/logo.png";
import {
  buildPhotoSnapshot,
  saveRapportDraftPhotos,
  clearRapportDraftPhotos,
  loadRapportDraftPhotos,
  applyPhotoSnapshotToState,
  photoSnapshotIsEmpty,
  deserializePhotoSnapshotFromPayload,
} from "../../utils/rapportDraftIDB";
import { compressImage, VIGIK_REPORT_PHOTO_OPTIONS } from "../../utils/compressImage";

const EMPTY_PRESTATION = {
  localisation: "",
  probleme: "",
  solution: "",
  commentaire: "",
  prestation_possible: true,
  prestation_realisee: "",
};

/** Export PNG du pad ; null si vide ou canvas « tainted » (évite SecurityError en promotion / autosave). */
const safeGetSignatureDataUrl = (padRef) => {
  try {
    return padRef?.current?.getSignatureDataUrl?.() ?? null;
  } catch {
    return null;
  }
};

const createVigikClientPhotoId = () =>
  `vigik-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

const ensureVigikClientId = (item) => ({
  ...item,
  clientId: item?.clientId || createVigikClientPhotoId(),
});

/** Libellés français pour les clés d'erreur API (DRF). */
const RAPPORT_FIELD_LABELS = {
  technicien: "Technicien",
  objet_recherche: "Objet de la recherche",
  resultat: "Résultat",
  dates_intervention: "Dates d'intervention",
  date: "Date",
  titre: "Titre",
  client_societe: "Client / Bailleur",
  chantier: "Chantier",
  residence: "Résidence",
  residence_nom: "Nom de la résidence",
  residence_adresse: "Adresse de la résidence",
  adresse_vigik: "Adresse du rapport (Vigik+)",
  logement: "Lieu d'intervention",
  type_rapport: "Type de rapport",
  statut: "Statut",
  prestations: "Prestations",
  localisation: "Lieu / Localisation",
  probleme: "Problème constaté",
  solution: "Solution apportée",
  commentaire: "Commentaire",
  prestation_possible: "Prestation possible",
  prestation_realisee: "Type de prestation réalisée",
  temps_trajet: "Temps de trajet",
  temps_taches: "Temps de tâches",
  numero_batiment: "Numéro du bâtiment",
  type_installation: "Type d'installation",
  presence_platine: "Présence de platine",
  presence_portail: "Présence d'un portail",
  presence_platine_portail: "Présence de platine Vigik+ au portail",
  devis_a_faire: "Devis à faire",
  devis_fait: "Devis fait",
  devis_lie: "Devis lié",
  locataire_nom: "Nom locataire",
  locataire_prenom: "Prénom locataire",
  locataire_telephone: "Téléphone locataire",
  locataire_email: "Email locataire",
  non_field_errors: "Formulaire",
};

const labelForApiKey = (key) => RAPPORT_FIELD_LABELS[key] || key;

/**
 * Aplatit les erreurs DRF (objets imbriqués, tableaux de messages, prestations).
 */
const flattenApiErrors = (data, pathPrefix = "") => {
  const out = [];
  if (data == null) return out;
  if (typeof data === "string") {
    out.push({ field: pathPrefix || "Erreur", message: data });
    return out;
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return out;
    if (typeof data[0] === "string") {
      data.forEach((msg) => out.push({ field: pathPrefix || "Erreur", message: msg }));
    } else {
      data.forEach((item, idx) => {
        const childPath = pathPrefix
          ? `${pathPrefix} — ligne ${idx + 1}`
          : `Ligne ${idx + 1}`;
        out.push(...flattenApiErrors(item, childPath));
      });
    }
    return out;
  }
  if (typeof data === "object") {
    if (data.detail !== undefined && data.detail !== null) {
      if (typeof data.detail === "string") {
        out.push({ field: pathPrefix || "Message", message: data.detail });
      } else {
        out.push(...flattenApiErrors(data.detail, pathPrefix || "Message"));
      }
    }
    for (const [k, v] of Object.entries(data)) {
      if (k === "detail") continue;
      const label = labelForApiKey(k);
      const nextPath = pathPrefix ? `${pathPrefix} — ${label}` : label;
      if (Array.isArray(v)) {
        if (v.length === 0) continue;
        if (typeof v[0] === "string") {
          v.forEach((msg) => out.push({ field: nextPath, message: msg }));
        } else {
          v.forEach((item, idx) => {
            const p = `${nextPath} (prestation ${idx + 1})`;
            out.push(...flattenApiErrors(item, p));
          });
        }
      } else if (v && typeof v === "object") {
        out.push(...flattenApiErrors(v, nextPath));
      } else if (v != null && v !== "") {
        out.push({ field: nextPath, message: String(v) });
      }
    }
  }
  return out;
};

const parseAxiosSaveError = (err) => {
  const status = err?.response?.status;
  const data = err?.response?.data;
  let items = [];
  if (data !== undefined && data !== null) {
    items = flattenApiErrors(data);
  }
  if (!items.length && err?.message) {
    items = [{ field: "Erreur", message: err.message }];
  }
  if (!items.length) {
    items = [{ field: "Erreur", message: "Une erreur inattendue s'est produite." }];
  }
  let title = "Erreur lors de la sauvegarde";
  if (!err?.response) {
    title = "Impossible de joindre le serveur";
  } else if (status === 400) {
    title = "Données refusées par le serveur";
  } else if (status === 403) {
    title = "Accès refusé";
  } else if (status === 404) {
    title = "Ressource introuvable";
  } else if (status >= 500) {
    title = "Erreur serveur";
  }
  return { title, items };
};

/** Dernier segment du chemin API (nom lisible du champ). */
const labelForDisplay = (field) => {
  const raw = (field || "").trim();
  if (!raw) return "";
  const parts = raw.split(" — ").map((p) => p.trim());
  return parts[parts.length - 1] || raw;
};

const uniqueFieldLabelsFromItems = (items) => {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const raw = (it.field || "").trim();
    const prestationMatch = raw.match(/prestation\s*(\d+)/i);
    let d;
    if (prestationMatch) {
      const lastPart = labelForDisplay(raw);
      d = `Prestation ${prestationMatch[1]} : ${lastPart}`;
    } else {
      d = labelForDisplay(raw);
    }
    if (!d || d === "Erreur" || d === "Message") continue;
    if (!seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out;
};

const FRIENDLY_API_ERROR_TITLE = {
  "Erreur lors de la sauvegarde": "Enregistrement impossible",
  "Impossible de joindre le serveur": "Pas de connexion au serveur",
  "Données refusées par le serveur": "Informations incomplètes ou incorrectes",
  "Accès refusé": "Accès refusé",
  "Ressource introuvable": "Élément introuvable",
  "Erreur serveur": "Problème temporaire sur le serveur",
};

const translateCommonMessage = (msg) => {
  if (!msg || typeof msg !== "string") return "";
  const t = {
    "This field is required.": "Ce champ est obligatoire.",
    "This field may not be null.": "Ce champ est obligatoire.",
    "This field may not be blank.": "Ce champ ne peut pas être vide.",
    "Enter a valid email address.": "Adresse e-mail invalide.",
  };
  return t[msg] || msg;
};

const buildSaveErrorFromApi = (err) => {
  const { title, items } = parseAxiosSaveError(err);
  const fieldLabels = uniqueFieldLabelsFromItems(items);
  let fallbackMessage = "";
  if (fieldLabels.length === 0 && items.length) {
    const firstMsg = items.map((i) => i.message).find(Boolean);
    fallbackMessage =
      translateCommonMessage(firstMsg) ||
      firstMsg ||
      "Une erreur s'est produite. Réessayez dans un instant.";
  }
  return {
    title: FRIENDLY_API_ERROR_TITLE[title] || title,
    fieldLabels,
    fallbackMessage,
  };
};

/** Adresse chantier : rue, code postal + ville (aligné sur le modèle Chantier). */
const formatChantierAddress = (c) => {
  if (!c) return "";
  const rue = (c.rue || "").trim();
  const cp = c.code_postal != null && c.code_postal !== "" ? String(c.code_postal).trim() : "";
  const ville = (c.ville || "").trim();
  const ligne2 = [cp, ville].filter(Boolean).join(" ").trim();
  if (rue && ligne2) return `${rue}, ${ligne2}`;
  if (rue) return rue;
  return ligne2;
};

const todayISO = () => new Date().toISOString().split("T")[0];

const floatHoursToTimeInput = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  const totalMinutes = Math.max(0, Math.round(num * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

const timeInputToFloatHours = (value) => {
  if (!value || typeof value !== "string" || !value.includes(":")) return 0;
  const [h, m] = value.split(":");
  const hours = Number(h);
  const minutes = Number(m);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return Math.max(0, hours + (minutes / 60));
};

/** Dernière date saisie (la plus récente) ; null si aucune liste utile. */
const latestInterventionISO = (dates) => {
  if (!dates?.length) return null;
  const sorted = [...dates].map((s) => String(s).slice(0, 10)).filter(Boolean).sort();
  return sorted[sorted.length - 1] || null;
};

const normalizeDatesInterventionFromApi = (data) => {
  if (Array.isArray(data.dates_intervention) && data.dates_intervention.length) {
    return data.dates_intervention.map((d) => String(d).slice(0, 10));
  }
  if (data.date) return [String(data.date).slice(0, 10)];
  return [todayISO()];
};

const RAPPORT_DRAFT_VERSION = 1;
const RAPPORT_DRAFT_PREFIX = "rapport-intervention-draft-v1";

const getRapportDraftStorageKey = (rapportId) =>
  rapportId ? `${RAPPORT_DRAFT_PREFIX}:id:${rapportId}` : `${RAPPORT_DRAFT_PREFIX}:new`;

const createInitialFormData = () => ({
  titre: "",
  dates_intervention: [todayISO()],
  technicien: "",
  objet_recherche: "",
  resultat: "",
  temps_trajet: "",
  temps_taches: "",
  client_societe: "",
  chantier: "",
  residence: null,
  residence_nom: "",
  residence_adresse: "",
  adresse_vigik: "",
  logement: "",
  locataire_nom: "",
  locataire_prenom: "",
  locataire_telephone: "",
  locataire_email: "",
  type_rapport: "intervention",
  statut: "brouillon",
  prestations: [{ ...EMPTY_PRESTATION }],
  numero_batiment: "",
  type_installation: "",
  presence_platine: null,
  presence_portail: null,
  presence_platine_portail: null,
  devis_a_faire: false,
  devis_fait: false,
  devis_lie: null,
});

const readRapportDraftFromStorage = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.v !== RAPPORT_DRAFT_VERSION || !data.formData) return null;
    return data;
  } catch {
    return null;
  }
};

const writeRapportDraftToStorage = (
  key,
  formData,
  selectedResidence,
  { cachedPhotos = false, signatureDraftDataUrl = null } = {}
) => {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        v: RAPPORT_DRAFT_VERSION,
        savedAt: Date.now(),
        formData,
        selectedResidence: selectedResidence ?? null,
        cachedPhotos: !!cachedPhotos,
        signatureDraftDataUrl: signatureDraftDataUrl && String(signatureDraftDataUrl).length > 32 ? signatureDraftDataUrl : null,
      })
    );
  } catch (e) {
    console.warn("Brouillon rapport : enregistrement impossible", e);
  }
};

const clearRapportDraftStorageKey = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

const nonEmptyStr = (s) => String(s || "").trim().length > 0;

/** Indique si le brouillon contient plus que les valeurs par défaut (évite dialogue / stockage inutile). */
const isDraftPayloadMeaningful = (payload) => {
  if (nonEmptyStr(payload?.signatureDraftDataUrl)) return true;
  const fd = payload?.formData;
  if (!fd) return false;
  if (nonEmptyStr(fd.technicien)) return true;
  if (nonEmptyStr(fd.objet_recherche)) return true;
  if (nonEmptyStr(fd.resultat)) return true;
  if (nonEmptyStr(fd.residence_nom)) return true;
  if (nonEmptyStr(fd.adresse_vigik)) return true;
  if (nonEmptyStr(fd.logement)) return true;
  if (nonEmptyStr(fd.locataire_nom) || nonEmptyStr(fd.locataire_prenom)) return true;
  if (nonEmptyStr(fd.locataire_telephone) || nonEmptyStr(fd.locataire_email)) return true;
  if (fd.titre) return true;
  if (fd.client_societe) return true;
  if (fd.chantier) return true;
  if (fd.residence) return true;
  if (nonEmptyStr(fd.numero_batiment)) return true;
  if (nonEmptyStr(fd.type_installation)) return true;
  if (fd.presence_platine !== null && fd.presence_platine !== undefined) return true;
  if (fd.presence_portail !== null && fd.presence_portail !== undefined) return true;
  if (fd.presence_platine_portail !== null && fd.presence_platine_portail !== undefined) return true;
  if (fd.devis_a_faire || fd.devis_fait) return true;
  if (fd.devis_lie) return true;
  if (fd.type_rapport && fd.type_rapport !== "intervention") return true;
  if (fd.statut && fd.statut !== "a_faire" && fd.statut !== "brouillon") return true;
  const prestations = fd.prestations || [];
  if (prestations.length > 1) return true;
  if (prestations[0]) {
    const p = prestations[0];
    if (
      nonEmptyStr(p.localisation) ||
      nonEmptyStr(p.probleme) ||
      nonEmptyStr(p.solution) ||
      nonEmptyStr(p.commentaire)
    ) {
      return true;
    }
    if (p.prestation_realisee) return true;
    if (p.prestation_possible === false) return true;
  }
  if (nonEmptyStr(fd.temps_trajet) || nonEmptyStr(fd.temps_taches)) return true;
  const dates = fd.dates_intervention || [];
  if (dates.length > 1) return true;
  if (dates.length === 1 && dates[0] && String(dates[0]).slice(0, 10) !== todayISO()) return true;
  return false;
};

/** Hydratation depuis le JSON `payload` d'un RapportInterventionBrouillon (API). */
const mergeFormDataFromApiPayload = (data) => {
  if (!data || typeof data !== "object") return createInitialFormData();
  const prestationsSrc = Array.isArray(data.prestations) && data.prestations.length
    ? data.prestations.map((p) => ({ ...EMPTY_PRESTATION, ...p }))
    : [{ ...EMPTY_PRESTATION }];
  return {
    ...createInitialFormData(),
    titre: data.titre || "",
    dates_intervention: normalizeDatesInterventionFromApi(data),
    technicien: data.technicien || "",
    objet_recherche: data.objet_recherche || "",
    resultat: data.resultat || "",
    temps_trajet: floatHoursToTimeInput(data.temps_trajet),
    temps_taches: floatHoursToTimeInput(data.temps_taches),
    client_societe: data.client_societe || "",
    chantier: data.chantier || "",
    residence: data.residence ?? null,
    residence_nom: data.residence_nom || "",
    residence_adresse: data.residence_adresse || "",
    adresse_vigik: data.adresse_vigik ?? "",
    logement: data.logement || "",
    locataire_nom: data.locataire_nom || "",
    locataire_prenom: data.locataire_prenom || "",
    locataire_telephone: data.locataire_telephone || "",
    locataire_email: data.locataire_email || "",
    type_rapport: data.type_rapport || "intervention",
    statut: data.statut || "brouillon",
    prestations: prestationsSrc,
    numero_batiment: data.numero_batiment ?? "",
    type_installation: data.type_installation ?? "",
    presence_platine: data.presence_platine ?? null,
    presence_portail: data.presence_portail ?? null,
    presence_platine_portail: data.presence_platine_portail ?? null,
    devis_a_faire: !!data.devis_a_faire,
    devis_fait: !!data.devis_fait,
    devis_lie: data.devis_lie ?? null,
  };
};

const RapportForm = ({
  rapportId: propRapportId,
  onBack,
  saveButtonAtBottom,
  onReportCreated,
  onRapportIdAssigned,
  serverBrouillonIdToLoad = null,
}) => {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const rapportId = propRapportId || paramId;
  const isEdit = !!rapportId;
  const navigate = useNavigate();
  const brouillonLoadRaw =
    serverBrouillonIdToLoad != null && String(serverBrouillonIdToLoad).trim() !== ""
      ? String(serverBrouillonIdToLoad).trim()
      : searchParams.get("brouillon");
  const brouillonLoadId = brouillonLoadRaw && /^\d+$/.test(brouillonLoadRaw) ? brouillonLoadRaw : null;
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const {
    fetchRapport, updateRapport, uploadPhoto, updatePhoto,
    deletePhoto, uploadSignature, genererPdf,
    fetchTitres, createTitre, deleteTitre, loading,
    createRapportBrouillon, patchRapportBrouillon, promouvoirRapportBrouillon,
  } = useRapports();

  const [formData, setFormData] = useState(createInitialFormData);

  const [rapportData, setRapportData] = useState(null);
  const [titres, setTitres] = useState([]);
  const [techniciensSuggestions, setTechniciensSuggestions] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [residences, setResidences] = useState([]);
  const [selectedResidence, setSelectedResidence] = useState(null);
  const [pendingPhotos, setPendingPhotos] = useState({});
  const [pendingPhotosPlatine, setPendingPhotosPlatine] = useState([]);
  const [pendingPhotosPlatinePortail, setPendingPhotosPlatinePortail] = useState([]);
  const photoPlatineInputRef = useRef(null);
  const photoPlatineCameraInputRef = useRef(null);
  const photoPlatinePortailInputRef = useRef(null);
  const photoPlatinePortailCameraInputRef = useRef(null);
  const signaturePadRef = useRef(null);
  const [newTitreDialog, setNewTitreDialog] = useState(false);
  const [newTitreName, setNewTitreName] = useState("");
  const [deleteTitreDialogOpen, setDeleteTitreDialogOpen] = useState(false);
  const [titreToDelete, setTitreToDelete] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [saveErrorModal, setSaveErrorModal] = useState({
    open: false,
    title: "",
    fieldLabels: [],
    fallbackMessage: "",
  });
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successModalContext, setSuccessModalContext] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [vigikGalleryOpen, setVigikGalleryOpen] = useState(false);
  const [vigikGalleryIndex, setVigikGalleryIndex] = useState(0);
  const [vigikZoom, setVigikZoom] = useState(1);
  const [vigikPhotoCompressing, setVigikPhotoCompressing] = useState(false);
  const vigikTouchStartXRef = useRef(null);
  const draftPromptForIdRef = useRef(null);
  const suppressDraftAutosaveRef = useRef(false);

  const [draftSaveEnabled, setDraftSaveEnabled] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [signatureDraftRestoreUrl, setSignatureDraftRestoreUrl] = useState(null);
  /** Brouillon serveur (nouveau rapport sans id) — promouvoir → RapportIntervention. */
  const [serverBrouillonId, setServerBrouillonId] = useState(null);

  const formDataRef = useRef(null);
  const selectedResidenceRef = useRef(null);
  const pendingPhotosRef = useRef(null);
  const pendingPhotosPlatineRef = useRef(null);
  const pendingPhotosPlatinePortailRef = useRef(null);
  const rapportDataRef = useRef(null);
  const draftSaveEnabledRef = useRef(false);
  const savingRef = useRef(false);
  const isEditRef = useRef(isEdit);
  const rapportIdRef = useRef(rapportId);
  const serverBrouillonIdRef = useRef(null);
  const serverBrouillonLoadedRef = useRef(null);
  const lastDraftMediaRef = useRef(null);
  const draftPersistCoalesceRef = useRef({ pending: false, running: false });
  const scheduleDraftPersistenceImplRef = useRef(() => {});

  const handleSignatureDraftRestoreHandled = useCallback(() => {
    setSignatureDraftRestoreUrl(null);
    scheduleDraftPersistenceImplRef.current();
  }, []);

  formDataRef.current = formData;
  selectedResidenceRef.current = selectedResidence;
  pendingPhotosRef.current = pendingPhotos;
  pendingPhotosPlatineRef.current = pendingPhotosPlatine;
  pendingPhotosPlatinePortailRef.current = pendingPhotosPlatinePortail;
  rapportDataRef.current = rapportData;
  draftSaveEnabledRef.current = draftSaveEnabled;
  savingRef.current = saving;
  isEditRef.current = isEdit;
  rapportIdRef.current = rapportId;
  serverBrouillonIdRef.current = serverBrouillonId;

  const scheduleDraftPersistence = () => scheduleDraftPersistenceImplRef.current();

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const loadReferences = useCallback(async () => {
    try {
      const [titresRes, rapportsRes, societesRes, chantiersRes, residencesRes] = await Promise.all([
        fetchTitres(),
        axios.get("/api/rapports-intervention/", { params: { page_size: 200 } }),
        axios.get("/api/societe/"),
        axios.get("/api/chantier/"),
        axios.get("/api/residences/"),
      ]);
      setTitres(titresRes || []);
      const rapportsList = rapportsRes.data?.results || rapportsRes.data || [];
      const uniqueTechniciens = [...new Set(rapportsList.map((r) => r.technicien).filter(Boolean))];
      setTechniciensSuggestions(uniqueTechniciens);
      setSocietes(societesRes.data?.results || societesRes.data || []);
      setChantiers(chantiersRes.data?.results || chantiersRes.data || []);
      setResidences(residencesRes.data?.results || residencesRes.data || []);
    } catch (err) {
      console.error("Erreur chargement references:", err);
    }
  }, [fetchTitres]);

  const loadRapport = useCallback(async (explicitId) => {
    const id = explicitId ?? rapportId;
    if (!id) return;
    try {
      const data = await fetchRapport(id);
      setRapportData(data);
      setFormData({
        titre: data.titre || "",
        dates_intervention: normalizeDatesInterventionFromApi(data),
        technicien: data.technicien || "",
        objet_recherche: data.objet_recherche || "",
        resultat: data.resultat || "",
        temps_trajet: floatHoursToTimeInput(data.temps_trajet),
        temps_taches: floatHoursToTimeInput(data.temps_taches),
        client_societe: data.client_societe || "",
        chantier: data.chantier || "",
        residence: data.residence || null,
        residence_nom: data.residence_nom || "",
        residence_adresse: data.residence_adresse || "",
        adresse_vigik: data.adresse_vigik ?? "",
        logement: data.logement || "",
        locataire_nom: data.locataire_nom || "",
        locataire_prenom: data.locataire_prenom || "",
        locataire_telephone: data.locataire_telephone || "",
        locataire_email: data.locataire_email || "",
        type_rapport: data.type_rapport || "intervention",
        statut: data.statut || "a_faire",
        prestations: data.prestations?.length
          ? data.prestations
          : [{ ...EMPTY_PRESTATION }],
        numero_batiment: data.numero_batiment ?? "",
        type_installation: data.type_installation ?? "",
        presence_platine: data.presence_platine ?? null,
        presence_portail: data.presence_portail ?? null,
        presence_platine_portail: data.presence_platine_portail ?? null,
        devis_a_faire: !!data.devis_a_faire,
        devis_fait: !!data.devis_fait,
        devis_lie: data.devis_lie ?? null,
      });
      if (data.residence_data) {
        setSelectedResidence({ ...data.residence_data, optionType: "residence" });
      } else {
        setSelectedResidence(null);
      }
      if (data.type_rapport === "vigik_plus") {
        const platRows = data.vigik_platine_photos || [];
        setPendingPhotosPlatine(
          platRows
            .filter((row) => row?.s3_key || row?.url)
            .map((row, i) => ({
              clientId: createVigikClientPhotoId(),
              file: null,
              previewUrl: row.url || null,
              name: `photo-${i + 1}`,
              _draftS3Key: row.s3_key || null,
            }))
        );
        const portRows = data.vigik_platine_portail_photos || [];
        setPendingPhotosPlatinePortail(
          portRows
            .filter((row) => row?.s3_key || row?.url)
            .map((row, i) => ({
              clientId: createVigikClientPhotoId(),
              file: null,
              previewUrl: row.url || null,
              name: `photo-portail-${i + 1}`,
              _draftS3Key: row.s3_key || null,
            }))
        );
      } else {
        setPendingPhotosPlatine([]);
        setPendingPhotosPlatinePortail([]);
      }
    } catch (err) {
      showSnackbar("Erreur lors du chargement du rapport", "error");
    }
  }, [rapportId, fetchRapport]);

  useEffect(() => {
    loadReferences();
  }, [loadReferences]);

  useEffect(() => {
    if (rapportId) loadRapport();
  }, [rapportId, loadRapport]);

  useEffect(() => {
    if (!brouillonLoadId) {
      serverBrouillonLoadedRef.current = null;
    }
  }, [brouillonLoadId]);

  useEffect(() => {
    if (isEdit || !brouillonLoadId) return;
    if (serverBrouillonLoadedRef.current === brouillonLoadId) return;
    let cancel = false;
    (async () => {
      try {
        const { data } = await axios.get(`/api/rapports-intervention-brouillons/${brouillonLoadId}/`);
        if (cancel || !data?.payload) return;
        serverBrouillonLoadedRef.current = brouillonLoadId;
        setFormData(mergeFormDataFromApiPayload(data.payload));
        setServerBrouillonId(data.id);
        const dm = data.payload._draft_media;
        lastDraftMediaRef.current = dm || null;
        const typeRap = data.payload.type_rapport || "intervention";
        const isVigik = typeRap === "vigik_plus";
        const isV2 =
          dm &&
          (dm.version === 2 ||
            dm.signature_s3_key ||
            dm.prestation_photos ||
            dm.photo_platine_s3_key ||
            (Array.isArray(dm.photos_platine_s3_keys) && dm.photos_platine_s3_keys.length > 0));
        if (isV2) {
          const sigUrl = dm.signature_presigned_url || dm.signature_draft_data_url;
          setSignatureDraftRestoreUrl(sigUrl && String(sigUrl).length > 32 ? sigUrl : null);
          if (!isVigik && dm.prestation_photos && Object.keys(dm.prestation_photos).length > 0) {
            const out = {};
            for (const [idxStr, items] of Object.entries(dm.prestation_photos)) {
              if (!Array.isArray(items)) continue;
              out[idxStr] = [];
              for (const meta of items) {
                if (!meta?.s3_key) continue;
                const url = meta.presigned_url;
                if (url) {
                  try {
                    const blob = await fetch(url).then((r) => r.blob());
                    const file = new File([blob], meta.filename || "photo.jpg", { type: blob.type || "image/jpeg" });
                    out[idxStr].push({
                      file,
                      _previewUrl: URL.createObjectURL(file),
                      type_photo: meta.type_photo,
                      filename: meta.filename,
                      date_photo: meta.date_photo,
                      _draftS3Key: meta.s3_key,
                    });
                    continue;
                  } catch {
                    /* fallback _draftS3Key seul */
                  }
                }
                out[idxStr].push({
                  type_photo: meta.type_photo,
                  filename: meta.filename,
                  date_photo: meta.date_photo,
                  _draftS3Key: meta.s3_key,
                });
              }
            }
            setPendingPhotos(out);
          } else if (!isVigik) {
            setPendingPhotos({});
          }
          if (isVigik) {
            setPendingPhotos({});
            const platKeys = Array.isArray(dm.photos_platine_s3_keys)
              ? dm.photos_platine_s3_keys
              : Array.isArray(dm.vigik?.platine)
                ? dm.vigik.platine.map((item) => item?.s3_key).filter(Boolean)
              : dm.photo_platine_s3_key
                ? [dm.photo_platine_s3_key]
                : [];
            const platUrls = Array.isArray(dm.photo_platine_presigned_urls)
              ? dm.photo_platine_presigned_urls
              : Array.isArray(dm.vigik?.platine)
                ? dm.vigik.platine.map((item) => item?.url || null)
              : dm.photo_platine_presigned_url
                ? [dm.photo_platine_presigned_url]
                : [];
            const platOut = [];
            for (let i = 0; i < platKeys.length; i++) {
              const k = platKeys[i];
              const u = platUrls[i];
              if (!k) continue;
              if (u) {
                try {
                  const blob = await fetch(u).then((r) => r.blob());
                  const file = new File([blob], `platine-${i + 1}.jpg`, { type: blob.type || "image/jpeg" });
                  platOut.push({
                    file,
                    previewUrl: URL.createObjectURL(file),
                    name: file.name,
                    _draftS3Key: k,
                  });
                } catch {
                  platOut.push({ name: `platine-${i + 1}.jpg`, previewUrl: null, _draftS3Key: k, file: null });
                }
              } else {
                platOut.push({ name: `platine-${i + 1}.jpg`, previewUrl: null, _draftS3Key: k, file: null });
              }
            }
            setPendingPhotosPlatine((platOut || []).map(ensureVigikClientId));

            const portKeys = Array.isArray(dm.photos_platine_portail_s3_keys)
              ? dm.photos_platine_portail_s3_keys
              : Array.isArray(dm.vigik?.portail)
                ? dm.vigik.portail.map((item) => item?.s3_key).filter(Boolean)
              : dm.photo_platine_portail_s3_key
                ? [dm.photo_platine_portail_s3_key]
                : [];
            const portUrls = Array.isArray(dm.photo_platine_portail_presigned_urls)
              ? dm.photo_platine_portail_presigned_urls
              : Array.isArray(dm.vigik?.portail)
                ? dm.vigik.portail.map((item) => item?.url || null)
              : dm.photo_platine_portail_presigned_url
                ? [dm.photo_platine_portail_presigned_url]
                : [];
            const portOut = [];
            for (let i = 0; i < portKeys.length; i++) {
              const k = portKeys[i];
              const u = portUrls[i];
              if (!k) continue;
              if (u) {
                try {
                  const blob = await fetch(u).then((r) => r.blob());
                  const file = new File([blob], `platine-portail-${i + 1}.jpg`, { type: blob.type || "image/jpeg" });
                  portOut.push({
                    file,
                    previewUrl: URL.createObjectURL(file),
                    name: file.name,
                    _draftS3Key: k,
                  });
                } catch {
                  portOut.push({
                    name: `platine-portail-${i + 1}.jpg`,
                    previewUrl: null,
                    _draftS3Key: k,
                    file: null,
                  });
                }
              } else {
                portOut.push({ name: `platine-portail-${i + 1}.jpg`, previewUrl: null, _draftS3Key: k, file: null });
              }
            }
            setPendingPhotosPlatinePortail((portOut || []).map(ensureVigikClientId));
          } else {
            setPendingPhotosPlatine([]);
            setPendingPhotosPlatinePortail([]);
          }
        } else {
          const sigUrl = dm?.signature_draft_data_url;
          setSignatureDraftRestoreUrl(sigUrl && String(sigUrl).length > 32 ? sigUrl : null);
          const snap = deserializePhotoSnapshotFromPayload(dm?.photo_snapshot);
          if (snap && !photoSnapshotIsEmpty(snap)) {
            const applied = applyPhotoSnapshotToState(snap);
            setPendingPhotos(applied.pendingPhotos);
            setPendingPhotosPlatine((applied.pendingPhotosPlatine || []).map(ensureVigikClientId));
            setPendingPhotosPlatinePortail((applied.pendingPhotosPlatinePortail || []).map(ensureVigikClientId));
          } else {
            setPendingPhotos({});
            setPendingPhotosPlatine([]);
            setPendingPhotosPlatinePortail([]);
          }
        }
      } catch {
        serverBrouillonLoadedRef.current = null;
        setSnackbar({
          open: true,
          message: "Impossible de charger le brouillon serveur",
          severity: "error",
        });
      }
    })();
    return () => {
      cancel = true;
    };
  }, [isEdit, brouillonLoadId]);

  useEffect(() => {
    draftPromptForIdRef.current = null;
  }, [rapportId]);

  /** Brouillon local : nettoyage si vide ; pas de modal — reprise d’un brouillon via la liste (serveur). */
  useEffect(() => {
    if (isEdit) return;
    if (brouillonLoadId) {
      setDraftSaveEnabled(true);
      return;
    }
    const key = getRapportDraftStorageKey(null);
    const draft = readRapportDraftFromStorage(key);
    const hasPhotos = !!draft?.cachedPhotos;
    if (!draft || (!isDraftPayloadMeaningful(draft) && !hasPhotos)) {
      if (draft) {
        clearRapportDraftStorageKey(key);
        clearRapportDraftPhotos(key).catch(() => {});
      }
    }
    setDraftSaveEnabled(true);
  }, [isEdit, brouillonLoadId]);

  /** Brouillon local (édition) : même logique, pas de modal automatique. */
  useEffect(() => {
    if (!isEdit || !rapportId || !rapportData) return;
    if (draftPromptForIdRef.current === rapportId) return;
    draftPromptForIdRef.current = rapportId;
    const key = getRapportDraftStorageKey(rapportId);
    const draft = readRapportDraftFromStorage(key);
    const hasPhotos = !!draft?.cachedPhotos;
    if (!draft || (!isDraftPayloadMeaningful(draft) && !hasPhotos)) {
      if (draft) {
        clearRapportDraftStorageKey(key);
        clearRapportDraftPhotos(key).catch(() => {});
      }
    }
    setDraftSaveEnabled(true);
  }, [isEdit, rapportId, rapportData]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleVigikPresencePortailChange = (value) => {
    setFormData((prev) => {
      const next = { ...prev, presence_portail: value };
      if (value === false) {
        next.presence_platine_portail = null;
      }
      return next;
    });
    scheduleDraftPersistence();
  };

  const handleVigikPlatinePortailChange = (value) => {
    setFormData((prev) => ({ ...prev, presence_platine_portail: value }));
    if (value === false) {
      (pendingPhotosPlatinePortail || []).forEach((p) => {
        if (p?.previewUrl && String(p.previewUrl).startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
      });
      setPendingPhotosPlatinePortail([]);
    }
    scheduleDraftPersistence();
  };

  const residenceOptions = useMemo(() => {
    const fromRes = (residences || []).map((r) => ({
      ...r,
      optionType: "residence",
      key: `res-${r.id}`,
    }));
    const fromCh = (chantiers || []).map((c) => ({
      ...c,
      optionType: "chantier",
      nom: c.chantier_name,
      adresse: formatChantierAddress(c),
      chantierId: c.id,
      key: `ch-${c.id}`,
      client_societe_nom: c.societe && typeof c.societe === "object" ? c.societe.nom_societe : undefined,
    }));
    return [...fromRes, ...fromCh];
  }, [residences, chantiers]);

  const handleResidenceChange = (_, value) => {
    if (value == null) {
      setSelectedResidence(null);
      setFormData((prev) => ({
        ...prev,
        residence: null,
        residence_nom: "",
        residence_adresse: "",
        chantier: "",
      }));
      scheduleDraftPersistence();
      return;
    }
    if (typeof value === "string") {
      setSelectedResidence(null);
      setFormData((prev) => ({
        ...prev,
        residence: null,
        residence_nom: value,
        residence_adresse: "",
        chantier: "",
      }));
      scheduleDraftPersistence();
      return;
    }
    if (value && typeof value === "object" && value.inputValue != null) {
      const raw = String(value.inputValue || "").trim();
      setSelectedResidence(null);
      setFormData((prev) => ({
        ...prev,
        residence: null,
        residence_nom: raw,
        residence_adresse: "",
        chantier: "",
      }));
      scheduleDraftPersistence();
      return;
    }
    if (value && typeof value === "object" && value.optionType === "chantier") {
      const c = chantiers.find((ch) => ch.id === value.chantierId) || value;
      const addr = formatChantierAddress(c);
      setSelectedResidence({
        _fromChantier: true,
        chantierId: value.chantierId,
        nom: value.nom,
        adresse: addr,
        optionType: "chantier",
      });
      setFormData((prev) => ({
        ...prev,
        residence: null,
        residence_nom: value.nom,
        residence_adresse: addr,
        chantier: value.chantierId,
        client_societe: c.societe != null
          ? (typeof c.societe === "object" ? c.societe.id : c.societe)
          : prev.client_societe,
        technicien: prev.technicien,
      }));
      scheduleDraftPersistence();
      return;
    }
    if (value && typeof value === "object" && (value.optionType === "residence" || value.id) && !value.inputValue) {
      const res = value.optionType === "residence" ? value : { ...value, optionType: "residence" };
      setSelectedResidence(res);
      const dr = res.dernier_rapport;
      setFormData((prev) => ({
        ...prev,
        residence: res.id,
        residence_nom: res.nom,
        residence_adresse: res.adresse || "",
        client_societe: dr?.client_societe || res.client_societe || prev.client_societe,
        chantier: dr?.chantier || res.chantier || "",
        technicien: dr?.technicien || prev.technicien,
      }));
      scheduleDraftPersistence();
      return;
    }
    const newName = typeof value === "string" ? value : "";
    setSelectedResidence(null);
    setFormData((prev) => ({
      ...prev,
      residence: null,
      residence_nom: newName,
      residence_adresse: "",
      chantier: "",
    }));
    scheduleDraftPersistence();
  };

  /** Champ Chantier (liste dediee) : garde le meme etat que si le chantier est choisi dans Residence. */
  const handleChantierFieldChange = (_, val) => {
    if (!val) {
      if (selectedResidence?._fromChantier) {
        setSelectedResidence(null);
        setFormData((prev) => ({
          ...prev,
          chantier: "",
          residence_nom: "",
          residence_adresse: "",
        }));
      } else {
        handleFieldChange("chantier", "");
      }
      scheduleDraftPersistence();
      return;
    }
    const addr = formatChantierAddress(val);
    setFormData((prev) => ({
      ...prev,
      chantier: val.id,
      residence_nom: val.chantier_name,
      residence_adresse: addr,
      residence: null,
      client_societe:
        val.societe != null
          ? (typeof val.societe === "object" ? val.societe.id : val.societe)
          : prev.client_societe,
    }));
    setSelectedResidence({
      _fromChantier: true,
      chantierId: val.id,
      nom: val.chantier_name,
      adresse: addr,
      optionType: "chantier",
    });
    scheduleDraftPersistence();
  };

  const handleResidenceInputChange = (_, value, reason) => {
    if (reason === "input" && selectedResidence) {
      setSelectedResidence(null);
      setFormData((prev) => ({
        ...prev,
        residence: null,
        chantier: selectedResidence?._fromChantier ? "" : prev.chantier,
        residence_nom: value,
      }));
      return;
    }
    if (!selectedResidence) {
      setFormData((prev) => ({ ...prev, residence_nom: value }));
    }
  };

  useEffect(() => {
    if (!rapportId || !formData.chantier || formData.residence) return;
    if (rapportData?.residence_data) return;
    const c = chantiers.find((ch) => ch.id === formData.chantier);
    if (!c) return;
    setSelectedResidence({
      _fromChantier: true,
      chantierId: c.id,
      nom: c.chantier_name,
      adresse: formatChantierAddress(c),
      optionType: "chantier",
    });
  }, [rapportId, formData.chantier, formData.residence, rapportData?.residence_data, chantiers]);

  /** Nouveau rapport : résidence choisie par id (ex. chargement brouillon serveur) avant options chargées. */
  useEffect(() => {
    if (rapportId) return;
    if (!formData.residence) return;
    const r = residences.find((x) => x.id === formData.residence);
    if (!r) return;
    setSelectedResidence((prev) => {
      if (prev?.id === r.id && prev?.optionType === "residence" && !prev._fromChantier) return prev;
      return { ...r, optionType: "residence" };
    });
  }, [rapportId, formData.residence, residences]);

  const handlePrestationChange = (index, updatedPrestation) => {
    setFormData((prev) => {
      const newPrestations = [...prev.prestations];
      newPrestations[index] = updatedPrestation;
      return { ...prev, prestations: newPrestations };
    });
  };

  const handleAddPendingPhoto = (prestationIndex, file, typePhoto) => {
    const previewUrl = URL.createObjectURL(file);
    setPendingPhotos((prev) => {
      const current = prev[prestationIndex] || [];
      return {
        ...prev,
        [prestationIndex]: [...current, {
          file,
          type_photo: typePhoto,
          _previewUrl: previewUrl,
          filename: file.name,
          date_photo: new Date().toISOString().split("T")[0],
        }],
      };
    });
    scheduleDraftPersistence();
  };

  const handleRemovePendingPhoto = (prestationIndex, photoIndex) => {
    setPendingPhotos((prev) => {
      const current = [...(prev[prestationIndex] || [])];
      if (current[photoIndex]?._previewUrl) {
        URL.revokeObjectURL(current[photoIndex]._previewUrl);
      }
      current.splice(photoIndex, 1);
      return { ...prev, [prestationIndex]: current };
    });
    scheduleDraftPersistence();
  };

  const handleAddPrestation = () => {
    setFormData((prev) => ({
      ...prev,
      prestations: [...prev.prestations, { ...EMPTY_PRESTATION }],
    }));
    scheduleDraftPersistence();
  };

  const handleRemovePrestation = (index) => {
    setFormData((prev) => ({
      ...prev,
      prestations: prev.prestations.filter((_, i) => i !== index),
    }));
    scheduleDraftPersistence();
  };

  const uploadPendingPhotos = async (savedResult) => {
    const prestations = savedResult.prestations || [];
    const hasPending = Object.values(pendingPhotos).some((arr) => arr?.length > 0);
    if (!hasPending || !prestations.length) return;

    for (const [indexStr, photos] of Object.entries(pendingPhotos)) {
      const idx = parseInt(indexStr, 10);
      const prestation = prestations[idx];
      if (!prestation?.id || !photos?.length) continue;

      for (const pending of photos) {
        try {
          await uploadPhoto(prestation.id, pending.file, pending.type_photo);
        } catch (err) {
          console.error("Erreur upload photo en attente:", err);
        }
      }
    }
    setPendingPhotos({});
  };

  const uploadPendingSignature = async (savedRapportId) => {
    const signatureData = safeGetSignatureDataUrl(signaturePadRef);
    if (!signatureData) return;
    try {
      await uploadSignature(savedRapportId, signatureData);
      signaturePadRef.current?.clear?.();
    } catch (err) {
      console.error("Erreur upload signature:", err);
    }
  };

  const isVigikPlus = formData.type_rapport === "vigik_plus";
  const vigikPortailPhotosEnabled =
    formData.presence_portail === false ||
    (formData.presence_portail === true &&
      (formData.presence_platine_portail === true || formData.presence_platine_portail === false));
  const vigikPhotos = useMemo(() => {
    const out = [];
    const datePlat =
      latestInterventionISO(formData.dates_intervention) ||
      (rapportData?.date ? String(rapportData.date).slice(0, 10) : null) ||
      todayISO();
    (pendingPhotosPlatine || []).forEach((p, i) => {
      if (!p?.previewUrl) return;
      out.push({
        image_url: p.previewUrl,
        label: `Photo platine (${i + 1})`,
        date_photo: datePlat,
        pending: !!p.file,
      });
    });
    if (vigikPortailPhotosEnabled) {
      (pendingPhotosPlatinePortail || []).forEach((p, i) => {
        if (!p?.previewUrl) return;
        out.push({
          image_url: p.previewUrl,
          label: `Photo platine portail (${i + 1})`,
          date_photo: datePlat,
          pending: !!p.file,
        });
      });
    }
    return out;
  }, [
    pendingPhotosPlatine,
    pendingPhotosPlatinePortail,
    formData.dates_intervention,
    vigikPortailPhotosEnabled,
    rapportData?.date,
  ]);

  const openVigikGallery = (index) => {
    if (!vigikPhotos.length) return;
    const idx = Math.max(0, Math.min(index, vigikPhotos.length - 1));
    setVigikGalleryIndex(idx);
    setVigikGalleryOpen(true);
  };

  const closeVigikGallery = () => setVigikGalleryOpen(false);
  const goVigikPrev = () => {
    if (!vigikPhotos.length) return;
    setVigikGalleryIndex((prev) => (prev - 1 + vigikPhotos.length) % vigikPhotos.length);
  };
  const goVigikNext = () => {
    if (!vigikPhotos.length) return;
    setVigikGalleryIndex((prev) => (prev + 1) % vigikPhotos.length);
  };
  const activeVigikPhoto = vigikPhotos[vigikGalleryIndex] || null;

  useEffect(() => {
    if (!vigikGalleryOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") goVigikPrev();
      if (e.key === "ArrowRight") goVigikNext();
      if (e.key === "Escape") closeVigikGallery();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [vigikGalleryOpen, vigikPhotos.length]);

  useEffect(() => {
    if (vigikGalleryOpen) setVigikZoom(1);
  }, [vigikGalleryOpen, vigikGalleryIndex]);

  const handleVigikTouchStart = (e) => {
    vigikTouchStartXRef.current = e.changedTouches?.[0]?.clientX ?? null;
  };

  const handleVigikTouchEnd = (e) => {
    const startX = vigikTouchStartXRef.current;
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    if (startX == null || endX == null) return;
    const delta = endX - startX;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) goVigikPrev();
    else goVigikNext();
  };

  const validateClientBeforeSave = () => {
    const items = [];
    if (!isVigikPlus && !(formData.technicien || "").trim()) {
      items.push({ field: "Technicien", message: "Ce champ est obligatoire." });
    }
    if (!isVigikPlus && !(formData.objet_recherche || "").trim()) {
      items.push({ field: "Objet de la recherche", message: "Ce champ est obligatoire." });
    }
    if (isVigikPlus) {
      const hasResidence = formData.residence || (formData.residence_nom || "").trim();
      if (!hasResidence) {
        items.push({ field: "Résidence", message: "Sélectionnez ou créez une résidence." });
      }
      if (!(formData.adresse_vigik || "").trim()) {
        items.push({ field: "Adresse du rapport (Vigik+)", message: "Ce champ est obligatoire." });
      }
      if (formData.presence_portail !== true && formData.presence_portail !== false) {
        items.push({ field: RAPPORT_FIELD_LABELS.presence_portail, message: "Répondez à cette question." });
      }
      if (formData.presence_portail === true) {
        if (formData.presence_platine_portail !== true && formData.presence_platine_portail !== false) {
          items.push({
            field: RAPPORT_FIELD_LABELS.presence_platine_portail,
            message: "Répondez à cette question.",
          });
        }
      }
      const hasPhotoPlatine =
        (pendingPhotosPlatine || []).some((p) => p?.file || p?._draftS3Key || p?.previewUrl) ||
        (rapportData?.vigik_platine_photos || []).length > 0;
      if (!hasPhotoPlatine) {
        items.push({
          field: "Photo — présence de platine",
          message: "Joignez une photo sous la question « Présence de platine » (obligatoire pour Vigik+).",
        });
      }
    }
    const datesInterventionClean = (formData.dates_intervention || [])
      .map((s) => String(s).slice(0, 10))
      .filter(Boolean);
    if (!datesInterventionClean.length) {
      items.push({ field: "Dates d'intervention", message: "Au moins une date est requise." });
    }
    return { valid: items.length === 0, items };
  };

  const handleValidateClick = () => {
    const { valid, items } = validateClientBeforeSave();
    if (!valid) {
      setSaveErrorModal({
        open: true,
        title: "Champs à compléter",
        fieldLabels: uniqueFieldLabelsFromItems(items),
        fallbackMessage: "",
      });
      return;
    }
    executeValidateRapport();
  };

  const handleSuccessContinue = async () => {
    const ctx = successModalContext;
    setSuccessModalOpen(false);
    setSuccessModalContext(null);
    if (!ctx?.savedId) return;

    if (!ctx.isEdit) {
      if (onReportCreated) {
        onReportCreated(ctx.savedId);
      } else {
        navigate(`/RapportIntervention/${ctx.savedId}`, { replace: true });
      }
    }
    await loadRapport(ctx.savedId);
    loadReferences();
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!successModalOpen) return;
    const timer = setTimeout(() => {
      handleSuccessContinue();
    }, 2000);
    return () => clearTimeout(timer);
  }, [successModalOpen]);

  /** Construit le payload API ; `statutToSend` ex. brouillon, a_faire, en_cours, termine. */
  const buildRapportPayload = (statutToSend) => {
    const datesInterventionClean = (formData.dates_intervention || [])
      .map((s) => String(s).slice(0, 10))
      .filter(Boolean);
    const vigikTitre = isVigikPlus && !formData.titre ? (titres.find((t) => t.nom === "Rapport Vigik+") || titres[0])?.id : formData.titre;
    const normalizeFk = (value) => (value === "" || value === undefined ? null : value);
    return {
      ...formData,
      dates_intervention: datesInterventionClean,
      temps_trajet: timeInputToFloatHours(formData.temps_trajet),
      temps_taches: timeInputToFloatHours(formData.temps_taches),
      titre: normalizeFk(isVigikPlus ? (vigikTitre || formData.titre) : formData.titre),
      client_societe: normalizeFk(formData.client_societe),
      chantier: normalizeFk(formData.chantier),
      statut: statutToSend,
      numero_batiment: formData.numero_batiment ?? "",
      type_installation: formData.type_installation ?? "",
      presence_platine: formData.presence_platine,
      presence_portail: formData.presence_portail,
      presence_platine_portail: formData.presence_platine_portail,
      devis_a_faire: !!formData.devis_a_faire,
      devis_fait: !!formData.devis_fait,
      devis_lie: formData.devis_lie || null,
      prestations: isVigikPlus
        ? []
        : formData.prestations.map((p, i) => ({
            ...p,
            id: p.id || undefined,
            ordre: i,
            photos: undefined,
          })),
    };
  };

  const uploadPhotosAndSignatureAfterSave = async (savedId, result, opts = {}) => {
    if (opts.skipPendingUpload) return;
    if (savedId == null || savedId === undefined) return;
    if (!isVigikPlus && result?.prestations) {
      await uploadPendingPhotos(result);
    } else if (!isVigikPlus) {
      const fullResult = await fetchRapport(savedId);
      await uploadPendingPhotos(fullResult);
    }

    if (isVigikPlus) {
      for (const p of pendingPhotosPlatineRef.current || []) {
        if (!p?.file) continue;
        const fd = new FormData();
        fd.append("rapport_id", savedId);
        fd.append("photo", p.file);
        await axios.post("/api/rapports-intervention/upload_photo_platine/", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (p.previewUrl && String(p.previewUrl).startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
      }
      if (
        formDataRef.current?.presence_portail === false ||
        (formDataRef.current?.presence_portail === true &&
          (formDataRef.current?.presence_platine_portail === true ||
            formDataRef.current?.presence_platine_portail === false))
      ) {
        for (const p of pendingPhotosPlatinePortailRef.current || []) {
          if (!p?.file) continue;
          const fd = new FormData();
          fd.append("rapport_id", savedId);
          fd.append("photo", p.file);
          await axios.post("/api/rapports-intervention/upload_photo_platine_portail/", fd, {
            headers: { "Content-Type": "multipart/form-data" },
          });
          if (p.previewUrl && String(p.previewUrl).startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
        }
      }
      await loadRapport(savedId);
    }

    if (!isVigikPlus) await uploadPendingSignature(savedId);
  };

  /**
   * Brouillon serveur : upload S3 (même logique que les rapports) puis manifeste `_draft_media` v2.
   * Sans `bid`, retourne null (pas de médias dans le JSON tant que le brouillon n’existe pas).
   */
  const buildDraftMediaForServer = useCallback(async (bid) => {
    if (!bid) return null;
    const pp = pendingPhotosRef.current || {};
    const platItems = pendingPhotosPlatineRef.current || [];
    const portItems = pendingPhotosPlatinePortailRef.current || [];
    const vigik = formDataRef.current?.type_rapport === "vigik_plus";
    const dateRef = latestInterventionISO(formDataRef.current?.dates_intervention) || todayISO();

    const prestation_photos = {};
    for (const [idxStr, arr] of Object.entries(pp)) {
      if (!arr?.length) continue;
      const row = [];
      for (const p of arr) {
        if (p._draftS3Key) {
          row.push({
            s3_key: p._draftS3Key,
            type_photo: p.type_photo || "avant",
            filename: p.filename || p.file?.name || "photo.jpg",
            date_photo: p.date_photo || dateRef,
          });
          continue;
        }
        if (!p.file) continue;
        const fd = new FormData();
        fd.append("photo", p.file);
        fd.append("prestation_index", idxStr);
        fd.append("type_photo", p.type_photo || "avant");
        fd.append("date_photo", p.date_photo || dateRef);
        const { data } = await axios.post(
          `/api/rapports-intervention-brouillons/${bid}/upload_photo/`,
          fd,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        row.push({
          s3_key: data.s3_key,
          type_photo: data.type_photo || p.type_photo || "avant",
          filename: data.filename || p.filename || "photo.jpg",
          date_photo: data.date_photo || p.date_photo || dateRef,
        });
      }
      if (row.length) prestation_photos[idxStr] = row;
    }

    let signature_s3_key = lastDraftMediaRef.current?.signature_s3_key ?? null;
    const sigData = safeGetSignatureDataUrl(signaturePadRef);
    const padHasVisual = signaturePadRef.current?.hasSignature?.() ?? false;
    if (sigData && String(sigData).length > 32) {
      const { data: sigRes } = await axios.post(`/api/rapports-intervention-brouillons/${bid}/upload_signature/`, {
        signature: sigData,
      });
      signature_s3_key = sigRes.s3_key || null;
    } else if (padHasVisual && signature_s3_key) {
      /* Canvas non exportable (ex. image sans CORS avant correctif) : on garde la clé S3 déjà enregistrée. */
    }

    const photos_platine_s3_keys = [];
    const photos_platine_portail_s3_keys = [];
    if (vigik) {
      const nextPlatState = [];
      const replacedPlatClientIds = new Set();
      const platBlobUrlsToRevoke = [];
      for (const p of platItems) {
        const clientId = p?.clientId || createVigikClientPhotoId();
        if (p._draftS3Key) {
          photos_platine_s3_keys.push(p._draftS3Key);
          nextPlatState.push({ ...p, clientId, file: null });
          continue;
        }
        if (!p.file) continue;
        const fd = new FormData();
        fd.append("photo", p.file);
        const { data } = await axios.post(
          `/api/rapports-intervention-brouillons/${bid}/upload_photo_platine/`,
          fd,
          { headers: { "Content-Type": "multipart/form-data" } }
        );
        replacedPlatClientIds.add(clientId);
        if (data.s3_key) photos_platine_s3_keys.push(data.s3_key);
        const nextPreviewUrl = data.url || data.presigned_url || p.previewUrl || null;
        if (
          p.previewUrl &&
          String(p.previewUrl).startsWith("blob:") &&
          nextPreviewUrl !== p.previewUrl
        ) {
          platBlobUrlsToRevoke.push(p.previewUrl);
        }
        nextPlatState.push({
          clientId,
          _draftS3Key: data.s3_key,
          name: p.name || "photo.jpg",
          file: null,
          previewUrl: nextPreviewUrl,
        });
      }
      setPendingPhotosPlatine((prev) => {
        const next = [...nextPlatState];
        const seenClientIds = new Set(next.map((p) => p.clientId).filter(Boolean));
        const seenS3 = new Set(next.map((p) => p?._draftS3Key).filter(Boolean));
        for (const pRaw of prev || []) {
          const p = ensureVigikClientId(pRaw);
          if (seenClientIds.has(p.clientId)) continue;
          if (replacedPlatClientIds.has(p.clientId)) continue;
          if (p?._draftS3Key && seenS3.has(p._draftS3Key)) continue;
          if (p?.previewUrl && String(p.previewUrl).startsWith("blob:") && !p?.file) continue;
          if (p?.file || p?._draftS3Key) {
            next.push(p);
            seenClientIds.add(p.clientId);
            if (p?._draftS3Key) seenS3.add(p._draftS3Key);
          }
        }
        return next;
      });
      platBlobUrlsToRevoke.forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {
          /* noop */
        }
      });

      const fdVigik = formDataRef.current;
      const allowPortailPhoto =
        fdVigik?.presence_portail === false ||
        (fdVigik?.presence_portail === true &&
          (fdVigik?.presence_platine_portail === true || fdVigik?.presence_platine_portail === false));
      const nextPortState = [];
      const replacedPortClientIds = new Set();
      const portBlobUrlsToRevoke = [];
      if (allowPortailPhoto) {
        for (const p of portItems) {
          const clientId = p?.clientId || createVigikClientPhotoId();
          if (p._draftS3Key) {
            photos_platine_portail_s3_keys.push(p._draftS3Key);
            nextPortState.push({ ...p, clientId, file: null });
            continue;
          }
          if (!p.file) continue;
          const fd = new FormData();
          fd.append("photo", p.file);
          const { data } = await axios.post(
            `/api/rapports-intervention-brouillons/${bid}/upload_photo_platine_portail/`,
            fd,
            { headers: { "Content-Type": "multipart/form-data" } }
          );
          replacedPortClientIds.add(clientId);
          if (data.s3_key) photos_platine_portail_s3_keys.push(data.s3_key);
          const nextPreviewUrl = data.url || data.presigned_url || p.previewUrl || null;
          if (
            p.previewUrl &&
            String(p.previewUrl).startsWith("blob:") &&
            nextPreviewUrl !== p.previewUrl
          ) {
            portBlobUrlsToRevoke.push(p.previewUrl);
          }
          nextPortState.push({
            clientId,
            _draftS3Key: data.s3_key,
            name: p.name || "photo.jpg",
            file: null,
            previewUrl: nextPreviewUrl,
          });
        }
        setPendingPhotosPlatinePortail((prev) => {
          const next = [...nextPortState];
          const seenClientIds = new Set(next.map((p) => p.clientId).filter(Boolean));
          const seenS3 = new Set(next.map((p) => p?._draftS3Key).filter(Boolean));
          for (const pRaw of prev || []) {
            const p = ensureVigikClientId(pRaw);
            if (seenClientIds.has(p.clientId)) continue;
            if (replacedPortClientIds.has(p.clientId)) continue;
            if (p?._draftS3Key && seenS3.has(p._draftS3Key)) continue;
            if (p?.previewUrl && String(p.previewUrl).startsWith("blob:") && !p?.file) continue;
            if (p?.file || p?._draftS3Key) {
              next.push(p);
              seenClientIds.add(p.clientId);
              if (p?._draftS3Key) seenS3.add(p._draftS3Key);
            }
          }
          return next;
        });
        portBlobUrlsToRevoke.forEach((u) => {
          try {
            URL.revokeObjectURL(u);
          } catch {
            /* noop */
          }
        });
      } else if (fdVigik?.presence_portail === true && fdVigik?.presence_platine_portail === false) {
        setPendingPhotosPlatinePortail([]);
      }
    }

    const hasV2 =
      signature_s3_key ||
      (vigik && photos_platine_s3_keys.length > 0) ||
      (vigik && photos_platine_portail_s3_keys.length > 0) ||
      Object.keys(prestation_photos).length > 0;
    if (!hasV2) return null;

    setPendingPhotos((prev) => {
      const next = { ...prev };
      for (const idxStr of Object.keys(prestation_photos)) {
        const metaList = prestation_photos[idxStr];
        const arr = next[idxStr] || [];
        next[idxStr] = arr.map((item, i) => {
          const m = metaList[i];
          if (m?.s3_key && !item._draftS3Key) return { ...item, _draftS3Key: m.s3_key };
          return item;
        });
      }
      return next;
    });

    const media = {
      version: 2,
      signature_s3_key,
      prestation_photos: vigik ? {} : prestation_photos,
    };
    if (vigik) {
      media.photos_platine_s3_keys = photos_platine_s3_keys;
      media.photos_platine_portail_s3_keys = photos_platine_portail_s3_keys;
    }
    return media;
  }, []);

  /**
   * @param {string} statutToSend
   * @param {{ silent?: boolean, navigateAfterCreate?: boolean }} opts — silent = brouillon auto, pas de modale succès
   */
  const persistRapportCore = async (statutToSend, { silent = false, navigateAfterCreate = true } = {}) => {
    let dataToSend = buildRapportPayload(statutToSend);
    const hadNoId = !rapportId;

    if (!rapportId) {
      try {
        let bid = serverBrouillonIdRef.current;
        if (!bid) {
          const br = await createRapportBrouillon({
            payload: { ...buildRapportPayload(statutToSend), _draft_media: null },
          });
          setServerBrouillonId(br.id);
          bid = br.id;
        }
        const media = await buildDraftMediaForServer(bid);
        dataToSend = { ...buildRapportPayload(statutToSend), _draft_media: media };
        lastDraftMediaRef.current = media;
        await patchRapportBrouillon(bid, { payload: dataToSend });
      } catch (err) {
        console.warn("Sauvegarde brouillon serveur :", err);
        throw err;
      }
      if (silent) {
        return null;
      }
      return null;
    }

    const result = await updateRapport(rapportId, dataToSend);
    const savedId = result?.id || rapportId;
    await uploadPhotosAndSignatureAfterSave(savedId, result);

    if (silent) {
      await loadRapport(savedId);
      setFormData((prev) => ({ ...prev, statut: statutToSend }));
      return savedId;
    }

    setSuccessModalContext({ isEdit: !!rapportId, savedId });
    setSuccessModalOpen(true);
    clearRapportDraftStorageKey(getRapportDraftStorageKey(null));
    clearRapportDraftStorageKey(getRapportDraftStorageKey(savedId));
    clearRapportDraftPhotos(getRapportDraftStorageKey(null)).catch(() => {});
    clearRapportDraftPhotos(getRapportDraftStorageKey(savedId)).catch(() => {});
    return savedId;
  };

  const executeValidateRapport = async () => {
    suppressDraftAutosaveRef.current = true;
    setSaving(true);
    try {
      if (!rapportId) {
        let bid = serverBrouillonIdRef.current;
        if (!bid) {
          const br = await createRapportBrouillon({
            payload: { ...buildRapportPayload("brouillon"), _draft_media: null },
          });
          bid = br.id;
          setServerBrouillonId(bid);
        }
        const media = await buildDraftMediaForServer(bid);
        await patchRapportBrouillon(bid, {
          payload: { ...buildRapportPayload("brouillon"), _draft_media: media },
        });
        lastDraftMediaRef.current = media;
        const mergePayload = buildRapportPayload("en_cours");
        const result = await promouvoirRapportBrouillon(bid, mergePayload);
        const savedId = result?.id;
        if (!savedId) {
          throw new Error("Réponse invalide après promotion du brouillon");
        }
        setPendingPhotos({});
        setPendingPhotosPlatine([]);
        setPendingPhotosPlatinePortail([]);
        setSignatureDraftRestoreUrl(null);
        await uploadPhotosAndSignatureAfterSave(savedId, result, { skipPendingUpload: true });
        setSuccessModalContext({ isEdit: false, savedId });
        setSuccessModalOpen(true);
        setServerBrouillonId(null);
        lastDraftMediaRef.current = null;
        clearRapportDraftStorageKey(getRapportDraftStorageKey(null));
        clearRapportDraftPhotos(getRapportDraftStorageKey(null)).catch(() => {});
      } else {
        await persistRapportCore("en_cours", { silent: false });
      }
    } catch (err) {
      const payload = buildSaveErrorFromApi(err);
      setSaveErrorModal({ open: true, ...payload });
    } finally {
      setSaving(false);
      suppressDraftAutosaveRef.current = false;
    }
  };

  const persistRapportCoreRef = useRef(persistRapportCore);
  persistRapportCoreRef.current = persistRapportCore;

  /**
   * Brouillon local + sauvegarde serveur déclenchés à la fin d’interaction (blur, liste, photo…),
   * pas sur chaque frappe ni sur un intervalle fixe.
   */
  scheduleDraftPersistenceImplRef.current = () => {
    if (!draftSaveEnabledRef.current) return;
    if (rapportDataRef.current?.statut === "termine") return;
    if (suppressDraftAutosaveRef.current) return;
    if (savingRef.current) return;

    const q = draftPersistCoalesceRef.current;
    if (q.running) {
      q.pending = true;
      return;
    }
    q.running = true;
    q.pending = false;
    setTimeout(async () => {
      const runOnce = async () => {
        if (suppressDraftAutosaveRef.current) return;
        const key = getRapportDraftStorageKey(isEditRef.current ? rapportIdRef.current : null);
        const fd = formDataRef.current;
        const sr = selectedResidenceRef.current;
        const pp = pendingPhotosRef.current;
        const pPlat = pendingPhotosPlatineRef.current;
        const pPort = pendingPhotosPlatinePortailRef.current;
        const hasPendingPhotos =
          Object.values(pp || {}).some((arr) => arr?.length > 0) ||
          (pPlat && pPlat.length > 0) ||
          (pPort && pPort.length > 0);
        const sigDraft = safeGetSignatureDataUrl(signaturePadRef);
        const padHasSig = signaturePadRef.current?.hasSignature?.() ?? false;
        const signatureTaintedButPresent = padHasSig && !sigDraft;
        const draftHasContent =
          isDraftPayloadMeaningful({ formData: fd, signatureDraftDataUrl: sigDraft }) ||
          hasPendingPhotos ||
          signatureTaintedButPresent;

        if (!draftHasContent) {
          clearRapportDraftStorageKey(key);
          try {
            await clearRapportDraftPhotos(key);
          } catch {
            /* ignore */
          }
        } else {
          const snapshot = buildPhotoSnapshot(pp, pPlat, pPort);
          try {
            await saveRapportDraftPhotos(key, snapshot);
            writeRapportDraftToStorage(key, fd, sr, {
              cachedPhotos: !photoSnapshotIsEmpty(snapshot),
              signatureDraftDataUrl: sigDraft,
            });
          } catch (e) {
            console.warn("Brouillon photos (IndexedDB) :", e);
            writeRapportDraftToStorage(key, fd, sr, {
              cachedPhotos: false,
              signatureDraftDataUrl: sigDraft,
            });
          }
        }

        if (suppressDraftAutosaveRef.current) return;
        if (savingRef.current) return;
        const ds = rapportDataRef.current?.statut ?? fd.statut ?? "brouillon";
        if (ds === "termine") return;
        setSavingDraft(true);
        try {
          await persistRapportCoreRef.current(ds, { silent: true, navigateAfterCreate: true });
        } catch (err) {
          console.warn("Sauvegarde brouillon :", err);
        } finally {
          setSavingDraft(false);
        }
      };

      try {
        do {
          q.pending = false;
          await runOnce();
        } while (q.pending);
      } finally {
        q.running = false;
      }
    }, 0);
  };

  const handleGeneratePdf = async () => {
    if (!rapportId) return;
    setPdfGenerating(true);
    setSnackbar({ open: true, message: "Generation du PDF en cours...", severity: "info" });
    try {
      await genererPdf(rapportId);
      showSnackbar("PDF genere avec succes");
      await loadRapport();
    } catch (err) {
      showSnackbar("Erreur lors de la generation du PDF", "error");
    } finally {
      setPdfGenerating(false);
    }
  };

  const handleUploadPhoto = async (prestationId, file, typePhoto) => {
    try {
      await uploadPhoto(prestationId, file, typePhoto);
      showSnackbar("Photo ajoutee");
      await loadRapport();
    } catch (err) {
      showSnackbar("Erreur upload photo", "error");
    }
  };

  const handleDeletePhoto = async (photoId) => {
    try {
      await deletePhoto(photoId);
      showSnackbar("Photo supprimee");
      await loadRapport();
    } catch (err) {
      showSnackbar("Erreur suppression photo", "error");
    }
  };

  const appendVigikPlatineFiles = async (fileList) => {
    const arr = Array.from(fileList || []).filter(Boolean);
    if (!arr.length) return;
    setVigikPhotoCompressing(true);
    try {
      const processed = await Promise.all(arr.map((f) => compressImage(f, VIGIK_REPORT_PHOTO_OPTIONS)));
      setPendingPhotosPlatine((prev) => {
        const next = (prev || []).map(ensureVigikClientId);
        for (const file of processed) {
          next.push({
            clientId: createVigikClientPhotoId(),
            file,
            name: file.name,
            previewUrl: URL.createObjectURL(file),
          });
        }
        return next;
      });
      scheduleDraftPersistence();
    } catch (err) {
      console.warn("Compression photo Vigik+ platine:", err);
      showSnackbar("Impossible de traiter une ou plusieurs images.", "error");
    } finally {
      setVigikPhotoCompressing(false);
    }
  };

  const removeVigikPlatineAt = async (index) => {
    const list = pendingPhotosPlatineRef.current || [];
    const p = list[index];
    if (!p) return;
    if (p.previewUrl && String(p.previewUrl).startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
    const rid = rapportIdRef.current;
    const bid = serverBrouillonIdRef.current;
    try {
      if (p._draftS3Key && rid) {
        await axios.post("/api/rapports-intervention/delete_photo_vigik/", {
          rapport_id: rid,
          s3_key: p._draftS3Key,
          question: "platine",
        });
      } else if (p._draftS3Key && bid) {
        await axios.post(`/api/rapports-intervention-brouillons/${bid}/delete_photo_vigik/`, {
          s3_key: p._draftS3Key,
          question: "platine",
        });
      }
    } catch (e) {
      console.warn("Suppression photo Vigik+ platine:", e);
    }
    setPendingPhotosPlatine((prev) => prev.filter((_, i) => i !== index));
    scheduleDraftPersistence();
  };

  const appendVigikPortailFiles = async (fileList) => {
    const arr = Array.from(fileList || []).filter(Boolean);
    if (!arr.length) return;
    setVigikPhotoCompressing(true);
    try {
      const processed = await Promise.all(arr.map((f) => compressImage(f, VIGIK_REPORT_PHOTO_OPTIONS)));
      setPendingPhotosPlatinePortail((prev) => {
        const next = (prev || []).map(ensureVigikClientId);
        for (const file of processed) {
          next.push({
            clientId: createVigikClientPhotoId(),
            file,
            name: file.name,
            previewUrl: URL.createObjectURL(file),
          });
        }
        return next;
      });
      scheduleDraftPersistence();
    } catch (err) {
      console.warn("Compression photo Vigik+ portail:", err);
      showSnackbar("Impossible de traiter une ou plusieurs images.", "error");
    } finally {
      setVigikPhotoCompressing(false);
    }
  };

  const removeVigikPortailAt = async (index) => {
    const list = pendingPhotosPlatinePortailRef.current || [];
    const p = list[index];
    if (!p) return;
    if (p.previewUrl && String(p.previewUrl).startsWith("blob:")) URL.revokeObjectURL(p.previewUrl);
    const rid = rapportIdRef.current;
    const bid = serverBrouillonIdRef.current;
    try {
      if (p._draftS3Key && rid) {
        await axios.post("/api/rapports-intervention/delete_photo_vigik/", {
          rapport_id: rid,
          s3_key: p._draftS3Key,
          question: "portail",
        });
      } else if (p._draftS3Key && bid) {
        await axios.post(`/api/rapports-intervention-brouillons/${bid}/delete_photo_vigik/`, {
          s3_key: p._draftS3Key,
          question: "portail",
        });
      }
    } catch (e) {
      console.warn("Suppression photo Vigik+ portail:", e);
    }
    setPendingPhotosPlatinePortail((prev) => prev.filter((_, i) => i !== index));
    scheduleDraftPersistence();
  };

  const handleUpdatePhoto = async (photoId, data) => {
    try {
      await updatePhoto(photoId, data);
      showSnackbar("Photo mise a jour");
      await loadRapport();
    } catch (err) {
      showSnackbar("Erreur mise a jour photo", "error");
    }
  };

  const handleCreateTitre = async () => {
    if (!newTitreName.trim()) return;
    try {
      const newTitre = await createTitre(newTitreName.trim());
      setTitres((prev) => [...prev, newTitre]);
      setFormData((prev) => ({ ...prev, titre: newTitre.id }));
      setNewTitreDialog(false);
      setNewTitreName("");
      showSnackbar("Nouveau titre cree");
      scheduleDraftPersistence();
    } catch (err) {
      showSnackbar("Erreur creation titre", "error");
    }
  };

  const handleDeleteSelectedTitre = async () => {
    const selectedTitreId = formData.titre;
    if (!selectedTitreId) {
      showSnackbar("Veuillez selectionner un titre a supprimer", "warning");
      return;
    }
    const selectedTitre = titres.find((t) => t.id === selectedTitreId);
    setTitreToDelete(selectedTitre || { id: selectedTitreId, nom: "selectionne" });
    setDeleteTitreDialogOpen(true);
  };

  const handleConfirmDeleteTitre = async () => {
    if (!titreToDelete?.id) return;
    try {
      await deleteTitre(titreToDelete.id);
      setTitres((prev) => prev.filter((t) => t.id !== titreToDelete.id));
      setFormData((prev) => ({ ...prev, titre: "" }));
      setDeleteTitreDialogOpen(false);
      setTitreToDelete(null);
      showSnackbar("Titre supprime");
      scheduleDraftPersistence();
    } catch (err) {
      showSnackbar("Impossible de supprimer ce titre (il est peut-etre deja utilise)", "error");
    }
  };

  const isDisabled = rapportData?.statut === "termine";
  const isNewResidence = !selectedResidence && !!formData.residence_nom;

  const sectionSpacing = isMobile ? 4 : 3;
  const fieldGap = isMobile ? 3 : 2;
  const inputMinHeight = isMobile ? 48 : undefined;

  /** MenuProps pour Select : liste déroulante scrollable sur mobile */
  const selectMenuProps = {
    PaperProps: { sx: { maxHeight: isMobile ? "70vh" : 320 } },
    MenuListProps: { sx: { maxHeight: isMobile ? "70vh" : 320, overflow: "auto" } },
  };
  /** Props liste pour Autocomplete : dropdown scrollable sur mobile */
  const autocompleteListboxProps = {
    sx: { maxHeight: isMobile ? "70vh" : 320, overflow: "auto" },
  };

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3, md: 3 },
        pb: { xs: "max(env(safe-area-inset-bottom), 24px)", md: 3 },
        maxWidth: 1000,
        mx: "auto",
        "& .MuiOutlinedInput-root": {
          minHeight: inputMinHeight,
          borderRadius: 1,
          fontSize: isMobile ? "1rem" : undefined,
        },
        "& .MuiInputLabel-outlined": isMobile ? { fontSize: "1rem" } : {},
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          justifyContent: "space-between",
          alignItems: { xs: "stretch", md: "center" },
          mb: sectionSpacing,
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button
              startIcon={<MdArrowBack />}
              onClick={onBack || (() => navigate("/RapportsIntervention"))}
              sx={{
                color: { xs: "#000", md: "#fff" },
                minHeight: isMobile ? 48 : 36,
                fontWeight: 600,
              }}
            >
              Retour
            </Button>
            {rapportData?.statut && (
              <Chip
                label={
                  rapportData.statut === "termine"
                    ? "Terminé"
                    : rapportData.statut === "en_cours"
                      ? "En cours"
                      : rapportData.statut === "brouillon"
                        ? "Brouillon"
                        : "A faire"
                }
                size="small"
                color={
                  rapportData.statut === "termine"
                    ? "success"
                    : rapportData.statut === "en_cours"
                      ? "warning"
                      : rapportData.statut === "brouillon"
                        ? "info"
                        : "default"
                }
                sx={isMobile ? { borderRadius: 1, minHeight: 32, px: 1.5 } : {}}
              />
            )}
          </Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              color: { xs: "#000", md: "#fff" },
              fontSize: { xs: "1.25rem", md: "1.5rem" },
            }}
          >
            {isEdit ? "Modifier le rapport" : isVigikPlus ? "Nouveau rapport Vigik+" : "Nouveau rapport d'intervention"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", "& .MuiButton-root": { minHeight: isMobile ? 48 : 36 } }}>
          {!saveButtonAtBottom && !isDisabled && (
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} /> : <MdCheckCircle />}
              onClick={handleValidateClick}
              disabled={saving || savingDraft}
              sx={{ backgroundColor: COLORS.infoDark || "#1976d2" }}
            >
              {saving ? "Validation..." : "Valider le rapport"}
            </Button>
          )}
          {isEdit && (
            <Button
              variant="contained"
              startIcon={pdfGenerating ? <CircularProgress size={18} color="inherit" /> : <MdPictureAsPdf />}
              onClick={handleGeneratePdf}
              disabled={saving || pdfGenerating}
              sx={{ backgroundColor: "#e65100", color: "#fff", "&:hover": { backgroundColor: "#bf360c" } }}
            >
              {pdfGenerating ? "Generation..." : "Generer PDF"}
            </Button>
          )}
        </Box>
      </Box>

      {/* Informations generales */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: sectionSpacing,
          borderRadius: 2,
          border: `1px solid ${COLORS.border || "#e0e0e0"}`,
        }}
      >
        <Typography variant="h6" sx={{ mb: { xs: 2.5, md: 2 }, fontWeight: 600, color: COLORS.primary }}>
          Informations generales
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: fieldGap }}>
          <FormControl fullWidth size="small">
            <InputLabel>Type de rapport</InputLabel>
            <Select
              value={formData.type_rapport}
              label="Type de rapport"
              onChange={(e) => {
                handleFieldChange("type_rapport", e.target.value);
                scheduleDraftPersistence();
              }}
              disabled={isDisabled}
              MenuProps={selectMenuProps}
            >
              <MenuItem value="intervention">Rapport d'intervention</MenuItem>
              <MenuItem value="vigik_plus">Vigik+</MenuItem>
            </Select>
          </FormControl>

          {!isVigikPlus && (
          <Box sx={{ display: "flex", gap: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Titre</InputLabel>
              <Select
                value={formData.titre}
                label="Titre"
                onChange={(e) => {
                  handleFieldChange("titre", e.target.value);
                  scheduleDraftPersistence();
                }}
                disabled={isDisabled}
                MenuProps={selectMenuProps}
              >
                {titres.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.nom}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setNewTitreDialog(true)}
              disabled={isDisabled}
              sx={{ minWidth: 40, px: 1 }}
              title="Ajouter un titre"
            >
              <MdAdd />
            </Button>
            <Button
              variant="outlined"
              size="small"
              color="error"
              onClick={handleDeleteSelectedTitre}
              disabled={isDisabled || !formData.titre}
              sx={{ minWidth: 40, px: 1 }}
              title="Supprimer le titre selectionne"
            >
              <MdDelete />
            </Button>
          </Box>
          )}

          <Autocomplete
            freeSolo
            options={residenceOptions}
            getOptionLabel={(opt) => {
              if (typeof opt === "string") return opt;
              return opt?.nom || "";
            }}
            value={selectedResidence || formData.residence_nom || ""}
            onChange={handleResidenceChange}
            onInputChange={handleResidenceInputChange}
            filterOptions={(options, params) => {
              const q = (params.inputValue || "").trim().toLowerCase();
              const filtered = options.filter((o) => {
                const nom = (o.nom || "").toLowerCase();
                const adr = (o.adresse || "").toLowerCase();
                const client = (o.client_societe_nom || o.dernier_rapport?.client_societe_nom || "").toLowerCase();
                return !q || nom.includes(q) || adr.includes(q) || client.includes(q);
              });
              if (params.inputValue && !filtered.some((o) => o.nom && o.nom.toLowerCase() === params.inputValue.toLowerCase())) {
                filtered.push({ inputValue: params.inputValue, nom: `Creer "${params.inputValue}"` });
              }
              return filtered;
            }}
            renderOption={(props, option) => (
              <li {...props} key={option.key || option.id || option.inputValue || option.nom}>
                <Box sx={{ py: 0.25 }}>
                  <Typography variant="body2" sx={{ fontWeight: option.inputValue ? 600 : 400 }}>
                    {option.nom}
                  </Typography>
                  {option.adresse && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      {option.adresse}
                    </Typography>
                  )}
                  {(option.client_societe_nom || option.dernier_rapport?.client_societe_nom) && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Client: {option.dernier_rapport?.client_societe_nom || option.client_societe_nom}
                    </Typography>
                  )}
                  {option.dernier_rapport?.technicien && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                      Technicien: {option.dernier_rapport.technicien}
                    </Typography>
                  )}
                </Box>
              </li>
            )}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Residence *"
                size="small"
                helperText="Residences enregistrees et chantiers (nom + adresse du chantier)"
                onBlur={(e) => {
                  params.inputProps?.onBlur?.(e);
                  scheduleDraftPersistence();
                }}
              />
            )}
            disabled={isDisabled}
            isOptionEqualToValue={(opt, val) => {
              if (typeof val === "string") return opt?.nom === val;
              if (val?._fromChantier || val?.optionType === "chantier") {
                return opt?.optionType === "chantier" && opt?.chantierId === (val?.chantierId ?? val?.id);
              }
              return opt?.optionType === "residence" && opt?.id === val?.id;
            }}
            ListboxProps={autocompleteListboxProps}
            sx={{ gridColumn: { md: "1 / -1" } }}
          />

          {selectedResidence && (
            <Alert severity="info" sx={{ gridColumn: { md: "1 / -1" } }}>
              {selectedResidence._fromChantier || selectedResidence.optionType === "chantier" ? (
                <>
                  Chantier selectionne : <strong>{selectedResidence.nom}</strong>
                  {selectedResidence.adresse && ` — ${selectedResidence.adresse}`}
                </>
              ) : (
                <>
                  Residence existante : <strong>{selectedResidence.nom}</strong>
                  {selectedResidence.adresse && ` - ${selectedResidence.adresse}`}
                  {(selectedResidence.dernier_rapport?.client_societe_nom || selectedResidence.client_societe_nom) &&
                    ` (Client: ${selectedResidence.dernier_rapport?.client_societe_nom || selectedResidence.client_societe_nom})`}
                  {selectedResidence.dernier_rapport?.technicien &&
                    ` | Technicien: ${selectedResidence.dernier_rapport.technicien}`}
                </>
              )}
            </Alert>
          )}

          {isNewResidence && !isVigikPlus && (
            <TextField
              label="Adresse de la nouvelle residence"
              value={formData.residence_adresse}
              onChange={(e) => handleFieldChange("residence_adresse", e.target.value)}
              onBlur={scheduleDraftPersistence}
              fullWidth
              size="small"
              disabled={isDisabled}
              sx={{ gridColumn: { md: "1 / -1" } }}
            />
          )}

          <Box sx={{ gridColumn: { md: "1 / -1" } }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: COLORS.primary }}>
              Dates d&apos;intervention *
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              Premier passage puis dates supplémentaires (Passage 2, 3…). Au moins une date.
            </Typography>
            {(formData.dates_intervention || []).map((d, idx) => (
              <Box
                key={`di-${idx}`}
                sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center", mb: 1 }}
              >
                <TextField
                  label={idx === 0 ? "Date" : `Passage ${idx + 1}`}
                  type="date"
                  value={d || ""}
                  onChange={(e) => {
                    const next = [...(formData.dates_intervention || [])];
                    next[idx] = e.target.value;
                    setFormData((prev) => ({ ...prev, dates_intervention: next }));
                  }}
                  onBlur={scheduleDraftPersistence}
                  size="small"
                  InputLabelProps={{ shrink: true }}
                  disabled={isDisabled}
                  sx={{ minWidth: 200, flex: { xs: "1 1 100%", sm: "0 1 auto" } }}
                />
                {(formData.dates_intervention || []).length > 1 && (
                  <IconButton
                    size="small"
                    aria-label="Supprimer cette date"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        dates_intervention: (prev.dates_intervention || []).filter((_, i) => i !== idx),
                      }));
                      scheduleDraftPersistence();
                    }}
                    disabled={isDisabled}
                    sx={{ color: "error.main" }}
                  >
                    <MdDelete />
                  </IconButton>
                )}
              </Box>
            ))}
            <Button
              type="button"
              size="small"
              variant="outlined"
              startIcon={<MdAdd />}
              onClick={() => {
                setFormData((prev) => ({
                  ...prev,
                  dates_intervention: [...(prev.dates_intervention || []), todayISO()],
                }));
                scheduleDraftPersistence();
              }}
              disabled={isDisabled}
              sx={{ mt: 0.5 }}
            >
              Ajouter une date
            </Button>
          </Box>

          <Autocomplete
            freeSolo
            options={techniciensSuggestions}
            value={formData.technicien || ""}
            onChange={(_, val) => {
              handleFieldChange("technicien", val || "");
              scheduleDraftPersistence();
            }}
            onInputChange={(_, val) => handleFieldChange("technicien", val || "")}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Technicien *"
                size="small"
                onBlur={(e) => {
                  params.inputProps?.onBlur?.(e);
                  scheduleDraftPersistence();
                }}
              />
            )}
            disabled={isDisabled}
            ListboxProps={autocompleteListboxProps}
          />

          {!isVigikPlus && (
            <>
              <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                <FormControlLabel
                  control={(
                    <Checkbox
                      checked={!!formData.devis_a_faire}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => ({
                          ...prev,
                          devis_a_faire: checked,
                          devis_fait: checked ? prev.devis_fait : false,
                          devis_lie: checked ? prev.devis_lie : null,
                        }));
                        scheduleDraftPersistence();
                      }}
                      disabled={isDisabled}
                    />
                  )}
                  label="Devis à faire"
                  sx={{
                    m: 0,
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    border: `1px solid ${COLORS.border || "#e0e0e0"}`,
                    minHeight: isMobile ? 48 : 40,
                    width: "fit-content",
                  }}
                />
              </Box>
              <TextField
                label="Temps de trajet"
                type="time"
                value={formData.temps_trajet}
                onChange={(e) => handleFieldChange("temps_trajet", e.target.value || "")}
                onBlur={scheduleDraftPersistence}
                fullWidth
                size="small"
                disabled={isDisabled}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                helperText="Format h:mm"
              />
              <TextField
                label="Temps de taches"
                type="time"
                value={formData.temps_taches}
                onChange={(e) => handleFieldChange("temps_taches", e.target.value || "")}
                onBlur={scheduleDraftPersistence}
                fullWidth
                size="small"
                disabled={isDisabled}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                helperText="Format h:mm"
              />
            </>
          )}

          {!isVigikPlus && (
          <>
          <Autocomplete
            options={societes}
            getOptionLabel={(opt) => opt?.nom_societe || ""}
            value={societes.find((s) => s.id === formData.client_societe) || null}
            onChange={(_, val) => {
              handleFieldChange("client_societe", val?.id || "");
              scheduleDraftPersistence();
            }}
            renderInput={(params) => <TextField {...params} label="Client / Bailleur" size="small" />}
            disabled={isDisabled}
            ListboxProps={autocompleteListboxProps}
          />
          <Autocomplete
            options={chantiers}
            getOptionLabel={(opt) => opt?.chantier_name || ""}
            value={chantiers.find((c) => c.id === formData.chantier) || null}
            onChange={handleChantierFieldChange}
            renderInput={(params) => <TextField {...params} label="Chantier (optionnel)" size="small" />}
            disabled={isDisabled}
            ListboxProps={autocompleteListboxProps}
          />
          </>
          )}

          {isVigikPlus && (
            <>
              <TextField
                label="Adresse *"
                value={formData.adresse_vigik}
                onChange={(e) => handleFieldChange("adresse_vigik", e.target.value)}
                onBlur={scheduleDraftPersistence}
                fullWidth
                size="small"
                disabled={isDisabled}
                placeholder="Adresse propre au rapport Vigik+ (distincte de la residence)"
                sx={{ gridColumn: { md: "1 / -1" } }}
              />
              <TextField
                label="Numero du batiment *"
                value={formData.numero_batiment}
                onChange={(e) => handleFieldChange("numero_batiment", e.target.value)}
                onBlur={scheduleDraftPersistence}
                fullWidth
                size="small"
                disabled={isDisabled}
              />
              <TextField
                label="Type d'installation"
                value={formData.type_installation}
                onChange={(e) => handleFieldChange("type_installation", e.target.value)}
                onBlur={scheduleDraftPersistence}
                fullWidth
                size="small"
                disabled={isDisabled}
              />
              {/* Question 1 : Présence de platine */}
              <Typography variant="subtitle2" sx={{ gridColumn: { md: "1 / -1" }, fontWeight: 600, mb: 0.5 }}>
                Presence de platine Vigik+ :
              </Typography>
              <Box sx={{ gridColumn: { md: "1 / -1" }, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant={formData.presence_platine === true ? "contained" : "outlined"}
                  size="small"
                  onClick={() => {
                    handleFieldChange("presence_platine", true);
                    scheduleDraftPersistence();
                  }}
                  disabled={isDisabled}
                >
                  Oui
                </Button>
                <Button
                  variant={formData.presence_platine === false ? "contained" : "outlined"}
                  size="small"
                  color={formData.presence_platine === false ? "error" : "primary"}
                  onClick={() => {
                    handleFieldChange("presence_platine", false);
                    scheduleDraftPersistence();
                  }}
                  disabled={isDisabled}
                >
                  Non
                </Button>
              </Box>
              <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Joindre au moins une photo (obligatoire). Vous pouvez en ajouter plusieurs. Les images sont redimensionnées
                  (max. 1600 px) et compressées en JPEG pour limiter le poids des envois.
                </Typography>
                <input
                  ref={photoPlatineInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = "";
                    void appendVigikPlatineFiles(files);
                  }}
                />
                <input
                  ref={photoPlatineCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = "";
                    void appendVigikPlatineFiles(files);
                  }}
                />
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap" }}>
                  {(pendingPhotosPlatine || []).map((p, i) => (
                    <Box
                      key={p.clientId || p._draftS3Key || `plat-${i}-${p.name || ""}`}
                      sx={{
                        width: 140,
                        borderRadius: 1,
                        overflow: "hidden",
                        border: p.file ? "2px solid #1976d240" : "2px solid #2e7d3240",
                        position: "relative",
                      }}
                    >
                      <Box sx={{ width: "100%", height: 100, position: "relative" }}>
                        {p.previewUrl ? (
                          <img
                            src={p.previewUrl}
                            alt={p.name}
                            style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                            onClick={() => openVigikGallery(i)}
                          />
                        ) : (
                          <Box sx={{ width: "100%", height: "100%", bgcolor: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Typography variant="caption">...</Typography>
                          </Box>
                        )}
                        {!isDisabled && (
                          <IconButton
                            size="small"
                            onClick={() => removeVigikPlatineAt(i)}
                            sx={{
                              position: "absolute", top: 2, right: 2,
                              backgroundColor: "rgba(255,255,255,0.85)",
                              "&:hover": { backgroundColor: "#ffebee" },
                              padding: "2px",
                            }}
                          >
                            <MdDelete size={16} color="#c62828" />
                          </IconButton>
                        )}
                      </Box>
                      <Typography variant="caption" sx={{ display: "block", px: 0.5, py: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </Typography>
                    </Box>
                  ))}
                  {!isDisabled && (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                      {isMobile ? (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={vigikPhotoCompressing}
                            onClick={() => photoPlatineCameraInputRef.current?.click()}
                          >
                            Prendre une photo
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={vigikPhotoCompressing}
                            onClick={() => photoPlatineInputRef.current?.click()}
                          >
                            Galerie
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={vigikPhotoCompressing}
                          onClick={() => photoPlatineInputRef.current?.click()}
                        >
                          Ajouter des photos
                        </Button>
                      )}
                      {vigikPhotoCompressing && <CircularProgress size={22} sx={{ ml: 0.5 }} aria-label="Traitement des images" />}
                    </Box>
                  )}
                </Box>
              </Box>
              {/* Portail : étape 1 — présence d'un portail */}
              <Typography variant="subtitle2" sx={{ gridColumn: { md: "1 / -1" }, fontWeight: 600, mb: 0.5, mt: 2 }}>
                Présence d&apos;un portail :
              </Typography>
              <Box sx={{ gridColumn: { md: "1 / -1" }, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant={formData.presence_portail === true ? "contained" : "outlined"}
                  size="small"
                  onClick={() => handleVigikPresencePortailChange(true)}
                  disabled={isDisabled}
                >
                  Oui
                </Button>
                <Button
                  variant={formData.presence_portail === false ? "contained" : "outlined"}
                  size="small"
                  color={formData.presence_portail === false ? "error" : "primary"}
                  onClick={() => handleVigikPresencePortailChange(false)}
                  disabled={isDisabled}
                >
                  Non
                </Button>
              </Box>
              {/* Étape 2 — platine Vigik+ au portail (si portail oui) */}
              {formData.presence_portail === true && (
                <>
                  <Typography variant="subtitle2" sx={{ gridColumn: { md: "1 / -1" }, fontWeight: 600, mb: 0.5, mt: 2 }}>
                    Présence de platine Vigik+ au niveau du portail :
                  </Typography>
                  <Box sx={{ gridColumn: { md: "1 / -1" }, display: "flex", gap: 1, flexWrap: "wrap" }}>
                    <Button
                      variant={formData.presence_platine_portail === true ? "contained" : "outlined"}
                      size="small"
                      onClick={() => handleVigikPlatinePortailChange(true)}
                      disabled={isDisabled}
                    >
                      Oui
                    </Button>
                    <Button
                      variant={formData.presence_platine_portail === false ? "contained" : "outlined"}
                      size="small"
                      color={formData.presence_platine_portail === false ? "error" : "primary"}
                      onClick={() => handleVigikPlatinePortailChange(false)}
                      disabled={isDisabled}
                    >
                      Non
                    </Button>
                  </Box>
                </>
              )}
              {/* Photos « portail » : sans portail (facultatif) ou portail + platine oui/non (facultatif) */}
              {vigikPortailPhotosEnabled && (
              <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  {formData.presence_portail === false
                    ? "Joindre des photos (facultatif), par exemple pour illustrer l'accès ou le contexte sur site. Vous pouvez en ajouter plusieurs. Même compression automatique que pour la platine (max. 1600 px, JPEG)."
                    : "Joindre des photos (facultatif). Vous pouvez en ajouter plusieurs. Même compression automatique que pour la platine (max. 1600 px, JPEG)."}
                </Typography>
                <input
                  ref={photoPlatinePortailInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = "";
                    void appendVigikPortailFiles(files);
                  }}
                />
                <input
                  ref={photoPlatinePortailCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = "";
                    void appendVigikPortailFiles(files);
                  }}
                />
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap" }}>
                  {(pendingPhotosPlatinePortail || []).map((p, i) => {
                    const platCount = (pendingPhotosPlatine || []).length;
                    return (
                      <Box
                        key={p.clientId || p._draftS3Key || `port-${i}-${p.name || ""}`}
                        sx={{
                          width: 140,
                          borderRadius: 1,
                          overflow: "hidden",
                          border: p.file ? "2px solid #1976d240" : "2px solid #2e7d3240",
                          position: "relative",
                        }}
                      >
                        <Box sx={{ width: "100%", height: 100, position: "relative" }}>
                          {p.previewUrl ? (
                            <img
                              src={p.previewUrl}
                              alt={p.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                              onClick={() => openVigikGallery(platCount + i)}
                            />
                          ) : (
                            <Box sx={{ width: "100%", height: "100%", bgcolor: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Typography variant="caption">...</Typography>
                            </Box>
                          )}
                          {!isDisabled && (
                            <IconButton
                              size="small"
                              onClick={() => removeVigikPortailAt(i)}
                              sx={{
                                position: "absolute", top: 2, right: 2,
                                backgroundColor: "rgba(255,255,255,0.85)",
                                "&:hover": { backgroundColor: "#ffebee" },
                                padding: "2px",
                              }}
                            >
                              <MdDelete size={16} color="#c62828" />
                            </IconButton>
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ display: "block", px: 0.5, py: 0.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.name}
                        </Typography>
                      </Box>
                    );
                  })}
                  {!isDisabled && (
                    <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                      {isMobile ? (
                        <>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={vigikPhotoCompressing}
                            onClick={() => photoPlatinePortailCameraInputRef.current?.click()}
                          >
                            Prendre une photo
                          </Button>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={vigikPhotoCompressing}
                            onClick={() => photoPlatinePortailInputRef.current?.click()}
                          >
                            Galerie
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={vigikPhotoCompressing}
                          onClick={() => photoPlatinePortailInputRef.current?.click()}
                        >
                          Ajouter des photos
                        </Button>
                      )}
                      {vigikPhotoCompressing && <CircularProgress size={22} sx={{ ml: 0.5 }} aria-label="Traitement des images" />}
                    </Box>
                  )}
                </Box>
              </Box>
              )}
            </>
          )}
        </Box>

        {!isVigikPlus && (
          <>
        <TextField
          label="Objet de la recherche *"
          placeholder="Dire pourquoi tu viens sur site..."
          value={formData.objet_recherche}
          onChange={(e) => handleFieldChange("objet_recherche", e.target.value)}
          onBlur={scheduleDraftPersistence}
          fullWidth
          multiline
          rows={isMobile ? 3 : 2}
          size="small"
          sx={{ mt: fieldGap }}
          disabled={isDisabled}
        />

        <TextField
          label="Resultat"
          value={formData.resultat}
          onChange={(e) => handleFieldChange("resultat", e.target.value)}
          onBlur={scheduleDraftPersistence}
          fullWidth
          multiline
          rows={isMobile ? 3 : 2}
          size="small"
          sx={{ mt: fieldGap }}
          disabled={isDisabled}
        />
          </>
        )}
      </Paper>

      {/* Lieu d'intervention & Locataire (masque pour Vigik+) */}
      {!isVigikPlus && (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: sectionSpacing,
          borderRadius: 2,
          border: `1px solid ${COLORS.border || "#e0e0e0"}`,
        }}
      >
        <Typography variant="h6" sx={{ mb: { xs: 2.5, md: 2 }, fontWeight: 600, color: COLORS.primary }}>
          Lieu d'intervention & Locataire
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: fieldGap }}>
          <TextField
            label="Lieu d'intervention"
            value={formData.logement}
            onChange={(e) => handleFieldChange("logement", e.target.value)}
            onBlur={scheduleDraftPersistence}
            fullWidth
            size="small"
            disabled={isDisabled}
            placeholder="Ex: Apt 12, Cave 3, RDC..."
            sx={{ gridColumn: { md: "1 / -1" } }}
          />

          <TextField
            label="Nom locataire"
            value={formData.locataire_nom}
            onChange={(e) => handleFieldChange("locataire_nom", e.target.value)}
            onBlur={scheduleDraftPersistence}
            fullWidth
            size="small"
            disabled={isDisabled}
          />
          <TextField
            label="Prenom locataire"
            value={formData.locataire_prenom}
            onChange={(e) => handleFieldChange("locataire_prenom", e.target.value)}
            onBlur={scheduleDraftPersistence}
            fullWidth
            size="small"
            disabled={isDisabled}
          />
          <TextField
            label="Telephone locataire"
            value={formData.locataire_telephone}
            onChange={(e) => handleFieldChange("locataire_telephone", e.target.value)}
            onBlur={scheduleDraftPersistence}
            fullWidth
            size="small"
            disabled={isDisabled}
          />
          <TextField
            label="Email locataire"
            value={formData.locataire_email}
            onChange={(e) => handleFieldChange("locataire_email", e.target.value)}
            onBlur={scheduleDraftPersistence}
            fullWidth
            size="small"
            disabled={isDisabled}
          />
        </Box>
      </Paper>
      )}

      {/* Prestations (masque pour Vigik+) */}
      {!isVigikPlus && (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: sectionSpacing,
          borderRadius: 2,
          border: `1px solid ${COLORS.border || "#e0e0e0"}`,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.primary, mb: { xs: 2.5, md: 2 } }}>
          Prestations
        </Typography>

        {formData.prestations.map((prestation, index) => (
          <PrestationSection
            key={prestation.id || `new-${index}`}
            prestation={prestation}
            index={index}
            onChange={handlePrestationChange}
            onDraftCommit={scheduleDraftPersistence}
            onRemove={handleRemovePrestation}
            onUploadPhoto={handleUploadPhoto}
            onDeletePhoto={handleDeletePhoto}
            onUpdatePhoto={handleUpdatePhoto}
            onAddPendingPhoto={handleAddPendingPhoto}
            onRemovePendingPhoto={handleRemovePendingPhoto}
            disabled={isDisabled}
            isSaved={!!prestation.id}
            pendingPhotos={pendingPhotos[index] || []}
            isMobile={isMobile}
          />
        ))}

        {!isDisabled && (
          <Button
            variant="outlined"
            startIcon={<MdAdd />}
            onClick={handleAddPrestation}
            size="small"
            sx={{ minHeight: isMobile ? 48 : 36, mt: 2 }}
          >
            Ajouter une prestation
          </Button>
        )}
      </Paper>
      )}

      {/* Signature (masquée pour Vigik+) */}
      {!isVigikPlus && (
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: sectionSpacing,
          borderRadius: 2,
          border: `1px solid ${COLORS.border || "#e0e0e0"}`,
        }}
      >
        <SignaturePad
          ref={signaturePadRef}
          existingSignatureUrl={rapportData?.signature_url}
          restoreFromDataUrl={signatureDraftRestoreUrl}
          onRestoreFromDataUrlHandled={handleSignatureDraftRestoreHandled}
          onSignatureCommit={scheduleDraftPersistence}
          disabled={isDisabled}
        />
      </Paper>
      )}

      {/* Bouton Valider en bas du rapport (mobile) */}
      {saveButtonAtBottom && !isDisabled && (
        <Paper
          elevation={0}
          sx={{
            p: 2,
            mt: 2,
            borderRadius: 2,
            border: `1px solid ${COLORS.border || "#e0e0e0"}`,
          }}
        >
          <Button
            variant="contained"
            fullWidth
            startIcon={saving ? <CircularProgress size={18} /> : <MdCheckCircle />}
            onClick={handleValidateClick}
            disabled={saving || savingDraft}
            sx={{
              minHeight: 48,
              backgroundColor: COLORS.infoDark || "#1976d2",
              fontWeight: 600,
            }}
          >
            {saving ? "Validation..." : "Valider le rapport"}
          </Button>
        </Paper>
      )}

      {/* Dialog nouveau titre */}
      <Dialog open={newTitreDialog} onClose={() => setNewTitreDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouveau titre de rapport</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Nom du titre"
            value={newTitreName}
            onChange={(e) => setNewTitreName(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNewTitreDialog(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateTitre}>Creer</Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={deleteTitreDialogOpen}
        onClose={() => {
          setDeleteTitreDialogOpen(false);
          setTitreToDelete(null);
        }}
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle>Confirmer la suppression</DialogTitle>
        <DialogContent>
          <Typography>
            Voulez-vous vraiment supprimer le titre "{titreToDelete?.nom || ""}" ?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setDeleteTitreDialogOpen(false);
              setTitreToDelete(null);
            }}
          >
            Annuler
          </Button>
          <Button variant="contained" color="error" onClick={handleConfirmDeleteTitre}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={saveErrorModal.open}
        onClose={() =>
          setSaveErrorModal({ open: false, title: "", fieldLabels: [], fallbackMessage: "" })
        }
        maxWidth="xs"
        fullWidth
        fullScreen={isMobile}
        PaperProps={{
          sx: { borderRadius: isMobile ? 0 : 3, overflow: "hidden" },
        }}
      >
        <Box sx={{ textAlign: "center", pt: 3, px: 3 }}>
          <Box
            component="img"
            src={elekableLogo}
            alt="Elekable"
            sx={{ width: 90, height: "auto" }}
          />
        </Box>
        <Box sx={{ textAlign: "center", pt: 2, pb: 1, px: 3 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: "50%",
              backgroundColor: `rgba(${COLORS.errorRgb}, 0.1)`,
              mb: 2,
              "@keyframes rapportErrorShake": {
                "0%, 100%": { transform: "translateX(0)" },
                "20%, 60%": { transform: "translateX(-6px)" },
                "40%, 80%": { transform: "translateX(6px)" },
              },
              animation: "rapportErrorShake 0.45s ease-in-out",
            }}
          >
            <MdErrorOutline size={36} color={COLORS.error} />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.error, mb: 0.5 }}>
            {saveErrorModal.title || "Impossible d'enregistrer"}
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 1, pb: 1 }}>
          {saveErrorModal.fieldLabels?.length > 0 ? (
            <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
              {saveErrorModal.fieldLabels.map((label) => (
                <Typography
                  component="li"
                  key={label}
                  variant="body2"
                  sx={{ color: COLORS.error, fontWeight: 600, py: 0.3 }}
                >
                  {label}
                </Typography>
              ))}
            </Box>
          ) : null}
          {saveErrorModal.fallbackMessage ? (
            <Typography variant="body2" sx={{ mt: 1, textAlign: "center", color: COLORS.textMuted }}>
              {saveErrorModal.fallbackMessage}
            </Typography>
          ) : null}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() =>
              setSaveErrorModal({ open: false, title: "", fieldLabels: [], fallbackMessage: "" })
            }
            sx={{
              fontWeight: 700,
              py: 1.25,
              borderRadius: 2,
              backgroundColor: COLORS.error,
              "&:hover": { backgroundColor: COLORS.errorDark },
            }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={successModalOpen}
        maxWidth="xs"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            overflow: "hidden",
          },
        }}
      >
        <Box sx={{ textAlign: "center", pt: 4, pb: 3, px: 3 }}>
          <Box
            sx={{
              "@keyframes rapportLogoFadeIn": {
                "0%": { opacity: 0, transform: "scale(0.7)" },
                "100%": { opacity: 1, transform: "scale(1)" },
              },
              animation: "rapportLogoFadeIn 0.35s ease-out forwards",
            }}
          >
            <Box
              component="img"
              src={elekableLogo}
              alt="Elekable"
              sx={{ width: 100, height: "auto", mb: 2 }}
            />
          </Box>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 68,
              height: 68,
              borderRadius: "50%",
              backgroundColor: "#fffde7",
              border: "3px solid #ffff00",
              mb: 2,
              "@keyframes rapportCheckPop": {
                "0%": { transform: "scale(0)", opacity: 0 },
                "60%": { transform: "scale(1.15)", opacity: 1 },
                "100%": { transform: "scale(1)" },
              },
              animation: "rapportCheckPop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s both",
            }}
          >
            <MdCheckCircle size={40} color="#f9a825" />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: COLORS.primary, mb: 0.5 }}>
            Rapport sauvegardé !
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {successModalContext?.isEdit
              ? "Vos modifications ont bien été enregistrées. Le rapport est en cours pour vérification."
              : "Votre rapport a bien été créé. Il est en cours pour vérification."}
          </Typography>
        </Box>
        <Box
          sx={{
            height: 4,
            backgroundColor: "#fff9c4",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              height: "100%",
              backgroundColor: "#f9a825",
              "@keyframes rapportCountdown": {
                from: { width: "100%" },
                to: { width: "0%" },
              },
              animation: "rapportCountdown 2s linear forwards",
            }}
          />
        </Box>
      </Dialog>

      <Dialog
        open={vigikGalleryOpen}
        onClose={closeVigikGallery}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            backgroundColor: "#111",
            color: "#fff",
          },
        }}
      >
        <Box sx={{ position: "relative", p: { xs: 1.5, md: 2 } }}>
          <IconButton
            onClick={closeVigikGallery}
            sx={{ position: "absolute", top: 8, right: 8, color: "#fff", zIndex: 2 }}
          >
            <MdClose />
          </IconButton>

          {activeVigikPhoto && (
            <>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 1,
                  mb: 1.5,
                  pr: 5,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                  <Chip
                    label={activeVigikPhoto.label}
                    size="small"
                    sx={{ backgroundColor: "#1976d260", color: "#fff", fontWeight: 600 }}
                  />
                  <Chip
                    label={activeVigikPhoto.pending ? "En cours d'envoi" : "Terminee"}
                    size="small"
                    sx={{
                      backgroundColor: activeVigikPhoto.pending ? "#ed6c02" : "#2e7d32",
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  />
                  <Typography variant="body2" sx={{ color: "#ddd" }}>
                    Date: {activeVigikPhoto.date_photo || latestInterventionISO(formData.dates_intervention) || todayISO()}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "#bbb" }}>
                  {vigikGalleryIndex + 1} / {vigikPhotos.length}
                </Typography>
              </Box>

              <Box sx={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
                {vigikPhotos.length > 1 && (
                  <IconButton
                    onClick={goVigikPrev}
                    sx={{
                      position: "absolute",
                      left: { xs: 4, md: 8 },
                      color: "#fff",
                      backgroundColor: "rgba(0,0,0,0.35)",
                      "&:hover": { backgroundColor: "rgba(0,0,0,0.5)" },
                      zIndex: 1,
                    }}
                  >
                    <MdChevronLeft size={28} />
                  </IconButton>
                )}

                <Box
                  component="img"
                  src={activeVigikPhoto.image_url}
                  alt={activeVigikPhoto.label}
                  onTouchStart={handleVigikTouchStart}
                  onTouchEnd={handleVigikTouchEnd}
                  sx={{
                    width: "100%",
                    maxHeight: "72vh",
                    objectFit: "contain",
                    borderRadius: 1,
                    transform: `scale(${vigikZoom})`,
                    transition: "transform 0.2s ease",
                  }}
                />

                {vigikPhotos.length > 1 && (
                  <IconButton
                    onClick={goVigikNext}
                    sx={{
                      position: "absolute",
                      right: { xs: 4, md: 8 },
                      color: "#fff",
                      backgroundColor: "rgba(0,0,0,0.35)",
                      "&:hover": { backgroundColor: "rgba(0,0,0,0.5)" },
                      zIndex: 1,
                    }}
                  >
                    <MdChevronRight size={28} />
                  </IconButton>
                )}
              </Box>
              <Box sx={{ mt: 1.5, display: "flex", justifyContent: "center", gap: 1 }}>
                <Button size="small" variant="outlined" onClick={() => setVigikZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}>
                  Zoom -
                </Button>
                <Button size="small" variant="outlined" onClick={() => setVigikZoom(1)}>
                  Reset
                </Button>
                <Button size="small" variant="outlined" onClick={() => setVigikZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}>
                  Zoom +
                </Button>
              </Box>
            </>
          )}
        </Box>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default RapportForm;
