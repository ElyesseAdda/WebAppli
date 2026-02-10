/**
 * ModificationDevisV2 - Composant principal pour la modification de devis
 * Basé sur le même système que DevisAvance mais pour l'édition de devis existants
 */
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';

// Composants du système Devis
import DevisStyles from '../Devis/DevisStyles';
import DevisHeader from '../Devis/DevisHeader';
import ClientInfo from '../Devis/ClientInfo';
import ChantierInfo from '../Devis/ChantierInfo';
import DevisTable from '../Devis/DevisTable';
import DevisRecap from '../Devis/DevisRecap';
import TableauOption from '../Devis/TableauOption';
import DevisCostPieChart from '../Devis/DevisCostPieChart';
import ContactSocieteModal from '../ContactSocieteModal';

// Hooks personnalisés
import { useDevisLoader } from './hooks/useDevisLoader';
import { useDevisSaver } from './hooks/useDevisSaver';
import { useDevisCalculations } from './hooks/useDevisCalculations';
import { useDevisHandlers } from './hooks/useDevisHandlers';

// Utilitaires
import { DevisIndexManager } from '../../utils/DevisIndexManager';
import { validateBeforeTransform, transformToLegacyFormat } from '../../utils/DevisLegacyTransformer';
import { generatePDFDrive } from '../../utils/universalDriveGenerator';

const { sortByIndexGlobal, reindexAll, getNextIndex } = DevisIndexManager;

// Template pour la ligne récurrente
const RECURRING_SPECIAL_LINE_TEMPLATE = {
  id: 'recurring_special_line',
  type: 'ligne_speciale',
  type_speciale: 'display',
  value_type: 'display',
  value: 0,
  context_type: 'global',
  context_id: null,
  description: 'Montant global HT des prestations unitaires',
  data: {
    description: 'Montant global HT des prestations unitaires',
    valueType: 'display',
    type: 'display',
    value: 0
  },
  styles: {
    backgroundColor: '#fbff24',
    color: '#ff3838',
    fontWeight: 'bold',
    textAlign: 'left'
  },
  isRecurringSpecial: true
};

const isRecurringSpecialLine = (item) => (
  item &&
  item.type === 'ligne_speciale' &&
  (
    item.isRecurringSpecial ||
    item.description === RECURRING_SPECIAL_LINE_TEMPLATE.description ||
    item.data?.description === RECURRING_SPECIAL_LINE_TEMPLATE.description
  )
);

