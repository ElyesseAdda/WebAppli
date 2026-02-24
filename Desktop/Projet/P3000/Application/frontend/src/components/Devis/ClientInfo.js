import React from 'react';
import { TextField, Select, MenuItem, FormControl, InputLabel, Button } from '@mui/material';
import { MdAdd, MdSwapHoriz } from 'react-icons/md';

const ClientInfo = ({ 
  client, 
  societe, 
  formatPhoneNumber, 
  isEditable = false, 
  onClientChange, 
  onSocieteChange,
  contacts = [],
  selectedContactId = null,
  onContactSelect = null,
  onOpenContactModal = null,
  societeId = null,
  availableSocietes = [],
  selectedSocieteDevisId = null,
  onSocieteDevisSelect = null,
  onOpenSelectSocieteModal = null
}) => {
  const displaySociete = selectedSocieteDevisId
    ? availableSocietes.find(s => s.id === selectedSocieteDevisId) || societe
    : societe;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
      {/* Informations société */}
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #ced4da',
        borderRadius: '6px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{
            color: '#1976d2',
            fontSize: '16px',
            fontWeight: 'bold',
            margin: 0,
            paddingBottom: '8px',
            borderBottom: '1px solid #e9ecef',
            flex: 1
          }}>
            🏢 Société
          </h3>
          {onOpenSelectSocieteModal && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<MdSwapHoriz />}
              onClick={() => onOpenSelectSocieteModal()}
              sx={{ ml: 2, minWidth: 'auto', fontSize: '12px', padding: '4px 8px' }}
            >
              Changer société
            </Button>
          )}
        </div>

        {availableSocietes.length > 0 && onSocieteDevisSelect && (
          <div style={{ marginBottom: '15px' }}>
            <FormControl fullWidth size="small">
              <InputLabel>Société pour le devis</InputLabel>
              <Select
                value={selectedSocieteDevisId || ''}
                onChange={(e) => onSocieteDevisSelect(e.target.value || null)}
                label="Société pour le devis"
              >
                <MenuItem value="">
                  <em>Société du chantier (par défaut)</em>
                </MenuItem>
                {availableSocietes
                  .filter(s => s.id !== societe?.id)
                  .sort((a, b) => (a.nom_societe || '').localeCompare(b.nom_societe || ''))
                  .map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      {s.nom_societe}
                      {s.ville_societe ? ` - ${s.ville_societe}` : ''}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          </div>
        )}

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            Nom de la société
          </label>
          {isEditable && !selectedSocieteDevisId ? (
            <TextField
              fullWidth
              size="small"
              value={displaySociete.nom_societe || ''}
              onChange={(e) => onSocieteChange && onSocieteChange({ ...displaySociete, nom_societe: e.target.value })}
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
              {displaySociete.nom_societe || ''}
            </div>
          )}
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            Adresse
          </label>
          {isEditable && !selectedSocieteDevisId ? (
            <TextField
              fullWidth
              size="small"
              value={displaySociete.rue_societe || ''}
              onChange={(e) => onSocieteChange && onSocieteChange({ ...displaySociete, rue_societe: e.target.value })}
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
              {displaySociete.rue_societe || ''}
            </div>
          )}
        </div>
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            Code postal
          </label>
          {isEditable && !selectedSocieteDevisId ? (
            <TextField
              fullWidth
              size="small"
              value={displaySociete.codepostal_societe || ''}
              onChange={(e) => onSocieteChange && onSocieteChange({ ...displaySociete, codepostal_societe: e.target.value })}
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
              {displaySociete.codepostal_societe || ''}
            </div>
          )}
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
            Ville
          </label>
          {isEditable && !selectedSocieteDevisId ? (
            <TextField
              fullWidth
              size="small"
              value={displaySociete.ville_societe || ''}
              onChange={(e) => onSocieteChange && onSocieteChange({ ...displaySociete, ville_societe: e.target.value })}
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
              {displaySociete.ville_societe || ''}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <h3 style={{
            color: '#1976d2',
            fontSize: '16px',
            fontWeight: 'bold',
            margin: 0,
            paddingBottom: '8px',
            borderBottom: '1px solid #e9ecef',
            flex: 1
          }}>
            👤 Contact
          </h3>
          {societeId && onOpenContactModal && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<MdAdd />}
              onClick={() => onOpenContactModal()}
              sx={{ ml: 2, minWidth: 'auto', fontSize: '12px', padding: '4px 8px' }}
            >
              Gérer contacts
            </Button>
          )}
        </div>
        
        {/* Sélecteur de contact si la société a un ID et des contacts */}
        {societeId && contacts.length > 0 && onContactSelect && (
          <div style={{ marginBottom: '15px' }}>
            <FormControl fullWidth size="small">
              <InputLabel>Choisir un contact</InputLabel>
              <Select
                value={selectedContactId || ''}
                onChange={(e) => onContactSelect(e.target.value)}
                label="Choisir un contact"
              >
                <MenuItem value="">
                  <em>Contact par défaut (Client)</em>
                </MenuItem>
                {contacts.map((contact) => (
                  <MenuItem key={contact.id} value={contact.id}>
                    {contact.civilite ? `${contact.civilite} ` : ''}
                    {contact.prenom ? `${contact.prenom} ` : ''}
                    {contact.nom}
                    {contact.poste ? ` - ${contact.poste}` : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        )}
        
        {(() => {
          const selectedContact = selectedContactId ? contacts.find(c => c.id === selectedContactId) : null;
          const displayContact = selectedContact || {
            civilite: client.civilite || '',
            prenom: client.name || '',
            nom: client.surname || '',
            poste: client.poste || '',
            email: client.client_mail || '',
            telephone: client.phone_Number || ''
          };
          
          return (
            <>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                  {selectedContact ? 'Civilité' : 'Prénom'}
                </label>
                <div style={{
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#495057'
                }}>
                  {selectedContact ? (displayContact.civilite || '') : displayContact.prenom}
                </div>
              </div>
              {selectedContact && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                    Prénom
                  </label>
                  <div style={{
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    color: '#495057'
                  }}>
                    {displayContact.prenom || ''}
                  </div>
                </div>
              )}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                  Nom
                </label>
                <div style={{
                  padding: '10px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  color: '#495057'
                }}>
                  {displayContact.nom || ''}
                </div>
              </div>
              {displayContact.poste && (
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
                    {displayContact.poste}
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
                  {displayContact.email || ''}
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
                  {formatPhoneNumber(displayContact.telephone)}
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
};

export default ClientInfo;
