import React from "react";
import { FaFileInvoice, FaMoneyBillWave, FaWarehouse } from "react-icons/fa";
import { FaHouse } from "react-icons/fa6";
import { GiHamburgerMenu } from "react-icons/gi";
import { IoClose } from "react-icons/io5";
import { MdContactPhone } from "react-icons/md";
import { PiBuildingBold } from "react-icons/pi";
import logo from "../img/logo.png";
import "./../../static/css/slideBar.css";

const SlideBar = ({ toggleSidebar, isSidebarVisible }) => {
  return (
    <div className={`slide-bar ${isSidebarVisible ? "" : "hidden"}`}>
      {isSidebarVisible ? (
        <button className="close-button" onClick={toggleSidebar}>
          <IoClose />
        </button>
      ) : (
        <button className="burger-button" onClick={toggleSidebar}>
          <GiHamburgerMenu />
        </button>
      )}
      <div className="logo-container">
        <img src={logo} alt="logo" className="logo" />
      </div>
      <div className="link-container">
        <ul>
          <li>
            <a href="/">
              <FaHouse /> Accueil{" "}
            </a>
          </li>
          <li>
            <a href="/">
              <MdContactPhone />
              Contact
            </a>
          </li>
          <li>
            <a href="/">
              <PiBuildingBold />
              Chantier
            </a>
          </li>
          <li>
            <a href="/">
              <FaMoneyBillWave />
              Comptabilité
            </a>
          </li>
          <li>
            <a href="/">
              <FaWarehouse />
              Stocks
            </a>
          </li>
          <li>
            <a href="/BonCommande">
              <FaFileInvoice />
              Bons de Commande
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default SlideBar;
