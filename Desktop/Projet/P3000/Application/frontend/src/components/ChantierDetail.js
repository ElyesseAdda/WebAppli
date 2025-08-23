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
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RecapFinancierProvider } from "./chantier/RecapFinancierContext";

// Composants des onglets
import SearchIcon from "@mui/icons-material/Search";
import Fuse from "fuse.js";
import ChantierCommandesTab from "./chantier/ChantierCommandesTab";
import ChantierDocumentsTab from "./chantier/ChantierDocumentsTab";
import ChantierInfoTab from "./chantier/ChantierInfoTab";
import ChantierRecapFinancierTab from "./chantier/ChantierRecapFinancierTab";

// Déplace TabPanel en dehors du composant ChantierDetail
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

  // --- BARRE DE RECHERCHE CHANTIER ---
  const [chantiers, setChantiers] = useState([]);
  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [history, setHistory] = useState([]);

  // Ref pour la barre de recherche et le dropdown
  const searchBarRef = useRef(null);

  // Charger l'historique depuis localStorage
  useEffect(() => {
    const hist = JSON.parse(localStorage.getItem("chantier_history") || "[]");
    setHistory(hist);
  }, []);

  // Charger la liste des chantiers (API)
  useEffect(() => {
    const fetchChantiers = async () => {
      try {
        const res = await axios.get("/api/chantier/");
        setChantiers(res.data);
      } catch (e) {
        // Optionnel: gestion d'erreur
      }
    };
    fetchChantiers();
  }, []);

  // Recherche fuzzy avec Fuse.js
  useEffect(() => {
    if (!searchValue) {
      setSearchResults([]);
      return;
    }
    const fuse = new Fuse(chantiers, {
      keys: ["chantier_name"],
      threshold: 0.4, // tolère les fautes
    });
    setSearchResults(fuse.search(searchValue).map((r) => r.item));
  }, [searchValue, chantiers]);

  // Fermer le dropdown si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchBarRef.current &&
        !searchBarRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Gérer la sélection d'un chantier
  const handleSelectChantier = (chantier) => {
    // Mettre à jour l'historique (max 5)
    let newHistory = [chantier, ...history.filter((c) => c.id !== chantier.id)];
    if (newHistory.length > 5) newHistory = newHistory.slice(0, 5);
    setHistory(newHistory);
    localStorage.setItem("chantier_history", JSON.stringify(newHistory));
    setShowDropdown(false);
    setSearchValue("");
    // Rediriger vers le chantier sélectionné
    navigate(`/ChantierDetail/${chantier.id}`);
  };

  // Afficher la liste à afficher (historique ou résultats)
  const displayList = searchValue ? searchResults : history;
  // --- FIN BARRE DE RECHERCHE ---

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

      // Si le chantier n'existe pas (404 ou 500), rediriger vers le premier chantier disponible
      if (error.response?.status === 404 || error.response?.status === 500) {
        try {
          const chantiersResponse = await axios.get("/api/chantier/");
          if (chantiersResponse.data && chantiersResponse.data.length > 0) {
            const premierChantier = chantiersResponse.data[0];
            console.log(`Redirection vers le chantier ${premierChantier.id}`);
            navigate(`/ChantierDetail/${premierChantier.id}`);
            return;
          }
        } catch (redirectError) {
          console.error("Erreur lors de la redirection:", redirectError);
        }
      }

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
          {/* BARRE DE RECHERCHE CHANTIER */}
          <Box
            ref={searchBarRef}
            sx={{ mb: 3, position: "relative", maxWidth: 500 }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                borderRadius: "24px",
                background: "#fff",
                boxShadow: 1,
                px: 2,
                py: 1,
                border: "1px solid #e0e0e0",
              }}
            >
              <SearchIcon sx={{ color: "#757575", mr: 1 }} />
              <input
                type="text"
                placeholder="Rechercher un chantier..."
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: 18,
                  flex: 1,
                }}
              />
            </Box>
            {/* Dropdown suggestions */}
            {showDropdown && displayList.length > 0 && (
              <Paper
                sx={{
                  position: "absolute",
                  top: 44,
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  maxHeight: 300,
                  overflowY: "auto",
                  borderRadius: 2,
                }}
                elevation={4}
              >
                {displayList.map((chantier) => (
                  <Box
                    key={chantier.id}
                    sx={{
                      px: 2,
                      py: 1.2,
                      cursor: "pointer",
                      "&:hover": { background: "#f5f5f5" },
                      fontWeight: id == chantier.id ? 700 : 400,
                      color:
                        id == chantier.id ? "primary.main" : "text.primary",
                    }}
                    onClick={() => handleSelectChantier(chantier)}
                  >
                    {chantier.chantier_name}
                  </Box>
                ))}
              </Paper>
            )}
          </Box>
          {/* Nom du chantier et Tabs */}
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

          {/* Contenu des onglets - tous les TabPanel sont toujours montés */}
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
