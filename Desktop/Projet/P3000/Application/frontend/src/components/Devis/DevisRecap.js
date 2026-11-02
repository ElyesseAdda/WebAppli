import React, { useState, useEffect } from 'react';

const DevisRecap = ({ devisData, total_ht, tva, montant_ttc, formatMontantEspace, onTvaRateChange }) => {
  // État local pour gérer la valeur pendant la saisie
  const [localTvaRate, setLocalTvaRate] = useState(devisData.tva_rate ?? 20);
  
  // Synchroniser avec devisData quand il change (mais pas pendant la saisie)
  useEffect(() => {
    if (devisData.tva_rate !== null && devisData.tva_rate !== undefined) {
      setLocalTvaRate(devisData.tva_rate);
    }
  }, [devisData.tva_rate]);

  const handleTvaRateChange = (e) => {
    const inputValue = e.target.value;
    // Permettre la saisie vide temporairement
    if (inputValue === '') {
      setLocalTvaRate('');
      return;
    }
    
    // Remplacer la virgule par un point pour le parsing
    const normalizedValue = inputValue.replace(',', '.');
    const newRate = parseFloat(normalizedValue);
    if (!isNaN(newRate)) {
      setLocalTvaRate(newRate);
      if (onTvaRateChange) {
        onTvaRateChange(newRate);
      }
    }
  };

  const handleTvaRateBlur = () => {
    // Si le champ est vide au blur, remettre la valeur par défaut
    if (localTvaRate === '' || localTvaRate === null || localTvaRate === undefined) {
      const defaultValue = 20;
      setLocalTvaRate(defaultValue);
      if (onTvaRateChange) {
        onTvaRateChange(defaultValue);
      }
    }
  };

  return (
    <div style={{
      backgroundColor: '#ffffff',
      border: '1px solid #e6eaec',
      borderRadius: '12px',
      overflow: 'hidden'
    }}>
      <div style={{ padding: '8px 8px 4px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <div style={{
            padding: '14px 16px',
            backgroundColor: '#f7f8f8',
            border: '1px solid #e6eaec',
            borderRadius: '10px',
            fontSize: '14px',
            color: '#3d4a4c'
          }}>
            Montant HT
          </div>
          <div style={{
            padding: '14px 18px',
            backgroundColor: '#f3fbfc',
            border: '1px solid #d5e8ee',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 700,
            color: '#0e6f84',
            textAlign: 'right',
            minWidth: '140px'
          }}>
            {formatMontantEspace(total_ht)} €
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '10px'
        }}>
          <div style={{
            padding: '14px 16px',
            backgroundColor: '#f7f8f8',
            border: '1px solid #e6eaec',
            borderRadius: '10px',
            fontSize: '14px',
            color: '#3d4a4c',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span>TVA</span>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={localTvaRate}
              onChange={handleTvaRateChange}
              onBlur={handleTvaRateBlur}
              style={{
                width: '72px',
                padding: '6px 8px',
                border: '1px solid #d5dcde',
                borderRadius: '8px',
                fontSize: '14px',
                textAlign: 'center',
                backgroundColor: 'white',
                color: '#001514'
              }}
            />
            <span>%</span>
          </div>
          <div style={{
            padding: '14px 18px',
            backgroundColor: '#fff8eb',
            border: '1px solid #f3ddb0',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 700,
            color: '#8a5a12',
            textAlign: 'right',
            minWidth: '140px'
          }}>
            {formatMontantEspace(tva)} €
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '12px',
          alignItems: 'center',
          marginBottom: '14px'
        }}>
          <div style={{
            padding: '14px 16px',
            backgroundColor: '#1565c0',
            borderRadius: '10px',
            fontSize: '15px',
            fontWeight: 700,
            color: '#ffffff'
          }}>
            Total TTC
          </div>
          <div style={{
            padding: '14px 18px',
            backgroundColor: '#1565c0',
            borderRadius: '10px',
            fontSize: '18px',
            fontWeight: 700,
            color: '#ffffff',
            textAlign: 'right',
            minWidth: '140px'
          }}>
            {formatMontantEspace(montant_ttc)} €
          </div>
        </div>

        <div style={{
          padding: '14px 16px',
          backgroundColor: '#f7f8f8',
          border: '1px solid #e6eaec',
          borderRadius: '10px',
          fontSize: '12px',
          color: '#6b7577',
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '6px', fontWeight: 700, color: '#243233' }}>
            Signature suivie de la mention "BON POUR ACCORD"
          </div>
          <div>
            Devis valable 1 mois après réception
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevisRecap;
