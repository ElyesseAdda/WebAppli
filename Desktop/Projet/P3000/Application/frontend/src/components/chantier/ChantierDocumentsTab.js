import { AppBar, Box, Paper, Tab, Tabs } from "@mui/material";
import React, { useEffect, useRef, useState } from "react";
import ChantierListeDevis from "./ChantierListeDevis";
import ChantierListeFactures from "./ChantierListeFactures";
import ChantierListeSituation from "./ChantierListeSituation";

const ChantierDocumentsTab = ({ chantierData, state, setState }) => {
  // Centralisation des états pour chaque sous-liste et filtres
  const [selectedTab, setSelectedTab] = useState(state.selectedTab || 0);

  // Situations
  const [situations, setSituations] = useState([]);
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
      price_ttc: "",
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

  // Gestion du changement d'onglet
  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    setState({
      ...state,
      selectedTab: newValue,
      filtersSituations,
      filtersDevis,
      filtersFactures,
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

  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!chantierData?.id) return;
    if (!hasLoaded.current) {
      // fetchData(); // Décommente et adapte si tu as une fonction de chargement
      hasLoaded.current = true;
    }
  }, [chantierData?.id]);

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
            TabIndicatorProps={{ style: { background: "#1976d2" } }}
            sx={{
              color: "black",
              gap: "32px",
              "& .MuiTab-root": {
                color: "black",
                minWidth: 120,
                fontWeight: 500,
                fontSize: "1.1rem",
                textTransform: "none",
              },
              "& .Mui-selected": {
                color: "primary.main",
                fontWeight: 700,
              },
              "& .MuiTabs-flexContainer": {
                gap: "32px",
              },
            }}
          >
            <Tab label="Situations" />
            <Tab label="Devis" />
            <Tab label="Factures" />
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
              setSituations={setSituations}
              filters={filtersSituations}
              setFilters={setFiltersSituations}
              isLoaded={isLoadedSituations}
              setIsLoaded={setIsLoadedSituations}
              onSaveFilters={saveFiltersSituations}
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
        </Paper>
      </Box>
    </>
  );
};

export default ChantierDocumentsTab;
