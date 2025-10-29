import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Select, MenuItem, FormControl, InputLabel, Button, Box, Typography } from '@mui/material';
import { FiPlus } from 'react-icons/fi';
import DevisStyles from './Devis/DevisStyles';
import DevisHeader from './Devis/DevisHeader';
import ClientInfo from './Devis/ClientInfo';
import ChantierInfo from './Devis/ChantierInfo';
import DevisTable from './Devis/DevisTable';
import DevisRecap from './Devis/DevisRecap';
import ChantierForm from './ChantierForm';

const DevisAvance = () => {
  // États pour les données du devis
  const [devisData, setDevisData] = useState({
    numero: 'DEV-2024-001',
    date_creation: new Date().toISOString().split('T')[0],
    nature_travaux: 'Peinture intérieure et extérieure',
    tva_rate: 20,
    price_ht: 0,
    price_ttc: 0
  });

  const [client, setClient] = useState({
    name: 'Dupont',
    surname: 'Jean',
    civilite: 'M.',
    poste: 'Directeur',
    client_mail: 'jean.dupont@example.com',
    phone_Number: '0612345678'
  });

  const [societe, setSociete] = useState({
    nom_societe: 'Entreprise ABC',
    rue_societe: '123 Rue de la Paix',
    codepostal_societe: '75001',
    ville_societe: 'Paris'
  });

  const [chantier, setChantier] = useState({
    chantier_name: 'Rénovation appartement',
    rue: '456 Avenue des Champs',
    code_postal: '75008',
    ville: 'Paris'
  });

  const [parties, setParties] = useState([
    {
      id: 1,
      titre: 'PREPARATION',
      total_partie: 1500.00,
      special_lines: [],
      sous_parties: [
        {
          id: 1,
          description: 'Préparation des supports',
          total_sous_partie: 800.00,
          special_lines: [],
          lignes_details: [
            {
              id: 1,
              description: 'Ponçage des murs',
              unite: 'm²',
              quantity: 50,
              custom_price: 8.00,
              total: 400.00
            },
            {
              id: 2,
              description: 'Rebouchage des fissures',
              unite: 'm²',
              quantity: 20,
              custom_price: 20.00,
              total: 400.00
            }
          ]
        },
        {
          id: 2,
          description: 'Protection des sols',
          total_sous_partie: 700.00,
          special_lines: [],
          lignes_details: [
            {
              id: 3,
              description: 'Pose de bâches de protection',
              unite: 'm²',
              quantity: 100,
              custom_price: 7.00,
              total: 700.00
            }
          ]
        }
      ]
    },
    {
      id: 2,
      titre: 'PEINTURE',
      total_partie: 2500.00,
      special_lines: [],
      sous_parties: [
        {
          id: 3,
          description: 'Peinture intérieure',
          total_sous_partie: 2500.00,
          special_lines: [],
          lignes_details: [
            {
              id: 4,
              description: 'Sous-couche d\'accrochage',
              unite: 'm²',
              quantity: 50,
              custom_price: 15.00,
              total: 750.00
            },
            {
              id: 5,
              description: 'Peinture acrylique satinée',
              unite: 'm²',
              quantity: 50,
              custom_price: 35.00,
              total: 1750.00
            }
          ]
        }
      ]
    }
  ]);

  const [special_lines_global, setSpecialLinesGlobal] = useState([]);
  const [total_ht, setTotalHt] = useState(4000.00);
  const [tva, setTva] = useState(800.00);
  const [montant_ttc, setMontantTtc] = useState(4800.00);

  // États pour la gestion des chantiers
  const [chantiers, setChantiers] = useState([]);
  const [selectedChantierId, setSelectedChantierId] = useState(null);
  const [showChantierForm, setShowChantierForm] = useState(false);
  const [isLoadingChantiers, setIsLoadingChantiers] = useState(false);

  // États pour la gestion du devis
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false);
  const [devisType, setDevisType] = useState("normal"); // 'normal' ou 'chantier'
  const [nextTsNumber, setNextTsNumber] = useState(null);

  // Fonction pour formater les montants avec espaces
  const formatMontantEspace = (montant) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant).replace(/,/g, ' ');
  };

  // Fonction pour formater le numéro de téléphone
  const formatPhoneNumber = (phone) => {
    if (!phone || typeof phone !== 'string') return '';
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length === 9) {
      const phoneWithZero = '0' + cleanPhone;
      return phoneWithZero.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1.$2.$3.$4.$5');
    } else if (cleanPhone.length >= 10) {
      return cleanPhone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1.$2.$3.$4.$5');
    }
    return phone;
  };

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  // Charger les chantiers
  const fetchChantiers = async () => {
    try {
      setIsLoadingChantiers(true);
      const response = await axios.get('/api/chantier/');
      setChantiers(response.data);
    } catch (error) {
      console.error('Erreur lors du chargement des chantiers:', error);
    } finally {
      setIsLoadingChantiers(false);
    }
  };

  // Gérer la sélection d'un chantier
  const handleChantierSelection = async (chantierId) => {
    setSelectedChantierId(chantierId);
    // Régénérer le numéro de devis avec le bon suffixe
    await generateDevisNumber(chantierId);
    
    if (chantierId && chantierId !== '') {
      try {
        // Récupérer les détails du chantier avec la société
        const chantierResponse = await axios.get(`/api/chantier/${chantierId}/`);
        const chantierData = chantierResponse.data;
        
        // Mettre à jour les informations du chantier
        setChantier({
          chantier_name: chantierData.chantier_name,
          rue: chantierData.rue,
          code_postal: chantierData.code_postal,
          ville: chantierData.ville
        });
        
        // Mettre à jour les informations de la société et du client si disponibles
        if (chantierData.societe) {
          // Si societe est un objet avec les détails (via serializer)
          if (typeof chantierData.societe === 'object' && chantierData.societe.id) {
            setSociete({
              nom_societe: chantierData.societe.nom_societe || '',
              rue_societe: chantierData.societe.rue_societe || '',
              codepostal_societe: chantierData.societe.codepostal_societe || '',
              ville_societe: chantierData.societe.ville_societe || ''
            });
            
            // Récupérer les informations du client
            if (chantierData.societe.client_name) {
              const clientId = typeof chantierData.societe.client_name === 'object' 
                ? chantierData.societe.client_name.id 
                : chantierData.societe.client_name;
              
              if (clientId) {
                const clientResponse = await axios.get(`/api/client/${clientId}/`);
                const clientData = clientResponse.data;
                
                setClient({
                  name: clientData.name || '',
                  surname: clientData.surname || '',
                  civilite: clientData.civilite || 'M.',
                  poste: clientData.poste || '',
                  client_mail: clientData.client_mail || '',
                  phone_Number: String(clientData.phone_Number || '')
                });
              }
            }
          } else if (typeof chantierData.societe === 'number') {
            // Si societe est juste un ID, récupérer les détails
            const societeResponse = await axios.get(`/api/societe/${chantierData.societe}/`);
            const societeData = societeResponse.data;
            
            setSociete({
              nom_societe: societeData.nom_societe || '',
              rue_societe: societeData.rue_societe || '',
              codepostal_societe: societeData.codepostal_societe || '',
              ville_societe: societeData.ville_societe || ''
            });
            
            if (societeData.client_name) {
              const clientId = typeof societeData.client_name === 'object' 
                ? societeData.client_name.id 
                : societeData.client_name;
              
              if (clientId) {
                const clientResponse = await axios.get(`/api/client/${clientId}/`);
                const clientData = clientResponse.data;
                
                setClient({
                  name: clientData.name || '',
                  surname: clientData.surname || '',
                  civilite: clientData.civilite || 'M.',
                  poste: clientData.poste || '',
                  client_mail: clientData.client_mail || '',
                  phone_Number: String(clientData.phone_Number || '')
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Erreur lors du chargement des détails du chantier:', error);
        // En cas d'erreur, utiliser les données de base du chantier
        const selectedChantier = chantiers.find(c => c.id === chantierId);
        if (selectedChantier) {
          setChantier({
            chantier_name: selectedChantier.chantier_name,
            rue: selectedChantier.rue,
            code_postal: selectedChantier.code_postal,
            ville: selectedChantier.ville
          });
        }
      }
    }
  };

  // Gérer la création d'un nouveau chantier
  const handleChantierCreation = (chantierData) => {
    setChantier({
      chantier_name: chantierData.chantier_name,
      rue: chantierData.rue,
      code_postal: chantierData.code_postal,
      ville: chantierData.ville
    });
    setSelectedChantierId(-1); // Marquer comme nouveau chantier
    setShowChantierForm(false);
    // Régénérer le numéro avec le format "Devis travaux"
    generateDevisNumber(-1);
  };

  // Fonction pour générer le numéro de devis
  const generateDevisNumber = async (chantierIdParam = null) => {
    try {
      setIsGeneratingNumber(true);
      
      // Utiliser le paramètre ou l'état selectedChantierId
      const chantierIdToUse = chantierIdParam !== null ? chantierIdParam : selectedChantierId;
      
      // Déterminer le type de devis selon le chantier sélectionné
      const isChantierExistant = chantierIdToUse && chantierIdToUse !== -1;
      
      // Préparer les paramètres de l'API
      const params = {};
      if (isChantierExistant) {
        params.chantier_id = chantierIdToUse;
        params.devis_chantier = 'false'; // TS pour chantier existant
      } else {
        params.devis_chantier = 'true'; // Devis travaux pour nouveau chantier
      }
      
      const response = await axios.get("/api/get-next-devis-number/", { params });
      
      // Base du numéro : "Devis n°017.2025"
      let baseNumber = response.data.numero;
      
      // Ajouter le suffixe selon le type
      if (isChantierExistant && response.data.next_ts) {
        // Chantier existant : "Devis n°017.2025 - TS n°001"
        baseNumber = `${baseNumber} - TS n°${response.data.next_ts}`;
        setNextTsNumber(response.data.next_ts);
      } else if (!isChantierExistant) {
        // Nouveau chantier : "Devis n°017.2025 - Devis travaux"
        baseNumber = `${baseNumber} - Devis travaux`;
      }
      
      setDevisData(prev => ({ ...prev, numero: baseNumber }));
      return baseNumber;
    } catch (error) {
      console.error("Erreur lors de la génération du numéro de devis:", error);
      const currentYear = new Date().getFullYear();
      const fallbackNumber = `Devis n°001.${currentYear}`;
      setDevisData(prev => ({ ...prev, numero: fallbackNumber }));
      return fallbackNumber;
    } finally {
      setIsGeneratingNumber(false);
    }
  };

  // Charger les chantiers au montage du composant
  useEffect(() => {
    fetchChantiers();
    // Générer le numéro initial avec le format "Devis travaux" (nouveau chantier)
    generateDevisNumber(null);
  }, []);

  return (
    <div style={{
      padding: '20px 10px',
      marginRight: '150px', // Espace pour la sidebar
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      borderRadius: '10px',
    }}>
      <div style={{
        fontFamily: 'Arial, Helvetica, "Roboto", sans-serif',
        fontSize: '16px',
        maxWidth: '1200px',
        margin: '0 150px 0 150px',
        padding: '20px 10px',
        
        minHeight: '100vh',
        backgroundColor: 'rgb(255 255 255)',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <DevisStyles />
        
        {/* En-tête de la page */}
        <div style={{
          backgroundColor: '#1976d2',
          color: 'white',
          padding: '20px 30px',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
            Création de Devis
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '16px', opacity: 0.9 }}>
            Remplissez les informations ci-dessous pour créer votre devis
          </p>
        </div>

        {/* Contenu principal */}
        <div style={{ padding: '30px' }}>
          
          {/* Section 0: Sélection du chantier */}
          <div style={{
            backgroundColor: '#e3f2fd',
            border: '2px solid #1976d2',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid #1976d2'
            }}>
              🏗️ Sélection du chantier
            </h2>
            
            <Box sx={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              <FormControl sx={{ minWidth: 300, flex: 1 }}>
                <InputLabel shrink>Chantier existant</InputLabel>
                <Select
                  value={selectedChantierId || ''}
                  onChange={(e) => handleChantierSelection(e.target.value)}
                  disabled={isLoadingChantiers}
                  displayEmpty
                  notched
                >
                  <MenuItem value="">
                    <em>-- Choisir un chantier --</em>
                  </MenuItem>
                  {chantiers.map((chantier) => (
                    <MenuItem key={chantier.id} value={chantier.id}>
                      {chantier.chantier_name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Typography sx={{ color: '#6c757d', fontSize: '14px' }}>
                ou
              </Typography>
              
              <Button
                variant="contained"
                startIcon={<FiPlus />}
                onClick={() => setShowChantierForm(true)}
                sx={{
                  backgroundColor: '#28a745',
                  '&:hover': { backgroundColor: '#218838' },
                  textTransform: 'none',
                  fontWeight: 'bold'
                }}
              >
                Créer un nouveau chantier
              </Button>
            </Box>
            
            {selectedChantierId && (
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'white', borderRadius: '4px', border: '1px solid #dee2e6' }}>
                <Typography variant="body2" color="text.secondary">
                  Chantier sélectionné : <strong>{chantier.chantier_name}</strong>
                </Typography>
              </Box>
            )}
          </div>
          
          {/* Section 1: Client et contact */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid #1976d2'
            }}>
              👤 Client et contact
            </h2>
            
            <ClientInfo 
              client={client} 
              societe={societe} 
              formatPhoneNumber={formatPhoneNumber} 
            />
          </div>

          {/* Section 2: Chantier */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid #1976d2'
            }}>
              🏗️ Adresse du chantier
            </h2>
            
            <ChantierInfo chantier={chantier} selectedChantierId={selectedChantierId} />
          </div>

          {/* Section 3: Informations générales */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid #1976d2'
            }}>
              📋 Informations générales
            </h2>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ maxWidth: '600px', width: '100%' }}>
                <h3 style={{ color: '#495057', fontSize: '16px', margin: '0 0 15px 0', textAlign: 'center' }}>
                  Informations du devis
                </h3>
                <DevisHeader 
                  devisData={devisData} 
                  formatDate={formatDate}
                  onDateChange={(value, field) => {
                    if (field === 'numero') {
                      setDevisData(prev => ({ ...prev, numero: value }));
                    } else {
                      setDevisData(prev => ({ ...prev, date_creation: value }));
                    }
                  }}
                  isGeneratingNumber={isGeneratingNumber}
                />
              </div>
            </div>
          </div>

          {/* Section 4: Détail du devis */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid #1976d2'
            }}>
              📊 Détail du devis
            </h2>
            
            <DevisTable 
              devisData={devisData}
              parties={parties}
              special_lines_global={special_lines_global}
              total_ht={total_ht}
              formatMontantEspace={formatMontantEspace}
              onNatureTravauxChange={(value) => setDevisData(prev => ({ ...prev, nature_travaux: value }))}
            />
          </div>

          {/* Section 5: Récapitulatif */}
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '25px',
            marginBottom: '30px'
          }}>
            <h2 style={{
              color: '#1976d2',
              fontSize: '20px',
              fontWeight: 'bold',
              margin: '0 0 20px 0',
              paddingBottom: '10px',
              borderBottom: '2px solid #1976d2'
            }}>
              💰 Récapitulatif financier
            </h2>
            
            <DevisRecap 
              devisData={devisData}
              total_ht={total_ht}
              tva={tva}
              montant_ttc={montant_ttc}
              formatMontantEspace={formatMontantEspace}
            />
          </div>

          {/* Section 6: Actions */}
          <div style={{
            backgroundColor: '#e3f2fd',
            border: '1px solid #1976d2',
            borderRadius: '8px',
            padding: '25px',
            textAlign: 'center'
          }}>
            <h3 style={{
              color: '#1976d2',
              fontSize: '18px',
              fontWeight: 'bold',
              margin: '0 0 15px 0'
            }}>
              Actions disponibles
            </h3>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button style={{
                backgroundColor: '#1976d2',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                💾 Sauvegarder le devis
              </button>
              <button style={{
                backgroundColor: '#28a745',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                👁️ Aperçu PDF
              </button>
              <button style={{
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                📋 Dupliquer
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de création de chantier */}
      <ChantierForm
        open={showChantierForm}
        onClose={() => setShowChantierForm(false)}
        onSubmit={handleChantierCreation}
        societeId={null} // Pour l'instant, on peut laisser null
      />
    </div>
  );
};

export default DevisAvance;