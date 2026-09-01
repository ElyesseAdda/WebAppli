import { Box, Button, Divider, Typography } from "@mui/material";
import axios from "axios";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import CalendrierAgent from "./CalendrierAgent";
import CreateAgentButton from "./CreateAgentModal";
import EditAgentModal from "./EditAgentModal";
import ReactivateAgentModal from "./ReactivateAgentModal";
import { agentVisibleForRange } from "../utils/agentEffectif";

dayjs.locale("fr");

const monthBounds = (dateLike) => {
  const d = dayjs(dateLike);
  return {
    start: d.startOf("month").toDate(),
    end: d.endOf("month").toDate(),
  };
};

const CalendrierAgentContainer = () => {
  const [agents, setAgents] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(() => monthBounds(dayjs()));

  const getFilteredAgents = useCallback((agentsList, period) => {
    const bounds = period?.start
      ? {
          start: period.start?.toDate ? period.start.toDate() : period.start,
          end: period.end?.toDate
            ? period.end.toDate()
            : period.end || period.start,
        }
      : monthBounds(dayjs());

    return agentsList.filter((agent) =>
      agentVisibleForRange(agent, bounds.start, bounds.end)
    );
  }, []);

  const filteredAgents = useMemo(
    () => getFilteredAgents(agents, currentPeriod),
    [agents, currentPeriod, getFilteredAgents]
  );

  const handlePeriodChange = useCallback((startDate, endDate) => {
    if (!startDate) return;
    const start = dayjs(startDate).startOf("month");
    const end = endDate
      ? dayjs(endDate).endOf("month")
      : start.endOf("month");
    setCurrentPeriod((prev) => {
      const prevStart = prev?.start ? dayjs(prev.start).format("YYYY-MM") : null;
      const nextStart = start.format("YYYY-MM");
      if (prevStart === nextStart) return prev;
      return { start: start.toDate(), end: end.toDate() };
    });
  }, []);

  const refreshAgents = () => {
    axios
      .get("/api/agent/?include_inactive=true")
      .then((response) => {
        setAgents(Array.isArray(response.data) ? response.data : []);
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des agents:", error);
      });
  };

  useEffect(() => {
    refreshAgents();
  }, []);

  const handleOpenEditModal = () => setIsEditModalOpen(true);
  const handleCloseEditModal = () => setIsEditModalOpen(false);
  const handleOpenReactivateModal = () => setIsReactivateModalOpen(true);
  const handleCloseReactivateModal = () => setIsReactivateModalOpen(false);

  const sortAgentsAlphabetically = (list) =>
    [...list].sort((a, b) => {
      const nameA = `${a.surname || ""} ${a.name || ""}`.toLowerCase();
      const nameB = `${b.surname || ""} ${b.name || ""}`.toLowerCase();
      return nameA.localeCompare(nameB, "fr");
    });

  const agentsJournaliers = sortAgentsAlphabetically(
    filteredAgents.filter((agent) => agent.type_paiement === "journalier")
  );
  const agentsHoraires = sortAgentsAlphabetically(
    filteredAgents.filter((agent) => agent.type_paiement === "horaire")
  );

  const monthKey = dayjs(currentPeriod.start).format("YYYY-MM");
  const monthLabel = dayjs(currentPeriod.start).format("MMMM YYYY");
  const initialDate = dayjs(currentPeriod.start).format("YYYY-MM-DD");

  return (
    <div>
      {agentsHoraires.length > 0 && (
        <>
          <Box mb={2}>
            <Typography
              variant="h5"
              component="h2"
              sx={{
                fontWeight: "bold",
                color: "#ed6c02",
                borderBottom: "2px solid #ed6c02",
                paddingBottom: 1,
                marginBottom: 2,
              }}
            >
              Agents Horaires ({agentsHoraires.length})
            </Typography>
            <CalendrierAgent
              key={`horaires-${monthKey}`}
              agents={agentsHoraires}
              onPeriodChange={handlePeriodChange}
              initialDate={initialDate}
            />
          </Box>
          <Divider sx={{ margin: "24px 0" }} />
        </>
      )}

      {agentsJournaliers.length > 0 && (
        <>
          <Box mb={2}>
            <Typography
              variant="h5"
              component="h2"
              sx={{
                fontWeight: "bold",
                color: "#1976d2",
                borderBottom: "2px solid #1976d2",
                paddingBottom: 1,
                marginBottom: 2,
              }}
            >
              Agents Journaliers ({agentsJournaliers.length})
            </Typography>
            <CalendrierAgent
              key={`journaliers-${monthKey}`}
              agents={agentsJournaliers}
              onPeriodChange={handlePeriodChange}
              initialDate={initialDate}
            />
          </Box>
        </>
      )}

      {filteredAgents.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            Aucun agent visible pour {monthLabel}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            Naviguez vers un autre mois pour voir les agents hors période
            d&apos;inactivité.
          </Typography>
        </Box>
      )}

      <Box
        display="flex"
        justifyContent="space-evenly"
        style={{ marginBottom: "10px" }}
        alignItems="center"
        mb={2}
      >
        <CreateAgentButton refreshAgents={refreshAgents} />
        <Button
          variant="contained"
          color="secondary"
          onClick={handleOpenEditModal}
        >
          Modifier Agent
        </Button>
        <Button
          variant="outlined"
          color="warning"
          onClick={handleOpenReactivateModal}
        >
          Gérer Agents Inactifs
        </Button>
        <EditAgentModal
          isOpen={isEditModalOpen}
          handleClose={handleCloseEditModal}
          refreshAgents={refreshAgents}
          agents={agents || []}
        />
        <ReactivateAgentModal
          isOpen={isReactivateModalOpen}
          handleClose={handleCloseReactivateModal}
          refreshAgents={refreshAgents}
        />
      </Box>
    </div>
  );
};

export default CalendrierAgentContainer;
