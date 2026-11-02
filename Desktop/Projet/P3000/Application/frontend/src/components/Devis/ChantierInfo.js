import React from 'react';
import { TextField } from '@mui/material';

const ChantierInfo = ({ chantier, selectedChantierId, isEditable = false, onChantierChange }) => {
  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e6eaec',
      borderRadius: '12px',
      padding: '18px'
    }}>
      {selectedChantierId ? (
        <>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7577', marginBottom: '4px' }}>
              Nom du chantier
            </label>
            {isEditable ? (
              <TextField
                fullWidth
                size="small"
                value={chantier.chantier_name || ''}
                onChange={(e) => onChantierChange && onChantierChange({ ...chantier, chantier_name: e.target.value })}
                variant="outlined"
                sx={{ fontSize: '16px', fontWeight: 'bold' }}
              />
            ) : (
              <div style={{
                padding: '12px',
                backgroundColor: '#f7f8f8',
                border: '1px solid #e6eaec',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: 700,
                color: '#001514'
              }}>
                {chantier.chantier_name || ''}
              </div>
            )}
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7577', marginBottom: '4px' }}>
                Adresse
              </label>
              {isEditable ? (
                <TextField
                  fullWidth
                  size="small"
                  value={chantier.rue || ''}
                  onChange={(e) => onChantierChange && onChantierChange({ ...chantier, rue: e.target.value })}
                  variant="outlined"
                />
              ) : (
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#f7f8f8',
                  border: '1px solid #e6eaec',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#243233'
                }}>
                  {chantier.rue || ''}
                </div>
              )}
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7577', marginBottom: '4px' }}>
                Code postal
              </label>
              {isEditable ? (
                <TextField
                  fullWidth
                  size="small"
                  value={chantier.code_postal || ''}
                  onChange={(e) => onChantierChange && onChantierChange({ ...chantier, code_postal: e.target.value })}
                  variant="outlined"
                />
              ) : (
                <div style={{
                  padding: '10px 12px',
                  backgroundColor: '#f7f8f8',
                  border: '1px solid #e6eaec',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#243233'
                }}>
                  {chantier.code_postal || ''}
                </div>
              )}
            </div>
          </div>
          
          {isEditable && (
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7577', marginBottom: '4px' }}>
                Ville
              </label>
              <TextField
                fullWidth
                size="small"
                value={chantier.ville || ''}
                onChange={(e) => onChantierChange && onChantierChange({ ...chantier, ville: e.target.value })}
                variant="outlined"
              />
            </div>
          )}
          
          {!isEditable && (
            <div style={{ marginTop: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7577', marginBottom: '4px' }}>
                Ville
              </label>
              <div style={{
                padding: '10px 12px',
                backgroundColor: '#f7f8f8',
                border: '1px solid #e6eaec',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#243233'
              }}>
                {chantier.ville || ''}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '40px 20px',
          color: '#6b7577',
          fontStyle: 'italic'
        }}>
          <p>Veuillez d'abord sélectionner ou créer un chantier</p>
        </div>
      )}
    </div>
  );
};

export default ChantierInfo;
