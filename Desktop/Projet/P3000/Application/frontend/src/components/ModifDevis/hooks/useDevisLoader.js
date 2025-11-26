/**
 * Hook personnalisé pour charger les données d'un devis existant
 * et les convertir au format utilisé par le système unifié (devisItems)
 */
import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

/**
 * Convertit les données du format API vers le format devisItems unifié
 * @param {Object} devisData - Données brutes du devis depuis l'API
 * @returns {Array} devisItems - Items au format unifié
 */
const convertApiToDevisItems = (devisData) => {
  const items = [];
  
  // ✅ Créer un map des quantités/prix depuis les lignes (DevisLigne)
  // Les lignes contiennent : { id, ligne_detail (ID), quantite, prix_unitaire, total_ht, index_global }
  const lignesMap = new Map();
  if (devisData.lignes && Array.isArray(devisData.lignes)) {
    devisData.lignes.forEach(ligne => {
      // ligne.ligne_detail est l'ID de la LigneDetail
      lignesMap.set(ligne.ligne_detail, {
        quantite: parseFloat(ligne.quantite) || 0,
        prix_unitaire: parseFloat(ligne.prix_unitaire) || 0,
        total_ht: parseFloat(ligne.total_ht) || 0,
        devis_ligne_id: ligne.id,
        devis_ligne_index_global: ligne.index_global
      });
    });
  }
  
  // Utiliser les items déjà formatés par le serializer si disponibles
  if (devisData.items && Array.isArray(devisData.items) && devisData.items.length > 0) {
    // Le serializer retourne déjà les items au bon format
    // Mais on doit enrichir les lignes_detail avec les quantités depuis DevisLigne
    return devisData.items.map(item => {
      if (item.type === 'ligne_detail') {
        // Récupérer la quantité depuis lignesMap
        const ligneData = lignesMap.get(item.id);
        return {
          ...item,
          index_global: parseFloat(item.index_global) || 0,
          // ✅ Utiliser la quantité de DevisLigne, pas celle de LigneDetail
          quantity: ligneData?.quantite || 0,
          prix_devis: ligneData?.prix_unitaire || parseFloat(item.prix) || 0,
          devis_ligne_id: ligneData?.devis_ligne_id
        };
      }
      return {
        ...item,
        index_global: parseFloat(item.index_global) || 0
      };
    });
  }
  
  // Sinon, reconstruire depuis parties_metadata et lignes
  if (devisData.parties_metadata?.selectedParties) {
    const selectedParties = devisData.parties_metadata.selectedParties;
    const lignesMap = new Map();
    
    // Créer un map des lignes pour accès rapide
    if (devisData.lignes && Array.isArray(devisData.lignes)) {
      devisData.lignes.forEach(ligne => {
        lignesMap.set(ligne.ligne_detail, ligne);
      });
    }
    
    // Parcourir les parties
    selectedParties.forEach((partie, partieIdx) => {
      const partieIndexGlobal = partie.index_global || (partieIdx + 1);
      
      // Ajouter la partie
      items.push({
        type: 'partie',
        id: partie.id,
        titre: partie.titre,
        type_activite: partie.type || 'PEINTURE',
        numero: partie.numero || String(partieIdx + 1),
        index_global: partieIndexGlobal
      });
      
      // Ajouter les sous-parties
      if (partie.sousParties && Array.isArray(partie.sousParties)) {
        partie.sousParties.forEach((sp, spIdx) => {
          const spIndexGlobal = sp.index_global || (partieIndexGlobal + (spIdx + 1) * 0.1);
          
          items.push({
            type: 'sous_partie',
            id: sp.id,
            description: sp.description,
            partie_id: partie.id,
            numero: sp.numero || `${partieIdx + 1}.${spIdx + 1}`,
            index_global: spIndexGlobal
          });
          
          // Ajouter les lignes de détail
          if (sp.lignesDetails && Array.isArray(sp.lignesDetails)) {
            sp.lignesDetails.forEach((ligneId, ligneIdx) => {
              const ligneData = lignesMap.get(ligneId);
              if (ligneData) {
                const ligneIndexGlobal = ligneData.index_global || (spIndexGlobal + (ligneIdx + 1) * 0.001);
                
                items.push({
                  type: 'ligne_detail',
                  id: ligneId,
                  sous_partie_id: sp.id,
                  quantity: parseFloat(ligneData.quantite) || 0,
                  prix_devis: parseFloat(ligneData.prix_unitaire) || 0,
                  index_global: ligneIndexGlobal,
                  // Les autres champs seront chargés depuis l'API ligne-details
                  designation: ligneData.designation || '',
                  unite: ligneData.unite || ''
                });
              }
            });
          }
        });
      }
    });
  }
  
  // Ajouter les lignes spéciales
  const addSpecialLines = (specialLines, contextType) => {
    if (!specialLines) return;
    
    // Lignes globales
    if (specialLines.global && Array.isArray(specialLines.global)) {
      specialLines.global.forEach((line, idx) => {
        items.push({
          type: 'ligne_speciale',
          id: line.id || `special_global_${idx}_${Date.now()}`,
          description: line.description,
          type_speciale: line.type,
          value_type: line.value_type || line.valueType,
          value: line.value,
          context_type: 'global',
          context_id: null,
          styles: line.styles || {},
          baseCalculation: line.base_calculation || null,
          index_global: line.index_global || (idx + 1)
        });
      });
    }
    
    // Lignes de parties
    if (specialLines.parties) {
      Object.entries(specialLines.parties).forEach(([partieId, lines]) => {
        lines.forEach((line, idx) => {
          items.push({
            type: 'ligne_speciale',
            id: line.id || `special_partie_${partieId}_${idx}_${Date.now()}`,
            description: line.description,
            type_speciale: line.type,
            value_type: line.value_type || line.valueType,
            value: line.value,
            context_type: 'partie',
            context_id: parseInt(partieId),
            styles: line.styles || {},
            baseCalculation: line.base_calculation || null,
            index_global: line.index_global || 0
          });
        });
      });
    }
    
    // Lignes de sous-parties
    if (specialLines.sousParties) {
      Object.entries(specialLines.sousParties).forEach(([spId, lines]) => {
        lines.forEach((line, idx) => {
          items.push({
            type: 'ligne_speciale',
            id: line.id || `special_sp_${spId}_${idx}_${Date.now()}`,
            description: line.description,
            type_speciale: line.type,
            value_type: line.value_type || line.valueType,
            value: line.value,
            context_type: 'sous_partie',
            context_id: parseInt(spId),
            styles: line.styles || {},
            baseCalculation: line.base_calculation || null,
            index_global: line.index_global || 0
          });
        });
      });
    }
  };
  
  // Ajouter les lignes spéciales normales et display
  addSpecialLines(devisData.lignes_speciales, 'normal');
  addSpecialLines(devisData.lignes_display, 'display');
  
  // Trier par index_global
  items.sort((a, b) => a.index_global - b.index_global);
  
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
              designation: ligneDetail.designation || item.designation,
              unite: ligneDetail.unite || item.unite,
              prix: ligneDetail.prix || 0,
              cout_main_oeuvre: ligneDetail.cout_main_oeuvre || 0,
              cout_materiel: ligneDetail.cout_materiel || 0,
              marge: ligneDetail.marge || 0,
              taux_fixe: ligneDetail.taux_fixe || 0,
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

