import React, { useRef, useMemo, useState, useEffect } from "react";
import { Box, Button, IconButton, Typography, Chip, TextField, CircularProgress, Dialog } from "@mui/material";
import {
  MdAddAPhoto,
  MdDelete,
  MdPhotoCamera,
  MdPhotoLibrary,
  MdChevronLeft,
  MdChevronRight,
  MdClose,
} from "react-icons/md";
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
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const touchStartXRef = useRef(null);

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

  const openGallery = (photo) => {
    const idx = allPhotos.findIndex((p) =>
      (photo.id && p.id === photo.id) ||
      (!photo.id && p._pending && photo._pending && p._index === photo._index && p.filename === photo.filename)
    );
    setGalleryIndex(idx >= 0 ? idx : 0);
    setGalleryOpen(true);
  };

  const closeGallery = () => setGalleryOpen(false);

  const goPrev = () => {
    if (!allPhotos.length) return;
    setGalleryIndex((prev) => (prev - 1 + allPhotos.length) % allPhotos.length);
  };

  const goNext = () => {
    if (!allPhotos.length) return;
    setGalleryIndex((prev) => (prev + 1) % allPhotos.length);
  };

  const activePhoto = allPhotos[galleryIndex] || null;
  const activeType = activePhoto?.type_photo;
  const activeDate = activePhoto?.date_photo || new Date().toISOString().split("T")[0];

  useEffect(() => {
    if (!galleryOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "Escape") closeGallery();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [galleryOpen, allPhotos.length]);

  useEffect(() => {
    if (galleryOpen) setZoom(1);
  }, [galleryOpen, galleryIndex]);

  const handleTouchStart = (e) => {
    touchStartXRef.current = e.changedTouches?.[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e) => {
    const startX = touchStartXRef.current;
    const endX = e.changedTouches?.[0]?.clientX ?? null;
    if (startX == null || endX == null) return;
    const delta = endX - startX;
    if (Math.abs(delta) < 40) return;
    if (delta > 0) goPrev();
    else goNext();
  };

  return (
    <>
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
                      onClick={() => openGallery(photo)}
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
    <Dialog
      open={galleryOpen}
      onClose={closeGallery}
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
          onClick={closeGallery}
          sx={{ position: "absolute", top: 8, right: 8, color: "#fff", zIndex: 2 }}
        >
          <MdClose />
        </IconButton>

        {activePhoto && (
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
                  label={TYPE_LABELS[activeType] || "Photo"}
                  size="small"
                  sx={{
                    backgroundColor: `${TYPE_COLORS[activeType] || "#1976d2"}50`,
                    color: "#fff",
                    fontWeight: 600,
                  }}
                />
                {activePhoto._pending && (
                  <Chip
                    label="En attente"
                    size="small"
                    sx={{ backgroundColor: "#ff9800", color: "#fff", fontWeight: 600 }}
                  />
                )}
                <Typography variant="body2" sx={{ color: "#ddd" }}>
                  Date: {activeDate}
                </Typography>
              </Box>
              <Typography variant="caption" sx={{ color: "#bbb" }}>
                {galleryIndex + 1} / {allPhotos.length}
              </Typography>
            </Box>

            <Box sx={{ position: "relative", display: "flex", justifyContent: "center", alignItems: "center" }}>
              {allPhotos.length > 1 && (
                <IconButton
                  onClick={goPrev}
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
                src={activePhoto.image_url}
                alt={activePhoto.filename || "Photo"}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                sx={{
                  width: "100%",
                  maxHeight: "72vh",
                  objectFit: "contain",
                  borderRadius: 1,
                  transform: `scale(${zoom})`,
                  transition: "transform 0.2s ease",
                }}
              />

              {allPhotos.length > 1 && (
                <IconButton
                  onClick={goNext}
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
              <Button size="small" variant="outlined" onClick={() => setZoom((z) => Math.max(1, Number((z - 0.25).toFixed(2))))}>
                Zoom -
              </Button>
              <Button size="small" variant="outlined" onClick={() => setZoom(1)}>
                Reset
              </Button>
              <Button size="small" variant="outlined" onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}>
                Zoom +
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Dialog>
    </>
  );
};

export default PhotoManager;
