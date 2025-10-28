import { Box, Button, MenuItem, Select, TextField, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Typography } from "@mui/material";
import axios from "axios";
import React from "react";

const EditAgentModal = ({ isOpen, handleClose, refreshAgents, agents = [] }) => {
  const [agentData, setAgentData] = React.useState({
    id: "",
    name: "",
    surname: "",
    address: "",
    phone_Number: "",
    taux_Horaire: "",
    conge: "",
    heure_debut: "",
    heure_fin: "",
    heure_pause_debut: "",
    heure_pause_fin: "",
    jours_travail: [],
    is_active: true,
    date_desactivation: null,
  });
  
  const [showDesactivationDialog, setShowDesactivationDialog] = React.useState(false);
  const [dateDesactivation, setDateDesactivation] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [message, setMessage] = React.useState({ type: "", text: "" });

  const joursOptions = [
    "lundi",
    "mardi",
    "mercredi",
    "jeudi",
    "vendredi",
    "samedi",
    "dimanche",
  ];

  const handleAgentSelect = (e) => {
    const selectedAgent = agents.find((agent) => agent.id === e.target.value);
    if (selectedAgent) {
      setAgentData({
        ...selectedAgent,
        heure_debut: selectedAgent.heure_debut
          ? selectedAgent.heure_debut.slice(0, 5)
          : "",
        heure_fin: selectedAgent.heure_fin
          ? selectedAgent.heure_fin.slice(0, 5)
          : "",
        heure_pause_debut: selectedAgent.heure_pause_debut
          ? selectedAgent.heure_pause_debut.slice(0, 5)
          : "",
        heure_pause_fin: selectedAgent.heure_pause_fin
          ? selectedAgent.heure_pause_fin.slice(0, 5)
          : "",
        jours_travail: selectedAgent.jours_travail
          ? selectedAgent.jours_travail.split(",").map((j) => j.trim())
          : [],
        is_active: selectedAgent.is_active !== undefined ? selectedAgent.is_active : true,
        date_desactivation: selectedAgent.date_desactivation || null,
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
      const jours_travail_uniques = Array.from(
        new Set(agentData.jours_travail.map((j) => j.trim()))
      );
      const agentDataToSubmit = {
        name: agentData.name,
        surname: agentData.surname,
        address: agentData.address,
        phone_Number: String(agentData.phone_Number),
        taux_Horaire: agentData.taux_Horaire
          ? parseFloat(agentData.taux_Horaire)
          : null,
        conge: agentData.conge ? agentData.conge : null,
        heure_debut: agentData.heure_debut || null,
        heure_fin: agentData.heure_fin || null,
        heure_pause_debut: agentData.heure_pause_debut || null,
        heure_pause_fin: agentData.heure_pause_fin || null,
        jours_travail: jours_travail_uniques.join(","),
      };
      console.log(
        "[DEBUG] Données envoyées à l'API pour modification agent:",
        agentDataToSubmit
      );
      await axios.put(`/api/agent/${agentData.id}/`, agentDataToSubmit);
      handleClose();
      refreshAgents();
    } catch (error) {
      console.error("Erreur détaillée:", error.response?.data);
      console.error("Erreur lors de la mise à jour de l'agent", error);
    }
  };

  const handleDesactiver = () => {
    if (!agentData.id) {
      setMessage({ type: "error", text: "Aucun agent sélectionné." });
      return;
    }
    setShowDesactivationDialog(true);
  };

  const confirmDesactivation = async () => {
    if (!dateDesactivation) {
      setMessage({ type: "error", text: "Veuillez sélectionner une date de désactivation." });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`/api/agent/${agentData.id}/desactiver/`, {
        date_desactivation: dateDesactivation
      });
      
      setMessage({ type: "success", text: response.data.message });
      setShowDesactivationDialog(false);
      setDateDesactivation("");
      refreshAgents();
      
      // Mettre à jour les données de l'agent
      setAgentData(prev => ({
        ...prev,
        is_active: false,
        date_desactivation: dateDesactivation
      }));
    } catch (error) {
      console.error("Erreur lors de la désactivation:", error);
      setMessage({ 
        type: "error", 
        text: error.response?.data?.error || "Erreur lors de la désactivation" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReactiver = async () => {
    if (!agentData.id) {
      setMessage({ type: "error", text: "Aucun agent sélectionné." });
      return;
    }

    setIsLoading(true);
    try {
      const response = await axios.post(`/api/agent/${agentData.id}/reactiver/`);
      
      setMessage({ type: "success", text: response.data.message });
      refreshAgents();
      
      // Mettre à jour les données de l'agent
      setAgentData(prev => ({
        ...prev,
        is_active: true,
        date_desactivation: null
      }));
    } catch (error) {
      console.error("Erreur lors de la réactivation:", error);
      setMessage({ 
        type: "error", 
        text: error.response?.data?.error || "Erreur lors de la réactivation" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Dialog 
        open={isOpen} 
        onClose={handleClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Modifier l'agent</DialogTitle>
        <DialogContent>
          {/* Message d'alerte */}
          {message.text && (
            <Alert 
              severity={message.type} 
              sx={{ mb: 2 }}
              onClose={() => setMessage({ type: "", text: "" })}
            >
              {message.text}
            </Alert>
          )}
          
          <Select
            value={agentData.id || ""}
            onChange={handleAgentSelect}
            displayEmpty
            fullWidth
            margin="normal"
          >
            <MenuItem value="" disabled>
              Sélectionner un agent
            </MenuItem>
            {agents.map((agent) => (
              <MenuItem key={agent.id} value={agent.id}>
                {`${agent.name} ${agent.surname}`}
              </MenuItem>
            ))}
          </Select>
          
          {/* Statut de l'agent */}
          {agentData.id && (
            <Box sx={{ mb: 2, p: 2, bgcolor: agentData.is_active ? '#e8f5e8' : '#ffebee', borderRadius: 1 }}>
              <Typography variant="body2" color={agentData.is_active ? 'success.main' : 'error.main'}>
                <strong>Statut :</strong> {agentData.is_active ? '✅ Actif dans l\'effectif' : '❌ Retiré de l\'effectif'}
              </Typography>
              {!agentData.is_active && agentData.date_desactivation && (
                <Typography variant="body2" color="error.main">
                  <strong>Date de désactivation :</strong> {new Date(agentData.date_desactivation).toLocaleDateString('fr-FR')}
                </Typography>
              )}
            </Box>
          )}
          
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
            label="Adresse"
            name="address"
            value={agentData.address}
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
            label="Taux Horaire"
            name="taux_Horaire"
            value={agentData.taux_Horaire}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Congé"
            name="conge"
            value={agentData.conge}
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
            label="Heure de pause début"
            name="heure_pause_debut"
            type="time"
            value={agentData.heure_pause_debut}
            onChange={handleChange}
            fullWidth
            margin="normal"
          />
          <TextField
            label="Heure de pause fin"
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
        </DialogContent>
        
        <DialogActions>
          <Box sx={{ display: 'flex', gap: 2, width: '100%', justifyContent: 'space-between' }}>
            <Box>
              {agentData.id && (
                <>
                  {agentData.is_active ? (
                    <Button 
                      variant="contained" 
                      color="error" 
                      onClick={handleDesactiver}
                      disabled={isLoading}
                    >
                      Retirer de l'effectif
                    </Button>
                  ) : (
                    <Button 
                      variant="contained" 
                      color="success" 
                      onClick={handleReactiver}
                      disabled={isLoading}
                    >
                      Remettre dans l'effectif
                    </Button>
                  )}
                </>
              )}
            </Box>
            <Box>
              <Button variant="contained" color="primary" onClick={handleSubmit}>
                Enregistrer
              </Button>
              <Button onClick={handleClose} sx={{ ml: 1 }}>
                Annuler
              </Button>
            </Box>
          </Box>
        </DialogActions>
      </Dialog>
      
      {/* Dialog de confirmation de désactivation */}
      <Dialog open={showDesactivationDialog} onClose={() => setShowDesactivationDialog(false)}>
        <DialogTitle>Confirmer la désactivation</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            Êtes-vous sûr de vouloir retirer <strong>{agentData.name} {agentData.surname}</strong> de l'effectif ?
          </Typography>
          <TextField
            label="Date de désactivation"
            type="date"
            value={dateDesactivation}
            onChange={(e) => setDateDesactivation(e.target.value)}
            fullWidth
            margin="normal"
            InputLabelProps={{ shrink: true }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDesactivationDialog(false)}>
            Annuler
          </Button>
          <Button 
            onClick={confirmDesactivation} 
            color="error" 
            variant="contained"
            disabled={isLoading || !dateDesactivation}
          >
            {isLoading ? "Désactivation..." : "Confirmer"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditAgentModal;