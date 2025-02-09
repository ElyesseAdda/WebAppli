import React, { useState, useEffect } from 'react';
import ProduitSelectionTable from './ProduitSelectionTable';
import bonCommandeService from '../services/bonCommandeService';

function ListeBonDeCommande() {
  const [bonsCommande, setBonsCommande] = useState([]);
  
  const loadBonsCommande = async () => {
    try {
      const data = await bonCommandeService.getAllBonsCommande();
      setBonsCommande(data);
    } catch (error) {
      console.error("Erreur lors du chargement des bons de commande:", error);
    }
  };

  useEffect(() => {
    loadBonsCommande();
  }, []);

  const handleNewBonCommande = (newBonCommande) => {
    // Mettre à jour la liste des bons de commande
    loadBonsCommande();
  };

  return (
    <>
      <ProduitSelectionTable
        onValidate={handleNewBonCommande}
      />
      {/* Tableau des bons de commande */}
    </>
  );
}

export default ListeBonDeCommande; 