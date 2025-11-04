import React from 'react';
import { Draggable } from 'react-beautiful-dnd';

/**
 * Composant pour afficher une ligne spéciale dans le tableau du devis
 * Utilisé dans le système unifié avec index_global
 */
const LigneSpecialeRow = ({ 
  line, 
  provided, 
  snapshot, 
  depth = 0, 
  formatMontantEspace 
}) => {
  /**
   * Calcule le montant de la ligne spéciale
   * Support des deux formats : nouveau (line.value) et ancien (line.data.value)
   */
  const calculateAmount = () => {
    // Support du format avec 'data'
    const data = line.data || line;
    const valueType = line.value_type || data.valueType;
    const value = line.value || data.value;
    const baseCalculation = line.base_calculation || line.baseCalculation;
    
    if (valueType === 'percentage' && baseCalculation) {
      const baseAmount = parseFloat(baseCalculation.amount || 0);
      const percentage = parseFloat(value || 0);
      return (baseAmount * percentage) / 100;
    }
    return parseFloat(value || 0);
  };

  const amount = calculateAmount();
  const indent = depth * 20; // Indentation selon la profondeur
  
  // Support des deux formats de données
  const data = line.data || line;
  const typeSpeciale = line.type_speciale || data.type;
  const description = line.description || data.description;

  // Styles de la ligne selon les préférences utilisateur
  const lineStyles = {
    backgroundColor: line.styles?.backgroundColor || 'rgba(27, 120, 188, 1)',
    color: line.styles?.color || 'white',
    fontWeight: line.styles?.fontWeight || 'bold',
    fontStyle: line.styles?.fontStyle || 'normal',
    textDecoration: line.styles?.textDecoration || 'none',
    textAlign: line.styles?.textAlign || 'left',
    padding: '15px 20px',
    fontSize: '16px',
    borderRadius: '4px',
    borderLeft: line.styles?.borderLeft || 'none',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: snapshot.isDragging ? 'grabbing' : 'grab',
    opacity: snapshot.isDragging ? 0.8 : 1,
    boxShadow: snapshot.isDragging 
      ? '0 4px 12px rgba(0,0,0,0.3)' 
      : '0 2px 4px rgba(0,0,0,0.1)',
    transition: 'all 0.2s ease',
    marginLeft: `${indent}px`,
    marginBottom: '8px'
  };

  // Couleur du montant selon le type
  const amountColor = 
    typeSpeciale === 'reduction' ? '#d32f2f' :
    typeSpeciale === 'addition' ? '#1976d2' : 
    '#9e9e9e';

  return (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      style={{
        ...provided.draggableProps.style,
      }}
    >
      <div style={lineStyles}>
        {/* Handle de drag */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            {...provided.dragHandleProps}
            style={{
              cursor: 'grab',
              padding: '8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255,255,255,0.2)',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Glisser pour déplacer"
          >
            ⋮⋮
          </div>
          
          {/* Numéro hiérarchique (si disponible) */}
          {line.numero && (
            <span style={{ 
              opacity: 0.7, 
              marginRight: '8px',
              fontWeight: 'normal',
              fontSize: '14px'
            }}>
              {line.numero}
            </span>
          )}
          
          {/* Description */}
          <span>{description || 'Ligne spéciale'}</span>
        </div>

        {/* Montant */}
        <span
          style={{
            fontSize: '16px',
            fontWeight: 'bold',
            color: amountColor,
            whiteSpace: 'nowrap'
          }}
        >
          {typeSpeciale === 'reduction' && '-'}
          {typeSpeciale === 'addition' && '+'}
          {formatMontantEspace(amount)} €
        </span>
      </div>
    </div>
  );
};

export default LigneSpecialeRow;

