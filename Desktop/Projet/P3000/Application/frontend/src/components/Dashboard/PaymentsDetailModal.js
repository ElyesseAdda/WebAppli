import {
  Box,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import React from "react";

const fmt = (v) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v || 0);

const TYPE_COLOR = { Situation: "#1B78BC", Facture: "#7c3aed" };

const PaymentsDetailModal = ({ open, onClose, title, items = [], loading = false, accentColor = "#1B78BC" }) => {
  const total = items.reduce((s, i) => s + (i.montant || 0), 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: "12px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          pb: 1,
          fontWeight: 700,
          fontSize: "0.95rem",
          color: "#111827",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 6,
              height: 22,
              bgcolor: accentColor,
              borderRadius: "3px",
              flexShrink: 0,
            }}
          />
          {title}
          {!loading && (
            <Typography
              component="span"
              sx={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: accentColor,
                bgcolor: `${accentColor}15`,
                px: 1,
                py: 0.2,
                borderRadius: "6px",
              }}
            >
              {fmt(total)}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 1.5, pb: 2 }}>
        {loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 3 }}>
            <CircularProgress size={18} sx={{ color: accentColor }} />
            <Typography sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>Chargement…</Typography>
          </Box>
        ) : !items.length ? (
          <Typography sx={{ color: "#9ca3af", fontSize: "0.85rem", py: 3, textAlign: "center" }}>
            Aucun élément.
          </Typography>
        ) : (
          <TableContainer sx={{ maxHeight: 420, overflowY: "auto" }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {["Type", "Document", "Chantier", "Montant HT", "Date"].map((h) => (
                    <TableCell
                      key={h}
                      sx={{
                        fontWeight: 700,
                        fontSize: "0.73rem",
                        color: "#6b7280",
                        bgcolor: "#f8fafc",
                        borderBottom: "1px solid #e5e7eb",
                        py: 0.8,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={idx} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                    <TableCell sx={{ py: 0.9 }}>
                      <Typography
                        sx={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: TYPE_COLOR[item.type] || "#6b7280",
                          bgcolor: `${TYPE_COLOR[item.type] || "#6b7280"}15`,
                          px: 0.8,
                          py: 0.15,
                          borderRadius: "4px",
                          display: "inline-block",
                        }}
                      >
                        {item.type}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#111827", py: 0.9 }}>
                      {item.label}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontSize: "0.78rem",
                        color: "#6b7280",
                        py: 0.9,
                        maxWidth: 150,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.chantier || "—"}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.82rem", fontWeight: 700, color: accentColor, py: 0.9 }}>
                      {fmt(item.montant)}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.78rem", color: "#6b7280", py: 0.9, whiteSpace: "nowrap" }}>
                      {item.date || "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PaymentsDetailModal;
