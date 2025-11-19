import React from 'react';

const DevisStyles = () => {
  return (
    <>
      {/* Import des polices Google Fonts */}
      <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet" />
      
      {/* Styles CSS intégrés */}
      <style>{`
        .bold { font-weight: 700; }
        table { width: 100%; }
        .info-section { margin-bottom: 20px; }
        .info-section h2 { font-size: 16px; font-weight: bold; margin-bottom: 10px; }
        .info-section p { margin: 5px 0; }
        .partie {
          background-color: rgba(27, 120, 188, 1);
          color: white;
          font-weight: bold;
          padding: 0px;
          padding-bottom: 15px;
          text-align: left;
          background-clip: content-box;
          font-size: 0.9rem;
          padding-top: 20px;
          height: 20px;
          line-height: 25px;
        }
        .sous-partie {
          background-color: rgb(157, 197, 226);
          color: black;
          padding: 5px;
          text-align: left;
          font-weight: 600;
          font-size: 0.9rem;
          height: 20px;
          line-height: 20px;
        }
        .ligne-details {
          text-align: left;
          font-size: 0.9rem;
          padding: 8px 12px;
        }
        .designation {
          text-align: left;
          width: 50%;
          font-size: 0.9rem;
          border: 2px solid black;
          padding: 8px;
        }
        .total {
          text-align: right;
          font-weight: bold;
          text-align: center;
          border: 2px solid black;
          font-size: 0.9rem;
          padding: 8px;
        }
        .unite {
          width: 80px;
          text-align: center;
          border: 2px solid black;
          font-size: 0.9rem;
          padding: 8px;
        }
        .unitetableau {
          width: 80px;
          font-size: 0.9rem;
          text-align: center;
          padding: 8px;
        }
        .quantite {
          width: 100px;
          text-align: center;
          border: 2px solid black;
          font-size: 0.9rem;
          padding: 8px;
        }
        .quantitetableau {
          text-align: center;
          width: 100px;
          font-size: 0.9rem;
          padding: 8px;
        }
        .prix {
          width: 120px;
          text-align: center;
          border: 2px solid black;
          font-size: 0.9rem;
          padding: 8px;
        }
        .prixtableau {
          text-align: center;
          font-size: 0.9rem;
          width: 120px;
          padding: 8px;
        }
        .totalHt {
          width: 140px;
          text-align: center;
          border: 2px solid black;
          font-size: 0.9rem;
          padding: 8px;
        }
        .totalHttableau {
          text-align: right;
          width: 140px;
          font-size: 0.9rem;
          padding: 8px;
        }
        .bordertitre {
          border: solid 2px black;
          margin-bottom: 10px;
        }
        .border {
          border: solid 2px black;
          padding: 2px;
        }
        .ghost-container {
          position: relative;
          margin: 0;
          width: 100%;
        }
        .ghost-grid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: grid;
          grid-template-columns: 50% 80px 100px 120px 140px;
          gap: 6px;
          pointer-events: none;
          height: calc(100% - 4px);
        }
        .ghost-cell {
          border: 2px solid black;
          margin: 0px;
          background: transparent;
          height: 100%;
        }
        .ghost-cell.text { grid-column: 1; }
        .ghost-cell.unite { grid-column: 2; }
        .ghost-cell.quantite { grid-column: 3; }
        .ghost-cell.prix { grid-column: 4; }
        .ghost-cell.total { grid-column: 5; }
        .client-container {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          grid-template-rows: 2fr;
          grid-column-gap: 50px;
          grid-row-gap: 0px;
          margin-bottom: 20px;
        }
        .client-container h3 {
          text-decoration: underline 2px black;
          text-underline-offset: 2px;
          font-size: 16px;
          font-weight: 700;
        }
        .client-container h4 {
          font-size: 16px;
          font-weight: 800;
          margin-bottom: 6px;
        }
        .client-container p {
          font-size: 16px;
          font-weight: 500;
          margin: 2px 0px;
          line-height: 1.2;
        }
        .client-info {
          line-height: 8px;
          grid-area: 1 / 1 / 2 / 2;
        }
        .client-info h3 { margin-bottom: 0px; }
        .client-info h4 { margin-top: 12px; }
        .contact-info {
          line-height: 7px;
          grid-area: 1 / 2 / 2 / 3;
          padding-left: 20px;
        }
        .contact-info h3 { margin-bottom: 8px; }
        .contact-info h4 { margin-top: 14px; }
        .client-mail {
          word-break: break-all;
          overflow-wrap: break-word;
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .client-info, .contact-info { margin-bottom: 10px; }
        .chantier-info {
          line-height: 6px;
        }
        .chantier-info h2 {
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 15px;
          text-decoration: underline 2px black;
          text-underline-offset: 2px;
        }
        .chantier-info h3 {
          margin-top: 0px;
          margin-bottom: 0px;
          font-size: 16px;
          font-weight: 700;
        }
        .chantier-info p {
          font-size: 16px;
          font-weight: 500;
        }
        .date {
          font-size: 14px;
          text-align: left;
          margin-top: 30px;
          font-weight: 500;
        }
        .header {
          padding: 1px;
          border: solid 2px black;
        }
        .header h1 {
          font-size: 20px;
          margin: 1px;
          border: solid 2px black;
          text-decoration: none;
        }
        .header, .footer {
          text-align: center;
          margin-bottom: 10px;
        }
        h2 {
          text-decoration: underline 2px black;
        }
        .devis-grid {
          position: relative;
          z-index: 1;
        }
        .recap-table {
          width: 100%;
          margin-top: 20px;
          border: 2px solid black;
        }
        .recap-table th {
          color: black;
          text-align: center;
          border: 2px solid black;
          font-size: 0.8rem;
          font-weight: 600;
        }
        .recap-table td {
          border: 2px solid black;
          font-size: 0.8rem;
          font-weight: 500;
          margin-bottom: 8px;
        }
        .recap-table tr {
          margin-bottom: 10px;
        }
        .recap-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .montant-row {
          background-color: rgba(27, 120, 188, 1);
          color: white;
        }
        .label {
          text-align: left;
        }
        .montant {
          text-align: right;
          min-width: 100px;
        }
        .nature-travaux {
          margin-top: 0px;
          line-height: 6px;
        }
        .nature-travaux h5 {
          font-weight: 700;
          font-size: 16px;
          margin-bottom: 15px;
          margin-top: 6px;
          text-decoration: underline 2px black;
        }
        .nature-travaux p {
          font-size: 14px;
          font-weight: 700;
          margin-top: 10px;
        }
        .special-line {
          font-size: 14px;
          font-weight: 700;
          padding-left: 22px;
        }
        tr:has(.special-line) {
          margin-top: 8px;
        }
        .special-line-spacer {
          height: 8px;
          background: transparent;
        }
        .highlighted {
          background-color: yellow;
          color: #dc3545;
        }
        .display-only {
          background-color: #f8f9fa !important;
          border-left: 3px solid #6c757d;
          margin-top: 8px;
          padding-top: 8px;
        }
        .display-line {
          color: #000000;
        }
        .display-only.highlighted {
          background-color: yellow !important;
          color: #dc3545 !important;
          font-weight: bold;
          border-left: 3px solid #dc3545;
        }
        .display-only.highlighted .display-line {
          font-style: normal;
          color: #dc3545 !important;
        }
        .footer {
          font-size: 12px;
          font-weight: 500;
          width: 100%;
          max-width: 400px;
          text-align: left;
          margin-top: 10px;
        }
        
        /* Responsive design */
        @media (max-width: 768px) {
          .client-container {
            grid-template-columns: 1fr;
            grid-column-gap: 0px;
            grid-row-gap: 20px;
          }
          .contact-info {
            padding-left: 0px;
          }
          .designation { width: 100%; }
          .ghost-grid {
            grid-template-columns: 1fr 60px 80px 100px 120px;
          }
          table {
            font-size: 0.8rem;
          }
        }
        
        @media (max-width: 480px) {
          .ghost-grid {
            grid-template-columns: 1fr 50px 60px 80px 100px;
          }
          .unite, .unitetableau { width: 50px; }
          .quantite, .quantitetableau { width: 60px; }
          .prix, .prixtableau { width: 80px; }
          .totalHt, .totalHttableau { width: 100px; }
        }
      `}</style>
    </>
  );
};

export default DevisStyles;
