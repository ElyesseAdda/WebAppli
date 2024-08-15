import React, { useState, useEffect } from 'react';
import './../../static/css/listChantier.css'
import {FaPlusCircle} from 'react-icons/fa'

function ListChantiers() {
    const [chantiers, setChantiers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('http://localhost:8000/api/chantierchantiers/', {
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
        <div>
            <button className='NewChantier' link='./'variant="contained"> <FaPlusCircle />   Ajouter un Chantier</button>
            <div className='ListContainer'>
                <div className='List'>
                <table>
                    <thead>
                        <tr>
                            <th>Nom Chantier</th>
                            <th>Nom Client</th>
                            <th>Statut</th>
                            <th>Date de Création</th>
                            <th>Chiffre d'Affaires</th>
                        </tr>
                    </thead>
                    <tbody>
                        {chantiers.map(chantier => (
                            <tr key={chantier.id}>
                                <td>{chantier.chantier_name}</td>
                                <td>{chantier.client_name}</td>
                                <td className={chantier.state_chantier}> {chantier.state_chantier} </td>
                                <td>{chantier.date_debut}</td>
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
