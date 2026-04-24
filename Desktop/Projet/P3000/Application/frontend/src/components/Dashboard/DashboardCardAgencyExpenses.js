import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import axios from "axios";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  Popover,
  Tooltip,
  Typography,
} from "@mui/material";
import React, { useMemo, useState } from "react";
import DashboardMetricCardShell from "./DashboardMetricCardShell";
import { formatDashboardCurrency } from "./dashboardCurrency";
import { useDashboardFilters } from "./DashboardFiltersContext";

const persistDashboardDepensesAgence = async (useDefault, ids) => {
  try {
    await axios.put("/api/dashboard/settings/", {
      depenses_agence_use_default: useDefault,
      depenses_agence_included_agence_ids: ids,
    });
  } catch (err) {
    console.error("Sauvegarde parametres dashboard:", err);
  }
};

const defaultIncludedIdsFromBreakdown = (breakdown) => {
  if (!breakdown || !breakdown.length) return [];
  const withId = breakdown.filter((r) => r.agence_id != null);
  if (!withId.length) return [];
  const minId = Math.min(...withId.map((r) => r.agence_id));
  return [minId];
};

const DashboardCardAgencyExpenses = ({ breakdown = [], loading = false, totalCA = 0 }) => {
  const {
    depensesAgenceIncludedAgenceIds,
    setDepensesAgenceIncludedAgenceIds,
  } = useDashboardFilters();

  const [anchorEl, setAnchorEl] = useState(null);
  const popoverOpen = Boolean(anchorEl);

  const defaultIds = useMemo(
    () => defaultIncludedIdsFromBreakdown(breakdown),
    [breakdown]
  );

  const effectiveIncludedIds = useMemo(() => {
    if (depensesAgenceIncludedAgenceIds === null) {
      return defaultIds;
    }
    return depensesAgenceIncludedAgenceIds;
  }, [depensesAgenceIncludedAgenceIds, defaultIds]);

  const montantSelection = useMemo(() => {
    if (!breakdown.length) return 0;
    return breakdown
      .filter((row) => effectiveIncludedIds.includes(row.agence_id))
      .reduce((sum, row) => sum + Number(row.total_ht || 0), 0);
  }, [breakdown, effectiveIncludedIds]);

  const selectionExplicitementVide =
    depensesAgenceIncludedAgenceIds !== null && depensesAgenceIncludedAgenceIds.length === 0;

  const needsManualPick =
    !loading &&
    defaultIds.length === 0 &&
    breakdown.some((r) => Number(r.total_ht) > 0);

  const toggleId = (agenceId) => {
    const base =
      depensesAgenceIncludedAgenceIds === null ? [...defaultIds] : [...depensesAgenceIncludedAgenceIds];
    const idx = base.findIndex((id) => id === agenceId);
    if (idx >= 0) {
      base.splice(idx, 1);
    } else {
      base.push(agenceId);
    }
    setDepensesAgenceIncludedAgenceIds(base);
    void persistDashboardDepensesAgence(false, base);
  };

  const toolbarPrefix = (
    <>
      <Tooltip title="Agences incluses dans le montant">
        <IconButton
          size="small"
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            p: 0.35,
            color: "#9a3412",
            opacity: 0.75,
            "&:hover": { opacity: 1, bgcolor: "rgba(217, 119, 6, 0.12)" },
          }}
          aria-label="Choisir les agences pour le décompte"
        >
          <TuneOutlinedIcon sx={{ fontSize: "1.05rem" }} />
        </IconButton>
      </Tooltip>
      <Popover
        open={popoverOpen}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { p: 1.5, maxWidth: 280, borderRadius: 2 } } }}
      >
        <Typography variant="caption" sx={{ fontWeight: 800, color: "#64748b", display: "block", mb: 1 }}>
          Inclure dans le montant de la carte
        </Typography>
        {!breakdown.length ? (
          <Typography variant="body2" sx={{ fontSize: "0.8rem", color: "#94a3b8" }}>
            Aucune ligne sur cette période.
          </Typography>
        ) : null}
        <FormGroup sx={{ gap: 0.25 }}>
          {breakdown.map((row) => {
            const checked = effectiveIncludedIds.includes(row.agence_id);
            return (
              <FormControlLabel
                key={row.agence_id === null ? "nr" : row.agence_id}
                control={
                  <Checkbox
                    size="small"
                    checked={checked}
                    disabled={loading}
                    onChange={() => toggleId(row.agence_id)}
                  />
                }
                label={
                  <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, width: "100%", pr: 0.5 }}>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem" }}>
                      {row.nom}
                    </Typography>
                    <Typography variant="body2" sx={{ fontSize: "0.8rem", fontWeight: 700, color: "#92400e" }}>
                      {formatDashboardCurrency(row.total_ht)}
                    </Typography>
                  </Box>
                }
                sx={{ m: 0, alignItems: "flex-start" }}
              />
            );
          })}
        </FormGroup>
        <Divider sx={{ my: 1 }} />
        <Button
          size="small"
          variant="text"
          onClick={() => {
            setDepensesAgenceIncludedAgenceIds(null);
            void persistDashboardDepensesAgence(true, []);
          }}
          sx={{ fontSize: "0.7rem", textTransform: "none", color: "#64748b" }}
        >
          Réinitialiser (1re agence par défaut)
        </Button>
      </Popover>
    </>
  );

  const hidePercent =
    loading ||
    !totalCA ||
    selectionExplicitementVide ||
    needsManualPick;

  return (
    <DashboardMetricCardShell
      title="Dépenses d'agence"
      value={loading ? "Chargement..." : formatDashboardCurrency(montantSelection)}
      valueColor={loading ? undefined : Number(montantSelection || 0) >= 0 ? "rgba(27, 120, 188, 1)" : "#dc2626"}
      subtitle="Période active"
      accent="#d97706"
      variant={7}
      valueFirstCentered
      percentValue={hidePercent ? null : montantSelection}
      percentBase={hidePercent ? null : totalCA}
      toolbarPrefix={loading ? null : toolbarPrefix}
    />
  );
};

export default DashboardCardAgencyExpenses;
