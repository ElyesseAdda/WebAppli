import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box } from '@mui/material';
import axios from 'axios';

const ColorModal = ({ open, onClose, onSave, color }) => {
  const [name, setName] = useState('');
  
  const handleSave = () => {
    if (!name.trim()) {
      alert('Veuillez donner un nom à la couleur');
      return;
    }
    
    // Sauvegarder la couleur
    axios.post('/api/colors/', {
      name: name.trim(),
      hex_value: color
    })
      .then(res => {
        onSave();
      })
      .catch(err => {
        alert('Erreur lors de la sauvegarde de la couleur');
      });
  };
  
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Sauvegarder couleur</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Nom de la couleur"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Bleu clair, Rouge alerte..."
        />
        
        <Box sx={{ 
          mt: 2, 
          p: 2, 
          backgroundColor: color,
          borderRadius: '4px',
          border: '1px solid #ccc',
          minHeight: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666',
          fontSize: '14px'
        }}>
          {color.toUpperCase()}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Sauvegarder
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColorModal;

