/**
 * Hook personnalisé pour la régénération de PDFs dans le Drive
 * 
 * Ce hook gère toute la logique de régénération des documents PDF,
 * y compris les appels API, la gestion des états, et les notifications
 */

import { useState } from 'react';
import axios from 'axios';
import { getDocumentConfig, buildDocumentUrl } from '../config/documentTypeConfig';

/**
 * Hook pour régénérer un PDF dans le Drive
 * @param {string} documentType - Type de document (depuis DOCUMENT_TYPES)
 * @returns {object} { regenerate, isLoading, error, success }
 */
export const useRegeneratePDF = (documentType) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const config = getDocumentConfig(documentType);

  /**
   * Fonction principale de régénération
   * @param {object} documentData - Données du document à régénérer
   * @param {object} options - Options supplémentaires
   * @param {boolean} options.showConfirm - Afficher une confirmation (défaut: true)
   * @param {function} options.onSuccess - Callback de succès
   * @param {function} options.onError - Callback d'erreur
   * @returns {Promise<object>} Résultat de la régénération
   */
  const regenerate = async (documentData, options = {}) => {
    const {
      showConfirm = true,
      onSuccess = null,
      onError = null,
    } = options;

    // Confirmation avant régénération
    if (showConfirm) {
      const confirmed = window.confirm(config.confirmMessage);
      if (!confirmed) {
        return { cancelled: true };
      }
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      console.log('🔄 Début de la régénération du document...', {
        type: documentType,
        documentData,
      });

      // Construire l'URL avec les paramètres
      const url = buildDocumentUrl(documentType, documentData);

      console.log('📡 Appel API:', url);

      // Appel API pour régénérer le PDF
      const response = await axios.get(url);

      console.log('✅ Régénération réussie:', response.data);

      setSuccess(true);
      setIsLoading(false);

      // Callback de succès
      if (onSuccess) {
        onSuccess(response.data);
      }

      // Notification de succès
      alert(config.successMessage);

      return {
        success: true,
        data: response.data,
      };

    } catch (err) {
      console.error('❌ Erreur lors de la régénération:', err);

      const errorMessage = err.response?.data?.error 
        || err.response?.data?.message 
        || err.message 
        || config.errorMessage;

      setError(errorMessage);
      setIsLoading(false);

      // Callback d'erreur
      if (onError) {
        onError(err);
      }

      // Notification d'erreur
      alert(`${config.errorMessage}\n\nDétails: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
      };
    }
  };

  /**
   * Réinitialiser les états
   */
  const reset = () => {
    setIsLoading(false);
    setError(null);
    setSuccess(false);
  };

  return {
    regenerate,
    isLoading,
    error,
    success,
    reset,
    config,
  };
};

export default useRegeneratePDF;

