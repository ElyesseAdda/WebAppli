import React, { createContext, useContext, useMemo, useState } from "react";

const defaultPeriode = {
  mois: new Date().getMonth() + 1,
  annee: new Date().getFullYear(),
};

const RecapFinancierContext = createContext();

export const RecapFinancierProvider = ({ children }) => {
  const [periode, setPeriode] = useState(defaultPeriode);
  /** Vue « Global » activée par défaut (toutes périodes pour le récap chantier) */
  const [global, setGlobal] = useState(true);
  const [filters, setFilters] = useState({});
  const [openAccordions, setOpenAccordions] = useState({});

  const value = useMemo(
    () => ({
      periode,
      setPeriode,
      global,
      setGlobal,
      filters,
      setFilters,
      openAccordions,
      setOpenAccordions,
    }),
    [periode, global, filters, openAccordions]
  );

  return (
    <RecapFinancierContext.Provider value={value}>
      {children}
    </RecapFinancierContext.Provider>
  );
};

export const useRecapFinancier = () => useContext(RecapFinancierContext);
