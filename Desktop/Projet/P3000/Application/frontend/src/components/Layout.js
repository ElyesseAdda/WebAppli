import React, { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import axios from "axios";
import "./../../static/css/layout.css";
import AgentCarteModal from "./AgentCarteModal";
import BonCommandeForm from "./BonCommandeForm";
import BreadcrumbHeader from "./BreadcrumbHeader";
import Header from "./Header";
import SlideBar from "./SlideBar";

const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [bonCommandeFormOpen, setBonCommandeFormOpen] = useState(false);
  const [agentCarteOpen, setAgentCarteOpen] = useState(false);
  const [agents, setAgents] = useState([]);

  const chantierIdMatch = location.pathname.match(/\/ChantierDetail\/(\d+)/);
  const chantierId = chantierIdMatch ? chantierIdMatch[1] : undefined;

  const refreshAgents = useCallback(() => {
    axios
      .get("/api/agent/?include_inactive=true")
      .then((response) => {
        setAgents(Array.isArray(response.data) ? response.data : []);
      })
      .catch((error) => {
        console.error("Erreur lors de la récupération des agents:", error);
      });
  }, []);

  useEffect(() => {
    if (agentCarteOpen) {
      refreshAgents();
    }
  }, [agentCarteOpen, refreshAgents]);

  const handleOpenBonCommande = useCallback(() => {
    setBonCommandeFormOpen(true);
  }, []);

  const handleCloseBonCommande = useCallback(() => {
    setBonCommandeFormOpen(false);
  }, []);

  const handleOpenAgentCarte = useCallback(() => {
    setAgentCarteOpen(true);
  }, []);

  const handleCloseAgentCarte = useCallback(() => {
    setAgentCarteOpen(false);
  }, []);

  const toggleSidebar = () => {
    setSidebarVisible(!isSidebarVisible);
  };

  // Fonction pour fermer la sidebar
  const closeSidebar = () => {
    setSidebarVisible(false);
  };

  // Écouter l'événement closeSidebar depuis le composant Drive
  React.useEffect(() => {
    const handleCloseSidebar = () => {
      closeSidebar();
    };

    window.addEventListener("closeSidebar", handleCloseSidebar);

    return () => {
      window.removeEventListener("closeSidebar", handleCloseSidebar);
    };
  }, []);

  return (
    <div
      className={`layout ${
        isSidebarVisible ? "sidebar-visible" : "sidebar-hidden"
      }`}
    >
      <Header />
      <SlideBar
        toggleSidebar={toggleSidebar}
        isSidebarVisible={isSidebarVisible}
        user={user}
        onOpenBonCommande={handleOpenBonCommande}
        onOpenAgentCarte={handleOpenAgentCarte}
      />
      <div className="main-content">
        <BreadcrumbHeader user={user} onLogout={onLogout} />
        {children}
      </div>
      {bonCommandeFormOpen && (
        <BonCommandeForm
          hideButton
          defaultOpen
          chantierId={chantierId}
          onClose={handleCloseBonCommande}
        />
      )}
      <AgentCarteModal
        isOpen={agentCarteOpen}
        handleClose={handleCloseAgentCarte}
        refreshAgents={refreshAgents}
        agents={agents}
      />
    </div>
  );
};

export default Layout;
