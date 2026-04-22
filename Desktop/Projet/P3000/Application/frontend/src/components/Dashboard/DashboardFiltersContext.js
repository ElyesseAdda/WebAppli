import React, { createContext, useCallback, useContext, useState } from "react";

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
  const currentYear = new Date().getFullYear();
  // État pour l'année sélectionnée (par défaut : année courante)
  const [selectedYear, setSelectedYear] = useState(currentYear);
  // Années de comparaison (multi-sélection)
  const [comparisonYears, setComparisonYears] = useState([]);
  // Période personnalisée au format YYYY-MM
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  // État pour gérer l'accordéon ouvert (un seul à la fois)
  const [openAccordion, setOpenAccordion] = useState(null);

  // Sélection des agences pour le montant de la carte « Dépenses agence »
  // null = défaut (première agence par id dans le breakdown) ; [] = aucune (0 € + consigne)
  const [depensesAgenceIncludedAgenceIds, setDepensesAgenceIncludedAgenceIds] = useState(null);

  const clearDepensesAgenceSelection = useCallback(() => {
    setDepensesAgenceIncludedAgenceIds(null);
  }, []);

  // Fonction pour mettre à jour l'année
  const updateYear = (year) => {
    setSelectedYear(year);
  };

  const updateComparisonYears = (years) => {
    const normalizedYears = (years || [])
      .map((year) => Number(year))
      .filter((year) => !Number.isNaN(year));
    setComparisonYears(normalizedYears);
  };

  const updatePeriod = (start, end) => {
    setPeriodStart(start || "");
    setPeriodEnd(end || "");
  };

  const clearPeriod = () => {
    setPeriodStart("");
    setPeriodEnd("");
  };

  // Fonction pour ouvrir/fermer un accordéon
  const toggleAccordion = (accordionId) => {
    setOpenAccordion((prev) => (prev === accordionId ? null : accordionId));
  };

  // Valeur du contexte
  const value = {
    selectedYear,
    updateYear,
    comparisonYears,
    updateComparisonYears,
    periodStart,
    periodEnd,
    updatePeriod,
    clearPeriod,
    openAccordion,
    toggleAccordion,
    depensesAgenceIncludedAgenceIds,
    setDepensesAgenceIncludedAgenceIds,
    clearDepensesAgenceSelection,
  };

  return (
    <DashboardFiltersContext.Provider value={value}>
      {children}
    </DashboardFiltersContext.Provider>
  );
};

