/**
 * Générateur universel de PDFs pour le Drive AWS S3
 * Système extensible pour tous les types de documents
 */

import axios from "axios";
import { normalizeFilename } from '../components/DriveV2/services/pathNormalizationService';

// Configuration de base
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:8000/api"
    : "/api"; // URL relative pour la production

/**
 * Configuration des types de documents supportés
 * Facilement extensible pour ajouter de nouveaux types
 */
const DOCUMENT_TYPES = {
  devis_chantier: {
    apiEndpoint: "/generate-devis-marche-pdf-drive/",
    previewUrl: (data) => `/api/preview-saved-devis/${data.devisId}/`,
    requiredFields: [
      "devisId",
      "appelOffresId",
      "appelOffresName",
      "societeName",
    ],
    displayName: "Devis de Chantier",
    // Fonction pour construire le nom d'affichage
    getDisplayName: (data) => `Devis ${data.numero || data.devisId}`,
    // Fonction pour construire le message de chargement
    getLoadingMessage: (data) =>
      `Génération du devis ${data.appelOffresName} vers le Drive...`,
  },

  contrat_sous_traitance: {
    apiEndpoint: "/generate-contrat-sous-traitance-pdf-drive/",
    previewUrl: (data) => `/api/preview-contrat/${data.contratId}/`,
    requiredFields: [
      "contratId",
      "chantierId",
      "chantierName",
      "societeName",
      "sousTraitantName",
    ],
    displayName: "Contrat Sous-traitance",
    getDisplayName: (data) => `Contrat ${data.sousTraitantName}`,
    getLoadingMessage: (data) =>
      `Génération du contrat ${data.sousTraitantName} vers le Drive...`,
  },

  avenant_sous_traitance: {
    apiEndpoint: "/generate-avenant-sous-traitance-pdf-drive/",
    previewUrl: (data) => `/api/preview-avenant/${data.avenantId}/`,
    requiredFields: [
      "avenantId",
      "contratId",
      "chantierId",
      "chantierName",
      "societeName",
      "sousTraitantName",
      "numeroAvenant",
    ],
    displayName: "Avenant Sous-traitance",
    getDisplayName: (data) =>
      `Avenant ${data.numeroAvenant} - ${data.sousTraitantName}`,
    getLoadingMessage: (data) =>
      `Génération de l'avenant ${data.numeroAvenant} vers le Drive...`,
  },
  devis_normal: {
    apiEndpoint: "/generate-devis-travaux-pdf-drive/",
    previewUrl: (data) => `/api/preview-saved-devis/${data.devisId}/`,
    requiredFields: ["devisId", "chantierId", "chantierName", "societeName"],
    displayName: "Devis Normal",
    // Fonction pour construire le nom d'affichage
    getDisplayName: (data) => `Devis ${data.numero || data.devisId}`,
    // Fonction pour construire le message de chargement
    getLoadingMessage: (data) =>
      `Génération du devis ${data.chantierName} vers le Drive...`,
  },

  situation: {
    apiEndpoint: "/generate-situation-pdf-drive/",
    previewUrl: (data) => `/api/preview-situation/${data.situationId}/`,
    requiredFields: [
      "situationId",
      "chantierId",
      "chantierName",
      "societeName",
      "numeroSituation",
    ],
    displayName: "Situation",
    getDisplayName: (data) => `Situation ${data.numeroSituation}`,
    getLoadingMessage: (data) =>
      `Génération de la situation ${data.numeroSituation} vers le Drive...`,
  },

  bon_commande: {
    apiEndpoint: "/generate-bon-commande-pdf-drive/",
    previewUrl: (data) =>
      `/api/preview-saved-bon-commande/${data.bonCommandeId}/`,
    requiredFields: [
      "bonCommandeId",
      "chantierId",
      "chantierName",
      "societeName",
      "numeroBonCommande",
      "fournisseurName",
    ],
    displayName: "Bon de Commande",
    getDisplayName: (data) => `Bon de Commande ${data.numeroBonCommande}`,
    getLoadingMessage: (data) =>
      `Génération du bon de commande ${data.numeroBonCommande} vers le Drive...`,
  },
  planning_hebdo: {
    apiEndpoint: "/planning-hebdo-pdf-drive/",
    previewUrl: (data) =>
      `/api/preview-planning-hebdo/?week=${data.week}&year=${data.year}`,
    requiredFields: ["week", "year"],
    displayName: "Planning Hebdomadaire",
    // Fonction pour construire le nom d'affichage
    getDisplayName: (data) => `Planning Semaine ${data.week}/${data.year}`,
    // Fonction pour construire le message de chargement
    getLoadingMessage: (data) =>
      `Génération du planning hebdomadaire semaine ${data.week}/${data.year} vers le Drive...`,
  },
  rapport_agents: {
    apiEndpoint: "/generate-monthly-agents-pdf-drive/",
    previewUrl: (data) =>
      `/api/preview-monthly-agents-report/?month=${data.month}&year=${data.year}`,
    requiredFields: ["month", "year"],
    displayName: "Rapport Mensuel Agents",
    // Fonction pour construire le nom d'affichage
    getDisplayName: (data) => `Rapport Agents ${data.month}/${data.year}`,
    // Fonction pour construire le message de chargement
    getLoadingMessage: (data) =>
      `Génération du rapport mensuel agents ${data.month}/${data.year} vers le Drive...`,
  },
  facture: {
    apiEndpoint: "/generate-facture-pdf-drive/",
    previewUrl: (data) => `/api/preview-facture/${data.factureId}/`,
    requiredFields: [
      "factureId",
      "chantierId",
      "chantierName",
      "societeName",
      "numero",
    ],
    displayName: "Facture",
    getDisplayName: (data) => `Facture ${data.numero}`,
    getLoadingMessage: (data) =>
      `Génération de la facture ${data.numero} vers le Drive...`,
  },

  certificat_paiement: {
    apiEndpoint: "/generate-certificat-paiement-pdf-drive/",
    previewUrl: (data) => `/api/preview-certificat-paiement/${data.contratId}/`,
    requiredFields: [
      "contratId",
      "chantierId",
    ],
    displayName: "Certificat de Paiement",
    getDisplayName: (data) => `Certificat de paiement n°${data.numeroCertificat || ''}`,
    getLoadingMessage: (data) =>
      `Génération du certificat de paiement ${data.sousTraitantName || ''} vers le Drive...`,
  },
};

