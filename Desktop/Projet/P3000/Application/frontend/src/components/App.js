import { ThemeProvider, createTheme } from "@mui/material/styles";
import React from "react";
import ReactDOM from "react-dom/client";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import "./../../static/css/app.css";
import AgentCardContainer from "./AgentCardContainer";
import CalendrierAgentContainer from "./CalendrierAgentContainer";
import ChantierInfo from "./ChantierInfo";
import CreationDevis from "./CreationDevis";
import CreationPartie from "./CreationPartie";
import Dashboard from "./Dashboard";
import Layout from "./Layout";
import ListChantier from "./ListChantier";
import ListePartiesSousParties from "./ListPartiesSousParties";
import PlanningHebdoAgent from "./PlanningHebdoAgent";
import StockForm from "./StockForm";
// Créer un thème par défaut
const theme = createTheme();

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route index element={<Dashboard />} />
          <Route path="/chantier/:id" element={<ChantierInfo />} />
          <Route path="/ListChantier" element={<ListChantier />} />
          <Route path="/CreationDevis" element={<CreationDevis />} />
          <Route path="/ListePartie" element={<ListePartiesSousParties />} />
          <Route path="/CreationPartie" element={<CreationPartie />} />
          <Route path="/Stock" element={<StockForm />} />
          <Route path="/Agent" element={<CalendrierAgentContainer />} />
          <Route path="/AgentCard" element={<AgentCardContainer />} />
          <Route path="/PlanningHebdoAgent" element={<PlanningHebdoAgent />} />
        </Routes>
      </Layout>
    </Router>
  );
}

// Créer un root et rendre l'application
const rootElement = document.getElementById("app");
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <ThemeProvider theme={theme}>
      <React.StrictMode>
        <App />
      </React.StrictMode>
    </ThemeProvider>
  );
} else {
  console.error("Cannot find root element");
}
