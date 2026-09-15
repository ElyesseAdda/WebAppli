import HistoryIcon from "@mui/icons-material/History";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Typography,
} from "@mui/material";
import axios from "axios";
import React from "react";
import {
  formatDevisTagDate,
  getDevisTagMeta,
  getDevisTagStyle,
  parseDevisTagsLabel,
} from "../config/devisTags";

const TagChips = ({ value }) => {
  const tags = parseDevisTagsLabel(value);
  if (!tags.length) {
    return (
      <Box
        component="span"
        sx={{
          ...getDevisTagStyle(""),
          fontSize: "0.72rem",
          color: "#94a3b8",
          backgroundColor: "#f1f5f9",
          borderColor: "#e2e8f0",
        }}
      >
        Aucun tag
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6, alignItems: "center" }}>
      {tags.map((tag) => {
        const meta = getDevisTagMeta(tag);
        return (
          <Box
            key={tag}
            component="span"
            sx={{ ...getDevisTagStyle(tag), fontSize: "0.72rem" }}
          >
            {meta.label}
          </Box>
        );
      })}
    </Box>
  );
};

const HistoryChange = ({ entry }) => (
  <Box
    sx={{
      mb: 1.5,
      p: 1.5,
      borderRadius: "4px",
      bgcolor: "#f8fafc",
      border: "1px solid #e8edf3",
    }}
  >
    <Typography
      variant="caption"
      sx={{
        display: "block",
        color: "#64748b",
        fontWeight: 700,
        letterSpacing: "0.02em",
        mb: 1,
      }}
    >
      {formatDevisTagDate(entry.created_at)} — {entry.actor_name}
    </Typography>

    <Box
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        alignItems: { xs: "stretch", sm: "center" },
        gap: 1,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#94a3b8",
            mb: 0.5,
          }}
        >
          Avant
        </Typography>
        <TagChips value={entry.old_value} />
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#94a3b8",
          flexShrink: 0,
          py: { xs: 0.25, sm: 0 },
        }}
      >
        <ArrowForwardIcon sx={{ fontSize: 18, transform: { xs: "rotate(90deg)", sm: "none" } }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "0.65rem",
            fontWeight: 700,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#94a3b8",
            mb: 0.5,
          }}
        >
          Après
        </Typography>
        <TagChips value={entry.new_value} />
      </Box>
    </Box>
  </Box>
);

const DevisTagHistoryPanel = ({ devisId, devisNumero }) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState([]);
  const [error, setError] = React.useState("");

  const loadHistory = React.useCallback(async () => {
    if (!devisId) return;
    setLoading(true);
    setError("");
    try {
      const response = await axios.get(
        `/api/list-devis/${devisId}/tag_history/`
      );
      setItems(response.data?.results || []);
    } catch (err) {
      void err;
      setError("Impossible de charger l'historique");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [devisId]);

  const handleOpen = async (event) => {
    event.stopPropagation();
    setOpen(true);
    await loadHistory();
  };

  const handleClose = (event) => {
    event?.stopPropagation?.();
    setOpen(false);
  };

  return (
    <Box
      sx={{ width: "100%", mt: 0.25, display: "flex", justifyContent: "center" }}
      onClick={(e) => e.stopPropagation()}
    >
      <IconButton
        size="small"
        onClick={handleOpen}
        title="Voir l'historique des tags"
        sx={{ p: 0.35, color: "text.secondary" }}
      >
        <HistoryIcon sx={{ fontSize: 16 }} />
      </IconButton>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="md"
        fullWidth
        onClick={(e) => e.stopPropagation()}
        PaperProps={{
          sx: {
            borderRadius: "8px",
            bgcolor: "#fff",
            overflow: "hidden",
            boxShadow: "0 12px 40px rgba(15, 23, 42, 0.18)",
            maxWidth: 720,
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
            <HistoryIcon sx={{ fontSize: 18, color: "#475569" }} />
          </Box>
          <Box>
            <Typography
              component="div"
              sx={{ fontSize: "1.05rem", fontWeight: 700, color: "#0f172a" }}
            >
              Historique des tags
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

        <DialogContent sx={{ px: 3, pt: 2, pb: 1.5, minHeight: 140 }}>
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {!loading && error && (
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          )}

          {!loading && !error && items.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Aucune modification enregistrée pour ce devis.
            </Typography>
          )}

          {!loading &&
            !error &&
            items.map((entry) => (
              <HistoryChange key={entry.id} entry={entry} />
            ))}
        </DialogContent>

        <Divider sx={{ borderColor: "#eef2f7" }} />

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleClose}
            variant="contained"
            sx={{
              textTransform: "none",
              fontWeight: 700,
              borderRadius: "4px",
              boxShadow: "none",
              bgcolor: "#1e293b",
              "&:hover": { bgcolor: "#0f172a", boxShadow: "none" },
            }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DevisTagHistoryPanel;
