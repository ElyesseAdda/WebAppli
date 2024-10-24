import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import ListChantier from './ListChantier';
import ChantierInfo from './ChantierInfo';
import Dashboard from './Dashboard';
import CreationPartie from './CreationPartie';
import ListePartiesSousParties from './ListPartiesSousParties';
import CreationDevis from './CreationDevis';







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
                </Routes>
            </Layout>
        </Router>
        
    );
   
}

// Créer un root et rendre l'application
const rootElement = document.getElementById('app');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<App />);
} else {
    console.error('Cannot find root element');
}