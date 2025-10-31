import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, Button, Box, Typography } from '@mui/material';

const BaseCalculationSelector = ({ 
  open, 
  onClose, 
  onSelect,
  parties,
  calculatePartieTotal,
  calculateSousPartieTotal,
  calculatePrice,
  calculateGlobalTotal,
  formatMontantEspace
}) => {
  const [highlightedElement, setHighlightedElement] = useState(null);
  
  // Liste de tous les montants cliquables
  const selectableItems = [
    // Total global
    {
      id: 'global_total',
      label: '💰 TOTAL GLOBAL HT',
      amount: calculateGlobalTotal ? calculateGlobalTotal(parties) : 0,
      type: 'global',
      path: 'global'
    },
    // Parties
    ...parties.map(partie => ({
      id: `partie_${partie.id}`,
      label: `📁 ${partie.titre}`,
      amount: calculatePartieTotal ? calculatePartieTotal(partie) : 0,
      type: 'partie',
      path: `partie_${partie.id}`,
      partieId: partie.id
    })),
    // Sous-parties
    ...parties.flatMap(partie => 
      (partie.selectedSousParties || []).map(sp => ({
        id: `sous_partie_${sp.id}`,
        label: `📂 ${sp.titre}`,
        amount: calculateSousPartieTotal ? calculateSousPartieTotal(sp) : 0,
        type: 'sous_partie',
        path: `partie_${partie.id}/sous_partie_${sp.id}`,
        partieId: partie.id,
        sousPartieId: sp.id
      }))
    ),
    // Lignes de détails
    ...parties.flatMap(partie =>
      (partie.selectedSousParties || []).flatMap(sp =>
        (sp.selectedLignesDetails || []).map(ld => ({
          id: `ligne_detail_${ld.id}`,
          label: ld.description,
          amount: calculatePrice ? calculatePrice(ld) * (ld.quantity || 0) : 0,
          type: 'ligne_detail',
          path: `partie_${partie.id}/sous_partie_${sp.id}/ligne_detail_${ld.id}`,
          partieId: partie.id,
          sousPartieId: sp.id,
          ligneDetailId: ld.id
        }))
      )
    )
  ];
  
  const handleItemClick = (item) => {
    onSelect(item);
    onClose();
  };
  
  const handleItemHover = (itemId) => {
    setHighlightedElement(itemId);
  };
  
  return (
    <>
      {/* Overlay sombre */}
      <Box 
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 9998,
          display: open ? 'block' : 'none'
        }}
      />
      
      {/* Dialog en haut */}
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          style: {
            position: 'absolute',
            top: '20px',
            margin: 0,
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
          }
        }}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <span style={{ fontSize: '24px' }}>🔍</span>
            <Typography variant="h6" fontWeight="bold">
              Sélectionnez la base de calcul
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ 
            mb: 2, 
            p: 2, 
            backgroundColor: '#e3f2fd',
            borderRadius: '4px',
            fontSize: '14px'
          }}>
            Cliquez sur un montant ci-dessous pour calculer le pourcentage à partir de celui-ci
          </Box>
          
          {/* Liste des montants */}
          <Box sx={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {selectableItems.map((item, index) => (
              <Box
                key={item.id}
                onClick={() => handleItemClick(item)}
                onMouseEnter={() => handleItemHover(item.id)}
                onMouseLeave={() => setHighlightedElement(null)}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2,
                  mb: 1,
                  cursor: 'pointer',
                  borderRadius: '4px',
                  backgroundColor: highlightedElement === item.id 
                    ? '#1976d2' 
                    : index % 2 === 0 
                      ? '#f5f5f5' 
                      : 'white',
                  color: highlightedElement === item.id ? 'white' : 'black',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: '#1976d2',
                    color: 'white',
                    transform: 'scale(1.02)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                  },
                  border: highlightedElement === item.id 
                    ? '2px solid #fff' 
                    : '1px solid #e0e0e0'
                }}
              >
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  fontWeight: highlightedElement === item.id ? 'bold' : 'normal'
                }}>
                  <span style={{ 
                    fontSize: highlightedElement === item.id ? '20px' : '16px',
                    transition: 'all 0.2s ease'
                  }}>
                    {getIconForType(item.type)}
                  </span>
                  <span>{item.label}</span>
                </Box>
                <Box sx={{ 
                  fontSize: '18px',
                  fontWeight: 'bold',
                  backgroundColor: highlightedElement === item.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                  px: 2,
                  py: 1,
                  borderRadius: '4px'
                }}>
                  {formatMontantEspace ? formatMontantEspace(item.amount) : formatAmount(item.amount)} €
                </Box>
              </Box>
            ))}
          </Box>
          
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button 
              variant="outlined" 
              onClick={onClose}
              sx={{ minWidth: '200px' }}
            >
              Annuler la sélection
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
    </>
  );
};

const getIconForType = (type) => {
  switch(type) {
    case 'global': return '💰';
    case 'partie': return '📁';
    case 'sous_partie': return '📂';
    case 'ligne_detail': return '📄';
    default: return '💵';
  }
};

const formatAmount = (amount) => {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

export default BaseCalculationSelector;

