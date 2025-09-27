import { Box, CircularProgress } from "@mui/material";
import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import React from "react";
import ReactDOM from "react-dom/client";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import "./../../static/css/app.css";
import AgencyExpenses from "./AgencyExpenses";
import AgentCardContainer from "./AgentCardContainer";
import BonCommandeModif from "./BonCommandeModif";
import CalendrierAgentContainer from "./CalendrierAgentContainer";
import TableauFacturation from "./chantier/TableauFacturation";
import ChantierDetail from "./ChantierDetail";
import ChantierInfo from "./ChantierInfo";
import ChantiersDashboard from "./ChantiersDashboard";
import ChantierTabs from "./ChantierTabs";
import CreationDevis from "./CreationDevis";
import CreationPartie from "./CreationPartie";
import Dashboard from "./Dashboard";
import Drive from "./Drive";
import GestionAppelsOffres from "./GestionAppelsOffres";
import GlobalConflictModal from "./GlobalConflictModal";
import Layout from "./Layout";
import ListeBonCommande from "./ListeBonCommande";
import ListeChantier from "./ListeChantier";
import ListeDevis from "./ListeDevis";
import ListeFactures from "./ListeFactures";
import ListeSituation from "./ListeSituation";
import ListeFournisseurs from "./ListeFournisseurs";
import Login from "./Login";
import ModificationDevis from "./ModificationDevis";
import PaiementsSousTraitantPage from "./PaiementsSousTraitantPage";
import PlanningContainer from "./PlanningContainer";
import StockForm from "./StockForm";
import TableauSuivi from "./TableauSuivi";
import Test from "./Test";

// Créer un thème par défaut
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#dc004e",
    },
  },
  typography: {
    fontFamily: ["Roboto", "Arial", "sans-serif"].join(","),
  },
});

// Composant pour protéger les routes - redirige vers /login si non connecté
const ProtectedRoute = ({ children, isAuthenticated }) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  // Utiliser le hook d'authentification personnalisé
  const { isAuthenticated, user, loading, checkAuth, logout } = useAuth();

  // Fonction appelée après une connexion réussie
  const handleLoginSuccess = (userData) => {
    checkAuth(); // Vérifier l'état d'authentification
  };

  // Fonction pour se déconnecter
  const handleLogout = async () => {
    try {
      // Utiliser la fonction logout du hook useAuth
      await logout();
      // Rediriger vers la page de login
      window.location.href = "/login";
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      // En cas d'erreur, forcer la redirection
      window.location.href = "/login";
    }
  };

  // Afficher un écran de chargement pendant la vérification
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        {/* Modal global pour les conflits de fichiers - accessible partout */}
        <GlobalConflictModal />

        <Routes>
          {/* Route de connexion - accessible sans authentification */}
          <Route
            path="/login"
            element={
              isAuthenticated ? (
                <Navigate to="/" replace /> // Si déjà connecté, rediriger vers l'accueil
              ) : (
                <Login onLoginSuccess={handleLoginSuccess} />
              )
            }
          />

          {/* Routes protégées - nécessitent une authentification */}
          <Route
            path="/"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/chantier/:id"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <ChantierInfo />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ChantierDetail/:id"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <ChantierDetail />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ListeChantier"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <ListeChantier />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ChantiersDashboard"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <ChantiersDashboard />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/CreationDevis"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <CreationDevis />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/GestionAppelsOffres"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <GestionAppelsOffres />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/CreationPartie"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <CreationPartie />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ListeDevis"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <ListeDevis />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ListeFactures"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <ListeFactures />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ModificationDevis/:devisId"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <ModificationDevis />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/AgentCardContainer"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <AgentCardContainer />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/CalendrierAgentContainer"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <CalendrierAgentContainer />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/PlanningContainer"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <PlanningContainer />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/StockForm"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <StockForm />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/AgencyExpenses"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <AgencyExpenses />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/BonCommandeModif"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <BonCommandeModif />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ModificationBC/:id"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <BonCommandeModif />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ListeBonCommande"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <ListeBonCommande />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ListeSituation"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <ListeSituation />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ListeFournisseurs"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <ListeFournisseurs />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/TableauSuivi"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <TableauSuivi />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/TableauFacturation"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <TableauFacturation />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/ChantierTabs"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <ChantierTabs />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/paiements-sous-traitant/:chantierId/:sousTraitantId"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <PaiementsSousTraitantPage />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/drive"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <Drive />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/Test"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <Test />
                </Layout>
              </ProtectedRoute>
            }
          />

          {/* Redirection par défaut - si une route n'existe pas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

// Créer un root et rendre l'application
const rootElement = document.getElementById("app");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
} else {
  console.error("Cannot find root element");
}
