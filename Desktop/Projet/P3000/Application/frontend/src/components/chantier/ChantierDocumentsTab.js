import { AppBar, Box, Paper, Tab, Tabs } from "@mui/material";
import React, { useEffect, useRef } from "react";
import ChantierListeDevis from "./ChantierListeDevis";
import ChantierListeFactures from "./ChantierListeFactures";
import ChantierListeSituation from "./ChantierListeSituation";

const ChantierDocumentsTab = ({ chantierData, state, setState }) => {
  const { selectedTab = 0, filters = {}, openAccordions = {} } = state;
  const setSelectedTab = (tab) => setState({ ...state, selectedTab: tab });
  const setFilters = (newFilters) =>
    setState({ ...state, filters: newFilters });
  const setOpenAccordions = (newOpen) =>
    setState({ ...state, openAccordions: newOpen });

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
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
            <ChantierListeSituation chantierData={chantierData} />
          )}
          {selectedTab === 1 && (
            <ChantierListeDevis chantierData={chantierData} />
          )}
          {selectedTab === 2 && (
            <ChantierListeFactures chantierData={chantierData} />
          )}
        </Paper>
      </Box>
    </>
  );
};

export default ChantierDocumentsTab;
