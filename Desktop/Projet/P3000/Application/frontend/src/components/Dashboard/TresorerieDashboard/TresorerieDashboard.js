import {
  Box,
  CircularProgress,
  MenuItem,
  Select,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import TresorerieBarChart from "./TresorerieBarChart";
import ClassementFournisseurs from "./ClassementFournisseurs";
import { useTresorerieData } from "./useTresorerieData";

const TABS = [
  { label: "Trésorerie", enabled: true },
  { label: "Fournisseurs", enabled: true },
  { label: "Sociétés", enabled: false },
  { label: "Sous-traitants", enabled: false },
];

const PlaceholderTab = ({ label }) => (
  <Box
    sx={{
      height: 280,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 1,
      color: "#94a3b8",
    }}
  >
    <Typography sx={{ fontSize: "1.4rem" }}>🚧</Typography>
    <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: "#94a3b8" }}>
      Classement {label} — en cours de développement
    </Typography>
  </Box>
);

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];

const TresorerieDashboard = ({ selectedYear: propYear, periodStart, periodEnd }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [localYear, setLocalYear] = useState(propYear || currentYear);

  const year = propYear || localYear;
  const { monthlyData, classementFournisseurs, loading, error } = useTresorerieData(year, periodStart, periodEnd);

  return (
    <Box>
      {/* ── En-tête ───────────────────────────────────────────────────── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 1,
        }}
      >
        <Typography
          component="h3"
          sx={{
            fontSize: "0.95rem",
            fontWeight: 700,
            color: "#111827",
            letterSpacing: "-0.01em",
            lineHeight: 1.2,
          }}
        >
          Trésorerie mensuelle
        </Typography>

        {/* Sélecteur d'année (visible si l'année n'est pas imposée par le parent) */}
        {!propYear && (
          <Select
            size="small"
            value={localYear}
            onChange={(e) => setLocalYear(Number(e.target.value))}
            sx={{ fontSize: "0.8rem", height: 30 }}
          >
            {YEAR_OPTIONS.map((y) => (
              <MenuItem key={y} value={y}>
                {y}
              </MenuItem>
            ))}
          </Select>
        )}
      </Box>

      {/* ── Navigation par onglets ────────────────────────────────────── */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 1.5,
          minHeight: 34,
          "& .MuiTab-root": {
            minHeight: 34,
            fontSize: "0.78rem",
            fontWeight: 600,
            textTransform: "none",
            px: 1.5,
            py: 0.5,
          },
          "& .Mui-selected": { color: "#1B78BC" },
          "& .MuiTabs-indicator": { backgroundColor: "#1B78BC" },
        }}
      >
        {TABS.map((tab, idx) => (
          <Tab
            key={tab.label}
            label={
              tab.enabled ? (
                tab.label
              ) : (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  {tab.label}
                  <Box
                    component="span"
                    sx={{
                      fontSize: "0.60rem",
                      bgcolor: "#f1f5f9",
                      color: "#94a3b8",
                      borderRadius: "4px",
                      px: 0.5,
                      py: 0.1,
                      fontWeight: 600,
                    }}
                  >
                    bientôt
                  </Box>
                </Box>
              )
            }
            disabled={!tab.enabled}
          />
        ))}
      </Tabs>

      {/* ── Contenu de l'onglet actif ─────────────────────────────────── */}
      {activeTab === 0 && (
        <>
          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, py: 3 }}>
              <CircularProgress size={18} sx={{ color: "#1B78BC" }} />
              <Typography sx={{ color: "#94a3b8", fontSize: "0.85rem" }}>
                Chargement des données de trésorerie…
              </Typography>
            </Box>
          )}
          {error && !loading && (
            <Typography sx={{ color: "#ef4444", fontSize: "0.82rem", py: 2 }}>
              Erreur lors du chargement des données.
            </Typography>
          )}
          {!loading && !error && (
            <TresorerieBarChart data={monthlyData} height={320} />
          )}
        </>
      )}

      {activeTab === 1 && (
        <ClassementFournisseurs classement={classementFournisseurs} loading={loading} />
      )}
      {activeTab === 2 && <PlaceholderTab label="sociétés" />}
      {activeTab === 3 && <PlaceholderTab label="sous-traitants" />}
    </Box>
  );
};

export default TresorerieDashboard;
