import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Paper,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useMemo, useRef } from "react";
import { buildDecoupage } from "./decoupageAgenceUtils";

const formatNumber = (num) =>
  Number(num ?? 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const FIELD_LABELS = {
  a_payer: "À payer",
  a_payer_ttc: "À payer",
  paye: "Payé",
  ecart: "Écart",
};

const colorForAmount = (value) => {
  const n = Number(value ?? 0);
  if (Math.abs(n) < 0.01) return "text.primary";
  return n < 0 ? "rgba(211, 47, 47, 1)" : "rgba(27, 120, 188, 1)";
};

const MetricRow = ({ label, value, highlight }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 2,
      py: 0.4,
      px: 0.5,
      borderRadius: "4px",
      backgroundColor: highlight ? "rgba(27, 120, 188, 0.08)" : "transparent",
      fontWeight: highlight ? 700 : 400,
    }}
  >
    <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>{label}</Typography>
    <Typography sx={{ fontSize: "0.85rem", fontWeight: highlight ? 700 : 600, color: colorForAmount(value) }}>
      {formatNumber(value)} €
    </Typography>
  </Box>
);

const BucketCard = ({ title, color, data, focusField }) => (
  <Paper
    variant="outlined"
    sx={{
      flex: 1,
      minWidth: 240,
      p: 2,
      borderColor: color,
      backgroundColor: `${color}0F`,
    }}
  >
    <Typography sx={{ fontWeight: 700, color, mb: 1.5, fontSize: "0.95rem" }}>
      {title}
    </Typography>
    <MetricRow label="À payer" value={data.a_payer} highlight={focusField === "a_payer" || focusField === "a_payer_ttc"} />
    <MetricRow label="Payé" value={data.paye} highlight={focusField === "paye"} />
    <MetricRow label="Écart" value={data.ecart} highlight={focusField === "ecart"} />

    <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px dashed rgba(0,0,0,0.12)" }}>
      {data.lignes.length === 0 ? (
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", fontStyle: "italic" }}>
          Aucune ligne
        </Typography>
      ) : (
        data.lignes.map((ligne, idx) => (
          <Box
            key={`${ligne.label}-${idx}`}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              gap: 1,
              py: 0.35,
              borderBottom: idx < data.lignes.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
            }}
          >
            <Typography sx={{ fontSize: "0.78rem", color: "text.primary", pr: 1 }}>
              {ligne.label}
            </Typography>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, whiteSpace: "nowrap", color: colorForAmount(ligne.a_payer) }}>
              {formatNumber(ligne.a_payer)} €
            </Typography>
          </Box>
        ))
      )}
    </Box>
  </Paper>
);

const DecoupageAgenceModal = ({
  open,
  onClose,
  title,
  subtitle,
  items,
  agenceIndex,
  focusField = "a_payer",
  groupByChantier = false,
}) => {
  const cachedRef = useRef({ title: "", subtitle: "", items: [], focusField: "a_payer", groupByChantier: false });
  if (open) {
    cachedRef.current = { title, subtitle, items: items || [], focusField, groupByChantier };
  }
  const display = open
    ? { title, subtitle, items: items || [], focusField, groupByChantier }
    : cachedRef.current;

  const { agence, chantiers } = useMemo(
    () => buildDecoupage(display.items, agenceIndex, { groupByChantier: display.groupByChantier }),
    [display.items, agenceIndex, display.groupByChantier]
  );

  const totalAPayer = agence.a_payer + chantiers.a_payer;
  const totalPaye = agence.paye + chantiers.paye;
  const pctAgence = totalAPayer ? (agence.a_payer / totalAPayer) * 100 : 0;
  const fieldLabel = FIELD_LABELS[display.focusField] || "Montant";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 0.5 }}>
        Découpage agence / chantiers
        {display.title ? (
          <Typography component="span" sx={{ display: "block", fontSize: "0.95rem", fontWeight: 600, color: "rgba(27, 120, 188, 1)", mt: 0.5 }}>
            {display.title}
          </Typography>
        ) : null}
        {display.subtitle ? (
          <Typography component="span" sx={{ display: "block", fontSize: "0.8rem", color: "text.secondary", fontWeight: 400 }}>
            {display.subtitle}
            {display.focusField ? ` · ${fieldLabel}` : ""}
          </Typography>
        ) : null}
      </DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mb: 2, mt: 1 }}>
          Part agence : {formatNumber(pctAgence)} % du montant à payer.
        </Typography>
        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "stretch" }}>
          <BucketCard
            title="Agence"
            color="rgba(123, 31, 162, 1)"
            data={agence}
            focusField={display.focusField}
          />
          <BucketCard
            title="Chantiers"
            color="rgba(27, 120, 188, 1)"
            data={chantiers}
            focusField={display.focusField}
          />
        </Box>
        <Paper
          sx={{
            mt: 2,
            p: 1.5,
            backgroundColor: "rgba(27, 120, 188, 0.06)",
            border: "1px solid rgba(27, 120, 188, 0.2)",
          }}
        >
          <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2 }}>
            <Box>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Total à payer</Typography>
              <Typography sx={{ fontWeight: 700, color: colorForAmount(totalAPayer) }}>
                {formatNumber(totalAPayer)} €
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Dont agence</Typography>
              <Typography sx={{ fontWeight: 700, color: "rgba(123, 31, 162, 1)" }}>
                {formatNumber(agence.a_payer)} €
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Dont chantiers</Typography>
              <Typography sx={{ fontWeight: 700, color: "rgba(27, 120, 188, 1)" }}>
                {formatNumber(chantiers.a_payer)} €
              </Typography>
            </Box>
            <Box>
              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Total payé</Typography>
              <Typography sx={{ fontWeight: 700, color: colorForAmount(totalPaye) }}>
                {formatNumber(totalPaye)} €
              </Typography>
            </Box>
          </Box>
        </Paper>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const ClickableAmount = ({ children, onClick, title = "Voir le détail agence / chantiers", sx = {} }) => (
  <Tooltip title={title} arrow>
    <Box
      component="span"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      sx={{
        cursor: "pointer",
        borderRadius: "4px",
        display: "inline-block",
        px: 0.5,
        transition: "background-color 0.15s ease",
        "&:hover": { backgroundColor: "rgba(27, 120, 188, 0.1)" },
        ...sx,
      }}
    >
      {children}
    </Box>
  </Tooltip>
);

export default DecoupageAgenceModal;
