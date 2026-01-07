/**
 * Fonctions pour la génération de PDFs avec stockage automatique dans le Drive AWS S3
 */

import axios from "axios";

// Configuration de base
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:8000/api"
    : "/api"; // URL relative pour la production

/**
 * Génère le planning hebdomadaire et le stocke dans le Drive
 */
export const generatePlanningHebdoDrive = async (week, year) => {
  // Afficher l'indicateur de chargement immédiatement
  showLoadingNotification(
    `Génération du planning hebdomadaire semaine ${week}/${year} vers le Drive...`
  );

  try {
    const response = await axios.get(
      `${API_BASE_URL}/planning-hebdo-pdf-drive/`,
      {
        params: { week, year },
        withCredentials: true,
      }
    );

    if (response.data.success) {
      // Afficher une notification de succès avec bouton de redirection
      showSuccessNotification(response.data.message, response.data.drive_url);

      return response.data;
    } else {
      throw new Error(response.data.error || "Erreur inconnue");
    }
  } catch (error) {
    // Vérifier si c'est un conflit de fichier
    if (
      error.response &&
      error.response.status === 500 &&
      error.response.data &&
      error.response.data.error &&
      error.response.data.error.includes("Conflit de fichier détecté")
    ) {
      // Émettre un événement personnalisé pour ouvrir le modal de conflit
      const conflictId = `planning_${week}_${year}_${Date.now()}`;
      const conflictEvent = new CustomEvent("openConflictDialog", {
        detail: {
          conflictId: conflictId, // Identifiant unique pour ce conflit
          fileName: `PH S${week} ${String(year).slice(-2)}.pdf`, // Nom correct pour le planning - NE PAS TRANSFORMER
          existingFilePath: `Agents/Document_Generaux/PlanningHebdo/${year}/`,
          conflictMessage:
            "Un fichier avec le même nom existe déjà dans le Drive.",
          documentType: "planning_hebdo",
          societeName: "Société par défaut",
          week: week,
          year: year,
          previewUrl: `${window.location.origin}/api/preview-planning-hebdo/?week=${week}&year=${year}`,
        },
      });

      window.dispatchEvent(conflictEvent);

      // Masquer la notification de chargement
      hideLoadingNotification();

      return { conflict_detected: true, error: "Conflit de fichier détecté" };
    }

    // Autres erreurs
    showErrorNotification(`Erreur: ${error.message}`);
    throw error;
  }
};

/**
 * Génère le rapport mensuel des agents et le stocke dans le Drive
 */
export const generateMonthlyAgentsPDFDrive = async (month, year) => {
  // Afficher l'indicateur de chargement immédiatement
  showLoadingNotification(
    `Génération du rapport mensuel agents ${month}/${year} vers le Drive...`
  );

  try {
    const response = await axios.get(
      `${API_BASE_URL}/generate-monthly-agents-pdf-drive/`,
      {
        params: { month, year },
        withCredentials: true,
      }
    );

    if (response.data.success) {
      // Afficher une notification de succès avec bouton de redirection
      showSuccessNotification(response.data.message, response.data.drive_url);

      return response.data;
    } else {
      throw new Error(response.data.error || "Erreur inconnue");
    }
  } catch (error) {
    // Vérifier si c'est un conflit de fichier
    if (
      error.response &&
      error.response.status === 500 &&
      error.response.data &&
      error.response.data.error &&
      error.response.data.error.includes("Conflit de fichier détecté")
    ) {
      // Émettre un événement personnalisé pour ouvrir le modal de conflit
      const conflictId = `rapport_${month}_${year}_${Date.now()}`;
      const conflictEvent = new CustomEvent("openConflictDialog", {
        detail: {
          conflictId: conflictId, // Identifiant unique pour ce conflit
          fileName: `RapportComptable Septembre ${String(year).slice(-2)}.pdf`, // Nom correct avec mois en français
          existingFilePath: "Agents/Document_Generaux/Rapport_mensuel/",
          conflictMessage:
            "Un fichier avec le même nom existe déjà dans le Drive.",
          documentType: "rapport_agents",
          societeName: "Société par défaut",
          month: month,
          year: year,
          previewUrl: `${window.location.origin}/api/preview-monthly-agents-report/?month=${month}&year=${year}`,
        },
      });

      window.dispatchEvent(conflictEvent);

      // Masquer la notification de chargement
      hideLoadingNotification();

      return { conflict_detected: true, error: "Conflit de fichier détecté" };
    }

    // Autres erreurs
    showErrorNotification(`Erreur: ${error.message}`);
    throw error;
  }
};

/**
 * Génère le devis de travaux et le stocke dans le Drive
 */
