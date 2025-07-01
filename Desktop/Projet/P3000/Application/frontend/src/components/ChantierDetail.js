import {
  AppBar,
  Box,
  CircularProgress,
  Container,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RecapFinancierProvider } from "./chantier/RecapFinancierContext";

// Composants des onglets
import ChantierCommandesTab from "./chantier/ChantierCommandesTab";
import ChantierDocumentsTab from "./chantier/ChantierDocumentsTab";
import ChantierInfoTab from "./chantier/ChantierInfoTab";
import ChantierRecapFinancierTab from "./chantier/ChantierRecapFinancierTab";

const ChantierDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState(0);
  const [chantierData, setChantierData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // États persistants pour chaque sous-onglet
  const [documentsState, setDocumentsState] = useState({});
  const [uiState, setUiState] = useState({
    commandes: {
      filters: {
        numero: "",
        fournisseur: "",
        date_creation: "",
        montant_total: "",
        statut: "",
        statut_paiement: "",
        montant_paye: "",
        reste_a_payer: "",
      },
      openAccordions: {},
    },
    // ... autres onglets plus tard
  });
  const [infoState, setInfoState] = useState({});

  const fetchChantierData = async () => {
    if (!id) {
      setError("ID du chantier manquant");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`/api/chantier/${id}/details/`);
      setChantierData(response.data);
    } catch (error) {
      console.error(
        "Erreur lors du chargement des données du chantier:",
        error
      );
      setError(
        "Impossible de charger les données du chantier. Veuillez réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChantierData();
  }, [id]);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  // Composant pour le contenu des onglets (toujours monté, masqué si non sélectionné)
  const TabPanel = ({ children, value, index }) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`chantier-tabpanel-${index}`}
      aria-labelledby={`chantier-tab-${index}`}
      style={{ display: value === index ? "block" : "none" }}
    >
      <Box sx={{ p: 3 }}>{children}</Box>
    </div>
  );

  if (loading) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <Typography color="error">{error}</Typography>
        </Box>
      </Container>
    );
  }

  if (!chantierData) {
    return (
      <Container maxWidth="xl">
        <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
          <Typography color="error">Chantier non trouvé</Typography>
        </Box>
      </Container>
    );
  }

  return (
    <RecapFinancierProvider>
      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ flexGrow: 1 }}>
          <AppBar
            position="static"
            color="default"
            elevation={0}
            sx={{
              backgroundColor: "white",
              borderRadius: "10px",
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                borderBottom: 1,
                borderColor: "divider",
                backgroundColor: "white",
                borderRadius: "10px",
                p: 2,
                gap: 4,
              }}
            >
              {/* Nom du chantier */}
              <Typography
                variant="h5"
                sx={{
                  fontWeight: "bold",
                  color: "black",
                  backgroundColor: "white",
                  width: "auto",
                  flexShrink: 0,
                  minWidth: "200px",
                  fontFamily: "Roboto Slab, serif",
                }}
              >
                {chantierData.nom || "Chantier"}
              </Typography>

              {/* Onglets */}
              <Tabs
                value={selectedTab}
                onChange={handleTabChange}
                aria-label="chantier tabs"
                variant="fullWidth"
                sx={{
                  flex: 1,
                  "& .MuiTab-root": {
                    textTransform: "none",
                    fontSize: "1.1rem",
                    fontWeight: 500,
                    minWidth: 120,
                    color: "text.primary",
                    fontFamily: "Roboto, Arial, sans-serif",
                    "&.Mui-selected": {
                      color: "primary.main",
                      fontWeight: 700,
                    },
                  },
                  "& .MuiTabs-flexContainer": {
                    justifyContent: "space-between",
                    px: 2,
                  },
                }}
              >
                <Tab label="Informations" />
                <Tab label="Documents" />
                <Tab label="Commandes" />
                <Tab label="Récap Financier" />
              </Tabs>
            </Box>
          </AppBar>

          {/* Contenu des onglets : tous les TabPanels sont toujours montés */}
          <TabPanel value={selectedTab} index={0}>
            <ChantierInfoTab
              chantierData={chantierData}
              onUpdate={fetchChantierData}
              state={infoState}
              setState={setInfoState}
            />
          </TabPanel>
          <TabPanel value={selectedTab} index={1}>
            <ChantierDocumentsTab
              chantierData={chantierData}
              state={documentsState}
              setState={setDocumentsState}
            />
          </TabPanel>
          <Paper
            elevation={0}
            sx={{
              mt: 2,
              borderRadius: "10px",
              "& .MuiTypography-h6": {
                fontWeight: "bold",
                color: "text.primary",
                fontSize: "1.1rem",
                mb: 1,
                backgroundColor: "transparent",
              },
              "& .MuiChip-root": {
                height: "24px",
                fontSize: "0.875rem",
              },
            }}
          >
            <TabPanel value={selectedTab} index={2}>
              <ChantierCommandesTab
                chantierData={chantierData}
                state={uiState.commandes}
                setState={(newState) =>
                  setUiState((prev) => ({
                    ...prev,
                    commandes: { ...prev.commandes, ...newState },
                  }))
                }
              />
            </TabPanel>
            <TabPanel value={selectedTab} index={3}>
              <ChantierRecapFinancierTab chantierId={id} />
            </TabPanel>
          </Paper>
        </Box>
      </Container>
    </RecapFinancierProvider>
  );
};

export default ChantierDetail;
