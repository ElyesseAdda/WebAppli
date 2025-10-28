import { Box, MenuItem, Select } from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import AgentCard from "./AgentCard";

const AgentCardContainer = () => {
  const [agents, setAgents] = useState([]);
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);
  const [events, setEvents] = useState([]);
  const [sortedAgents, setSortedAgents] = useState([]);

  useEffect(() => {
    axios
      .get("/api/agent/")
      .then((response) => {
        setAgents(response.data);
        
        // Créer un tableau trié avec les index originaux
        const sortedWithIndex = response.data
          .map((agent, originalIndex) => ({ agent, originalIndex }))
          .sort((a, b) => {
            const nameA = `${a.agent.surname} ${a.agent.name}`.toLowerCase();
            const nameB = `${b.agent.surname} ${b.agent.name}`.toLowerCase();
            return nameA.localeCompare(nameB, 'fr');
          });
        
        setSortedAgents(sortedWithIndex);
        
        if (response.data.length > 0) {
          fetchEvents(response.data[0].id);
        }
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des agents:", error);
      });
  }, []);

  const fetchEvents = (agentId) => {
    axios
      .get(`/api/events/?agent_id=${agentId}`)
      .then((response) => {
        const filteredEvents = response.data.filter(
          (event) => event.status !== "P"
        );
        setEvents(filteredEvents);
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des événements:", error);
      });
  };

  const handleSelectChange = (event) => {
    const selectedIndex = event.target.value;
    setCurrentAgentIndex(selectedIndex);
    if (sortedAgents[selectedIndex]) {
      fetchEvents(sortedAgents[selectedIndex].agent.id);
    }
  };

  return (
    <Box>
      {agents.length > 0 && (
        <>
          <AgentCard
            agent={sortedAgents[currentAgentIndex]?.agent || agents[currentAgentIndex]}
            events={events}
            onSelectChange={handleSelectChange}
            agentsList={agents}
          />
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            mt={2}
            gap={2}
          >
            <Select value={currentAgentIndex} onChange={handleSelectChange}>
              {sortedAgents.map((item, index) => (
                <MenuItem
                  key={item.agent.id}
                  value={index}
                >{`${item.agent.surname} ${item.agent.name}`}</MenuItem>
              ))}
            </Select>
          </Box>
        </>
      )}
    </Box>
  );
};

export default AgentCardContainer;
