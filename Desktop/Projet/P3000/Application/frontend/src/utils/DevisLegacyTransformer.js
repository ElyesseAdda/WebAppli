/**
 * Service de transformation des données de devis du nouveau système (DevisAvance)
 * vers le format legacy attendu par l'API backend.
 * 
 * Ce service permet de convertir les données structurées avec index_global
 * vers le format historique de l'application pour maintenir la compatibilité.
 */

/**
 * Calcule le prix d'une ligne de détail
 * @param {Object} ligne - Ligne de détail avec prix, coûts, marge, etc.
 * @returns {number} Prix unitaire calculé
 */
const calculatePrice = (ligne) => {
  // Si un prix_devis existe (prix personnalisé pour ce devis), l'utiliser
  if (ligne.prix_devis !== null && ligne.prix_devis !== undefined) {
    return parseFloat(ligne.prix_devis);
  }
  
  const cout_main_oeuvre = parseFloat(ligne.cout_main_oeuvre) || 0;
  const cout_materiel = parseFloat(ligne.cout_materiel) || 0;
  
  // Si pas de coûts, utiliser le prix de base (prix manuel ou prix du catalogue)
  if (cout_main_oeuvre === 0 && cout_materiel === 0) {
    return parseFloat(ligne.prix) || 0;
  }
  
  // Sinon, calculer avec les coûts
  const marge = ligne.marge_devis !== null && ligne.marge_devis !== undefined 
    ? parseFloat(ligne.marge_devis)
    : parseFloat(ligne.marge) || 0;
  
  const taux_fixe = parseFloat(ligne.taux_fixe) || 0;
  
  const base = cout_main_oeuvre + cout_materiel;
  const montant_taux_fixe = base * (taux_fixe / 100);
  const sous_total = base + montant_taux_fixe;
  const montant_marge = sous_total * (marge / 100);
  const prix = sous_total + montant_marge;
  
  return prix;
};

/**
 * Calcule les coûts estimés (main d'œuvre et matériel) à partir des lignes de détail
 * @param {Array} devisItems - Tous les items du devis (triés par index_global)
 * @returns {Object} { cout_estime_main_oeuvre, cout_estime_materiel }
 */
const calculateEstimatedCosts = (devisItems) => {
  let cout_main_oeuvre_total = 0;
  let cout_materiel_total = 0;
  
  // Parcourir toutes les lignes de détail
  const lignesDetails = devisItems.filter(item => item.type === 'ligne_detail');
  
  lignesDetails.forEach(ligne => {
    const quantite = parseFloat(ligne.quantity || 0);
    const cout_mo = parseFloat(ligne.cout_main_oeuvre || 0);
    const cout_mat = parseFloat(ligne.cout_materiel || 0);
    
    cout_main_oeuvre_total += cout_mo * quantite;
    cout_materiel_total += cout_mat * quantite;
  });
  
  return {
    cout_estime_main_oeuvre: cout_main_oeuvre_total,
    cout_estime_materiel: cout_materiel_total
  };
};

/**
 * Extrait les métadonnées des parties et sous-parties avec leurs numéros
 * Format pour parties_metadata (JSONField) pour stocker les numéros
 * @param {Array} devisItems - Tous les items du devis
 * @returns {Object} Structure parties_metadata avec selectedParties contenant les numéros
 */
