import React, { useState, useEffect } from 'react';
import './../../static/css/listChantier.css'
import {FaPlusCircle} from 'react-icons/fa'
import { Link } from 'react-router-dom';
import SlideBar from './SlideBar';
import Header from './Header'


function ListChantiers() {
    const [chantiers, setChantiers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://127.0.0.1:8000/api/chantier/', {
            method: 'GET', // Assure-toi que c'est bien une requête GET
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            setChantiers(data);
            setLoading(false);
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
            setLoading(false);
        });
    }, []);

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div className='main-container'>
            <div className='ListContainer'>
            <Link to={`/api/chantier`}className='NewChantier' link='./'variant="contained"> <FaPlusCircle />   Ajouter un Chantier</Link>
                <div className='List'>
                <table>
                    <thead>
                        <tr>
                            <th>Nom Chantier</th>
                            <th>Nom Client</th>
                            <th>Statut</th>
                            <th>Date de Création</th>
                            <th>Taux facturation</th>
                            <th>Chiffre d'Affaires</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chantiers.map(chantier => (
                            <tr key={chantier.id}>
                                <td>
                                <Link to={`/chantier/${chantier.id}`}>
                                            {chantier.chantier_name}
                                        </Link>
                                        </td>
                                <td>{chantier.client_name}</td>
                                <td className={chantier.state_chantier}> {chantier.state_chantier} </td>
                                <td>{chantier.date_debut}</td>
                                <td>A faire</td>
                                <td>{chantier.chiffre_affaire} €</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
        
    </div>
    );
}

export default ListChantiers;
