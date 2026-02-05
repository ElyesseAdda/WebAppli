import React, { useState, useEffect } from 'react';
import { COLORS } from '../../constants/colors';

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
    
    const newRate = parseFloat(inputValue);
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
      backgroundColor: 'white',
      border: '1px solid #ced4da',
      borderRadius: '6px',
      overflow: 'hidden'
    }}>
      {/* En-tête du récapitulatif */}
      <div style={{
        backgroundColor: COLORS.success,
        color: 'white',
        padding: '15px 20px',
        fontWeight: 'bold',
        fontSize: '16px'
      }}>
        💰 Récapitulatif financier
      </div>
      
      {/* Tableau récapitulatif */}
      <div style={{ padding: '20px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '15px',
          marginBottom: '15px'
        }}>
          <div style={{
            padding: '12px 15px',
            backgroundColor: COLORS.backgroundAlt,
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '14px',
            color: COLORS.textMuted
          }}>
            Montant HT
          </div>
          <div style={{
            padding: '12px 20px',
            backgroundColor: COLORS.infoLight,
            border: '1px solid #1976d2',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: COLORS.infoDark,
            textAlign: 'center',
            minWidth: '120px'
          }}>
            {formatMontantEspace(total_ht)} €
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '15px',
          marginBottom: '15px'
        }}>
          <div style={{
            padding: '12px 15px',
            backgroundColor: COLORS.backgroundAlt,
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '14px',
            color: COLORS.textMuted,
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
                width: '60px',
                padding: '4px 8px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                fontSize: '14px',
                textAlign: 'center',
                backgroundColor: 'white'
              }}
            />
            <span>%</span>
          </div>
          <div style={{
            padding: '12px 20px',
            backgroundColor: COLORS.warningLight,
            border: '1px solid #ffc107',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: COLORS.warningDark,
            textAlign: 'center',
            minWidth: '120px'
          }}>
            {formatMontantEspace(tva)} €
          </div>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          gap: '15px',
          marginBottom: '20px'
        }}>
          <div style={{
            padding: '12px 15px',
            backgroundColor: COLORS.successLight,
            border: '2px solid #28a745',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: COLORS.successDark
          }}>
            TOTAL TTC
          </div>
          <div style={{
            padding: '12px 20px',
            backgroundColor: COLORS.success,
            border: '2px solid #28a745',
            borderRadius: '4px',
            fontSize: '18px',
            fontWeight: 'bold',
            color: 'white',
            textAlign: 'center',
            minWidth: '120px'
          }}>
            {formatMontantEspace(montant_ttc)} €
          </div>
        </div>
        
        {/* Pied de page */}
        <div style={{
          padding: '15px',
          backgroundColor: COLORS.backgroundAlt,
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          fontSize: '12px',
          color: COLORS.textLight,
          textAlign: 'center'
        }}>
          <div style={{ marginBottom: '8px', fontWeight: 'bold' }}>
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
