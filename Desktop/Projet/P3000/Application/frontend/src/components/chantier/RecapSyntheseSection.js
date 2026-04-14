import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Tooltip as MuiTooltip,
} from "@mui/material";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import HandshakeOutlinedIcon from "@mui/icons-material/HandshakeOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import React from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";

const COL_MAT = "#FF9800"; // Orange (pour correspondre au reste de la page)
const COL_MO = "#2196F3"; // Bleu
/** Sous-traitant : teal (évite la confusion avec le bénéfice en vert) */
const COL_ST = "#0D9488";
const COL_COUT_CUM = "rgba(211, 47, 47, 0.1)"; // Rouge très léger
const COL_COUT_LINE = "#d32f2f"; // Rouge (comme dans les cartes)
const COL_BENEF = "#43A047"; // Vert
const COL_ENC_SITUATION = "#0277bd";
const COL_ENC_FACTURE = "#1565c0";
const COL_ENC_RETARD = "#c62828";

const formatEuro = (v) =>
  Number(v || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const formatPercent = (v) =>
  Number(v || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

const montantCoutVisible = (v) => {
  if (v == null) return false;
  const n = Number(v);
  return !Number.isNaN(n) && n !== 0;
};

const StatCard = ({
  title,
  amount,
  color,
  isNegative = false,
  costBreakdown,
  paymentEncours,
  percentOfTotal,
}) => {
  const breakdownRows = costBreakdown
    ? [
        montantCoutVisible(costBreakdown.main_oeuvre) && {
          label: "Main d'œuvre",
          tip: "Part MO déjà payée (période ou vue globale).",
          value: Number(costBreakdown.main_oeuvre),
          lineColor: COL_MO,
          Icon: GroupsOutlinedIcon,
        },
        montantCoutVisible(costBreakdown.materiel) && {
          label: "Matériel",
          tip: "Matériel déjà payé.",
          value: Number(costBreakdown.materiel),
          lineColor: COL_MAT,
          Icon: Inventory2OutlinedIcon,
        },
        montantCoutVisible(costBreakdown.sous_traitant) && {
          label: "Sous-traitant",
          tip: "Sous-traitance déjà réglée.",
          value: Number(costBreakdown.sous_traitant),
          lineColor: COL_ST,
          Icon: HandshakeOutlinedIcon,
        },
      ].filter(Boolean)
    : [];

  const paymentRows = paymentEncours
    ? [
        montantCoutVisible(paymentEncours.situationsHt) && {
          key: "sit",
          label: "Situations (HT)",
          tip: "Net HT après retenues — pas encore en retard.",
          value: Number(paymentEncours.situationsHt),
          lineColor: COL_ENC_SITUATION,
          Icon: EventOutlinedIcon,
        },
        montantCoutVisible(paymentEncours.facturesHt) && {
          key: "fac",
          label: "Facturé (HT)",
          tip: "Factures clients impayées, échéance OK.",
          value: Number(paymentEncours.facturesHt),
          lineColor: COL_ENC_FACTURE,
          Icon: ReceiptLongOutlinedIcon,
        },
        montantCoutVisible(paymentEncours.enRetardHt) && {
          key: "retard",
          label: "En retard (HT)",
          tip: "Échéance dépassée (date prévue ou envoi + délai).",
          value: Number(paymentEncours.enRetardHt),
          lineColor: COL_ENC_RETARD,
          Icon: ErrorOutlineIcon,
        },
      ].filter(Boolean)
    : [];

  const hasCostBreakdown = breakdownRows.length > 0;
  const hasPaymentEncours = paymentRows.length > 0;
  const hasCompact = hasCostBreakdown || hasPaymentEncours;

  return (
  <Card
    elevation={0}
    sx={{
      height: "100%",
      borderRadius: 3,
      border: "1px solid",
      borderColor: "divider",
      position: "relative",
      overflow: "hidden",
      transition: "transform 0.2s, box-shadow 0.2s",
      "&:hover": {
        transform: "translateY(-2px)",
        boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
      },
    }}
  >
    <Box
      sx={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: "4px",
        bgcolor: color,
      }}
    />
    <CardContent
      sx={{
        p: 2,
        "&:last-child": { pb: 2 },
        ...(hasCompact && {
          pt: 1.25,
          px: 1.75,
          pb: 1.15,
          "&:last-child": { pb: 1.15 },
        }),
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        fontWeight={600}
        gutterBottom={!hasCompact}
        sx={{
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          fontSize: "0.7rem",
          ...(hasCompact && { mb: 0.2 }),
        }}
      >
        {title}
      </Typography>
      <Box sx={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 1.5 }}>
        <Typography
          variant="h6"
          style={{ color: color }}
          sx={{
            fontWeight: 700,
            display: "flex",
            alignItems: "baseline",
            gap: 0.5,
            ...(hasCompact && { mb: 0, lineHeight: 1.1 }),
          }}
        >
          {isNegative ? "- " : ""}
          {amount.toLocaleString("fr-FR", { minimumFractionDigits: 2 })}
          <Typography component="span" variant="body2" fontWeight={600} style={{ color: color }}>
            €
          </Typography>
        </Typography>
        {percentOfTotal != null && (
          <Typography
            variant="caption"
            sx={{
              color: color,
              opacity: 0.72,
              fontWeight: 600,
              whiteSpace: "nowrap",
              textAlign: "right",
              lineHeight: 1.1,
              fontSize: "0.78rem",
            }}
          >
            {formatPercent(percentOfTotal)} %
          </Typography>
        )}
      </Box>
      {hasCostBreakdown && (
        <Box
          sx={{
            mt: 0.35,
            pt: 0.45,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            columnGap: 0.75,
            rowGap: 0.15,
            minHeight: 22,
            contain: "layout style",
          }}
        >
          {breakdownRows.map((row, i) => {
            const Ico = row.Icon;
            return (
              <React.Fragment key={row.label}>
                {i > 0 && (
                  <Box
                    component="span"
                    sx={{
                      color: "text.secondary",
                      fontSize: "0.55rem",
                      lineHeight: 1,
                      userSelect: "none",
                      px: 0.15,
                      alignSelf: "center",
                      opacity: 0.9,
                    }}
                    aria-hidden
                  >
                    ·
                  </Box>
                )}
                <MuiTooltip
                  title={
                    <Box sx={{ maxWidth: 240, textAlign: "center" }}>
                      <Box component="span" sx={{ fontWeight: 700, fontSize: "0.8rem", display: "block" }}>
                        {row.label}
                      </Box>
                      <Box
                        component="span"
                        sx={{ fontSize: "0.72rem", opacity: 0.9, display: "block", mt: 0.35, lineHeight: 1.3 }}
                      >
                        {row.tip}
                      </Box>
                    </Box>
                  }
                  placement="top"
                  arrow
                  enterDelay={100}
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: "grey.900",
                        color: "common.white",
                        fontWeight: 500,
                        py: 0.65,
                        px: 1,
                      },
                    },
                    arrow: { sx: { color: "grey.900" } },
                  }}
                >
                  <Box
                    className="cout-chantier-bd-seg"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.3,
                      py: 0,
                      px: 0.35,
                      mx: -0.1,
                      borderRadius: 1,
                      cursor: "default",
                      position: "relative",
                      zIndex: 0,
                      transformOrigin: "center center",
                      backfaceVisibility: "hidden",
                      transition:
                        "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, box-shadow 0.2s ease",
                      "&:hover": {
                        zIndex: 3,
                        transform: "scale(1.14)",
                        bgcolor: "action.hover",
                        boxShadow: (theme) =>
                          theme.palette.mode === "dark"
                            ? "0 2px 12px rgba(0,0,0,0.45)"
                            : "0 2px 10px rgba(0,0,0,0.1)",
                      },
                    }}
                  >
                    <Ico
                      className="cout-chantier-bd-ico"
                      sx={{
                        fontSize: 12,
                        color: row.lineColor,
                        opacity: 1,
                        flexShrink: 0,
                      }}
                      aria-hidden
                    />
                    <Box
                      component="span"
                      className="cout-chantier-bd-amt"
                      sx={{
                        fontSize: "0.58rem",
                        lineHeight: 1.15,
                        color: row.lineColor,
                        opacity: 1,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {isNegative ? "- " : ""}
                      {formatEuro(row.value)}
                      <Box
                        component="span"
                        sx={{
                          fontSize: "0.5rem",
                          ml: 0.08,
                          opacity: 1,
                        }}
                      >
                        {" "}
                        €
                      </Box>
                      {amount > 0 && (
                        <Box
                          component="span"
                          sx={{
                            ml: 0.35,
                            fontSize: "0.5rem",
                            opacity: 0.8,
                            fontWeight: 600,
                          }}
                        >
                          ({formatPercent((Number(row.value || 0) / Number(amount)) * 100)} %)
                        </Box>
                      )}
                    </Box>
                  </Box>
                </MuiTooltip>
              </React.Fragment>
            );
          })}
        </Box>
      )}
      {hasPaymentEncours && (
        <Box
          sx={{
            mt: hasCostBreakdown ? 0.5 : 0.35,
            pt: 0.45,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "center",
            columnGap: 0.75,
            rowGap: 0.15,
            minHeight: 22,
            contain: "layout style",
          }}
        >
          {paymentRows.map((row, i) => {
            const EncIcon = row.Icon;
            return (
              <React.Fragment key={row.key}>
                {i > 0 && (
                  <Box
                    component="span"
                    sx={{
                      color: "text.secondary",
                      fontSize: "0.55rem",
                      lineHeight: 1,
                      userSelect: "none",
                      px: 0.15,
                      alignSelf: "center",
                      opacity: 0.9,
                    }}
                    aria-hidden
                  >
                    ·
                  </Box>
                )}
                <MuiTooltip
                  title={
                    <Box sx={{ maxWidth: 240, textAlign: "center" }}>
                      <Box component="span" sx={{ fontWeight: 700, fontSize: "0.8rem", display: "block" }}>
                        {row.label}
                      </Box>
                      <Box
                        component="span"
                        sx={{ fontSize: "0.72rem", opacity: 0.9, display: "block", mt: 0.35, lineHeight: 1.3 }}
                      >
                        {row.tip}
                      </Box>
                    </Box>
                  }
                  placement="top"
                  arrow
                  enterDelay={100}
                  componentsProps={{
                    tooltip: {
                      sx: {
                        bgcolor: "grey.900",
                        color: "common.white",
                        fontWeight: 500,
                        py: 0.65,
                        px: 1,
                      },
                    },
                    arrow: { sx: { color: "grey.900" } },
                  }}
                >
                  <Box
                    className="cout-chantier-bd-seg"
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.3,
                      py: 0,
                      px: 0.35,
                      mx: -0.1,
                      borderRadius: 1,
                      cursor: "default",
                      position: "relative",
                      zIndex: 0,
                      transformOrigin: "center center",
                      backfaceVisibility: "hidden",
                      transition:
                        "transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.2s ease, box-shadow 0.2s ease",
                      "&:hover": {
                        zIndex: 3,
                        transform: "scale(1.14)",
                        bgcolor: "action.hover",
                        boxShadow: (theme) =>
                          theme.palette.mode === "dark"
                            ? "0 2px 12px rgba(0,0,0,0.45)"
                            : "0 2px 10px rgba(0,0,0,0.1)",
                      },
                    }}
                  >
                    <EncIcon
                      className="cout-chantier-bd-ico"
                      sx={{
                        fontSize: 12,
                        color: row.lineColor,
                        opacity: 1,
                        flexShrink: 0,
                      }}
                      aria-hidden
                    />
                    <Box
                      component="span"
                      className="cout-chantier-bd-amt"
                      sx={{
                        fontSize: "0.58rem",
                        lineHeight: 1.15,
                        color: row.lineColor,
                        opacity: 1,
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        letterSpacing: "0.01em",
                      }}
                    >
                      {formatEuro(row.value)}
                      <Box
                        component="span"
                        sx={{
                          fontSize: "0.5rem",
                          ml: 0.08,
                          opacity: 1,
                        }}
                      >
                        {" "}
                        €
                      </Box>
                    </Box>
                  </Box>
                </MuiTooltip>
              </React.Fragment>
            );
          })}
        </Box>
      )}
    </CardContent>
  </Card>
  );
};

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const row = payload[0]?.payload;
  if (!row) return null;
  const beneficeCalcule = Number(row.paiements_recus_line || 0) - Number(row.cout_chantier_cumule || 0);
  return (
    <Box
      sx={{
        p: 1.5,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 1,
        boxShadow: 2,
        maxWidth: 280,
      }}
    >
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {label}
      </Typography>
      <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 0.5 }}>
        Clic sur une barre : détail du mois
      </Typography>
      <Typography variant="body2">Matériel : {formatEuro(row.materiel)} €</Typography>
      <Typography variant="body2">Main d&apos;œuvre : {formatEuro(row.main_oeuvre)} €</Typography>
      <Typography variant="body2">Sous-traitant : {formatEuro(row.sous_traitant)} €</Typography>
      <Typography variant="body2" sx={{ mt: 0.5 }} fontWeight={600}>
        Coût du mois : {formatEuro(row.cout_chantier)} €
      </Typography>
      <Typography variant="body2">Coût cumulé : {formatEuro(row.cout_chantier_cumule)} €</Typography>
      {row.paiements_recus_line != null && (
        <Typography variant="body2" sx={{ mt: 0.5 }} fontWeight={600}>
          Paiements reçus : {formatEuro(row.paiements_recus_line)} €
        </Typography>
      )}
      {row.paiements_recus_line != null && (
        <Typography variant="body2" sx={{ mt: 0.5 }} fontWeight={600}>
          Bénéfice (écart) : {formatEuro(beneficeCalcule)} €
        </Typography>
      )}
    </Box>
  );
};

