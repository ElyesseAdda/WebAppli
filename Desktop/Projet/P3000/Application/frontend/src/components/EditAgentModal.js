import React, { useEffect } from 'react';
import axios from 'axios';
import { Modal, Box, TextField, Button, MenuItem, Select } from '@mui/material';

const EditAgentModal = ({ isOpen, handleClose, refreshAgents, agents }) => {
  const [agentData, setAgentData] = React.useState({
    id: '',
    name: '',
    surname: '',
    address: '',
    phone_Number: '',
    taux_Horaire: '',
    conge: '',
    heure_debut: '',
    heure_fin: '',
    heure_pause_debut: '',
    heure_pause_fin: '',
    jours_travail: [],
  });

  const joursOptions = [
    'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'
  ];

  const handleAgentSelect = (e) => {
    const selectedAgent = agents.find(agent => agent.id === e.target.value);
    if (selectedAgent) {
      setAgentData({
        ...selectedAgent,
        heure_debut: selectedAgent.heure_debut ? selectedAgent.heure_debut.slice(0, 5) : '',
        heure_fin: selectedAgent.heure_fin ? selectedAgent.heure_fin.slice(0, 5) : '',
        heure_pause_debut: selectedAgent.heure_pause_debut ? selectedAgent.heure_pause_debut.slice(0, 5) : '',
        heure_pause_fin: selectedAgent.heure_pause_fin ? selectedAgent.heure_pause_fin.slice(0, 5) : '',
        jours_travail: selectedAgent.jours_travail ? selectedAgent.jours_travail.split(', ') : [],
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setAgentData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleJoursChange = (e) => {
    const { value } = e.target;
    setAgentData((prevData) => ({
      ...prevData,
      jours_travail: value,
    }));
  };

  const handleSubmit = async () => {
    if (!agentData.id) {
      console.error("Aucun agent sélectionné pour la mise à jour.");
      return;
    }

    try {
      const agentDataToSubmit = {
        ...agentData,
        jours_travail: agentData.jours_travail.join(', '),
      };
      await axios.put(`/api/agent/${agentData.id}/`, agentDataToSubmit);
      handleClose();
      refreshAgents();
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'agent", error);
    }
  };

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <Box sx={{ ...style, overflowY: 'auto' }}>
        <h2>Modifier l'agent</h2>
        <Select
          value={agentData.id || ''}
          onChange={handleAgentSelect}
          displayEmpty
          fullWidth
          margin="normal"
        >
          <MenuItem value="" disabled>Sélectionner un agent</MenuItem>
          {agents.map(agent => (
            <MenuItem key={agent.id} value={agent.id}>
              {`${agent.name} ${agent.surname}`}
            </MenuItem>
          ))}
        </Select>
        <TextField label="Nom" name="name" value={agentData.name} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Prénom" name="surname" value={agentData.surname} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Adresse" name="address" value={agentData.address} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Numéro de téléphone" name="phone_Number" value={agentData.phone_Number} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Taux Horaire" name="taux_Horaire" value={agentData.taux_Horaire} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Congé" name="conge" value={agentData.conge} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Heure de début" name="heure_debut" type="time" value={agentData.heure_debut} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Heure de fin" name="heure_fin" type="time" value={agentData.heure_fin} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Heure de pause début" name="heure_pause_debut" type="time" value={agentData.heure_pause_debut} onChange={handleChange} fullWidth margin="normal" />
        <TextField label="Heure de pause fin" name="heure_pause_fin" type="time" value={agentData.heure_pause_fin} onChange={handleChange} fullWidth margin="normal" />
        <TextField
          label="Jours de travail"
          name="jours_travail"
          value={agentData.jours_travail}
          onChange={handleJoursChange}
          fullWidth
          margin="normal"
          select
          SelectProps={{ multiple: true }}
        >
          {joursOptions.map((jour) => (
            <MenuItem key={jour} value={jour}>
              {jour}
            </MenuItem>
          ))}
        </TextField>
        <Button variant="contained" color="primary" onClick={handleSubmit}>Enregistrer</Button>
      </Box>
    </Modal>
  );
};

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  height: '80%',
  bgcolor: 'white',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
  color: 'rgba(27, 120, 188, 1)',
  fontSize: '18px',
  overflowY: 'auto',
  maxHeight: '80vh',
};

export default EditAgentModal;