const extractPartiesMetadata = (devisItems) => {
  const selectedParties = [];
  const parseIndex = (value) => {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return value;
    }
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  };
  
  // Trier les parties par index_global
  const parties = devisItems
    .filter(item => item.type === 'partie')
    .sort((a, b) => (a.index_global || 0) - (b.index_global || 0));
  
  parties.forEach(partie => {
    // Récupérer les sous-parties de cette partie, triées par index_global
    const sousParties = devisItems
      .filter(item => item.type === 'sous_partie' && item.partie_id === partie.id)
      .sort((a, b) => (a.index_global || 0) - (b.index_global || 0));
    
    // Construire la structure de la partie avec ses sous-parties
    const partieData = {
      id: partie.id,
      titre: partie.titre || '',
      type: partie.type_activite || 'PEINTURE',
      index_global: parseIndex(partie.index_global),
      // ✅ Ajouter le numéro de la partie (Integer pour partie, 0 = pas de numéro)
      numero: partie.numero !== null && partie.numero !== undefined && partie.numero !== '' 
        ? (typeof partie.numero === 'number' ? partie.numero : parseInt(partie.numero, 10))
        : 0,
      sousParties: sousParties.map(sp => {
        // Récupérer les lignes de détail de cette sous-partie
        const lignesDetails = devisItems
          .filter(item => item.type === 'ligne_detail' && item.sous_partie_id === sp.id)
          .map(ld => ld.id);
        
        return {
          id: sp.id,
          description: sp.description || '',
          index_global: parseIndex(sp.index_global),
          // ✅ Ajouter le numéro de la sous-partie (CharField pour sous-partie)
          numero: sp.numero !== null && sp.numero !== undefined && sp.numero !== '' 
            ? String(sp.numero) 
            : null,
          lignesDetails: lignesDetails
        };
      })
    };
    
    selectedParties.push(partieData);
  });
  
  return {
    selectedParties: selectedParties
  };
};

/**
 * Extrait et organise les lignes de détail au format legacy
 * @param {Array} devisItems - Tous les items du devis
 * @returns {Array} Array de lignes au format { ligne_detail: ID, quantite, prix_unitaire, total_ht }
 */
const extractLignes = (devisItems) => {
  const lignes = [];
  
  // ✅ Filtrer uniquement les lignes de détail et trier par index_global pour conserver l'ordre
  const lignesDetails = devisItems
    .filter(item => item.type === 'ligne_detail')
    .sort((a, b) => (a.index_global || 0) - (b.index_global || 0));
  
  lignesDetails.forEach(ligne => {
    const quantite = parseFloat(ligne.quantity || 0);
    const prix_unitaire = calculatePrice(ligne);
    const total_ht = quantite * prix_unitaire;
    
    // ✅ Format attendu par l'API Django : { ligne_detail: ID, quantite: qty, prix_unitaire: price, total_ht: total, index_global: index }
    const ligneData = {
      ligne_detail: ligne.id,  // ← Nom correct pour le serializer
      quantite: quantite.toFixed(2),  // ← Nom correct pour le serializer
      prix_unitaire: prix_unitaire.toFixed(2),  // ← Nom correct pour le serializer
      // ✅ Ajouter total_ht (calculé, même si c'est une propriété côté backend)
      total_ht: total_ht.toFixed(2)
    };
    
    // ✅ Ajouter index_global si présent (pour conserver l'ordre des lignes)
    // IMPORTANT : index_global peut être décimal (1.101, 1.102, etc.) donc utiliser parseFloat, pas parseInt
    if (ligne.index_global !== null && ligne.index_global !== undefined) {
      const indexGlobal = typeof ligne.index_global === 'number' 
        ? ligne.index_global 
        : parseFloat(ligne.index_global);
      if (!isNaN(indexGlobal)) {
        ligneData.index_global = indexGlobal;
      }
    }
    
    // ✅ Ajouter le numéro si présent (gérer le cas des anciens devis avec blank=True, default=0)
    // Si numero existe et est valide (nombre > 0), l'inclure
    // Sinon, ne pas l'inclure (les anciens devis sans numero utiliseront le default=0 du modèle)
    if (ligne.numero !== null && ligne.numero !== undefined && ligne.numero !== '') {
      const numero = parseInt(ligne.numero, 10);
      if (!isNaN(numero) && numero > 0) {
        ligneData.numero = numero;
      }
    }
    
    lignes.push(ligneData);
  });
  
  return lignes;
};

