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
import { DevisIndexManager } from '../utils/DevisIndexManager';

const DevisAvance = () => {
  // États pour les données du devis
  const [devisData, setDevisData] = useState({
    numero: '',
    date_creation: new Date().toISOString().split('T')[0],
    nature_travaux: '',
    tva_rate: 20,
    price_ht: 0,
    price_ttc: 0
  });

  const [client, setClient] = useState({
    name: '',
    surname: '',
    civilite: '',
    poste: '',
    client_mail: '',
    phone_Number: ''
  });

  const [societe, setSociete] = useState({
    nom_societe: '',
    rue_societe: '',
    codepostal_societe: '',
    ville_societe: ''
  });

  const [chantier, setChantier] = useState({
    chantier_name: '',
    rue: '',
    code_postal: '',
    ville: ''
  });


  const [special_lines_global, setSpecialLinesGlobal] = useState([]);
  const [total_ht, setTotalHt] = useState(4000.00);
  const [tva, setTva] = useState(800.00);
  const [montant_ttc, setMontantTtc] = useState(4800.00);

  // États pour les lignes spéciales v2
  const [pendingSpecialLines, setPendingSpecialLines] = useState([]);
  const [editingSpecialLine, setEditingSpecialLine] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [lineAwaitingPlacement, setLineAwaitingPlacement] = useState(null);  // Ligne en attente de clic sur le tableau
  const [isSelectingBase, setIsSelectingBase] = useState(false);  // Mode de sélection de base pour %
  const [pendingLineForBase, setPendingLineForBase] = useState(null);  // Ligne en cours de création avec % qui attend sa base

  // États pour le système unifié (DevisAvance utilise TOUJOURS le mode unified)
  const [devisItems, setDevisItems] = useState([]);
  const [isLoadingDevis, setIsLoadingDevis] = useState(false);
  const [isReordering, setIsReordering] = useState(false); // Flag pour éviter les recalculs pendant le drag & drop

  // États pour la gestion des chantiers
  const [chantiers, setChantiers] = useState([]);
  const [selectedChantierId, setSelectedChantierId] = useState(null);
  const [showChantierForm, setShowChantierForm] = useState(false);
  const [isLoadingChantiers, setIsLoadingChantiers] = useState(false);

  // États pour la gestion du devis
  const [isGeneratingNumber, setIsGeneratingNumber] = useState(false);
  const [devisType, setDevisType] = useState("normal"); // 'normal' ou 'chantier'
  const [nextTsNumber, setNextTsNumber] = useState(null);

  // États pour la gestion des parties
  const [availableParties, setAvailableParties] = useState([]);
  const [isLoadingParties, setIsLoadingParties] = useState(false);
  const [partiesToCreate, setPartiesToCreate] = useState([]); // Nouvelles parties à créer
  
  // ✅ NOUVEAU : Enrichir devisItems pour que les parties aient selectedSousParties (pour compatibilité)
  const enrichedDevisItems = React.useMemo(() => {
    return devisItems.map(item => {
      if (item.type === 'partie') {
        // Enrichir la partie avec selectedSousParties
        return {
          ...item,
          selectedSousParties: devisItems
            .filter(i => i.type === 'sous_partie' && i.partie_id === item.id)
            .map(spItem => ({
              ...spItem,
              selectedLignesDetails: devisItems
                .filter(i => i.type === 'ligne_detail' && i.sous_partie_id === spItem.id)
            }))
        };
      } else if (item.type === 'sous_partie') {
        // Enrichir la sous-partie avec selectedLignesDetails
        return {
          ...item,
          selectedLignesDetails: devisItems
            .filter(i => i.type === 'ligne_detail' && i.sous_partie_id === item.id)
        };
      }
      return item;
    });
  }, [devisItems]);
  
  // ✅ Construire selectedParties depuis enrichedDevisItems pour les barres de recherche
  const selectedParties = React.useMemo(() => {
    return enrichedDevisItems
      .filter(item => item.type === 'partie')
      .map(partieItem => ({
        ...partieItem,
        type: partieItem.type_activite || 'PEINTURE' // Restaurer le type original
      }));
  }, [enrichedDevisItems]);

  // Fonction pour formater les montants avec espaces
  const formatMontantEspace = (montant) => {
    return new Intl.NumberFormat('fr-FR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(montant).replace(/,/g, '.');
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
      // Erreur lors du chargement des chantiers
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
        // Erreur lors du chargement des détails du chantier
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
      // Erreur lors de la génération du numéro de devis
      const currentYear = new Date().getFullYear();
      const fallbackNumber = `Devis n°001.${currentYear}`;
      setDevisData(prev => ({ ...prev, numero: fallbackNumber }));
      return fallbackNumber;
    } finally {
      setIsGeneratingNumber(false);
    }
  };

  // Fonction pour charger les parties depuis l'API
  const loadParties = async (searchQuery = '') => {
    try {
      setIsLoadingParties(true);
      const response = await axios.get('/api/parties/');
      const allParties = response.data;
      
      // Filtrer les parties si une recherche est spécifiée
      let filteredParties = allParties;
      if (searchQuery) {
        filteredParties = allParties.filter(partie => 
          partie.titre.toLowerCase().includes(searchQuery.toLowerCase()) ||
          partie.type.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      
      setAvailableParties(allParties);
      return filteredParties;
    } catch (error) {
      // Erreur lors du chargement des parties
      return [];
    } finally {
      setIsLoadingParties(false);
    }
  };

  // Fonction pour rechercher les parties via l'endpoint dédié
  const searchPartiesAPI = async (searchQuery = '') => {
    try {
      setIsLoadingParties(true);
      const params = {};
      if (searchQuery) {
        params.q = searchQuery;
      }
      
      const response = await axios.get('/api/parties/search/', { params });
      return response.data.options;
    } catch (error) {
      // Erreur lors de la recherche des parties
      return [];
    } finally {
      setIsLoadingParties(false);
    }
  };

  // Fonction pour rechercher les parties (pour React Select)
  const searchParties = async (inputValue) => {
    try {
      // Utiliser le nouvel endpoint dédié
      const results = await searchPartiesAPI(inputValue);
      return results;
    } catch (error) {
      // Erreur lors de la recherche des parties
      return [];
    }
  };

  // Fonction pour gérer la sélection d'une partie
  const handlePartieSelect = (selectedOption) => {
    if (!selectedOption) return;
    
    // Vérifier si la partie n'existe pas déjà
    const alreadyExists = devisItems.some(item => item.type === 'partie' && item.id === selectedOption.value);
    if (alreadyExists) return;
    
    // ✅ Calculer le prochain index de partie
    const parties = devisItems.filter(i => i.type === 'partie');
    const nextIndex = parties.length + 1;
    
    // Créer l'item partie
    const newPartie = {
      ...selectedOption.data,
      type: 'partie',
      id: selectedOption.value,
      index_global: nextIndex,
      titre: selectedOption.data.titre,
      type_activite: selectedOption.data.type
    };
    
    // Ajouter directement dans devisItems
    setDevisItems(prev => sortByIndexGlobal([...prev, newPartie]));
  };

  // Fonction pour créer une nouvelle partie
  const handlePartieCreate = async (inputValue) => {
    try {
      // Créer la partie en base de données
      const response = await axios.post('/api/parties/', {
        titre: inputValue,
        type: 'PEINTURE',
        is_deleted: false
      });
      
      // ✅ Calculer le prochain index de partie
      const parties = devisItems.filter(i => i.type === 'partie');
      const nextIndex = parties.length + 1;
      
      const newPartie = {
        id: response.data.id,
        type: 'partie',
        titre: response.data.titre,
        type_activite: response.data.type,
        index_global: nextIndex,
        isNew: true
      };
      
      // Ajouter à la liste des parties à créer (pour référence)
      setPartiesToCreate(prev => [...prev, newPartie]);
      
      // Ajouter directement dans devisItems
      setDevisItems(prev => sortByIndexGlobal([...prev, newPartie]));
      
      // Recharger la liste des parties disponibles
      await loadParties();
      
      return {
        value: newPartie.id,
        label: newPartie.titre,
        data: newPartie
      };
    } catch (error) {
      // Erreur lors de la création de la partie
      const tempPartie = {
        id: `temp_${Date.now()}`,
        type: 'partie',
        titre: inputValue,
        type_activite: 'PEINTURE',
        index_global: devisItems.filter(i => i.type === 'partie').length + 1,
        isNew: true,
        isTemp: true
      };
      
      setPartiesToCreate(prev => [...prev, tempPartie]);
      setDevisItems(prev => sortByIndexGlobal([...prev, tempPartie]));
      
      return {
        value: tempPartie.id,
        label: tempPartie.titre,
        data: tempPartie
      };
    }
  };

  // Fonction pour supprimer une partie sélectionnée
  const handlePartieRemove = (partieId) => {
    // ✅ Supprimer la partie ET tous ses enfants de devisItems
    setDevisItems(prev => {
      // Trouver toutes les sous-parties de cette partie
      const sousPartiesIds = prev
        .filter(item => item.type === 'sous_partie' && item.partie_id === partieId)
        .map(sp => sp.id);
      
      // Supprimer : partie + sous-parties + lignes détails + lignes spéciales
      return prev.filter(item => {
        if (item.type === 'partie' && item.id === partieId) return false;
        if (item.type === 'sous_partie' && item.partie_id === partieId) return false;
        if (item.type === 'ligne_detail' && sousPartiesIds.includes(item.sous_partie_id)) return false;
        if (item.type === 'ligne_speciale' && item.context_type === 'partie' && item.context_id === partieId) return false;
        if (item.type === 'ligne_speciale' && item.context_type === 'sous_partie' && sousPartiesIds.includes(item.context_id)) return false;
        return true;
      });
    });
    
    // Si c'était une nouvelle partie, la retirer de la liste à créer
    setPartiesToCreate(prev => prev.filter(p => p.id !== partieId));
  };

  // Fonction pour éditer une partie sélectionnée
  const handlePartieEdit = (partieId) => {
    const partie = devisItems.find(item => item.type === 'partie' && item.id === partieId);
    if (partie) {
      const newTitre = prompt('Modifier le titre de la partie:', partie.titre);
      if (newTitre && newTitre.trim() !== partie.titre) {
        // ✅ Mettre à jour directement dans devisItems
        setDevisItems(prev => prev.map(item =>
          item.type === 'partie' && item.id === partieId
            ? { ...item, titre: newTitre.trim() }
            : item
        ));
        
        // Si c'est une partie existante, mettre à jour en base de données
        if (!partie.isNew && !partie.isTemp) {
          updatePartieInDB(partieId, newTitre.trim());
        }
      }
    }
  };

  // Fonction pour mettre à jour une partie en base de données
  const updatePartieInDB = async (partieId, newTitre) => {
    try {
      await axios.patch(`/api/parties/${partieId}/`, {
        titre: newTitre
      });
    } catch (error) {
      // Erreur lors de la mise à jour de la partie
    }
  };

  // Fonction pour modifier le numéro d'une partie
  const handlePartieNumeroChange = (partieId, newNumero) => {
    // ✅ Mettre à jour directement dans devisItems
    setDevisItems(prev => prev.map(item =>
      item.type === 'partie' && item.id === partieId
        ? { ...item, numero: newNumero }
        : item
    ));
  };

  // Fonction pour gérer la réorganisation des parties via drag & drop
  const handlePartiesReorder = (reorderedParties) => {
    // ✅ Cette fonction est appelée par DevisTable après le drag & drop
    // Les index ont déjà été recalculés par DevisIndexManager.reorderAfterDrag
    // Plus rien à faire ici, devisItems a déjà été mis à jour par handleDevisItemsReorder
  };

  // ========== HANDLERS POUR SOUS-PARTIES ==========
  
  // Sélectionner une sous-partie existante
  const handleSousPartieSelect = (partieId, sousPartie) => {
    // ✅ Utiliser le manager pour calculer le prochain index
    const partie = devisItems.find(i => i.type === 'partie' && i.id === partieId);
    if (!partie) return;
    
    const nextIndex = getNextIndex(devisItems, 'partie', partieId) || (partie.index_global + 0.1);
    
    // Créer l'item sous-partie
    const newSousPartie = {
      ...sousPartie,
      type: 'sous_partie',
      id: sousPartie.id,
      index_global: nextIndex,
      partie_id: partieId
    };
    
    // Ajouter directement dans devisItems
    setDevisItems(prev => sortByIndexGlobal([...prev, newSousPartie]));
  };

  // Créer une nouvelle sous-partie
  const handleSousPartieCreate = async (partieId, description) => {
    try {
      const response = await axios.post('/api/sous-parties/', {
        partie: partieId,
        description: description
      });
      
      if (response.data) {
        handleSousPartieSelect(partieId, {
          ...response.data,
          numero: ''
        });
      }
    } catch (error) {
      // Erreur lors de la création de la sous-partie
    }
  };

  // Supprimer une sous-partie
  const handleSousPartieRemove = (partieId, sousPartieId) => {
    // ✅ Supprimer la sous-partie ET toutes ses lignes de devisItems
    setDevisItems(prev => prev.filter(item => {
      if (item.type === 'sous_partie' && item.id === sousPartieId) return false;
      if (item.type === 'ligne_detail' && item.sous_partie_id === sousPartieId) return false;
      if (item.type === 'ligne_speciale' && item.context_type === 'sous_partie' && item.context_id === sousPartieId) return false;
      return true;
    }));
  };

  // Éditer une sous-partie
  const handleSousPartieEdit = async (partieId, sousPartieId) => {
    const sousPartie = devisItems.find(item => item.type === 'sous_partie' && item.id === sousPartieId);
    if (!sousPartie) return;
    
    const newDescription = prompt('Modifier la description:', sousPartie.description);
    if (newDescription && newDescription.trim()) {
      try {
        await axios.patch(`/api/sous-parties/${sousPartieId}/`, {
          description: newDescription.trim()
        });
        
        // ✅ Mettre à jour directement dans devisItems
        setDevisItems(prev => prev.map(item =>
          item.type === 'sous_partie' && item.id === sousPartieId
            ? { ...item, description: newDescription.trim() }
            : item
        ));
      } catch (error) {
        // Erreur lors de la modification de la sous-partie
      }
    }
  };

  // Changer le numéro d'une sous-partie (prend en compte le préfixe de la partie si numérique)
  const handleSousPartieNumeroChange = (partieId, sousPartieId, newNumero) => {
    const partie = devisItems.find(item => item.type === 'partie' && item.id === partieId);
    if (!partie) return;
    
    const parentNumero = partie.numero;
    const isParentNumeric = parentNumero && /^\d+$/.test(parentNumero);
    
    // Si on enlève le numéro
    if (newNumero === '') {
      setDevisItems(prev => prev.map(item =>
        item.type === 'sous_partie' && item.id === sousPartieId
          ? { ...item, numero: '' }
          : item
      ));
      return;
    }
    
    // Si on attribue un numéro automatique, s'assurer du format
    let finalNumero = newNumero;
    if (isParentNumeric && /^\d+$/.test(newNumero)) {
      finalNumero = `${parentNumero}.${newNumero}`;
    }
    
    // ✅ Mettre à jour directement dans devisItems
    setDevisItems(prev => prev.map(item =>
      item.type === 'sous_partie' && item.id === sousPartieId
        ? { ...item, numero: finalNumero }
        : item
    ));
  };

  // Réorganiser les sous-parties via drag & drop (système hiérarchique)
  const handleSousPartiesReorder = (partieId, result) => {
    // ✅ Cette fonction est appelée par DevisTable après le drag & drop
    // Les index ont déjà été recalculés par DevisIndexManager.reorderAfterDrag
    // Plus rien à faire ici, devisItems a déjà été mis à jour par handleDevisItemsReorder
  };

  // ========== HANDLERS POUR LIGNES DE DÉTAIL ==========

  // Ajouter une ligne de détail à une sous-partie sélectionnée
  const handleLigneDetailSelect = (partieId, sousPartieId, ligneDetail) => {
    // ✅ Utiliser le manager pour calculer le prochain index
    const nextIndex = getNextIndex(devisItems, 'sous_partie', sousPartieId);
    
    if (!nextIndex) {
      return;
    }
    
    // Créer la nouvelle ligne détail
    const newLigneDetail = {
      ...ligneDetail,
      type: 'ligne_detail',
      id: ligneDetail.id,
      index_global: nextIndex,
      sous_partie_id: sousPartieId,
      quantity: 0
    };
    
    // Ajouter directement dans devisItems
    setDevisItems(prev => sortByIndexGlobal([...prev, newLigneDetail]));
  };

  // Créer une ligne de détail (TODO: compléter la création serveur si besoin)
  const handleLigneDetailCreate = async (sousPartieId, description) => {
    // Création de ligne de détail (à implémenter côté API)
  };

  // Changer la quantité d'une ligne de détail
  const handleLigneDetailQuantityChange = (partieId, sousPartieId, ligneDetailId, quantity) => {
    // ✅ Mettre à jour directement devisItems (source de vérité unique)
    setDevisItems(prev => prev.map(item => {
      if (item.type === 'ligne_detail' && item.id === ligneDetailId) {
        return { ...item, quantity };
      }
      return item;
    }));
  };

  // Retirer une ligne de détail du devis
  const handleLigneDetailRemove = (partieId, sousPartieId, ligneDetailId) => {
    // ✅ Supprimer directement de devisItems
    setDevisItems(prev => prev.filter(item => 
      !(item.type === 'ligne_detail' && item.id === ligneDetailId)
    ));
  };

  // Éditer une ligne de détail (modal d'édition)
  const handleLigneDetailEdit = (ligneDetail) => {
    // Le modal d'édition est géré par DevisTable
  };

  // Modifier la marge d'une ligne de détail (ce qui recalcule le prix unitaire)
  const handleLigneDetailMargeChange = (partieId, sousPartieId, ligneDetailId, marge) => {
    // ✅ Mettre à jour directement devisItems (source de vérité unique)
    setDevisItems(prev => prev.map(item => {
      if (item.type === 'ligne_detail' && item.id === ligneDetailId) {
        // Calculer le nouveau prix basé sur la marge
        const cout_total = parseFloat(item.cout_main_oeuvre || 0) + parseFloat(item.cout_materiel || 0);
        const taux_fixe = parseFloat(item.taux_fixe || 0);
        const prix_base = cout_total * (1 + taux_fixe / 100);
        const prix_calcule = prix_base * (1 + marge / 100);
        
        return { 
          ...item, 
          marge_devis: marge,
          prix_devis: prix_calcule
        };
      }
      return item;
    }));
  };

  // Modifier directement le prix unitaire d'une ligne de détail
  const handleLigneDetailPriceChange = (partieId, sousPartieId, ligneDetailId, prix) => {
    // ✅ Mettre à jour directement devisItems (source de vérité unique)
    setDevisItems(prev => prev.map(item => {
      if (item.type === 'ligne_detail' && item.id === ligneDetailId) {
        // Calculer la marge implicite
        const cout_total = parseFloat(item.cout_main_oeuvre || 0) + parseFloat(item.cout_materiel || 0);
        const taux_fixe = parseFloat(item.taux_fixe || 0);
        const prix_base = cout_total * (1 + taux_fixe / 100);
        const marge_implicite = prix_base > 0 ? ((prix / prix_base) - 1) * 100 : 0;
        
        return { 
          ...item, 
          prix_devis: prix,
          marge_devis: marge_implicite
        };
      }
      return item;
    }));
  };

  // ===== HANDLERS POUR LIGNES SPÉCIALES V2 =====
  
  // Ajouter une ligne en attente
  const handleAddPendingSpecialLine = (line, requiresBaseSelection = false) => {
    if (requiresBaseSelection) {
      // La ligne est de type % sans base : activer le mode de sélection
      setPendingLineForBase(line);
      setIsSelectingBase(true);
    } else {
      // Mettre la ligne en attente de placement (l'utilisateur va cliquer sur le tableau)
      setLineAwaitingPlacement(line);
    }
  };
  
  // ✅ Utiliser TOUTES les fonctions du DevisIndexManager
  const { 
    roundIndex, 
    reindexSousPartie, 
    reindexPartie, 
    reindexAll,
    getPartiePrefix,
    getSousPartieIndex,
    getNextIndex,
    sortByIndexGlobal,
    insertAtPosition,
    reorderAfterDrag
  } = DevisIndexManager;

  /**
   * Valider que tous les éléments ont un index_global valide
   * Utile pour détecter les problèmes de synchronisation
   */
  const validateIndexes = (items, context = '') => {
    const errors = [];
    items.forEach(item => {
      if (item.index_global === undefined || item.index_global === null || isNaN(item.index_global)) {
        errors.push({
          type: item.type,
          id: item.id,
          description: item.description || item.designation || 'N/A',
          index_global: item.index_global
        });
      }
    });
    
    if (errors.length > 0) {
      return false;
    }
    
    return true;
  };

  // ✅ Plus besoin de synchronisation : devisItems est la source de vérité unique

  // Placer la ligne à un endroit spécifique du tableau (système hiérarchique)
  const handlePlaceLineAt = (position) => {
    if (!lineAwaitingPlacement) return;
    
    const line = lineAwaitingPlacement;
    
    // ✅ Activer isReordering pour éviter la boucle de synchronisation
    setIsReordering(true);
    
    // Préparer la nouvelle ligne spéciale
    const { isMoving, originalId, data, ...lineWithoutFlags } = line;
    
    const newLine = {
      ...lineWithoutFlags,
      id: isMoving ? line.id : (line.id || Date.now().toString()),
      description: data?.description || line.description || '',
      value: data?.value || line.value,
      value_type: data?.valueType || line.value_type,
      type_speciale: data?.type || line.type_speciale,
      baseCalculation: line.baseCalculation,
      base_calculation: line.base_calculation,
      styles: line.styles,
      isMoving,
      originalId
    };
    
    // ✅ Utiliser le DevisIndexManager pour l'insertion
    const updated = DevisIndexManager.insertAtPosition(devisItems, newLine, position);
    
    setDevisItems(updated);
    setLineAwaitingPlacement(null);
    
    // ✅ Désactiver le flag après un délai
    setTimeout(() => setIsReordering(false), 100);
  };

  // Supprimer une ligne en attente
  const handleRemovePendingSpecialLine = (lineId) => {
    setPendingSpecialLines(prev => prev.filter(line => line.id !== lineId));
  };

  // Supprimer une ligne spéciale placée (sans recalculer les index_global)
  const handleRemoveSpecialLine = (lineId) => {
    setDevisItems(prev => prev.filter(item => !(item.type === 'ligne_speciale' && item.id === lineId)));
  };
  
  // ✅ NOUVEAU : Déplacer une ligne spéciale existante via le bouton
  const handleMoveSpecialLine = (lineId) => {
    // Trouver la ligne spéciale dans devisItems
    const lineToMove = devisItems.find(item => item.type === 'ligne_speciale' && item.id === lineId);
    
    if (!lineToMove) {
      return;
    }
    
    // Mettre la ligne en mode "en attente de placement"
    // L'utilisateur va ensuite cliquer sur le tableau pour choisir la nouvelle position
    setLineAwaitingPlacement({
      ...lineToMove,
      isMoving: true, // Flag pour indiquer qu'on déplace (pas une création)
      originalId: lineId // Garder l'ID original pour la suppression
    });
  };

  // Gérer la sélection de base pour une ligne spéciale en %
  const handleBaseSelected = (baseInfo) => {
    // baseInfo contient : { type: 'partie'/'sous_partie'/'global', id: X, label: 'Partie A' }
    if (!pendingLineForBase) return;
    
    // Mettre à jour la ligne avec la base sélectionnée
    const updatedLine = {
      ...pendingLineForBase,
      baseCalculation: baseInfo
    };
    
    // Stocker la ligne mise à jour pour la réédition dans le modal
    setPendingLineForBase(updatedLine);
    
    // Désactiver le mode de sélection
    setIsSelectingBase(false);
    
    // NE PAS créer la ligne automatiquement, le modal va se rouvrir
    // Le modal se rouvrira automatiquement via la prop pendingLineForBase
  };

  // Ouvrir modal d'édition
  const handleEditSpecialLine = (line) => {
    setEditingSpecialLine(line);
    setShowEditModal(true);
  };

  // Sauvegarder ligne éditée
  const handleSaveSpecialLine = (updatedLine) => {
    // Mettre à jour la ligne spéciale dans devisItems
    const updatedItems = devisItems.map(item => {
      if (item.type === 'ligne_speciale' && item.id === updatedLine.id) {
        return {
          ...item,
          description: updatedLine.data?.description || updatedLine.description,
          value: updatedLine.data?.value || updatedLine.value,
          value_type: updatedLine.data?.valueType || updatedLine.value_type,
          type_speciale: updatedLine.data?.type || updatedLine.type_speciale,
          styles: updatedLine.styles || item.styles,
          baseCalculation: updatedLine.baseCalculation || item.baseCalculation
        };
      }
      return item;
    });
    
    setDevisItems(updatedItems);
    
    // Aussi mettre à jour pendingSpecialLines si la ligne y est encore
    setPendingSpecialLines(prev => prev.map(line => 
      line.id === updatedLine.id ? updatedLine : line
    ));
    
    setShowEditModal(false);
    setEditingSpecialLine(null);
  };

  // Réordonner les lignes spéciales
  const handleSpecialLinesReorder = (newLines) => {
    setPendingSpecialLines(newLines);
  };

  // ===== HANDLERS POUR LE SYSTÈME UNIFIÉ =====

  // ✅ Plus besoin de convertir : devisItems est la source de vérité unique

  // ✅ Plus besoin de useEffect : devisItems est la source de vérité unique, géré directement par les handlers

  // Fonction de recalcul des numéros (côté frontend)
  // Recalcule automatiquement les numéros après réorganisation
  const recalculateNumeros = (items) => {
    // Trier par index_global
    const sorted = [...items].sort((a, b) => a.index_global - b.index_global);
    
    // Recalculer les numéros seulement pour les éléments qui en ont
    return sorted.map(item => {
      // Si l'élément n'a pas de numéro, le laisser tel quel
      if (!item.numero) return item;
      
      // Calculer le nouveau numéro basé sur la position
      const newNumero = generateNumero(item, sorted);
      return { ...item, numero: newNumero };
    });
  };

  const generateNumero = (item, allItems) => {
    const findParentById = (parentId) => {
      return allItems.find(e => e.id === parentId);
    };

    if (item.type === 'partie') {
      // Compter uniquement les parties NUMÉROTÉES avant celle-ci
      const partiesNumeroteesBefore = allItems.filter(
        e => e.type === 'partie' && 
        e.index_global < item.index_global &&
        e.numero && /^\d+$/.test(e.numero) // Seulement les numéros simples (1, 2, 3...)
      );
      return String(partiesNumeroteesBefore.length + 1);
    }

    if (item.type === 'sous_partie') {
      const partie = findParentById(item.partie_id);
      if (!partie || !partie.numero) return ''; // Si pas de partie ou partie sans numéro, pas de numéro
      
      // Regex pour les sous-parties qui suivent le pattern "X.Y" où X = numéro de la partie
      const regex = new RegExp('^' + partie.numero + '\\.(\\d+)$');
      
      const sousPartiesNumeroteesBefore = allItems.filter(
        e => e.type === 'sous_partie' && 
        e.partie_id === item.partie_id && 
        e.index_global < item.index_global &&
        e.numero && regex.test(e.numero) // Compter seulement les sous-parties avec le bon format
      );
      
      return `${partie.numero}.${sousPartiesNumeroteesBefore.length + 1}`;
    }

    if (item.type === 'ligne_detail') {
      const sousPartie = findParentById(item.sous_partie_id);
      if (!sousPartie || !sousPartie.numero) return ''; // Si pas de sous-partie ou sous-partie sans numéro, pas de numéro
      
      // Regex pour les lignes qui suivent le pattern "X.Y.Z" où X.Y = numéro de la sous-partie
      const regex = new RegExp('^' + sousPartie.numero.replace(/\./g, '\\.') + '\\.(\\d+)$');
      
      const lignesNumeroteesBefore = allItems.filter(
        e => e.type === 'ligne_detail' && 
        e.sous_partie_id === item.sous_partie_id && 
        e.index_global < item.index_global &&
        e.numero && regex.test(e.numero) // Compter seulement les lignes avec le bon format
      );
      
      return `${sousPartie.numero}.${lignesNumeroteesBefore.length + 1}`;
    }

    if (item.type === 'ligne_speciale') {
      const previousItems = allItems.filter(e => e.index_global < item.index_global);
      if (previousItems.length === 0) return '0.1';
      
      const lastItem = previousItems[previousItems.length - 1];
      const lastNumero = lastItem.numero || '0';
      const parts = lastNumero.split('.');
      
      if (parts.length === 1) {
        return `${parts[0]}.1`;
      } else if (parts.length === 2) {
        return `${parts[0]}.${parts[1]}.1`;
      } else {
        try {
          const lastPart = parseInt(parts[parts.length - 1]);
          const newParts = [...parts.slice(0, -1), String(lastPart + 1)];
          return newParts.join('.');
        } catch {
          return `${parts.join('.')}.1`;
        }
      }
    }

    return '0';
  };

  // Handler de réordonnancement unifié (système hiérarchique)
  const handleDevisItemsReorder = async (reorderedItems) => {
    // ⚠️ Cette fonction doit recevoir TOUS les items, y compris les lignes spéciales
    // Si appelée sans lignes spéciales, cela causera leur disparition
    
    // Activer le flag pour éviter la synchro
    setIsReordering(true);
    
    // ✅ Dédupliquer les items reçus (au cas où)
    const uniqueItems = [];
    const seenIds = new Map();
    reorderedItems.forEach(item => {
      const key = `${item.type}_${item.id}`;
      if (!seenIds.has(key)) {
        seenIds.set(key, item);
        uniqueItems.push(item);
      }
    });
    
    // ✅ Les items sont déjà réordonnés par DevisTable avec les bons index_global
    // On les trie juste pour être sûr
    const sorted = DevisIndexManager.sortByIndexGlobal(uniqueItems);
    
    // Recalculer les numéros d'affichage
    const withNumeros = recalculateNumeros(sorted);
    
    setDevisItems(withNumeros);
    
    // ✅ Désactiver le flag après un délai
    setTimeout(() => setIsReordering(false), 100);
    
    // Sauvegarder en BDD seulement si le devis existe (a un ID)
    if (devisData.id) {
      try {
        // 1. Créer/mettre à jour les lignes spéciales en BDD
        const specialLines = withNumeros.filter(item => item.type === 'ligne_speciale');
        
        for (const line of specialLines) {
          // Vérifier si la ligne a déjà un ID numérique (sauvegardée en BDD)
          const isNewLine = typeof line.id === 'string' || !line.devis;
          
          if (isNewLine) {
            // Préparer base_calculation SANS amount (pour calcul dynamique)
            const baseCalcToSave = line.base_calculation ? {
              type: line.base_calculation.type,
              id: line.base_calculation.id,
              label: line.base_calculation.label
              // ❌ Ne PAS sauvegarder amount
            } : null;

            // Créer la ligne en BDD
            const response = await axios.post(`/api/devis/${devisData.id}/ligne-speciale/create/`, {
              description: line.description,
              type_speciale: line.type_speciale,
              value_type: line.value_type,
              value: line.value,
              base_calculation: baseCalcToSave,
              styles: line.styles,
              index_global: line.index_global,
              context_type: line.context_type,
              context_id: line.context_id
            });
            
            // Mettre à jour l'ID avec celui de la BDD
            line.id = response.data.id;
          } else {
            // Mettre à jour la ligne existante
            await axios.put(`/api/devis/${devisData.id}/ligne-speciale/${line.id}/update/`, {
              index_global: line.index_global,
              context_type: line.context_type,
              context_id: line.context_id
            });
          }
        }
        
        // 2. Sauvegarder l'ordre global de tous les items
        await axios.post(`/api/devis/${devisData.id}/update-order/`, {
          items: withNumeros.map(item => ({
            type: item.type,
            id: item.id,
            index_global: item.index_global
          }))
        });
      } catch (error) {
        // Erreur sauvegarde ordre
      }
    }
  };

  // Calculer le prix d'une ligne de détail
  const calculatePrice = (ligne) => {
    if (ligne.prix_devis !== null && ligne.prix_devis !== undefined) {
      return parseFloat(ligne.prix_devis);
    }
    const marge = ligne.marge_devis !== null && ligne.marge_devis !== undefined 
      ? parseFloat(ligne.marge_devis)
      : parseFloat(ligne.marge) || 0;
    const cout_main_oeuvre = parseFloat(ligne.cout_main_oeuvre) || 0;
    const cout_materiel = parseFloat(ligne.cout_materiel) || 0;
    const taux_fixe = parseFloat(ligne.taux_fixe) || 0;
    const base = cout_main_oeuvre + cout_materiel;
    const montant_taux_fixe = base * (taux_fixe / 100);
    const sous_total = base + montant_taux_fixe;
    const montant_marge = sous_total * (marge / 100);
    const prix = sous_total + montant_marge;
    return prix;
  };

  // Calculer toutes les bases brutes (sans lignes spéciales)
  const calculerBasesBrutes = () => {
    const bases = {
      sousParties: {},
      parties: {},
      global: 0
    };
    
    // 1. Calculer les bases des sous-parties (somme des lignes de détail)
    devisItems
      .filter(item => item.type === 'sous_partie')
      .forEach(sp => {
        const totalLignes = devisItems
          .filter(item => item.type === 'ligne_detail' && item.sous_partie_id === sp.id)
          .reduce((sum, ligne) => {
            const prix = calculatePrice(ligne);
            return sum + (prix * (ligne.quantity || 0));
          }, 0);
        
        bases.sousParties[sp.id] = totalLignes;
      });
    
    // 2. Calculer les bases des parties (somme des bases des sous-parties)
    devisItems
      .filter(item => item.type === 'partie')
      .forEach(partie => {
        const totalSPs = devisItems
          .filter(item => item.type === 'sous_partie' && item.partie_id === partie.id)
          .reduce((sum, sp) => sum + (bases.sousParties[sp.id] || 0), 0);
        
        bases.parties[partie.id] = totalSPs;
      });
    
    // 3. Calculer la base globale (somme des bases des parties)
    bases.global = devisItems
      .filter(item => item.type === 'partie')
      .reduce((sum, partie) => sum + (bases.parties[partie.id] || 0), 0);
    
    return bases;
  };

  // Calculer le montant d'une ligne spéciale
  const calculerMontantLigneSpeciale = (ligneSpeciale, bases) => {
    const value = parseFloat(ligneSpeciale.value || 0);
    
    // Si montant fixe, retourner directement
    if (ligneSpeciale.value_type === 'fixed') {
      return value;
    }
    
    // Si pourcentage, utiliser baseCalculation
    if (ligneSpeciale.value_type === 'percentage' && ligneSpeciale.baseCalculation) {
      const baseCalc = ligneSpeciale.baseCalculation;
      let base = 0;
      
      // Récupérer la base selon le type
      if (baseCalc.type === 'sous_partie' && baseCalc.id) {
        base = bases.sousParties[baseCalc.id] || 0;
      } else if (baseCalc.type === 'partie' && baseCalc.id) {
        base = bases.parties[baseCalc.id] || 0;
      } else if (baseCalc.type === 'global') {
        base = bases.global || 0;
      }
      
      return base * (value / 100);
    }
    
    // Si pourcentage sans baseCalculation, retourner 0 (cas d'erreur)
    return 0;
  };

  // Calculer le total global
  const calculateGlobalTotal = (parties) => {
    // Calculer d'abord toutes les bases brutes
    const bases = calculerBasesBrutes();
    
    // Base : somme des parties (avec leurs lignes spéciales déjà incluses)
    let total = devisItems
      .filter(item => item.type === 'partie')
      .reduce((sum, partie) => sum + calculatePartieTotal(partie), 0);
    
    // Récupérer les lignes spéciales globales, triées par index_global
    const lignesSpeciales = devisItems
      .filter(item => 
        item.type === 'ligne_speciale' && 
        item.context_type === 'global'
      )
      .sort((a, b) => a.index_global - b.index_global);
    
    // Appliquer les lignes spéciales séquentiellement
    lignesSpeciales.forEach(ls => {
      const montant = calculerMontantLigneSpeciale(ls, bases);
      
      if (ls.type_speciale === 'reduction') {
        total -= montant;
      } else if (ls.type_speciale === 'addition') {
        total += montant;
      }
      // Note : les lignes 'display' n'affectent pas le total
    });
    
    return total;
  };

  // Calculer le total d'une partie
  const calculatePartieTotal = (partie) => {
    // Calculer d'abord toutes les bases brutes
    const bases = calculerBasesBrutes();
    
    // Base : somme des sous-parties (avec leurs lignes spéciales déjà incluses)
    let total = devisItems
      .filter(item => item.type === 'sous_partie' && item.partie_id === partie.id)
      .reduce((sum, sp) => sum + calculateSousPartieTotal(sp), 0);
    
    // Récupérer les lignes spéciales de cette partie, triées par index_global
    const lignesSpeciales = devisItems
      .filter(item => 
        item.type === 'ligne_speciale' && 
        item.context_type === 'partie' && 
        item.context_id === partie.id
      )
      .sort((a, b) => a.index_global - b.index_global);
    
    // Appliquer les lignes spéciales séquentiellement
    lignesSpeciales.forEach(ls => {
      const montant = calculerMontantLigneSpeciale(ls, bases);
      
      if (ls.type_speciale === 'reduction') {
        total -= montant;
      } else if (ls.type_speciale === 'addition') {
        total += montant;
      }
      // Note : les lignes 'display' n'affectent pas le total
    });
    
    return total;
  };

  // Calculer le total d'une sous-partie
  const calculateSousPartieTotal = (sousPartie) => {
    // Calculer d'abord toutes les bases brutes
    const bases = calculerBasesBrutes();
    
    // Base : somme des lignes de détail
    let total = devisItems
      .filter(item => item.type === 'ligne_detail' && item.sous_partie_id === sousPartie.id)
      .reduce((sum, ligne) => {
        const prix = calculatePrice(ligne);
        return sum + (prix * (ligne.quantity || 0));
      }, 0);
    
    // Récupérer les lignes spéciales de cette sous-partie, triées par index_global
    const lignesSpeciales = devisItems
      .filter(item => 
        item.type === 'ligne_speciale' && 
        item.context_type === 'sous_partie' && 
        item.context_id === sousPartie.id
      )
      .sort((a, b) => a.index_global - b.index_global);
    
    // Appliquer les lignes spéciales séquentiellement
    lignesSpeciales.forEach(ls => {
      const montant = calculerMontantLigneSpeciale(ls, bases);
      
      if (ls.type_speciale === 'reduction') {
        total -= montant;
      } else if (ls.type_speciale === 'addition') {
        total += montant;
      }
      // Note : les lignes 'display' n'affectent pas le total
    });
    
    return total;
  };

  // Charger les chantiers au montage du composant
  useEffect(() => {
    fetchChantiers();
    // Générer le numéro initial avec le format "Devis travaux" (nouveau chantier)
    generateDevisNumber(null);
    // Charger les parties initiales
    loadParties();
  }, []);

  return (
    <div style={{
      padding: '20px 10px',
      marginRight: '150px', // Espace pour la sidebar
      minHeight: 'auto', // Changé de 100vh à auto
      backgroundColor: '#f5f5f5',
      borderRadius: '10px',
    }}>
      <div style={{
        fontFamily: 'Arial, Helvetica, "Roboto", sans-serif',
        fontSize: '16px',
        maxWidth: '1200px',
        margin: '0 150px 0 150px',
        padding: '20px 10px',
        minHeight: 'auto', // Changé de 100vh à auto
        backgroundColor: 'rgb(255 255 255)',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        overflow: 'visible' // Changé de hidden à visible
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
              parties={availableParties}
              selectedParties={selectedParties}
              special_lines_global={special_lines_global}
              total_ht={total_ht}
              formatMontantEspace={formatMontantEspace}
              onNatureTravauxChange={(value) => setDevisData(prev => ({ ...prev, nature_travaux: value }))}
              onPartieSelect={handlePartieSelect}
              onPartieCreate={handlePartieCreate}
              onPartieRemove={handlePartieRemove}
              onPartieEdit={handlePartieEdit}
              onPartieNumeroChange={handlePartieNumeroChange}
              onPartiesReorder={handlePartiesReorder}
              searchParties={searchParties}
              isLoadingParties={isLoadingParties}
              onSousPartieSelect={handleSousPartieSelect}
              onSousPartieCreate={handleSousPartieCreate}
              onSousPartieRemove={handleSousPartieRemove}
              onSousPartieEdit={handleSousPartieEdit}
              onSousPartieNumeroChange={handleSousPartieNumeroChange}
              onSousPartiesReorder={handleSousPartiesReorder}
              onLigneDetailSelect={handleLigneDetailSelect}
              onLigneDetailCreate={handleLigneDetailCreate}
              onLigneDetailQuantityChange={handleLigneDetailQuantityChange}
              onLigneDetailEdit={handleLigneDetailEdit}
              onLigneDetailRemove={handleLigneDetailRemove}
              onLigneDetailMargeChange={handleLigneDetailMargeChange}
              onLigneDetailPriceChange={handleLigneDetailPriceChange}
              pendingSpecialLines={pendingSpecialLines}
              onAddPendingSpecialLine={handleAddPendingSpecialLine}
              onRemovePendingSpecialLine={handleRemovePendingSpecialLine}
              onRemoveSpecialLine={handleRemoveSpecialLine}
              onMoveSpecialLine={handleMoveSpecialLine}
              onEditSpecialLine={handleEditSpecialLine}
              editingSpecialLine={editingSpecialLine}
              showEditModal={showEditModal}
              lineAwaitingPlacement={lineAwaitingPlacement}
              onPlaceLineAt={handlePlaceLineAt}
              onCancelPlacement={() => setLineAwaitingPlacement(null)}
              onRequestReplacement={(line) => setLineAwaitingPlacement(line)}
              onCloseEditModal={() => setShowEditModal(false)}
              onSaveSpecialLine={handleSaveSpecialLine}
              onSpecialLinesReorder={handleSpecialLinesReorder}
              calculateGlobalTotal={calculateGlobalTotal}
              calculatePartieTotal={calculatePartieTotal}
              calculateSousPartieTotal={calculateSousPartieTotal}
              
              devisItems={enrichedDevisItems}
              onDevisItemsReorder={handleDevisItemsReorder}
              
              isSelectingBase={isSelectingBase}
              onBaseSelected={handleBaseSelected}
              onCancelBaseSelection={() => {
                setIsSelectingBase(false);
                setPendingLineForBase(null);
              }}
              pendingLineForBase={pendingLineForBase}
              onClearPendingLineForBase={() => setPendingLineForBase(null)}
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