export const generateDevisTravauxPDFDrive = async (
  chantierId,
  chantierName
) => {
  // Afficher l'indicateur de chargement immédiatement
  showLoadingNotification(
    `Génération du devis travaux ${chantierName} vers le Drive...`
  );

  try {
    console.log(
      `🚀 Génération du devis travaux ${chantierName} vers le Drive...`
    );

    const response = await axios.get(
      `${API_BASE_URL}/generate-devis-travaux-pdf-drive/`,
      {
        params: { chantier_id: chantierId, chantier_name: chantierName },
        withCredentials: true,
      }
    );

    if (response.data.success) {

      // Afficher une notification de succès avec bouton de redirection
      showSuccessNotification(response.data.message, response.data.drive_url);

      return response.data;
    } else {
      throw new Error(response.data.error || "Erreur inconnue");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la génération du devis travaux:", error);
    showErrorNotification(`Erreur: ${error.message}`);
    throw error;
  }
};

/**
 * Génère le devis de marché et le stocke dans le Drive
 */
export const generateDevisMarchePDFDrive = async (
  devisId,
  appelOffresId,
  appelOffresName,
  societeName,
  onSuccess,
  onError
) => {
  // Afficher l'indicateur de chargement immédiatement
  showLoadingNotification(
    `Génération du devis marché ${appelOffresName} vers le Drive...`
  );

  try {
    console.log(
      `🚀 Génération du devis marché ${appelOffresName} vers le Drive...`
    );

    // Utiliser l'endpoint existant pour générer le PDF
    const response = await axios.get(
      `${API_BASE_URL}/generate-devis-marche-pdf-drive/`,
      {
        params: {
          devis_id: devisId,
          appel_offres_id: appelOffresId,
          appel_offres_name: appelOffresName,
          societe_name: societeName,
        },
        withCredentials: true,
      }
    );

    if (response.data.success) {

      // Vérifier s'il y a un conflit détecté
      if (response.data.conflict_detected) {

        // Émettre un événement personnalisé pour ouvrir le modal de conflit
        const conflictId = `appel_offres_${appelOffresId}_${Date.now()}`;
        const conflictEvent = new CustomEvent("openConflictDialog", {
          detail: {
            conflictId: conflictId,
            fileName: response.data.file_name,
            displayFileName: response.data.file_name, // Nom complet du devis
            existingFilePath: response.data.file_path.substring(
              0,
              response.data.file_path.lastIndexOf("/") + 1
            ),
            conflictMessage:
              "Un fichier avec le même nom existe déjà dans le Drive pour cet appel d'offres.",
            documentType: "devis_marche",
            societeName: societeName,
            appelOffresId: appelOffresId,
            appelOffresName: appelOffresName,
            devisId: devisId,
            previewUrl: `${window.location.origin}/api/preview-saved-devis/${devisId}/`,
            drive_url: response.data.drive_url,
            file_path: response.data.file_path,
          },
        });

        window.dispatchEvent(conflictEvent);

        // Masquer la notification de chargement
        hideLoadingNotification();

        return { conflict_detected: true, error: "Conflit de fichier détecté" };
      }

      // Afficher une notification de succès avec bouton de redirection (comme le planning hebdo)
      showSuccessNotification(response.data.message, response.data.drive_url);

      // Appeler le callback de succès si fourni (pour compatibilité)
      if (onSuccess) {
        onSuccess(response.data);
      }

      return response.data;
    } else {
      throw new Error(response.data.error || "Erreur inconnue");
    }
  } catch (error) {
    console.error("❌ Erreur lors de la génération du devis marché:", error);

    // Vérifier si c'est un conflit de fichier
    if (
      error.response &&
      error.response.status === 500 &&
      error.response.data &&
      error.response.data.error &&
      error.response.data.error.includes("Conflit de fichier détecté")
    ) {
      // Construire le nom correct du fichier (comme le backend le ferait)
      const devisName = `DEV-${String(devisId).padStart(
        3,
        "0"
      )}-25 - ${appelOffresName}`;
      const fileName = `${devisName}.pdf`;

      // Construire le chemin correct (comme le backend le ferait avec custom_slugify)
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

      const societeSlug = customSlugify(societeName);
      const appelOffresSlug = customSlugify(appelOffresName);
      const existingFilePath = `Appels_Offres/${societeSlug}/${appelOffresSlug}/Devis/Devis_Marche/`;
      const filePath = `${existingFilePath}${fileName}`;

      // Émettre un événement personnalisé pour ouvrir le modal de conflit
      const conflictId = `appel_offres_${appelOffresId}_${Date.now()}`;
      const conflictEvent = new CustomEvent("openConflictDialog", {
        detail: {
          conflictId: conflictId,
          fileName: fileName, // Nom correct du devis
          displayFileName: fileName, // Nom complet du devis
          existingFilePath: existingFilePath,
          conflictMessage:
            "Un fichier avec le même nom existe déjà dans le Drive pour cet appel d'offres.",
          documentType: "devis_marche",
          societeName: societeName,
          appelOffresId: appelOffresId,
          appelOffresName: appelOffresName,
          devisId: devisId,
          previewUrl: `${window.location.origin}/api/preview-saved-devis/${devisId}/`,
          file_path: filePath, // Chemin complet du fichier
          drive_url: `/drive-v2?path=${filePath}&focus=file&_t=${Date.now()}`,
        },
      });

      window.dispatchEvent(conflictEvent);

      // Masquer la notification de chargement
      hideLoadingNotification();

      return { conflict_detected: true, error: "Conflit de fichier détecté" };
    }

    // Autres erreurs
    showErrorNotification(`Erreur: ${error.message}`);

    // Appeler le callback d'erreur si fourni (pour compatibilité)
    if (onError) {
      onError(error);
    }

    throw error;
  }
};

/**
 * Télécharge un PDF depuis le Drive S3
 */
export const downloadPDFFromDrive = async (s3Path) => {
  try {
    console.log(`📥 Téléchargement du PDF depuis le Drive: ${s3Path}`);

    const response = await axios.get(`${API_BASE_URL}/download-pdf-from-s3/`, {
      params: { path: s3Path },
      responseType: "blob",
      withCredentials: true,
    });

    // Créer un lien de téléchargement
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", s3Path.split("/").pop());
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);

  } catch (error) {
    console.error("❌ Erreur lors du téléchargement:", error);
    showErrorNotification(`Erreur de téléchargement: ${error.message}`);
    throw error;
  }
};

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
 * Vérifie si un fichier existe dans S3 avant de rediriger
 */
