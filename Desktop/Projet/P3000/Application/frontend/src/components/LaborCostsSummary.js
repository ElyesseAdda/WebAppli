import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import axios from "axios";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import "./../../static/css/laborCostSummary.css";

const LaborCostsSummary = ({ isOpen, onClose }) => {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [monthlySummary, setMonthlySummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
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
  }, [selectedMonth, isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
  };

  const getSelectableMonths = () => {
    const months = [];
    let d = dayjs().subtract(12, "month");
    for (let i = 0; i < 25; i++) {
      months.push(d.format("YYYY-MM"));
      d = d.add(1, "month");
    }
    return months;
  };

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
        <Box>{renderMonthlySummary()}</Box>
      </DialogContent>
    </Dialog>
  );
};

export default LaborCostsSummary;
