import React, { useCallback, useState } from "react";
import { useLocation } from "react-router-dom";
import "./../../static/css/layout.css";
import BonCommandeForm from "./BonCommandeForm";
import BreadcrumbHeader from "./BreadcrumbHeader";
import Header from "./Header";
import SlideBar from "./SlideBar";

const Layout = ({ children, user, onLogout }) => {
  const location = useLocation();
  const [isSidebarVisible, setSidebarVisible] = useState(true);
  const [bonCommandeFormOpen, setBonCommandeFormOpen] = useState(false);

  const chantierIdMatch = location.pathname.match(/\/ChantierDetail\/(\d+)/);
  const chantierId = chantierIdMatch ? chantierIdMatch[1] : undefined;

  const handleOpenBonCommande = useCallback(() => {
    setBonCommandeFormOpen(true);
  }, []);

  const handleCloseBonCommande = useCallback(() => {
    setBonCommandeFormOpen(false);
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
    </div>
  );
};

export default Layout;