/**
 * Calcule le montant d'une ligne spéciale basé sur ses bases de calcul
 * @param {Object} ligneSpeciale - Ligne spéciale avec baseCalculation
 * @param {Object} bases - Bases de calcul { sousParties: {}, parties: {}, global: 0 }
 * @param {Array} devisItems - Tous les items pour calculs récursifs si nécessaire
 * @returns {number} Montant calculé de la ligne spéciale
 */
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
 * Calcule le prix d'une ligne de détail (simplifié pour le transformer)
 */
const calculateDetailLinePrice = (ligne) => {
  if (ligne.prix_devis !== null && ligne.prix_devis !== undefined) {
    return parseFloat(ligne.prix_devis);
  }
  const cout_main_oeuvre = parseFloat(ligne.cout_main_oeuvre) || 0;
  const cout_materiel = parseFloat(ligne.cout_materiel) || 0;
  if (cout_main_oeuvre === 0 && cout_materiel === 0) {
    return parseFloat(ligne.prix) || 0;
  }
  const marge = ligne.marge_devis !== null && ligne.marge_devis !== undefined 
    ? parseFloat(ligne.marge_devis) : parseFloat(ligne.marge) || 0;
  const taux_fixe = parseFloat(ligne.taux_fixe) || 0;
  const base = cout_main_oeuvre + cout_materiel;
  const montant_taux_fixe = base * (taux_fixe / 100);
  const sous_total = base + montant_taux_fixe;
  return sous_total + (sous_total * (marge / 100));
};

/**
 * Calcule le total d'une partie (somme des lignes de détail de ses sous-parties)
 */
const calculatePartieTotal = (partie, devisItems) => {
  // Trouver toutes les sous-parties de cette partie
  const sousParties = devisItems.filter(item => 
    item.type === 'sous_partie' && item.partie_id === partie.id
  );
  
  let total = 0;
  sousParties.forEach(sp => {
    // Trouver toutes les lignes de détail de cette sous-partie
    const lignes = devisItems.filter(item => 
      item.type === 'ligne_detail' && item.sous_partie_id === sp.id
    );
    lignes.forEach(ligne => {
      const prix = calculateDetailLinePrice(ligne);
      total += prix * (parseFloat(ligne.quantity) || 0);
    });
  });
  
  return total;
};

/**
 * Calcule le montant de la ligne récurrente (somme des éléments avant elle)
 */
const calculateRecurringAmount = (recurringLine, devisItems) => {
  const targetIndex = parseFloat(recurringLine.index_global) || 0;
  const sortedItems = [...devisItems].sort((a, b) => 
    (parseFloat(a.index_global) || 0) - (parseFloat(b.index_global) || 0)
  );
  
  let runningTotal = 0;
  
  for (const item of sortedItems) {
    const itemIndex = parseFloat(item.index_global) || 0;
    if (itemIndex >= targetIndex) break;
    
    if (item.type === 'partie') {
      runningTotal += calculatePartieTotal(item, devisItems);
    } else if (item.type === 'ligne_speciale' && item.context_type === 'global' && !isRecurringSpecialLine(item)) {
      // Ajouter les lignes spéciales globales (additions/reductions)
      const amount = parseFloat(item.value) || 0;
      if (item.type_speciale === 'addition') {
        runningTotal += amount;
      } else if (item.type_speciale === 'reduction') {
        runningTotal -= amount;
      }
    }
  }
  
  return runningTotal;
};

const calculateSpecialLineAmount = (ligneSpeciale, bases, devisItems = []) => {
  // ✅ CAS SPÉCIAL : Ligne récurrente - calculer la somme des éléments avant elle
  if (isRecurringSpecialLine(ligneSpeciale)) {
    return calculateRecurringAmount(ligneSpeciale, devisItems);
  }
  
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
      // Pour le type global, utiliser la base globale
      base = bases.global || 0;
    }
    
    return base * (value / 100);
  }
  
  // Si pourcentage sans baseCalculation, retourner 0 (cas d'erreur)
  return 0;
};

