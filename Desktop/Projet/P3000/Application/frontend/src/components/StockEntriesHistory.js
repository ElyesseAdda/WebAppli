import axios from "axios";
import React, { useEffect, useState } from "react";

const StockEntriesHistory = () => {
  const [entriesHistory, setEntriesHistory] = useState([]);

  useEffect(() => {
    fetchEntriesHistory();
  }, []);

  const fetchEntriesHistory = () => {
    axios
      .get("/api/stock-entries") // Change cette route si nécessaire
      .then((response) => {
        setEntriesHistory(response.data);
      })
      .catch((error) => {
        console.error(
          "Erreur lors du chargement de l'historique des entrées:",
          error
        );
      });
  };

  return (
    <div>
      <h2>Historique des Entrées de Stock</h2>
      <table style={tableStyle}>
        <thead>
          <tr style={headerStyle}>
            <th>Code Produit</th>
            <th>Nom Produit</th>
            <th>Fournisseur</th>
            <th>Désignation</th>
            <th>Quantité Entrée</th>
            <th>Date de Commande</th>
          </tr>
        </thead>
        <tbody>
          {entriesHistory.map((entry, index) => (
            <tr
              key={entry.id}
              style={{
                backgroundColor: index % 2 === 0 ? "#f9f9f9" : "#ffffff",
              }}
            >
              <td style={cellStyle}>{entry.code_produit}</td>
              <td style={cellStyle}>{entry.designation}</td>
              <td style={cellStyle}>{entry.fournisseur || "N/A"}</td>
              <td style={cellStyle}>{entry.designation || "N/A"}</td>
              <td style={cellStyle}>{entry.quantite_entree}</td>
              <td style={cellStyle}>
                {new Date(entry.date_commande).toLocaleDateString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default StockEntriesHistory;
