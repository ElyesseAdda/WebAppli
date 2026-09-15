import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from "@mui/material";
import React from "react";
import {
  DEVIS_TAGS,
  areDevisTagsEqual,
  formatDevisTagsLabel,
  getDevisTagMeta,
  getDevisTags,
  toggleDevisTag,
} from "../config/devisTags";

const DevisTagModal = ({
  open,
  onClose,
  currentStatus,
  currentTags,
  onTagsChange,
  onStatusChange,
  title = "Modifier les tags du devis",
  devisNumero,
}) => {
  const initialTags = React.useMemo(
    () => getDevisTags(currentTags, currentStatus),
    [currentTags, currentStatus]
  );
  const [selectedTags, setSelectedTags] = React.useState(initialTags);

  React.useEffect(() => {
    setSelectedTags(getDevisTags(currentTags, currentStatus));
  }, [currentTags, currentStatus, open]);

  const extraTags = selectedTags
    .filter((value) => !DEVIS_TAGS.some((tag) => tag.value === value))
    .map((value) => getDevisTagMeta(value));

  const handleSubmit = () => {
    if (areDevisTagsEqual(selectedTags, initialTags)) {
      onClose();
      return;
    }
    if (onTagsChange) {
      onTagsChange(selectedTags);
    } else if (onStatusChange) {
      onStatusChange(selectedTags[0] || "En attente BDC");
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          p: 1,
          bgcolor: "#fff",
        },
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        {devisNumero && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Devis {devisNumero}
          </Typography>
        )}
        <Typography variant="body2" sx={{ mb: 1 }}>
          Tags actuels :{" "}
          <strong>{formatDevisTagsLabel(initialTags)}</strong>
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Cliquez pour ajouter ou retirer un tag. Les tags incompatibles se
          désélectionnent entre eux (ex. Validé / Refusé, En attente BDC / BDC
          reçus, Travaux non réalisés / en cours / réalisés).
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.25 }}>
          {[...DEVIS_TAGS, ...extraTags].map((tag) => {
            const selected = selectedTags.includes(tag.value);
            return (
              <Chip
                key={tag.value}
                label={tag.label}
                onClick={() =>
                  setSelectedTags((prev) => toggleDevisTag(prev, tag.value))
                }
                sx={{
                  fontWeight: 600,
                  px: 0.5,
                  backgroundColor: selected ? tag.color : tag.bg,
                  color: selected ? "#fff" : tag.color,
                  border: `1px solid ${tag.color}`,
                  opacity: selected ? 1 : 0.9,
                  "&:hover": {
                    backgroundColor: selected ? tag.color : tag.bg,
                    filter: "brightness(0.96)",
                  },
                }}
              />
            );
          })}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={areDevisTagsEqual(selectedTags, initialTags)}
        >
          Enregistrer les tags
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DevisTagModal;
