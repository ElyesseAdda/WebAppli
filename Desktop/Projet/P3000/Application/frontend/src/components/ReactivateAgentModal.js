import { 
  Box, 
  Button, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction, 
  Typography, 
  Alert,
  CircularProgress,
  TextField,
  InputAdornment
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import axios from "axios";
import React, { useState, useEffect } from "react";

const ReactivateAgentModal = ({ 
  isOpen = false, 
  handleClose = () => {}, 
  refreshAgents = () => {} 
}) => {
  const [inactiveAgents, setInactiveAgents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [searchTerm, setSearchTerm] = useState("");

  // Récupérer la liste des agents inactifs
  const fetchInactiveAgents = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get("/api/agent/inactifs/");
      setInactiveAgents(response.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des agents inactifs:", error);
      setMessage({ 
        type: "error", 
        text: "Erreur lors de la récupération des agents inactifs" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInactiveAgents();
    }
  }, [isOpen]);

  const handleReactivate = async (agentId) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`/api/agent/${agentId}/reactiver/`);
      
      setMessage({ type: "success", text: response.data.message });
      
      // Rafraîchir la liste des agents inactifs
      await fetchInactiveAgents();
      
      // Rafraîchir la liste générale des agents
      refreshAgents();
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  // Filtrer les agents selon le terme de recherche
  const filteredAgents = inactiveAgents.filter(agent => {
    const fullName = `${agent.name} ${agent.surname}`.toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    return fullName.includes(searchLower);
  });

  // Réinitialiser la recherche quand le modal se ferme
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
    }
  }, [isOpen]);

  return (
    <Dialog 
      open={isOpen} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        Gérer les Agents Inactifs
        {inactiveAgents.length > 0 && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
            {filteredAgents.length} agent{filteredAgents.length > 1 ? 's' : ''} trouvé{filteredAgents.length > 1 ? 's' : ''}
            {searchTerm && ` pour "${searchTerm}"`}
          </Typography>
        )}
      </DialogTitle>
      
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

        {/* Barre de recherche */}
        {inactiveAgents.length > 0 && (
          <TextField
            fullWidth
            placeholder="Rechercher un agent..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        )}

        {isLoading && inactiveAgents.length === 0 ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : inactiveAgents.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="textSecondary">
              Aucun agent inactif trouvé
            </Typography>
          </Box>
        ) : filteredAgents.length === 0 ? (
          <Box textAlign="center" py={4}>
            <Typography variant="h6" color="textSecondary">
              Aucun agent trouvé pour "{searchTerm}"
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              Essayez avec un autre terme de recherche
            </Typography>
          </Box>
        ) : (
          <List>
            {filteredAgents.map((agent) => (
              <ListItem key={agent.id} divider>
                <ListItemText
                  primary={`${agent.name} ${agent.surname}`}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        <strong>Retiré de l'effectif le :</strong> {formatDate(agent.date_desactivation)}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        <strong>Type de paiement :</strong> {agent.type_paiement === 'horaire' ? 'Horaire' : 'Journalier'}
                      </Typography>
                      {agent.taux_Horaire && (
                        <Typography variant="body2" color="textSecondary">
                          <strong>Taux horaire :</strong> {agent.taux_Horaire}€/h
                        </Typography>
                      )}
                      {agent.taux_journalier && (
                        <Typography variant="body2" color="textSecondary">
                          <strong>Taux journalier :</strong> {agent.taux_journalier}€/jour
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleReactivate(agent.id)}
                    disabled={isLoading}
                    size="small"
                  >
                    Réactiver
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={isLoading}>
          Fermer
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ReactivateAgentModal;
