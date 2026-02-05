import React from 'react';
import { COLORS } from '../../constants/colors';

const DevisHeader = ({ devisData, formatDate, onDateChange, isGeneratingNumber }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: COLORS.textLight, marginBottom: '4px' }}>
          Numéro de devis
        </label>
        <input
          type="text"
          value={isGeneratingNumber ? 'Génération...' : devisData.numero}
          onChange={(e) => {
            if (!isGeneratingNumber && onDateChange) {
              // onDateChange est utilisé pour mettre à jour le numéro
              const updateNumber = onDateChange;
              if (typeof updateNumber === 'function') {
                updateNumber(e.target.value, 'numero');
              }
            }
          }}
          disabled={isGeneratingNumber}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: isGeneratingNumber ? COLORS.backgroundAlt : 'white',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: COLORS.infoDark,
            textAlign: 'center'
          }}
        />
      </div>
      
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: COLORS.textLight, marginBottom: '4px' }}>
          Date de création
        </label>
        <input
          type="date"
          value={devisData.date_creation}
          onChange={(e) => {
            if (onDateChange) {
              onDateChange(e.target.value, 'date');
            }
          }}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: 'white',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px',
            color: COLORS.textMuted,
            textAlign: 'center'
          }}
        />
      </div>
    </div>
  );
};

export default DevisHeader;
