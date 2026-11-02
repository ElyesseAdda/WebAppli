import React from 'react';

const DevisHeader = ({ devisData, formatDate, onDateChange, isGeneratingNumber }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7577', marginBottom: '6px' }}>
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
            backgroundColor: isGeneratingNumber ? '#f7f8f8' : 'white',
            border: '1px solid #e4e8ea',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 700,
            color: '#001514',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}
        />
      </div>
      
      <div>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7577', marginBottom: '6px' }}>
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
            border: '1px solid #e4e8ea',
            borderRadius: '10px',
            fontSize: '14px',
            color: '#243233',
            textAlign: 'center',
            boxSizing: 'border-box'
          }}
        />
      </div>
    </div>
  );
};

export default DevisHeader;
