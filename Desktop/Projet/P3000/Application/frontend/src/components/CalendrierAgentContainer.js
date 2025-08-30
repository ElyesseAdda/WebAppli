import { Box, Button, Divider, Typography } from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import CalendrierAgent from "./CalendrierAgent";
import CreateAgentButton from "./CreateAgentModal"; // Assurez-vous que le chemin est correct
import EditAgentModal from "./EditAgentModal"; // Assurez-vous que le chemin est correct

const CalendrierAgentContainer = () => {
  const [agents, setAgents] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const refreshAgents = () => {
    axios
      .get("/api/agent/")
      .then((response) => {
        setAgents(response.data);
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des agents:", error);
      });
  };

  useEffect(() => {
    axios
      .get("/api/agent/")
      .then((response) => {
        setAgents(response.data);
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

  // Séparer les agents par type de paiement
  const agentsJournaliers = agents.filter(
    (agent) => agent.type_paiement === "journalier"
  );
  const agentsHoraires = agents.filter(
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
            <CalendrierAgent agents={agentsHoraires} />
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
            <CalendrierAgent agents={agentsJournaliers} />
          </Box>
        </>
      )}

      {/* Message si aucun agent */}
      {agents.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="h6" color="textSecondary">
            Aucun agent trouvé
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
        <EditAgentModal
          isOpen={isEditModalOpen}
          handleClose={handleCloseEditModal}
          refreshAgents={refreshAgents}
          agents={agents}
        />
      </Box>
    </div>
  );
};

export default CalendrierAgentContainer;