/**
 * Fonction principale pour générer un PDF et l'envoyer dans le Drive
 * @param {string} documentType - Type de document ('devis_chantier', 'facture', etc.)
 * @param {Object} data - Données du document
 * @param {Object} callbacks - Callbacks optionnels { onSuccess, onError }
 * @param {boolean} forceReplace - Force le remplacement d'un fichier existant
 * @returns {Promise<Object>} Résultat de la génération
 */
export const generatePDFDrive = async (
  documentType,
  data,
  callbacks = {},
  forceReplace = false
) => {
  try {

    // 1. Validation du type de document
    const documentConfig = DOCUMENT_TYPES[documentType];
    if (!documentConfig) {
      throw new Error(`Type de document non supporté: ${documentType}`);
    }

    // 2. Validation des données requises
    const missingFields = documentConfig.requiredFields.filter(
      (field) => !data[field]
    );
    if (missingFields.length > 0) {
      throw new Error(
        `Champs manquants pour ${documentType}: ${missingFields.join(", ")}`
      );
    }

    // 3. Affichage de la notification de chargement
    const loadingMessage = documentConfig.getLoadingMessage
      ? documentConfig.getLoadingMessage(data)
      : `Génération du ${documentConfig.displayName} vers le Drive...`;

    showLoadingNotification(loadingMessage);

    // 4. Appel à l'API Django
    const apiParams = buildApiParams(documentType, data);

    // Ajouter le paramètre force_replace si nécessaire
    if (forceReplace) {
      apiParams.force_replace = true;
    }

    const response = await axios.get(
      `${API_BASE_URL}${documentConfig.apiEndpoint}`,
      {
        params: apiParams,
        withCredentials: true,
      }
    );

    // 5. Traitement de la réponse
    if (response.data.success) {

      // Vérifier s'il y a un conflit détecté
      if (response.data.conflict_detected) {
        return handleConflict(documentType, data, response.data, callbacks);
      }

      // Succès - afficher notification et appeler callback
      showSuccessNotification(response.data.message, response.data.drive_url);

      if (callbacks.onSuccess) {
        callbacks.onSuccess(response.data);
      }

      return response.data;
    } else {
      throw new Error(response.data.error || "Erreur inconnue");
    }
  } catch (error) {
    console.error(`❌ Erreur lors de la génération du ${documentType}:`, error);

    // Vérifier si c'est un conflit de fichier
    if (isConflictError(error)) {
      return handleConflictFromError(documentType, data, error, callbacks);
    }

    // Autres erreurs
    showErrorNotification(`Erreur: ${error.message}`);

    if (callbacks.onError) {
      callbacks.onError(error);
    }

    throw error;
  }
};

/**
 * Construit les paramètres API selon le type de document
 */
