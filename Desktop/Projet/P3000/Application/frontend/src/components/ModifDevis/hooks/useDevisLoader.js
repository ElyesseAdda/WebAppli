/**
 * Hook personnalisé pour charger les données d'un devis existant
 * et les convertir au format utilisé par le système unifié (devisItems)
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Description de la ligne récurrente pour identification
const RECURRING_LINE_DESCRIPTION = 'Montant global HT des prestations unitaires';

/**
 * Vérifie si une ligne est une ligne récurrente
 */
const isRecurringSpecialLine = (item) => (
  item &&
  item.type === 'ligne_speciale' &&
  (
    item.isRecurringSpecial ||
    item.description === RECURRING_LINE_DESCRIPTION
  )
);

/**
 * Recalcule les numéros des parties et sous-parties
 * @param {Array} items - Items à traiter
 * @returns {Array} Items avec numéros recalculés
 */
const recalculateNumeros = (items) => {
  // Trier par index_global
  const sortedItems = [...items].sort((a, b) => 
    (parseFloat(a.index_global) || 0) - (parseFloat(b.index_global) || 0)
  );
  
  // Compteurs pour les numéros
  let partieCounter = 0;
  const sousPartieCounters = {}; // partieId -> compteur
  
  return sortedItems.map(item => {
    if (item.type === 'partie') {
      partieCounter++;
      // Initialiser le compteur de sous-parties pour cette partie
      sousPartieCounters[item.id] = 0;
      
      // Mettre à jour le numéro seulement s'il n'existe pas ou est invalide
      const numero = item.numero && /^\d+$/.test(item.numero) 
        ? item.numero 
        : String(partieCounter);
      
      return { ...item, numero };
    }
    
    if (item.type === 'sous_partie') {
      // Trouver la partie parente
      const partie = sortedItems.find(p => p.type === 'partie' && p.id === item.partie_id);
      if (partie) {
        // Incrémenter le compteur de sous-parties
        if (sousPartieCounters[item.partie_id] === undefined) {
          sousPartieCounters[item.partie_id] = 0;
        }
        sousPartieCounters[item.partie_id]++;
        
        // Générer le numéro au format "X.Y"
        const partieNumero = partie.numero || String(partieCounter);
        const spNumero = sousPartieCounters[item.partie_id];
        const numero = `${partieNumero}.${spNumero}`;
        
        return { ...item, numero };
      }
    }
    
    return item;
  });
};

/**
 * Convertit les données du format API vers le format devisItems unifié
 * @param {Object} devisData - Données brutes du devis depuis l'API
 * @returns {Array} devisItems - Items au format unifié
 */
/**
 * Crée une ligne spéciale formatée depuis les données JSON
 */
const createSpecialLineFromJson = (line, idx, contextType, contextId) => {
  const isRecurring = line.description === RECURRING_LINE_DESCRIPTION;
  return {
    type: 'ligne_speciale',
    id: line.id || `special_${contextType}_${contextId || 'global'}_${idx}_${Date.now()}`,
    description: line.description,
    type_speciale: line.type || 'display',
    value_type: line.value_type || line.valueType || 'fixed',
    value: parseFloat(line.value) || 0,
    context_type: contextType,
    context_id: contextId,
    styles: line.styles || {},
    baseCalculation: line.base_calculation || null,
    index_global: parseFloat(line.index_global) || 0,
    isRecurringSpecial: isRecurring
  };
};

/**
 * Extrait les lignes spéciales depuis les champs JSON du devis
 * Utilise les vrais index_global stockés dans le JSON
 * @param {Object} devisData - Données du devis
 */
