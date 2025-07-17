import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
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
  const [eventsByAgent, setEventsByAgent] = useState({});

  // Récupère le résumé mensuel et les événements pour chaque agent
  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError("");
      axios
        .get(`/api/labor_costs/monthly_summary/?month=${selectedMonth}`)
        .then(async (res) => {
          setMonthlySummary(res.data);
          // Pour chaque agent, récupérer les événements du mois
          const allAgents = new Set();
          res.data.forEach((chantier) => {
            chantier.details.forEach((detail) => {
              allAgents.add(detail.agent_id);
            });
          });
          const eventsObj = {};
          const monthStart = dayjs(selectedMonth + "-01")
            .startOf("month")
            .format("YYYY-MM-DD");
          const monthEnd = dayjs(selectedMonth + "-01")
            .endOf("month")
            .format("YYYY-MM-DD");
          await Promise.all(
            Array.from(allAgents).map(async (agentId) => {
              try {
                const resp = await axios.get(`/api/events/`, {
                  params: {
                    agent_id: agentId,
                    start_date: monthStart,
                    end_date: monthEnd,
                  },
                });
                eventsObj[agentId] = resp.data;
              } catch (e) {
                eventsObj[agentId] = [];
              }
            })
          );
          setEventsByAgent(eventsObj);
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

  // Agrège les infos par agent sur tous les chantiers
  const aggregateByAgent = () => {
    const agentMap = {};
    monthlySummary.forEach((chantier) => {
      chantier.details.forEach((detail) => {
        if (!agentMap[detail.agent_id]) {
          agentMap[detail.agent_id] = {
            agent_nom: detail.agent_nom,
            heures_normal: 0,
            heures_samedi: 0,
            heures_dimanche: 0,
            heures_ferie: 0,
            montant_normal: 0,
            montant_samedi: 0,
            montant_dimanche: 0,
            montant_ferie: 0,
            jours_majoration: [],
            chantiers: new Set(),
          };
        }
        agentMap[detail.agent_id].heures_normal += detail.heures_normal;
        agentMap[detail.agent_id].heures_samedi += detail.heures_samedi;
        agentMap[detail.agent_id].heures_dimanche += detail.heures_dimanche;
        agentMap[detail.agent_id].heures_ferie += detail.heures_ferie;
        agentMap[detail.agent_id].montant_normal += detail.montant_normal;
        agentMap[detail.agent_id].montant_samedi += detail.montant_samedi;
        agentMap[detail.agent_id].montant_dimanche += detail.montant_dimanche;
        agentMap[detail.agent_id].montant_ferie += detail.montant_ferie;
        agentMap[detail.agent_id].jours_majoration.push(
          ...(detail.jours_majoration || [])
        );
        agentMap[detail.agent_id].chantiers.add(chantier.chantier_nom);
      });
    });
    // Convertit les sets en array
    Object.values(agentMap).forEach(
      (a) => (a.chantiers = Array.from(a.chantiers))
    );
    return agentMap;
  };

  const agentMap = aggregateByAgent();

  // Regroupe les jours majorés par date/type/taux et somme les heures
  const groupMajorations = (jours_majoration) => {
    const grouped = {};
    jours_majoration.forEach((j) => {
      const key = `${j.date}_${j.type}_${j.taux}`;
      if (!grouped[key]) {
        grouped[key] = { ...j };
      } else {
        grouped[key].hours += j.hours;
      }
    });
    // Trie par date croissante
    return Object.values(grouped).sort((a, b) =>
      dayjs(a.date).diff(dayjs(b.date))
    );
  };

  // Fonction utilitaire pour regrouper les événements consécutifs de même type/sous-type
  const groupEventsByConsecutiveDays = (events) => {
    if (!events || events.length === 0) return [];
    // Trier par date croissante
    const sorted = [...events].sort((a, b) =>
      dayjs(a.start_date).diff(dayjs(b.start_date))
    );
    const grouped = [];
    let current = null;
    for (let i = 0; i < sorted.length; i++) {
      const ev = sorted[i];
      if (
        current &&
        ev.event_type === current.event_type &&
        (ev.subtype || "") === (current.subtype || "") &&
        dayjs(ev.start_date).diff(dayjs(current.end_date), "day") === 1
      ) {
        // Étendre la période
        current.end_date = ev.end_date;
      } else {
        // Nouveau groupe
        if (current) grouped.push(current);
        current = { ...ev };
      }
    }
    if (current) grouped.push(current);
    // Trie par date de début croissante
    return grouped.sort((a, b) =>
      dayjs(a.start_date).diff(dayjs(b.start_date))
    );
  };

  const renderAgentSummary = (agentId, agent) => (
    <Accordion key={agentId}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Box width="100%">
          <Typography
            variant="h6"
            style={{ color: "rgba(27, 120, 188, 1)", fontWeight: 700 }}
          >
            {agent.agent_nom}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Chantiers : {agent.chantiers.join(", ")}
          </Typography>
          <Box display="flex" gap={3} mt={1} alignItems="center">
            <Box>
              <Typography fontWeight="bold">Heures normales</Typography>
              <Typography>{agent.heures_normal}h</Typography>
              <Typography color="textSecondary">
                Montant : {agent.montant_normal.toFixed(2)} €
              </Typography>
            </Box>
            <Box>
              <Typography fontWeight="bold">Majorées(125%)</Typography>
              <Typography>{agent.heures_samedi}h</Typography>
              <Typography color="textSecondary">
                Montant : {agent.montant_samedi.toFixed(2)} €
              </Typography>
            </Box>
            <Box>
              <Typography fontWeight="bold">Majorées(150%)</Typography>
              <Typography>
                {agent.heures_dimanche + agent.heures_ferie}h
              </Typography>
              <Typography color="textSecondary">
                Montant :{" "}
                {(agent.montant_dimanche + agent.montant_ferie).toFixed(2)} €
              </Typography>
            </Box>
            <Box>
              <Typography
                fontWeight="bold"
                style={{ color: "rgba(27, 120, 188, 1)" }}
              >
                Total
              </Typography>
              <Typography
                style={{ color: "rgba(27, 120, 188, 1)", fontWeight: 700 }}
              >
                {agent.heures_normal +
                  agent.heures_samedi +
                  agent.heures_dimanche +
                  agent.heures_ferie}
                h
              </Typography>
              <Typography
                color="textSecondary"
                style={{ color: "rgba(27, 120, 188, 1)", fontWeight: 700 }}
              >
                Montant :{" "}
                {(
                  agent.montant_normal +
                  agent.montant_samedi +
                  agent.montant_dimanche +
                  agent.montant_ferie
                ).toFixed(2)}{" "}
                €
              </Typography>
            </Box>
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Divider sx={{ mb: 2 }} />
        <Typography fontWeight="bold" mb={1}>
          Jours majorés
        </Typography>
        {groupMajorations(agent.jours_majoration).length === 0 ? (
          <Typography>Aucun jour majoré ce mois.</Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Heures</TableCell>
                <TableCell>Taux</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupMajorations(agent.jours_majoration).map((j, idx) => (
                <TableRow key={idx}>
                  <TableCell>{dayjs(j.date).format("DD/MM/YY")}</TableCell>
                  <TableCell>{j.type}</TableCell>
                  <TableCell>{j.hours}</TableCell>
                  <TableCell>{j.taux}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        <Divider sx={{ my: 2 }} />
        <Typography fontWeight="bold" mb={1}>
          Événements du mois
        </Typography>
        {eventsByAgent[agentId] && eventsByAgent[agentId].length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Sous-type</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groupEventsByConsecutiveDays(eventsByAgent[agentId]).map(
                (ev, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      {ev.start_date === ev.end_date
                        ? dayjs(ev.start_date).format("DD/MM/YY")
                        : `${dayjs(ev.start_date).format("DD/MM/YY")} - ${dayjs(
                            ev.end_date
                          ).format("DD/MM/YY")}`}
                    </TableCell>
                    <TableCell>{ev.event_type}</TableCell>
                    <TableCell>{ev.subtype || "-"}</TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        ) : (
          <Typography>Aucun événement ce mois.</Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );

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
        <Box>
          {loading ? (
            <div>Chargement...</div>
          ) : error ? (
            <div style={{ color: "red" }}>{error}</div>
          ) : Object.keys(agentMap).length === 0 ? (
            <div>Aucune donnée pour ce mois.</div>
          ) : (
            Object.entries(agentMap).map(([agentId, agent]) =>
              renderAgentSummary(agentId, agent)
            )
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default LaborCostsSummary;