/**
 * Calcule les bases brutes (sans lignes spéciales) pour les calculs de pourcentages
 * @param {Array} devisItems - Tous les items du devis
 * @returns {Object} { sousParties: {}, parties: {}, global: 0 }
 */
const calculateBasesBrutes = (devisItems) => {
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

/**
 * Organise les lignes spéciales par contexte (global, parties, sousParties)
 * Sépare les lignes de type 'display' des autres lignes spéciales
 * @param {Array} devisItems - Tous les items du devis
 * @returns {Object} { lignes_speciales: { global, parties, sousParties }, lignes_display: { global, parties, sousParties } }
 */
const organizeSpecialLines = (devisItems) => {
  // ✅ Séparer les lignes spéciales normales des lignes de type 'display'
  const lignesSpeciales = {
    global: [],
    parties: {},
    sousParties: {}
  };
  
  const lignesDisplay = {
    global: [],
    parties: {},
    sousParties: {}
  };
  
  // Calculer les bases brutes pour les calculs de montants
  const bases = calculateBasesBrutes(devisItems);
  
  // Filtrer uniquement les lignes spéciales et les trier par index_global
  const specialLines = devisItems
    .filter(item => item.type === 'ligne_speciale')
    .sort((a, b) => (a.index_global || 0) - (b.index_global || 0));
  
  specialLines.forEach(ls => {
    // Calculer le montant de la ligne spéciale
    const montant = calculateSpecialLineAmount(ls, bases, devisItems);
    
    // Construire la ligne spéciale au format legacy
    const valueType = ls.value_type || ls.valueType || 'fixed';
    const legacyLine = {
      description: ls.description || '',
      type: ls.type_speciale || 'display',
      value: parseFloat(ls.value || 0),
      value_type: valueType, // Format Python (underscore)
      valueType: valueType, // Format JavaScript (camelCase) pour compatibilité
      amount: montant, // Montant calculé
      isHighlighted: ls.isHighlighted || false, // Ajouter isHighlighted si présent
      // ✅ Styles : préserver tous les styles pour l'affichage en base de données
      // Les styles incluent : fontWeight, fontStyle, textDecoration, color, backgroundColor, textAlign, etc.
      styles: ls.styles && typeof ls.styles === 'object' ? { ...ls.styles } : {}
    };
    
    // ✅ Ajouter index_global si présent (pour conserver l'ordre des lignes spéciales)
    // IMPORTANT : index_global peut être décimal (0.001, 1.05, etc.) donc utiliser parseFloat, pas parseInt
    if (ls.index_global !== null && ls.index_global !== undefined) {
      const indexGlobal = typeof ls.index_global === 'number' 
        ? ls.index_global 
        : parseFloat(ls.index_global);
      if (!isNaN(indexGlobal)) {
        legacyLine.index_global = indexGlobal;
      }
    }
    
    // Ajouter base_calculation si présent (pour les pourcentages)
    if (ls.baseCalculation) {
      legacyLine.base_calculation = {
        type: ls.baseCalculation.type,
        id: ls.baseCalculation.id || null,
        label: ls.baseCalculation.label || ''
      };
    }
    
    // ✅ Séparer les lignes 'display' des autres lignes spéciales
    const isDisplay = legacyLine.type === 'display';
    const targetObject = isDisplay ? lignesDisplay : lignesSpeciales;
    
    // Organiser par contexte
    if (ls.context_type === 'global') {
      targetObject.global.push(legacyLine);
    } else if (ls.context_type === 'partie' && ls.context_id) {
      const partieId = String(ls.context_id);
      if (!targetObject.parties[partieId]) {
        targetObject.parties[partieId] = [];
      }
      targetObject.parties[partieId].push(legacyLine);
    } else if (ls.context_type === 'sous_partie' && ls.context_id) {
      const sousPartieId = String(ls.context_id);
      if (!targetObject.sousParties[sousPartieId]) {
        targetObject.sousParties[sousPartieId] = [];
      }
      targetObject.sousParties[sousPartieId].push(legacyLine);
    }
  });
  
  return {
    lignes_speciales: lignesSpeciales,
    lignes_display: lignesDisplay
  };
};

/**
 * Convertit une date du format frontend (YYYY-MM-DD) vers le format ISO 8601 complet (YYYY-MM-DDTHH:mm:ss.sssZ)
 * @param {string} dateString - Date au format "YYYY-MM-DD" ou format ISO complet
 * @returns {string} Date au format ISO 8601 complet avec timezone UTC
 */
const convertDateToISO = (dateString) => {
  if (!dateString) {
    // Si pas de date fournie, utiliser la date actuelle
    return new Date().toISOString();
  }
  
  // Si la date est déjà au format ISO complet, la retourner telle quelle
  if (dateString.includes('T') && dateString.includes('Z')) {
    return dateString;
  }
  
  // Si la date est au format "YYYY-MM-DD", la convertir en ISO 8601 complet
  // Mettre l'heure à 00:00:00.000 UTC
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return `${dateString}T00:00:00.000Z`;
  }
  
  // Sinon, essayer de parser la date et la convertir
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  } catch (error) {
    // En cas d'erreur, utiliser la date actuelle
    return new Date().toISOString();
  }
  
  // Par défaut, utiliser la date actuelle
  return new Date().toISOString();
};

