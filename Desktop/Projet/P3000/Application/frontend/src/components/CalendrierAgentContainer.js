import { Box, Button, Divider, Typography } from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import dayjs from "dayjs";
import CalendrierAgent from "./CalendrierAgent";
import CreateAgentButton from "./CreateAgentModal"; // Assurez-vous que le chemin est correct
import EditAgentModal from "./EditAgentModal"; // Assurez-vous que le chemin est correct
import ReactivateAgentModal from "./ReactivateAgentModal"; // Nouveau modal pour la réactivation

const CalendrierAgentContainer = () => {
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(null);

  // Fonction pour filtrer les agents selon la période
  const getFilteredAgents = (agentsList, period) => {
    if (!period) {
      return agentsList.filter(agent => agent.is_active);
    }
    
    const periodStart = period.start.toDate();
    
    return agentsList.filter(agent => {
      // Agent actif OU désactivé après le début de la période
      return agent.is_active || 
             (agent.date_desactivation && new Date(agent.date_desactivation) > periodStart);
    });
  };

  // Fonction appelée quand la période change dans FullCalendar
  const handlePeriodChange = (startDate, endDate) => {
    const period = { start: startDate, end: endDate };
    setCurrentPeriod(period);
    
    // Filtrer les agents selon la nouvelle période
    const filtered = getFilteredAgents(agents, period);
    setFilteredAgents(filtered);
  };

  const refreshAgents = () => {
    // Récupérer tous les agents (actifs et inactifs) pour la logique temporelle
    axios
      .get("/api/agent/?include_inactive=true")
      .then((response) => {
        setAgents(response.data);
        // Filtrer selon la période actuelle
        const filtered = getFilteredAgents(response.data, currentPeriod);
        setFilteredAgents(filtered);
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des agents:", error);
      });
  };

  useEffect(() => {
    // Récupérer tous les agents (actifs et inactifs) pour la logique temporelle
    axios
      .get("/api/agent/?include_inactive=true")
      .then((response) => {
        setAgents(response.data);
        // Filtrer selon la période actuelle
        const filtered = getFilteredAgents(response.data, currentPeriod);
        setFilteredAgents(filtered);
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des agents:", error);
      });
  }, []);

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
  };

  const handleOpenReactivateModal = () => {
    setIsReactivateModalOpen(true);
  };

  const handleCloseReactivateModal = () => {
    setIsReactivateModalOpen(false);
  };

  // Séparer les agents filtrés par type de paiement
  const agentsJournaliers = filteredAgents.filter(
    (agent) => agent.type_paiement === "journalier"
  );
  const agentsHoraires = filteredAgents.filter(
    (agent) => agent.type_paiement === "horaire"
  );

  return (
    <div>
      {/* Section Agents Horaires */}
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
              ⏰ Agents Horaires ({agentsHoraires.length})
            </Typography>
            <CalendrierAgent agents={agentsHoraires} onPeriodChange={handlePeriodChange} />
          </Box>
          <Divider sx={{ margin: "24px 0" }} />
        </>
      )}

      {/* Section Agents Journaliers */}
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
              👷‍♂️ Agents Journaliers ({agentsJournaliers.length})
            </Typography>
            <CalendrierAgent agents={agentsJournaliers} onPeriodChange={handlePeriodChange} />
          </Box>
        </>
      )}

      {/* Message si aucun agent */}
      {filteredAgents.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            Aucun agent trouvé pour cette période
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