const waitForFileToExist = async (filePath, maxAttempts = 10, delay = 1000) => {

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {

      // Faire une requête HEAD pour vérifier l'existence du fichier
      const response = await axios.head(
        `${API_BASE_URL}/download-pdf-from-s3/`,
        {
          params: { path: filePath },
          withCredentials: true,
          timeout: 5000,
        }
      );

      if (response.status === 200) {
        console.log(
          `✅ Fichier trouvé après ${attempt} tentative(s) - ${new Date().toLocaleTimeString()}`
        );
        console.log(`📊 Temps total: ${(attempt * delay) / 1000} secondes`);
        return true;
      }
    } catch (error) {
      console.log(
        `⏳ Tentative ${attempt}/${maxAttempts} - Fichier pas encore disponible - ${new Date().toLocaleTimeString()}`
      );
      console.log(
        `❌ Erreur détaillée:`,
        error.response?.status,
        error.response?.data
      );
    }

    // Attendre avant la prochaine tentative
    if (attempt < maxAttempts) {
      console.log(`⏱️ Attente de ${delay}ms avant la prochaine tentative...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.log(
    `⚠️ Fichier non trouvé après ${maxAttempts} tentatives - ${new Date().toLocaleTimeString()}`
  );
  console.log(
    `📊 Temps total écoulé: ${(maxAttempts * delay) / 1000} secondes`
  );
  return false;
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

  // Ajouter les styles CSS pour l'animation
  if (!document.getElementById("notification-styles")) {
    const style = document.createElement("style");
    style.id = "notification-styles";
    style.textContent = `
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
      const urlParts = driveUrl.split("?");
      const urlParams = new URLSearchParams(urlParts[1] || "");
      const filePath = urlParams.get("path");

      if (filePath) {
        // Vérifier que le fichier existe dans S3 (avec un nombre limité de tentatives)
        try {
          const fileExists = await waitForFileToExist(filePath, 5, 1000);
          
          if (!fileExists) {
            // Si le fichier n'existe pas, naviguer vers le dossier parent
            const parentPath = filePath.substring(0, filePath.lastIndexOf("/"));
            if (parentPath) {
              // Construire l'URL du Drive V2 avec le dossier parent
              const driveV2Url = `/drive-v2?path=${encodeURIComponent(parentPath)}`;
              window.location.href = driveV2Url;
              return;
            }
          }
        } catch (error) {
          console.log("⚠️ Erreur lors de la vérification du fichier:", error);
        }

        // Construire l'URL du Drive V2 avec le chemin du fichier
        // Le Drive V2 gère automatiquement la navigation vers le dossier parent et le focus sur le fichier
        const driveV2Url = `/drive-v2?path=${encodeURIComponent(filePath)}&focus=file`;

        // Rediriger vers le Drive V2 dans la fenêtre actuelle
        window.location.href = driveV2Url;
      } else {
        // Si pas de chemin, rediriger vers la racine du Drive V2
        window.location.href = "/drive-v2";
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
