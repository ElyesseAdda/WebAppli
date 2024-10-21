import axios from 'axios';
import React, { useEffect, useState } from 'react';
import CalendrierAgent from './CalendrierAgent';
import CreateAgentModal from './CreateAgentModal';

const CalendrierAgentContainer = () => {
  const [agents, setAgents] = useState([]);

  const refreshAgents = () => {
    axios.get('/api/agent/')
      .then(response => {
        console.log('Agents récupérés:', response.data); // Pour vérifier la récupération
        setAgents(response.data);
      })
      .catch(error => {
        console.error('Erreur lors de la récupération des agents:', error);
      });
  };

  useEffect(() => {
    refreshAgents();
  }, []);

  return (
    <div>
      <CreateAgentModal refreshAgents={refreshAgents} />
      <CalendrierAgent agents={agents} />
    </div>
  );
};

export default CalendrierAgentContainer;