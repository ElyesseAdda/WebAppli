import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Box, Button, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Avatar,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  Snackbar, Alert, CircularProgress, Slider,
} from "@mui/material";
import {
  MdAdd, MdEdit, MdDelete, MdBusiness, MdImage, MdDeleteForever,
  MdCrop, MdZoomIn,
} from "react-icons/md";
import Cropper from "react-easy-crop";
import axios from "axios";
import { COLORS } from "../constants/colors";

const createCroppedImage = (imageSrc, pixelCrop) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(
        image,
        pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
        0, 0, pixelCrop.width, pixelCrop.height
      );
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error("Canvas vide"));
        resolve(blob);
      }, "image/png", 1);
    };
    image.onerror = reject;
    image.crossOrigin = "anonymous";
    image.src = imageSrc;
  });
};

const ListeClient = () => {
  const [societes, setSocietes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [editingSociete, setEditingSociete] = useState(null);
  const [formData, setFormData] = useState({
    nom_societe: "",
    ville_societe: "",
    rue_societe: "",
    codepostal_societe: "",
    client_name: "",
  });
  const [clients, setClients] = useState([]);
  const [uploadingLogo, setUploadingLogo] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const fileInputRef = useRef(null);
  const logoTargetId = useRef(null);

  const [cropDialog, setCropDialog] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  };

  const fetchSocietes = useCallback(async () => {
    setLoading(true);
    try {
      const [socRes, clientRes] = await Promise.all([
        axios.get("/api/societe/"),
        axios.get("/api/client/"),
      ]);
      setSocietes(socRes.data?.results || socRes.data || []);
      setClients(clientRes.data?.results || clientRes.data || []);
    } catch (err) {
      showSnackbar("Erreur lors du chargement", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSocietes();
  }, [fetchSocietes]);

  const handleOpenCreate = () => {
    setEditingSociete(null);
    setFormData({ nom_societe: "", ville_societe: "", rue_societe: "", codepostal_societe: "", client_name: "" });
    setOpenModal(true);
  };

  const handleOpenEdit = (societe) => {
    setEditingSociete(societe);
    setFormData({
      nom_societe: societe.nom_societe || "",
      ville_societe: societe.ville_societe || "",
      rue_societe: societe.rue_societe || "",
      codepostal_societe: societe.codepostal_societe || "",
      client_name: societe.client_name || "",
    });
    setOpenModal(true);
  };

  const handleSave = async () => {
    if (!formData.nom_societe.trim()) {
      showSnackbar("Le nom de la societe est requis", "error");
      return;
    }
    try {
      if (editingSociete) {
        await axios.put(`/api/societe/${editingSociete.id}/`, formData);
        showSnackbar("Societe mise a jour");
      } else {
        await axios.post("/api/societe/", formData);
        showSnackbar("Societe creee");
      }
      setOpenModal(false);
      fetchSocietes();
    } catch (err) {
      showSnackbar("Erreur lors de la sauvegarde", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Supprimer cette societe ?")) return;
    try {
      await axios.delete(`/api/societe/${id}/`);
      showSnackbar("Societe supprimee");
      fetchSocietes();
    } catch {
      showSnackbar("Erreur lors de la suppression", "error");
    }
  };

  const handleLogoClick = (societeId) => {
    logoTargetId.current = societeId;
    fileInputRef.current?.click();
  };

  const handleLogoFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      setCropDialog(true);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((_, croppedPixels) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!cropImage || !croppedAreaPixels || !logoTargetId.current) return;
    const societeId = logoTargetId.current;
    setCropDialog(false);
    setUploadingLogo(societeId);
    try {
      const croppedBlob = await createCroppedImage(cropImage, croppedAreaPixels);
      const fd = new FormData();
      fd.append("logo", croppedBlob, "logo.png");
      await axios.post(`/api/societe/${societeId}/upload_logo/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      showSnackbar("Logo mis a jour");
      fetchSocietes();
    } catch (err) {
      showSnackbar("Erreur lors de l'upload du logo", "error");
    } finally {
      setUploadingLogo(null);
      setCropImage(null);
    }
  };

  const handleCropCancel = () => {
    setCropDialog(false);
    setCropImage(null);
  };

  const handleDeleteLogo = async (societeId) => {
    try {
      await axios.delete(`/api/societe/${societeId}/delete_logo/`);
      showSnackbar("Logo supprime");
      fetchSocietes();
    } catch {
      showSnackbar("Erreur lors de la suppression du logo", "error");
    }
  };

  const getClientName = (clientId) => {
    const client = clients.find((c) => c.id === clientId);
    return client ? `${client.name} ${client.surname}` : "-";
  };

  return (
    <Box sx={{ p: 3 }}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleLogoFileChange}
        style={{ display: "none" }}
      />

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MdBusiness size={32} color={COLORS.accent || "#46acc2"} />
          <Typography variant="h4" component="h1" sx={{ color: COLORS.textOnDark }}>
            Liste Client / Societes
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<MdAdd />}
          onClick={handleOpenCreate}
          sx={{ backgroundColor: COLORS.infoDark || "#1976d2", "&:hover": { backgroundColor: "#1565c0" } }}
        >
          Nouvelle societe
        </Button>
      </Box>

      <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: "1px solid #e0e0e0" }}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f5f5f5" }}>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>Logo</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Nom societe</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Contact</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Ville</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Adresse</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Code postal</TableCell>
              <TableCell sx={{ fontWeight: 700, textAlign: "center" }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                  <CircularProgress size={30} />
                </TableCell>
              </TableRow>
            ) : societes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} sx={{ textAlign: "center", py: 4 }}>
                  <Typography variant="body1" color="text.secondary">Aucune societe</Typography>
                </TableCell>
              </TableRow>
            ) : (
              societes.map((societe) => (
                <TableRow key={societe.id} hover>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                      {uploadingLogo === societe.id ? (
                        <CircularProgress size={40} />
                      ) : societe.logo_s3_key ? (
                        <Box sx={{ position: "relative" }}>
                          <Avatar
                            src={societe.logo_url || ""}
                            variant="rounded"
                            sx={{ width: 50, height: 50, cursor: "pointer", border: "2px solid #e0e0e0" }}
                            onClick={() => handleLogoClick(societe.id)}
                          >
                            <MdBusiness />
                          </Avatar>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteLogo(societe.id)}
                            sx={{
                              position: "absolute", top: -8, right: -8,
                              backgroundColor: "#fff", border: "1px solid #e0e0e0",
                              padding: "2px", "&:hover": { backgroundColor: "#ffebee" },
                            }}
                          >
                            <MdDeleteForever size={14} color="#c62828" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Avatar
                          variant="rounded"
                          sx={{
                            width: 50, height: 50, cursor: "pointer",
                            backgroundColor: "#f0f0f0", color: "#999",
                            border: "2px dashed #ccc",
                            "&:hover": { borderColor: COLORS.accent || "#46acc2", color: COLORS.accent || "#46acc2" },
                          }}
                          onClick={() => handleLogoClick(societe.id)}
                        >
                          <MdImage size={24} />
                        </Avatar>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>{societe.nom_societe}</TableCell>
                  <TableCell>{getClientName(societe.client_name)}</TableCell>
                  <TableCell>{societe.ville_societe || "-"}</TableCell>
                  <TableCell>{societe.rue_societe || "-"}</TableCell>
                  <TableCell>{societe.codepostal_societe || "-"}</TableCell>
                  <TableCell sx={{ textAlign: "center", whiteSpace: "nowrap" }}>
                    <IconButton size="small" color="primary" onClick={() => handleOpenEdit(societe)}>
                      <MdEdit />
                    </IconButton>
                    <IconButton size="small" color="error" onClick={() => handleDelete(societe.id)}>
                      <MdDelete />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Modal edition societe */}
      <Dialog open={openModal} onClose={() => setOpenModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingSociete ? "Modifier la societe" : "Nouvelle societe"}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth margin="normal" label="Nom de la societe *"
            value={formData.nom_societe}
            onChange={(e) => setFormData((p) => ({ ...p, nom_societe: e.target.value }))}
          />
          <TextField
            fullWidth margin="normal" label="Ville"
            value={formData.ville_societe}
            onChange={(e) => setFormData((p) => ({ ...p, ville_societe: e.target.value }))}
          />
          <TextField
            fullWidth margin="normal" label="Rue"
            value={formData.rue_societe}
            onChange={(e) => setFormData((p) => ({ ...p, rue_societe: e.target.value }))}
          />
          <TextField
            fullWidth margin="normal" label="Code postal"
            value={formData.codepostal_societe}
            onChange={(e) => setFormData((p) => ({ ...p, codepostal_societe: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenModal(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleSave}>
            {editingSociete ? "Mettre a jour" : "Creer"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de recadrage du logo */}
      <Dialog open={cropDialog} onClose={handleCropCancel} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MdCrop size={22} /> Recadrer le logo
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ position: "relative", width: "100%", height: 350, backgroundColor: "#333" }}>
            {cropImage && (
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                cropShape="rect"
                showGrid
              />
            )}
          </Box>
          <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", gap: 2 }}>
            <MdZoomIn size={22} color="#666" />
            <Slider
              value={zoom}
              min={1}
              max={4}
              step={0.1}
              onChange={(_, val) => setZoom(val)}
              sx={{ flex: 1 }}
            />
            <Typography variant="body2" sx={{ minWidth: 40, textAlign: "right" }}>
              {Math.round(zoom * 100)}%
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCropCancel}>Annuler</Button>
          <Button variant="contained" onClick={handleCropConfirm}>
            Valider et enregistrer
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert onClose={() => setSnackbar((s) => ({ ...s, open: false }))} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ListeClient;
