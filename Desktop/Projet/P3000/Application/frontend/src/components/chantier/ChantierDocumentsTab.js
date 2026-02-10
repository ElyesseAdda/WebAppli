import { AppBar, Box, Paper, Tab, Tabs } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import { useSituationsManager } from "../../hooks/useSituationsManager";
import ChantierListeDevis from "./ChantierListeDevis";
import ChantierListeFactures from "./ChantierListeFactures";
import ChantierListeAvenants from "./ChantierListeAvenants";
import ChantierListeSituation from "./ChantierListeSituation";
import { COLORS } from "../../constants/colors";

const ChantierDocumentsTab = ({ chantierData, state, setState, isActive }) => {
  // Centralisation des états pour chaque sous-liste et filtres
  const [selectedTab, setSelectedTab] = useState(state.selectedTab || 0);

  // Utiliser le hook centralisé pour les situations
  const { situations, loading: loadingSituations, loadSituations, updateSituation } = useSituationsManager(
    chantierData?.id
  );

  // Filtres pour les situations
  const [filtersSituations, setFiltersSituations] = useState(
    state.filtersSituations || {
      numero_situation: "",
      mois: "",
      pourcentage_avancement: "",
      montant_apres_retenues: "",
      statut: "Tous",
    }
  );
  const [isLoadedSituations, setIsLoadedSituations] = useState(false);

  // Devis
  const [devis, setDevis] = useState([]);
  const [filtersDevis, setFiltersDevis] = useState(
    state.filtersDevis || {
      numero: "",
      client_name: "",
      date_creation: "",
      price_ht: "",
      status: "Tous",
    }
  );
  const [isLoadedDevis, setIsLoadedDevis] = useState(false);

  // Factures
  const [factures, setFactures] = useState([]);
  const [filtersFactures, setFiltersFactures] = useState(
    state.filtersFactures || {
      numero_facture: "",
      date_creation: "",
      montant: "",
      state_facture: "Tous",
      type_facture: "Tous",
    }
  );
  const [isLoadedFactures, setIsLoadedFactures] = useState(false);

  // Avenants
  const [avenants, setAvenants] = useState([]);
  const [filtersAvenants, setFiltersAvenants] = useState(
    state.filtersAvenants || {
      numero_devis: "",
      date_creation: "",
      montant: "",
      status: "Tous",
      avenant_numero: "Tous",
    }
  );
  const [isLoadedAvenants, setIsLoadedAvenants] = useState(false);

  // Gestion du changement d'onglet
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    setState({
      ...state,
      selectedTab: newValue,
      filtersSituations,
      filtersDevis,
      filtersFactures,
      filtersAvenants,
    });
  };

  // Callbacks de sauvegarde différée pour chaque filtre
  const saveFiltersSituations = (filters) => {
    setFiltersSituations(filters);
    setState((prev) => ({ ...prev, filtersSituations: filters }));
  };
  const saveFiltersDevis = (filters) => {
    setFiltersDevis(filters);
    setState((prev) => ({ ...prev, filtersDevis: filters }));
  };
  const saveFiltersFactures = (filters) => {
    setFiltersFactures(filters);
    setState((prev) => ({ ...prev, filtersFactures: filters }));
  };
  const saveFiltersAvenants = (filters) => {
    setFiltersAvenants(filters);
    setState((prev) => ({ ...prev, filtersAvenants: filters }));
  };

  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!chantierData?.id) return;
    if (!hasLoaded.current) {
      // fetchData(); // Décommente et adapte si tu as une fonction de chargement
      hasLoaded.current = true;
    }
  }, [chantierData?.id]);

  // Recharger toutes les données quand l'onglet Documents devient actif (depuis ChantierDetail)
  useEffect(() => {
    if (isActive && chantierData?.id) {
      // Recharger les données selon l'onglet actuellement sélectionné
      if (selectedTab === 0) {
        loadSituations();
      } else if (selectedTab === 1) {
        setIsLoadedDevis(false);
      } else if (selectedTab === 2) {
        setIsLoadedFactures(false);
      } else if (selectedTab === 3) {
        setIsLoadedAvenants(false);
      }
    }
  }, [isActive, chantierData?.id, selectedTab, loadSituations]);

  // Recharger les situations quand l'onglet Situations devient actif
  useEffect(() => {
    if (selectedTab === 0 && chantierData?.id && isActive) {
      loadSituations();
    }
  }, [selectedTab, chantierData?.id, isActive, loadSituations]);

  // Recharger les devis quand l'onglet Devis devient actif
  useEffect(() => {
    if (selectedTab === 1 && chantierData?.id && isActive) {
      setIsLoadedDevis(false);
    }
  }, [selectedTab, chantierData?.id, isActive]);

  // Recharger les factures quand l'onglet Factures devient actif
  useEffect(() => {
    if (selectedTab === 2 && chantierData?.id && isActive) {
      setIsLoadedFactures(false);
    }
  }, [selectedTab, chantierData?.id, isActive]);

  // Recharger les avenants quand l'onglet Avenants devient actif
  useEffect(() => {
    if (selectedTab === 3 && chantierData?.id && isActive) {
      setIsLoadedAvenants(false);
    }
  }, [selectedTab, chantierData?.id, isActive]);

  return (
    <>
      {/* Barre d'onglets dans une Box séparée, sans fond blanc */}
      <Box sx={{ mb: 3, background: "none" }}>
        <AppBar
          position="static"
          color="default"
          elevation={0}
          sx={{
            borderRadius: "10px",
            background: "#f5f5f5",
            pt: 2,
            pb: 2,
            color: "black",
          }}
        >
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant="fullWidth"
            textColor="inherit"
            TabIndicatorProps={{ style: { background: COLORS.primary } }}
            sx={{
              color: COLORS.text,
              gap: "32px",
              "& .MuiTab-root": {
                color: COLORS.textMuted,
                minWidth: 120,
                fontWeight: 500,
                fontSize: "1.1rem",
                textTransform: "none",
                "&.Mui-selected": {
                  color: COLORS.primary,
                  fontWeight: 700,
                },
              },
              "& .MuiTabs-flexContainer": {
                gap: "32px",
              },
            }}
          >
            <Tab label="Situations" />
            <Tab label="Devis" />
            <Tab label="Factures" />
            <Tab label="Avenants" />
          </Tabs>
        </AppBar>
      </Box>

      {/* Liste dans une autre Box, fond blanc via Paper */}
      <Box>
        <Paper
          elevation={0}
          sx={{ borderRadius: "10px", p: 2, background: "#fff" }}
        >
          {selectedTab === 0 && (
            <ChantierListeSituation
              chantierData={chantierData}
              situations={situations}
              setSituations={() => {}} // Fonction vide car géré par le hook
              filters={filtersSituations}
              setFilters={setFiltersSituations}
              isLoaded={!loadingSituations}
              setIsLoaded={setIsLoadedSituations}
              onSaveFilters={saveFiltersSituations}
              updateSituation={updateSituation}
              loadSituations={loadSituations}
            />
          )}
          {selectedTab === 1 && (
            <ChantierListeDevis
              chantierData={chantierData}
              devis={devis}
              setDevis={setDevis}
              filters={filtersDevis}
              setFilters={setFiltersDevis}
              isLoaded={isLoadedDevis}
              setIsLoaded={setIsLoadedDevis}
              onSaveFilters={saveFiltersDevis}
            />
          )}
          {selectedTab === 2 && (
            <ChantierListeFactures
              chantierData={chantierData}
              factures={factures}
              setFactures={setFactures}
              filters={filtersFactures}
              setFilters={setFiltersFactures}
              isLoaded={isLoadedFactures}
              setIsLoaded={setIsLoadedFactures}
              onSaveFilters={saveFiltersFactures}
            />
          )}
          {selectedTab === 3 && (
            <ChantierListeAvenants
              chantierData={chantierData}
              avenants={avenants}
              setAvenants={setAvenants}
              filters={filtersAvenants}
              setFilters={setFiltersAvenants}
              isLoaded={isLoadedAvenants}
              setIsLoaded={setIsLoadedAvenants}
              onSaveFilters={saveFiltersAvenants}
            />
          )}
        </Paper>
      </Box>
    </>
  );
};

export default ChantierDocumentsTab;
