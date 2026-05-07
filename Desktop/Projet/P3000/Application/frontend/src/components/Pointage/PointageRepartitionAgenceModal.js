import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

const MO_KEY = "__mo__";

const toNumber = (value) => {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const parseMoneyInput = (rawValue) => {
  const raw = String(rawValue || "").trim();
  if (!raw) return 0;
  let sanitized = raw.replace(/[^\d,.\-]/g, "").replace(/\s/g, "");
  const lastComma = sanitized.lastIndexOf(",");
  const lastDot = sanitized.lastIndexOf(".");
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      sanitized = sanitized.replace(/\./g, "").replace(",", ".");
    } else {
      sanitized = sanitized.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    sanitized = sanitized.replace(",", ".");
  }
  const parsed = Number.parseFloat(sanitized);
  return Number.isFinite(parsed) ? parsed : 0;
};

const round2 = (n) => Math.round(n * 100) / 100;

const repartitionSumMatchesMontant = (repartition, montantCible) => {
  if (!Array.isArray(repartition) || repartition.length === 0) return false;
  const s = round2(repartition.reduce((acc, row) => acc + toNumber(row.montant), 0));
  const cible = round2(toNumber(montantCible));
  return Math.abs(s - cible) <= 0.05;
};

const apiRepartitionToLines = (repartition) => {
  if (!Array.isArray(repartition) || repartition.length === 0) return [];
  return repartition.map((row, idx) => ({
    id: `r-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    agenceId:
      row.agence_id === null || row.agence_id === undefined || row.agence_id === ""
        ? MO_KEY
        : String(row.agence_id),
    montantStr:
      toNumber(row.montant) === 0
        ? ""
        : toNumber(row.montant).toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
  }));
};

const buildApiPayload = (lines) =>
  lines
    .map((line) => ({
      agence_id: line.agenceId === MO_KEY ? null : Number.parseInt(line.agenceId, 10),
      montant: round2(parseMoneyInput(line.montantStr)),
    }))
    .filter((row) => row.montant > 0 && (row.agence_id === null || Number.isFinite(row.agence_id)));

const PointageRepartitionAgenceModal = ({
  open,
  onClose,
  rowLabel,
  montantCharge,
  agences,
  initialRepartition,
  legacyAgenceSansRepartition,
  saving,
  onSubmit,
}) => {
  const [lines, setLines] = useState([]);
  const [error, setError] = useState("");

  const cible = toNumber(montantCharge);

  useEffect(() => {
    if (!open) return;
    setError("");
    const existing = initialRepartition;
    if (Array.isArray(existing) && existing.length > 0 && repartitionSumMatchesMontant(existing, cible)) {
      setLines(apiRepartitionToLines(existing));
      return;
    }
    if (legacyAgenceSansRepartition && cible > 0 && agences.length > 0) {
      setLines([
        {
          id: "init-1",
          agenceId: String(agences[0].id),
          montantStr: cible.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        },
      ]);
      return;
    }
    setLines([
      {
        id: "init-1",
        agenceId: MO_KEY,
        montantStr:
          cible === 0
            ? ""
            : cible.toLocaleString("fr-FR", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
      },
    ]);
  }, [open, initialRepartition, legacyAgenceSansRepartition, cible, agences]);

  const totalSaisi = useMemo(
    () => lines.reduce((acc, line) => acc + parseMoneyInput(line.montantStr), 0),
    [lines]
  );

  const handleAddLine = () => {
    setLines((prev) => [
      ...prev,
      {
        id: `n-${Date.now()}-${prev.length}`,
        agenceId: MO_KEY,
        montantStr: "",
      },
    ]);
  };

  const handleRemoveLine = (id) => {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.id !== id)));
  };

  const handleValidate = async () => {
    setError("");
    const payload = buildApiPayload(lines);
    const sum = payload.reduce((a, b) => a + b.montant, 0);
    if (cible <= 0) {
      await onSubmit([], false);
      return;
    }
    if (payload.length === 0) {
      setError("Ajoutez au moins une ligne avec un montant supérieur à 0.");
      return;
    }
    if (Math.abs(sum - cible) > 0.05) {
      setError(
        `La somme des lignes (${round2(sum).toLocaleString("fr-FR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} €) doit égaler le montant chargé (${cible.toLocaleString("fr-FR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} €).`
      );
      return;
    }
    const agenceFlag = payload.some((p) => p.agence_id !== null);
    await onSubmit(payload, agenceFlag);
  };

  const handleToutMainOeuvre = async () => {
    setError("");
    if (cible <= 0) {
      await onSubmit([], false);
      return;
    }
    await onSubmit([{ agence_id: null, montant: round2(cible) }], false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700 }}>
        Répartition du montant chargé
        {rowLabel ? (
          <Typography component="div" variant="body2" color="text.secondary" sx={{ mt: 0.5, fontWeight: 500 }}>
            {rowLabel}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          Ventilez le montant chargé ({cible.toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}{" "}
          €) entre les agences (dépenses agence sur le tableau de bord) et la main d&apos;œuvre chantier classique.
        </Typography>
        {error ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        ) : null}
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>Destination</TableCell>
              <TableCell align="right" sx={{ fontWeight: 700, width: 160 }}>
                Montant (€)
              </TableCell>
              <TableCell align="center" sx={{ width: 56 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {lines.map((line) => (
              <TableRow key={line.id}>
                <TableCell>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    value={line.agenceId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLines((prev) =>
                        prev.map((l) => (l.id === line.id ? { ...l, agenceId: v } : l))
                      );
                    }}
                  >
                    <MenuItem value={MO_KEY}>Main d&apos;œuvre chantier</MenuItem>
                    {agences.map((ag) => (
                      <MenuItem key={ag.id} value={String(ag.id)}>
                        {ag.nom || `Agence #${ag.id}`}
                      </MenuItem>
                    ))}
                  </TextField>
                </TableCell>
                <TableCell align="right">
                  <TextField
                    size="small"
                    fullWidth
                    value={line.montantStr}
                    onChange={(e) => {
                      const v = e.target.value;
                      setLines((prev) => prev.map((l) => (l.id === line.id ? { ...l, montantStr: v } : l)));
                    }}
                    inputProps={{ style: { textAlign: "right" } }}
                  />
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    size="small"
                    aria-label="Supprimer la ligne"
                    onClick={() => handleRemoveLine(line.id)}
                    disabled={lines.length <= 1}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2, flexWrap: "wrap", gap: 1 }}>
          <Button startIcon={<AddIcon />} size="small" variant="outlined" onClick={handleAddLine}>
            Ajouter une ligne
          </Button>
          <Typography
            variant="body2"
            sx={{
              fontWeight: 700,
              color: Math.abs(totalSaisi - cible) <= 0.05 ? "success.main" : "error.main",
            }}
          >
            Total saisi :{" "}
            {totalSaisi.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            € / {cible.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, flexWrap: "wrap", gap: 1 }}>
        <Button onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button color="secondary" onClick={handleToutMainOeuvre} disabled={saving}>
          Tout en main d&apos;œuvre chantier
        </Button>
        <Button variant="contained" onClick={() => void handleValidate()} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PointageRepartitionAgenceModal;
export { repartitionSumMatchesMontant, MO_KEY };
