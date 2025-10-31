import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions,
  ButtonGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SpecialLinePreview from './SpecialLinePreview';
import BaseCalculationSelector from './BaseCalculationSelector';
import ColorPicker from './ColorPicker';

const SpecialLinesCreator = ({ 
  open,
  onClose,
  onAddPendingLine, 
  formatMontantEspace,
  selectedParties,
  calculatePartieTotal,
  calculateSousPartieTotal,
  calculatePrice,
  calculateGlobalTotal
}) => {
  const [newLine, setNewLine] = useState({
    description: "",
    value: "",
    valueType: "fixed",
    type: "reduction",
    isHighlighted: false,
    baseCalculation: null,
    styles: {}
  });
  
  const [showBaseSelector, setShowBaseSelector] = useState(false);
  
  // Quand l'utilisateur change valueType vers "percentage"
  const handleValueTypeChange = (valueType) => {
    setNewLine(prev => ({ ...prev, valueType }));
    
    if (valueType === 'percentage') {
      // Ouvrir le sélecteur
      setShowBaseSelector(true);
    } else {
      // Nettoyer la base si on revient à "fixe"
      setNewLine(prev => ({ ...prev, baseCalculation: null }));
    }
  };
  
  // Quand l'utilisateur sélectionne une base
  const handleBaseSelected = (base) => {
    setNewLine(prev => ({
      ...prev,
      baseCalculation: {
        type: base.type,
        path: base.path,
        label: base.label,
        amount: base.amount
      }
    }));
    setShowBaseSelector(false);
  };
  
  // Valider et ajouter à pending
  const handleAddToPending = () => {
    if (!newLine.description || !newLine.value) {
      alert("Veuillez remplir la description et la valeur");
      return;
    }
    
    // Si percentage sans base, refuser
    if (newLine.valueType === 'percentage' && !newLine.baseCalculation) {
      alert("Veuillez sélectionner une base de calcul pour le pourcentage");
      return;
    }
    
    const lineToAdd = {
      id: `pending_${Date.now()}`,
      data: {
        description: newLine.description,
        value: parseFloat(newLine.value),
        valueType: newLine.valueType,
        type: newLine.type,
        isHighlighted: newLine.isHighlighted
      },
      baseCalculation: newLine.baseCalculation,
      styles: newLine.styles,
      position: null // Sera défini lors du drop
    };
    
    onAddPendingLine(lineToAdd);
    
    // Réinitialiser
    setNewLine({
      description: "",
      value: "",
      valueType: "fixed",
      type: "reduction",
      isHighlighted: false,
      baseCalculation: null,
      styles: {}
    });
    
    // Fermer le modal
    onClose();
  };
  
  const handleStylesChange = (styleKey, value) => {
    setNewLine(prev => ({
      ...prev,
      styles: {
        ...prev.styles,
        [styleKey]: value
      }
    }));
  };
  
  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Créer une ligne spéciale</DialogTitle>
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
               
              </Typography>
              <SpecialLinePreview
                line={{
                  description: newLine.description,
                  value: newLine.value,
                  valueType: newLine.valueType,
                  type: newLine.type,
                  baseCalculation: newLine.baseCalculation,
                  styles: newLine.styles
                }}
                formatAmount={formatMontantEspace}
              />
            </Box>
            
            {/* Formulaire */}
            <TextField
              label="Description"
              fullWidth
              margin="normal"
              value={newLine.description}
              onChange={(e) => setNewLine(prev => ({ ...prev, description: e.target.value }))}
            />
            
            <TextField
              type="number"
              label="Valeur"
              fullWidth
              margin="normal"
              value={newLine.value}
              onChange={(e) => setNewLine(prev => ({ ...prev, value: e.target.value }))}
            />
            
            {/* Type de valeur avec boutons */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" gutterBottom sx={{ fontSize: '13px', fontWeight: 'bold' }}>
                Type de valeur
              </Typography>
              <ButtonGroup fullWidth>
                <Button 
                  variant={newLine.valueType === "fixed" ? "contained" : "outlined"}
                  onClick={() => handleValueTypeChange("fixed")}
                  size="small"
                >
                  € Montant fixe
                </Button>
                <Button 
                  variant={newLine.valueType === "percentage" ? "contained" : "outlined"}
                  onClick={() => handleValueTypeChange("percentage")}
                  size="small"
                >
                  % Pourcentage
                </Button>
              </ButtonGroup>
            </Box>
            
            {/* Affichage de la base sélectionnée */}
            {newLine.baseCalculation && (
              <Box sx={{ mt: 1, p: 1.5, backgroundColor: '#e8f5e9', borderRadius: '4px', border: '1px solid #4caf50' }}>
                <Typography variant="body2" sx={{ fontSize: '13px' }}>
                  Base : {newLine.baseCalculation.label}
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => setShowBaseSelector(true)}
                  sx={{ mt: 0.5 }}
                >
                  Changer
                </Button>
              </Box>
            )}
            
            {/* Type d'opération avec boutons */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" gutterBottom sx={{ fontSize: '13px', fontWeight: 'bold' }}>
                Type d'opération
              </Typography>
              <ButtonGroup fullWidth>
                <Button 
                  variant={newLine.type === "reduction" ? "contained" : "outlined"}
                  onClick={() => setNewLine(prev => ({ ...prev, type: "reduction" }))}
                  size="small"
                >
                  - Réduction
                </Button>
                <Button 
                  variant={newLine.type === "addition" ? "contained" : "outlined"}
                  onClick={() => setNewLine(prev => ({ ...prev, type: "addition" }))}
                  size="small"
                >
                  + Addition
                </Button>
                <Button 
                  variant={newLine.type === "display" ? "contained" : "outlined"}
                  onClick={() => setNewLine(prev => ({ ...prev, type: "display" }))}
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
                      variant={newLine.styles?.fontWeight === 'bold' ? "contained" : "outlined"}
                      onClick={() => handleStylesChange('fontWeight', newLine.styles?.fontWeight === 'bold' ? 'normal' : 'bold')}
                      size="small"
                    >
                      B
                    </Button>
                    <Button
                      variant={newLine.styles?.fontStyle === 'italic' ? "contained" : "outlined"}
                      onClick={() => handleStylesChange('fontStyle', newLine.styles?.fontStyle === 'italic' ? 'normal' : 'italic')}
                      size="small"
                    >
                      I
                    </Button>
                    <Button
                      variant={newLine.styles?.textDecoration === 'underline' ? "contained" : "outlined"}
                      onClick={() => handleStylesChange('textDecoration', newLine.styles?.textDecoration === 'underline' ? 'none' : 'underline')}
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
                      value={newLine.styles?.color || '#000000'}
                      onChange={(value) => handleStylesChange('color', value)}
                    />
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <ColorPicker
                      label="Couleur de fond"
                      value={newLine.styles?.backgroundColor || '#ffffff'}
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
                      variant={newLine.styles?.textAlign === 'left' ? "contained" : "outlined"}
                      onClick={() => handleStylesChange('textAlign', 'left')}
                      size="small"
                    >
                      ← Gauche
                    </Button>
                    <Button
                      variant={newLine.styles?.textAlign === 'center' ? "contained" : "outlined"}
                      onClick={() => handleStylesChange('textAlign', 'center')}
                      size="small"
                    >
                      ↔ Centre
                    </Button>
                    <Button
                      variant={newLine.styles?.textAlign === 'right' ? "contained" : "outlined"}
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
          <Button 
            onClick={handleAddToPending} 
            variant="contained" 
            color="primary"
            disabled={!newLine.description || !newLine.value}
          >
            Créer la ligne
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Modal de sélection de base */}
      <BaseCalculationSelector
        open={showBaseSelector}
        onClose={() => setShowBaseSelector(false)}
        onSelect={handleBaseSelected}
        parties={selectedParties}
        calculatePartieTotal={calculatePartieTotal}
        calculateSousPartieTotal={calculateSousPartieTotal}
        calculatePrice={calculatePrice}
        calculateGlobalTotal={calculateGlobalTotal}
        formatMontantEspace={formatMontantEspace}
      />
    </>
  );
};

export default SpecialLinesCreator;
