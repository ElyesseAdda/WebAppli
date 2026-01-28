import React, { useEffect, useMemo, useState } from "react";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoClose } from "react-icons/io5";
import {
  MdConstruction,
  MdCreateNewFolder,
  MdEventAvailable,
  MdFolderOpen,
  MdBusiness,
  MdTableChart,
} from "react-icons/md";
import { SiGoogledrive } from "react-icons/si";
import { FaHandshake } from "react-icons/fa";
import { MdFolderShared } from "react-icons/md";
import { NavLink, useLocation } from "react-router-dom";
import logo from "../img/logo.png";
import "./../../static/css/slideBar.css";

const SlideBar = ({ toggleSidebar, isSidebarVisible }) => {
  const location = useLocation();
  const [expandedCategories, setExpandedCategories] = useState({});

  const menu = useMemo(
    () => [
      {
        key: "chantier",
        label: "Chantier",
        icon: MdConstruction,
        children: [
          { label: "Dashboard", to: "/" },
          { label: "Récap Chantier", to: "/ChantierDetail/1" },
          { label: "Appel d'Offre", to: "/GestionAppelsOffres" },
          { label: "Agence", to: "/AgencyExpenses" },
        ],
      },
      {
        key: "distributeurs",
        label: "Distributeurs",
        icon: MdBusiness,
        to: "/distributeurs",
      },
      {
        key: "tableau",
        label: "Tableau",
        icon: MdTableChart,
        children: [
          { label: "Tableau Facturation", to: "/TableauFacturation" },
          { label: "Tableau Fournisseur", to: "/TableauFournisseur" },
          { label: "Tableau Sous-Traitant", to: "/TableauSousTraitant" },
        ],
      },
      {
        key: "agent_planning",
        label: "Agent & Planning",
        icon: MdEventAvailable,
        children: [
          { label: "Gestion agent", to: "/CalendrierAgentContainer" },
          { label: "Planning hebdo", to: "/PlanningContainer" },
        ],
      },
      {
        key: "document",
        label: "Documents",
        icon: MdFolderOpen,
        children: [
          {
            label: "Liste document",
            children: [
              { label: "Liste Devis", to: "/ListeDevis" },
              { label: "Liste Situation", to: "/ListeSituation" },
              { label: "Liste facture", to: "/ListeFactures" },
              { label: "Liste Bon de Commande", to: "/ListeBonCommande" },
            ],
          },
          {
            label: "Créer document",
            children: [
              { label: "Devis", to: "/DevisAvance" },
              { label: "Bon de commande", to: "/BonCommande" },
            ],
            icon: MdCreateNewFolder,
          },
        ],
      },

      {
        key: "fournisseurs",
        label: "Collaborateur",
        icon: FaHandshake,
        children: [
          { label: "Liste Fournisseurs", to: "/ListeFournisseurs" },
          { label: "Sous traitant", to: "/ListeSousTraitants" },
        ],
      },
      {
        key: "drive_v2",
        label: "Drive",
        icon: SiGoogledrive,
        to: "/drive-v2",
      },
      {
        key: "chantiers_drive_paths",
        label: "Chemins Drive",
        icon: MdFolderShared,
        to: "/ChantiersDrivePaths",
      },
    ],
    []
  );

  const isPathActive = (to) => {
    if (!to) return false;
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  };

  useEffect(() => {
    // Ouvrir automatiquement la catégorie qui contient la route active (gère sous-groupes + racine "/")
    const currentPath = location.pathname;
    const containingCategory = menu.find((category) => {
      const children = category.children || [];
      return children.some((child) => {
        if (child.to) return isPathActive(child.to);
        const grandChildren = child.children || [];
        return grandChildren.some((gc) => isPathActive(gc.to));
      });
    });
    if (containingCategory) {
      setExpandedCategories((prev) => ({
        ...prev,
        [containingCategory.key]: true,
      }));
    }
  }, [location.pathname, menu]);

  const handleToggleCategory = (key) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <>
      {!isSidebarVisible && (
        <button className="burger-button" onClick={toggleSidebar}>
          <GiHamburgerMenu />
        </button>
      )}
      <div className={`slide-bar ${isSidebarVisible ? "" : "hidden"}`}>
        {isSidebarVisible && (
          <button className="close-button" onClick={toggleSidebar}>
            <IoClose />
          </button>
        )}
        <div className="logo-container">
          <img src={logo} alt="logo" className="logo" />
        </div>
        <div className="link-container">
          <ul>
            {menu.map((item) => {
              const Icon = item.icon;
              const hasChildren =
                Array.isArray(item.children) && item.children.length > 0;

              if (!hasChildren) {
                // Lien simple (interne ou externe)
                if (item.external) {
                  return (
                    <li key={item.key}>
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {Icon && <Icon />} {item.label}
                      </a>
                    </li>
                  );
                }
                return (
                  <li key={item.key}>
                    <NavLink
                      to={item.to}
                      className={({ isActive }) => (isActive ? "active" : "")}
                    >
                      {Icon && <Icon />} {item.label}
                    </NavLink>
                  </li>
                );
              }

              // Catégorie avec sous-menu (accordéon)
              const isExpanded = Boolean(expandedCategories[item.key]);
              const isActiveCategory =
                hasChildren &&
                (item.children || []).some((child) =>
                  child.to
                    ? isPathActive(child.to)
                    : (child.children || []).some((gc) => isPathActive(gc.to))
                );
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    className={`category-button ${
                      isActiveCategory ? "active" : ""
                    }`}
                    onClick={() => handleToggleCategory(item.key)}
                  >
                    <span className="category-left">
                      {Icon && <Icon />} {item.label}
                    </span>
                    {/* icône d'accordéon supprimée */}
                  </button>
                  <ul
                    className={`submenu ${
                      isExpanded ? "expanded" : "collapsed"
                    }`}
                    style={{ display: isExpanded ? "block" : "none" }}
                  >
                    {item.children.map((child) => {
                      if (child.children && child.children.length > 0) {
                        return (
                          <li
                            key={`${item.key}-${child.label}`}
                            className="submenu-group"
                          >
                            <div className="submenu-group-label">
                              {child.label}
                            </div>
                            <ul className="submenu-group-links">
                              {child.children.map((link) => (
                                <li
                                  key={`${item.key}-${child.label}-${link.to}`}
                                >
                                  <NavLink
                                    to={link.to}
                                    className={({ isActive }) =>
                                      isActive ? "active" : ""
                                    }
                                  >
                                    {link.label}
                                  </NavLink>
                                </li>
                              ))}
                            </ul>
                          </li>
                        );
                      }
                      return (
                        <li key={`${item.key}-${child.to}`}>
                          <NavLink
                            to={child.to}
                            className={({ isActive }) =>
                              isActive ? "active" : ""
                            }
                          >
                            {child.label}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
};

export default SlideBar;
