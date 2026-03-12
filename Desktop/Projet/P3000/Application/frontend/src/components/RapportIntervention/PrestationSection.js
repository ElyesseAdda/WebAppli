import React from "react";
import {
  Box, TextField, Typography, IconButton, Switch, FormControlLabel, Paper, Divider,
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
}) => {
  const handleFieldChange = (field, value) => {
    onChange(index, { ...prestation, [field]: value });
  };

  return (
    <Paper
      elevation={0}
      sx={{
        border: `1px solid ${COLORS.border || "#e0e0e0"}`,
        borderRadius: 2,
        mb: 2,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "#f5f5f5",
          px: 2,
          py: 1,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <MdDragHandle size={20} color="#999" />
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Prestation {index + 1}
          </Typography>
        </Box>
        {!disabled && (
          <IconButton size="small" color="error" onClick={() => onRemove(index)}>
            <MdDelete />
          </IconButton>
        )}
      </Box>

      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
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
          rows={2}
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
          rows={2}
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
          rows={2}
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
        />

        <TextField
          label="Prestations realisees"
          placeholder="Liste des prestations realisees..."
          value={prestation.prestation_realisee || ""}
          onChange={(e) => handleFieldChange("prestation_realisee", e.target.value)}
          fullWidth
          multiline
          rows={2}
          size="small"
          disabled={disabled}
        />

        <Divider sx={{ my: 1 }} />

        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
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
        />
      </Box>
    </Paper>
  );
};

export default PrestationSection;
