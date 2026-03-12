import React, { useRef } from "react";
import { Box, Button, IconButton, Typography, Chip, TextField } from "@mui/material";
import { MdAddAPhoto, MdDelete } from "react-icons/md";
import { COLORS } from "../../constants/colors";

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

const PhotoManager = ({ photos = [], onUpload, onDelete, onUpdatePhoto, disabled, prestationId }) => {
  const fileInputRef = useRef(null);
  const currentTypeRef = useRef("avant");

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    for (const file of files) {
      await onUpload(prestationId, file, currentTypeRef.current);
    }
    e.target.value = "";
  };

  const triggerUpload = (type) => {
    currentTypeRef.current = type;
    fileInputRef.current?.click();
  };

  const handleDateChange = (photoId, newDate) => {
    if (onUpdatePhoto) {
      onUpdatePhoto(photoId, { date_photo: newDate });
    }
  };

  const photosByType = {
    avant: photos.filter((p) => p.type_photo === "avant"),
    en_cours: photos.filter((p) => p.type_photo === "en_cours"),
    apres: photos.filter((p) => p.type_photo === "apres"),
  };

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileSelect}
        style={{ display: "none" }}
      />

      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        {Object.entries(TYPE_LABELS).map(([type, label]) => (
          <Button
            key={type}
            size="small"
            variant="outlined"
            startIcon={<MdAddAPhoto />}
            disabled={disabled || !prestationId}
            onClick={() => triggerUpload(type)}
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
        ))}
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
              {typePhotos.map((photo) => (
                <Box
                  key={photo.id}
                  sx={{
                    width: 140,
                    borderRadius: 1,
                    overflow: "hidden",
                    border: `2px solid ${TYPE_COLORS[type]}40`,
                  }}
                >
                  <Box sx={{ position: "relative", width: "100%", height: 100 }}>
                    <img
                      src={photo.image_url}
                      alt={photo.filename}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                    {!disabled && (
                      <IconButton
                        size="small"
                        onClick={() => onDelete(photo.id)}
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
                  <TextField
                    type="date"
                    size="small"
                    value={photo.date_photo || new Date().toISOString().split("T")[0]}
                    onChange={(e) => handleDateChange(photo.id, e.target.value)}
                    disabled={disabled}
                    inputProps={{ style: { fontSize: 11, padding: "3px 6px" } }}
                    sx={{ width: "100%", "& .MuiOutlinedInput-notchedOutline": { border: "none" } }}
                  />
                </Box>
              ))}
            </Box>
          </Box>
        ) : null
      )}

      {photos.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
          Aucune photo. Utilisez les boutons ci-dessus pour ajouter des photos.
        </Typography>
      )}
    </Box>
  );
};

export default PhotoManager;
