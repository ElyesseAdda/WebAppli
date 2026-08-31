import {
  Avatar,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Slider,
  Switch,
  Typography,
} from "@mui/material";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { MdCrop, MdDeleteForever, MdImage, MdZoomIn } from "react-icons/md";
import {
  createCroppedLogoBlob,
  deleteLogoClientDiagramme,
  uploadLogoClientDiagramme,
} from "./ganttLogoUtils";

/**
 * Sélecteur de logo client pour un diagramme Gantt (création ou édition).
 * En mode création (`diagrammeId` absent), le blob recadré est remonté via `onPendingLogo`.
 */
const GanttLogoClientPicker = ({
  diagrammeId = null,
  logoUrl = "",
  afficherLogoClient = false,
  onAfficherChange,
  onLogoUpdated,
  pendingPreviewUrl = "",
  onPendingLogo,
  disabled = false,
  compact = false,
}) => {
  const inputId = useId();
  const fileInputRef = useRef(null);
  const [cropDialog, setCropDialog] = useState(false);
  const [cropImage, setCropImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [uploading, setUploading] = useState(false);

  const previewUrl = pendingPreviewUrl || logoUrl;

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(pendingPreviewUrl);
      }
    };
  }, [pendingPreviewUrl]);

  const onCropComplete = useCallback((_, pixels) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const taille = compact ? 44 : 50;

  const handleDeleteClick = (event) => {
    event.preventDefault();
    event.stopPropagation();
    supprimerLogo();
  };

  const stylesAvatar = {
    width: taille,
    height: taille,
    border: "2px solid #e0e0e0",
    pointerEvents: "none",
  };

  const labelSx = {
    display: "inline-flex",
    cursor: disabled ? "default" : "pointer",
    borderRadius: 1,
    lineHeight: 0,
    "&:hover .logo-placeholder": disabled
      ? {}
      : {
          borderColor: "#1976d2",
          color: "#1976d2",
        },
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
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

  const annulerCrop = () => {
    setCropDialog(false);
    setCropImage(null);
  };

  const confirmerCrop = async () => {
    if (!cropImage || !croppedAreaPixels) return;
    setCropDialog(false);
    setUploading(true);
    try {
      const blob = await createCroppedLogoBlob(cropImage, croppedAreaPixels);
      if (diagrammeId) {
        const data = await uploadLogoClientDiagramme(diagrammeId, blob);
        onLogoUpdated?.(data);
      } else {
        onPendingLogo?.(blob);
        if (onAfficherChange) onAfficherChange(true);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setUploading(false);
      setCropImage(null);
    }
  };

  const supprimerLogo = async () => {
    if (disabled) return;
    if (diagrammeId) {
      setUploading(true);
      try {
        const data = await deleteLogoClientDiagramme(diagrammeId);
        onLogoUpdated?.(data);
      } catch (error) {
        console.error(error);
      } finally {
        setUploading(false);
      }
      return;
    }
    onPendingLogo?.(null);
    if (onAfficherChange) onAfficherChange(false);
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: compact ? "center" : "flex-start",
        gap: 1.5,
        flexWrap: "wrap",
      }}
    >
      <input
        id={inputId}
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled}
        style={{ display: "none" }}
      />

      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        {uploading ? (
          <CircularProgress size={taille} />
        ) : previewUrl ? (
          <Box sx={{ position: "relative" }}>
            <Box
              component="label"
              htmlFor={disabled ? undefined : inputId}
              sx={labelSx}
            >
              <Avatar
                src={previewUrl}
                variant="rounded"
                sx={stylesAvatar}
              />
            </Box>
            {!disabled && (
              <IconButton
                size="small"
                onClick={handleDeleteClick}
                sx={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  zIndex: 2,
                  backgroundColor: "#fff",
                  border: "1px solid #e0e0e0",
                  p: "2px",
                  "&:hover": { backgroundColor: "#ffebee" },
                }}
              >
                <MdDeleteForever size={14} color="#c62828" />
              </IconButton>
            )}
          </Box>
        ) : (
          <Box
            component="label"
            htmlFor={disabled ? undefined : inputId}
            sx={labelSx}
          >
            <Avatar
              variant="rounded"
              className="logo-placeholder"
              sx={{
                ...stylesAvatar,
                backgroundColor: "#f0f0f0",
                color: "#999",
                border: "2px dashed #ccc",
              }}
            >
              <MdImage size={22} />
            </Avatar>
          </Box>
        )}
        {!compact && (
          <Box>
            <Typography variant="body2" sx={{ fontWeight: 500, fontSize: 13 }}>
              Logo client
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Cliquez pour ajouter ou modifier
            </Typography>
          </Box>
        )}
      </Box>

      {(previewUrl || afficherLogoClient) && onAfficherChange && (
        <FormControlLabel
          control={
            <Switch
              size="small"
              checked={Boolean(afficherLogoClient)}
              disabled={disabled || !previewUrl}
              onChange={(event) => onAfficherChange(event.target.checked)}
            />
          }
          label={
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              Afficher dans le PDF
            </Typography>
          }
          sx={{ ml: 0, mr: 0 }}
        />
      )}

      <Dialog open={cropDialog} onClose={annulerCrop} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MdCrop size={22} />
          Recadrer le logo client
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: 350,
              backgroundColor: "#333",
            }}
          >
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
          <Box
            sx={{
              px: 3,
              py: 2,
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <MdZoomIn size={22} color="#666" />
            <Slider
              value={zoom}
              min={1}
              max={4}
              step={0.1}
              onChange={(_, valeur) => setZoom(valeur)}
              sx={{ flex: 1 }}
            />
            <Typography variant="body2" sx={{ minWidth: 40, textAlign: "right" }}>
              {Math.round(zoom * 100)}%
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={annulerCrop}>Annuler</Button>
          <Button variant="contained" onClick={confirmerCrop}>
            Valider
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GanttLogoClientPicker;