const RecapSyntheseSection = ({
  data,
  depensesPaye,
  tauxFacturation,
  syntheseMensuelle,
  syntheseMensuelleLoading,
  syntheseUiResetKey = 0,
}) => {
  const [selectedMonth, setSelectedMonth] = React.useState(null);

  React.useEffect(() => {
    if (syntheseUiResetKey > 0) setSelectedMonth(null);
  }, [syntheseUiResetKey]);

  if (!data) return null;
  const paye = depensesPaye || data.sorties?.paye || {};
  const montant_ht = Number(data.montant_ht || 0);
  const montant_factures = Number(tauxFacturation?.montant_factures ?? 0);
  const montant_avenants = Number(tauxFacturation?.montant_avenants ?? 0);
  const montant_avenants_et_factures = montant_factures + montant_avenants;
  const total_materiel = Number(paye.materiel?.total || 0);
  const total_main_oeuvre = Number(paye.main_oeuvre?.total || 0);
  const total_sous_traitant = Number(paye.sous_traitant?.total || 0);
  const cout_chantier = total_main_oeuvre + total_sous_traitant + total_materiel;

  const cumulCout = data.cout_chantier_cumul_jusqua_fin_mois;
  const cout_chantier_pour_benefice =
    cumulCout != null &&
    cumulCout.total != null &&
    !Number.isNaN(Number(cumulCout.total))
      ? Number(cumulCout.total)
      : cout_chantier;

  const total_paiements_recus =
    data.entrees && data.entrees.paye
      ? Object.values(data.entrees.paye).reduce((acc, cat) => acc + (cat.total || 0), 0)
      : 0;

  const total_marche_avenants_factures = montant_ht + montant_avenants_et_factures;
  const benefice = total_marche_avenants_factures - cout_chantier_pour_benefice;
  const prev = data.previsionnel_couts_chantier || {};
  const prevMo = Number(prev.main_oeuvre || 0);
  const prevMat = Number(prev.materiel || 0);
  const prevSt = Number(prev.sous_traitant || 0);
  const prevTotal = Number(prev.total || 0);
  const previsionnelTotalChantier = prevTotal;
  const basePercentMensuel =
    previsionnelTotalChantier > 0
      ? previsionnelTotalChantier
      : total_marche_avenants_factures;

  const chartData = React.useMemo(() => {
    const rows = syntheseMensuelle?.par_mois;
    if (!Array.isArray(rows) || rows.length === 0) return [];
    const base = total_marche_avenants_factures;
    return rows.map((row) => ({
      ...row,
      benefice: base - Number(row.cout_chantier_cumule || 0),
      cout_cumul_line: Number(row.cout_chantier_cumule || 0),
      paiements_recus_line: Number(total_paiements_recus || 0),
    }));
  }, [syntheseMensuelle, total_marche_avenants_factures, total_paiements_recus]);

  const displayCards = selectedMonth ? [
    {
      title: `Matériel (${selectedMonth.label})`,
      amount: Number(selectedMonth.materiel),
      color: COL_MAT,
      percentOfTotal:
        prevMat > 0
          ? (Number(selectedMonth.materiel || 0) / prevMat) * 100
          : null,
    },
    {
      title: `Main d'œuvre (${selectedMonth.label})`,
      amount: Number(selectedMonth.main_oeuvre),
      color: COL_MO,
      percentOfTotal:
        prevMo > 0
          ? (Number(selectedMonth.main_oeuvre || 0) / prevMo) * 100
          : null,
    },
    {
      title: `Sous-traitant (${selectedMonth.label})`,
      amount: Number(selectedMonth.sous_traitant),
      color: COL_ST,
      percentOfTotal:
        prevSt > 0
          ? (Number(selectedMonth.sous_traitant || 0) / prevSt) * 100
          : null,
    },
    {
      title: `Coût du mois (${selectedMonth.label})`,
      amount: Number(selectedMonth.cout_chantier),
      color: COL_COUT_LINE,
      isNegative: true,
      percentOfTotal:
        basePercentMensuel > 0
          ? (Number(selectedMonth.cout_chantier || 0) / basePercentMensuel) * 100
          : null,
    },
    {
      title: `Coût cumulé (fin ${selectedMonth.label})`,
      amount: Number(selectedMonth.cout_chantier_cumule),
      color: COL_COUT_LINE,
      isNegative: true,
      percentOfTotal:
        basePercentMensuel > 0
          ? (Number(selectedMonth.cout_chantier_cumule || 0) / basePercentMensuel) * 100
          : null,
    },
    { title: `Bénéfice (fin ${selectedMonth.label})`, amount: Number(selectedMonth.benefice), color: Number(selectedMonth.benefice) >= 0 ? COL_BENEF : "#d32f2f" }
  ] : [
    {
      title: "Marché",
      amount: montant_ht,
      color: "#1976d2",
      percentOfTotal: total_marche_avenants_factures > 0 ? (montant_ht / total_marche_avenants_factures) * 100 : null,
    },
    {
      title: "Avenants + Factures",
      amount: montant_avenants_et_factures,
      color: "#1976d2",
      percentOfTotal: total_marche_avenants_factures > 0 ? (montant_avenants_et_factures / total_marche_avenants_factures) * 100 : null,
    },
    {
      title: "Total",
      amount: total_marche_avenants_factures,
      color: "#1565c0",
      percentOfTotal: null,
    },
    {
      title: "Paiements reçus",
      amount: total_paiements_recus,
      color: COL_BENEF,
      percentOfTotal: total_marche_avenants_factures > 0 ? (total_paiements_recus / total_marche_avenants_factures) * 100 : null,
      ...(data.encours_paiements_clients && {
        paymentEncours: {
          situationsHt: Number(data.encours_paiements_clients.situations_a_encaisser_ht ?? 0),
          facturesHt: Number(data.encours_paiements_clients.factures_a_encaisser_ht ?? 0),
          enRetardHt: Number(data.encours_paiements_clients.en_retard_ht ?? 0),
        },
      }),
    },
    {
      title: "Coût chantier",
      amount: cout_chantier,
      color: "#d32f2f",
      isNegative: true,
      percentOfTotal: total_marche_avenants_factures > 0 ? (cout_chantier / total_marche_avenants_factures) * 100 : null,
      costBreakdown: {
        main_oeuvre: paye.main_oeuvre?.total,
        materiel: paye.materiel?.total,
        sous_traitant: paye.sous_traitant?.total,
      },
    },
    {
      title: "Bénéfice",
      amount: benefice,
      color: benefice >= 0 ? COL_BENEF : "#d32f2f",
      percentOfTotal: total_marche_avenants_factures > 0 ? (benefice / total_marche_avenants_factures) * 100 : null,
    }
  ];

  return (
    <Paper
      sx={{
        p: 3,
        mb: 3,
        borderRadius: 4,
        boxShadow: "0 4px 24px 0 rgba(0,0,0,0.06)",
      }}
      elevation={0}
    >
      <Typography variant="h6" sx={{ mb: 3, fontWeight: 700, color: "text.primary" }}>
        Synthèse Financière du Chantier
      </Typography>

      <Grid container spacing={4} alignItems="stretch">
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {displayCards.map((card, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <StatCard
                  title={card.title}
                  amount={card.amount}
                  color={card.color}
                  isNegative={card.isNegative}
                  costBreakdown={card.costBreakdown}
                  paymentEncours={card.paymentEncours}
                  percentOfTotal={card.percentOfTotal}
                />
              </Grid>
            ))}
          </Grid>
        </Grid>

        <Grid item xs={12}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
            {selectedMonth 
              ? `Détails du mois : ${selectedMonth.label} (Cliquez à nouveau sur le graphique pour revenir à la synthèse globale)`
              : `Évolution par mois (cliquez sur un mois pour voir ses détails dans les cartes ci-dessus)`}
          </Typography>
          <Box sx={{ 
            width: "100%", 
            height: 380, 
            position: "relative",
            "& .recharts-bar-rectangle path": {
              transition: "all 0.25s ease-in-out",
              transformOrigin: "center",
            },
            "& .recharts-bar-rectangle path:hover": {
              filter: "brightness(1.1)",
            },
            "& .recharts-bar-rectangle path:active": {
              transform: "scale(0.98)",
              filter: "brightness(0.9)",
            },
            "& .recharts-legend-wrapper": {
              fontSize: "0.65rem",
              lineHeight: 1.25,
            },
            "& .recharts-default-legend": {
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              alignItems: "center",
              columnGap: "1.35rem",
              rowGap: "0.35rem",
              padding: "6px 8px 0",
            },
            "& .recharts-legend-item": {
              display: "inline-flex",
              alignItems: "center",
              marginRight: "0 !important",
            },
            "& .recharts-legend-item-text": {
              fontSize: "0.65rem !important",
              fontWeight: 500,
              marginLeft: "0.25rem",
            },
          }}
          >
            {syntheseMensuelleLoading ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <CircularProgress />
              </Box>
            ) : chartData.length === 0 ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  border: "1px dashed",
                  borderColor: "divider",
                  borderRadius: 2,
                }}
              >
                <Typography color="text.secondary">
                  Pas encore de coûts ventilés par mois pour ce chantier.
                </Typography>
              </Box>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={chartData}
                  margin={{ top: 20, right: 20, left: 10, bottom: 20 }}
                  barCategoryGap="25%"
                  barSize={40} // Barres plus épaisses et uniformes
                  onClick={(state) => {
                    if (state && state.activePayload && state.activePayload.length > 0) {
                      const clickedData = state.activePayload[0].payload;
                      if (selectedMonth && selectedMonth.label === clickedData.label) {
                        setSelectedMonth(null); // Toggle off
                      } else {
                        setSelectedMonth(clickedData);
                      }
                    } else {
                      setSelectedMonth(null);
                    }
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 12, fill: '#666', fontWeight: 500 }} 
                    interval={0} 
                    axisLine={{ stroke: '#e0e0e0' }}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis
                    yAxisId="mois"
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                    width={50}
                    tick={{ fontSize: 12, fill: '#666' }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />
                  <YAxis
                    yAxisId="cumul"
                    orientation="right"
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                    width={50}
                    tick={{ fontSize: 12, fill: '#666' }}
                    axisLine={false}
                    tickLine={false}
                    dx={10}
                  />
                  <Tooltip 
                    cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} // Survol plus doux sur la colonne
                    content={() => null} // On désactive l'affichage du tooltip flottant
                  />
                  <Legend
                    wrapperStyle={{
                      paddingTop: 10,
                      fontSize: "0.65rem",
                      lineHeight: 1.25,
                    }}
                    iconType="circle"
                    iconSize={7}
                  />
                  {/* Les Barres sont rendues en PREMIER pour être en arrière-plan */}
                  <Bar
                    yAxisId="mois"
                    dataKey="materiel"
                    name="Matériel"
                    stackId="cout"
                    fill={COL_MAT}
                    radius={[0, 0, 4, 4]} // Arrondi en bas
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-mat-${index}`} fillOpacity={selectedMonth && selectedMonth.label !== entry.label ? 0.3 : 1} />
                    ))}
                  </Bar>
                  <Bar
                    yAxisId="mois"
                    dataKey="main_oeuvre"
                    name="Main d'œuvre"
                    stackId="cout"
                    fill={COL_MO}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-mo-${index}`} fillOpacity={selectedMonth && selectedMonth.label !== entry.label ? 0.3 : 1} />
                    ))}
                  </Bar>
                  <Bar
                    yAxisId="mois"
                    dataKey="sous_traitant"
                    name="Sous-traitant"
                    stackId="cout"
                    fill={COL_ST}
                    radius={[4, 4, 0, 0]} // Arrondi en haut
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-st-${index}`} fillOpacity={selectedMonth && selectedMonth.label !== entry.label ? 0.3 : 1} />
                    ))}
                  </Bar>
                  {/* Les Lignes et Zones sont rendues en DERNIER pour être au premier plan */}
                  <Area
                    yAxisId="cumul"
                    type="monotone"
                    dataKey="cout_cumul_line"
                    name="Coût cumulé"
                    stroke={COL_COUT_LINE}
                    fill={COL_COUT_CUM}
                    fillOpacity={1}
                    strokeWidth={3} // Ligne plus épaisse
                    isAnimationActive={false}
                  />
                  <Line
                    yAxisId="cumul"
                    type="monotone"
                    dataKey="paiements_recus_line"
                    name="Paiements reçus"
                    stroke={COL_BENEF}
                    strokeWidth={3} // Ligne plus épaisse
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} // Points plus jolis
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </Box>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default RecapSyntheseSection;
