import React from 'react';

const StockEntries = ({ summary, onValidate }) => {
    const handleValidate = () => {
        onValidate();
    };

    return (
        <div>
            <h2>Valider les ajouts</h2>
            <button onClick={handleValidate}>Valider et Enregistrer</button>
        </div>
    );
};

export default StockEntries;
