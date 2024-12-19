import CssBaseline from "@mui/material/CssBaseline";
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
import ListeDevis from "./ListeDevis";
import ListePartiesSousParties from "./ListPartiesSousParties";
import PlanningContainer from "./PlanningContainer";
import StockForm from "./StockForm";
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
            <Route path="/ListChantier" element={<ListChantier />} />
            <Route path="/CreationDevis" element={<CreationDevis />} />
            <Route path="/ListeDevis" element={<ListeDevis />} />
            <Route path="/ListePartie" element={<ListePartiesSousParties />} />
            <Route path="/CreationPartie" element={<CreationPartie />} />
            <Route path="/Stock" element={<StockForm />} />
            <Route path="/Agent" element={<CalendrierAgentContainer />} />
            <Route path="/AgentCard" element={<AgentCardContainer />} />
            <Route path="/PlanningContainer" element={<PlanningContainer />} />
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
