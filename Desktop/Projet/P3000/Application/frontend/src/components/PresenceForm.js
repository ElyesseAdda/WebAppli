import React, { useState, useEffect } from 'react';
import axios from 'axios';

const PresenceForm = () => {
  const [agents, setAgents] = useState([]);
  const [chantiers, setChantiers] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedChantier, setSelectedChantier] = useState('');
  const [date, setDate] = useState('');
  const [heuresTravail, setHeuresTravail] = useState('');
  const [presences, setPresences] = useState([]);

  // Charger les agents et les chantiers au démarrage
  useEffect(() => {
    axios.get('/api/agent/')
      .then(response => setAgents(response.data))
      .catch(error => console.error("Erreur lors du chargement des agents:", error));

    axios.get('/api/chantier/')
      .then(response => setChantiers(response.data))
      .catch(error => console.error("Erreur lors du chargement des chantiers:", error));

    // Charger la liste des présences existantes
    axios.get('/api/presence/')
      .then(response => setPresences(response.data))
      .catch(error => console.error("Erreur lors du chargement des présences:", error));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const newPresence = {
      agent: selectedAgent,
      chantier: selectedChantier,
      date: date,
      heures_travail: heuresTravail
    };

    axios.post('/api/presence/', newPresence)
      .then(response => {
        console.log("Présence ajoutée avec succès:", response.data);
        setPresences([...presences, response.data]);
        // Réinitialiser les champs
        setSelectedAgent('');
        setSelectedChantier('');
        setDate('');
        setHeuresTravail('');
      })
      .catch(error => {
        console.error("Erreur lors de l'ajout de la présence:", error);
      });
  };

  return (
    <div>
      <h2>Ajouter une Présence</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Agent:</label>
          <select value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
            <option value="">-- Sélectionner un Agent --</option>
            {agents
              .sort((a, b) => {
                // Trier par nom de famille puis par prénom
                const nameA = `${a.nom} ${a.prenom}`.toLowerCase();
                const nameB = `${b.nom} ${b.prenom}`.toLowerCase();
                return nameA.localeCompare(nameB, 'fr');
              })
              .map(agent => (
                <option key={agent.id} value={agent.id}>
                  {agent.nom} {agent.prenom}
                </option>
              ))}
          </select>
        </div>
        <div>
          <label>Chantier:</label>
          <select value={selectedChantier} onChange={(e) => setSelectedChantier(e.target.value)}>
            <option value="">-- Sélectionner un Chantier --</option>
            {chantiers.map(chantier => (
              <option key={chantier.id} value={chantier.id}>
                {chantier.nom}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Date:</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <div>
          <label>Heures de Travail:</label>
          <input
            type="number"
            value={heuresTravail}
            onChange={(e) => setHeuresTravail(e.target.value)}
          />
        </div>
        <button type="submit">Ajouter la Présence</button>
      </form>

      <h2>Liste des Présences</h2>
      <ul>
        {presences.map(presence => (
          <li key={presence.id}>
            {presence.agent_name} a travaillé {presence.heures_travail} heures sur {presence.chantier_name} le {presence.date} (Coût: {presence.cout_main_oeuvre} €)
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PresenceForm;