const extractSpecialLinesFromJson = (devisData) => {
  const specialLines = [];
  
  // Fonction pour traiter un objet de lignes spéciales
  const processSpecialLines = (linesObj, isDisplay = false) => {
    if (!linesObj) return;
    
    // Lignes globales
    if (linesObj.global && Array.isArray(linesObj.global)) {
      linesObj.global.forEach((line, idx) => {
        // ✅ Utiliser le vrai index_global stocké dans le JSON
        const specialLine = createSpecialLineFromJson(
          { ...line, type: isDisplay ? 'display' : (line.type || 'display') },
          idx,
          'global',
          null
        );
        specialLines.push(specialLine);
      });
    }
    
    // Lignes de parties
    if (linesObj.parties) {
      Object.entries(linesObj.parties).forEach(([partieId, lines]) => {
        if (Array.isArray(lines)) {
          lines.forEach((line, idx) => {
            const specialLine = createSpecialLineFromJson(
              { ...line, type: isDisplay ? 'display' : (line.type || 'display') },
              idx,
              'partie',
              parseInt(partieId)
            );
            specialLines.push(specialLine);
          });
        }
      });
    }
    
    // Lignes de sous-parties
    if (linesObj.sousParties) {
      Object.entries(linesObj.sousParties).forEach(([spId, lines]) => {
        if (Array.isArray(lines)) {
          lines.forEach((line, idx) => {
            const specialLine = createSpecialLineFromJson(
              { ...line, type: isDisplay ? 'display' : (line.type || 'display') },
              idx,
              'sous_partie',
              parseInt(spId)
            );
            specialLines.push(specialLine);
          });
        }
      });
    }
  };
  
  // Traiter lignes_speciales (réductions, additions)
  processSpecialLines(devisData.lignes_speciales, false);
  
  // Traiter lignes_display (affichage uniquement, inclut la ligne récurrente)
  processSpecialLines(devisData.lignes_display, true);
  
  return specialLines;
};

const convertApiToDevisItems = (devisData) => {
  let items = [];
  
  // ✅ TOUJOURS reconstruire depuis parties_metadata pour avoir les vrais index
  // Ne PAS utiliser devisData.items car le serializer legacy génère des index incorrects
  
  // 1. Créer un map des lignes (DevisLigne) pour les quantités et index
  const lignesMap = new Map();
  if (devisData.lignes && Array.isArray(devisData.lignes)) {
    devisData.lignes.forEach(ligne => {
      lignesMap.set(ligne.ligne_detail, {
        quantite: parseFloat(ligne.quantite) || 0,
        prix_unitaire: parseFloat(ligne.prix_unitaire) || 0,
        total_ht: parseFloat(ligne.total_ht) || 0,
        devis_ligne_id: ligne.id,
        // ✅ CRUCIAL : Utiliser le vrai index_global de DevisLigne (ex: "1.101")
        index_global: parseFloat(ligne.index_global) || 0
      });
    });
  }
  
  // 2. Reconstruire depuis parties_metadata avec les vrais index
  if (devisData.parties_metadata?.selectedParties) {
    const selectedParties = devisData.parties_metadata.selectedParties;
    
    // Parcourir les parties
    selectedParties.forEach((partie, partieIdx) => {
      // ✅ Utiliser le vrai index_global de la partie
      const partieIndexGlobal = parseFloat(partie.index_global) || (partieIdx + 1);
      
      // Ajouter la partie
      items.push({
        type: 'partie',
        id: partie.id,
        titre: partie.titre,
        type_activite: partie.type || 'PEINTURE',
        numero: partie.numero !== undefined ? String(partie.numero) : String(partieIdx + 1),
        index_global: partieIndexGlobal
      });
      
      // Ajouter les sous-parties
      if (partie.sousParties && Array.isArray(partie.sousParties)) {
        partie.sousParties.forEach((sp, spIdx) => {
          // ✅ Utiliser le vrai index_global de la sous-partie (ex: 1.1, 1.2)
          const spIndexGlobal = parseFloat(sp.index_global) || (partieIndexGlobal + (spIdx + 1) * 0.1);
          
          items.push({
            type: 'sous_partie',
            id: sp.id,
            description: sp.description,
            partie_id: partie.id,
            numero: sp.numero || `${partie.numero || partieIdx + 1}.${spIdx + 1}`,
            index_global: spIndexGlobal
          });
          
          // Ajouter les lignes de détail
          if (sp.lignesDetails && Array.isArray(sp.lignesDetails)) {
            sp.lignesDetails.forEach((ligneId, ligneIdx) => {
              const ligneData = lignesMap.get(ligneId);
              if (ligneData) {
                // ✅ Utiliser le vrai index_global de DevisLigne (ex: 1.101, 1.102)
                const ligneIndexGlobal = ligneData.index_global || (spIndexGlobal + (ligneIdx + 1) * 0.001);
                
                items.push({
                  type: 'ligne_detail',
                  id: ligneId,
                  sous_partie_id: sp.id,
                  quantity: ligneData.quantite,
                  prix_devis: ligneData.prix_unitaire,
                  index_global: ligneIndexGlobal,
                  devis_ligne_id: ligneData.devis_ligne_id
                });
              }
            });
          }
        });
      }
    });
  }
  
  // 3. Ajouter les lignes spéciales depuis les champs JSON avec leurs vrais index
  const jsonSpecialLines = extractSpecialLinesFromJson(devisData);
  
  if (jsonSpecialLines.length > 0) {
    items = [...items, ...jsonSpecialLines];
  }
  
  // 4. Trier par index_global
  items.sort((a, b) => (parseFloat(a.index_global) || 0) - (parseFloat(b.index_global) || 0));
  
  // 5. Recalculer les numéros des parties et sous-parties
  items = recalculateNumeros(items);
  
  return items;
};

