import React, { useState, useEffect } from 'react';
import axios from 'axios';

const RemoveStockForm = ({ onClose }) => {
  const [stockList, setStockList] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [quantityToRemove, setQuantityToRemove] = useState(0);
  const [agent, setAgent] = useState('');
  const [chantier, setChantier] = useState('');
  const [agents, setAgents] = useState([]);
  const [chantiers, setChantiers] = useState([]);

  useEffect(() => {
    // Charger les stocks, agents et chantiers
    axios.get('/api/stock/').then(response => setStockList(response.data));
    axios.get('/api/agent/').then(response => setAgents(response.data));
    axios.get('/api/chantier/').then(response => setChantiers(response.data));
  }, []);

  const handleRemoveStock = (e) => {
    e.preventDefault();

    const stockToUpdate = stockList.find(stock => stock.id === selectedProduct);

    if (stockToUpdate && quantityToRemove <= stockToUpdate.quantite_disponible) {
      const updatedStock = {
        ...stockToUpdate,
        quantite_disponible: stockToUpdate.quantite_disponible - quantityToRemove,
      };

      axios.put(`/api/stock/${selectedProduct}/`, updatedStock)
        .then(response => {
          console.log("Stock mis à jour avec succès:", response.data);
          onClose();  // Fermer le formulaire après mise à jour
        })
        .catch(error => {
          console.error("Erreur lors de la mise à jour du stock:", error);
        });
    } else {
      console.error("Quantité à retirer supérieure à la quantité disponible");
    }
  };

  return (
    <div style={{ marginTop: '20px' }}>
      <h3>Retirer des stocks</h3>
      <form onSubmit={handleRemoveStock}>
        <div>
          <label>Produit:</label>
          <select value={selectedProduct} onChange={(e) => setSelectedProduct(e.target.value)}>
            <option value="">-- Sélectionnez un Produit --</option>
            {stockList.map(stock => (
              <option key={stock.id} value={stock.id}>
                {stock.nom_materiel} - Quantité Disponible: {stock.quantite_disponible}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Quantité à Retirer:</label>
          <input
            type="number"
            value={quantityToRemove}
            onChange={(e) => setQuantityToRemove(e.target.value)}
          />
        </div>
        <div>
          <label>Agent:</label>
          <select value={agent} onChange={(e) => setAgent(e.target.value)}>
            <option value="">-- Sélectionnez un Agent --</option>
            {agents.map(agent => (
              <option key={agent.id} value={agent.id}>
                {agent.name} {agent.surname}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Chantier:</label>
          <select value={chantier} onChange={(e) => setChantier(e.target.value)}>
            <option value="">-- Sélectionnez un Chantier --</option>
            {chantiers.map(chantier => (
              <option key={chantier.id} value={chantier.id}>
                {chantier.nom_chantier}
              </option>
            ))}
          </select>
        </div>
        <button type="submit">Retirer</button>
        <button type="button" onClick={onClose}>Fermer</button>
      </form>
    </div>
  );
};

export default RemoveStockForm;
