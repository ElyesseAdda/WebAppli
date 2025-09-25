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
import "./../../static/css/laborCostSummary.css";

const LaborCostsSummary = ({ isOpen, onClose, agentId, chantierId }) => {
  const [selectedMonth, setSelectedMonth] = useState(dayjs().month() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState(dayjs().year());
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

  // Fonction pour vérifier si un chantier a des agents journaliers
  const hasJournalierAgents = (chantier) => {
    return chantier.details.some(agent => agent.agent_type_paiement === "journalier");
  };

  // Fonction pour formater les heures dans la section chantier
  const formatChantierHeures = (heures, chantier) => {
    if (hasJournalierAgents(chantier)) {
      const jours = heures / 7;
      return jours === 1 ? "1j" : `${jours.toFixed(1)}j`;
    }
    return `${heures}h`;
  };

  // Fonction pour formater les heures d'un agent spécifique dans la section chantier
  const formatAgentHeures = (heures, agentTypePaiement) => {
    if (agentTypePaiement === "journalier") {
      const jours = heures / 7;
      return jours === 1 ? "1j" : `${jours.toFixed(1)}j`;
    }
    return `${heures}h`;
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError("");
      const monthStr = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}`;
      let url = `/api/schedule/monthly_summary/?month=${monthStr}`;
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
  }, [selectedMonth, selectedYear, isOpen, agentId, chantierId]);

  if (!isOpen) return null;

  const handleClose = () => {
    onClose();
  };

  const getSelectableMonths = () => {
    return [
      { value: 1, label: "Janvier" },
      { value: 2, label: "Février" },
      { value: 3, label: "Mars" },
      { value: 4, label: "Avril" },
      { value: 5, label: "Mai" },
      { value: 6, label: "Juin" },
      { value: 7, label: "Juillet" },
      { value: 8, label: "Août" },
      { value: 9, label: "Septembre" },
      { value: 10, label: "Octobre" },
      { value: 11, label: "Novembre" },
      { value: 12, label: "Décembre" }
    ];
  };

  const getSelectableYears = () => {
    const years = [];
    const currentYear = dayjs().year();
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
      years.push(i);
    }
    return years;
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
            sx={{ minWidth: 120 }}
          >
            {getSelectableMonths().map((month) => (
              <MenuItem key={month.value} value={month.value}>
                {month.label}
              </MenuItem>
            ))}
          </Select>
          <Typography variant="body1">Année :</Typography>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            size="small"
            sx={{ minWidth: 100 }}
          >
            {getSelectableYears().map((year) => (
              <MenuItem key={year} value={year}>
                {year}
              </MenuItem>
            ))}
          </Select>
        </Box>
        <Box>
          {loading ? (
            <div>Chargement...</div>
          ) : error ? (
            <div style={{ color: "red" }}>{error}</div>
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
                          color: "rgba(27, 120, 188, 1)",
                          fontWeight: 700,
                        }}
                      >
                        {chantier.chantier_nom}
                      </Typography>
                      <Box display="flex" gap={3} mt={1} alignItems="center">
                        <Box>
                          <Typography fontWeight="bold">
                            {hasJournalierAgents(chantier) ? "Jours normaux" : "Heures normales"}
                          </Typography>
                          <Typography>
                            {formatChantierHeures(chantier.total_heures_normal, chantier)}
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
                            {formatChantierHeures(chantier.total_heures_samedi, chantier)}
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
                            {formatChantierHeures(chantier.total_heures_dimanche, chantier)}
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
                            {formatChantierHeures(chantier.total_heures_ferie, chantier)}
                          </Typography>
                          <Typography color="textSecondary">
                            Montant : {chantier.total_montant_ferie.toFixed(2)}{" "}
                            €
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
                            style={{
                              color: "rgba(27, 120, 188, 1)",
                              fontWeight: 700,
                            }}
                          >
                            {formatChantierHeures(
                              chantier.total_heures_normal +
                                chantier.total_heures_samedi +
                                chantier.total_heures_dimanche +
                                chantier.total_heures_ferie,
                              chantier
                            )}
                          </Typography>
                          <Typography
                            color="textSecondary"
                            style={{
                              color: "rgba(27, 120, 188, 1)",
                              fontWeight: 700,
                            }}
                          >
                            Montant :
                            {(
                              chantier.total_montant_normal +
                              chantier.total_montant_samedi +
                              chantier.total_montant_dimanche +
                              chantier.total_montant_ferie
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
                          <TableCell>Total</TableCell>
                          <TableCell>Montant</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {chantier.details.map((agent, idx) => (
                          <TableRow key={idx}>
                            <TableCell>{agent.agent_nom}</TableCell>
                            <TableCell>
                              {formatAgentHeures(
                                agent.heures_normal,
                                agent.agent_type_paiement
                              )}
                            </TableCell>
                            <TableCell>
                              {formatAgentHeures(
                                agent.heures_samedi,
                                agent.agent_type_paiement
                              )}
                            </TableCell>
                            <TableCell>
                              {formatAgentHeures(
                                agent.heures_dimanche,
                                agent.agent_type_paiement
                              )}
                            </TableCell>
                            <TableCell>
                              {formatAgentHeures(
                                agent.heures_ferie,
                                agent.agent_type_paiement
                              )}
                            </TableCell>
                            <TableCell>
                              {formatAgentHeures(
                                agent.heures_normal +
                                  agent.heures_samedi +
                                  agent.heures_dimanche +
                                  agent.heures_ferie,
                                agent.agent_type_paiement
                              )}
                            </TableCell>
                            <TableCell>
                              {(
                                agent.montant_normal +
                                agent.montant_samedi +
                                agent.montant_dimanche +
                                agent.montant_ferie
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
                              <TableCell>{j.type}</TableCell>
                              <TableCell>{j.hours}</TableCell>
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
                        color: "rgba(27, 120, 188, 1)",
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
                        <Typography
                          fontWeight="bold"
                          style={{ color: "rgba(27, 120, 188, 1)" }}
                        >
                          Total
                        </Typography>
                        <Typography
                          style={{
                            color: "rgba(27, 120, 188, 1)",
                            fontWeight: 700,
                          }}
                        >
                          {formatHeures(
                            agent.heures_normal +
                              agent.heures_samedi +
                              agent.heures_dimanche +
                              agent.heures_ferie,
                            agent.agent_type_paiement
                          )}
                        </Typography>
                        <Typography
                          color="textSecondary"
                          style={{
                            color: "rgba(27, 120, 188, 1)",
                            fontWeight: 700,
                          }}
                        >
                          Montant :
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
                        {groupMajorations(agent.jours_majoration).map(
                          (j, idx) => (
                            <TableRow key={idx}>
                              <TableCell>
                                {dayjs(j.date).format("DD/MM/YY")}
                              </TableCell>
                              <TableCell>{j.type}</TableCell>
                              <TableCell>{j.hours}</TableCell>
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
