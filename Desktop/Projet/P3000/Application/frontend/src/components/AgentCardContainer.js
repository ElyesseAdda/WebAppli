import React, { useState, useEffect } from 'react';
import axios from 'axios';
import AgentCard from './AgentCard';
import { Box, Button, Select, MenuItem } from '@mui/material';

const AgentCardContainer = () => {
  const [agents, setAgents] = useState([]);
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0);

  useEffect(() => {
    axios.get('/api/agent/')
      .then(response => {
        setAgents(response.data);
      })
      .catch(error => {
        console.error('Erreur lors de la récupération des agents:', error);
      });
  }, []);

  const handleSelectChange = (event) => {
    setCurrentAgentIndex(event.target.value);
  };

  const handlePrevious = () => {
    setCurrentAgentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : agents.length - 1));
  };

  const handleNext = () => {
    setCurrentAgentIndex((prevIndex) => (prevIndex < agents.length - 1 ? prevIndex + 1 : 0));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      {agents.length > 0 && (
        <>
          <AgentCard agent={agents[currentAgentIndex]} />
          <Box display="flex" justifyContent="center" alignItems="center" mt={2} gap={2}>
            <Button onClick={handlePrevious} variant="contained" color="primary">
              Précédent
            </Button>
            <Select
              value={currentAgentIndex}
              onChange={handleSelectChange}
              sx={{ minWidth: 200 }}
            >
              {agents.map((agent, index) => (
                <MenuItem key={agent.id} value={index}>
                  {`${agent.name} ${agent.surname}`}
                </MenuItem>
              ))}
            </Select>
            <Button onClick={handleNext} variant="contained" color="primary">
              Suivant
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
};

export default AgentCardContainer;
