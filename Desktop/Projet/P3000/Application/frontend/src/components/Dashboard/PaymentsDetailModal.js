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
  TableSortLabel,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import React, { useEffect, useMemo, useState } from "react";

const PREVIEW_URL = {
  Situation: (id) => `/api/preview-situation/${id}/`,
  Facture: (id) => `/api/preview-facture/${id}/`,
};

const COLUMNS = [
  { id: "type", label: "Type" },
  { id: "label", label: "Document" },
  { id: "chantier", label: "Chantier" },
  { id: "montant", label: "Montant HT", align: "right" },
  { id: "date", label: "Date" },
];

const fmt = (v) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v || 0);

const TYPE_COLOR = { Situation: "#1B78BC", Facture: "#7c3aed" };

const compareRows = (a, b, orderBy) => {
  switch (orderBy) {
    case "type":
      return (a.type || "").localeCompare(b.type || "", "fr", { sensitivity: "base" });
    case "label":
      return (a.label || "").localeCompare(b.label || "", "fr", { sensitivity: "base" });
    case "chantier":
      return (a.chantier || "").localeCompare(b.chantier || "", "fr", { sensitivity: "base" });
    case "montant":
      return (a.montant || 0) - (b.montant || 0);
    case "date":
      return (a.dateSort || 0) - (b.dateSort || 0);
    default:
      return 0;
  }
};

const PaymentsDetailModal = ({ open, onClose, title, items = [], loading = false, accentColor = "#1B78BC" }) => {
  const [orderBy, setOrderBy] = useState("date");
  const [order, setOrder] = useState("asc");

  useEffect(() => {
    if (open) {
      setOrderBy("date");
      setOrder(title?.toLowerCase().includes("encaissement") ? "desc" : "asc");
    }
  }, [open, title]);

  const handleSort = (columnId) => {
    const isAsc = orderBy === columnId && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(columnId);
  };

  const sortedItems = useMemo(() => {
    const dir = order === "asc" ? 1 : -1;
    return [...items].sort((a, b) => compareRows(a, b, orderBy) * dir);
  }, [items, orderBy, order]);

  const total = sortedItems.reduce((s, i) => s + (i.montant || 0), 0);

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
                  {COLUMNS.map((col) => (
                    <TableCell
                      key={col.id}
                      align={col.align}
                      sortDirection={orderBy === col.id ? order : false}
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
                      <TableSortLabel
                        active={orderBy === col.id}
                        direction={orderBy === col.id ? order : "asc"}
                        onClick={() => handleSort(col.id)}
                        sx={{
                          "& .MuiTableSortLabel-icon": {
                            opacity: orderBy === col.id ? 1 : 0.35,
                          },
                        }}
                      >
                        {col.label}
                      </TableSortLabel>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedItems.map((item, idx) => (
                  <TableRow key={`${item.type}-${item.id}-${idx}`} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
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
                    <TableCell sx={{ py: 0.9 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "#111827" }}>
                          {item.label}
                        </Typography>
                        {item.id && PREVIEW_URL[item.type] && (
                          <Tooltip title="Ouvrir le document">
                            <IconButton
                              size="small"
                              onClick={() => window.open(PREVIEW_URL[item.type](item.id), "_blank")}
                              sx={{
                                p: 0.2,
                                color: "#94a3b8",
                                "&:hover": { color: "#1B78BC", bgcolor: "#eff6ff" },
                              }}
                            >
                              <OpenInNewIcon sx={{ fontSize: 13 }} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
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
                    <TableCell
                      align="right"
                      sx={{ fontSize: "0.82rem", fontWeight: 700, color: accentColor, py: 0.9 }}
                    >
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
