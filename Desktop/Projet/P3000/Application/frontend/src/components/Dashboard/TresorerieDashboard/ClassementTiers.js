/**
 * Composant générique de classement (fournisseurs, sous-traitants, sociétés…).
 * Props :
 *   classement   – tableau trié [{nom, totalAPayer, totalPaye, resteAPayer, tauxPaiement, chantiers:[]}]
 *   loading      – boolean
 *   nomLabel     – label de l'entité (ex: "fournisseur", "sous-traitant")
 *   colTotal     – libellé colonne total    (défaut: "Total (payé + reste)")
 *   colPaye      – libellé colonne payé     (défaut: "Payé")
 *   colReste     – libellé colonne reste    (défaut: "Reste à payer")
 *   colorPaye    – couleur montant payé     (défaut: "#16a34a")
 *   colorReste   – couleur montant reste    (défaut: "#dc2626")
 */
import {
  Box,
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
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import React, { useState } from "react";

const fmt = (v) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v || 0);

/** Barre de progression payé / reste */
const ProgressBar = ({ pct }) => {
  const clamped = Math.min(100, Math.max(0, pct || 0));
  const color = clamped >= 90 ? "#16a34a" : clamped >= 50 ? "#f59e0b" : "#dc2626";
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 140 }}>
      <Box
        sx={{
          flex: 1,
          height: 8,
          bgcolor: "#f1f5f9",
          borderRadius: 0,
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            width: `${clamped}%`,
            height: "100%",
            bgcolor: color,
            transition: "width 0.4s ease",
          }}
        />
      </Box>
      <Typography
        sx={{
          fontSize: "0.72rem",
          fontWeight: 700,
          color,
          minWidth: 36,
          textAlign: "right",
        }}
      >
        {clamped.toFixed(0)} %
      </Typography>
    </Box>
  );
};

