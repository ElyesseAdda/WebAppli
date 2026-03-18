import React, { useRef, useMemo, useState } from "react";
import { Box, Button, IconButton, Typography, Chip, TextField, CircularProgress } from "@mui/material";
import { MdAddAPhoto, MdDelete, MdPhotoCamera, MdPhotoLibrary } from "react-icons/md";
import { COLORS } from "../../constants/colors";
import { compressImage } from "../../utils/compressImage";

const TYPE_LABELS = {
  avant: "Avant travaux",
  en_cours: "En cours",
  apres: "Apres travaux",
};

const TYPE_COLORS = {
  avant: COLORS.infoDark || "#1976d2",
  en_cours: "#ed6c02",
  apres: "#2e7d32",
};

const PhotoManager = ({
  photos = [],
  pendingPhotos = [],
  onUpload,
  onDelete,
  onUpdatePhoto,
  onAddPendingPhoto,
  onRemovePendingPhoto,
  disabled,
  prestationId,
  isMobile = false,
}) => {
  const fileInputRef = useRef(null);
  const fileInputCameraRef = useRef(null);
  const currentTypeRef = useRef("avant");
  const [compressing, setCompressing] = useState(false);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    setCompressing(true);
    try {
      const compressed = await Promise.all(files.map((f) => compressImage(f)));

      if (prestationId) {
        for (const file of compressed) {
          await onUpload(prestationId, file, currentTypeRef.current);
        }
      } else if (onAddPendingPhoto) {
        for (const file of compressed) {
          onAddPendingPhoto(file, currentTypeRef.current);
        }
      }
    } finally {
      setCompressing(false);
    }
    e.target.value = "";
  };

  const triggerUpload = (type, source = "gallery") => {
    currentTypeRef.current = type;
    if (source === "camera" && fileInputCameraRef.current) {
      fileInputCameraRef.current.click();
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleDateChange = (photoId, newDate) => {
    if (onUpdatePhoto) {
      onUpdatePhoto(photoId, { date_photo: newDate });
    }
  };

  const allPhotos = useMemo(() => {
    const saved = photos.map((p) => ({ ...p, _pending: false }));
    const pending = pendingPhotos.map((p, i) => ({
      ...p,
      _pending: true,
      _index: i,
      image_url: p._previewUrl,
    }));
    return [...saved, ...pending];
  }, [photos, pendingPhotos]);

  const photosByType = {
    avant: allPhotos.filter((p) => p.type_photo === "avant"),
    en_cours: allPhotos.filter((p) => p.type_photo === "en_cours"),
    apres: allPhotos.filter((p) => p.type_photo === "apres"),
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />
      <input
        ref={fileInputCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        {Object.entries(TYPE_LABELS).map(([type, label]) =>
          isMobile ? (
            <Box key={type} sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, color: TYPE_COLORS[type] }}>
                {label}
              </Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<MdPhotoCamera />}
                  disabled={disabled || compressing}
                  onClick={() => triggerUpload(type, "camera")}
                  sx={{
                    borderColor: TYPE_COLORS[type],
                    color: TYPE_COLORS[type],
                    minHeight: 44,
                    "&:hover": {
                      borderColor: TYPE_COLORS[type],
                      backgroundColor: `${TYPE_COLORS[type]}10`,
                    },
                  }}
                >
                  Prendre une photo
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<MdPhotoLibrary />}
                  disabled={disabled || compressing}
                  onClick={() => triggerUpload(type, "gallery")}
                  sx={{
                    borderColor: TYPE_COLORS[type],
                    color: TYPE_COLORS[type],
                    minHeight: 44,
                    "&:hover": {
                      borderColor: TYPE_COLORS[type],
                      backgroundColor: `${TYPE_COLORS[type]}10`,
                    },
                  }}
                >
                  Galerie
                </Button>
              </Box>
            </Box>
          ) : (
            <Button
              key={type}
              size="small"
              variant="outlined"
              startIcon={<MdAddAPhoto />}
              disabled={disabled || compressing}
              onClick={() => triggerUpload(type, "gallery")}
              sx={{
                borderColor: TYPE_COLORS[type],
                color: TYPE_COLORS[type],
                "&:hover": {
                  borderColor: TYPE_COLORS[type],
                  backgroundColor: `${TYPE_COLORS[type]}10`,
                },
              }}
            >
              {label}
            </Button>
          )
        )}
        {compressing && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <CircularProgress size={16} />
            <Typography variant="caption" color="text.secondary">Compression...</Typography>
          </Box>
        )}
      </Box>

      {Object.entries(photosByType).map(([type, typePhotos]) =>
        typePhotos.length > 0 ? (
          <Box key={type} sx={{ mb: 2 }}>
            <Chip
              label={TYPE_LABELS[type]}
              size="small"
              sx={{
                mb: 1,
                backgroundColor: `${TYPE_COLORS[type]}15`,
                color: TYPE_COLORS[type],
                fontWeight: 600,
              }}
            />
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              {typePhotos.map((photo, idx) => (
                <Box
                  key={photo.id || `pending-${photo._index}-${idx}`}
                  sx={{
                    width: 140,
                    borderRadius: 1,
                    overflow: "hidden",
                    border: `2px solid ${photo._pending ? "#ff980040" : `${TYPE_COLORS[type]}40`}`,
                    position: "relative",
                  }}
                >
                  {photo._pending && (
                    <Chip
                      label="En attente"
                      size="small"
                      sx={{
                        position: "absolute", top: 2, left: 2, zIndex: 1,
                        fontSize: 9, height: 18,
                        backgroundColor: "rgba(255,152,0,0.9)", color: "#fff",
                      }}
                    />
                  )}
                  <Box sx={{ position: "relative", width: "100%", height: 100 }}>
                    <img
                      src={photo.image_url}
                      alt={photo.filename || "Photo"}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {!disabled && (
                      <IconButton
                        size="small"
                        onClick={() => {
                          if (photo._pending) {
                            onRemovePendingPhoto?.(photo._index);
                          } else {
                            onDelete(photo.id);
                          }
                        }}
                        sx={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          backgroundColor: "rgba(255,255,255,0.85)",
                          "&:hover": { backgroundColor: "#ffebee" },
                          padding: "2px",
                        }}
                      >
                        <MdDelete size={16} color="#c62828" />
                      </IconButton>
                    )}
                  </Box>
                  {!photo._pending && (
                    <TextField
                      type="date"
                      size="small"
                      value={photo.date_photo || new Date().toISOString().split("T")[0]}
                      onChange={(e) => handleDateChange(photo.id, e.target.value)}
                      disabled={disabled}
                      inputProps={{ style: { fontSize: 11, padding: "3px 6px" } }}
                      sx={{ width: "100%", "& .MuiOutlinedInput-notchedOutline": { border: "none" } }}
                    />
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        ) : null
      )}

      {allPhotos.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
          Aucune photo. Utilisez les boutons ci-dessus pour ajouter des photos.
        </Typography>
      )}
    </Box>
  );
};

export default PhotoManager;