/**
 * Hook pour charger les données complètes d'un devis
 * @param {string|number} devisId - ID du devis à charger
 * @returns {Object} État et fonctions du loader
 */
export const useDevisLoader = (devisId) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [devisData, setDevisData] = useState(null);
  const [devisItems, setDevisItems] = useState([]);
  const [chantierData, setChantierData] = useState(null);
  const [clientData, setClientData] = useState(null);
  const [societeData, setSocieteData] = useState(null);
  const [lignesDetailsCache, setLignesDetailsCache] = useState({});

  /**
   * Charge les détails complets d'une ligne depuis l'API
   */
  const loadLigneDetails = useCallback(async (ligneId) => {
    if (lignesDetailsCache[ligneId]) {
      return lignesDetailsCache[ligneId];
    }
    
    try {
      const response = await axios.get(`/api/ligne-details/all_including_deleted/`);
      const ligne = response.data.find(l => l.id === ligneId);
      
      if (ligne) {
        setLignesDetailsCache(prev => ({ ...prev, [ligneId]: ligne }));
        return ligne;
      }
    } catch (err) {
      console.error(`Erreur lors du chargement de la ligne ${ligneId}:`, err);
    }
    
    return null;
  }, [lignesDetailsCache]);

  /**
   * Enrichit les items avec les données complètes des lignes de détail
   */
  const enrichItemsWithLigneDetails = useCallback(async (items) => {
    const lignesIds = items
      .filter(item => item.type === 'ligne_detail')
      .map(item => item.id);
    
    if (lignesIds.length === 0) return items;
    
    try {
      // Charger toutes les lignes de détail en une seule requête
      const response = await axios.get('/api/ligne-details/all_including_deleted/');
      const allLignes = response.data;
      
      // Créer un map pour accès rapide
      const lignesMap = new Map(allLignes.map(l => [l.id, l]));
      
      // Mettre à jour le cache
      const newCache = {};
      allLignes.forEach(l => {
        newCache[l.id] = l;
      });
      setLignesDetailsCache(prev => ({ ...prev, ...newCache }));
      
      // Enrichir les items
      return items.map(item => {
        if (item.type === 'ligne_detail') {
          const ligneDetail = lignesMap.get(item.id);
          if (ligneDetail) {
            return {
              ...item,
              // ✅ Utiliser 'description' (nom du champ dans l'API)
              description: ligneDetail.description || item.description,
              unite: ligneDetail.unite || item.unite,
              prix: parseFloat(ligneDetail.prix) || 0,
              cout_main_oeuvre: parseFloat(ligneDetail.cout_main_oeuvre) || 0,
              cout_materiel: parseFloat(ligneDetail.cout_materiel) || 0,
              marge: parseFloat(ligneDetail.marge) || 0,
              taux_fixe: parseFloat(ligneDetail.taux_fixe) || 0,
              sous_partie: ligneDetail.sous_partie
            };
          }
        }
        return item;
      });
    } catch (err) {
      console.error('Erreur lors du chargement des lignes de détail:', err);
      return items;
    }
  }, []);

  /**
   * Charge les données du devis depuis l'API
   */
  const loadDevis = useCallback(async () => {
    if (!devisId) {
      setError('Aucun ID de devis fourni');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // 1. Charger le devis
      const devisResponse = await axios.get(`/api/devisa/${devisId}/`);
      const devis = devisResponse.data;
      setDevisData(devis);
      
      // 2. Convertir en format unifié
      let items = convertApiToDevisItems(devis);
      
      // 3. Enrichir avec les données complètes des lignes
      items = await enrichItemsWithLigneDetails(items);
      
      setDevisItems(items);
      
      // 4. Charger les données du chantier si disponible
      if (devis.chantier) {
        try {
          const chantierResponse = await axios.get(`/api/chantier/${devis.chantier}/`);
          const chantier = chantierResponse.data;
          setChantierData(chantier);
          
          // 5. Charger les données de la société
          if (chantier.societe) {
            let societe;
            if (typeof chantier.societe === 'object') {
              societe = chantier.societe;
            } else {
              const societeResponse = await axios.get(`/api/societe/${chantier.societe}/`);
              societe = societeResponse.data;
            }
            setSocieteData(societe);
            
            // 6. Charger les données du client
            if (societe.client_name) {
              const clientId = typeof societe.client_name === 'object'
                ? societe.client_name.id
                : societe.client_name;
              
              const clientResponse = await axios.get(`/api/client/${clientId}/`);
              setClientData(clientResponse.data);
            }
          }
        } catch (chantierErr) {
          console.warn('Erreur lors du chargement du chantier:', chantierErr);
        }
      }
      
      // 7. Si c'est un devis d'appel d'offres, charger depuis appel_offres
      if (devis.appel_offres && !devis.chantier) {
        try {
          const aoResponse = await axios.get(`/api/appels-offres/${devis.appel_offres}/`);
          const appelOffres = aoResponse.data;
          
          // Construire chantierData depuis l'appel d'offres
          setChantierData({
            chantier_name: appelOffres.chantier_name || '',
            rue: appelOffres.rue || '',
            code_postal: appelOffres.code_postal || '',
            ville: appelOffres.ville || ''
          });
          
          // Charger la société
          if (appelOffres.societe) {
            let societe;
            if (typeof appelOffres.societe === 'object') {
              societe = appelOffres.societe;
            } else {
              const societeResponse = await axios.get(`/api/societe/${appelOffres.societe}/`);
              societe = societeResponse.data;
            }
            setSocieteData(societe);
            
            // Charger le client
            if (societe.client_name) {
              const clientId = typeof societe.client_name === 'object'
                ? societe.client_name.id
                : societe.client_name;
              
              const clientResponse = await axios.get(`/api/client/${clientId}/`);
              setClientData(clientResponse.data);
            }
          }
        } catch (aoErr) {
          console.warn('Erreur lors du chargement de l\'appel d\'offres:', aoErr);
        }
      }
      
    } catch (err) {
      console.error('Erreur lors du chargement du devis:', err);
      setError(err.response?.data?.detail || err.message || 'Erreur lors du chargement du devis');
    } finally {
      setIsLoading(false);
    }
  }, [devisId, enrichItemsWithLigneDetails]);

  /**
   * Recharge les données du devis
   */
  const reload = useCallback(() => {
    loadDevis();
  }, [loadDevis]);

  // Charger le devis au montage ou changement d'ID
  useEffect(() => {
    if (devisId) {
      loadDevis();
    }
  }, [devisId, loadDevis]);

  return {
    isLoading,
    error,
    devisData,
    devisItems,
    setDevisItems,
    chantierData,
    clientData,
    societeData,
    lignesDetailsCache,
    loadLigneDetails,
    reload
  };
};

export default useDevisLoader;

