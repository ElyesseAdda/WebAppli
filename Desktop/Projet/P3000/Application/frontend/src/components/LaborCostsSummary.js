import {
  AppBar,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tabs,
  Typography,
} from "@mui/material";
import axios from "axios";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import "./../../static/css/laborCostSummary.css";

const LaborCostsSummary = ({
  schedule,
  selectedAgentId,
  isOpen,
  onClose,
  tauxHoraire,
  onCostsCalculated,
}) => {
  const [tab, setTab] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Vue agent/semaine (inchangée)
  useEffect(() => {
    if (tab === 0 && schedule && selectedAgentId) {
      const hoursPerChantier = {};
      Object.entries(schedule[selectedAgentId] || {}).forEach(
        ([hour, dayData]) => {
          Object.entries(dayData).forEach(([day, chantierName]) => {
            if (chantierName) {
              hoursPerChantier[chantierName] =
                (hoursPerChantier[chantierName] || 0) + 1;
            }
          });
        }
      );
      const laborCosts = Object.entries(hoursPerChantier).map(
        ([chantierName, hours]) => ({
          chantier_name: chantierName,
          hours: hours,
        })
      );
      if (laborCosts.length > 0) {
        onCostsCalculated(laborCosts);
      }
    }
  }, [tab, schedule, selectedAgentId, onCostsCalculated]);

  // Vue résumé mensuel : fetch API
  useEffect(() => {
    if (tab === 1 && isOpen) {
      setLoading(true);
      setError("");
      axios
        .get(`/api/labor_costs/monthly_summary/?month=${selectedMonth}`)
        .then((res) => {
          setMonthlySummary(res.data);
        })
        .catch((err) => {
          setError(
            err.response?.data?.error || "Erreur lors du chargement du résumé."
          );
        })
        .finally(() => setLoading(false));
    }
  }, [tab, selectedMonth, isOpen]);

  if (!isOpen) return null;

  // Gestionnaire de fermeture (overlay ou bouton)
  const handleClose = () => {
    onClose();
    setTab(0); // reset tab à l'ouverture suivante
  };

  // Générer les 12 derniers mois + 12 mois futurs pour le sélecteur
  const getSelectableMonths = () => {
    const months = [];
    let d = dayjs().subtract(12, "month");
    for (let i = 0; i < 25; i++) {
      // 12 avant, le courant, 12 après
      months.push(d.format("YYYY-MM"));
      d = d.add(1, "month");
    }
    return months;
  };

  // Vue agent/semaine (ancienne)
  const renderAgentWeek = () => {
    if (!schedule || !selectedAgentId) {
      return <div>Aucune donnée de planning disponible.</div>;
    }
    const hoursPerChantier = {};
    Object.entries(schedule[selectedAgentId] || {}).forEach(
      ([hour, dayData]) => {
        Object.entries(dayData).forEach(([day, chantierName]) => {
          if (chantierName) {
            hoursPerChantier[chantierName] =
              (hoursPerChantier[chantierName] || 0) + 1;
          }
        });
      }
    );
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Chantier</TableCell>
            <TableCell>Heures Totales</TableCell>
            <TableCell>Coût Total</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {Object.entries(hoursPerChantier).map(([chantierName, hours]) => (
            <TableRow key={chantierName}>
              <TableCell>{chantierName}</TableCell>
              <TableCell>{hours}</TableCell>
              <TableCell>{(hours * tauxHoraire).toFixed(2)} €</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  // Vue résumé mensuel par chantier
  const renderMonthlySummary = () => {
    if (loading) return <div>Chargement...</div>;
    if (error) return <div style={{ color: "red" }}>{error}</div>;
    if (!monthlySummary || monthlySummary.length === 0)
      return <div>Aucune donnée pour ce mois.</div>;
    return (
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>Chantier</TableCell>
            <TableCell>Heures totales</TableCell>
            <TableCell>Montant total (€)</TableCell>
            <TableCell>Détail par agent</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {monthlySummary.map((chantier) => {
            // Regrouper les détails par agent_id
            const agentMap = {};
            chantier.details.forEach((d) => {
              if (!agentMap[d.agent_id]) {
                agentMap[d.agent_id] = {
                  agent_nom: d.agent_nom,
                  heures: 0,
                  montant: 0,
                };
              }
              agentMap[d.agent_id].heures += d.heures;
              agentMap[d.agent_id].montant += d.montant;
            });
            const regroupedDetails = Object.values(agentMap);
            return (
              <TableRow key={chantier.chantier_id}>
                <TableCell>{chantier.chantier_nom}</TableCell>
                <TableCell>{chantier.total_heures}</TableCell>
                <TableCell>{chantier.total_montant.toFixed(2)} €</TableCell>
                <TableCell>
                  {regroupedDetails.map((d, idx) => (
                    <div key={idx}>
                      {d.agent_nom} : {d.heures}h / {d.montant.toFixed(2)} €
                    </div>
                  ))}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>Résumé des Heures et Coûts</span>
        <IconButton onClick={handleClose}>
          <FaTimes />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <AppBar position="static" color="default" sx={{ mb: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)}>
            <Tab label="Par agent (semaine)" />
            <Tab label="Résumé du mois (chantier)" />
          </Tabs>
        </AppBar>
        {tab === 1 && (
          <Box mb={2} display="flex" alignItems="center" gap={2}>
            <Typography variant="body1">Mois :</Typography>
            <Select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              size="small"
            >
              {getSelectableMonths().map((m) => (
                <MenuItem key={m} value={m}>
                  {dayjs(m + "-01").format("MMMM YYYY")}
                </MenuItem>
              ))}
            </Select>
          </Box>
        )}
        <Box>{tab === 0 ? renderAgentWeek() : renderMonthlySummary()}</Box>
      </DialogContent>
    </Dialog>
  );
};

export default LaborCostsSummary;
