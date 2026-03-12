import React, { useEffect, useState, useCallback } from "react";
import {
  Box, Button, TextField, Typography, Paper, MenuItem, Select,
  FormControl, InputLabel, Autocomplete, Chip, Alert, Snackbar,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
} from "@mui/material";
import {
  MdSave, MdAdd, MdCheckCircle, MdPictureAsPdf, MdArrowBack,
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

  const {
    fetchRapport, createRapport, updateRapport, uploadPhoto, updatePhoto,
    deletePhoto, uploadSignature, genererPdf, validerRapport,
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
    nom_residence: "",
    adresse_residence: "",
    logements_visites: "",
    locataire_nom: "",
    locataire_prenom: "",
    locataire_telephone: "",
    locataire_email: "",
    type_rapport: "intervention",
    statut: "brouillon",
    prestations: [{ ...EMPTY_PRESTATION }],
  });

  const [rapportData, setRapportData] = useState(null);
  const [titres, setTitres] = useState([]);
  const [techniciensSuggestions, setTechniciensSuggestions] = useState([]);
  const [societes, setSocietes] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [newTitreDialog, setNewTitreDialog] = useState(false);
  const [newTitreName, setNewTitreName] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const [saving, setSaving] = useState(false);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const loadReferences = useCallback(async () => {
    try {
      const [titresRes, rapportsRes, societesRes, chantiersRes] = await Promise.all([
        fetchTitres(),
        axios.get("/api/rapports-intervention/"),
        axios.get("/api/societe/"),
        axios.get("/api/chantier/"),
      ]);
      setTitres(titresRes || []);
      const rapportsList = rapportsRes.data?.results || rapportsRes.data || [];
      const uniqueTechniciens = [...new Set(rapportsList.map((r) => r.technicien).filter(Boolean))];
      setTechniciensSuggestions(uniqueTechniciens);
      setSocietes(societesRes.data?.results || societesRes.data || []);
      setChantiers(chantiersRes.data?.results || chantiersRes.data || []);
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
        nom_residence: data.nom_residence || "",
        adresse_residence: data.adresse_residence || "",
        logements_visites: data.logements_visites || "",
        locataire_nom: data.locataire_nom || "",
        locataire_prenom: data.locataire_prenom || "",
        locataire_telephone: data.locataire_telephone || "",
        locataire_email: data.locataire_email || "",
        type_rapport: data.type_rapport || "intervention",
        statut: data.statut || "brouillon",
        prestations: data.prestations?.length
          ? data.prestations
          : [{ ...EMPTY_PRESTATION }],
      });
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

  const handlePrestationChange = (index, updatedPrestation) => {
    setFormData((prev) => {
      const newPrestations = [...prev.prestations];
      newPrestations[index] = updatedPrestation;
      return { ...prev, prestations: newPrestations };
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

  const handleSave = async (newStatut) => {
    if (!formData.titre || !formData.technicien || !formData.objet_recherche || !formData.adresse_residence) {
      showSnackbar("Veuillez remplir les champs obligatoires (titre, technicien, objet, adresse)", "error");
      return;
    }
    setSaving(true);
    try {
      const dataToSend = {
        ...formData,
        statut: newStatut || formData.statut,
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

      setRapportData(result);
      showSnackbar(isEdit ? "Rapport mis a jour" : "Rapport cree avec succes");

      if (!isEdit && result?.id) {
        navigate(`/RapportIntervention/${result.id}`, { replace: true });
      } else {
        await loadRapport();
      }
    } catch (err) {
      showSnackbar("Erreur lors de la sauvegarde", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!rapportId) {
      showSnackbar("Sauvegardez d'abord le rapport", "error");
      return;
    }
    setSaving(true);
    try {
      const result = await validerRapport(rapportId);
      showSnackbar("Rapport valide et PDF genere");
      await loadRapport();
    } catch (err) {
      showSnackbar("Erreur lors de la validation", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!rapportId) return;
    setSaving(true);
    try {
      await genererPdf(rapportId);
      showSnackbar("PDF genere avec succes");
      await loadRapport();
    } catch (err) {
      showSnackbar("Erreur lors de la generation du PDF", "error");
    } finally {
      setSaving(false);
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

  const handleSaveSignature = async (dataUrl) => {
    if (!rapportId) {
      showSnackbar("Sauvegardez d'abord le rapport", "error");
      return;
    }
    try {
      await uploadSignature(rapportId, dataUrl);
      showSnackbar("Signature enregistree");
      await loadRapport();
    } catch (err) {
      showSnackbar("Erreur enregistrement signature", "error");
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

  const isDisabled = rapportData?.statut === "valide";

  return (
    <Box sx={{ p: { xs: 1, md: 3 }, maxWidth: 1000, mx: "auto" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            startIcon={<MdArrowBack />}
            onClick={onBack || (() => navigate("/RapportsIntervention"))}
            sx={{ color: COLORS.textMuted }}
          >
            Retour
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 700, color: COLORS.textOnDark }}>
            {isEdit ? "Modifier le rapport" : "Nouveau rapport d'intervention"}
          </Typography>
          {rapportData?.statut && (
            <Chip
              label={rapportData.statut === "valide" ? "Valide" : rapportData.statut === "en_cours" ? "En cours" : "Brouillon"}
              size="small"
              color={rapportData.statut === "valide" ? "success" : rapportData.statut === "en_cours" ? "warning" : "default"}
            />
          )}
        </Box>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {!isDisabled && (
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={18} /> : <MdSave />}
              onClick={() => handleSave(formData.statut)}
              disabled={saving}
              sx={{ backgroundColor: COLORS.infoDark || "#1976d2" }}
            >
              Sauvegarder
            </Button>
          )}
          {isEdit && !isDisabled && (
            <Button
              variant="contained"
              color="success"
              startIcon={<MdCheckCircle />}
              onClick={handleValidate}
              disabled={saving}
            >
              Valider
            </Button>
          )}
          {isEdit && (
            <Button
              variant="contained"
              startIcon={<MdPictureAsPdf />}
              onClick={handleGeneratePdf}
              disabled={saving}
              sx={{ backgroundColor: "#e65100", color: "#fff", "&:hover": { backgroundColor: "#bf360c" } }}
            >
              Generer PDF
            </Button>
          )}
        </Box>
      </Box>

      {/* Informations generales */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: COLORS.textOnDark }}>Informations generales</Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          {/* Type rapport */}
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

          {/* Titre */}
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

          {/* Date */}
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

          {/* Technicien */}
          <Autocomplete
            freeSolo
            options={techniciensSuggestions}
            value={formData.technicien || ""}
            onChange={(_, val) => handleFieldChange("technicien", val || "")}
            onInputChange={(_, val) => handleFieldChange("technicien", val || "")}
            renderInput={(params) => <TextField {...params} label="Technicien *" size="small" />}
            disabled={isDisabled}
          />

          {/* Client / Societe */}
          <Autocomplete
            options={societes}
            getOptionLabel={(opt) => opt?.nom_societe || ""}
            value={societes.find((s) => s.id === formData.client_societe) || null}
            onChange={(_, val) => handleFieldChange("client_societe", val?.id || "")}
            renderInput={(params) => <TextField {...params} label="Client / Bailleur" size="small" />}
            disabled={isDisabled}
          />

          {/* Chantier */}
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
          rows={2}
          size="small"
          sx={{ mt: 2 }}
          disabled={isDisabled}
        />

        <TextField
          label="Resultat"
          value={formData.resultat}
          onChange={(e) => handleFieldChange("resultat", e.target.value)}
          fullWidth
          multiline
          rows={2}
          size="small"
          sx={{ mt: 2 }}
          disabled={isDisabled}
        />
      </Paper>

      {/* Residence & Locataire */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: COLORS.textOnDark }}>Residence & Locataire</Typography>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
          <TextField
            label="Nom de la résidence"
            value={formData.nom_residence}
            onChange={(e) => handleFieldChange("nom_residence", e.target.value)}
            fullWidth
            size="small"
            disabled={isDisabled}
          />
          <TextField
            label="Adresse résidence *"
            value={formData.adresse_residence}
            onChange={(e) => handleFieldChange("adresse_residence", e.target.value)}
            fullWidth
            size="small"
            disabled={isDisabled}
          />
          <TextField
            label="Logements "
            value={formData.logements_visites}
            onChange={(e) => handleFieldChange("logements_visites", e.target.value)}
            fullWidth
            multiline
            minRows={2}
            size="small"
            disabled={isDisabled}
            placeholder="Logements ou endroits visités..."
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
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, color: COLORS.textOnDark }}>Prestations</Typography>
          {!isDisabled && (
            <Button variant="outlined" startIcon={<MdAdd />} onClick={handleAddPrestation} size="small">
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
            disabled={isDisabled}
            isSaved={!!prestation.id}
          />
        ))}
      </Paper>

      {/* Signature */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <SignaturePad
          onSave={handleSaveSignature}
          existingSignatureUrl={rapportData?.signature_url}
          disabled={isDisabled || !rapportId}
        />
        {!rapportId && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
            Sauvegardez le rapport pour pouvoir ajouter la signature.
          </Typography>
        )}
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
