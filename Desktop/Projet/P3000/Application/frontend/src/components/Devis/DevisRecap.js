import React from 'react';

const DevisRecap = ({ devisData, total_ht, tva, montant_ttc, formatMontantEspace }) => {
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #ced4da',
      borderRadius: '6px',
      overflow: 'hidden'
    }}>
      {/* En-tête du récapitulatif */}
      <div style={{
        backgroundColor: '#28a745',
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
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#495057'
          }}>
            Montant HT
          </div>
          <div style={{
            padding: '12px 20px',
            backgroundColor: '#e3f2fd',
            border: '1px solid #1976d2',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#1976d2',
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
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#495057'
          }}>
            TVA ({devisData.tva_rate}%)
          </div>
          <div style={{
            padding: '12px 20px',
            backgroundColor: '#fff3cd',
            border: '1px solid #ffc107',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#856404',
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
            backgroundColor: '#d4edda',
            border: '2px solid #28a745',
            borderRadius: '4px',
            fontSize: '16px',
            fontWeight: 'bold',
            color: '#155724'
          }}>
            TOTAL TTC
          </div>
          <div style={{
            padding: '12px 20px',
            backgroundColor: '#28a745',
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
          backgroundColor: '#f8f9fa',
          border: '1px solid #dee2e6',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#6c757d',
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
