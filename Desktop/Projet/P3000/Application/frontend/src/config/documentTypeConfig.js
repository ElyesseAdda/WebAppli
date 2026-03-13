/**
 * Configuration centralisée des types de documents pour la régénération de PDFs dans le Drive
 * 
 * Ce fichier définit tous les types de documents supportés et leurs configurations
 * pour le système universel de régénération de PDFs
 */

export const DOCUMENT_TYPES = {
  SITUATION: 'situation',
  CONTRAT_SOUS_TRAITANCE: 'contrat_sous_traitance',
  AVENANT_SOUS_TRAITANCE: 'avenant_sous_traitance',
  DEVIS_TRAVAUX: 'devis_travaux',
  DEVIS_MARCHE: 'devis_marche',
  BON_COMMANDE: 'bon_commande',
  FACTURE: 'facture',
  PLANNING_HEBDO: 'planning_hebdo',
  RAPPORT_AGENTS: 'rapport_agents',
  RAPPORT_INTERVENTION: 'rapport_intervention',
};

/**
 * Configuration détaillée pour chaque type de document
 */
export const DOCUMENT_CONFIG = {
  [DOCUMENT_TYPES.SITUATION]: {
    label: 'Situation',
    endpoint: '/api/generate-situation-pdf-drive/',
    icon: '📋',
    confirmMessage: 'Êtes-vous sûr de vouloir régénérer cette situation dans le Drive ?',
    successMessage: 'Situation régénérée avec succès dans le Drive',
    errorMessage: 'Erreur lors de la régénération de la situation',
    // Fonction pour construire les paramètres de l'URL
    buildParams: (documentData) => ({
      situation_id: documentData.id,
      chantier_id: documentData.chantier?.id || documentData.chantier_id,
      chantier_name: documentData.chantier?.chantier_name || documentData.chantier?.nom || documentData.chantier_name || 'Chantier',
      societe_name: documentData.chantier?.societe?.nom_societe || documentData.chantier?.societe?.nom || documentData.societe_name || 'Société',
      numero_situation: documentData.numero_situation,
      force_replace: true,
    }),
  },

  [DOCUMENT_TYPES.CONTRAT_SOUS_TRAITANCE]: {
    label: 'Contrat de sous-traitance',
    endpoint: '/api/generate-contrat-sous-traitance-pdf-drive/',
    icon: '📄',
    confirmMessage: 'Êtes-vous sûr de vouloir régénérer ce contrat dans le Drive ?',
    successMessage: 'Contrat régénéré avec succès dans le Drive',
    errorMessage: 'Erreur lors de la régénération du contrat',
    buildParams: (documentData) => ({
      contrat_id: documentData.id,
      chantier_id: documentData.chantier?.id || documentData.chantier_id,
      chantier_name: documentData.chantier?.chantier_name || documentData.chantier?.nom || documentData.chantier_name || 'Chantier',
      societe_name: documentData.chantier?.societe?.nom_societe || documentData.chantier?.societe?.nom || documentData.societe_name || 'Société',
      sous_traitant_name: documentData.sous_traitant?.entreprise || documentData.sous_traitant_name || 'SousTraitant',
      force_replace: true,
    }),
  },

  [DOCUMENT_TYPES.AVENANT_SOUS_TRAITANCE]: {
    label: 'Avenant de sous-traitance',
    endpoint: '/api/generate-avenant-sous-traitance-pdf-drive/',
    icon: '📑',
    confirmMessage: 'Êtes-vous sûr de vouloir régénérer cet avenant dans le Drive ?',
    successMessage: 'Avenant régénéré avec succès dans le Drive',
    errorMessage: 'Erreur lors de la régénération de l\'avenant',
    buildParams: (documentData) => ({
      avenant_id: documentData.id,
      contrat_id: documentData.contrat?.id || documentData.contrat_id,
      chantier_id: documentData.chantier?.id || documentData.chantier_id || documentData.contrat?.chantier?.id,
      chantier_name: documentData.chantier?.chantier_name || documentData.chantier?.nom || documentData.chantier_name || documentData.contrat?.chantier?.chantier_name || documentData.contrat?.chantier?.nom || 'Chantier',
      societe_name: documentData.chantier?.societe?.nom_societe || documentData.chantier?.societe?.nom || documentData.societe_name || documentData.contrat?.chantier?.societe?.nom_societe || documentData.contrat?.chantier?.societe?.nom || 'Société',
      sous_traitant_name: documentData.contrat?.sous_traitant?.entreprise || documentData.sous_traitant_name || 'SousTraitant',
      numero_avenant: documentData.numero || '1',
      force_replace: true,
    }),
  },

  [DOCUMENT_TYPES.DEVIS_TRAVAUX]: {
    label: 'Devis travaux',
    endpoint: '/api/generate-devis-travaux-pdf-drive/',
    icon: '💼',
    confirmMessage: 'Êtes-vous sûr de vouloir régénérer ce devis dans le Drive ?',
    successMessage: 'Devis régénéré avec succès dans le Drive',
    errorMessage: 'Erreur lors de la régénération du devis',
    buildParams: (documentData) => ({
      devis_id: documentData.id,
      chantier_id: documentData.chantier?.id || documentData.chantier_id,
      chantier_name: documentData.chantier?.chantier_name || documentData.chantier?.nom || documentData.chantier_name || 'Chantier',
      societe_name: documentData.chantier?.societe?.nom_societe || documentData.chantier?.societe?.nom || documentData.societe_name || 'Société',
      devis_name: documentData.devis_name || documentData.nom_devis,
      force_replace: true,
    }),
  },

  [DOCUMENT_TYPES.DEVIS_MARCHE]: {
    label: 'Devis marché',
    endpoint: '/api/generate-devis-marche-pdf-drive/',
    icon: '🏢',
    confirmMessage: 'Êtes-vous sûr de vouloir régénérer ce devis marché dans le Drive ?',
    successMessage: 'Devis marché régénéré avec succès dans le Drive',
    errorMessage: 'Erreur lors de la régénération du devis marché',
    buildParams: (documentData) => ({
      devis_id: documentData.id,
      appel_offres_id: documentData.appel_offres?.id || documentData.appel_offres_id,
      appel_offres_name: documentData.appel_offres?.chantier_name || documentData.appel_offres_name,
      societe_name: documentData.appel_offres?.societe?.nom_societe || documentData.societe_name || 'Société',
      devis_name: documentData.devis_name || documentData.nom_devis,
      force_replace: true,
    }),
  },

  [DOCUMENT_TYPES.BON_COMMANDE]: {
    label: 'Bon de commande',
    endpoint: '/api/generate-bon-commande-pdf-drive/',
    icon: '🛒',
    confirmMessage: 'Êtes-vous sûr de vouloir régénérer ce bon de commande dans le Drive ?',
    successMessage: 'Bon de commande régénéré avec succès dans le Drive',
    errorMessage: 'Erreur lors de la régénération du bon de commande',
    buildParams: (documentData) => ({
      bon_commande_id: documentData.id,
      chantier_id: documentData.chantier?.id || documentData.chantier_id,
      chantier_name: documentData.chantier?.chantier_name || documentData.chantier?.nom || documentData.chantier_name || 'Chantier',
      societe_name: documentData.chantier?.societe?.nom_societe || documentData.chantier?.societe?.nom || documentData.societe_name || 'Société',
      numero_bon_commande: documentData.numero_bon_commande || documentData.numero,
      fournisseur_name: documentData.fournisseur?.nom || documentData.fournisseur_name || 'Fournisseur',
      force_replace: true,
    }),
  },

  [DOCUMENT_TYPES.FACTURE]: {
    label: 'Facture',
    endpoint: '/api/generate-facture-pdf-drive/',
    icon: '🧾',
    confirmMessage: 'Êtes-vous sûr de vouloir régénérer cette facture dans le Drive ?',
    successMessage: 'Facture régénérée avec succès dans le Drive',
    errorMessage: 'Erreur lors de la régénération de la facture',
    buildParams: (documentData) => ({
      facture_id: documentData.id,
      chantier_id: documentData.chantier?.id || documentData.chantier_id,
      chantier_name: documentData.chantier?.chantier_name || documentData.chantier?.nom || documentData.chantier_name || 'Chantier',
      societe_name: documentData.chantier?.societe?.nom_societe || documentData.chantier?.societe?.nom || documentData.societe_name || 'Société',
      numero: documentData.numero || documentData.numero_facture,
      force_replace: true,
    }),
  },

  [DOCUMENT_TYPES.PLANNING_HEBDO]: {
    label: 'Planning hebdomadaire',
    endpoint: '/api/planning-hebdo-pdf-drive/',
    icon: '📅',
    confirmMessage: 'Êtes-vous sûr de vouloir régénérer ce planning dans le Drive ?',
    successMessage: 'Planning régénéré avec succès dans le Drive',
    errorMessage: 'Erreur lors de la régénération du planning',
    buildParams: (documentData) => ({
      week: documentData.week || documentData.semaine,
      year: documentData.year || documentData.annee,
      agent_ids: documentData.agent_ids,
      force_replace: true,
    }),
  },

  [DOCUMENT_TYPES.RAPPORT_AGENTS]: {
    label: 'Rapport mensuel agents',
    endpoint: '/api/generate-monthly-agents-pdf-drive/',
    icon: '📊',
    confirmMessage: 'Êtes-vous sûr de vouloir régénérer ce rapport dans le Drive ?',
    successMessage: 'Rapport régénéré avec succès dans le Drive',
    errorMessage: 'Erreur lors de la régénération du rapport',
    buildParams: (documentData) => ({
      month: documentData.month || documentData.mois,
      year: documentData.year || documentData.annee,
      force_replace: true,
    }),
  },

  [DOCUMENT_TYPES.RAPPORT_INTERVENTION]: {
    label: "Rapport d'intervention",
    endpoint: '/api/generate-rapport-intervention-pdf-drive/',
    icon: '📋',
    confirmMessage: "Êtes-vous sûr de vouloir régénérer ce rapport d'intervention dans le Drive ?",
    successMessage: "Rapport d'intervention régénéré avec succès dans le Drive",
    errorMessage: "Erreur lors de la régénération du rapport d'intervention",
    buildParams: (documentData) => ({
      rapport_id: documentData.id,
      force_replace: true,
    }),
  },
};

/**
 * Obtenir la configuration d'un type de document
 * @param {string} documentType - Type de document (clé de DOCUMENT_TYPES)
 * @returns {object} Configuration du document
 */
export const getDocumentConfig = (documentType) => {
  const config = DOCUMENT_CONFIG[documentType];
  
  if (!config) {
    console.warn(`Configuration non trouvée pour le type de document: ${documentType}`);
    return {
      label: 'Document',
      endpoint: '',
      icon: '📄',
      confirmMessage: 'Êtes-vous sûr de vouloir régénérer ce document dans le Drive ?',
      successMessage: 'Document régénéré avec succès',
      errorMessage: 'Erreur lors de la régénération',
      buildParams: (documentData) => ({ force_replace: true }),
    };
  }
  
  return config;
};

/**
 * Construire l'URL complète avec les paramètres pour un document
 * @param {string} documentType - Type de document
 * @param {object} documentData - Données du document
 * @returns {string} URL complète avec les paramètres
 */
export const buildDocumentUrl = (documentType, documentData) => {
  const config = getDocumentConfig(documentType);
  const params = config.buildParams(documentData);
  
  // Construire la query string
  const queryString = new URLSearchParams(params).toString();
  
  return `${config.endpoint}?${queryString}`;
};

