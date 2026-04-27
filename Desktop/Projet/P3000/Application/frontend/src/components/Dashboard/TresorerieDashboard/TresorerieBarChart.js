import { Box, Typography } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
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
const COLOR_ENTREE_PREVU = "#86efac";
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

/** Tooltip personnalisé avec détail des lignes */
const CustomTooltip = ({ active, payload, label, onLockPageScroll, onUnlockPageScroll }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    return () => {
      onUnlockPageScroll?.();
    };
  }, [onUnlockPageScroll]);

  if (!active || !payload || !payload.length) return null;

  const entries = payload.filter((p) => p.value > 0);
  if (!entries.length) return null;

  return (
    <Box
      ref={containerRef}
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
      onMouseEnter={() => onLockPageScroll?.()}
      onMouseLeave={() => onUnlockPageScroll?.()}
      onWheel={(e) => {
        // Empêche le scroll de la page et force le scroll dans le tooltip
        e.preventDefault();
        e.stopPropagation();
        const el = containerRef.current;
        if (el) {
          el.scrollTop += e.deltaY;
        }
      }}
    >
      <Typography sx={{ fontWeight: 700, fontSize: "0.82rem", mb: 0.8, color: "#111827" }}>
        {label}
      </Typography>
      {entries.map((entry) => {
        // Accéder au détail embarqué dans la donnée brute
        const raw = entry.payload;
        let detailKey = null;
        if (entry.dataKey === "entreesReelles") detailKey = "_entreesReellesDetail";
        if (entry.dataKey === "entreesPrevu") detailKey = "_entreesPrevuDetail";
        if (entry.dataKey === "sortiesReelles") detailKey = "_sortiesReellesDetail";
        if (entry.dataKey === "sortiesPrevu") detailKey = "_sortiesPrevuDetail";

        const details = detailKey ? (raw[detailKey] || []) : [];

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
  const [pageScrollLocked, setPageScrollLocked] = useState(false);

  useEffect(() => {
    if (!pageScrollLocked) return undefined;

    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "contain";

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [pageScrollLocked]);

  const lockPageScroll = () => setPageScrollLocked(true);
  const unlockPageScroll = () => setPageScrollLocked(false);

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
              content={
                <CustomTooltip
                  onLockPageScroll={lockPageScroll}
                  onUnlockPageScroll={unlockPageScroll}
                />
              }
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
    </Box>
  );
};

export default TresorerieBarChart;
