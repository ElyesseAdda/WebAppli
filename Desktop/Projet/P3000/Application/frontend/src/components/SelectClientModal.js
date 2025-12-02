import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  CircularProgress,
  Divider,
  InputAdornment
} from '@mui/material';
import { FiSearch, FiPlus, FiUser } from 'react-icons/fi';
import axios from 'axios';

const SelectClientModal = ({ open, onClose, onSelectClient, onCreateNew }) => {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      loadClients();
    }
  }, [open]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredClients(clients);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = clients.filter(client => {
        const fullName = `${client.name} ${client.surname}`.toLowerCase();
        const email = (client.client_mail || '').toLowerCase();
        const phone = (client.phone_Number || '').toString();
        return fullName.includes(term) || email.includes(term) || phone.includes(term);
      });
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const loadClients = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/client/');
      
      // Dédupliquer les clients en utilisant une Map avec une clé unique
      const clientsMap = new Map();
      response.data.forEach(client => {
        // Créer une clé unique basée sur nom, prénom et email (normalisés)
        const key = `${client.name?.toLowerCase().trim()}-${client.surname?.toLowerCase().trim()}-${client.client_mail?.toLowerCase().trim()}`;
        
        // Si ce client n'existe pas encore dans la Map, ou si l'ID actuel est plus récent
        if (!clientsMap.has(key) || client.id > clientsMap.get(key).id) {
          clientsMap.set(key, client);
        }
      });
      
      // Convertir la Map en tableau
      const uniqueClients = Array.from(clientsMap.values());
      
      // Trier les clients par nom
      const sortedClients = uniqueClients.sort((a, b) => {
        const nameA = `${a.name} ${a.surname}`.toLowerCase();
        const nameB = `${b.name} ${b.surname}`.toLowerCase();
        return nameA.localeCompare(nameB);
      });
      
      setClients(sortedClients);
      setFilteredClients(sortedClients);
    } catch (err) {
      console.error('Erreur lors du chargement des clients:', err);
      setError('Impossible de charger la liste des clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = async (client) => {
    try {
      setLoading(true);
      
      // Récupérer les détails complets du client
      const clientResponse = await axios.get(`/api/client/${client.id}/`);
      const clientData = clientResponse.data;
      
      // Récupérer la société associée (la société contient l'ID du client dans client_name)
      let societeData = null;
      try {
        // Récupérer TOUS les clients pour trouver les doublons
        const allClientsResponse = await axios.get('/api/client/');
        const allClients = allClientsResponse.data;
        
        // Trouver tous les IDs de clients qui correspondent au même client (même nom, prénom, email)
        const clientIds = allClients
          .filter(c => 
            c.name?.toLowerCase().trim() === clientData.name?.toLowerCase().trim() &&
            c.surname?.toLowerCase().trim() === clientData.surname?.toLowerCase().trim() &&
            c.client_mail?.toLowerCase().trim() === clientData.client_mail?.toLowerCase().trim()
          )
          .map(c => c.id);
        
        // Récupérer toutes les sociétés et trouver celle qui appartient à l'un de ces clients
        const societesResponse = await axios.get('/api/societe/');
        const societes = societesResponse.data;
        
        // Trouver TOUTES les sociétés dont le client_name correspond à l'un des IDs de client
        const societesAssociees = societes.filter(s => clientIds.includes(s.client_name));
        
        if (societesAssociees.length > 1) {
          // Retourner toutes les sociétés pour que l'utilisateur puisse choisir
          societeData = { multiple: true, societes: societesAssociees };
        } else if (societesAssociees.length === 1) {
          societeData = societesAssociees[0];
        } else {
          societeData = null;
        }
      } catch (err) {
        console.error('Erreur lors de la recherche de la société:', err);
      }
      
      onSelectClient(clientData, societeData);
      handleClose();
    } catch (err) {
      console.error('Erreur lors de la sélection du client:', err);
      setError('Impossible de charger les informations du client');
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setError('');
    onClose();
  };

  const handleCreateNew = () => {
    handleClose();
    onCreateNew();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <FiUser size={24} />
          <span>Sélectionner un client</span>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<FiPlus />}
            fullWidth
            onClick={handleCreateNew}
            sx={{ mb: 2 }}
          >
            Créer un nouveau client
          </Button>
          
          <Divider sx={{ my: 2 }}>
            <Typography variant="body2" color="text.secondary">
              ou sélectionner un client existant
            </Typography>
          </Divider>
        </Box>

        <TextField
          fullWidth
          placeholder="Rechercher par nom, email ou téléphone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FiSearch />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" py={4}>
            <CircularProgress />
          </Box>
        ) : (
          <List 
            sx={{ 
              maxHeight: 400, 
              overflow: 'auto',
              border: '1px solid #e0e0e0',
              borderRadius: 1,
              bgcolor: 'background.paper'
            }}
          >
            {filteredClients.length === 0 ? (
              <Box py={4} textAlign="center">
                <Typography variant="body2" color="text.secondary">
                  {searchTerm ? 'Aucun client trouvé' : 'Aucun client disponible'}
                </Typography>
              </Box>
            ) : (
              filteredClients.map((client) => (
                <React.Fragment key={client.id}>
                  <ListItem disablePadding>
                    <ListItemButton onClick={() => handleSelectClient(client)}>
                      <ListItemText
                        primary={
                          <Box>
                            <Typography variant="body1" fontWeight="bold">
                              {client.civilite ? `${client.civilite} ` : ''}
                              {client.name} {client.surname}
                            </Typography>
                          </Box>
                        }
                        secondary={
                          <Box>
                            {client.client_mail && (
                              <Typography variant="body2" color="text.secondary">
                                📧 {client.client_mail}
                              </Typography>
                            )}
                            {client.phone_Number && (
                              <Typography variant="body2" color="text.secondary">
                                📞 {client.phone_Number}
                              </Typography>
                            )}
                            {client.poste && (
                              <Typography variant="body2" color="text.secondary">
                                💼 {client.poste}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItemButton>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))
            )}
          </List>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Annuler</Button>
      </DialogActions>
    </Dialog>
  );
};

export default SelectClientModal;
