import React from 'react';
import './../../static/css/slideBar.css';
import logo from '../img/logo.png';
import { FaHouse } from "react-icons/fa6";
import { MdContactPhone } from "react-icons/md";
import { PiBuildingBold } from "react-icons/pi";
import { FaMoneyBillWave } from "react-icons/fa";
import { FaWarehouse } from "react-icons/fa";


const SlideBar = () => {
    return (
        <div className="slide-bar">
            <div className='logo-container'>
                 <img src={logo}  alt="logo" className="logo"/> 
            </div>
            <div className='link-container'>
            <ul>
                <li><a href="/"><FaHouse />  Accueil </a></li>
                <li><a href="/"><MdContactPhone />
                    Contact</a></li>
                <li><a href="/"><PiBuildingBold />
                  Chantier</a></li>
                <li><a href="/"><FaMoneyBillWave />
                  Comptabilité</a></li>
                <li><a href="/"><FaWarehouse />
                  Stocks</a></li>
            </ul>
            
            </div>
        </div>
    );
};

export default SlideBar;