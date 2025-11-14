import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Box,
  ButtonGroup
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SpecialLinePreview from './SpecialLinePreview';
import ColorPicker from './ColorPicker';

const SpecialLineEditModal = ({ 
  open, 
  line, 
  onClose, 
  onSave,
  formatMontantEspace,
  selectedParties,
  calculatePartieTotal,
  calculateSousPartieTotal,
  calculatePrice,
  calculateGlobalTotal
}) => {
  const [editedLine, setEditedLine] = useState(null);
  
  useEffect(() => {
    if (line) {
      // Normaliser la structure : gérer les deux formats possibles
      // Format 1: { data: { description, value, ... }, baseCalculation, styles }
      // Format 2: { description, value, value_type, type_speciale, baseCalculation, styles }
      const normalizedLine = line.data 
        ? line // Déjà au bon format
        : {
            // Convertir le format plat en format avec data
            data: {
              description: line.description || '',
              value: line.value || 0,
              valueType: line.value_type || line.valueType || 'fixed',
              type: line.type_speciale || line.type || 'addition'
            },
            baseCalculation: line.baseCalculation || line.base_calculation || null,
            styles: line.styles || {},
            // Conserver les autres propriétés importantes
            id: line.id,
            type: line.type,
            context_type: line.context_type,
            context_id: line.context_id,
            index_global: line.index_global
          };
      setEditedLine(normalizedLine);
    }
  }, [line]);
  
  if (!editedLine || !editedLine.data) return null;
  
  const handleStylesChange = (styleKey, value) => {
    setEditedLine(prev => ({
      ...prev,
      styles: {
        ...prev.styles,
        [styleKey]: value
      }
    }));
  };
  
  const handleSave = () => {
    // S'assurer que toutes les propriétés sont présentes pour la sauvegarde
    const lineToSave = {
      ...editedLine,
      // S'assurer que data existe
      data: editedLine.data || {
        description: editedLine.description || '',
        value: editedLine.value || 0,
        valueType: editedLine.valueType || editedLine.value_type || 'fixed',
        type: editedLine.type || editedLine.type_speciale || 'addition'
      }
    };
    onSave(lineToSave);
    onClose();
  };
  
  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Éditer ligne spéciale</DialogTitle>
        <DialogContent sx={{ maxHeight: '80vh', overflow: 'auto' }}>
          <Box sx={{ display: 'flex', gap: 2, flexDirection: 'column' }}>
            {/* Aperçu en haut toujours visible */}
            <Box sx={{ 
              position: 'sticky', 
              top: 0, 
              backgroundColor: 'white', 
              zIndex: 10,
              pb: 2,
              borderBottom: '2px solid #e0e0e0',
              mb: 2
            }}>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 'bold', color: '#666' }}>
                📋 Aperçu
              </Typography>
              <SpecialLinePreview
                line={{
                  description: editedLine.data.description,
                  value: editedLine.data.value,
                  valueType: editedLine.data.valueType,
                  type: editedLine.data.type,
                  baseCalculation: editedLine.baseCalculation,
                  styles: editedLine.styles
                }}
                formatAmount={formatMontantEspace}
              />
            </Box>
            
            {/* Inputs de base */}
            <TextField
              label="Description"
              fullWidth
              margin="normal"
              value={editedLine.data.description}
              onChange={(e) => setEditedLine(prev => ({
                ...prev,
                data: { ...prev.data, description: e.target.value }
              }))}
            />
            
            <TextField
              type="number"
              label="Valeur"
              fullWidth
              margin="normal"
              value={editedLine.data.value}
              onChange={(e) => setEditedLine(prev => ({
                ...prev,
                data: { ...prev.data, value: e.target.value }
              }))}
            />
            
            {/* Type de valeur avec boutons */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" gutterBottom sx={{ fontSize: '13px', fontWeight: 'bold' }}>
                Type de valeur
              </Typography>
              <ButtonGroup fullWidth>
                <Button 
                  variant={editedLine.data.valueType === "fixed" ? "contained" : "outlined"}
                  onClick={() => setEditedLine(prev => ({ ...prev, data: { ...prev.data, valueType: "fixed" }, baseCalculation: null }))}
                  size="small"
                >
                  € Montant fixe
                </Button>
                <Button 
                  variant={editedLine.data.valueType === "percentage" ? "contained" : "outlined"}
                  onClick={() => setEditedLine(prev => ({ ...prev, data: { ...prev.data, valueType: "percentage" } }))}
                  size="small"
                >
                  % Pourcentage
                </Button>
              </ButtonGroup>
            </Box>
            
            {/* Affichage de la base sélectionnée (lecture seule en édition) */}
            {editedLine.baseCalculation && (
              <Box sx={{ mt: 1, p: 1.5, backgroundColor: '#e8f5e9', borderRadius: '4px', border: '1px solid #4caf50' }}>
                <Typography variant="body2" sx={{ fontSize: '13px' }}>
                  <strong>Base :</strong> {editedLine.baseCalculation.label}
                </Typography>
                <Typography variant="caption" sx={{ fontSize: '11px', color: '#666', mt: 0.5, display: 'block' }}>
                  💡 Pour changer la base, recréez la ligne
                </Typography>
              </Box>
            )}
            
            {/* Type d'opération avec boutons */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" gutterBottom sx={{ fontSize: '13px', fontWeight: 'bold' }}>
                Type d'opération
              </Typography>
              <ButtonGroup fullWidth>
                <Button 
                  variant={editedLine.data.type === "reduction" ? "contained" : "outlined"}
                  onClick={() => setEditedLine(prev => ({ ...prev, data: { ...prev.data, type: "reduction" } }))}
                  size="small"
                >
                  - Réduction
                </Button>
                <Button 
                  variant={editedLine.data.type === "addition" ? "contained" : "outlined"}
                  onClick={() => setEditedLine(prev => ({ ...prev, data: { ...prev.data, type: "addition" } }))}
                  size="small"
                >
                  + Addition
                </Button>
                <Button 
                  variant={editedLine.data.type === "display" ? "contained" : "outlined"}
                  onClick={() => setEditedLine(prev => ({ ...prev, data: { ...prev.data, type: "display" } }))}
                  size="small"
                >
                  📋 Affichage
                </Button>
              </ButtonGroup>
            </Box>
            
            {/* Styles personnalisés */}
            <Accordion sx={{ mt: 2 }}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography sx={{ fontWeight: 'bold' }}>Styles personnalisés</Typography>
              </AccordionSummary>
              <AccordionDetails>
                {/* Style de texte */}
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" gutterBottom sx={{ fontSize: '13px', fontWeight: 'bold' }}>
                    Style de texte
                  </Typography>
                  <ButtonGroup>
                    <Button
                      variant={editedLine.styles?.fontWeight === 'bold' ? "contained" : "outlined"}
                      onClick={() => handleStylesChange('fontWeight', editedLine.styles?.fontWeight === 'bold' ? 'normal' : 'bold')}
                      size="small"
                    >
                      B
                    </Button>
                    <Button
                      variant={editedLine.styles?.fontStyle === 'italic' ? "contained" : "outlined"}
                      onClick={() => handleStylesChange('fontStyle', editedLine.styles?.fontStyle === 'italic' ? 'normal' : 'italic')}
                      size="small"
                    >
                      I
                    </Button>
                    <Button
                      variant={editedLine.styles?.textDecoration === 'underline' ? "contained" : "outlined"}
                      onClick={() => handleStylesChange('textDecoration', editedLine.styles?.textDecoration === 'underline' ? 'none' : 'underline')}
                      size="small"
                    >
                      U
                    </Button>
                  </ButtonGroup>
                </Box>
                
                {/* Couleurs sur une ligne */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <ColorPicker
                      label="Couleur du texte"
                      value={editedLine.styles?.color || '#000000'}
                      onChange={(value) => handleStylesChange('color', value)}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <ColorPicker
                      label="Couleur de fond"
                      value={editedLine.styles?.backgroundColor || '#ffffff'}
                      onChange={(value) => handleStylesChange('backgroundColor', value)}
                    />
                  </Box>
                </Box>
                
                {/* Alignement */}
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" gutterBottom sx={{ fontSize: '13px', fontWeight: 'bold' }}>
                    Alignement
                  </Typography>
                  <ButtonGroup fullWidth>
                    <Button
                      variant={editedLine.styles?.textAlign === 'left' ? "contained" : "outlined"}
                      onClick={() => handleStylesChange('textAlign', 'left')}
                      size="small"
                    >
                      ← Gauche
                    </Button>
                    <Button
                      variant={editedLine.styles?.textAlign === 'center' ? "contained" : "outlined"}
                      onClick={() => handleStylesChange('textAlign', 'center')}
                      size="small"
                    >
                      ↔ Centre
                    </Button>
                    <Button
                      variant={editedLine.styles?.textAlign === 'right' ? "contained" : "outlined"}
                      onClick={() => handleStylesChange('textAlign', 'right')}
                      size="small"
                    >
                      → Droite
                    </Button>
                  </ButtonGroup>
                </Box>
              </AccordionDetails>
            </Accordion>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Annuler</Button>
          <Button onClick={handleSave} variant="contained" color="primary">
            Sauvegarder
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SpecialLineEditModal;

