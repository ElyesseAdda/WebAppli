import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  AppBar,
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
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
  Toolbar,
  Typography,
} from "@mui/material";
import axios from "axios";
import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { FaTimes } from "react-icons/fa";
import { COLORS } from "../constants/colors";
import "./../../static/css/laborCostSummary.css";

const LaborCostsSummary = ({ isOpen, onClose, agentId, chantierId }) => {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().format("YYYY-MM"));
  const [summary, setSummary] = useState([]); // Résumé planning réel
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("chantier"); // "chantier" ou "agent"

  // Fonction pour formater l'affichage des heures selon le type d'agent
  const formatHeures = (heures, agentTypePaiement) => {
    console.log(`DEBUG formatHeures: ${heures}h, type=${agentTypePaiement}`);
    if (agentTypePaiement === "journalier") {
      // Pour les agents journaliers, convertir les heures en jours (8h = 1j)
      const jours = heures / 8;
      const result = jours === 1 ? "1j" : `${jours}j`;
      console.log(`DEBUG formatHeures journalier: ${heures}h -> ${result}`);
      return result;
    } else {
      // Pour les agents horaires, afficher les heures normalement
      console.log(`DEBUG formatHeures horaire: ${heures}h -> ${heures}h`);
      return `${heures}h`;
    }
  };

  // Fonction pour obtenir le label selon le type d'agent
  const getLabel = (labelBase, agentTypePaiement) => {
    if (agentTypePaiement === "journalier") {
      return labelBase.replace("Heures", "Jours").replace("heures", "jours");
    }
    return labelBase;
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError("");
      let url = `/api/schedule/monthly_summary/?month=${selectedMonth}`;
      if (agentId) url += `&agent_id=${agentId}`;
      if (chantierId) url += `&chantier_id=${chantierId}`;
      axios
        .get(url)
        .then((res) => {
          console.log(
            "DEBUG LaborCostsSummary - Données reçues de l'API:",
            res.data
          );
          setSummary(res.data);
        })
        .catch((err) => {
          setError(
            err.response?.data?.error || "Erreur lors du chargement du résumé."
          );
        })
        .finally(() => setLoading(false));
    }
  }, [selectedMonth, isOpen, agentId, chantierId]);

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

  // Agrégation par agent côté frontend
  const aggregateByAgent = () => {
    const agentMap = {};
    summary.forEach((chantier) => {
      chantier.details.forEach((detail) => {
        if (!agentMap[detail.agent_id]) {
          agentMap[detail.agent_id] = {
            agent_nom: detail.agent_nom,
            agent_type_paiement: detail.type_paiement,
            heures_normal: 0,
            heures_samedi: 0,
            heures_dimanche: 0,
            heures_ferie: 0,
            heures_overtime: 0,
            montant_normal: 0,
            montant_samedi: 0,
            montant_dimanche: 0,
            montant_ferie: 0,
            montant_overtime: 0,
            jours_majoration: [],
            chantiers: new Set(),
          };
        }
        agentMap[detail.agent_id].heures_normal += detail.heures_normal;
        agentMap[detail.agent_id].heures_samedi += detail.heures_samedi;
        agentMap[detail.agent_id].heures_dimanche += detail.heures_dimanche;
        agentMap[detail.agent_id].heures_ferie += detail.heures_ferie;
        agentMap[detail.agent_id].heures_overtime += detail.heures_overtime || 0;
        agentMap[detail.agent_id].montant_normal += detail.montant_normal;
        agentMap[detail.agent_id].montant_samedi += detail.montant_samedi;
        agentMap[detail.agent_id].montant_dimanche += detail.montant_dimanche;
        agentMap[detail.agent_id].montant_ferie += detail.montant_ferie;
        agentMap[detail.agent_id].montant_overtime += detail.montant_overtime || 0;
        // Ajouter les jours majoration en préservant les overtime_hours
        (detail.jours_majoration || []).forEach(jour => {
          agentMap[detail.agent_id].jours_majoration.push({ ...jour });
        });
        agentMap[detail.agent_id].chantiers.add(chantier.chantier_nom);
      });
    });
    // Convertit les sets en array
    Object.values(agentMap).forEach(
      (a) => (a.chantiers = Array.from(a.chantiers))
    );
    return agentMap;
  };

  // Regroupe les jours majorés par date/type/taux et somme les heures
  const groupMajorations = (jours_majoration) => {
    const grouped = {};
    jours_majoration.forEach((j) => {
      const key = `${j.date}_${j.type}_${j.taux}`;
      if (!grouped[key]) {
        grouped[key] = { ...j };
      } else {
        grouped[key].hours += j.hours;
        // Pour les heures supplémentaires, sommer aussi overtime_hours
        if (j.type === 'overtime' && j.overtime_hours) {
          grouped[key].overtime_hours = (grouped[key].overtime_hours || 0) + j.overtime_hours;
        }
      }
    });
    // Trie par date croissante
    return Object.values(grouped).sort((a, b) =>
      dayjs(a.date).diff(dayjs(b.date))
    );
  };

  return (
    <Dialog open={isOpen} onClose={handleClose} maxWidth="md" fullWidth>
      <AppBar position="static" color="default" sx={{ mb: 2 }}>
        <Toolbar>
          <Tabs
            value={mode}
            onChange={(_, v) => setMode(v)}
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label="Par chantier" value="chantier" />
            <Tab label="Par agent" value="agent" />
          </Tabs>
        </Toolbar>
      </AppBar>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>
          {mode === "chantier"
            ? "Résumé des Heures et Coûts par chantier"
            : "Résumé des Heures et Coûts par agent"}
        </span>
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
            <div style={{ color: COLORS.error }}>{error}</div>
          ) : mode === "chantier" ? (
            summary.length === 0 ? (
              <div>Aucune donnée pour ce mois.</div>
            ) : (
              summary.map((chantier) => (
                <Accordion key={chantier.chantier_id}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box width="100%">
                      <Typography
                        variant="h6"
                        style={{
                          color: COLORS.primary,
                          fontWeight: 700,
                        }}
                      >
                        {chantier.chantier_nom}
                      </Typography>
                      <Box display="flex" gap={3} mt={1} alignItems="center">
                        <Box>
                          <Typography fontWeight="bold">
                            Heures normales
                          </Typography>
                          <Typography>
                            {chantier.total_heures_normal}h
                          </Typography>
                          <Typography color="textSecondary">
                            Montant : {chantier.total_montant_normal.toFixed(2)}{" "}
                            €
                          </Typography>
                        </Box>
                        <Box>
                          <Typography fontWeight="bold">
                            Samedi (125%)
                          </Typography>
                          <Typography>
                            {chantier.total_heures_samedi}h
                          </Typography>
                          <Typography color="textSecondary">
                            Montant : {chantier.total_montant_samedi.toFixed(2)}{" "}
                            €
                          </Typography>
                        </Box>
                        <Box>
                          <Typography fontWeight="bold">
                            Dimanche (150%)
                          </Typography>
                          <Typography>
                            {chantier.total_heures_dimanche}h
                          </Typography>
                          <Typography color="textSecondary">
                            Montant :{" "}
                            {chantier.total_montant_dimanche.toFixed(2)} €
                          </Typography>
                        </Box>
                        <Box>
                          <Typography fontWeight="bold">
                            Férié (150%)
                          </Typography>
                          <Typography>
                            {chantier.total_heures_ferie}h
                          </Typography>
                          <Typography color="textSecondary">
                            Montant : {chantier.total_montant_ferie.toFixed(2)}{" "}
                            €
                          </Typography>
                        </Box>
                        <Box>
                          <Typography fontWeight="bold">
                            Heures Sup (125%)
                          </Typography>
                          <Typography>
                            {chantier.total_heures_overtime || 0}h
                          </Typography>
                          <Typography color="textSecondary">
                            Montant : {(chantier.total_montant_overtime || 0).toFixed(2)}{" "}
                            €
                          </Typography>
                        </Box>
                        <Box>
                          <Typography
                            fontWeight="bold"
                            style={{ color: COLORS.primary }}
                          >
                            Total
                          </Typography>
                          <Typography
                            style={{
                              color: COLORS.primary,
                              fontWeight: 700,
                            }}
                          >
                            {chantier.total_heures_normal +
                              chantier.total_heures_samedi +
                              chantier.total_heures_dimanche +
                              chantier.total_heures_ferie +
                              (chantier.total_heures_overtime || 0)}
                            h
                          </Typography>
                          <Typography
                            color="textSecondary"
                            style={{
                              color: COLORS.primary,
                              fontWeight: 700,
                            }}
                          >
                            Montant :
                            {(
                              chantier.total_montant_normal +
                              chantier.total_montant_samedi +
                              chantier.total_montant_dimanche +
                              chantier.total_montant_ferie +
                              (chantier.total_montant_overtime || 0)
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
                      Détail par agent
                    </Typography>
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Agent</TableCell>
                          <TableCell>Normal</TableCell>
                          <TableCell>Samedi</TableCell>
                          <TableCell>Dimanche</TableCell>
                          <TableCell>Férié</TableCell>
                          <TableCell>Heures Sup</TableCell>
                          <TableCell>Total</TableCell>
                          <TableCell>Montant</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {chantier.details.map((agent, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{agent.agent_nom}</TableCell>
                            <TableCell>
                              {formatHeures(
                                agent.heures_normal,
                                agent.agent_type_paiement
                              )}
                            </TableCell>
                            <TableCell>
                              {formatHeures(
                                agent.heures_samedi,
                                agent.agent_type_paiement
                              )}
                            </TableCell>
                            <TableCell>
                              {formatHeures(
                                agent.heures_dimanche,
                                agent.agent_type_paiement
                              )}
                            </TableCell>
                            <TableCell>
                              {formatHeures(
                                agent.heures_ferie,
                                agent.agent_type_paiement
                              )}
                            </TableCell>
                            <TableCell>
                              {formatHeures(
                                agent.heures_overtime || 0,
                                agent.agent_type_paiement
                              )}
                            </TableCell>
                            <TableCell>
                              {formatHeures(
                                agent.heures_normal +
                                  agent.heures_samedi +
                                  agent.heures_dimanche +
                                  agent.heures_ferie +
                                  (agent.heures_overtime || 0),
                                agent.agent_type_paiement
                              )}
                            </TableCell>
                            <TableCell>
                              {(
                                agent.montant_normal +
                                agent.montant_samedi +
                                agent.montant_dimanche +
                                agent.montant_ferie +
                                (agent.montant_overtime || 0)
                              ).toFixed(2)}{" "}
                              €
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Divider sx={{ my: 2 }} />
                    <Typography fontWeight="bold" mb={1}>
                      Jours majorés
                    </Typography>
                    {groupMajorations(chantier.jours_majoration).length === 0 ? (
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
                          {groupMajorations(chantier.jours_majoration).map((j, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                {dayjs(j.date).format("DD/MM/YY")}
                              </TableCell>
                              <TableCell>{j.type === 'overtime' ? 'heures supp' : j.type}</TableCell>
                              <TableCell>{j.type === 'overtime' ? (j.overtime_hours || 0) : j.hours}</TableCell>
                              <TableCell>{j.taux}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </AccordionDetails>
                </Accordion>
              ))
            )
          ) : // Mode agent
          Object.keys(aggregateByAgent()).length === 0 ? (
            <div>Aucune donnée pour ce mois.</div>
          ) : (
            Object.entries(aggregateByAgent()).map(([agentId, agent]) => (
              <Accordion key={agentId}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box width="100%">
                    <Typography
                      variant="h6"
                      style={{
                        color: COLORS.primary,
                        fontWeight: 700,
                      }}
                    >
                      {agent.agent_nom}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Chantiers : {agent.chantiers.join(", ")}
                    </Typography>
                    <Box display="flex" gap={3} mt={1} alignItems="center">
                      <Box>
                        <Typography fontWeight="bold">
                          {getLabel(
                            "Heures normales",
                            agent.agent_type_paiement
                          )}
                        </Typography>
                        <Typography>
                          {formatHeures(
                            agent.heures_normal,
                            agent.agent_type_paiement
                          )}
                        </Typography>
                        <Typography color="textSecondary">
                          Montant : {agent.montant_normal.toFixed(2)} €
                        </Typography>
                      </Box>
                      <Box>
                        <Typography fontWeight="bold">Samedi (125%)</Typography>
                        <Typography>
                          {formatHeures(
                            agent.heures_samedi,
                            agent.agent_type_paiement
                          )}
                        </Typography>
                        <Typography color="textSecondary">
                          Montant : {agent.montant_samedi.toFixed(2)} €
                        </Typography>
                      </Box>
                      <Box>
                        <Typography fontWeight="bold">
                          Dimanche (150%)
                        </Typography>
                        <Typography>
                          {formatHeures(
                            agent.heures_dimanche,
                            agent.agent_type_paiement
                          )}
                        </Typography>
                        <Typography color="textSecondary">
                          Montant : {agent.montant_dimanche.toFixed(2)} €
                        </Typography>
                      </Box>
                      <Box>
                        <Typography fontWeight="bold">Férié (150%)</Typography>
                        <Typography>
                          {formatHeures(
                            agent.heures_ferie,
                            agent.agent_type_paiement
                          )}
                        </Typography>
                        <Typography color="textSecondary">
                          Montant : {agent.montant_ferie.toFixed(2)} €
                        </Typography>
                      </Box>
                      <Box>
                        <Typography fontWeight="bold">Heures Sup (125%)</Typography>
                        <Typography>
                          {formatHeures(
                            agent.heures_overtime || 0,
                            agent.agent_type_paiement
                          )}
                        </Typography>
                        <Typography color="textSecondary">
                          Montant : {(agent.montant_overtime || 0).toFixed(2)} €
                        </Typography>
                      </Box>
                      <Box>
                        <Typography
                          fontWeight="bold"
                          style={{ color: COLORS.primary }}
                        >
                          Total
                        </Typography>
                        <Typography
                          style={{
                            color: COLORS.primary,
                            fontWeight: 700,
                          }}
                        >
                          {formatHeures(
                            agent.heures_normal +
                              agent.heures_samedi +
                              agent.heures_dimanche +
                              agent.heures_ferie +
                              (agent.heures_overtime || 0),
                            agent.agent_type_paiement
                          )}
                        </Typography>
                        <Typography
                          color="textSecondary"
                          style={{
                            color: COLORS.primary,
                            fontWeight: 700,
                          }}
                        >
                          Montant :
                          {(
                            agent.montant_normal +
                            agent.montant_samedi +
                            agent.montant_dimanche +
                            agent.montant_ferie +
                            (agent.montant_overtime || 0)
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
                        {groupMajorations(agent.jours_majoration).map(
                          (j, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                {dayjs(j.date).format("DD/MM/YY")}
                              </TableCell>
                              <TableCell>{j.type === 'overtime' ? 'heures supp' : j.type}</TableCell>
                              <TableCell>{j.type === 'overtime' ? (j.overtime_hours || 0) : j.hours}</TableCell>
                              <TableCell>{j.taux}</TableCell>
                            </TableRow>
                          )
                        )}
                      </TableBody>
                    </Table>
                  )}
                </AccordionDetails>
              </Accordion>
            ))
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default LaborCostsSummary;
