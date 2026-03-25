import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import {
  Box, Button, TextField, Typography, Paper, MenuItem, Select,
  FormControl, InputLabel, Autocomplete, Chip, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  useTheme,
  useMediaQuery,
  IconButton,
} from "@mui/material";
import {
  MdSave, MdAdd, MdPictureAsPdf, MdArrowBack, MdDelete, MdChevronLeft, MdChevronRight, MdClose,
  MdCheckCircle, MdErrorOutline,
} from "react-icons/md";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { COLORS } from "../../constants/colors";
import { useRapports } from "../../hooks/useRapports";
import PrestationSection from "./PrestationSection";
import SignaturePad from "./SignaturePad";
import elekableLogo from "../../img/logo.png";

const EMPTY_PRESTATION = {
  localisation: "",
  probleme: "",
  solution: "",
  commentaire: "",
  prestation_possible: true,
  prestation_realisee: "",
};

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
  presence_platine_portail: "Présence de platine au portail",
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

const RapportForm = ({ rapportId: propRapportId, onBack, saveButtonAtBottom, onReportCreated }) => {
  const { id: paramId } = useParams();
  const rapportId = propRapportId || paramId;
  const isEdit = !!rapportId;
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const {
    fetchRapport, createRapport, updateRapport, uploadPhoto, updatePhoto,
    deletePhoto, uploadSignature, genererPdf,
    fetchTitres, createTitre, deleteTitre, loading,
  } = useRapports();

  const [formData, setFormData] = useState({
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
    statut: "a_faire",
    prestations: [{ ...EMPTY_PRESTATION }],
    numero_batiment: "",
    type_installation: "",
    presence_platine: null,
    presence_platine_portail: null,
  });

  const [rapportData, setRapportData] = useState(null);
  const [titres, setTitres] = useState([]);
  const [techniciensSuggestions, setTechniciensSuggestions] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [residences, setResidences] = useState([]);
  const [selectedResidence, setSelectedResidence] = useState(null);
  const [pendingPhotos, setPendingPhotos] = useState({});
  const [pendingPhotoPlatine, setPendingPhotoPlatine] = useState(null);
  const [pendingPhotoPlatinePortail, setPendingPhotoPlatinePortail] = useState(null);
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
  const vigikTouchStartXRef = useRef(null);

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
        presence_platine_portail: data.presence_platine_portail ?? null,
      });
      if (data.residence_data) {
        setSelectedResidence({ ...data.residence_data, optionType: "residence" });
      } else {
        setSelectedResidence(null);
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

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
  };

  const handleAddPrestation = () => {
    setFormData((prev) => ({
      ...prev,
      prestations: [...prev.prestations, { ...EMPTY_PRESTATION }],
    }));
  };

  const handleRemovePrestation = (index) => {
    setFormData((prev) => ({
      ...prev,
      prestations: prev.prestations.filter((_, i) => i !== index),
    }));
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
    const signatureData = signaturePadRef.current?.getSignatureDataUrl?.();
    if (!signatureData) return;
    try {
      await uploadSignature(savedRapportId, signatureData);
      signaturePadRef.current?.clear?.();
    } catch (err) {
      console.error("Erreur upload signature:", err);
    }
  };

  const isVigikPlus = formData.type_rapport === "vigik_plus";
  const vigikPhotos = [
    pendingPhotoPlatine
      ? {
          image_url: pendingPhotoPlatine.previewUrl,
          label: "Photo platine",
          date_photo: latestInterventionISO(formData.dates_intervention) || todayISO(),
          pending: true,
        }
      : (rapportData?.photo_platine_url
        ? {
            image_url: rapportData.photo_platine_url,
            label: "Photo platine",
            date_photo:
              latestInterventionISO(rapportData?.dates_intervention) ||
              (rapportData?.date ? String(rapportData.date).slice(0, 10) : null) ||
              latestInterventionISO(formData.dates_intervention) ||
              todayISO(),
            pending: false,
          }
        : null),
    pendingPhotoPlatinePortail
      ? {
          image_url: pendingPhotoPlatinePortail.previewUrl,
          label: "Photo platine portail",
          date_photo: latestInterventionISO(formData.dates_intervention) || todayISO(),
          pending: true,
        }
      : (rapportData?.photo_platine_portail_url
        ? {
            image_url: rapportData.photo_platine_portail_url,
            label: "Photo platine portail",
            date_photo:
              latestInterventionISO(rapportData?.dates_intervention) ||
              (rapportData?.date ? String(rapportData.date).slice(0, 10) : null) ||
              latestInterventionISO(formData.dates_intervention) ||
              todayISO(),
            pending: false,
          }
        : null),
  ].filter(Boolean);

  const openVigikGallery = (label) => {
    const idx = vigikPhotos.findIndex((p) => p.label === label);
    setVigikGalleryIndex(idx >= 0 ? idx : 0);
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
      const hasPhotoPlatine = pendingPhotoPlatine || rapportData?.photo_platine_s3_key;
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

  const handleSaveClick = () => {
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
    executeSave();
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

  const executeSave = async () => {
    const datesInterventionClean = (formData.dates_intervention || [])
      .map((s) => String(s).slice(0, 10))
      .filter(Boolean);
    const hasPrestation = !isVigikPlus && formData.prestations.some(
      (p) =>
        (p.localisation || "").trim() ||
        (p.probleme || "").trim() ||
        (p.solution || "").trim()
    );
    const computedStatut = hasPrestation ? "en_cours" : "a_faire";
    const statutToSend =
      isEdit && rapportData?.statut === "termine" ? "termine" : computedStatut;

    setSaving(true);
    try {
      const vigikTitre = isVigikPlus && !formData.titre ? (titres.find((t) => t.nom === "Rapport Vigik+") || titres[0])?.id : formData.titre;
      const normalizeFk = (value) => (value === "" || value === undefined ? null : value);
      const dataToSend = {
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
        presence_platine_portail: formData.presence_platine_portail,
        prestations: isVigikPlus
          ? []
          : formData.prestations.map((p, i) => ({
              ...p,
              id: p.id || undefined,
              ordre: i,
              photos: undefined,
            })),
      };

      let result;
      if (isEdit) {
        result = await updateRapport(rapportId, dataToSend);
      } else {
        result = await createRapport(dataToSend);
      }

      const savedId = result?.id || rapportId;

      if (!isVigikPlus && result?.prestations) {
        await uploadPendingPhotos(result);
      } else if (!isVigikPlus) {
        const fullResult = await fetchRapport(savedId);
        await uploadPendingPhotos(fullResult);
      }

      if (isVigikPlus && pendingPhotoPlatine?.file) {
        const fd = new FormData();
        fd.append("rapport_id", savedId);
        fd.append("photo", pendingPhotoPlatine.file);
        await axios.post("/api/rapports-intervention/upload_photo_platine/", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (pendingPhotoPlatine.previewUrl) URL.revokeObjectURL(pendingPhotoPlatine.previewUrl);
        setPendingPhotoPlatine(null);
      }
      if (isVigikPlus && pendingPhotoPlatinePortail?.file) {
        const fd = new FormData();
        fd.append("rapport_id", savedId);
        fd.append("photo", pendingPhotoPlatinePortail.file);
        await axios.post("/api/rapports-intervention/upload_photo_platine_portail/", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (pendingPhotoPlatinePortail.previewUrl) URL.revokeObjectURL(pendingPhotoPlatinePortail.previewUrl);
        setPendingPhotoPlatinePortail(null);
      }

      if (!isVigikPlus) await uploadPendingSignature(savedId);

      setSuccessModalContext({ isEdit, savedId });
      setSuccessModalOpen(true);
    } catch (err) {
      const payload = buildSaveErrorFromApi(err);
      setSaveErrorModal({ open: true, ...payload });
    } finally {
      setSaving(false);
    }
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
                label={rapportData.statut === "termine" ? "Terminé" : rapportData.statut === "en_cours" ? "En cours" : "A faire"}
                size="small"
                color={rapportData.statut === "termine" ? "success" : rapportData.statut === "en_cours" ? "warning" : "default"}
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
              startIcon={saving ? <CircularProgress size={18} /> : <MdSave />}
              onClick={handleSaveClick}
              disabled={saving}
              sx={{ backgroundColor: COLORS.infoDark || "#1976d2" }}
            >
              Sauvegarder
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
              onChange={(e) => handleFieldChange("type_rapport", e.target.value)}
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
                onChange={(e) => handleFieldChange("titre", e.target.value)}
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
            onChange={(_, val) => handleFieldChange("technicien", val || "")}
            onInputChange={(_, val) => handleFieldChange("technicien", val || "")}
            renderInput={(params) => <TextField {...params} label="Technicien *" size="small" />}
            disabled={isDisabled}
            ListboxProps={autocompleteListboxProps}
          />

          {!isVigikPlus && (
            <>
              <TextField
                label="Temps de trajet"
                type="time"
                value={formData.temps_trajet}
                onChange={(e) => handleFieldChange("temps_trajet", e.target.value || "")}
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
            onChange={(_, val) => handleFieldChange("client_societe", val?.id || "")}
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
                fullWidth
                size="small"
                disabled={isDisabled}
              />
              <TextField
                label="Type d'installation"
                value={formData.type_installation}
                onChange={(e) => handleFieldChange("type_installation", e.target.value)}
                fullWidth
                size="small"
                disabled={isDisabled}
              />
              {/* Question 1 : Présence de platine */}
              <Typography variant="subtitle2" sx={{ gridColumn: { md: "1 / -1" }, fontWeight: 600, mb: 0.5 }}>
                Presence de platine :
              </Typography>
              <Box sx={{ gridColumn: { md: "1 / -1" }, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant={formData.presence_platine === true ? "contained" : "outlined"}
                  size="small"
                  onClick={() => handleFieldChange("presence_platine", true)}
                  disabled={isDisabled}
                >
                  Oui
                </Button>
                <Button
                  variant={formData.presence_platine === false ? "contained" : "outlined"}
                  size="small"
                  color={formData.presence_platine === false ? "error" : "primary"}
                  onClick={() => handleFieldChange("presence_platine", false)}
                  disabled={isDisabled}
                >
                  Non
                </Button>
              </Box>
              <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Joindre une photo (obligatoire)
                </Typography>
                <input
                  ref={photoPlatineInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const previewUrl = URL.createObjectURL(file);
                      setPendingPhotoPlatine({ file, name: file.name, previewUrl });
                    }
                    e.target.value = "";
                  }}
                />
                <input
                  ref={photoPlatineCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const previewUrl = URL.createObjectURL(file);
                      setPendingPhotoPlatine({ file, name: file.name, previewUrl });
                    }
                    e.target.value = "";
                  }}
                />
                {pendingPhotoPlatine ? (
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap" }}>
                    <Box
                      sx={{
                        width: 140,
                        borderRadius: 1,
                        overflow: "hidden",
                        border: "2px solid #1976d240",
                        position: "relative",
                      }}
                    >
                      <Box sx={{ width: "100%", height: 100, position: "relative" }}>
                        <img
                          src={pendingPhotoPlatine.previewUrl}
                          alt={pendingPhotoPlatine.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                          onClick={() => openVigikGallery("Photo platine")}
                        />
                        {!isDisabled && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (pendingPhotoPlatine.previewUrl) URL.revokeObjectURL(pendingPhotoPlatine.previewUrl);
                              setPendingPhotoPlatine(null);
                            }}
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
                        {pendingPhotoPlatine.name}
                      </Typography>
                    </Box>
                    {!isDisabled && (
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {isMobile && (
                          <>
                            <Button size="small" variant="outlined" onClick={() => photoPlatineCameraInputRef.current?.click()}>
                              Prendre une photo
                            </Button>
                            <Button size="small" variant="outlined" onClick={() => photoPlatineInputRef.current?.click()}>
                              Galerie
                            </Button>
                          </>
                        )}
                        {!isMobile && (
                          <Button size="small" variant="outlined" onClick={() => photoPlatineInputRef.current?.click()}>
                            Remplacer
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                ) : rapportData?.photo_platine_url ? (
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap" }}>
                    <Box
                      sx={{
                        width: 140,
                        borderRadius: 1,
                        overflow: "hidden",
                        border: "2px solid #2e7d3240",
                        position: "relative",
                      }}
                    >
                      <Box sx={{ width: "100%", height: 100 }}>
                        <img
                          src={rapportData.photo_platine_url}
                          alt="Photo platine"
                          style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                          onClick={() => openVigikGallery("Photo platine")}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ display: "block", px: 0.5, py: 0.5, color: "success.main" }}>
                        Photo jointe
                      </Typography>
                    </Box>
                    {!isDisabled && (
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {isMobile && (
                          <>
                            <Button size="small" variant="outlined" onClick={() => photoPlatineCameraInputRef.current?.click()}>
                              Prendre une photo
                            </Button>
                            <Button size="small" variant="outlined" onClick={() => photoPlatineInputRef.current?.click()}>
                              Galerie
                            </Button>
                          </>
                        )}
                        {!isMobile && (
                          <Button size="small" variant="outlined" onClick={() => photoPlatineInputRef.current?.click()}>
                            Remplacer
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                    {isMobile ? (
                      <>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => photoPlatineCameraInputRef.current?.click()}
                          disabled={isDisabled}
                        >
                          Prendre une photo
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => photoPlatineInputRef.current?.click()}
                          disabled={isDisabled}
                        >
                          Galerie
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => photoPlatineInputRef.current?.click()}
                        disabled={isDisabled}
                      >
                        Choisir une photo
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
              {/* Question 2 : Présence de platine au niveau du portail */}
              <Typography variant="subtitle2" sx={{ gridColumn: { md: "1 / -1" }, fontWeight: 600, mb: 0.5, mt: 2 }}>
                Presence de platine au niveau du portail :
              </Typography>
              <Box sx={{ gridColumn: { md: "1 / -1" }, display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  variant={formData.presence_platine_portail === true ? "contained" : "outlined"}
                  size="small"
                  onClick={() => handleFieldChange("presence_platine_portail", true)}
                  disabled={isDisabled}
                >
                  Oui
                </Button>
                <Button
                  variant={formData.presence_platine_portail === false ? "contained" : "outlined"}
                  size="small"
                  color={formData.presence_platine_portail === false ? "error" : "primary"}
                  onClick={() => handleFieldChange("presence_platine_portail", false)}
                  disabled={isDisabled}
                >
                  Non
                </Button>
              </Box>
              <Box sx={{ gridColumn: { md: "1 / -1" } }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Joindre une photo
                </Typography>
                <input
                  ref={photoPlatinePortailInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const previewUrl = URL.createObjectURL(file);
                      setPendingPhotoPlatinePortail({ file, name: file.name, previewUrl });
                    }
                    e.target.value = "";
                  }}
                />
                <input
                  ref={photoPlatinePortailCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const previewUrl = URL.createObjectURL(file);
                      setPendingPhotoPlatinePortail({ file, name: file.name, previewUrl });
                    }
                    e.target.value = "";
                  }}
                />
                {pendingPhotoPlatinePortail ? (
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap" }}>
                    <Box
                      sx={{
                        width: 140,
                        borderRadius: 1,
                        overflow: "hidden",
                        border: "2px solid #1976d240",
                        position: "relative",
                      }}
                    >
                      <Box sx={{ width: "100%", height: 100, position: "relative" }}>
                        <img
                          src={pendingPhotoPlatinePortail.previewUrl}
                          alt={pendingPhotoPlatinePortail.name}
                          style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                          onClick={() => openVigikGallery("Photo platine portail")}
                        />
                        {!isDisabled && (
                          <IconButton
                            size="small"
                            onClick={() => {
                              if (pendingPhotoPlatinePortail.previewUrl) URL.revokeObjectURL(pendingPhotoPlatinePortail.previewUrl);
                              setPendingPhotoPlatinePortail(null);
                            }}
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
                        {pendingPhotoPlatinePortail.name}
                      </Typography>
                    </Box>
                    {!isDisabled && (
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {isMobile && (
                          <>
                            <Button size="small" variant="outlined" onClick={() => photoPlatinePortailCameraInputRef.current?.click()}>
                              Prendre une photo
                            </Button>
                            <Button size="small" variant="outlined" onClick={() => photoPlatinePortailInputRef.current?.click()}>
                              Galerie
                            </Button>
                          </>
                        )}
                        {!isMobile && (
                          <Button size="small" variant="outlined" onClick={() => photoPlatinePortailInputRef.current?.click()}>
                            Remplacer
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                ) : rapportData?.photo_platine_portail_url ? (
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, flexWrap: "wrap" }}>
                    <Box
                      sx={{
                        width: 140,
                        borderRadius: 1,
                        overflow: "hidden",
                        border: "2px solid #2e7d3240",
                        position: "relative",
                      }}
                    >
                      <Box sx={{ width: "100%", height: 100 }}>
                        <img
                          src={rapportData.photo_platine_portail_url}
                          alt="Photo platine portail"
                          style={{ width: "100%", height: "100%", objectFit: "cover", cursor: "pointer" }}
                          onClick={() => openVigikGallery("Photo platine portail")}
                        />
                      </Box>
                      <Typography variant="caption" sx={{ display: "block", px: 0.5, py: 0.5, color: "success.main" }}>
                        Photo jointe
                      </Typography>
                    </Box>
                    {!isDisabled && (
                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                        {isMobile && (
                          <>
                            <Button size="small" variant="outlined" onClick={() => photoPlatinePortailCameraInputRef.current?.click()}>
                              Prendre une photo
                            </Button>
                            <Button size="small" variant="outlined" onClick={() => photoPlatinePortailInputRef.current?.click()}>
                              Galerie
                            </Button>
                          </>
                        )}
                        {!isMobile && (
                          <Button size="small" variant="outlined" onClick={() => photoPlatinePortailInputRef.current?.click()}>
                            Remplacer
                          </Button>
                        )}
                      </Box>
                    )}
                  </Box>
                ) : (
                  <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
                    {isMobile ? (
                      <>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => photoPlatinePortailCameraInputRef.current?.click()}
                          disabled={isDisabled}
                        >
                          Prendre une photo
                        </Button>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => photoPlatinePortailInputRef.current?.click()}
                          disabled={isDisabled}
                        >
                          Galerie
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => photoPlatinePortailInputRef.current?.click()}
                        disabled={isDisabled}
                      >
                        Choisir une photo
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
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
            fullWidth
            size="small"
            disabled={isDisabled}
          />
          <TextField
            label="Prenom locataire"
            value={formData.locataire_prenom}
            onChange={(e) => handleFieldChange("locataire_prenom", e.target.value)}
            fullWidth
            size="small"
            disabled={isDisabled}
          />
          <TextField
            label="Telephone locataire"
            value={formData.locataire_telephone}
            onChange={(e) => handleFieldChange("locataire_telephone", e.target.value)}
            fullWidth
            size="small"
            disabled={isDisabled}
          />
          <TextField
            label="Email locataire"
            value={formData.locataire_email}
            onChange={(e) => handleFieldChange("locataire_email", e.target.value)}
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
          disabled={isDisabled}
        />
      </Paper>
      )}

      {/* Bouton Sauvegarder en bas du rapport (mobile) */}
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
            startIcon={saving ? <CircularProgress size={18} /> : <MdSave />}
            onClick={handleSaveClick}
            disabled={saving}
            sx={{
              minHeight: 48,
              backgroundColor: COLORS.infoDark || "#1976d2",
              fontWeight: 600,
            }}
          >
            {saving ? "Sauvegarde..." : "Sauvegarder"}
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
              ? "Vos modifications ont bien été enregistrées."
              : "Votre rapport a bien été créé."}
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
