import CheckIcon from "@mui/icons-material/Check";
import FilterListIcon from "@mui/icons-material/FilterList";
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
  DEVIS_TAG_ROWS,
  areDevisTagsEqual,
  getDevisTagMeta,
  normalizeStatusFilter,
  toggleFilterTag,
} from "../config/devisTags";

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
      borderLeft: selected ? `4px solid ${tag.color}` : "1px solid #d8dde6",
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
        "background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease",
      "&:hover": {
        backgroundColor: selected ? tag.bg : "#f8fafc",
        borderColor: selected ? tag.color : "#b8c0cc",
      },
    }}
  >
    <Box
      component="span"
      sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
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

const DevisTagFilterModal = ({
  open,
  onClose,
  selectedTags = [],
  onApply,
}) => {
  const initial = React.useMemo(
    () => normalizeStatusFilter(selectedTags),
    [selectedTags]
  );
  const [draft, setDraft] = React.useState(initial);

  React.useEffect(() => {
    if (open) setDraft(normalizeStatusFilter(selectedTags));
  }, [open, selectedTags]);

  const unchanged = areDevisTagsEqual(draft, initial);

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
          <FilterListIcon sx={{ fontSize: 18, color: "#475569" }} />
        </Box>
        <Box>
          <Typography
            component="div"
            sx={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}
          >
            Filtrer par tags
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: "#64748b", mt: 0.35, fontSize: "0.8125rem" }}
          >
            Sélectionnez un ou plusieurs tags. Un devis est affiché seulement
            s’il possède toute la combinaison choisie.
          </Typography>
        </Box>
      </DialogTitle>

      <Divider sx={{ borderColor: "#eef2f7" }} />

      <DialogContent sx={{ px: 3, pt: 2.25, pb: 1.5 }}>
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
                  const selected = draft.includes(value);
                  return (
                    <TagOption
                      key={value}
                      tag={tag}
                      selected={selected}
                      onToggle={() =>
                        setDraft((prev) => toggleFilterTag(prev, value))
                      }
                    />
                  );
                })}
              </Box>
            </Box>
          ))}
        </Box>
      </DialogContent>

      <Divider sx={{ borderColor: "#eef2f7" }} />

      <DialogActions
        sx={{ px: 3, py: 2, gap: 1, justifyContent: "space-between" }}
      >
        <Button
          onClick={() => setDraft([])}
          disabled={draft.length === 0}
          sx={{
            textTransform: "none",
            color: "#64748b",
            fontWeight: 600,
            borderRadius: "4px",
          }}
        >
          Tout effacer
        </Button>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            onClick={onClose}
            sx={{
              textTransform: "none",
              color: "#64748b",
              fontWeight: 600,
              borderRadius: "4px",
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={() => {
              onApply(draft);
              onClose();
            }}
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
            Appliquer
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default DevisTagFilterModal;
