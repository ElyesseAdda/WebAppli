import CssBaseline from "@mui/material/CssBaseline";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import React from "react";
import ReactDOM from "react-dom/client";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./../../static/css/app.css";
import AgencyExpenses from "./AgencyExpenses";
import AgentCardContainer from "./AgentCardContainer";
import BonCommandeModif from "./BonCommandeModif";
import CalendrierAgentContainer from "./CalendrierAgentContainer";
import ChantierDetail from "./ChantierDetail";
import ChantierInfo from "./ChantierInfo";
import ChantiersDashboard from "./ChantiersDashboard";
import ChantierTabs from "./ChantierTabs";
import CreationDevis from "./CreationDevis";
import CreationPartie from "./CreationPartie";
import Dashboard from "./Dashboard";
import Layout from "./Layout";
import ListeBonCommande from "./ListeBonCommande";
import ListeChantier from "./ListeChantier";
import ListeDevis from "./ListeDevis";
import ListeFactures from "./ListeFactures";
import ListeSituation from "./ListeSituation";
import ListePartiesSousParties from "./ListPartiesSousParties";
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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="/chantier/:id" element={<ChantierInfo />} />
            <Route path="/ChantierDetail/:id" element={<ChantierDetail />} />
            <Route path="/ListeChantier" element={<ListeChantier />} />
            <Route
              path="/ChantiersDashboard"
              element={<ChantiersDashboard />}
            />
            <Route path="/CreationDevis" element={<CreationDevis />} />
            <Route path="/ListePartie" element={<ListePartiesSousParties />} />
            <Route path="/ListeDevis" element={<ListeDevis />} />
            <Route path="/CreationPartie" element={<CreationPartie />} />
            <Route path="/Stock" element={<StockForm />} />
            <Route path="/Agent" element={<CalendrierAgentContainer />} />
            <Route path="/AgentCard" element={<AgentCardContainer />} />
            <Route path="/PlanningContainer" element={<PlanningContainer />} />
            <Route path="/ListeFactures" element={<ListeFactures />} />
            <Route path="/AgencyExpenses" element={<AgencyExpenses />} />
            <Route
              path="/ModificationDevis/:devisId"
              element={<ModificationDevis />}
            />
            <Route path="/BonCommande" element={<ListeBonCommande />} />
            <Route path="/ModificationBC/:id" element={<BonCommandeModif />} />
            <Route path="/ListeSituation" element={<ListeSituation />} />
            <Route path="/TableauSuivi" element={<TableauSuivi />} />
            <Route path="/ChantierTabs" element={<ChantierTabs />} />
            <Route
              path="/paiements-sous-traitant/:chantierId/:sousTraitantId"
              element={<PaiementsSousTraitantPage />}
            />
            <Route path="/Test" element={<Test />} />;
          </Routes>
        </Layout>
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
