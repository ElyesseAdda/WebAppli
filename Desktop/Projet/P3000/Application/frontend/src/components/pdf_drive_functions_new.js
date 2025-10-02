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
  try {
    console.log(
      `🚀 Génération du planning hebdomadaire semaine ${week}/${year} vers le Drive...`
    );

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
    console.error("❌ Erreur lors de la génération du planning:", error);
    showErrorNotification(`Erreur: ${error.message}`);
    throw error;
  }
};

/**
 * Génère le rapport mensuel des agents et le stocke dans le Drive
 */
export const generateMonthlyAgentsPDFDrive = async (month, year) => {
  try {
    console.log(
      `🚀 Génération du rapport mensuel agents ${month}/${year} vers le Drive...`
    );

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
    console.error("❌ Erreur lors de la génération du rapport mensuel:", error);
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
  appelOffresId,
  appelOffresName
) => {
  try {
    console.log(
      `🚀 Génération du devis marché ${appelOffresName} vers le Drive...`
    );

    const response = await axios.get(
      `${API_BASE_URL}/generate-devis-marche-pdf-drive/`,
      {
        params: {
          appel_offres_id: appelOffresId,
          appel_offres_name: appelOffresName,
        },
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
    console.error("❌ Erreur lors de la génération du devis marché:", error);
    showErrorNotification(`Erreur: ${error.message}`);
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
 * Affiche une notification de succès avec bouton de redirection
 */
const showSuccessNotification = (message, driveUrl) => {
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

  // Gérer le clic sur "Voir dans le Drive"
  document.getElementById("view-in-drive").addEventListener("click", () => {
    if (driveUrl) {
      // Ouvrir dans une nouvelle fenêtre
      window.open(
        driveUrl,
        "_blank",
        "width=1200,height=800,scrollbars=yes,resizable=yes"
      );
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
