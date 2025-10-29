import React from 'react';

const ChantierInfo = ({ chantier, selectedChantierId }) => {
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #ced4da',
      borderRadius: '6px',
      padding: '20px'
    }}>
      {selectedChantierId ? (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
              Nom du chantier
            </label>
            <div style={{
              padding: '12px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#1976d2'
            }}>
              {chantier.chantier_name}
            </div>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                Adresse
              </label>
              <div style={{
                padding: '10px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px',
                color: '#495057'
              }}>
                {chantier.rue}
              </div>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                Code postal et ville
              </label>
              <div style={{
                padding: '10px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px',
                color: '#495057'
              }}>
                {chantier.code_postal} - {chantier.ville}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6c757d',
          fontStyle: 'italic'
        }}>
          <p>Veuillez d'abord sélectionner ou créer un chantier</p>
        </div>
      )}
    </div>
  );
};

export default ChantierInfo;
