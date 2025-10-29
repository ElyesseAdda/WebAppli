import React from 'react';

const ClientInfo = ({ client, societe, formatPhoneNumber }) => {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
      {/* Informations société */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ced4da',
        borderRadius: '6px',
        padding: '20px'
      }}>
        <h3 style={{
          color: '#1976d2',
          fontSize: '16px',
          fontWeight: 'bold',
          margin: '0 0 15px 0',
          paddingBottom: '8px',
          borderBottom: '1px solid #e9ecef'
        }}>
          🏢 Société
        </h3>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            Nom de la société
          </label>
          <div style={{
            padding: '10px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#495057'
          }}>
            {societe.nom_societe}
          </div>
        </div>
        <div style={{ marginBottom: '12px' }}>
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
            {societe.rue_societe}
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
            {societe.codepostal_societe}, {societe.ville_societe}
          </div>
        </div>
      </div>

      {/* Informations contact */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ced4da',
        borderRadius: '6px',
        padding: '20px'
      }}>
        <h3 style={{
          color: '#1976d2',
          fontSize: '16px',
          fontWeight: 'bold',
          margin: '0 0 15px 0',
          paddingBottom: '8px',
          borderBottom: '1px solid #e9ecef'
        }}>
          👤 Contact
        </h3>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            Nom complet
          </label>
          <div style={{
            padding: '10px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#495057'
          }}>
            {client.civilite} {client.name} {client.surname}
          </div>
        </div>
        {client.poste && (
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
              Poste
            </label>
            <div style={{
              padding: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#495057'
            }}>
              {client.poste}
            </div>
          </div>
        )}
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            Email
          </label>
          <div style={{
            padding: '10px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#495057',
            wordBreak: 'break-all'
          }}>
            {client.client_mail}
          </div>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            Téléphone
          </label>
          <div style={{
            padding: '10px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #ced4da',
            borderRadius: '4px',
            fontSize: '14px',
            color: '#495057'
          }}>
            {formatPhoneNumber(client.phone_Number)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientInfo;