const buildApiParams = (documentType, data) => {
  // Fonction helper pour ajouter custom_filename et custom_path si fournis
  const addCustomParams = (params) => {
    if (data.custom_filename) {
      params.custom_filename = data.custom_filename;
    }
    if (data.customPath) {
      params.custom_path = data.customPath;
    }
    return params;
  };

  switch (documentType) {
    case "devis_chantier":
    case "devis_travaux":
    case "devis_marche":
      const paramsChantier = {
        devis_id: data.devisId,
        appel_offres_id: data.appelOffresId,
        appel_offres_name: data.appelOffresName,
        societe_name: data.societeName,
      };
      // Ajouter le chemin personnalisé et le nom de fichier personnalisé si fournis
      return addCustomParams(paramsChantier);

    case "devis_normal":
      const paramsNormal = {
        devis_id: data.devisId,
        chantier_id: data.chantierId,
        chantier_name: data.chantierName,
        societe_name: data.societeName,
      };
      // Ajouter le chemin personnalisé et le nom de fichier personnalisé si fournis
      return addCustomParams(paramsNormal);

    case "contrat_sous_traitance":
      return addCustomParams({
        contrat_id: data.contratId,
        chantier_id: data.chantierId,
        chantier_name: data.chantierName,
        societe_name: data.societeName,
        sous_traitant_name: data.sousTraitantName,
      });

    case "avenant_sous_traitance":
      return addCustomParams({
        avenant_id: data.avenantId,
        contrat_id: data.contratId,
        chantier_id: data.chantierId,
        chantier_name: data.chantierName,
        societe_name: data.societeName,
        sous_traitant_name: data.sousTraitantName,
        numero_avenant: data.numeroAvenant,
      });

    case "situation":
      return addCustomParams({
        situation_id: data.situationId,
        chantier_id: data.chantierId,
        chantier_name: data.chantierName,
        societe_name: data.societeName,
        numero_situation: data.numeroSituation,
      });

    case "bon_commande":
      return addCustomParams({
        bon_commande_id: data.bonCommandeId,
        chantier_id: data.chantierId,
        chantier_name: data.chantierName,
        societe_name: data.societeName,
        numero_bon_commande: data.numeroBonCommande,
        fournisseur_name: data.fournisseurName,
      });

    case "planning_hebdo":
      const params = {
        week: data.week,
        year: data.year,
      };
      // NOUVEAU : Ajouter les agent_ids si fournis (en tant que chaîne)
      if (data.agent_ids && data.agent_ids.length > 0) {
        params.agent_ids = data.agent_ids.join(',');
      }
      return addCustomParams(params);

    case "rapport_agents":
      return addCustomParams({
        month: data.month,
        year: data.year,
      });

    case "certificat_paiement":
      return addCustomParams({
        contrat_id: data.contratId,
        chantier_id: data.chantierId,
        chantier_name: data.chantierName,
        societe_name: data.societeName,
        sous_traitant_name: data.sousTraitantName,
        numero_certificat: data.numeroCertificat,
        facture_id: data.factureId,
        mois: data.mois,
        annee: data.annee,
      });

    default:
      return addCustomParams(data || {});
  }
};

/**
 * Gère les conflits de fichiers
 */
const handleConflict = (documentType, data, responseData, callbacks) => {
  const documentConfig = DOCUMENT_TYPES[documentType];

  // Construire les données du conflit
  const conflictMessage = responseData.conflict_message || 
    `Un fichier avec le même nom existe déjà dans le Drive et a été modifié. Souhaitez-vous le remplacer ?`;
  
  const conflictData = {
    conflictId: `${documentType}_${
      data.devisId || data.appelOffresId || data.bonCommandeId || data.situationId || Date.now()
    }_${Date.now()}`,
    fileName: responseData.file_name,
    displayFileName: responseData.file_name,
    existingFilePath: responseData.file_path.substring(
      0,
      responseData.file_path.lastIndexOf("/") + 1
    ),
    conflictMessage: conflictMessage,
    documentType: documentType,
    societeName: data.societeName || responseData.societe_name,
    previewUrl: documentConfig?.previewUrl ? documentConfig.previewUrl(data) : null,
    drive_url: responseData.drive_url,
    file_path: responseData.file_path,
    // Données spécifiques au type de document
    ...getDocumentSpecificData(documentType, data),
    // Inclure les données supplémentaires du backend si disponibles
    ...(responseData.bon_commande_id && { bonCommandeId: responseData.bon_commande_id }),
    ...(responseData.numero_bon_commande && { numeroBonCommande: responseData.numero_bon_commande }),
    ...(responseData.fournisseur_name && { fournisseurName: responseData.fournisseur_name }),
    ...(responseData.chantier_id && { chantierId: responseData.chantier_id }),
    ...(responseData.chantier_name && { chantierName: responseData.chantier_name }),
    ...(responseData.situation_id && { situationId: responseData.situation_id }),
    ...(responseData.numero_situation && { numeroSituation: responseData.numero_situation }),
    ...(responseData.devis_id && { devisId: responseData.devis_id }),
    ...(responseData.numero && { numero: responseData.numero }),
    ...(responseData.appel_offres_id && { appelOffresId: responseData.appel_offres_id }),
    ...(responseData.appel_offres_name && { appelOffresName: responseData.appel_offres_name }),
    ...(responseData.contrat_id && { contratId: responseData.contrat_id }),
    ...(responseData.sous_traitant_name && { sousTraitantName: responseData.sous_traitant_name }),
    ...(responseData.numero_certificat && { numeroCertificat: responseData.numero_certificat }),
    ...(responseData.mois && { mois: responseData.mois }),
    ...(responseData.annee && { annee: responseData.annee }),
  };

  // Émettre l'événement pour ouvrir le modal de conflit
  const conflictEvent = new CustomEvent("openConflictDialog", {
    detail: conflictData,
  });

  window.dispatchEvent(conflictEvent);
  hideLoadingNotification();

  return { conflict_detected: true, error: "Conflit de fichier détecté" };
};

