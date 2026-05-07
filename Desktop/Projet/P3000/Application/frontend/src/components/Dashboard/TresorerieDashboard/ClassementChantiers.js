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
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import SortIcon from "@mui/icons-material/Sort";
import React, { useState } from "react";

const fmt = (v) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(v || 0);

const fmtDate = (d) => {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
  } catch {
    return d;
  }
};

/** Mini barre d'avancement colorée */
const AvancementBar = ({ pct, color }) => {
  const clamped = Math.min(100, Math.max(0, pct || 0));
  const barColor = color || (clamped >= 80 ? "#16a34a" : clamped >= 50 ? "#f59e0b" : "#dc2626");
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 130 }}>
      <Box sx={{ flex: 1, height: 8, bgcolor: "#f1f5f9", borderRadius: 0, overflow: "hidden" }}>
        <Box sx={{ width: `${clamped}%`, height: "100%", bgcolor: barColor, transition: "width 0.4s" }} />
      </Box>
      <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: barColor, minWidth: 36, textAlign: "right" }}>
        {clamped.toFixed(0)} %
      </Typography>
    </Box>
  );
};

/** Modal — liste des situations du chantier */
const SituationsModal = ({ chantier, open, onClose }) => {
  if (!chantier) return null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      PaperProps={{
        sx: {
          borderRadius: "12px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          maxWidth: "min(96vw, 1200px)",
          width: "fit-content",
          minWidth: { xs: "min(calc(100vw - 32px), 520px)", sm: 600 },
          m: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
          pb: 1,
          pr: 1,
          color: "#111827",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.35, minWidth: 0, pr: 1 }}>
          <Typography component="div" sx={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.25, wordBreak: "break-word" }}>
            {chantier.chantier_name}
          </Typography>
          <Typography component="div" sx={{ fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
            {chantier.societe}
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "#9ca3af", flexShrink: 0, mt: -0.25 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ pt: 2, overflowX: "auto" }}>
        {/* Récap */}
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1.5, mb: 2.5 }}>
          {[
            { label: "CA facturé", value: fmt(chantier.ca), color: "#1B78BC" },
            { label: "Encaissé", value: fmt(chantier.encaisse), color: "#16a34a" },
            { label: "Reste à encaisser", value: fmt(chantier.resteAEncaisser), color: "#f59e0b" },
            { label: "Avancement", value: `${chantier.avancement.toFixed(1)} %`, color: "#7c3aed" },
          ].map(({ label, value, color }) => (
            <Box
              key={label}
              sx={{ bgcolor: "#f8fafc", borderRadius: "8px", p: 1.2, textAlign: "center", border: "1px solid #e5e7eb" }}
            >
              <Typography sx={{ fontSize: "0.68rem", color: "#6b7280", fontWeight: 600, mb: 0.3 }}>
                {label}
              </Typography>
              <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color }}>
                {value}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Tableau des situations */}
        <TableContainer sx={{ maxWidth: "100%" }}>
          <Table size="small" sx={{ minWidth: 720, tableLayout: "auto" }}>
            <TableHead>
              <TableRow>
                {["N° situation", "Montant HT", "Avancement", "Envoyée le", "Encaissée le"].map((h) => (
                  <TableCell
                    key={h}
                    sx={{
                      fontWeight: 700,
                      fontSize: "0.73rem",
                      color: "#6b7280",
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
              {[...chantier.situations]
                .sort((a, b) => (b.pourcentage_avancement || 0) - (a.pourcentage_avancement || 0))
                .map((s) => (
                <TableRow key={s.id} sx={{ "&:hover": { bgcolor: "#f8fafc" } }}>
                  <TableCell
                    sx={{
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      color: "#111827",
                      py: 1,
                      minWidth: 140,
                      maxWidth: 280,
                      wordBreak: "break-word",
                    }}
                  >
                    {s.numero}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.82rem", color: "#1B78BC", fontWeight: 600 }}>
                    {fmt(s.montant)}
                  </TableCell>
                  <TableCell sx={{ minWidth: 130 }}>
                    <AvancementBar pct={s.pourcentage_avancement} />
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.78rem", color: "#6b7280" }}>
                    {fmtDate(s.date_envoi)}
                  </TableCell>
                  <TableCell sx={{ fontSize: "0.78rem" }}>
                    {s.date_paiement_reel ? (
                      <Typography sx={{ fontSize: "0.78rem", color: "#16a34a", fontWeight: 600 }}>
                        ✓ {fmtDate(s.date_paiement_reel)}
                      </Typography>
                    ) : (
                      <Typography sx={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                        —
                      </Typography>
                    )}
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

/** Composant principal */
const ClassementChantiers = ({ classement = [], loading }) => {
  const [sortBy, setSortBy] = useState("ca");
  const [selected, setSelected] = useState(null);

  if (loading) {
    return <Box sx={{ py: 3, color: "#94a3b8", fontSize: "0.85rem" }}>Chargement du classement…</Box>;
  }

  if (!classement.length) {
    return (
      <Box sx={{ py: 4, textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>
        Aucun chantier avec situations disponible.
      </Box>
    );
  }

  const sorted = [...classement].sort((a, b) =>
    sortBy === "ca" ? b.ca - a.ca : b.avancement - a.avancement
  );

  return (
    <>
      {/* Toggle tri */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", mb: 1.5, gap: 1 }}>
        <SortIcon sx={{ fontSize: 16, color: "#94a3b8" }} />
        <Typography sx={{ fontSize: "0.75rem", color: "#6b7280", fontWeight: 600 }}>Trier par :</Typography>
        <ToggleButtonGroup
          value={sortBy}
          exclusive
          onChange={(_, v) => v && setSortBy(v)}
          size="small"
          sx={{
            "& .MuiToggleButton-root": {
              fontSize: "0.72rem",
              fontWeight: 600,
              textTransform: "none",
              px: 1.5,
              py: 0.3,
              border: "1px solid #e5e7eb",
              color: "#6b7280",
            },
            "& .Mui-selected": { bgcolor: "#eff6ff !important", color: "#1B78BC !important", borderColor: "#bfdbfe !important" },
          }}
        >
          <ToggleButton value="ca">CA facturé</ToggleButton>
          <ToggleButton value="avancement">% Avancement</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <TableContainer sx={{ maxHeight: 400, overflowY: "auto" }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              {["#", "Chantier", "Société client", "CA facturé", "Encaissé", "Avancement", ""].map((h) => (
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
            {sorted.map((row, idx) => (
              <TableRow
                key={row.chantier_id}
                sx={{
                  "&:hover": { bgcolor: "#f8fafc" },
                  borderLeft: idx === 0 ? "3px solid #f59e0b" : "3px solid transparent",
                }}
              >
                {/* Rang */}
                <TableCell sx={{ py: 1, width: 36 }}>
                  <Box
                    sx={{
                      width: 24, height: 24, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.72rem", fontWeight: 700,
                      bgcolor: idx === 0 ? "#fef3c7" : idx === 1 ? "#f1f5f9" : idx === 2 ? "#fdf2f8" : "#f9fafb",
                      color: idx === 0 ? "#b45309" : idx === 1 ? "#475569" : idx === 2 ? "#9333ea" : "#9ca3af",
                    }}
                  >
                    {idx + 1}
                  </Box>
                </TableCell>

                {/* Chantier */}
                <TableCell sx={{ py: 1, maxWidth: 200 }}>
                  <Tooltip title={row.chantier_name} placement="top">
                    <Typography
                      sx={{
                        fontSize: "0.82rem", fontWeight: 600, color: "#111827",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {row.chantier_name}
                    </Typography>
                  </Tooltip>
                  <Typography sx={{ fontSize: "0.68rem", color: "#94a3b8" }}>
                    {row.situations.length} situation{row.situations.length > 1 ? "s" : ""}
                  </Typography>
                </TableCell>

                {/* Société */}
                <TableCell sx={{ py: 1, maxWidth: 160 }}>
                  <Tooltip title={row.societe} placement="top">
                    <Typography
                      sx={{
                        fontSize: "0.78rem", color: "#6b7280",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {row.societe}
                    </Typography>
                  </Tooltip>
                </TableCell>

                {/* CA */}
                <TableCell sx={{ py: 1 }}>
                  <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "#1B78BC" }}>
                    {fmt(row.ca)}
                  </Typography>
                </TableCell>

                {/* Encaissé */}
                <TableCell sx={{ py: 1 }}>
                  <Typography sx={{ fontSize: "0.82rem", color: "#16a34a", fontWeight: 600 }}>
                    {fmt(row.encaisse)}
                  </Typography>
                </TableCell>

                {/* Avancement */}
                <TableCell sx={{ py: 1, minWidth: 150 }}>
                  <AvancementBar pct={row.avancement} color="#7c3aed" />
                </TableCell>

                {/* Bouton */}
                <TableCell sx={{ py: 1, pr: 1 }}>
                  <Tooltip title="Voir les situations">
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
          { color: "#1B78BC", label: "CA facturé" },
          { color: "#16a34a", label: "Encaissé" },
          { color: "#7c3aed", label: "Avancement travaux" },
        ].map(({ color, label }) => (
          <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Box sx={{ width: 10, height: 10, bgcolor: color, borderRadius: "2px" }} />
            <Typography sx={{ fontSize: "0.71rem", color: "#64748b", fontWeight: 500 }}>{label}</Typography>
          </Box>
        ))}
      </Box>

      <SituationsModal chantier={selected} open={!!selected} onClose={() => setSelected(null)} />
    </>
  );
};

export default ClassementChantiers;
