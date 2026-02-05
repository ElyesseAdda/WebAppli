import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  IconButton,
  Alert,
  Snackbar,
} from '@mui/material';
import { MdAdd, MdEdit, MdDelete, MdPerson } from 'react-icons/md';
import axios from 'axios';
import { COLORS } from '../constants/colors';

const ContactSocieteModal = ({ open, onClose, societeId, societeName, onContactChange }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openContactFormModal, setOpenContactFormModal] = useState(false);
  const [editingContact, setEditingContact] = useState(null);
  const [contactFormData, setContactFormData] = useState({
    nom: '',
    prenom: '',
    civilite: '',
    poste: '',
    email: '',
    telephone: '',
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success',
  });

  const CIVILITE_CHOICES = [
    { value: '', label: '' },
    { value: 'M.', label: 'Monsieur' },
    { value: 'Mme', label: 'Madame' },
    { value: 'Mlle', label: 'Mademoiselle' },
  ];

  useEffect(() => {
    if (open && societeId) {
      fetchContacts();
    }
  }, [open, societeId]);

  const fetchContacts = async () => {
    if (!societeId) return;
    try {
      setLoading(true);
      const response = await axios.get(`/api/contacts-societe/?societe=${societeId}`);
      setContacts(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
      showSnackbar('Erreur lors du chargement des contacts', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleOpenContactFormModal = (contact = null) => {
    setEditingContact(contact);
    if (contact) {
      setContactFormData({
        nom: contact.nom || '',
        prenom: contact.prenom || '',
        civilite: contact.civilite || '',
        poste: contact.poste || '',
        email: contact.email || '',
        telephone: contact.telephone || '',
      });
    } else {
      setContactFormData({
        nom: '',
        prenom: '',
        civilite: '',
        poste: '',
        email: '',
        telephone: '',
      });
    }
    setOpenContactFormModal(true);
  };

  const handleCloseContactFormModal = () => {
    setOpenContactFormModal(false);
    setEditingContact(null);
    setContactFormData({
      nom: '',
      prenom: '',
      civilite: '',
      poste: '',
      email: '',
      telephone: '',
    });
  };

  const handleContactInputChange = (e) => {
    const { name, value } = e.target;
    setContactFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (!societeId) {
      showSnackbar('Aucune société sélectionnée', 'error');
      return;
    }

    try {
      const dataToSend = {
        ...contactFormData,
        societe: societeId,
      };

      if (editingContact) {
        await axios.put(`/api/contacts-societe/${editingContact.id}/`, dataToSend);
        showSnackbar('Contact modifié avec succès', 'success');
      } else {
        await axios.post('/api/contacts-societe/', dataToSend);
        showSnackbar('Contact créé avec succès', 'success');
      }
      
      handleCloseContactFormModal();
      await fetchContacts();
      if (onContactChange) {
        onContactChange();
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du contact:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.nom?.[0] ||
                          'Erreur lors de la sauvegarde du contact';
      showSnackbar(errorMessage, 'error');
    }
  };

  const handleDeleteContact = async (contactId) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) {
      try {
        await axios.delete(`/api/contacts-societe/${contactId}/`);
        showSnackbar('Contact supprimé avec succès', 'success');
        await fetchContacts();
        if (onContactChange) {
          onContactChange();
        }
      } catch (error) {
        console.error('Erreur lors de la suppression du contact:', error);
        showSnackbar('Erreur lors de la suppression du contact', 'error');
      }
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MdPerson />
            <Typography variant="h6">
              Contacts de la société : {societeName || 'N/A'}
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              {contacts.length} contact{contacts.length > 1 ? 's' : ''} enregistré{contacts.length > 1 ? 's' : ''}
            </Typography>
            <Button
              variant="contained"
              startIcon={<MdAdd />}
              onClick={() => handleOpenContactFormModal()}
              size="small"
            >
              Ajouter un Contact
            </Button>
          </Box>

          {loading ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography>Chargement...</Typography>
            </Box>
          ) : contacts.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Aucun contact pour cette société
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {contacts.map((contact) => (
                <Box
                  key={contact.id}
                  sx={{
                    p: 2,
                    border: '1px solid #e0e0e0',
                    borderRadius: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                      {contact.civilite ? `${contact.civilite} ` : ''}
                      {contact.prenom ? `${contact.prenom} ` : ''}
                      {contact.nom}
                      {contact.poste && ` - ${contact.poste}`}
                    </Typography>
                    {contact.email && (
                      <Typography variant="body2" color="text.secondary">
                        📧 {contact.email}
                      </Typography>
                    )}
                    {contact.telephone && (
                      <Typography variant="body2" color="text.secondary">
                        📞 {contact.telephone}
                      </Typography>
                    )}
                  </Box>
                  <Box>
                    <IconButton
                      color="primary"
                      onClick={() => handleOpenContactFormModal(contact)}
                      size="small"
                      sx={{ mr: 1 }}
                      title="Modifier"
                    >
                      <MdEdit />
                    </IconButton>
                    <IconButton
                      color="error"
                      onClick={() => handleDeleteContact(contact.id)}
                      size="small"
                      title="Supprimer"
                    >
                      <MdDelete />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={onClose} color="inherit">
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal de création/édition de contact */}
      <Dialog open={openContactFormModal} onClose={handleCloseContactFormModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingContact ? 'Modifier le Contact' : 'Nouveau Contact'}
        </DialogTitle>
        <form onSubmit={handleContactSubmit}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <FormControl fullWidth>
                <InputLabel>Civilité</InputLabel>
                <Select
                  name="civilite"
                  value={contactFormData.civilite}
                  onChange={handleContactInputChange}
                  label="Civilité"
                >
                  {CIVILITE_CHOICES.map((choice) => (
                    <MenuItem key={choice.value} value={choice.value}>
                      {choice.label || '(Aucune)'}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField
                name="nom"
                label="Nom *"
                value={contactFormData.nom}
                onChange={handleContactInputChange}
                required
                fullWidth
                variant="outlined"
              />
              <TextField
                name="prenom"
                label="Prénom"
                value={contactFormData.prenom}
                onChange={handleContactInputChange}
                fullWidth
                variant="outlined"
              />
              <TextField
                name="poste"
                label="Poste"
                value={contactFormData.poste}
                onChange={handleContactInputChange}
                fullWidth
                variant="outlined"
              />
              <TextField
                name="email"
                label="Email"
                type="email"
                value={contactFormData.email}
                onChange={handleContactInputChange}
                fullWidth
                variant="outlined"
              />
              <TextField
                name="telephone"
                label="Téléphone"
                value={contactFormData.telephone}
                onChange={handleContactInputChange}
                fullWidth
                variant="outlined"
              />
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3 }}>
            <Button onClick={handleCloseContactFormModal} color="inherit">
              Annuler
            </Button>
            <Button
              type="submit"
              variant="contained"
              sx={{
                backgroundColor: COLORS.infoDark,
                '&:hover': {
                  backgroundColor: COLORS.infoDark,
                },
              }}
            >
              {editingContact ? 'Modifier' : 'Créer'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default ContactSocieteModal;