/**
 * Gère les conflits détectés via les erreurs HTTP
 */
const handleConflictFromError = (documentType, data, error, callbacks) => {
  const documentConfig = DOCUMENT_TYPES[documentType];
  const errorResponse = error.response?.data || {};

  // Fusionner les données du backend avec les données initiales (backend en priorité)
  const mergedData = {
    ...data,
    ...(errorResponse.month !== undefined && { month: errorResponse.month }),
    ...(errorResponse.year !== undefined && { year: errorResponse.year }),
    ...(errorResponse.week !== undefined && { week: errorResponse.week }),
    ...(errorResponse.mois !== undefined && { mois: errorResponse.mois }),
    ...(errorResponse.annee !== undefined && { annee: errorResponse.annee }),
    ...(errorResponse.societe_name && { societeName: errorResponse.societe_name }),
    ...(errorResponse.sous_traitant_name && { sousTraitantName: errorResponse.sous_traitant_name }),
    ...(errorResponse.numero_certificat && { numeroCertificat: errorResponse.numero_certificat }),
    ...(errorResponse.contrat_id && { contratId: errorResponse.contrat_id }),
  };

  // Utiliser les données du backend si disponibles, sinon construire
  const fileName = errorResponse.file_name || buildFileName(documentType, mergedData);
  const filePath = errorResponse.file_path || buildFilePath(documentType, mergedData, fileName);
  const conflictMessage = errorResponse.conflict_message || 
    `Un fichier avec le même nom existe déjà dans le Drive et a été modifié. Souhaitez-vous le remplacer ?`;

  // Construire le conflictId en utilisant les données fusionnées
  const conflictId = `${documentType}_${
    mergedData.devisId || mergedData.appelOffresId || mergedData.bonCommandeId || mergedData.situationId || 
    (mergedData.month && mergedData.year ? `${mergedData.month}_${mergedData.year}` : null) ||
    (mergedData.week && mergedData.year ? `${mergedData.week}_${mergedData.year}` : null) || 
    Date.now()
  }_${Date.now()}`;

  const conflictData = {
    conflictId: conflictId,
    fileName: fileName,
    displayFileName: fileName,
    existingFilePath: filePath.substring(0, filePath.lastIndexOf("/") + 1),
    conflictMessage: conflictMessage,
    documentType: documentType,
    societeName: mergedData.societeName || errorResponse.societe_name,
    previewUrl: documentConfig?.previewUrl ? documentConfig.previewUrl(mergedData) : null,
    file_path: filePath,
    drive_url: errorResponse.drive_url || `/drive-v2?path=${filePath}&focus=file&_t=${Date.now()}`,
    // Données spécifiques au type de document (utiliser les données fusionnées)
    ...getDocumentSpecificData(documentType, mergedData),
    // Inclure les données supplémentaires du backend si disponibles
    ...(errorResponse.bon_commande_id && { bonCommandeId: errorResponse.bon_commande_id }),
    ...(errorResponse.numero_bon_commande && { numeroBonCommande: errorResponse.numero_bon_commande }),
    ...(errorResponse.fournisseur_name && { fournisseurName: errorResponse.fournisseur_name }),
    ...(errorResponse.chantier_id && { chantierId: errorResponse.chantier_id }),
    ...(errorResponse.chantier_name && { chantierName: errorResponse.chantier_name }),
    ...(errorResponse.situation_id && { situationId: errorResponse.situation_id }),
    ...(errorResponse.numero_situation && { numeroSituation: errorResponse.numero_situation }),
  };

  // Émettre l'événement pour ouvrir le modal de conflit
  const conflictEvent = new CustomEvent("openConflictDialog", {
    detail: conflictData,
  });

  window.dispatchEvent(conflictEvent);
  hideLoadingNotification();

  return { conflict_detected: true, error: "Conflit de fichier détecté" };
};

/**
 * Construit le nom de fichier selon le type de document
 * Normalise les noms pour encoder "/" en "∕" afin d'éviter la création de sous-dossiers
 */
