/**
 * ModificationDevisV2 - Composant principal pour la modification de devis
 * Basé sur le même système que DevisAvance mais pour l'édition de devis existants
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

// Hooks personnalisés
import { useDevisLoader } from './hooks/useDevisLoader';
import { useDevisSaver } from './hooks/useDevisSaver';
import { useDevisCalculations } from './hooks/useDevisCalculations';
import { useDevisHandlers } from './hooks/useDevisHandlers';

// Utilitaires
import { DevisIndexManager } from '../../utils/DevisIndexManager';
import { validateBeforeTransform } from '../../utils/DevisLegacyTransformer';

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

  // Hook de handlers
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
  } = useDevisHandlers(devisItems, setDevisItems);

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
        price_ttc: loadedDevisData.price_ttc ?? 0
      });
      setSelectedChantierId(loadedDevisData.chantier);
      setDevisType(loadedDevisData.devis_chantier ? 'chantier' : 'normal');
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
    }
  }, [societeData]);

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

  // Charger les parties disponibles
  const loadParties = useCallback(async () => {
    try {
      setIsLoadingParties(true);
      const response = await axios.get('/api/parties/');
      setAvailableParties(response.data);
    } catch (err) {
      console.error('Erreur lors du chargement des parties:', err);
    } finally {
      setIsLoadingParties(false);
    }
  }, []);

  useEffect(() => {
    loadParties();
  }, [loadParties]);

  // Rechercher les parties
  const searchParties = useCallback(async (inputValue) => {
    try {
      const params = inputValue ? { q: inputValue } : {};
      const response = await axios.get('/api/parties/search/', { params });
      return response.data.options;
    } catch (err) {
      console.error('Erreur lors de la recherche des parties:', err);
      return [];
    }
  }, []);

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

    const result = await saveDevis({
      devisItems,
      devisData: {
        ...devisData,
        price_ht: totalHt,
        price_ttc: totalTtc
      },
      selectedChantierId,
      clientId,
      totalHt,
      totalTtc,
      tauxFixe,
      devisType
    });

    if (result.success) {
      alert('Devis modifié avec succès !');
      navigate('/ListeDevis');
    } else {
      alert(`Erreur lors de la sauvegarde:\n${result.error}`);
    }
  };

  // Handler pour prévisualiser
  const handlePreviewDevis = () => {
    const previewUrl = `/api/preview-saved-devis/${devisId}/`;
    window.open(previewUrl, '_blank');
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
    </div>
  );
};

export default ModificationDevisV2;


