import React from 'react';
import { Box } from '@mui/material';

const SpecialLinePreview = ({ line, formatAmount }) => {
  // Calculer le montant
  const calculateAmount = () => {
    if (!line.value || line.value === '') return '0.00';
    
    if (line.valueType === 'percentage') {
      // Si baseCalculation existe, afficher % du montant de base
      if (line.baseCalculation) {
        const baseAmount = line.baseCalculation.amount || 0;
        const calculated = (baseAmount * parseFloat(line.value)) / 100;
        return formatAmount ? formatAmount(calculated) : calculated.toFixed(2);
      }
      // Sinon, afficher juste le pourcentage
      return `${line.value}%`;
    } else {
      // Montant fixe
      return formatAmount ? formatAmount(parseFloat(line.value)) : parseFloat(line.value).toFixed(2);
    }
  };

  return (
    <Box sx={{ mt: 2, mb: 2 }}>
      <Box sx={{ 
        fontSize: '14px', 
        fontWeight: '500', 
        mb: 1,
        color: '#666'
      }}>
        📋 Aperçu :
      </Box>
      <Box sx={{ 
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        overflow: 'hidden',
        backgroundColor: 'white'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{
              backgroundColor: line.styles?.backgroundColor || 'transparent',
              borderBottom: '1px solid #e0e0e0'
            }}>
              <td style={{ 
                padding: '12px 16px',
                fontSize: '14px',
                width: '70%',
                fontWeight: line.styles?.fontWeight || 'normal',
                fontStyle: line.styles?.fontStyle || 'normal',
                textDecoration: line.styles?.textDecoration || 'none',
                color: line.styles?.color || '#000000',
                borderLeft: line.styles?.borderLeft || 'none',
                textAlign: line.styles?.textAlign || 'left'
              }}>
                {line.description || "Votre ligne spéciale"}
              </td>
              <td style={{ 
                padding: '12px 16px',
                textAlign: 'right',
                fontSize: '14px',
                fontWeight: 'bold',
                color: line.type === 'reduction' ? '#d32f2f' : '#1976d2'
              }}>
                {line.type === 'reduction' && '-'}
                {calculateAmount()} €
              </td>
            </tr>
          </tbody>
        </table>
      </Box>
    </Box>
  );
};

export default SpecialLinePreview;

