import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Box, Button, TextField, Typography, Paper, MenuItem, Select,
  FormControl, InputLabel, Autocomplete, Chip, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  MdSave, MdAdd, MdPictureAsPdf, MdArrowBack,
} from "react-icons/md";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { COLORS } from "../../constants/colors";
import { useRapports } from "../../hooks/useRapports";
import PrestationSection from "./PrestationSection";
import SignaturePad from "./SignaturePad";

const EMPTY_PRESTATION = {
  localisation: "",
  probleme: "",
  solution: "",
  commentaire: "",
  prestation_possible: true,
  prestation_realisee: "",
};

const RapportForm = ({ rapportId: propRapportId, onBack }) => {
  const { id: paramId } = useParams();
  const rapportId = propRapportId || paramId;
  const isEdit = !!rapportId;
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const {
    fetchRapport, createRapport, updateRapport, uploadPhoto, updatePhoto,
    deletePhoto, uploadSignature, genererPdf,
    fetchTitres, createTitre, loading,
  } = useRapports();

  const [formData, setFormData] = useState({
    titre: "",
    date: new Date().toISOString().split("T")[0],
    technicien: "",
    objet_recherche: "",
    resultat: "",
    client_societe: "",
    chantier: "",
    residence: null,
    residence_nom: "",
    residence_adresse: "",
    logement: "",
    locataire_nom: "",
    locataire_prenom: "",
    locataire_telephone: "",
    locataire_email: "",
    type_rapport: "intervention",
    statut: "a_faire",
    prestations: [{ ...EMPTY_PRESTATION }],
  });

  const [rapportData, setRapportData] = useState(null);
  const [titres, setTitres] = useState([]);
  const [techniciensSuggestions, setTechniciensSuggestions] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [residences, setResidences] = useState([]);
  const [selectedResidence, setSelectedResidence] = useState(null);
  const [pendingPhotos, setPendingPhotos] = useState({});
  const signaturePadRef = useRef(null);
  const [newTitreDialog, setNewTitreDialog] = useState(false);
  const [newTitreName, setNewTitreName] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [saving, setSaving] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const loadReferences = useCallback(async () => {
    try {
      const [titresRes, rapportsRes, societesRes, chantiersRes, residencesRes] = await Promise.all([
        fetchTitres(),
        axios.get("/api/rapports-intervention/"),
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

  const loadRapport = useCallback(async () => {
    if (!rapportId) return;
    try {
      const data = await fetchRapport(rapportId);
      setRapportData(data);
      setFormData({
        titre: data.titre || "",
        date: data.date || "",
        technicien: data.technicien || "",
        objet_recherche: data.objet_recherche || "",
        resultat: data.resultat || "",
        client_societe: data.client_societe || "",
        chantier: data.chantier || "",
        residence: data.residence || null,
        residence_nom: data.residence_nom || "",
        residence_adresse: data.residence_adresse || "",
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
      });
      if (data.residence_data) {
        setSelectedResidence(data.residence_data);
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

  const handleResidenceChange = (_, value) => {
    if (value && typeof value === "object" && value.id) {
      setSelectedResidence(value);
      const dr = value.dernier_rapport;
      setFormData((prev) => ({
        ...prev,
        residence: value.id,
        residence_nom: value.nom,
        residence_adresse: value.adresse || "",
        client_societe: dr?.client_societe || value.client_societe || prev.client_societe,
        chantier: dr?.chantier || value.chantier || prev.chantier,
        technicien: dr?.technicien || prev.technicien,
      }));
    } else {
      const newName = typeof value === "string" ? value : value?.inputValue || "";
      setSelectedResidence(null);
      setFormData((prev) => ({
        ...prev,
        residence: null,
        residence_nom: newName,
        residence_adresse: "",
      }));
    }
  };

  const handleResidenceInputChange = (_, value) => {
    if (!selectedResidence) {
      setFormData((prev) => ({ ...prev, residence_nom: value }));
    }
  };

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

  const handleSave = async () => {
    if (!formData.titre || !formData.technicien || !formData.objet_recherche) {
      showSnackbar("Veuillez remplir les champs obligatoires (titre, technicien, objet)", "error");
      return;
    }
    const hasPrestation = formData.prestations.some(
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
      const dataToSend = {
        ...formData,
        statut: statutToSend,
        prestations: formData.prestations.map((p, i) => ({
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

      if (result?.prestations) {
        await uploadPendingPhotos(result);
      } else {
        const fullResult = await fetchRapport(savedId);
        await uploadPendingPhotos(fullResult);
      }

      await uploadPendingSignature(savedId);

      showSnackbar(isEdit ? "Rapport mis a jour" : "Rapport cree avec succes");

      if (!isEdit && savedId) {
        navigate(`/RapportIntervention/${savedId}`, { replace: true });
      }
      await loadRapport();
      loadReferences();
    } catch (err) {
      showSnackbar("Erreur lors de la sauvegarde", "error");
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

  const isDisabled = rapportData?.statut === "termine";
  const isNewResidence = !selectedResidence && !!formData.residence_nom;

  const sectionSpacing = isMobile ? 4 : 3;
  const fieldGap = isMobile ? 3 : 2;
  const inputMinHeight = isMobile ? 48 : undefined;

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
            {isEdit ? "Modifier le rapport" : "Nouveau rapport d'intervention"}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", "& .MuiButton-root": { minHeight: isMobile ? 48 : 36 } }}>
          {!isDisabled && (
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} /> : <MdSave />}
              onClick={() => handleSave()}
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
            >
              <MenuItem value="intervention">Rapport d'intervention</MenuItem>
              <MenuItem value="vigik_plus" disabled>Vigik+ (bientot)</MenuItem>
            </Select>
          </FormControl>

          <Box sx={{ display: "flex", gap: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Titre *</InputLabel>
              <Select
                value={formData.titre}
                label="Titre *"
                onChange={(e) => handleFieldChange("titre", e.target.value)}
                disabled={isDisabled}
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
            >
              <MdAdd />
            </Button>
          </Box>

          <Autocomplete
            freeSolo
            options={residences}
            getOptionLabel={(opt) => {
              if (typeof opt === "string") return opt;
              return opt?.nom || "";
            }}
            value={selectedResidence || formData.residence_nom || ""}
            onChange={handleResidenceChange}
            onInputChange={handleResidenceInputChange}
            filterOptions={(options, params) => {
              const filtered = options.filter((o) =>
                o.nom.toLowerCase().includes(params.inputValue.toLowerCase())
              );
              if (params.inputValue && !filtered.some((o) => o.nom.toLowerCase() === params.inputValue.toLowerCase())) {
                filtered.push({ inputValue: params.inputValue, nom: `Creer "${params.inputValue}"` });
              }
              return filtered;
            }}
            renderOption={(props, option) => (
              <li {...props} key={option.id || option.inputValue || option.nom}>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: option.inputValue ? 600 : 400 }}>
                    {option.nom}
                  </Typography>
                  {option.adresse && (
                    <Typography variant="caption" color="text.secondary">{option.adresse}</Typography>
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
            renderInput={(params) => <TextField {...params} label="Residence *" size="small" />}
            disabled={isDisabled}
            isOptionEqualToValue={(opt, val) => {
              if (typeof val === "string") return opt?.nom === val;
              return opt?.id === val?.id;
            }}
            sx={{ gridColumn: { md: "1 / -1" } }}
          />

          {selectedResidence && (
            <Alert severity="info" sx={{ gridColumn: { md: "1 / -1" } }}>
              Residence existante : <strong>{selectedResidence.nom}</strong>
              {selectedResidence.adresse && ` - ${selectedResidence.adresse}`}
              {(selectedResidence.dernier_rapport?.client_societe_nom || selectedResidence.client_societe_nom) &&
                ` (Client: ${selectedResidence.dernier_rapport?.client_societe_nom || selectedResidence.client_societe_nom})`}
              {selectedResidence.dernier_rapport?.technicien &&
                ` | Technicien: ${selectedResidence.dernier_rapport.technicien}`}
            </Alert>
          )}

          {isNewResidence && (
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

          <TextField
            label="Date *"
            type="date"
            value={formData.date}
            onChange={(e) => handleFieldChange("date", e.target.value)}
            fullWidth
            size="small"
            InputLabelProps={{ shrink: true }}
            disabled={isDisabled}
          />

          <Autocomplete
            freeSolo
            options={techniciensSuggestions}
            value={formData.technicien || ""}
            onChange={(_, val) => handleFieldChange("technicien", val || "")}
            onInputChange={(_, val) => handleFieldChange("technicien", val || "")}
            renderInput={(params) => <TextField {...params} label="Technicien *" size="small" />}
            disabled={isDisabled}
          />

          <Autocomplete
            options={societes}
            getOptionLabel={(opt) => opt?.nom_societe || ""}
            value={societes.find((s) => s.id === formData.client_societe) || null}
            onChange={(_, val) => handleFieldChange("client_societe", val?.id || "")}
            renderInput={(params) => <TextField {...params} label="Client / Bailleur" size="small" />}
            disabled={isDisabled}
          />

          <Autocomplete
            options={chantiers}
            getOptionLabel={(opt) => opt?.chantier_name || ""}
            value={chantiers.find((c) => c.id === formData.chantier) || null}
            onChange={(_, val) => handleFieldChange("chantier", val?.id || "")}
            renderInput={(params) => <TextField {...params} label="Chantier (optionnel)" size="small" />}
            disabled={isDisabled}
          />
        </Box>

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
      </Paper>

      {/* Logement & Locataire */}
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
          Logement & Locataire
        </Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: fieldGap }}>
          <TextField
            label="Logement"
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

      {/* Prestations */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, sm: 3 },
          mb: sectionSpacing,
          borderRadius: 2,
          border: `1px solid ${COLORS.border || "#e0e0e0"}`,
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: { xs: 2.5, md: 2 },
            flexWrap: "wrap",
            gap: 1.5,
          }}
        >
          <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.primary }}>
            Prestations
          </Typography>
          {!isDisabled && (
            <Button
              variant="outlined"
              startIcon={<MdAdd />}
              onClick={handleAddPrestation}
              size="small"
              sx={{ minHeight: isMobile ? 48 : 36 }}
            >
              Ajouter une prestation
            </Button>
          )}
        </Box>

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
      </Paper>

      {/* Signature */}
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
