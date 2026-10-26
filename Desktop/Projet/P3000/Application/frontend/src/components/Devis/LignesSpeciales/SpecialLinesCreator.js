import React, { useState, useEffect } from 'react';
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
import ColorPicker from './ColorPicker';

const SpecialLinesCreator = ({ 
  open,
  onClose,
  onAddPendingLine, 
  formatMontantEspace,
  calculatePartieTotal,
  calculateSousPartieTotal,
  calculateGlobalTotal,
  calculateGlobalTotalExcludingLine,
  total_ht,
  devisItems,
  pendingLineForBase,
  onClearPendingLineForBase
}) => {
  const [newLine, setNewLine] = useState({
    description: "",
    value: "",
    valueType: "fixed",
    type: "reduction",
    isHighlighted: false,
    baseCalculation: null,
    styles: {},
    // Nouveau : placement fixe
    placementType: "global",  // "global", "partie", "sous_partie"
    placementPartieId: null,
    placementSousPartieId: null,
    placementPosition: "end"  // "end", "before_X", "after_X"
  });
  
  // Pré-remplir le formulaire quand pendingLineForBase existe
  useEffect(() => {
    if (pendingLineForBase && open) {
      // Convertir data en propriétés directes si nécessaire
      const lineData = pendingLineForBase.data || pendingLineForBase;
      
      // ✅ Extraire valueType depuis data.valueType (priorité) ou depuis pendingLineForBase directement
      // pendingLineForBase peut avoir la structure : { data: { valueType: "percentage" }, ... }
      const valueType = pendingLineForBase.data?.valueType || lineData.valueType || "fixed";
      
      setNewLine({
        description: lineData.description || "",
        value: lineData.value !== undefined ? lineData.value : "",
        valueType: valueType, // ✅ Utiliser la valeur extraite correctement
        type: lineData.type || "reduction",
        isHighlighted: lineData.isHighlighted || false,
        baseCalculation: pendingLineForBase.baseCalculation || null,
        styles: pendingLineForBase.styles || {},
        placementType: "global",
        placementPartieId: null,
        placementSousPartieId: null,
        placementPosition: "end"
      });
    } else if (!pendingLineForBase && open) {
      // Réinitialiser le formulaire si le modal s'ouvre sans pendingLineForBase
      setNewLine({
        description: "",
        value: "",
        valueType: "fixed",
        type: "reduction",
        isHighlighted: false,
        baseCalculation: null,
        styles: {},
        placementType: "global",
        placementPartieId: null,
        placementSousPartieId: null,
        placementPosition: "end"
      });
    }
  }, [pendingLineForBase, open]);
  
  
  // Valider et ajouter à pending
  const handleAddToPending = () => {
    // Validation de la description (toujours obligatoire)
    if (!newLine.description) {
      alert("Veuillez remplir la description");
      return;
    }
    
    // Validation de la valeur (sauf pour les lignes d'affichage)
    if (newLine.valueType !== "display" && !newLine.value) {
      alert("Veuillez remplir la valeur");
      return;
    }
    
    // Si percentage sans base, refuser
    if (newLine.valueType === 'percentage' && !newLine.baseCalculation) {
      alert("Veuillez sélectionner une base de calcul pour le pourcentage");
      return;
    }
    
    // Préparer baseCalculation SANS amount (pour calcul dynamique)
    const baseCalculationToSave = newLine.baseCalculation ? {
      type: newLine.baseCalculation.type,
      id: newLine.baseCalculation.id,
      label: newLine.baseCalculation.label
      // ❌ Ne PAS sauvegarder amount pour forcer le calcul dynamique
    } : null;

    const lineToAdd = {
      id: Date.now().toString(),
      data: {
        description: newLine.description,
        value: newLine.valueType === "display" ? (newLine.value ? parseFloat(newLine.value) : 0) : parseFloat(newLine.value), // Valeur optionnelle pour les lignes d'affichage
        valueType: newLine.valueType,
        type: newLine.type,
        isHighlighted: newLine.isHighlighted
      },
      baseCalculation: baseCalculationToSave,
      styles: newLine.styles,
      // Nouveau : placement fixe
      placement: {
        type: newLine.placementType,
        partieId: newLine.placementPartieId,
        sousPartieId: newLine.placementSousPartieId,
        position: newLine.placementPosition
      }
    };
    
    onAddPendingLine(lineToAdd);
    
    // Nettoyer pendingLineForBase si on vient d'une sélection de base
    if (onClearPendingLineForBase) {
      onClearPendingLineForBase();
    }
    
    // Réinitialiser
    setNewLine({
      description: "",
      value: "",
      valueType: "fixed",
      type: "reduction",
      isHighlighted: false,
      baseCalculation: null,
      styles: {},
      placementType: "global",
      placementPartieId: null,
      placementSousPartieId: null,
      placementPosition: "end"
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
                devisItems={devisItems}
                calculatePartieTotal={calculatePartieTotal}
                calculateSousPartieTotal={calculateSousPartieTotal}
                calculateGlobalTotal={calculateGlobalTotal}
                calculateGlobalTotalExcludingLine={calculateGlobalTotalExcludingLine}
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
            
            {/* Info placement visuel */}
            <Box sx={{ mt: 2, p: 2, border: '2px solid #2196f3', borderRadius: 1, backgroundColor: '#e3f2fd' }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold', color: '#1565c0' }}>
                📍 Placement de la ligne
              </Typography>
              
              <Typography variant="body2" sx={{ color: '#555' }}>
                Après avoir créé la ligne, cliquez sur une <span style={{ 
                  backgroundColor: '#2196f3', 
                  color: 'white', 
                  padding: '2px 8px', 
                  borderRadius: '4px',
                  fontWeight: 'bold',
                  fontSize: '12px'
                }}>zone bleue</span> dans le tableau pour choisir précisément où la placer.
              </Typography>
            </Box>
            
            <TextField
              type="text"
              inputMode="decimal"
              label="Valeur"
              fullWidth
              margin="normal"
              value={newLine.value}
              onChange={(e) => {
                let value = e.target.value;
                // Remplacer la virgule par un point
                value = value.replace(',', '.');
                // Empêcher les valeurs négatives
                if (value === '' || (parseFloat(value) >= 0 && /^-?\d*\.?\d*$/.test(value))) {
                  setNewLine(prev => ({ ...prev, value: value }));
                }
              }}
              helperText={newLine.valueType === "display" ? "Valeur optionnelle pour les lignes d'affichage (laisser vide ou 0 pour ne pas afficher de montant)" : ""}
            />
            
            {/* Type de valeur avec boutons */}
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" gutterBottom sx={{ fontSize: '13px', fontWeight: 'bold' }}>
                Type de valeur
              </Typography>
              <ButtonGroup fullWidth>
                <Button 
                  variant={newLine.valueType === "fixed" ? "contained" : "outlined"}
                  onClick={() => setNewLine(prev => ({ ...prev, valueType: "fixed", baseCalculation: null }))}
                  size="small"
                >
                  € Montant fixe
                </Button>
                <Button 
                  variant={newLine.valueType === "percentage" ? "contained" : "outlined"}
                  onClick={() => {
                    // Mettre à jour avec la nouvelle valeur
                    const updatedLine = { ...newLine, valueType: "percentage" };
                    setNewLine(updatedLine);
                    // Si pas de base définie, fermer le modal et activer la sélection
                    if (!updatedLine.baseCalculation) {
                      setTimeout(() => {
                        onClose();
                        // Utiliser la ligne mise à jour, pas newLine (qui n'est pas encore mis à jour)
                        onAddPendingLine({
                          ...updatedLine,
                          id: Date.now().toString(),
                          data: {
                            description: updatedLine.description,
                            value: updatedLine.value,
                            valueType: updatedLine.valueType,
                            type: updatedLine.type,
                            isHighlighted: updatedLine.isHighlighted
                          }
                        }, true); // true = requiresBaseSelection
                      }, 100);
                    }
                  }}
                  size="small"
                >
                  % Pourcentage
                </Button>
                <Button 
                  variant={newLine.valueType === "display" ? "contained" : "outlined"}
                  onClick={() => {
                    setNewLine(prev => ({ 
                      ...prev, 
                      valueType: "display",
                      type: "display", // Mettre automatiquement le type à display aussi
                      value: "" // Vider la valeur pour les lignes d'affichage
                    }));
                  }}
                  size="small"
                >
                  📋 Affichage
                </Button>
              </ButtonGroup>
            </Box>
            
            {/* Affichage de la base sélectionnée pour les pourcentages */}
            {newLine.valueType === "percentage" && (
              <Box sx={{ mt: 2 }}>
                {newLine.baseCalculation ? (
                  <Box sx={{ mt: 1, p: 1.5, backgroundColor: '#e8f5e9', borderRadius: '4px', border: '1px solid #4caf50' }}>
                    <Typography variant="body2" sx={{ fontSize: '13px', mb: 1 }}>
                      <strong>Base sélectionnée :</strong> {newLine.baseCalculation.label}
                    </Typography>
                    <Button 
                      size="small" 
                      onClick={() => {
                        onClose();
                        onAddPendingLine(newLine, true); // true = requiresBaseSelection
                      }}
                      variant="outlined"
                      color="primary"
                      fullWidth
                    >
                      🎯 Changer la base
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ mt: 1, p: 1.5, backgroundColor: '#fff3cd', borderRadius: '4px', border: '1px solid #ffc107' }}>
                    <Typography variant="body2" sx={{ fontSize: '12px', color: '#856404' }}>
                      💡 Cliquez sur le Montant HT total, une partie ou sous-partie dans le tableau pour sélectionner la base de calcul
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
            
            {/* Type d'opération avec boutons - masqué si valueType est "display" */}
            {newLine.valueType !== "display" && (
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
                </ButtonGroup>
              </Box>
            )}
            
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
            disabled={
              !newLine.description || 
              (newLine.valueType !== "display" && !newLine.value)
            }
          >
            Créer la ligne
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default SpecialLinesCreator;
