import React, { useState } from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { css } from '@emotion/react';
import axios from 'axios';

// Styles de la modale avec Emotion
const modalStyle = css({
  position: 'absolute',
  height: '80%',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '80%',
  maxWidth: '800px',
  backgroundColor: 'white',
  border: '2px solid #000',
  boxShadow: 24,
  padding: '20px',
  color: 'rgba(27, 120, 188, 1)',
  fontSize: '18px',
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '20px',
});

const CreateAgentModal = ({ isOpen, handleClose, refreshAgents }) => {
  const [agentData, setAgentData] = useState({
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
    try {
      // Convertir jours_travail en chaîne de caractères séparée par des virgules
      const agentDataToSubmit = {
        ...agentData,
        jours_travail: agentData.jours_travail.join(', '),
      };
      await axios.post('/api/agent/', agentDataToSubmit);
      handleClose();
      refreshAgents(); // Actualiser la liste des agents après la création
    } catch (error) {
      console.error("Erreur lors de la création de l'agent", error);
    }
  };

  const style = {
    position: 'absolute',
    height: '80%',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: '800px',
    backgroundColor: 'white',
    border: '2px solid #000',
    boxShadow: 24,
    padding: '20px',
    color: 'rgba(27, 120, 188, 1)',
    fontSize: '18px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  };

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <Box css={modalStyle} sx={style}>
        <h2>Créer un nouvel agent</h2>

        <TextField
          label="Adresse"
          name="address"
          value={agentData.address}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        
        <TextField
          label="Nom"
          name="name"
          value={agentData.name}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        
        <TextField
          label="Prénom"
          name="surname"
          value={agentData.surname}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Numéro de téléphone"
          name="phone_Number"
          value={agentData.phone_Number}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Taux horaire"
          name="taux_Horaire"
          value={agentData.taux_Horaire}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        
        <TextField
          label="Heure de début"
          name="heure_debut"
          type="time"
          value={agentData.heure_debut}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Heure de fin"
          name="heure_fin"
          type="time"
          value={agentData.heure_fin}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Heure de début de pause"
          name="heure_pause_debut"
          type="time"
          value={agentData.heure_pause_debut}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <TextField
          label="Heure de fin de pause"
          name="heure_pause_fin"
          type="time"
          value={agentData.heure_pause_fin}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
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
        <TextField
          label="Congé"
          name="conge"
          value={agentData.conge}
          onChange={handleChange}
          fullWidth
          margin="normal"
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSubmit}
          sx={{ mt: 2 }}
        >
          Créer Agent
        </Button>
        <Button onClick={handleClose} sx={{ mt: 2, ml: 2 }}>
          Annuler
        </Button>
      </Box>
    </Modal>
  );
};

const CreateAgentButton = ({ refreshAgents }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button variant="contained" color="primary" onClick={handleOpenModal}>
        Ajouter Agent
      </Button>
      <CreateAgentModal
        isOpen={isModalOpen}
        handleClose={handleCloseModal}
        refreshAgents={refreshAgents}
      />
    </>
  );
};

export default CreateAgentButton;
