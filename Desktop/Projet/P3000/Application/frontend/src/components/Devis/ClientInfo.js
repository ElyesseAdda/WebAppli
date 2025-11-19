import React from 'react';
import { TextField } from '@mui/material';

const ClientInfo = ({ client, societe, formatPhoneNumber, isEditable = false, onClientChange, onSocieteChange }) => {
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
          {isEditable ? (
            <TextField
              fullWidth
              size="small"
              value={societe.nom_societe || ''}
              onChange={(e) => onSocieteChange && onSocieteChange({ ...societe, nom_societe: e.target.value })}
              variant="outlined"
            />
          ) : (
            <div style={{
              padding: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#495057'
            }}>
              {societe.nom_societe || ''}
            </div>
          )}
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            Adresse
          </label>
          {isEditable ? (
            <TextField
              fullWidth
              size="small"
              value={societe.rue_societe || ''}
              onChange={(e) => onSocieteChange && onSocieteChange({ ...societe, rue_societe: e.target.value })}
              variant="outlined"
            />
          ) : (
            <div style={{
              padding: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#495057'
            }}>
              {societe.rue_societe || ''}
            </div>
          )}
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            Code postal
          </label>
          {isEditable ? (
            <TextField
              fullWidth
              size="small"
              value={societe.codepostal_societe || ''}
              onChange={(e) => onSocieteChange && onSocieteChange({ ...societe, codepostal_societe: e.target.value })}
              variant="outlined"
            />
          ) : (
            <div style={{
              padding: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#495057'
            }}>
              {societe.codepostal_societe || ''}
            </div>
          )}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            Ville
          </label>
          {isEditable ? (
            <TextField
              fullWidth
              size="small"
              value={societe.ville_societe || ''}
              onChange={(e) => onSocieteChange && onSocieteChange({ ...societe, ville_societe: e.target.value })}
              variant="outlined"
            />
          ) : (
            <div style={{
              padding: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#495057'
            }}>
              {societe.ville_societe || ''}
            </div>
          )}
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
            Prénom
          </label>
          {isEditable ? (
            <TextField
              fullWidth
              size="small"
              value={client.name || ''}
              onChange={(e) => onClientChange && onClientChange({ ...client, name: e.target.value })}
              variant="outlined"
            />
          ) : (
            <div style={{
              padding: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#495057'
            }}>
              {client.name || ''}
            </div>
          )}
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            Nom
          </label>
          {isEditable ? (
            <TextField
              fullWidth
              size="small"
              value={client.surname || ''}
              onChange={(e) => onClientChange && onClientChange({ ...client, surname: e.target.value })}
              variant="outlined"
            />
          ) : (
            <div style={{
              padding: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#495057'
            }}>
              {client.surname || ''}
            </div>
          )}
        </div>
        {client.poste && !isEditable && (
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
          {isEditable ? (
            <TextField
              fullWidth
              size="small"
              type="email"
              value={client.client_mail || ''}
              onChange={(e) => onClientChange && onClientChange({ ...client, client_mail: e.target.value })}
              variant="outlined"
            />
          ) : (
            <div style={{
              padding: '10px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #ced4da',
              borderRadius: '4px',
              fontSize: '14px',
              color: '#495057',
              wordBreak: 'break-all'
            }}>
              {client.client_mail || ''}
            </div>
          )}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            Téléphone
          </label>
          {isEditable ? (
            <TextField
              fullWidth
              size="small"
              type="tel"
              value={client.phone_Number || ''}
              onChange={(e) => onClientChange && onClientChange({ ...client, phone_Number: e.target.value })}
              variant="outlined"
            />
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ClientInfo;
