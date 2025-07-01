import React, { createContext, useContext, useState } from "react";

const defaultPeriode = {
  mois: new Date().getMonth() + 1,
  annee: new Date().getFullYear(),
};

const RecapFinancierContext = createContext();

export const RecapFinancierProvider = ({ children }) => {
  const [periode, setPeriode] = useState(defaultPeriode);
  const [global, setGlobal] = useState(false);
  const [filters, setFilters] = useState({});
  const [openAccordions, setOpenAccordions] = useState({});

  return (
    <RecapFinancierContext.Provider
      value={{
        periode,
        setPeriode,
        global,
        setGlobal,
        filters,
        setFilters,
        openAccordions,
        setOpenAccordions,
      }}
    >
      {children}
    </RecapFinancierContext.Provider>
  );
};

export const useRecapFinancier = () => useContext(RecapFinancierContext);