/**
 * Transforme les données du nouveau système vers le format legacy
 * @param {Object} params - Paramètres de transformation
 * @param {Array} params.devisItems - Tous les items du devis (parties, sous-parties, lignes, lignes spéciales)
 * @param {Object} params.devisData - Données de base du devis (numero, date_creation, etc.)
 * @param {number|null} params.selectedChantierId - ID du chantier sélectionné (ou null/-1)
 * @param {Array} params.clientIds - IDs des clients associés
 * @param {string} params.devisType - Type de devis ('normal' ou 'chantier')
 * @param {Object|null} params.pendingChantierData - Données du chantier en attente (pour appel d'offres)
 * @param {number|null} params.societeId - ID de la société (pour appel d'offres)
 * @param {Object|null} params.totals - Totaux estimés (cout_estime_main_oeuvre, cout_estime_materiel, cout_avec_taux_fixe, marge_estimee)
 * @param {number} params.tauxFixe - Taux fixe global (par défaut 20)
 * @returns {Object} Devis au format legacy prêt pour l'API
 */
export const transformToLegacyFormat = ({
  devisItems,
  devisData,
  selectedChantierId,
  clientIds = [],
  // ✅ NOUVEAUX PARAMÈTRES
  devisType = "normal", // 'normal' ou 'chantier'
  pendingChantierData = null,
  societeId = null,
  totals = null, // { cout_estime_main_oeuvre, cout_estime_materiel, cout_avec_taux_fixe, marge_estimee }
  tauxFixe = 20,
}) => {
  // Extraire les lignes de détail
  const lignes = extractLignes(devisItems);
  
  // Organiser les lignes spéciales (séparer display des autres)
  const { lignes_speciales, lignes_display } = organizeSpecialLines(devisItems);
  
  // Calculer les coûts estimés (utiliser totals si fourni, sinon calculer)
  const costs = totals || calculateEstimatedCosts(devisItems);
  
  // ✅ Extraire les parties/sous-parties avec leurs numéros pour parties_metadata
  const parties_metadata = extractPartiesMetadata(devisItems);
  
  // Déterminer si c'est un devis de chantier (appel d'offres)
  const devis_chantier = devisType === "chantier";
  
  // Convertir la date de création au format ISO 8601 complet
  const date_creation_iso = convertDateToISO(devisData.date_creation);
  
  // Construire le payload legacy
  const legacyDevis = {
    // Informations de base
    numero: devisData.numero || '',
    date_creation: date_creation_iso, // ✅ Format ISO 8601 complet (YYYY-MM-DDTHH:mm:ss.sssZ)
    chantier: selectedChantierId && selectedChantierId !== -1 ? selectedChantierId : null,
    price_ht: devisData.price_ht ?? 0,
    price_ttc: devisData.price_ttc ?? 0,
    // ✅ Utiliser ?? pour permettre tva_rate = 0
    tva_rate: devisData.tva_rate ?? 20,
    nature_travaux: devisData.nature_travaux || '',
    description: devisData.description || '',
    status: devisData.status || 'En attente',  // ✅ Conserver le status existant lors d'une modification
    devis_chantier: devis_chantier,
    
    // Lignes de détail
    lignes: lignes,
    
    // ✅ Lignes spéciales (sans les lignes 'display')
    lignes_speciales: lignes_speciales,
    
    // ✅ Lignes display (uniquement les lignes de type 'display')
    lignes_display: lignes_display,
    
    // ✅ Métadonnées des parties avec numéros pour l'affichage
    parties_metadata: parties_metadata,
    
    // Coûts estimés
    cout_estime_main_oeuvre: parseFloat(costs.cout_estime_main_oeuvre || 0).toFixed(2),
    cout_estime_materiel: parseFloat(costs.cout_estime_materiel || 0).toFixed(2),
    
    // Clients
    client: clientIds.length > 0 ? clientIds : [],
    
    // ✅ NOUVEAU : Données pour l'appel d'offres si c'est un devis de chantier
    ...(devis_chantier && pendingChantierData && societeId && {
      chantier_name: pendingChantierData.chantier.chantier_name.trim(),
      societe_id: societeId,
      ville: pendingChantierData.chantier.ville,
      rue: pendingChantierData.chantier.rue,
      code_postal: pendingChantierData.chantier.code_postal.toString(),
      taux_fixe: tauxFixe !== null ? tauxFixe : 20,
      // Coûts supplémentaires si disponibles dans totals
      ...(totals && {
        cout_avec_taux_fixe: parseFloat(totals.cout_avec_taux_fixe || 0).toFixed(2),
        marge_estimee: parseFloat(totals.marge_estimee || 0).toFixed(2),
      }),
    }),
    
    // ❌ SUPPRIMÉ : Ces champs sont générés automatiquement par le serializer lors de la lecture
    // - version_systeme_lignes : Détecté automatiquement selon le format des lignes spéciales
    // - mode : Détecté automatiquement selon la présence d'index_global > 0 dans les modèles
    // - items : Généré automatiquement par DevisSerializer.to_representation() lors de la lecture
    // 
    // Le serializer détecte automatiquement :
    // - Si index_global > 0 existe → mode = 'unified', items généré depuis les modèles
    // - Sinon → mode = 'legacy', items généré depuis parties_metadata
  };
  
  return legacyDevis;
};

/**
 * Valide que toutes les données nécessaires sont présentes avant la transformation
 * @param {Object} params - Paramètres à valider
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export const validateBeforeTransform = ({
  devisItems,
  devisData,
  selectedChantierId
}) => {
  const errors = [];
  
  // Vérifier que devisItems existe et est un array
  if (!Array.isArray(devisItems)) {
    errors.push('devisItems doit être un tableau');
  }
  
  // Vérifier que devisData existe
  if (!devisData) {
    errors.push('devisData est requis');
  } else {
    // Vérifier les champs essentiels
    if (!devisData.numero) {
      errors.push('Le numéro du devis est requis');
    }
  }
  
  // Vérifier qu'il y a au moins une ligne de détail ou une ligne spéciale
  if (devisItems && Array.isArray(devisItems)) {
    const hasLignes = devisItems.some(item => item.type === 'ligne_detail');
    const hasSpecialLines = devisItems.some(item => item.type === 'ligne_speciale');
    
    if (!hasLignes && !hasSpecialLines) {
      errors.push('Le devis doit contenir au moins une ligne de détail ou une ligne spéciale');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

