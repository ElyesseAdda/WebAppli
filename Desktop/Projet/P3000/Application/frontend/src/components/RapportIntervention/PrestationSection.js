import React, { useState } from "react";
import {
  Box, TextField, Typography, IconButton, Switch, FormControlLabel, Paper, Divider, Collapse,
} from "@mui/material";
import { MdDelete, MdDragHandle } from "react-icons/md";
import PhotoManager from "./PhotoManager";
import { COLORS } from "../../constants/colors";

const PrestationSection = ({
  prestation,
  index,
  onChange,
  onRemove,
  onUploadPhoto,
  onDeletePhoto,
  onUpdatePhoto,
  onAddPendingPhoto,
  onRemovePendingPhoto,
  disabled,
  isSaved,
  pendingPhotos,
  isMobile,
}) => {
  const [expanded, setExpanded] = useState(true);

  const handleFieldChange = (field, value) => {
    onChange(index, { ...prestation, [field]: value });
  };

  const fieldGap = isMobile ? 2.5 : 2;
  const rowsMultiline = isMobile ? 3 : 2;

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${COLORS.border || "#e0e0e0"}`,
        borderRadius: 2,
        mb: isMobile ? 3 : 2,
        overflow: "hidden",
      }}
    >
      <Box
        onClick={() => setExpanded((prev) => !prev)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: COLORS.backgroundAlt || "#f5f5f5",
          px: { xs: 2, md: 2 },
          py: isMobile ? 1.5 : 1,
          cursor: "pointer",
          "&:hover": { backgroundColor: COLORS.borderLight || "#eee" },
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MdDragHandle size={20} color="#999" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: isMobile ? "1rem" : undefined }}>
            {(prestation.localisation || "").trim() || `Prestation ${index + 1}`}
          </Typography>
        </Box>
        {!disabled && (
          <IconButton
            size="small"
            color="error"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(index);
            }}
            sx={isMobile ? { minWidth: 48, minHeight: 48 } : {}}
          >
            <MdDelete />
          </IconButton>
        )}
      </Box>

      <Collapse in={expanded}>
      <Box sx={{ p: isMobile ? 2.5 : 2, display: "flex", flexDirection: "column", gap: fieldGap }}>
        <TextField
          label="Localisation *"
          placeholder="Ex: Bat A03, hall d'entree bat 2..."
          value={prestation.localisation || ""}
          onChange={(e) => handleFieldChange("localisation", e.target.value)}
          fullWidth
          size="small"
          disabled={disabled}
        />

        <TextField
          label="Probleme constate *"
          placeholder="Dysfonction constatee..."
          value={prestation.probleme || ""}
          onChange={(e) => handleFieldChange("probleme", e.target.value)}
          fullWidth
          multiline
          minRows={2}
          maxRows={20}
          size="small"
          disabled={disabled}
        />

        <TextField
          label="Solution *"
          placeholder="Solution pour regler le probleme..."
          value={prestation.solution || ""}
          onChange={(e) => handleFieldChange("solution", e.target.value)}
          fullWidth
          multiline
          minRows={2}
          maxRows={20}
          size="small"
          disabled={disabled}
        />

        <TextField
          label="Commentaire"
          placeholder="Commentaire libre..."
          value={prestation.commentaire || ""}
          onChange={(e) => handleFieldChange("commentaire", e.target.value)}
          fullWidth
          multiline
          rows={rowsMultiline}
          size="small"
          disabled={disabled}
        />

        <FormControlLabel
          control={
            <Switch
              checked={prestation.prestation_possible !== false}
              onChange={(e) => handleFieldChange("prestation_possible", e.target.checked)}
              disabled={disabled}
            />
          }
          label="Prestation possible"
          sx={isMobile ? { mt: 0.5, mb: 0.5 } : {}}
        />

        <TextField
          label="Prestations realisees"
          placeholder="Liste des prestations realisees..."
          value={prestation.prestation_realisee || ""}
          onChange={(e) => handleFieldChange("prestation_realisee", e.target.value)}
          fullWidth
          multiline
          rows={rowsMultiline}
          size="small"
          disabled={disabled}
        />

        <Divider sx={{ my: isMobile ? 1.5 : 1 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: isMobile ? "0.9375rem" : undefined }}>
          Photos
        </Typography>
        <PhotoManager
          photos={prestation.photos || []}
          pendingPhotos={pendingPhotos || []}
          prestationId={isSaved ? prestation.id : null}
          onUpload={onUploadPhoto}
          onDelete={onDeletePhoto}
          onUpdatePhoto={onUpdatePhoto}
          onAddPendingPhoto={(file, type) => onAddPendingPhoto?.(index, file, type)}
          onRemovePendingPhoto={(photoIdx) => onRemovePendingPhoto?.(index, photoIdx)}
          disabled={disabled}
          isMobile={isMobile}
        />
      </Box>
      </Collapse>
    </Paper>
  );
};

export default PrestationSection;
