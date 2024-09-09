import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './../../static/css/dashboard.css';

function Dashboard() {
    const [data, setData] = useState({
        chantier_en_cours: 0,
        nombre_devis: 0,
        nombre_facture: 0,
        cout_materiel: 0,
        cout_main_oeuvre: 0,
        cout_sous_traitance: 0,
        chiffre_affaire: 0,
        devis_terminer:0,
        facture_terminer:0,
        devis_en_cour:0,
        facture_en_cour:0,
        devis_facturé:0,
        facture_facturé:0,
        total_devis_terminer:0,
        total_devis_facturé:0,
        total_facture_terminer:0,
        total_facture_facturé:0,
        total_devis_combined:0,
        total_facture_combined:0,
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/dashboard');
                setData(response.data);

                
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            }
        };
        fetchData();
    }, []);

    const getColorClass = (value) => {
        return value >= 0 ? 'positive' : 'negative';
    };

    return (
    <div className="dashboard">
         
            {/* Partie Chantier en cour */}
            <div className="dashboard-cards">
                <div className="chantier-container">
                    <div className="chantier">
                        <p>aqgeazq</p>
                        <h1>{data.chantier_en_cours}</h1>
                    </div>
                    <div className="total">
                        <p>Total Engagé</p>
                        <h2 className={getColorClass(data.chantier_en_cours)}>{data.chantier_en_cours} €</h2>
                    </div>
                    <div className="marge-fourniture">
                        <p>Marge fourniture</p>
                        <h2 className={getColorClass(data.chantier_en_cours)}>{data.chantier_en_cours} €</h2>
                    </div>
                    <div className="marge-soustraitance">
                        <p>Marge sous traitance</p>
                        <h2 className={getColorClass(data.chantier_en_cours)}>{data.chantier_en_cours} €</h2>
                    </div>
                    <div className="marge-chantier">
                        <p>Marge sur chantier</p>
                        <h2 className={getColorClass(data.chantier_en_cours)}>{data.chantier_en_cours} €</h2>
                    </div>
                    <div className="ca-estime-part"> 
                </div>
        <div className="element-container">
            <div className="devis-part"> 
                 {/* -----------------------------Partie devis--------------------------*/}
                 <div className="devis-container">
                    
                    <div className="devis-title"> 
                    <p>Devis</p>
                    </div>

                    <div className="ndevis-en-cour"> 
                    <h2 className={(data.devis_en_cour)}>{data.devis_en_cour}</h2>
                    </div>

                    <div className="ndevis-facturé"> 
                    <h2 className={(data.total_devis_facturé)}>{data.total_devis_facturé}</h2>
                    </div>

                    <div className="ndevis-terminé"> 
                    <h2 className={(data.total_devis_terminer)}>{data.total_devis_terminer}</h2>
                    </div>

                    <div className="devis-en-cour"> 
                        <h3>NB en cours</h3>
                    </div>

                    <div className="devis-facturé"> 
                        <h3>NB facturé</h3>
                    </div>

                    <div className="devis-terminé"> 
                        <h3>NB terminé</h3>
                    </div>
                    
                    <div className="devis-total"> 
                        <h2>Total</h2>
                    </div>

                    <div className="ntotal"> 
                    <h2>{data.total_devis_combined} €</h2>
                    </div>
                </div>
            </div>
                    {/* ---------------------------Partie facture -------------------------*/}
                <div className="facture-part">
                 <div className="facture-container">
                    
                    <div className="facture-title"> 
                    <p>Facture</p>
                    </div>

                    <div className="nfacture-en-cour"> 
                    <h2 className={(data.facture_en_cour)}>{data.facture_en_cour}</h2>
                    </div>

                    <div className="nfacture-facturé"> 
                    <h2 className={(data.total_facture_facturé)}>{data.total_facture_facturé}</h2>
                    </div>

                    <div className="nfacture-terminé"> 
                    <h2 className={(data.total_facture_terminer)}>{data.total_facture_terminer}</h2>
                    </div>

                    <div className="facture-en-cour"> 
                        <h3>NB en cours</h3>
                    </div>

                    <div className="facture-facturé"> 
                        <h3>NB facturé</h3>
                    </div>

                    <div className="facture-terminé"> 
                        <h3>NB terminé</h3>
                    </div>
                    
                    <div className="facture-total"> 
                        <h2>Total</h2>
                    </div>

                    <div className="ntotal"> 
                    <h2>{data.total_facture_combined} €</h2>
                    </div>
                 </div> 
                
                </div>

                    {/* --------------------------Partie CA Estime------------------------ */}
                <div className="estime-part">
                 <div class="estime-container">
                    <div className="estime-title"> 
                    <p>CA Estimer</p> 
                    </div>
                    <div className="montant-estime"> 
                        
                    </div>
                    <div className="estime-materiel"> 

                    </div>
                    <div className="estime-main-oeuvre"> 

                    </div>
                    <div className="estime-autre"> 

                    </div>
                 </div> 
                </div>
                </div>
                <div className="ca-reel-part"> </div>
                <div className="ca-graph"> </div>
                <div className="depense-graph"> </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