const buildFileName = (documentType, data) => {
  let fileName = '';
  
  switch (documentType) {
    case "devis_chantier":
      // Utiliser le numéro du devis depuis la DB (ex: "DEV-008-25 - Test Appel Offres")
      fileName = `${data.numero || data.devisId}.pdf`;
      break;

    case "devis_normal":
      // Utiliser le numéro du devis depuis la DB (ex: "DEV-008-25 - Test Chantier")
      fileName = `${data.numero || data.devisId}.pdf`;
      break;

    case "contrat_sous_traitance":
      // Nom du fichier : "Contrat [SousTraitant] - [Chantier].pdf"
      const contratName = `Contrat ${data.sousTraitantName} - ${data.chantierName}`;
      fileName = `${contratName}.pdf`;
      break;

    case "avenant_sous_traitance":
      // Nom du fichier : "Avenant [Numero] [SousTraitant] - [Chantier].pdf"
      const avenantName = `Avenant ${data.numeroAvenant} ${data.sousTraitantName} - ${data.chantierName}`;
      fileName = `${avenantName}.pdf`;
      break;

    case "situation":
      // Nom du fichier : "{numero_situation}.pdf"
      fileName = `${data.numeroSituation}.pdf`;
      break;

    case "bon_commande":
      // Nom du fichier : "{numero_bon_commande}.pdf"
      fileName = `${data.numeroBonCommande}.pdf`;
      break;

    case "planning_hebdo":
      fileName = `PH S${data.week} ${String(data.year).slice(-2)}.pdf`;
      break;

    case "rapport_agents":
      const monthNames = [
        "Janvier",
        "Février",
        "Mars",
        "Avril",
        "Mai",
        "Juin",
        "Juillet",
        "Août",
        "Septembre",
        "Octobre",
        "Novembre",
        "Décembre",
      ];
      const monthName = monthNames[data.month - 1] || `Mois_${data.month}`;
      fileName = `RapportComptable_${monthName}_${String(data.year).slice(-2)}.pdf`;
      break;

    case "certificat_paiement": {
      const numCert = String(data.numeroCertificat || '1').padStart(2, '0');
      const moisCert = String(data.mois || '01').padStart(2, '0');
      const anneeCert = String(data.annee || '2026').slice(-2);
      const stName = normalizeFilename(data.sousTraitantName || 'SousTraitant');
      const chName = normalizeFilename(data.chantierName || 'Chantier');
      return `Certificat de paiement n°${numCert} - ${stName} - ${chName} ${moisCert}-${anneeCert}.pdf`;
    }

    default:
      fileName = `${documentType}_${data.id || Date.now()}.pdf`;
  }
  
  // Normaliser le nom de fichier pour encoder "/" en "∕" (séparer le nom et l'extension)
  const parts = fileName.split('.');
  const extension = parts.length > 1 ? parts.pop() : '';
  const nameWithoutExt = parts.join('.');
  const normalizedName = normalizeFilename(nameWithoutExt);
  
  return extension ? `${normalizedName}.${extension}` : normalizedName;
};

/**
 * Construit le chemin de fichier selon le type de document
 */
const buildFilePath = (documentType, data, fileName) => {
  switch (documentType) {
    case "devis_chantier":
      const societeSlug = normalizeFilename(data.societeName);
      const appelOffresSlug = normalizeFilename(data.appelOffresName);
      return `Appels_Offres/${societeSlug}/${appelOffresSlug}/Devis/Devis_Marche/${fileName}`;

    case "devis_normal":
      const societeNormalSlug = normalizeFilename(data.societeName);
      const chantierSlug = normalizeFilename(data.chantierName);
      return `Chantiers/${societeNormalSlug}/${chantierSlug}/Devis/${fileName}`;

    case "contrat_sous_traitance":
      const societeContratSlug = normalizeFilename(data.societeName);
      const chantierContratSlug = normalizeFilename(data.chantierName);
      const entrepriseContratSlug = normalizeFilename(data.sousTraitantName);
      return `Chantiers/${societeContratSlug}/${chantierContratSlug}/Sous_Traitant/${entrepriseContratSlug}/${fileName}`;

    case "avenant_sous_traitance":
      const societeAvenantSlug = normalizeFilename(data.societeName);
      const chantierAvenantSlug = normalizeFilename(data.chantierName);
      const entrepriseAvenantSlug = normalizeFilename(data.sousTraitantName);
      return `Chantiers/${societeAvenantSlug}/${chantierAvenantSlug}/Sous_Traitant/${entrepriseAvenantSlug}/${fileName}`;

    case "situation":
      const societeSituationSlug = normalizeFilename(data.societeName);
      const chantierSituationSlug = normalizeFilename(data.chantierName);
      return `Chantiers/${societeSituationSlug}/${chantierSituationSlug}/Situation/${fileName}`;

    case "bon_commande":
      const societeBonCommandeSlug = normalizeFilename(data.societeName);
      const chantierBonCommandeSlug = normalizeFilename(data.chantierName);
      const fournisseurSlug = normalizeFilename(data.fournisseurName);
      return `Chantiers/${societeBonCommandeSlug}/${chantierBonCommandeSlug}/Bon_Commande/${fournisseurSlug}/${fileName}`;

    case "facture":
      const societeFactureSlug = normalizeFilename(data.societeName);
      const chantierFactureSlug = normalizeFilename(data.chantierName);
      return `Chantiers/${societeFactureSlug}/${chantierFactureSlug}/Facture/${fileName}`;

    case "planning_hebdo":
      return `Agents/Document_Generaux/PlanningHebdo/${data.year}/${fileName}`;

    case "rapport_agents":
      return `Agents/Document_Generaux/Rapport_mensuel/${data.year}/${fileName}`;

    case "certificat_paiement":
      const societeCertSlug = normalizeFilename(data.societeName);
      const chantierCertSlug = normalizeFilename(data.chantierName);
      const entrepriseCertSlug = normalizeFilename(data.sousTraitantName);
      return `Chantiers/${societeCertSlug}/${chantierCertSlug}/SOUS_TRAITANT/${entrepriseCertSlug}/Certificat_de_paiement/${fileName}`;

    default:
      return `Documents/${documentType}/${fileName}`;
  }
};

