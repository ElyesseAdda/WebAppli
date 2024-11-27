import { Box, Button } from "@mui/material";
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

  return (
    <div>
      <Box mb={3}>
        <CalendrierAgent agents={agents} />
      </Box>
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
