import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  Divider,
  Chip,
  IconButton,
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

const AgentSelectionModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  agents = [], 
  selectedAgents = [], 
  setSelectedAgents,
  week,
  year 
}) => {
  const [localSelectedAgents, setLocalSelectedAgents] = useState([]);

  // Initialiser avec les agents déjà sélectionnés
  useEffect(() => {
    setLocalSelectedAgents(selectedAgents);
  }, [selectedAgents, isOpen]);

  const handleAgentToggle = (agentId, isChecked) => {
    if (isChecked) {
      setLocalSelectedAgents(prev => [...prev, agentId]);
    } else {
      setLocalSelectedAgents(prev => prev.filter(id => id !== agentId));
    }
  };

  const handleSelectAll = () => {
    setLocalSelectedAgents(agents.map(agent => agent.id));
  };

  const handleDeselectAll = () => {
    setLocalSelectedAgents([]);
  };

  const handleConfirm = () => {
    setSelectedAgents(localSelectedAgents);
    onConfirm(localSelectedAgents);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelectedAgents(selectedAgents); // Restaurer la sélection précédente
    onClose();
  };

  const getSelectedAgentsNames = () => {
    return localSelectedAgents
      .map(id => agents.find(agent => agent.id === id))
      .filter(Boolean)
      .map(agent => `${agent.name} ${agent.surname}`);
  };

  return (
    <Dialog 
      open={isOpen} 
      onClose={handleCancel}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1 
      }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, color: '#1976d2' }}>
            Sélectionner les agents pour le planning
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Semaine {week} - {year}
          </Typography>
        </Box>
        <IconButton onClick={handleCancel} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Actions rapides */}
        <Box sx={{ mb: 3, display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={handleSelectAll}
            disabled={localSelectedAgents.length === agents.length}
          >
            Tout sélectionner
          </Button>
          <Button 
            variant="outlined" 
            size="small" 
            onClick={handleDeselectAll}
            disabled={localSelectedAgents.length === 0}
          >
            Tout désélectionner
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Liste des agents */}
        <Box sx={{ maxHeight: '400px', overflowY: 'auto' }}>
          {agents.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" py={4}>
              Aucun agent disponible
            </Typography>
          ) : (
            agents
              .sort((a, b) => {
                // Trier par nom de famille puis par prénom
                const nameA = `${a.surname} ${a.name}`.toLowerCase();
                const nameB = `${b.surname} ${b.name}`.toLowerCase();
                return nameA.localeCompare(nameB, 'fr');
              })
              .map((agent) => (
              <Box 
                key={agent.id} 
                sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  py: 1.5,
                  px: 1,
                  borderRadius: '8px',
                  '&:hover': {
                    backgroundColor: 'rgba(25, 118, 210, 0.04)',
                  }
                }}
              >
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={localSelectedAgents.includes(agent.id)}
                      onChange={(e) => handleAgentToggle(agent.id, e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    <Box sx={{ ml: 1 }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {agent.name} {agent.surname}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {agent.type_paiement === 'journalier' ? 'Journalier' : 'Horaire'}
                        {agent.taux_Horaire && ` - ${agent.taux_Horaire}€/h`}
                      </Typography>
                    </Box>
                  }
                  sx={{ flex: 1, m: 0 }}
                />
              </Box>
            ))
          )}
        </Box>

        {/* Résumé de la sélection */}
        {localSelectedAgents.length > 0 && (
          <Box sx={{ mt: 3, p: 2, backgroundColor: 'rgba(25, 118, 210, 0.08)', borderRadius: '8px' }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
              Agents sélectionnés ({localSelectedAgents.length}) :
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {getSelectedAgentsNames().map((name, index) => (
                <Chip 
                  key={index}
                  label={name} 
                  size="small" 
                  color="primary" 
                  variant="outlined"
                />
              ))}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button 
          onClick={handleCancel}
          variant="outlined"
          sx={{ mr: 1 }}
        >
          Annuler
        </Button>
        <Button 
          onClick={handleConfirm}
          variant="contained"
          disabled={localSelectedAgents.length === 0}
          sx={{
            backgroundColor: '#1976d2',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
            '&:disabled': {
              backgroundColor: '#e0e0e0',
              color: '#9e9e9e',
            }
          }}
        >
          Générer PDF ({localSelectedAgents.length} agent{localSelectedAgents.length > 1 ? 's' : ''})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgentSelectionModal;