/**
 * Retourne les données spécifiques au type de document pour le modal de conflit
 */
const getDocumentSpecificData = (documentType, data) => {
  switch (documentType) {
    case "devis_chantier":
      return {
        appelOffresId: data.appelOffresId,
        appelOffresName: data.appelOffresName,
        devisId: data.devisId,
        numero: data.numero,
      };

    case "devis_normal":
      return {
        chantierId: data.chantierId,
        chantierName: data.chantierName,
        devisId: data.devisId,
        numero: data.numero,
      };

    case "contrat_sous_traitance":
      return {
        contratId: data.contratId,
        chantierId: data.chantierId,
        chantierName: data.chantierName,
        societeName: data.societeName,
        sousTraitantName: data.sousTraitantName,
      };

    case "avenant_sous_traitance":
      return {
        avenantId: data.avenantId,
        contratId: data.contratId,
        chantierId: data.chantierId,
        chantierName: data.chantierName,
        societeName: data.societeName,
        sousTraitantName: data.sousTraitantName,
        numeroAvenant: data.numeroAvenant,
      };

    case "situation":
      return {
        situationId: data.situationId,
        chantierId: data.chantierId,
        chantierName: data.chantierName,
        societeName: data.societeName,
        numeroSituation: data.numeroSituation,
      };

    case "bon_commande":
      return {
        bonCommandeId: data.bonCommandeId,
        chantierId: data.chantierId,
        chantierName: data.chantierName,
        societeName: data.societeName,
        numeroBonCommande: data.numeroBonCommande,
        fournisseurName: data.fournisseurName,
      };

    case "facture":
      return {
        factureId: data.factureId,
        chantierId: data.chantierId,
        chantierName: data.chantierName,
        societeName: data.societeName,
        numero: data.numero,
      };

    case "planning_hebdo":
      return {
        week: data.week,
        year: data.year,
        agent_ids: data.agent_ids, // NOUVEAU : Conserver les agent_ids
      };

    case "rapport_agents":
      return {
        month: data.month,
        year: data.year,
      };

    case "certificat_paiement":
      return {
        contratId: data.contratId,
        chantierId: data.chantierId,
        chantierName: data.chantierName,
        societeName: data.societeName,
        sousTraitantName: data.sousTraitantName,
        numeroCertificat: data.numeroCertificat,
        factureId: data.factureId,
        mois: data.mois,
        annee: data.annee,
      };

    default:
      return {};
  }
};

/**
 * Vérifie si une erreur est liée à un conflit de fichier
 */
const isConflictError = (error) => {
  return (
    error.response &&
    (
      error.response.status === 409 || // Code Conflict
      (error.response.status === 500 &&
       error.response.data &&
       error.response.data.error &&
       error.response.data.error.includes("Conflit de fichier détecté"))
    ) &&
    error.response.data &&
    error.response.data.conflict_detected === true
  );
};

/**
 * Fonction utilitaire pour slugifier les noms (copiée de pdf_drive_functions.js)
 */
const customSlugify = (text) => {
  if (!text) return "";
  text = text.replace(/\s+/g, " ").trim(); // Normalize multiple spaces to single space
  text = text.replace(/\s+/g, "-"); // Replace spaces with hyphens
  text = text.replace(/[^a-zA-Z0-9\-_.]/g, ""); // Remove special characters
  text = text.replace(/-+/g, "-"); // Replace multiple hyphens with single
  text = text.trim("-");
  if (text) {
    const parts = text.split("-");
    const capitalizedParts = [];
    for (const part of parts) {
      if (part) {
        capitalizedParts.push(
          part[0].toUpperCase() + part.slice(1).toLowerCase()
        );
      }
    }
    text = capitalizedParts.join("-");
  }
  return text || "Dossier";
};

// ============================================================================
// FONCTIONS DE NOTIFICATION (copiées et adaptées de pdf_drive_functions.js)
// ============================================================================

/**
 * Affiche un indicateur de chargement
 */
