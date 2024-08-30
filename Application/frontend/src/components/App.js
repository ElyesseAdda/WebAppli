import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './Layout';
import ListChantier from './ListChantier';
import ChantierInfo from './ChantierInfo';
import Dashboard from './Dashboard';




function App() {
    return (
        <Router>
            <Layout>
                <Routes>
                    <Route index element={<Dashboard />} />
                        <Route path="/chantier/:id" element={<ChantierInfo />} />                   
                        <Route path="/ListChantier" element={<ListChantier />} />
                        
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