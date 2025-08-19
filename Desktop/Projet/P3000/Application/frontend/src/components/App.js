import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
} from "react-router-dom";
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
import Layout from "./Layout";
import ListeBonCommande from "./ListeBonCommande";
import ListeChantier from "./ListeChantier";
import ListeDevis from "./ListeDevis";
import ListeFactures from "./ListeFactures";
import ListeSituation from "./ListeSituation";
import ListePartiesSousParties from "./ListPartiesSousParties";
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
  // États pour gérer l'authentification
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Vérifier l'authentification au chargement de l'application
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Fonction pour vérifier si l'utilisateur est connecté
  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/auth/check/", {
        credentials: "include", // Important pour envoyer les cookies de session
      });
      const data = await response.json();

      if (data.authenticated) {
        // Utilisateur connecté côté serveur
        setIsAuthenticated(true);
        setUser(data.user);
        localStorage.setItem("user", JSON.stringify(data.user));
      } else {
        // Vérifier s'il y a un utilisateur stocké localement (fallback)
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          setIsAuthenticated(true);
        }
      }
    } catch (error) {
      console.error(
        "Erreur lors de la vérification de l'authentification:",
        error
      );
      // En cas d'erreur, vérifier localStorage comme fallback
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fonction appelée après une connexion réussie
  const handleLoginSuccess = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  // Fonction pour se déconnecter
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout/", {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
    } finally {
      // Nettoyer l'état local même si la requête échoue
      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem("user");
    }
  };

  // Afficher un écran de chargement pendant la vérification
  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <div>Chargement...</div>
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
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
            path="/ListePartie"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <ListePartiesSousParties />
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
            path="/Stock"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <StockForm />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/Agent"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <CalendrierAgentContainer />
                </Layout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/AgentCard"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <AgentCardContainer />
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
            path="/BonCommande"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <Layout user={user} onLogout={handleLogout}>
                  <ListeBonCommande />
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
