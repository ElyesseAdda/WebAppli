import React from 'react';

const DevisTable = ({ 
  devisData, 
  parties, 
  special_lines_global, 
  total_ht, 
  formatMontantEspace,
  onNatureTravauxChange
}) => {
  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #ced4da',
      borderRadius: '6px',
      overflow: 'hidden'
    }}>
      {/* En-tête du tableau */}
      <div style={{
        backgroundColor: '#1976d2',
        color: 'white',
        padding: '15px 20px',
        fontWeight: 'bold',
        fontSize: '16px'
      }}>
        Détail des prestations
      </div>
      
      {/* Tableau principal */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                border: '1px solid #dee2e6',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#495057',
                width: '50%'
              }}>
                DÉSIGNATION
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'center',
                border: '1px solid #dee2e6',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#495057',
                width: '80px'
              }}>
                U
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'center',
                border: '1px solid #dee2e6',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#495057',
                width: '100px'
              }}>
                QUANTITÉ
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'center',
                border: '1px solid #dee2e6',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#495057',
                width: '120px'
              }}>
                PRIX UNITAIRE
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'center',
                border: '1px solid #dee2e6',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#495057',
                width: '140px'
              }}>
                TOTAL HT
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Contenu du tableau */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {/* Nature des travaux */}
            <tr style={{ backgroundColor: '#e3f2fd' }}>
              <td colSpan="5" style={{
                padding: '15px 20px',
                border: '1px solid #dee2e6',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1976d2'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📋 Nature des travaux :</span>
                  <input
                    type="text"
                    value={devisData.nature_travaux}
                    onChange={(e) => {
                      if (onNatureTravauxChange) {
                        onNatureTravauxChange(e.target.value);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #1976d2',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      backgroundColor: 'white'
                    }}
                    placeholder="Saisir la nature des travaux..."
                  />
                </div>
              </td>
            </tr>
              
            {/* Parties */}
            {parties.map((partie) => (
              <React.Fragment key={partie.id}>
                <tr style={{ backgroundColor: '#1976d2', color: 'white' }}>
                  <td colSpan="5" style={{
                    padding: '15px 20px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    border: '1px solid #1976d2'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>🔧 {partie.titre}</span>
                      <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                        {formatMontantEspace(partie.total_partie)} €
                      </span>
                    </div>
                  </td>
                </tr>
                  
                  {/* Lignes spéciales de la partie */}
                  {partie.special_lines.map((special_line, index) => (
                    <React.Fragment key={index}>
                      <tr className="special-line-spacer"><td colSpan="5"></td></tr>
                      <tr className={`${special_line.isHighlighted ? 'highlighted' : ''} ${special_line.type === 'display' ? 'display-only' : ''}`}>
                        <td colSpan="4" className={`special-line ${special_line.type === 'display' ? 'display-line' : ''}`}>
                          <span style={{ maxWidth: '430px', wordWrap: 'break-word', wordBreak: 'break-word', display: 'inline-block' }}>
                            {special_line.description}
                          </span>
                        </td>
                        <td className="totalHttableau">
                          {special_line.type === 'reduction' && '-'}
                          {special_line.type !== 'display' ? formatMontantEspace(special_line.montant) : formatMontantEspace(special_line.value)}
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                  
                {/* Sous-parties */}
                {partie.sous_parties.map((sous_partie) => (
                  <React.Fragment key={sous_partie.id}>
                    {sous_partie.description !== "Lignes directes" && (
                      <tr style={{ backgroundColor: '#9dc5e2' }}>
                        <td colSpan="5" style={{
                          padding: '12px 20px',
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#1976d2',
                          border: '1px solid #9dc5e2'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>📝 {sous_partie.description}</span>
                            <span style={{ fontWeight: 'bold' }}>
                              {formatMontantEspace(sous_partie.total_sous_partie)} €
                            </span>
                          </div>
                        </td>
                      </tr>
                    )}
                      
                      {/* Lignes spéciales de la sous-partie */}
                      {sous_partie.special_lines.map((special_line, index) => (
                        <React.Fragment key={index}>
                          <tr className="special-line-spacer"><td colSpan="5"></td></tr>
                          <tr className={`${special_line.isHighlighted ? 'highlighted' : ''} ${special_line.type === 'display' ? 'display-only' : ''}`}>
                            <td colSpan="4" className={`special-line ${special_line.type === 'display' ? 'display-line' : ''}`}>
                              <span style={{ maxWidth: '430px', wordWrap: 'break-word', wordBreak: 'break-word', display: 'inline-block' }}>
                                {special_line.description}
                              </span>
                            </td>
                            <td className="totalHttableau">
                              {special_line.type === 'reduction' && '-'}
                              {special_line.type !== 'display' ? formatMontantEspace(special_line.montant) : formatMontantEspace(special_line.value)}
                            </td>
                          </tr>
                        </React.Fragment>
                      ))}
                      
                    {/* Lignes de détail */}
                    {sous_partie.lignes_details.map((ligne) => (
                      <tr key={ligne.id} style={{ backgroundColor: 'white' }}>
                        <td style={{
                          padding: '12px 20px',
                          border: '1px solid #dee2e6',
                          fontSize: '14px',
                          color: '#495057'
                        }}>
                          {ligne.description}
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'center',
                          border: '1px solid #dee2e6',
                          fontSize: '14px',
                          color: '#495057',
                          fontWeight: '500'
                        }}>
                          {ligne.unite}
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'center',
                          border: '1px solid #dee2e6',
                          fontSize: '14px',
                          color: '#495057',
                          fontWeight: '500'
                        }}>
                          {ligne.quantity}
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'center',
                          border: '1px solid #dee2e6',
                          fontSize: '14px',
                          color: '#495057',
                          fontWeight: '500'
                        }}>
                          {formatMontantEspace(ligne.custom_price)} €
                        </td>
                        <td style={{
                          padding: '12px',
                          textAlign: 'center',
                          border: '1px solid #dee2e6',
                          fontSize: '14px',
                          color: '#1976d2',
                          fontWeight: 'bold'
                        }}>
                          {formatMontantEspace(ligne.total)} €
                        </td>
                      </tr>
                    ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
              
              {/* Lignes spéciales globales */}
              {special_lines_global.map((special_line, index) => (
                <React.Fragment key={index}>
                  <tr className="special-line-spacer"><td colSpan="5"></td></tr>
                  <tr className={`${special_line.isHighlighted ? 'highlighted' : ''} ${special_line.type === 'display' ? 'display-only' : ''}`}>
                    <td colSpan="4" className={`special-line ${special_line.type === 'display' ? 'display-line' : ''}`}>
                      <span style={{ maxWidth: '430px', wordWrap: 'break-word', wordBreak: 'break-word', display: 'inline-block' }}>
                        {special_line.description}
                      </span>
                    </td>
                    <td className="totalHttableau">
                      {special_line.type === 'reduction' && '-'}
                      {special_line.type !== 'display' ? formatMontantEspace(special_line.montant) : formatMontantEspace(special_line.value)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}

            {/* Montant global HT */}
            <tr style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #1976d2' }}>
              <td colSpan="4" style={{
                padding: '15px 20px',
                fontWeight: 'bold',
                fontSize: '16px',
                color: '#1976d2',
                border: '1px solid #dee2e6'
              }}>
                💰 MONTANT GLOBAL HT
              </td>
              <td style={{
                padding: '15px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '18px',
                color: '#1976d2',
                border: '1px solid #dee2e6'
              }}>
                {formatMontantEspace(total_ht)} €
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DevisTable;