/** Modal détail par chantier */
const ChantierDetailModal = ({ tiers, open, onClose, colTotal, colPaye, colReste, colorPaye, colorReste }) => {
  if (!tiers) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
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
        <Box>
          {tiers.nom}
          <Typography
            component="span"
            sx={{ fontSize: "0.78rem", color: "#6b7280", fontWeight: 400, ml: 1.5 }}
          >
            Détail par chantier
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2 }}>
        {/* Récap global */}
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 1.5, mb: 2.5 }}>
          {[
            { label: colTotal, value: tiers.totalAPayer, color: "#1B78BC" },
            { label: colPaye, value: tiers.totalPaye, color: colorPaye },
            { label: colReste, value: tiers.resteAPayer, color: colorReste },
          ].map(({ label, value, color }) => (
            <Box
              key={label}
              sx={{
                bgcolor: "#f8fafc",
                borderRadius: "8px",
                p: 1.2,
                textAlign: "center",
                border: "1px solid #e5e7eb",
              }}
            >
              <Typography sx={{ fontSize: "0.68rem", color: "#6b7280", fontWeight: 600, mb: 0.3 }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color }}>
                {fmt(value)}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Tableau par chantier */}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                {["Chantier", colTotal, colPaye, colReste, "Avancement"].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.73rem",
                      color: "#6b7280",
                      borderBottom: "1px solid #e5e7eb",
                      py: 0.8,
                    }}
                  >
                    {h}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {[...tiers.chantiers]
                .sort((a, b) => b.totalAPayer - a.totalAPayer)
                .map((ch) => (
                  <TableRow key={ch.chantier_id} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                    <TableCell sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#111827", py: 1, maxWidth: 160 }}>
                      <Tooltip title={ch.chantier_name} placement="top">
                        <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {ch.chantier_name}
                        </Box>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.78rem", color: "#1B78BC", fontWeight: 600 }}>
                      {fmt(ch.totalAPayer)}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.78rem", color: colorPaye }}>
                      {fmt(ch.totalPaye)}
                    </TableCell>
                    <TableCell sx={{ fontSize: "0.78rem", color: colorReste }}>
                      {fmt(ch.resteAPayer)}
                    </TableCell>
                    <TableCell sx={{ minWidth: 120 }}>
                      <ProgressBar pct={ch.tauxPaiement} />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
    </Dialog>
  );
};

/** Composant principal — classement générique */
const ClassementTiers = ({
  classement = [],
  loading,
  nomLabel = "tiers",
  colTotal = "Total (payé + reste)",
  colPaye = "Payé",
  colReste = "Reste à payer",
  colorPaye = "#16a34a",
  colorReste = "#dc2626",
}) => {
  const [selected, setSelected] = useState(null);

  if (loading) {
    return (
      <Box sx={{ py: 3, color: "#94a3b8", fontSize: "0.85rem" }}>
        Chargement du classement…
      </Box>
    );
  }

  if (!classement.length) {
    return (
      <Box sx={{ py: 4, textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
        Aucune donnée {nomLabel} disponible.
      </Box>
    );
  }

  return (
    <>
      <TableContainer sx={{ maxHeight: 420, overflowY: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {["#", "Nom", colTotal, colPaye, colReste, "Avancement", ""].map((h) => (
                <TableCell
                  key={h}
                  sx={{
                    fontWeight: 700,
                    fontSize: "0.73rem",
                    color: "#6b7280",
                    bgcolor: "#f8fafc",
                    borderBottom: "1px solid #e5e7eb",
                    py: 0.9,
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {classement.map((row, idx) => (
              <TableRow
                key={row.nom}
                sx={{
                  "&:hover": { bgcolor: "#f8fafc" },
                  borderLeft: idx === 0 ? "3px solid #f59e0b" : "3px solid transparent",
                }}
              >
                {/* Rang */}
                <TableCell sx={{ py: 1, width: 36 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      bgcolor:
                        idx === 0 ? "#fef3c7" : idx === 1 ? "#f1f5f9" : idx === 2 ? "#fdf2f8" : "#f9fafb",
                      color:
                        idx === 0 ? "#b45309" : idx === 1 ? "#475569" : idx === 2 ? "#9333ea" : "#9ca3af",
                    }}
                  >
                    {idx + 1}
                  </Box>
                </TableCell>

                {/* Nom */}
                <TableCell sx={{ py: 1, maxWidth: 200 }}>
                  <Tooltip title={row.nom} placement="top">
                    <Typography
                      sx={{
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "#111827",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {row.nom}
                    </Typography>
                  </Tooltip>
                  <Typography sx={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                    {row.chantiers.length} chantier{row.chantiers.length > 1 ? "s" : ""}
                  </Typography>
                </TableCell>

                {/* Total */}
                <TableCell sx={{ py: 1 }}>
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1B78BC" }}>
                    {fmt(row.totalAPayer)}
                  </Typography>
                </TableCell>

                {/* Payé / Encaissé */}
                <TableCell sx={{ py: 1 }}>
                  <Typography sx={{ fontSize: "0.82rem", color: colorPaye, fontWeight: 600 }}>
                    {fmt(row.totalPaye)}
                  </Typography>
                </TableCell>

                {/* Reste */}
                <TableCell sx={{ py: 1 }}>
                  <Typography
                    sx={{
                      fontSize: "0.82rem",
                      color: row.resteAPayer > 0 ? colorReste : "#6b7280",
                      fontWeight: row.resteAPayer > 0 ? 600 : 400,
                    }}
                  >
                    {fmt(row.resteAPayer)}
                  </Typography>
                </TableCell>

                {/* Barre */}
                <TableCell sx={{ py: 1, minWidth: 160 }}>
                  <ProgressBar pct={row.tauxPaiement} />
                </TableCell>

                {/* Bouton détail */}
                <TableCell sx={{ py: 1, pr: 1 }}>
                  <Tooltip title="Détail par chantier">
                    <IconButton
                      size="small"
                      onClick={() => setSelected(row)}
                      sx={{ color: "#94a3b8", "&:hover": { color: "#1B78BC", bgcolor: "#eff6ff" } }}
                    >
                      <OpenInNewIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Légende */}
      <Box sx={{ display: "flex", gap: 2, mt: 1.5, flexWrap: "wrap" }}>
        {[
          { color: "#1B78BC", label: colTotal },
          { color: colorPaye, label: colPaye },
          { color: colorReste, label: colReste },
        ].map(({ color, label }) => (
          <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: color, borderRadius: "2px" }} />
            <Typography sx={{ fontSize: "0.71rem", color: "#64748b", fontWeight: 500 }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Modal détail */}
      <ChantierDetailModal
        tiers={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        colTotal={colTotal}
        colPaye={colPaye}
        colReste={colReste}
        colorPaye={colorPaye}
        colorReste={colorReste}
      />
    </>
  );
};

export default ClassementTiers;