const ModificationDevisV2 = () => {
  const { devisId } = useParams();
  const navigate = useNavigate();

  // États pour les données
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

  const [selectedChantierId, setSelectedChantierId] = useState(null);
  const [clientId, setClientId] = useState(null);
  const [tauxFixe, setTauxFixe] = useState(20);
  const [devisType, setDevisType] = useState('normal');
  const [availableParties, setAvailableParties] = useState([]);
  const [isLoadingParties, setIsLoadingParties] = useState(false);

  // États pour les lignes spéciales
  const [pendingSpecialLines, setPendingSpecialLines] = useState([]);
  const [editingSpecialLine, setEditingSpecialLine] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [recurringLineDraft, setRecurringLineDraft] = useState(null);

  // État pour le PieChart - ligne sélectionnée (au clic)
  const [hoveredLigneDetail, setHoveredLigneDetail] = useState(null);
  const [isPieChartVisible, setIsPieChartVisible] = useState(true);

  // ✅ États pour la gestion des contacts de société
  const [contactsSociete, setContactsSociete] = useState([]);
  const [selectedContactId, setSelectedContactId] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [currentSocieteId, setCurrentSocieteId] = useState(null);

  // États pour la sélection de chantier (barre de recherche + liste)
  const [chantiers, setChantiers] = useState([]);
  const [chantierSearchQuery, setChantierSearchQuery] = useState('');
  const [chantierDropdownOpen, setChantierDropdownOpen] = useState(false);
  const chantierDropdownRef = useRef(null);

  // Hook de chargement
  const {
    isLoading,
    error,
    devisData: loadedDevisData,
    devisItems: loadedDevisItems,
    setDevisItems,
    chantierData,
    clientData,
    societeData,
    reload
  } = useDevisLoader(devisId);

  // Hook de sauvegarde
  const {
    isSaving,
    saveError,
    saveDevis,
    updateOrder
  } = useDevisSaver(devisId);

  // Utiliser les items chargés
  const devisItems = loadedDevisItems;

  // Hook de calculs (sans calculateRecurringLineAmount qui sera défini localement)
  const {
    calculatePrice,
    totalHt,
    tva,
    totalTtc,
    hasRecurringLine,
    formatMontantEspace
  } = useDevisCalculations(devisItems, devisData.tva_rate);

  // ✅ Fonctions de calcul locales (comme dans DevisAvance.js) pour mise à jour dynamique
  
  // Calculer toutes les bases brutes (sans lignes spéciales)
  const calculerBasesBrutes = useCallback(() => {
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
  }, [devisItems, calculatePrice]);

  // Calculer le montant d'une ligne spéciale
  const calculerMontantLigneSpeciale = useCallback((ligneSpeciale, bases, excludeLineId = null) => {
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
    
    return 0;
  }, []);

  // Calculer le total d'une sous-partie
  const calculateSousPartieTotal = useCallback((sousPartie, basesOverride = null) => {
    const bases = basesOverride || calculerBasesBrutes();
    
    let total = devisItems
      .filter(item => item.type === 'ligne_detail' && item.sous_partie_id === sousPartie.id)
      .reduce((sum, ligne) => {
        const prix = calculatePrice(ligne);
        return sum + (prix * (ligne.quantity || 0));
      }, 0);
    
    const lignesSpeciales = devisItems
      .filter(item => 
        item.type === 'ligne_speciale' && 
        item.context_type === 'sous_partie' && 
        item.context_id === sousPartie.id
      )
      .sort((a, b) => a.index_global - b.index_global);
    
    lignesSpeciales.forEach(ls => {
      const montant = calculerMontantLigneSpeciale(ls, bases);
      if (ls.type_speciale === 'reduction') {
        total -= montant;
      } else if (ls.type_speciale === 'addition') {
        total += montant;
      }
    });
    
    return total;
  }, [devisItems, calculatePrice, calculerBasesBrutes, calculerMontantLigneSpeciale]);

  // Calculer le total d'une partie
  const calculatePartieTotal = useCallback((partie, basesOverride = null) => {
    const bases = basesOverride || calculerBasesBrutes();
    
    let total = devisItems
      .filter(item => item.type === 'sous_partie' && item.partie_id === partie.id)
      .reduce((sum, sp) => sum + calculateSousPartieTotal(sp, bases), 0);
    
    const lignesSpeciales = devisItems
      .filter(item => 
        item.type === 'ligne_speciale' && 
        item.context_type === 'partie' && 
        item.context_id === partie.id
      )
      .sort((a, b) => a.index_global - b.index_global);
    
    lignesSpeciales.forEach(ls => {
      const montant = calculerMontantLigneSpeciale(ls, bases);
      if (ls.type_speciale === 'reduction') {
        total -= montant;
      } else if (ls.type_speciale === 'addition') {
        total += montant;
      }
    });
    
    return total;
  }, [devisItems, calculateSousPartieTotal, calculerBasesBrutes, calculerMontantLigneSpeciale]);

  // Calculer le total global SANS une ligne spéciale spécifique
  const calculateGlobalTotalExcludingLine = useCallback((excludeLineId = null) => {
    const bases = calculerBasesBrutes();
    
    let total = devisItems
      .filter(item => item.type === 'partie')
      .reduce((sum, partie) => sum + calculatePartieTotal(partie, bases), 0);
    
    const lignesSpeciales = devisItems
      .filter(item => 
        item.type === 'ligne_speciale' && 
        item.context_type === 'global' &&
        item.id !== excludeLineId
      )
      .sort((a, b) => a.index_global - b.index_global);
    
    lignesSpeciales.forEach(ls => {
      const montant = calculerMontantLigneSpeciale(ls, bases, excludeLineId);
      if (ls.type_speciale === 'reduction') {
        total -= montant;
      } else if (ls.type_speciale === 'addition') {
        total += montant;
      }
    });
    
    return total;
  }, [devisItems, calculatePartieTotal, calculerBasesBrutes, calculerMontantLigneSpeciale]);

  // Calculer le total global
  const calculateGlobalTotal = useCallback(() => {
    return calculateGlobalTotalExcludingLine(null);
  }, [calculateGlobalTotalExcludingLine]);

  // ✅ IMPORTANT : Charger les parties disponibles AVANT useDevisHandlers pour éviter l'erreur "before initialization"
  const loadParties = useCallback(async () => {
    try {
      setIsLoadingParties(true);
      // DRF peut paginer: {count, next, previous, results: [...]}
      const firstResponse = await axios.get('/api/parties/');
      const firstRaw = firstResponse.data;

      let allParties = [];
      if (Array.isArray(firstRaw)) {
        allParties = firstRaw;
      } else if (firstRaw && Array.isArray(firstRaw.results)) {
        allParties = [...firstRaw.results];

        // Récupérer toutes les pages pour avoir TOUTES les parties
        let nextUrl = firstRaw.next;
        let guard = 0;
        while (nextUrl && guard < 50) {
          guard += 1;
          const nextResp = await axios.get(nextUrl);
          const nextRaw = nextResp.data;

          if (Array.isArray(nextRaw)) {
            // Format non paginé (cas atypique)
            allParties = nextRaw;
            break;
          }

          if (nextRaw && Array.isArray(nextRaw.results)) {
            allParties = allParties.concat(nextRaw.results);
            nextUrl = nextRaw.next;
          } else {
            break;
          }
        }
      }

      setAvailableParties(allParties);
    } catch (err) {
      console.error('Erreur lors du chargement des parties:', err);
    } finally {
      setIsLoadingParties(false);
    }
  }, []);

  // ✅ Calcul de la ligne récurrente (comme dans DevisAvance.js)
  const calculateRecurringLineAmount = useCallback((lineOrId) => {
    const targetId = typeof lineOrId === 'object' ? lineOrId.id : lineOrId;
    if (!targetId) {
      return 0;
    }
    const targetLine = devisItems.find(item => item.id === targetId);
    if (!targetLine || targetLine.index_global === undefined) {
      return 0;
    }
    const sortedItems = [...devisItems].sort((a, b) => a.index_global - b.index_global);
    const bases = calculerBasesBrutes();
    let runningTotal = 0;
    
    for (const item of sortedItems) {
      if (item.index_global >= targetLine.index_global) {
        break;
      }
      if (item.type === 'partie') {
        runningTotal += calculatePartieTotal(item, bases);
      } else if (item.type === 'ligne_speciale' && item.context_type === 'global') {
        const amount = calculerMontantLigneSpeciale(item, bases, targetLine.id);
        if (item.type_speciale === 'addition') {
          runningTotal += amount;
        } else if (item.type_speciale === 'reduction') {
          runningTotal -= amount;
        }
      }
    }
    return runningTotal;
  }, [devisItems, calculatePartieTotal, calculerBasesBrutes, calculerMontantLigneSpeciale]);

  // Hook de handlers (passer loadParties pour recharger après suppression)
  const {
    isReordering,
    lineAwaitingPlacement,
    isSelectingBase,
    pendingLineForBase,
    handlePartieSelect,
    handlePartieCreate,
    handlePartieRemove,
    handlePartieEdit,
    handlePartieNumeroChange,
    handlePartiesReorder,
    handleSousPartieSelect,
    handleSousPartieCreate,
    handleSousPartieRemove,
    handleSousPartieEdit,
    handleSousPartieNumeroChange,
    handleSousPartiesReorder,
    handleLigneDetailSelect,
    handleLigneDetailCreate,
    handleLigneDetailQuantityChange,
    handleLigneDetailRemove,
    handleLigneDetailMargeChange,
    handleLigneDetailPriceChange,
    handleLigneDetailEdit,
    handleAddPendingSpecialLine,
    handleRemoveSpecialLine,
    handleMoveSpecialLine,
    handlePlaceLineAt,
    handleCancelPlacement,
    handleBaseSelected,
    handleCancelBaseSelection,
    handleClearPendingLineForBase,
    handleDevisItemsReorder
  } = useDevisHandlers(devisItems, setDevisItems, loadParties);

  // Enrichir les items pour compatibilité avec DevisTable
  const enrichedDevisItems = useMemo(() => {
    return devisItems.map(item => {
      if (item.type === 'partie') {
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
        return {
          ...item,
          selectedLignesDetails: devisItems
            .filter(i => i.type === 'ligne_detail' && i.sous_partie_id === item.id)
        };
      }
      return item;
    });
  }, [devisItems]);

  // Construire selectedParties pour les barres de recherche
  const selectedParties = useMemo(() => {
    return enrichedDevisItems
      .filter(item => item.type === 'partie')
      .map(partieItem => ({
        ...partieItem,
        type: partieItem.type_activite || 'PEINTURE'
      }));
  }, [enrichedDevisItems]);

  // ✅ Fonction pour charger les contacts de la société
  const fetchContactsSociete = useCallback(async (societeId) => {
    if (!societeId) {
      setContactsSociete([]);
      setSelectedContactId(null);
      setCurrentSocieteId(null);
      return;
    }
    try {
      const response = await axios.get(`/api/contacts-societe/?societe=${societeId}`);
      setContactsSociete(response.data);
      setCurrentSocieteId(societeId);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
      setContactsSociete([]);
      setCurrentSocieteId(societeId);
    }
  }, []);

  // Changer le chantier (fetch détails et mettre à jour client/societe/chantier)
  const handleChantierChange = useCallback(async (chantierId) => {
    if (!chantierId) return;
    try {
      const chantierResponse = await axios.get(`/api/chantier/${chantierId}/`);
      const chantierData = chantierResponse.data;
      setSelectedChantierId(chantierId);
      setChantier({
        chantier_name: chantierData.chantier_name || '',
        rue: chantierData.rue || '',
        code_postal: chantierData.code_postal || '',
        ville: chantierData.ville || ''
      });
      if (chantierData.societe) {
        if (typeof chantierData.societe === 'object' && chantierData.societe.id) {
          setSociete({
            nom_societe: chantierData.societe.nom_societe || '',
            rue_societe: chantierData.societe.rue_societe || '',
            codepostal_societe: chantierData.societe.codepostal_societe || '',
            ville_societe: chantierData.societe.ville_societe || ''
          });
          await fetchContactsSociete(chantierData.societe.id);
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
              setClientId(clientId);
            }
          }
        } else if (typeof chantierData.societe === 'number') {
          const societeResponse = await axios.get(`/api/societe/${chantierData.societe}/`);
          const societeData = societeResponse.data;
          setSociete({
            nom_societe: societeData.nom_societe || '',
            rue_societe: societeData.rue_societe || '',
            codepostal_societe: societeData.codepostal_societe || '',
            ville_societe: societeData.ville_societe || ''
          });
          await fetchContactsSociete(chantierData.societe);
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
              setClientId(clientId);
            }
          }
        }
      }
      setChantierDropdownOpen(false);
      setChantierSearchQuery('');
    } catch (error) {
      console.error('Erreur lors du chargement du chantier:', error);
    }
  }, [fetchContactsSociete]);

  // Initialiser les données quand le devis est chargé
  useEffect(() => {
    if (loadedDevisData) {
      setDevisData({
        id: loadedDevisData.id,
        numero: loadedDevisData.numero || '',
        date_creation: loadedDevisData.date_creation?.split('T')[0] || new Date().toISOString().split('T')[0],
        nature_travaux: loadedDevisData.nature_travaux || '',
        // ✅ Utiliser ?? au lieu de || pour permettre tva_rate = 0
        tva_rate: loadedDevisData.tva_rate ?? 20,
        price_ht: loadedDevisData.price_ht ?? 0,
        price_ttc: loadedDevisData.price_ttc ?? 0,
        contact_societe: loadedDevisData.contact_societe || null
      });
      setSelectedChantierId(loadedDevisData.chantier);
      setDevisType(loadedDevisData.devis_chantier ? 'chantier' : 'normal');
      
      // ✅ Initialiser le contact sélectionné si présent
      if (loadedDevisData.contact_societe) {
        // Gérer le cas où contact_societe peut être un ID (nombre) ou un objet avec un id
        const contactId = typeof loadedDevisData.contact_societe === 'object' 
          ? loadedDevisData.contact_societe.id 
          : loadedDevisData.contact_societe;
        if (contactId) {
          setSelectedContactId(contactId);
        }
      }
    }
  }, [loadedDevisData]);

  // Initialiser les données client/societe/chantier
  useEffect(() => {
    if (clientData) {
      setClient({
        name: clientData.name || '',
        surname: clientData.surname || '',
        civilite: clientData.civilite || '',
        poste: clientData.poste || '',
        client_mail: clientData.client_mail || '',
        phone_Number: String(clientData.phone_Number || '')
      });
      setClientId(clientData.id);
    }
  }, [clientData]);

  useEffect(() => {
    if (societeData) {
      setSociete({
        nom_societe: societeData.nom_societe || '',
        rue_societe: societeData.rue_societe || '',
        codepostal_societe: societeData.codepostal_societe || '',
        ville_societe: societeData.ville_societe || ''
      });
      
      // ✅ Charger les contacts de la société
      const societeIdValue = societeData.id || null;
      if (societeIdValue) {
        fetchContactsSociete(societeIdValue);
      }
    }
  }, [societeData, fetchContactsSociete]);

  useEffect(() => {
    if (chantierData) {
      setChantier({
        chantier_name: chantierData.chantier_name || '',
        rue: chantierData.rue || '',
        code_postal: chantierData.code_postal || '',
        ville: chantierData.ville || ''
      });
    }
  }, [chantierData]);

  // ✅ loadParties est maintenant défini plus haut (avant useDevisHandlers)
  useEffect(() => {
    loadParties();
  }, [loadParties]);

  // Charger les chantiers (en cours uniquement)
  useEffect(() => {
    const fetchChantiers = async () => {
      try {
        const response = await axios.get('/api/chantier/');
        const filtered = response.data.filter(
          (c) =>
            c.state_chantier !== 'Terminé' &&
            c.state_chantier !== 'En attente'
        );
        setChantiers(filtered);
      } catch (err) {
        console.error('Erreur chargement chantiers:', err);
      }
    };
    fetchChantiers();
  }, []);

  // Fermer la liste chantier au clic à l'extérieur
  useEffect(() => {
    if (!chantierDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (chantierDropdownRef.current && !chantierDropdownRef.current.contains(e.target)) {
        setChantierDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [chantierDropdownOpen]);

  // Rechercher les parties
  const searchParties = useCallback(async (inputValue) => {
    try {
      const partiesArray = Array.isArray(availableParties) ? availableParties : [];
      // ✅ Utiliser availableParties comme source principale (contient TOUTES les parties)
      // car l'endpoint /api/parties/search/ limite à 50 résultats
      const localResults = partiesArray
        .filter(partie => {
          if (!inputValue) return true;
          const searchLower = inputValue.toLowerCase();
          return (
            partie.titre?.toLowerCase().includes(searchLower) ||
            partie.type?.toLowerCase().includes(searchLower) ||
            partie.type_activite?.toLowerCase().includes(searchLower)
          );
        })
        .map(partie => ({
          value: partie.id,
          label: `${partie.titre || partie.nom || ''}${partie.type ? ` (${partie.type})` : ''}`,
          data: partie
        }));
      
      // Si availableParties est vide ou si on veut compléter avec l'API (optionnel)
      if (localResults.length === 0 || partiesArray.length === 0) {
        try {
          const params = inputValue ? { q: inputValue } : {};
          const response = await axios.get('/api/parties/search/', { params });
          const apiResults = response.data.options || [];
          // Combiner et éliminer les doublons
          const apiIds = new Set(localResults.map(r => r.value));
          apiResults.forEach(apiResult => {
            if (!apiIds.has(apiResult.value)) {
              localResults.push(apiResult);
            }
          });
        } catch (apiError) {
          // Ignorer l'erreur API, on utilise les résultats locaux
        }
      }
      
      return localResults;
    } catch (error) {
      // En cas d'erreur, retourner au moins les parties locales filtrées
      const partiesArray = Array.isArray(availableParties) ? availableParties : [];
      return partiesArray
        .filter(partie => {
          if (!inputValue) return true;
          const searchLower = inputValue.toLowerCase();
          return (
            partie.titre?.toLowerCase().includes(searchLower) ||
            partie.type?.toLowerCase().includes(searchLower) ||
            partie.type_activite?.toLowerCase().includes(searchLower)
          );
        })
        .map(partie => ({
          value: partie.id,
          label: `${partie.titre || partie.nom || ''}${partie.type ? ` (${partie.type})` : ''}`,
          data: partie
        }));
    }
  }, [availableParties]);

  // Formater le numéro de téléphone
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

  // Formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  // Construire la ligne récurrente
  const buildRecurringSpecialLine = useCallback(() => ({
    ...RECURRING_SPECIAL_LINE_TEMPLATE,
    id: `recurring_special_line_${Date.now()}`
  }), []);

  // Auto-placer la ligne récurrente
  const handleAutoPlaceRecurringLine = useCallback(() => {
    if (!recurringLineDraft) return;

    const newLine = {
      ...recurringLineDraft,
      id: recurringLineDraft.id || `recurring_special_line_${Date.now()}`,
      context_type: 'global',
      context_id: null
    };

    setDevisItems(prevItems => {
      const updated = DevisIndexManager.insertAtPosition(prevItems, newLine, 'global_end');
      return reindexAll(updated);
    });
    setRecurringLineDraft(null);
  }, [recurringLineDraft, setDevisItems]);

  // Gérer la ligne récurrente - ne pas en créer si elle existe déjà
  useEffect(() => {
    // Ne pas créer de ligne récurrente si on est en cours de chargement
    if (isLoading) {
      return;
    }
    
    const hasAtLeastOnePartie = devisItems.some(item => item.type === 'partie');
    const recurringLineExists = devisItems.some(isRecurringSpecialLine);
    
    // Si une ligne récurrente existe déjà dans les données, ne pas en créer une nouvelle
    if (recurringLineExists) {
      // S'assurer qu'on n'a pas de draft en attente
      if (recurringLineDraft) {
        setRecurringLineDraft(null);
      }
      return;
    }
    
    // Créer un draft seulement si on a des parties et pas de ligne récurrente
    if (!hasAtLeastOnePartie || recurringLineDraft) {
      return;
    }
    
    setRecurringLineDraft(buildRecurringSpecialLine());
  }, [devisItems, recurringLineDraft, buildRecurringSpecialLine, isLoading]);

  // ✅ Mettre à jour dynamiquement la valeur de la ligne récurrente
  useEffect(() => {
    if (!hasRecurringLine) {
      return;
    }

    setDevisItems(prevItems => {
      let didUpdate = false;
      const updatedItems = prevItems.map(item => {
        if (isRecurringSpecialLine(item)) {
          const amount = calculateRecurringLineAmount(item);
          if (Number.isFinite(amount)) {
            const currentValue = typeof item.value === 'number' ? item.value : 0;
            if (Math.abs(currentValue - amount) > 0.01 || item.value === undefined) {
              didUpdate = true;
              return { ...item, value: amount };
            }
          }
        }
        return item;
      });
      return didUpdate ? updatedItems : prevItems;
    });
  }, [hasRecurringLine, calculateRecurringLineAmount, setDevisItems]);

  // Handler pour sauvegarder
  const handleSaveDevis = async () => {
    const validation = validateBeforeTransform({
      devisItems,
      devisData,
      selectedChantierId
    });
    
    if (!validation.valid) {
      alert(`Erreurs de validation:\n${validation.errors.join('\n')}`);
      return;
    }

    // Récupérer l'ancien numéro du devis avant modification
    const oldDevisNumero = loadedDevisData?.numero || null;

    const result = await saveDevis({
      devisItems,
      devisData: {
        ...devisData,
        price_ht: totalHt,
        price_ttc: totalTtc,
        contact_societe: selectedContactId || null // ✅ Ajouter le contact sélectionné
      },
      selectedChantierId,
      clientId,
      totalHt,
      totalTtc,
      tauxFixe,
      devisType,
      oldDevisNumero
    });

    if (result.success) {
      // Générer le PDF dans le drive après modification
      try {
        console.log('🔄 Génération du PDF du devis modifié dans le Drive...');
        
        // Déterminer le type de devis et préparer les données
        const isChantierDevis = devisType === 'chantier' || loadedDevisData?.devis_chantier;
        const documentType = isChantierDevis ? 'devis_chantier' : 'devis_normal';
        
        // Préparer les données selon le type de devis
        let driveData = {};
        
        if (isChantierDevis) {
          // Pour les devis de chantier (appels d'offres)
          // Il faut récupérer l'appel d'offres associé
          try {
            const devisResponse = await axios.get(`/api/devisa/${devisId}/`);
            const devisFullData = devisResponse.data;
            
            if (devisFullData.appel_offres) {
              const appelOffresResponse = await axios.get(`/api/appel-offres/${devisFullData.appel_offres}/`);
              const appelOffres = appelOffresResponse.data;
              
              driveData = {
                devisId: devisId,
                appelOffresId: appelOffres.id,
                appelOffresName: appelOffres.chantier_name || appelOffres.nom || 'Appel d\'offres',
                societeName: societeData?.nom_societe || 'Société',
                numero: devisData.numero || loadedDevisData?.numero
              };
            } else {
              console.warn('⚠️ Aucun appel d\'offres associé au devis de chantier');
              // Fallback : utiliser les données disponibles
              driveData = {
                devisId: devisId,
                appelOffresId: null,
                appelOffresName: chantierData?.chantier_name || 'Chantier',
                societeName: societeData?.nom_societe || 'Société',
                numero: devisData.numero || loadedDevisData?.numero
              };
            }
          } catch (error) {
            console.error('❌ Erreur lors de la récupération des données:', error);
            // Fallback : utiliser les données disponibles
            driveData = {
              devisId: devisId,
              appelOffresId: null,
              appelOffresName: chantierData?.chantier_name || 'Chantier',
              societeName: societeData?.nom_societe || 'Société',
              numero: devisData.numero || loadedDevisData?.numero
            };
          }
        } else {
          // Pour les devis normaux
          driveData = {
            devisId: devisId,
            chantierId: selectedChantierId,
            chantierName: chantierData?.chantier_name || 'Chantier',
            societeName: societeData?.nom_societe || 'Société',
            numero: devisData.numero || loadedDevisData?.numero
          };
        }

        const pdfResult = await generatePDFDrive(documentType, driveData, {
          onSuccess: (result) => {
            console.log("✅ PDF du devis généré et stocké dans le Drive:", result);
          },
          onError: (error) => {
            console.error("❌ Erreur lors de la génération du PDF:", error);
          },
        });

        // Si un conflit est détecté, ne pas rediriger (l'utilisateur doit résoudre le conflit)
        if (pdfResult && pdfResult.conflict_detected) {
          console.log("⚠️ Conflit détecté - le modal de conflit est affiché. Attente de la résolution par l'utilisateur.");
          // Ne pas rediriger - l'utilisateur doit résoudre le conflit via le modal
          return;
        }
      } catch (pdfError) {
        console.error("❌ Erreur lors de la génération du PDF:", pdfError);
        // Si l'erreur est un conflit, ne pas rediriger
        if (pdfError.response && pdfError.response.status === 409) {
          console.log("⚠️ Conflit détecté via erreur - le modal de conflit est affiché.");
          return;
        }
        // Pour les autres erreurs, continuer quand même avec la redirection
      }
      
      alert('Devis modifié avec succès !');
      navigate('/ListeDevis');
    } else {
      alert(`Erreur lors de la sauvegarde:\n${result.error}`);
    }
  };

  // Handler pour prévisualiser avec les modifications actuelles
  const handlePreviewDevis = async () => {
    try {
      // Valider les données avant la prévisualisation
      const validation = validateBeforeTransform({
        devisItems,
        devisData,
        selectedChantierId
      });
      
      if (!validation.valid) {
        alert(`Erreurs de validation:\n${validation.errors.join('\n')}`);
        return;
      }
      
      // Transformer les données vers le format legacy pour la preview
      const legacyDevis = transformToLegacyFormat({
        devisItems,
        devisData: {
          ...devisData,
          price_ht: totalHt,
          price_ttc: totalTtc,
          contact_societe: selectedContactId || null
        },
        selectedChantierId,
        clientIds: clientId ? [clientId] : []
      });
      
      // Préparer les données pour la prévisualisation
      const previewData = {
        ...legacyDevis,
        chantier: selectedChantierId || -1,
        tempData: {}
      };
      
      // Utiliser POST pour envoyer les données actuelles (pas celles en DB)
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = '/api/preview-devis-v2/';
      form.target = '_blank';
      form.style.display = 'none';
      
      // Ajouter les données comme input hidden (JSON stringifié)
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'devis';
      input.value = JSON.stringify(previewData);
      form.appendChild(input);
      
      // Ajouter le formulaire au DOM, le soumettre, puis le supprimer
      document.body.appendChild(form);
      form.submit();
      
      // Nettoyer après un court délai
      setTimeout(() => {
        document.body.removeChild(form);
      }, 100);
    } catch (error) {
      console.error('Erreur lors de la prévisualisation:', error);
      alert(`Erreur lors de la prévisualisation:\n${error.message || 'Erreur inconnue'}`);
    }
  };

  // Éditer une ligne spéciale
  const handleEditSpecialLine = (line) => {
    setEditingSpecialLine(line);
    setShowEditModal(true);
  };

  // Sauvegarder une ligne spéciale éditée
  const handleSaveSpecialLine = (updatedLine) => {
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
    setShowEditModal(false);
    setEditingSpecialLine(null);
  };

  // Réordonner les lignes spéciales
  const handleSpecialLinesReorder = (newLines) => {
    setPendingSpecialLines(newLines);
  };

  // Supprimer une ligne en attente
  const handleRemovePendingSpecialLine = (lineId) => {
    setPendingSpecialLines(prev => prev.filter(line => line.id !== lineId));
  };

  // Transférer du tableau option vers le principal
  const handleTransferFromOptionsToMain = (itemToTransfer) => {
    if (!itemToTransfer) return;
    
    const nextIndex = getNextIndex(
      devisItems, 
      itemToTransfer.type === 'ligne_detail' ? 'sous_partie' : 
      itemToTransfer.type === 'sous_partie' ? 'partie' : 'global', 
      itemToTransfer.type === 'ligne_detail' ? itemToTransfer.sous_partie_id :
      itemToTransfer.type === 'sous_partie' ? itemToTransfer.partie_id : null
    );
    
    const transferredItem = {
      ...itemToTransfer,
      index_global: nextIndex || (devisItems.length > 0 ? Math.max(...devisItems.map(i => i.index_global)) + 1 : 1)
    };
    
    setDevisItems(prev => sortByIndexGlobal([...prev, transferredItem]));
  };

  // Affichage du chargement
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress size={60} />
        <Typography sx={{ ml: 2 }}>Chargement du devis...</Typography>
      </Box>
    );
  }

  // Affichage des erreurs
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography variant="h6">Erreur de chargement</Typography>
          <Typography>{error}</Typography>
        </Alert>
        <Button variant="contained" onClick={() => navigate('/ListeDevis')}>
          Retour à la liste
        </Button>
      </Box>
    );
  }

  return (
    <div style={{
      padding: '20px 10px',
      marginRight: '150px',
      minHeight: 'auto',
      backgroundColor: '#f5f5f5',
      borderRadius: '10px',
    }}>
      <div style={{
        fontFamily: 'Arial, Helvetica, "Roboto", sans-serif',
        fontSize: '16px',
        maxWidth: '1200px',
        margin: '0 150px 0 150px',
        padding: '20px 10px',
        minHeight: 'auto',
        backgroundColor: 'rgb(255 255 255)',
        borderRadius: '10px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        overflow: 'visible'
      }}>
        <DevisStyles />
        
        {/* En-tête de la page */}
        <div style={{
          backgroundColor: '#ff9800',
          color: 'white',
          padding: '20px 30px',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>
            Modification de Devis
          </h1>
          <p style={{ margin: '8px 0 0 0', fontSize: '16px', opacity: 0.9 }}>
            Devis n°{devisData.numero}
          </p>
        </div>

        {/* Contenu principal */}
        <div style={{ padding: '30px' }}>
          
          {/* Section Client et contact */}
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
              isEditable={false}
              contacts={contactsSociete}
              selectedContactId={selectedContactId}
              onContactSelect={setSelectedContactId}
              onOpenContactModal={() => setShowContactModal(true)}
              societeId={currentSocieteId}
            />
          </div>

          {/* Section Chantier */}
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

            <Box ref={chantierDropdownRef} sx={{ position: 'relative', marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', color: '#6c757d', marginBottom: '6px' }}>
                Chantier
              </label>
              <input
                type="text"
                placeholder="Rechercher un chantier..."
                value={
                  selectedChantierId
                    ? (chantiers.find((c) => c.id === selectedChantierId)?.chantier_name ?? chantier.chantier_name ?? '')
                    : chantierSearchQuery
                }
                onChange={(e) => {
                  setChantierSearchQuery(e.target.value);
                  setChantierDropdownOpen(true);
                }}
                onFocus={() => setChantierDropdownOpen(true)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '2px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />
              {chantierDropdownOpen && (
                <ul
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    margin: 0,
                    marginTop: '4px',
                    padding: 0,
                    listStyle: 'none',
                    maxHeight: '240px',
                    overflowY: 'auto',
                    backgroundColor: '#fff',
                    border: '2px solid #2196f3',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    zIndex: 10,
                  }}
                >
                  {(() => {
                    const chantiersEnCours = chantiers.filter(
                      (c) =>
                        c.state_chantier !== 'Terminé' &&
                        c.state_chantier !== 'En attente'
                    );
                    const sorted = [...chantiersEnCours].sort((a, b) =>
                      (a.chantier_name || '').localeCompare(b.chantier_name || '', 'fr')
                    );
                    const filtered = chantierSearchQuery.trim()
                      ? sorted.filter((c) =>
                          (c.chantier_name || '')
                            .toLowerCase()
                            .includes(chantierSearchQuery.trim().toLowerCase())
                        )
                      : sorted;
                    if (filtered.length === 0) {
                      return (
                        <li style={{ padding: '12px 14px', color: '#666', fontSize: '14px' }}>
                          Aucun chantier trouvé
                        </li>
                      );
                    }
                    return filtered.map((ch) => (
                      <li
                        key={ch.id}
                        onClick={() => handleChantierChange(ch.id)}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          borderBottom: '1px solid #eee',
                          backgroundColor: selectedChantierId === ch.id ? '#e3f2fd' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e3f2fd';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor =
                            selectedChantierId === ch.id ? '#e3f2fd' : 'transparent';
                        }}
                      >
                        {ch.chantier_name}
                      </li>
                    ));
                  })()}
                </ul>
              )}
            </Box>
            
            <ChantierInfo 
              chantier={chantier} 
              selectedChantierId={selectedChantierId}
              isEditable={false}
            />
          </div>

          {/* Section Informations générales */}
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
                  isGeneratingNumber={false}
                />
              </div>
            </div>
          </div>

          {/* Section Détail du devis */}
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
              special_lines_global={[]}
              total_ht={totalHt}
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
              onCancelPlacement={handleCancelPlacement}
              onRequestReplacement={(line) => handleMoveSpecialLine(line.id)}
              onCloseEditModal={() => setShowEditModal(false)}
              onSaveSpecialLine={handleSaveSpecialLine}
              onSpecialLinesReorder={handleSpecialLinesReorder}
              calculateGlobalTotal={calculateGlobalTotal}
              calculateGlobalTotalExcludingLine={calculateGlobalTotalExcludingLine}
              calculatePartieTotal={calculatePartieTotal}
              calculateSousPartieTotal={calculateSousPartieTotal}
              
              devisItems={enrichedDevisItems}
              onDevisItemsReorder={handleDevisItemsReorder}
              
              isSelectingBase={isSelectingBase}
              onBaseSelected={handleBaseSelected}
              onCancelBaseSelection={handleCancelBaseSelection}
              pendingLineForBase={pendingLineForBase}
              onClearPendingLineForBase={handleClearPendingLineForBase}
              pendingRecurringLine={recurringLineDraft}
              onAutoPlaceRecurringLine={handleAutoPlaceRecurringLine}
              pendingRecurringAmount={calculateGlobalTotal()}
              calculateRecurringLineAmount={calculateRecurringLineAmount}
              hasRecurringLine={hasRecurringLine}
              onLigneDetailHover={setHoveredLigneDetail}
              hoveredLigneDetail={hoveredLigneDetail}
            />
          </div>

          {/* Section Récapitulatif */}
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
              total_ht={totalHt}
              tva={tva}
              montant_ttc={totalTtc}
              formatMontantEspace={formatMontantEspace}
              onTvaRateChange={(newRate) => {
                setDevisData(prev => ({ ...prev, tva_rate: newRate }));
              }}
            />
          </div>

          {/* Section Options */}
          <TableauOption
            devisData={devisData}
            devisItems={devisItems}
            formatMontantEspace={formatMontantEspace}
            onTransferToMain={handleTransferFromOptionsToMain}
          />

          {/* Section Actions */}
          <div style={{
            backgroundColor: '#fff3e0',
            border: '1px solid #ff9800',
            borderRadius: '8px',
            padding: '25px',
            textAlign: 'center'
          }}>
            <h3 style={{
              color: '#e65100',
              fontSize: '18px',
              fontWeight: 'bold',
              margin: '0 0 15px 0'
            }}>
              Actions disponibles
            </h3>
            <div style={{ display: 'flex', gap: '15px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button 
                onClick={handleSaveDevis}
                disabled={isSaving}
                style={{
                  backgroundColor: isSaving ? '#6c757d' : '#ff9800',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  opacity: isSaving ? 0.6 : 1
                }}
              >
                {isSaving ? '⏳ Sauvegarde...' : '💾 Sauvegarder les modifications'}
              </button>
              <button 
                onClick={handlePreviewDevis}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                👁️ Aperçu PDF
              </button>
              <button
                onClick={() => navigate('/ListeDevis')}
                style={{
                  backgroundColor: '#9e9e9e',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                ↩️ Retour à la liste
              </button>
            </div>
            
            {saveError && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {saveError}
              </Alert>
            )}
          </div>
        </div>
      </div>

      {/* PieChart flottant pour la répartition des coûts */}
      <DevisCostPieChart
        devisItems={devisItems}
        totalHT={totalHt}
        hoveredLine={hoveredLigneDetail}
        isVisible={isPieChartVisible}
        onClose={() => setIsPieChartVisible(false)}
      />

      {/* ✅ Modal de gestion des contacts de société */}
      {currentSocieteId && (
        <ContactSocieteModal
          open={showContactModal}
          onClose={() => setShowContactModal(false)}
          societeId={currentSocieteId}
          societeName={societe.nom_societe || ''}
          onContactChange={() => fetchContactsSociete(currentSocieteId)}
        />
      )}
    </div>
  );
};

export default ModificationDevisV2;


