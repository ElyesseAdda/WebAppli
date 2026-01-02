import React, { createContext, useContext, useState } from "react";

// Création du contexte pour les filtres du Dashboard
const DashboardFiltersContext = createContext();

// Hook personnalisé pour utiliser les filtres du Dashboard
export const useDashboardFilters = () => {
  const context = useContext(DashboardFiltersContext);
  if (!context) {
    throw new Error(
      "useDashboardFilters doit être utilisé à l'intérieur d'un DashboardFiltersProvider"
    );
  }
  return context;
};

// Provider des filtres du Dashboard
export const DashboardFiltersProvider = ({ children }) => {
  // État pour l'année sélectionnée (par défaut : année courante)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  
  // État pour gérer l'accordéon ouvert (un seul à la fois)
  const [openAccordion, setOpenAccordion] = useState(null);

  // Fonction pour mettre à jour l'année
  const updateYear = (year) => {
    setSelectedYear(year);
  };

  // Fonction pour ouvrir/fermer un accordéon
  const toggleAccordion = (accordionId) => {
    setOpenAccordion((prev) => (prev === accordionId ? null : accordionId));
  };

  // Valeur du contexte
  const value = {
    selectedYear,
    updateYear,
    openAccordion,
    toggleAccordion,
  };

  return (
    <DashboardFiltersContext.Provider value={value}>
      {children}
    </DashboardFiltersContext.Provider>
  );
};

