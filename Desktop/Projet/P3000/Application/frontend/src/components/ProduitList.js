import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProduitSelectionTable from './ProduitSelectionTable';

const ProduitList = () => {
  const [searchParams] = useSearchParams();
  const fournisseur = searchParams.get('fournisseur');

  return (
    <div style={{ padding: '20px' }}>
      <ProduitSelectionTable 
        fournisseur={fournisseur}
        readOnly={true}
        initialFilter={fournisseur}
      />
    </div>
  );
};

export default ProduitList; 