const showLoadingNotification = (message) => {
  // Supprimer toute notification de chargement existante
  const existingLoading = document.getElementById("loading-notification");
  if (existingLoading) {
    existingLoading.remove();
  }

  // Créer une notification de chargement
  const notification = document.createElement("div");
  notification.id = "loading-notification";
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #2196F3, #1976D2);
    color: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 400px;
    animation: slideIn 0.5s ease-out;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <div style="
        width: 24px;
        height: 24px;
        border: 3px solid rgba(255,255,255,0.3);
        border-top: 3px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-right: 12px;
      "></div>
      <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Génération en cours...</h3>
    </div>
    <p style="margin: 0; line-height: 1.5; opacity: 0.9;">${message}</p>
  `;

  // Ajouter les styles CSS pour l'animation de rotation
  if (!document.getElementById("loading-styles")) {
    const style = document.createElement("style");
    style.id = "loading-styles";
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // Ajouter la notification au DOM
  document.body.appendChild(notification);

  return notification;
};

/**
 * Masque l'indicateur de chargement
 */
const hideLoadingNotification = () => {
  const loadingNotification = document.getElementById("loading-notification");
  if (loadingNotification) {
    loadingNotification.style.animation = "slideOut 0.5s ease-in";
    setTimeout(() => {
      if (loadingNotification.parentNode) {
        loadingNotification.parentNode.removeChild(loadingNotification);
      }
    }, 500);
  }
};

/**
 * Affiche une notification de succès avec bouton de redirection
 */
const showSuccessNotification = (message, driveUrl) => {
  // Masquer d'abord l'indicateur de chargement
  hideLoadingNotification();

  // Créer une notification personnalisée
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #4CAF50, #45a049);
    color: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 400px;
    animation: slideIn 0.5s ease-out;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <span style="font-size: 24px; margin-right: 12px;">✅</span>
      <h3 style="margin: 0; font-size: 18px; font-weight: 600;">PDF Généré avec Succès !</h3>
    </div>
    <p style="margin: 0 0 15px 0; line-height: 1.5; opacity: 0.9;">${message}</p>
    <div style="display: flex; gap: 10px;">
      <button id="view-in-drive" style="
        background: rgba(255,255,255,0.2);
        border: 2px solid rgba(255,255,255,0.3);
        color: white;
        padding: 10px 20px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
        flex: 1;
      " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
        📁 Voir dans le Drive
      </button>
      <button id="close-notification" style="
        background: rgba(255,255,255,0.1);
        border: 2px solid rgba(255,255,255,0.2);
        color: white;
        padding: 10px 15px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: all 0.3s ease;
      " onmouseover="this.style.background='rgba(255,255,255,0.2)'" onmouseout="this.style.background='rgba(255,255,255,0.1)'">
        ✕
      </button>
    </div>
  `;

  // Ajouter la notification au DOM
  document.body.appendChild(notification);

  // DÉSACTIVER le bouton pendant 3 secondes pour forcer l'attente
  const viewButton = document.getElementById("view-in-drive");
  viewButton.disabled = true;
  viewButton.style.opacity = "0.6";
  viewButton.innerHTML = "⏳ Synchronisation... (3s)";

  // Compte à rebours visuel
  let countdown = 3;
  const countdownInterval = setInterval(() => {
    countdown--;
    if (countdown > 0) {
      viewButton.innerHTML = `⏳ Synchronisation... (${countdown}s)`;
    } else {
      // Réactiver le bouton
      clearInterval(countdownInterval);
      viewButton.disabled = false;
      viewButton.style.opacity = "1";
      viewButton.innerHTML = "📁 Voir dans le Drive";
    }
  }, 1000);

  // Gérer le clic sur "Voir dans le Drive"
  viewButton.addEventListener("click", async () => {
    if (driveUrl) {
      // Extraire le chemin du fichier depuis l'URL
      const urlParams = new URLSearchParams(driveUrl.split("?")[1]);
      const filePath = urlParams.get("path");

      if (filePath) {

        try {
          // Vérifier que le fichier existe dans S3
          const fileExists = await waitForFileToExist(filePath, 10, 1000);

          if (fileExists) {
          } else {
            console.log("⚠️ Fichier non trouvé, attente supplémentaire...");
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }

          // Vérification finale
          const finalCheck = await waitForFileToExist(filePath, 5, 500);

          if (!finalCheck) {
            console.log(
              "⚠️ Fichier non trouvé, vérification du dossier parent..."
            );
            const parentPath = filePath.substring(0, filePath.lastIndexOf("/"));

            try {
              const parentResponse = await axios.head(
                `${API_BASE_URL}/download-pdf-from-s3/`,
                {
                  params: { path: parentPath },
                  withCredentials: true,
                  timeout: 5000,
                }
              );

              if (parentResponse.status === 200) {
                driveUrl = driveUrl.replace(
                  `path=${filePath}`,
                  `path=${parentPath}`
                );
              } else {
                console.log("⚠️ Redirection vers le dossier racine");
                const rootPath = "Appels_Offres";
                driveUrl = driveUrl.replace(
                  `path=${filePath}`,
                  `path=${rootPath}`
                );
              }
            } catch (error) {
              const rootPath = "Appels_Offres";
              driveUrl = driveUrl.replace(
                `path=${filePath}`,
                `path=${rootPath}`
              );
            }
          }
        } catch (error) {
          console.log(
            "⚠️ Erreur lors de la vérification, redirection intelligente..."
          );
          try {
            const parentPath = filePath.substring(0, filePath.lastIndexOf("/"));
            driveUrl = driveUrl.replace(
              `path=${filePath}`,
              `path=${parentPath}`
            );
          } catch (fallbackError) {
            const rootPath = "Appels_Offres";
            driveUrl = driveUrl.replace(`path=${filePath}`, `path=${rootPath}`);
          }
        }
      }

      // Améliorer l'URL pour pointer exactement vers le fichier
      let enhancedDriveUrl = driveUrl;
      if (driveUrl.includes("path=")) {
        if (!driveUrl.includes("sidebar=closed")) {
          enhancedDriveUrl = driveUrl + "&sidebar=closed&focus=file";
        }
      }

      // Créer une nouvelle fenêtre pour éviter les problèmes de cache
      console.log("🆕 Création d'une nouvelle fenêtre Drive");

      try {
        const existingWindow = window.open("", "drive_window");
        if (existingWindow && !existingWindow.closed) {
          console.log("🗑️ Fermeture de la fenêtre Drive existante");
          existingWindow.close();
        }
      } catch (error) {
        console.log("⚠️ Impossible de fermer la fenêtre existante:", error);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const uniqueWindowName = `drive_window_${Date.now()}`;
      console.log(`🆕 Création de la fenêtre Drive: ${uniqueWindowName}`);

      // Nettoyer le cache local
      try {
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes("drive") || key.includes("cache"))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => sessionStorage.removeItem(key));
        console.log(
          "🧹 Cache local nettoyé:",
          keysToRemove.length,
          "éléments supprimés"
        );
      } catch (error) {
        console.log("⚠️ Impossible de nettoyer le cache local:", error);
      }

      // Créer la fenêtre et naviguer
      const driveWindow = window.open(
        "about:blank",
        uniqueWindowName,
        "width=1400,height=900,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no"
      );

      if (driveWindow) {
        setTimeout(() => {
          try {
            driveWindow.location.replace(enhancedDriveUrl);
            driveWindow.focus();
          } catch (error) {
            try {
              driveWindow.location.href = enhancedDriveUrl;
              driveWindow.focus();
            } catch (fallbackError) {
            }
          }
        }, 300);
      } else {
        try {
          window.location.href = enhancedDriveUrl;
        } catch (error) {
        }
      }
    }
  });

  // Gérer le clic sur "Fermer"
  document
    .getElementById("close-notification")
    .addEventListener("click", () => {
      notification.style.animation = "slideOut 0.5s ease-in";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    });

  // Auto-fermeture après 8 secondes
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideOut 0.5s ease-in";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }
  }, 8000);
};

