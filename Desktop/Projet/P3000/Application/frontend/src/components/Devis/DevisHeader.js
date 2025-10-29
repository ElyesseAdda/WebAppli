import React from 'react';

const DevisHeader = ({ devisData, formatDate, onDateChange, isGeneratingNumber }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
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
            backgroundColor: isGeneratingNumber ? '#f8f9fa' : 'white',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1976d2',
            textAlign: 'center'
          }}
        />
      </div>
      
      <div>
        <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
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
            color: '#495057',
            textAlign: 'center'
          }}
        />
      </div>
    </div>
  );
};

export default DevisHeader;
