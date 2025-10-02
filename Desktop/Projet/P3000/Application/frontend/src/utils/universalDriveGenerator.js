/**
 * Générateur universel de PDFs pour le Drive AWS S3
 * Système extensible pour tous les types de documents
 */

import axios from "axios";

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
  // Autres types à ajouter plus tard :
  // 'situation': { ... },
  // 'rapport': { ... }
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
    console.log(`🚀 Génération PDF Drive - Type: ${documentType}`, data);

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
      console.log(`✅ PDF généré et stocké avec succès dans le Drive`);

      // Vérifier s'il y a un conflit détecté
      if (response.data.conflict_detected) {
        console.log(`⚠️ Conflit de fichier détecté pour ${documentType}`);
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
  switch (documentType) {
    case "devis_chantier":
      return {
        devis_id: data.devisId,
        appel_offres_id: data.appelOffresId,
        appel_offres_name: data.appelOffresName,
        societe_name: data.societeName,
      };

    case "devis_normal":
      return {
        devis_id: data.devisId,
        chantier_id: data.chantierId,
        chantier_name: data.chantierName,
        societe_name: data.societeName,
      };

    case "contrat_sous_traitance":
      return {
        contrat_id: data.contratId,
        chantier_id: data.chantierId,
        chantier_name: data.chantierName,
        societe_name: data.societeName,
        sous_traitant_name: data.sousTraitantName,
      };

    case "avenant_sous_traitance":
      return {
        avenant_id: data.avenantId,
        contrat_id: data.contratId,
        chantier_id: data.chantierId,
        chantier_name: data.chantierName,
        societe_name: data.societeName,
        sous_traitant_name: data.sousTraitantName,
        numero_avenant: data.numeroAvenant,
      };

    case "situation":
      return {
        situation_id: data.situationId,
        chantier_id: data.chantierId,
        chantier_name: data.chantierName,
        societe_name: data.societeName,
        numero_situation: data.numeroSituation,
      };

    case "bon_commande":
      return {
        bon_commande_id: data.bonCommandeId,
        chantier_id: data.chantierId,
        chantier_name: data.chantierName,
        societe_name: data.societeName,
        numero_bon_commande: data.numeroBonCommande,
        fournisseur_name: data.fournisseurName,
      };

    case "planning_hebdo":
      const params = {
        week: data.week,
        year: data.year,
      };
      // NOUVEAU : Ajouter les agent_ids si fournis (en tant que chaîne)
      if (data.agent_ids && data.agent_ids.length > 0) {
        params.agent_ids = data.agent_ids.join(',');
      }
      return params;

    case "rapport_agents":
      return {
        month: data.month,
        year: data.year,
      };

    // Autres types à ajouter ici
    default:
      return data;
  }
};

/**
 * Gère les conflits de fichiers
 */
