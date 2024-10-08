import React, { useEffect, useState } from 'react';
import axios from 'axios';

const StockHistory = () => {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    axios.get('/api/historique_stock/')
      .then(response => {
        setHistory(response.data);
      })
      .catch(error => {
        console.error("Erreur lors de la récupération de l'historique :", error);
      });
  }, []);

  return (
    <div>
      <h2>Historique de gestion de stock</h2>
      <table>
        <thead>
          <tr>
            <th>Produit</th>
            <th>Quantité</th>
            <th>Type d'opération</th>
            <th>Date</th>
            <th>Agent</th>
            <th>Chantier</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          {history.map((item, index) => (
            <tr key={index}>
              <td>{item.stock.nom_materiel}</td>
              <td>{item.quantite}</td>
              <td>{item.type_operation}</td>
              <td>{new Date(item.date_operation).toLocaleString()}</td>
              <td>{item.agent}</td>
              <td>{item.chantier}</td>
              <td>{item.montant} €</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StockHistory;
