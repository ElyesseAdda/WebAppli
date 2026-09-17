import CheckIcon from "@mui/icons-material/Check";
import LabelOutlinedIcon from "@mui/icons-material/LabelOutlined";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography,
} from "@mui/material";
import React from "react";
import {
  DEFAULT_DEVIS_TAG,
  DEVIS_TAGS,
  DEVIS_TAG_ROWS,
  areDevisTagsEqual,
  getDevisTagMeta,
  getDevisTags,
  toggleDevisTag,
} from "../config/devisTags";

const CurrentTagBadge = ({ value }) => {
  const tag = getDevisTagMeta(value);
  return (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        px: 1,
        py: 0.35,
        borderRadius: "3px",
        border: `1px solid ${tag.color}33`,
        backgroundColor: tag.bg,
        color: tag.color,
        fontSize: "0.72rem",
        fontWeight: 600,
        letterSpacing: "0.01em",
        lineHeight: 1.3,
      }}
    >
      {tag.label}
    </Box>
  );
};

const TagOption = ({ tag, selected, onToggle }) => (
  <Box
    component="button"
    type="button"
    onClick={onToggle}
    aria-pressed={selected}
    sx={{
      appearance: "none",
      WebkitAppearance: "none",
      border: selected ? `1.5px solid ${tag.color}` : "1px solid #d8dde6",
      borderLeft: selected
        ? `4px solid ${tag.color}`
        : "1px solid #d8dde6",
      borderRadius: "4px",
      backgroundColor: selected ? tag.bg : "#fff",
      color: selected ? tag.color : "#374151",
      px: 1.25,
      py: 1,
      minHeight: 42,
      flex: "1 1 0",
      minWidth: 0,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 0.75,
      textAlign: "left",
      fontFamily: "inherit",
      fontSize: "0.78rem",
      fontWeight: selected ? 700 : 500,
      letterSpacing: "0.01em",
      lineHeight: 1.25,
      transition:
        "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease",
      boxShadow: selected ? `0 0 0 1px ${tag.color}22` : "none",
      "&:hover": {
        backgroundColor: selected ? tag.bg : "#f8fafc",
        borderColor: selected ? tag.color : "#b8c0cc",
      },
      "&:focus-visible": {
        outline: `2px solid ${tag.color}`,
        outlineOffset: 2,
      },
    }}
  >
    <Box
      component="span"
      sx={{
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
    >
      {tag.label}
    </Box>
    {selected ? (
      <CheckIcon sx={{ fontSize: 15, color: tag.color, flexShrink: 0 }} />
    ) : (
      <Box
        component="span"
        sx={{
          width: 13,
          height: 13,
          borderRadius: "2px",
          border: "1px solid #c5ccd6",
          flexShrink: 0,
        }}
      />
    )}
  </Box>
);

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

  const knownValues = new Set(DEVIS_TAGS.map((tag) => tag.value));
  const extraTags = selectedTags
    .filter((value) => !knownValues.has(value))
    .map((value) => getDevisTagMeta(value));

  const unchanged = areDevisTagsEqual(selectedTags, initialTags);

  const handleSubmit = () => {
    if (unchanged) {
      onClose();
      return;
    }
    if (onTagsChange) {
      onTagsChange(selectedTags);
    } else if (onStatusChange) {
      onStatusChange(selectedTags[0] || DEFAULT_DEVIS_TAG);
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          width: "100%",
          maxWidth: 780,
          borderRadius: "8px",
          bgcolor: "#fff",
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(15, 23, 42, 0.18)",
        },
      }}
    >
      <DialogTitle
        sx={{
          px: 3,
          pt: 2.5,
          pb: 1.5,
          display: "flex",
          alignItems: "flex-start",
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            mt: 0.15,
            width: 34,
            height: 34,
            borderRadius: "4px",
            bgcolor: "#f1f5f9",
            border: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <LabelOutlinedIcon sx={{ fontSize: 18, color: "#475569" }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            component="div"
            sx={{
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "#0f172a",
              lineHeight: 1.3,
            }}
          >
            {title}
          </Typography>
          {devisNumero && (
            <Typography
              variant="body2"
              sx={{ color: "#64748b", mt: 0.35, fontSize: "0.8125rem" }}
            >
              {devisNumero}
            </Typography>
          )}
        </Box>
      </DialogTitle>

      <Divider sx={{ borderColor: "#eef2f7" }} />

      <DialogContent sx={{ px: 3, pt: 2.25, pb: 1.5 }}>
        <Box
          sx={{
            mb: 2.25,
            p: 1.5,
            borderRadius: "4px",
            bgcolor: "#f8fafc",
            border: "1px solid #e8edf3",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "#64748b",
              mb: 1,
            }}
          >
            Tags actuels
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
            {initialTags.length ? (
              initialTags.map((value) => (
                <CurrentTagBadge key={value} value={value} />
              ))
            ) : (
              <Typography variant="body2" sx={{ color: "#94a3b8" }}>
                Aucun tag
              </Typography>
            )}
          </Box>
        </Box>

        <Typography
          sx={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#64748b",
            mb: 0.75,
          }}
        >
          Sélection
        </Typography>
        <Typography
          variant="body2"
          sx={{ color: "#64748b", mb: 1.75, fontSize: "0.8rem", lineHeight: 1.45 }}
        >
          Une seule option par ligne. Les tags d’une même ligne se
          désélectionnent entre eux.
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
          {DEVIS_TAG_ROWS.map((row) => (
            <Box key={row.label}>
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  mb: 0.75,
                }}
              >
                {row.label}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexWrap: { xs: "wrap", sm: "nowrap" },
                  gap: 0.85,
                }}
              >
                {row.values.map((value) => {
                  const tag = getDevisTagMeta(value);
                  const selected = selectedTags.includes(value);
                  return (
                    <TagOption
                      key={value}
                      tag={tag}
                      selected={selected}
                      onToggle={() =>
                        setSelectedTags((prev) => toggleDevisTag(prev, value))
                      }
                    />
                  );
                })}
              </Box>
            </Box>
          ))}

          {extraTags.length > 0 && (
            <Box>
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  color: "#94a3b8",
                  mb: 0.75,
                }}
              >
                Autres
              </Typography>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.85 }}>
                {extraTags.map((tag) => {
                  const selected = selectedTags.includes(tag.value);
                  return (
                    <TagOption
                      key={tag.value}
                      tag={tag}
                      selected={selected}
                      onToggle={() =>
                        setSelectedTags((prev) =>
                          toggleDevisTag(prev, tag.value)
                        )
                      }
                    />
                  );
                })}
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>

      <Divider sx={{ borderColor: "#eef2f7" }} />

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          onClick={onClose}
          sx={{
            textTransform: "none",
            color: "#64748b",
            fontWeight: 600,
            borderRadius: "4px",
            px: 2,
          }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={unchanged}
          sx={{
            textTransform: "none",
            fontWeight: 700,
            borderRadius: "4px",
            px: 2.25,
            boxShadow: "none",
            bgcolor: "#1e293b",
            "&:hover": { bgcolor: "#0f172a", boxShadow: "none" },
            "&.Mui-disabled": {
              bgcolor: "#e2e8f0",
              color: "#94a3b8",
            },
          }}
        >
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DevisTagModal;
