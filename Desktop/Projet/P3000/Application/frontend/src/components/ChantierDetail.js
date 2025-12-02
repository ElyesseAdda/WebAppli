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
import RefreshIcon from "@mui/icons-material/Refresh";
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

        // Nettoyer l'historique avec les données fraîches
        cleanHistory(res.data);
      } catch (e) {
        console.error("Erreur lors du chargement des chantiers:", e);
      }
    };
    fetchChantiers();
  }, []);

  // Fonction pour nettoyer et mettre à jour l'historique
  const cleanHistory = (freshChantiers) => {
    const hist = JSON.parse(localStorage.getItem("chantier_history") || "[]");
    const validChantierIds = freshChantiers.map((c) => c.id);

    // Filtrer les chantiers supprimés et mettre à jour les noms
    const updatedHistory = hist
      .filter((chantier) => validChantierIds.includes(chantier.id))
      .map((chantier) => {
        // Trouver les données fraîches pour ce chantier
        const freshChantier = freshChantiers.find((c) => c.id === chantier.id);
        if (freshChantier) {
          return {
            id: chantier.id,
            chantier_name:
              freshChantier.nom ||
              freshChantier.chantier_name ||
              chantier.chantier_name,
          };
        }
        return chantier;
      });

    // Mettre à jour l'historique si des changements ont été détectés
    const hasChanges =
      updatedHistory.length !== hist.length ||
      updatedHistory.some(
        (updated, index) =>
          hist[index] && updated.chantier_name !== hist[index].chantier_name
      );

    if (hasChanges) {
      setHistory(updatedHistory);
      localStorage.setItem("chantier_history", JSON.stringify(updatedHistory));
    }
  };

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
  const handleSelectChantier = async (chantier) => {
    try {
      // Récupérer les données fraîches du chantier depuis l'API
      const response = await axios.get(`/api/chantier/${chantier.id}/details/`);
      const freshChantierData = response.data;

      // Créer un objet chantier avec les données fraîches pour l'historique
      const updatedChantier = {
        id: freshChantierData.id,
        chantier_name: freshChantierData.nom || freshChantierData.chantier_name,
      };

      // Mettre à jour l'historique avec les données fraîches
      let newHistory = [
        updatedChantier,
        ...history.filter((c) => c.id !== updatedChantier.id),
      ];
      if (newHistory.length > 5) newHistory = newHistory.slice(0, 5);
      setHistory(newHistory);
      localStorage.setItem("chantier_history", JSON.stringify(newHistory));

      setShowDropdown(false);
      setSearchValue("");

      // Rediriger vers le chantier sélectionné
      navigate(`/ChantierDetail/${updatedChantier.id}`);
    } catch (error) {
      console.error("Erreur lors de la sélection du chantier:", error);

      if (error.response?.status === 404) {
        // Si le chantier n'existe plus, le retirer de l'historique
        const filteredHistory = history.filter((c) => c.id !== chantier.id);
        setHistory(filteredHistory);
        localStorage.setItem(
          "chantier_history",
          JSON.stringify(filteredHistory)
        );
        alert("Ce chantier n'existe plus ou a été supprimé.");
      } else {
        // Autre erreur (500, réseau, etc.) - essayer de rafraîchir l'historique
        console.log("Tentative de rafraîchissement de l'historique...");
        await refreshHistory();
        alert("Erreur de connexion. L'historique a été mis à jour.");
      }
    }
  };

  // Fonction pour forcer la mise à jour de l'historique (utile après modification d'un chantier)
  const refreshHistory = async () => {
    try {
      const res = await axios.get("/api/chantier/");
      cleanHistory(res.data);
    } catch (error) {
      console.error("Erreur lors de la mise à jour de l'historique:", error);
    }
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
      
      // Sauvegarder le dernier chantier consulté dans localStorage
      localStorage.setItem("last_visited_chantier", id);
    } catch (error) {
      console.error(
        "Erreur lors du chargement des données du chantier:",
        error
      );
      console.log("Status de l'erreur:", error.response?.status);
      console.log("Tentative de redirection...");

      // Si le chantier n'existe pas (404 ou 500), rediriger intelligemment
      if (error.response?.status === 404 || error.response?.status === 500) {
        try {
          const chantiersResponse = await axios.get("/api/chantier/");
          if (chantiersResponse.data && chantiersResponse.data.length > 0) {
            // D'abord essayer de rediriger vers le dernier chantier visité s'il existe et est valide
            const lastVisitedId = localStorage.getItem("last_visited_chantier");
            const lastVisitedExists = lastVisitedId && 
              chantiersResponse.data.some(c => c.id === parseInt(lastVisitedId));
            
            let targetChantier;
            if (lastVisitedExists && lastVisitedId !== id) {
              // Le dernier chantier visité existe et est différent de celui qui a échoué
              targetChantier = chantiersResponse.data.find(c => c.id === parseInt(lastVisitedId));
              console.log(`Redirection vers le dernier chantier visité: ${lastVisitedId}`);
            } else {
              // Sinon, prendre le premier chantier disponible
              targetChantier = chantiersResponse.data[0];
              console.log(`Redirection vers le premier chantier: ${targetChantier.id}`);
              
              // Nettoyer le dernier chantier sauvegardé s'il n'existe plus
              if (error.response?.status === 404) {
                localStorage.removeItem("last_visited_chantier");
              }
            }
            
            navigate(`/ChantierDetail/${targetChantier.id}`);
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

  // Charger le dernier chantier consulté si aucun ID dans l'URL ou au premier chargement
  useEffect(() => {
    const lastVisitedId = localStorage.getItem("last_visited_chantier");
    
    // Si aucun ID dans l'URL et qu'il y a un dernier chantier visité, y rediriger
    if (!id && lastVisitedId) {
      navigate(`/ChantierDetail/${lastVisitedId}`, { replace: true });
      return;
    }
    
    // Si un ID est présent, vérifier s'il faut rediriger vers le dernier visité
    // (par exemple si on arrive sur l'ID 1 par défaut mais qu'un autre chantier a été visité)
    if (id && lastVisitedId && id !== lastVisitedId) {
      // Vérifier si c'est vraiment le premier chargement (pas de données de chantier)
      if (!chantierData) {
        // Rediriger vers le dernier chantier visité au lieu du chantier par défaut
        navigate(`/ChantierDetail/${lastVisitedId}`, { replace: true });
      }
    }
  }, []); // Exécuter seulement au montage du composant

  useEffect(() => {
    if (id) {
      fetchChantierData();
    }
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
              <RefreshIcon
                sx={{
                  color: "#757575",
                  ml: 1,
                  cursor: "pointer",
                  "&:hover": { color: "primary.main" },
                }}
                onClick={refreshHistory}
                title="Rafraîchir l'historique"
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
              isActive={selectedTab === 1}
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