const handleConflict = (documentType, data, responseData, callbacks) => {
  const documentConfig = DOCUMENT_TYPES[documentType];

  // Construire les données du conflit
  const conflictData = {
    conflictId: `${documentType}_${
      data.devisId || data.appelOffresId
    }_${Date.now()}`,
    fileName: responseData.file_name,
    displayFileName: responseData.file_name,
    existingFilePath: responseData.file_path.substring(
      0,
      responseData.file_path.lastIndexOf("/") + 1
    ),
    conflictMessage: `Un fichier avec le même nom existe déjà dans le Drive.`,
    documentType: documentType,
    societeName: data.societeName,
    previewUrl: documentConfig.previewUrl(data),
    drive_url: responseData.drive_url,
    file_path: responseData.file_path,
    // Données spécifiques au type de document
    ...getDocumentSpecificData(documentType, data),
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

  // Construire le nom et le chemin du fichier (comme le backend le ferait)
  const fileName = buildFileName(documentType, data);
  const filePath = buildFilePath(documentType, data, fileName);

  const conflictData = {
    conflictId: `${documentType}_${
      data.devisId || data.appelOffresId
    }_${Date.now()}`,
    fileName: fileName,
    displayFileName: fileName,
    existingFilePath: filePath.substring(0, filePath.lastIndexOf("/") + 1),
    conflictMessage: `Un fichier avec le même nom existe déjà dans le Drive.`,
    documentType: documentType,
    societeName: data.societeName,
    previewUrl: documentConfig.previewUrl(data),
    file_path: filePath,
    drive_url: `/drive?path=${filePath}&sidebar=closed&focus=file&_t=${Date.now()}`,
    // Données spécifiques au type de document
    ...getDocumentSpecificData(documentType, data),
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
 */
const buildFileName = (documentType, data) => {
  switch (documentType) {
    case "devis_chantier":
      // Utiliser le numéro du devis depuis la DB (ex: "DEV-008-25 - Test Appel Offres")
      return `${data.numero || data.devisId}.pdf`;

    case "devis_normal":
      // Utiliser le numéro du devis depuis la DB (ex: "DEV-008-25 - Test Chantier")
      return `${data.numero || data.devisId}.pdf`;

    case "contrat_sous_traitance":
      // Nom du fichier : "Contrat [SousTraitant] - [Chantier].pdf"
      const contratName = `Contrat ${data.sousTraitantName} - ${data.chantierName}`;
      return `${contratName}.pdf`;

    case "avenant_sous_traitance":
      // Nom du fichier : "Avenant [Numero] [SousTraitant] - [Chantier].pdf"
      const avenantName = `Avenant ${data.numeroAvenant} ${data.sousTraitantName} - ${data.chantierName}`;
      return `${avenantName}.pdf`;

    case "situation":
      // Nom du fichier : "{numero_situation}.pdf"
      return `${data.numeroSituation}.pdf`;

    case "bon_commande":
      // Nom du fichier : "{numero_bon_commande}.pdf"
      return `${data.numeroBonCommande}.pdf`;

    case "planning_hebdo":
      return `PH S${data.week} ${String(data.year).slice(-2)}.pdf`;

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
      return `RapportComptable_${monthName}_${String(data.year).slice(-2)}.pdf`;

    // Autres types à ajouter ici
    default:
      return `${documentType}_${data.id || Date.now()}.pdf`;
  }
};

/**
 * Construit le chemin de fichier selon le type de document
 */
const buildFilePath = (documentType, data, fileName) => {
  switch (documentType) {
    case "devis_chantier":
      const societeSlug = customSlugify(data.societeName);
      const appelOffresSlug = customSlugify(data.appelOffresName);
      return `Appels_Offres/${societeSlug}/${appelOffresSlug}/Devis/Devis_Marche/${fileName}`;

    case "devis_normal":
      const societeNormalSlug = customSlugify(data.societeName);
      const chantierSlug = customSlugify(data.chantierName);
      return `Chantiers/${societeNormalSlug}/${chantierSlug}/Devis/${fileName}`;

    case "contrat_sous_traitance":
      const societeContratSlug = customSlugify(data.societeName);
      const chantierContratSlug = customSlugify(data.chantierName);
      const entrepriseContratSlug = customSlugify(data.sousTraitantName);
      return `Chantiers/${societeContratSlug}/${chantierContratSlug}/Sous_Traitant/${entrepriseContratSlug}/${fileName}`;

    case "avenant_sous_traitance":
      const societeAvenantSlug = customSlugify(data.societeName);
      const chantierAvenantSlug = customSlugify(data.chantierName);
      const entrepriseAvenantSlug = customSlugify(data.sousTraitantName);
      return `Chantiers/${societeAvenantSlug}/${chantierAvenantSlug}/Sous_Traitant/${entrepriseAvenantSlug}/${fileName}`;

    case "situation":
      const societeSituationSlug = customSlugify(data.societeName);
      const chantierSituationSlug = customSlugify(data.chantierName);
      return `Chantiers/${societeSituationSlug}/${chantierSituationSlug}/Situation/${fileName}`;

    case "bon_commande":
      const societeBonCommandeSlug = customSlugify(data.societeName);
      const chantierBonCommandeSlug = customSlugify(data.chantierName);
      const fournisseurSlug = customSlugify(data.fournisseurName);
      return `Chantiers/${societeBonCommandeSlug}/${chantierBonCommandeSlug}/Bon_Commande/${fournisseurSlug}/${fileName}`;

    case "planning_hebdo":
      return `Agents/Document_Generaux/PlanningHebdo/${data.year}/${fileName}`;

    case "rapport_agents":
      return `Agents/Document_Generaux/Rapport_mensuel/${data.year}/${fileName}`;

    // Autres types à ajouter ici
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

    // Autres types à ajouter ici
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
    error.response.status === 500 &&
    error.response.data &&
    error.response.data.error &&
    error.response.data.error.includes("Conflit de fichier détecté")
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
      console.log("✅ Bouton réactivé après 3 secondes de synchronisation");
    }
  }, 1000);

  // Gérer le clic sur "Voir dans le Drive"
  viewButton.addEventListener("click", async () => {
    if (driveUrl) {
      // Extraire le chemin du fichier depuis l'URL
      const urlParams = new URLSearchParams(driveUrl.split("?")[1]);
      const filePath = urlParams.get("path");

      if (filePath) {
        console.log("🔍 Début de la vérification du fichier...");

        try {
          // Vérifier que le fichier existe dans S3
          const fileExists = await waitForFileToExist(filePath, 10, 1000);

          if (fileExists) {
            console.log("✅ Fichier confirmé dans S3");
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
                console.log("✅ Dossier parent confirmé");
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
              console.log("❌ Erreur, redirection vers le dossier racine");
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
        console.log("✅ Fenêtre Drive créée avec succès");
        setTimeout(() => {
          try {
            console.log("🔄 Navigation vers l'URL du Drive...");
            driveWindow.location.replace(enhancedDriveUrl);
            console.log("✅ Navigation forcée vers:", enhancedDriveUrl);
            driveWindow.focus();
          } catch (error) {
            console.log("❌ Erreur lors de la navigation:", error);
            try {
              driveWindow.location.href = enhancedDriveUrl;
              driveWindow.focus();
            } catch (fallbackError) {
              console.log("❌ Échec du fallback:", fallbackError);
            }
          }
        }, 300);
      } else {
        console.log("❌ Échec de la création de la fenêtre Drive");
        console.log("🔄 Fallback: Redirection dans la fenêtre actuelle...");
        try {
          window.location.href = enhancedDriveUrl;
        } catch (error) {
          console.log(
            "❌ Échec de la redirection dans la fenêtre actuelle:",
            error
          );
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
  console.log(`🔍 Vérification de l'existence du fichier: ${filePath}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔄 Tentative ${attempt}/${maxAttempts}`);

      const response = await axios.head(
        `${API_BASE_URL}/download-pdf-from-s3/`,
        {
          params: { path: filePath },
          withCredentials: true,
          timeout: 5000,
        }
      );

      if (response.status === 200) {
        console.log(`✅ Fichier trouvé après ${attempt} tentative(s)`);
        return true;
      }
    } catch (error) {
      console.log(
        `⏳ Tentative ${attempt}/${maxAttempts} - Fichier pas encore disponible`
      );
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
  console.log(`✅ Type de document ajouté: ${typeName}`);
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
