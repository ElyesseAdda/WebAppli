import { Box, Button, Dialog, DialogContent, DialogTitle, Typography } from "@mui/material";
import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const COLOR_ENTREE = "#16a34a";
const COLOR_ENTREE_PREVU = "#22c55e";
const COLOR_SORTIE = "#dc2626";
const COLOR_SORTIE_PREVU = "#fca5a5";

const fmt = (v) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v || 0);

const fmtShort = (v) => {
  const abs = Math.abs(v || 0);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${Math.round(abs / 1_000)}k`;
  return String(Math.round(abs));
};

const getEntryDetails = (entry) => {
  const raw = entry.payload;
  let detailKey = null;
  if (entry.dataKey === "entreesReelles") detailKey = "_entreesReellesDetail";
  if (entry.dataKey === "entreesPrevu") detailKey = "_entreesPrevuDetail";
  if (entry.dataKey === "sortiesReelles") detailKey = "_sortiesReellesDetail";
  if (entry.dataKey === "sortiesPrevu") detailKey = "_sortiesPrevuDetail";
  return detailKey ? (raw[detailKey] || []) : [];
};

/** Tooltip personnalisé avec détail des lignes */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;

  const entries = payload.filter((p) => p.value > 0);
  if (!entries.length) return null;

  return (
    <Box
      sx={{
        bgcolor: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "10px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
        p: 1.5,
        minWidth: 220,
        maxWidth: 340,
        maxHeight: "60vh",
        overflowY: "auto",
        fontSize: "0.78rem",
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", mb: 0.8, color: "#111827" }}>
        {label}
      </Typography>
      {entries.map((entry) => {
        const details = getEntryDetails(entry);

        return (
          <Box key={entry.dataKey} sx={{ mb: 0.6 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: 0.3 }}>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "2px",
                  bgcolor: entry.fill || entry.color,
                  flexShrink: 0,
                  border: entry.dataKey.includes("Prevu") ? "1.5px dashed #64748b" : "none",
                }}
              />
              <Typography sx={{ fontWeight: 700, color: "#374151", fontSize: "0.78rem" }}>
                {entry.name} : {fmt(entry.value)}
              </Typography>
            </Box>
            {details.slice(0, 6).map((d, i) => (
              <Typography
                key={i}
                sx={{ pl: 2, color: "#6b7280", fontSize: "0.72rem", lineHeight: 1.5 }}
              >
                • {d.label} — {fmt(d.montant)}
              </Typography>
            ))}
            {details.length > 6 && (
              <Typography sx={{ pl: 2, color: "#9ca3af", fontSize: "0.70rem" }}>
                + {details.length - 6} autre(s)…
              </Typography>
            )}
          </Box>
        );
      })}
    </Box>
  );
};

/** Légende personnalisée (bas du graphique) */
const legendItems = [
  { key: "entreesReelles", label: "Entrées réelles", color: COLOR_ENTREE, hatched: false },
  { key: "entreesPrevu", label: "Entrées prévues", color: COLOR_ENTREE_PREVU, hatched: true },
  { key: "sortiesReelles", label: "Sorties réelles", color: COLOR_SORTIE, hatched: false },
  { key: "sortiesPrevu", label: "Sorties prévues", color: COLOR_SORTIE_PREVU, hatched: true },
];

const legendByKey = Object.fromEntries(legendItems.map((item) => [item.key, item]));

const CustomLegend = () => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 2,
      flexWrap: "wrap",
      mt: 0.5,
    }}
  >
    {legendItems.map((item) => (
      <Box key={item.key} sx={{ display: "inline-flex", alignItems: "center", gap: 0.6 }}>
        <Box
          sx={{
            width: 12,
            height: 12,
            borderRadius: "2px",
            bgcolor: item.color,
            flexShrink: 0,
            border: item.hatched ? "1.5px dashed #64748b" : "none",
          }}
        />
        <Typography component="span" sx={{ fontSize: "0.73rem", color: "#64748b", fontWeight: 600 }}>
          {item.label}
        </Typography>
      </Box>
    ))}
  </Box>
);

const TresorerieBarChart = ({ data = [], height = 340 }) => {
  const [hoverTooltip, setHoverTooltip] = useState({
    active: false,
    payload: [],
    label: "",
    position: undefined,
  });
  const [detailsModal, setDetailsModal] = useState({ open: false, label: "", entries: [] });

  const handleChartMouseMove = (state) => {
    if (!state?.isTooltipActive || !state?.activePayload?.length) {
      setHoverTooltip({ active: false, payload: [], label: "", position: undefined });
      return;
    }
    const c = state.activeCoordinate;
    setHoverTooltip({
      active: true,
      payload: state.activePayload || [],
      label: state.activeLabel || "",
      position: c ? { x: c.x, y: c.y } : undefined,
    });
  };

  const handleChartMouseLeave = () => {
    setHoverTooltip({ active: false, payload: [], label: "", position: undefined });
  };
  const handleChartClick = (state) => {
    if (state?.activePayload?.length) {
      const entries = (state.activePayload || []).filter((p) => p.value > 0).map((entry) => ({
        ...entry,
        details: getEntryDetails(entry),
      }));
      setDetailsModal({ open: true, label: state.activeLabel || "", entries });
    }
  };

  const hasData = data.some(
    (d) => d.entreesReelles > 0 || d.entreesPrevu > 0 || d.sortiesReelles > 0 || d.sortiesPrevu > 0
  );

  return (
    <Box sx={{ width: "100%", height }}>
      {!hasData ? (
        <Box
          sx={{
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography sx={{ color: "#9ca3af", fontSize: "0.85rem" }}>
            Aucune donnée de trésorerie pour cette période
          </Typography>
        </Box>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 8, right: 12, left: 0, bottom: 28 }}
            barCategoryGap="20%"
            barGap={2}
            onMouseMove={handleChartMouseMove}
            onMouseLeave={handleChartMouseLeave}
            onClick={handleChartClick}
          >
            {/* Patterns SVG pour les barres hachurées */}
            <defs>
              <pattern
                id="hatch-green"
                patternUnits="userSpaceOnUse"
                width="6"
                height="6"
                patternTransform="rotate(45)"
              >
                <line x1="0" y1="0" x2="0" y2="6" stroke={COLOR_ENTREE} strokeWidth="2.5" />
              </pattern>
              <pattern
                id="hatch-red"
                patternUnits="userSpaceOnUse"
                width="6"
                height="6"
                patternTransform="rotate(45)"
              >
                <line x1="0" y1="0" x2="0" y2="6" stroke={COLOR_SORTIE} strokeWidth="2.5" />
              </pattern>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f8" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              tickFormatter={fmtShort}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip
              content={<CustomTooltip />}
              active={hoverTooltip.active}
              payload={hoverTooltip.payload}
              label={hoverTooltip.label}
              position={hoverTooltip.position}
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
              reverseDirection={{ y: true }}
              allowEscapeViewBox={{ x: true, y: true }}
              wrapperStyle={{ zIndex: 1300, pointerEvents: "auto" }}
            />
            <Legend content={<CustomLegend />} />

            {/* Entrées réelles — barre pleine verte */}
            <Bar
              dataKey="entreesReelles"
              name="Entrées réelles"
              fill={COLOR_ENTREE}
              maxBarSize={28}
              radius={0}
            />
            {/* Entrées prévues — barre hachurée verte */}
            <Bar
              dataKey="entreesPrevu"
              name="Entrées prévues"
              fill="url(#hatch-green)"
              stroke={COLOR_ENTREE}
              strokeWidth={0.5}
              maxBarSize={28}
              radius={0}
            />
            {/* Sorties réelles — barre pleine rouge */}
            <Bar
              dataKey="sortiesReelles"
              name="Sorties réelles"
              fill={COLOR_SORTIE}
              maxBarSize={28}
              radius={0}
            />
            {/* Sorties prévues — barre hachurée rouge */}
            <Bar
              dataKey="sortiesPrevu"
              name="Sorties prévues"
              fill="url(#hatch-red)"
              stroke={COLOR_SORTIE}
              strokeWidth={0.5}
              maxBarSize={28}
              radius={0}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
      <Dialog
        open={detailsModal.open}
        onClose={() => setDetailsModal({ open: false, label: "", entries: [] })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Details tresorerie - {detailsModal.label}</DialogTitle>
        <DialogContent dividers sx={{ maxHeight: "70vh", overflowY: "auto" }}>
          {detailsModal.entries.map((entry) => (
            <Box key={entry.dataKey} sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 0.5 }}>
                <Box
                  sx={{
                    width: 11,
                    height: 11,
                    borderRadius: "2px",
                    bgcolor: legendByKey[entry.dataKey]?.color || entry.fill || entry.color || "#9ca3af",
                    border: legendByKey[entry.dataKey]?.hatched ? "1.5px dashed #64748b" : "none",
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: legendByKey[entry.dataKey]?.color || "#374151",
                    fontSize: "0.9rem",
                  }}
                >
                  {entry.name} : {fmt(entry.value)}
                </Typography>
              </Box>
              {(entry.details || []).length ? (
                entry.details.map((d, i) => (
                  <Typography key={`${entry.dataKey}-${i}`} sx={{ pl: 1, color: "#4b5563", fontSize: "0.82rem", lineHeight: 1.6 }}>
                    • {d.label} — {fmt(d.montant)}
                  </Typography>
                ))
              ) : (
                <Typography sx={{ pl: 1, color: "#9ca3af", fontSize: "0.8rem" }}>
                  Aucun detail
                </Typography>
              )}
            </Box>
          ))}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Button onClick={() => setDetailsModal({ open: false, label: "", entries: [] })}>
              Fermer
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default TresorerieBarChart;
