import React, { useState, useEffect } from 'react';
import { Box, Button, Typography } from '@mui/material';
import axios from 'axios';
import ColorModal from './ColorModal';

const ColorPicker = ({ value, onChange, label }) => {
  const [customColors, setCustomColors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const currentColor = value || '#000000';
  
  // Charger les couleurs de l'utilisateur
  useEffect(() => {
    axios.get('/api/colors/')
      .then(res => setCustomColors(res.data))
      .catch(err => console.error('Erreur chargement couleurs:', err));
  }, []);
  
  const handleColorSelect = (color) => {
    // Utiliser hex_value (depuis DB) ou value (pour couleurs de base)
    const colorValue = color.hex_value || color.value;
    onChange(colorValue);
    // Incrémenter le compteur si c'est une couleur enregistrée
    if (color.id) {
      axios.post(`/api/colors/${color.id}/increment/`)
        .catch(err => console.error('Erreur incrémentation:', err));
    }
  };
  
  const handleSaveCurrentColor = () => {
    // Ouvrir modal pour nommer la couleur
    setShowModal(true);
  };
  
  const handleColorSaved = () => {
    // Recharger les couleurs
    axios.get('/api/colors/')
      .then(res => setCustomColors(res.data))
      .catch(err => console.error('Erreur chargement couleurs:', err));
    setShowModal(false);
  };
  
  return (
    <Box sx={{ mt: 1, mb: 1 }}>
      {label && (
        <Typography variant="body2" sx={{ mb: 1, fontWeight: '500', fontSize: '13px' }}>
          {label}
        </Typography>
      )}
      
      {/* Couleurs personnalisées uniquement */}
      {customColors.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          flexWrap: 'wrap',
          gap: 0.5, 
          mb: 1.5 
        }}>
          {customColors.map(color => (
            <Box
              key={color.id}
              onClick={() => handleColorSelect(color)}
              sx={{
                width: '32px',
                height: '32px',
                backgroundColor: color.hex_value,
                border: currentColor === color.hex_value ? '2px solid #1976d2' : '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                position: 'relative',
                '&:hover': {
                  opacity: 0.8,
                  transform: 'scale(1.1)'
                },
                transition: 'all 0.2s ease'
              }}
              title={`${color.name} (${color.usage_count} utilisations)`}
            >
              {currentColor === color.hex_value && (
                <Box sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  color: '#1976d2',
                  fontSize: '16px',
                  fontWeight: 'bold'
                }}>
                  ✓
                </Box>
              )}
            </Box>
          ))}
        </Box>
      )}
      
      {/* Color picker HTML5 compact */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <input
          type="color"
          value={currentColor}
          onChange={(e) => onChange(e.target.value)}
          style={{ 
            width: '50px', 
            height: '40px',
            borderRadius: '4px',
            border: '1px solid #ccc',
            cursor: 'pointer'
          }}
        />
        <Button 
          variant="outlined"
          size="small"
          onClick={handleSaveCurrentColor}
          sx={{ 
            fontSize: '12px',
            padding: '6px 12px'
          }}
        >
          💾 Sauvegarder
        </Button>
      </Box>
      
      {/* Modal pour sauvegarder */}
      <ColorModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleColorSaved}
        color={currentColor}
      />
    </Box>
  );
};

export default ColorPicker;