/**
 * Affiche une notification d'erreur
 */
const showErrorNotification = (message) => {
  // Masquer d'abord l'indicateur de chargement
  hideLoadingNotification();

  // Créer une notification d'erreur personnalisée
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #f44336, #d32f2f);
    color: white;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
    z-index: 10000;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 400px;
    animation: slideIn 0.5s ease-out;
  `;

  notification.innerHTML = `
    <div style="display: flex; align-items: center; margin-bottom: 15px;">
      <span style="font-size: 24px; margin-right: 12px;">❌</span>
      <h3 style="margin: 0; font-size: 18px; font-weight: 600;">Erreur de Génération</h3>
    </div>
    <p style="margin: 0 0 15px 0; line-height: 1.5; opacity: 0.9;">${message}</p>
    <button id="close-error-notification" style="
      background: rgba(255,255,255,0.2);
      border: 2px solid rgba(255,255,255,0.3);
      color: white;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
      width: 100%;
    " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
      Fermer
    </button>
  `;

  // Ajouter la notification au DOM
  document.body.appendChild(notification);

  // Gérer le clic sur "Fermer"
  document
    .getElementById("close-error-notification")
    .addEventListener("click", () => {
      notification.style.animation = "slideOut 0.5s ease-in";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    });

  // Auto-fermeture après 6 secondes
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = "slideOut 0.5s ease-in";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 500);
    }
  }, 6000);
};

/**
 * Vérifie si un fichier existe dans S3 avant de rediriger
 */
const waitForFileToExist = async (filePath, maxAttempts = 10, delay = 1000) => {

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {

      const response = await axios.head(
        `${API_BASE_URL}/download-pdf-from-s3/`,
        {
          params: { path: filePath },
          withCredentials: true,
          timeout: 5000,
        }
      );

      if (response.status === 200) {
        return true;
      }
    } catch (error) {
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.log(`⚠️ Fichier non trouvé après ${maxAttempts} tentatives`);
  return false;
};

// ============================================================================
// FONCTIONS UTILITAIRES POUR L'EXTENSIBILITÉ
// ============================================================================

/**
 * Ajoute un nouveau type de document au système
 * @param {string} typeName - Nom du type de document
 * @param {Object} config - Configuration du type de document
 */
export const addDocumentType = (typeName, config) => {
  DOCUMENT_TYPES[typeName] = config;
};

/**
 * Retourne la liste des types de documents supportés
 */
export const getSupportedDocumentTypes = () => {
  return Object.keys(DOCUMENT_TYPES);
};

/**
 * Vérifie si un type de document est supporté
 */
export const isDocumentTypeSupported = (typeName) => {
  return typeName in DOCUMENT_TYPES;
};

// Export par défaut
export default {
  generatePDFDrive,
  addDocumentType,
  getSupportedDocumentTypes,
  isDocumentTypeSupported,
  customSlugify,
};
