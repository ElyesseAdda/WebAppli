/**
 * useDriveCopy Hook - Gestion du copier-coller de fichiers/dossiers DANS le Drive
 * 
 * Système interne de copie pour copier des fichiers/dossiers d'un endroit à un autre
 * dans le Drive sans passer par le presse-papier système.
 */

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE_URL = '/api/drive-v2';

// Utilitaire pour récupérer le token CSRF
const getCookie = (name) => {
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + '=') {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
};

/**
 * Hook pour gérer le copier-coller interne du Drive
 * 
 * @returns {Object} - { copiedItems, copyItems, pasteItems, clearCopiedItems, isCopying }
 */
export const useDriveCopy = () => {
  const [copiedItems, setCopiedItems] = useState([]);
  const [isCopying, setIsCopying] = useState(false);

  // Copier des éléments
  const copyItems = useCallback((items) => {
    if (!items || items.length === 0) {
      return;
    }
    
    setCopiedItems(items);
    console.log(`${items.length} élément(s) copié(s) dans le Drive`);
  }, []);

  // Effacer les éléments copiés
  const clearCopiedItems = useCallback(() => {
    setCopiedItems([]);
  }, []);

  // Copier (dupliquer) un fichier
  const copyFile = async (sourcePath, destPath, newFileName) => {
    try {
      // Télécharger le fichier source
      const downloadResponse = await axios.get(`${API_BASE_URL}/download-url/`, {
        params: { file_path: sourcePath },
        withCredentials: true,
      });

      const downloadUrl = downloadResponse.data.download_url;

      // Télécharger le contenu
      const fileResponse = await axios.get(downloadUrl, {
        responseType: 'blob',
      });

      const blob = fileResponse.data;
      
      // Créer un nouveau fichier avec le blob
      const file = new File([blob], newFileName, { type: blob.type });

      // Obtenir l'URL d'upload pour le nouveau fichier
      const uploadUrlResponse = await axios.post(
        `${API_BASE_URL}/upload-url/`,
        {
          file_path: destPath,
          file_name: newFileName,
          content_type: file.type || 'application/octet-stream',
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
        }
      );

      const { upload_url, fields } = uploadUrlResponse.data;

      // Upload vers S3
      const formData = new FormData();
      Object.keys(fields).forEach((key) => {
        formData.append(key, fields[key]);
      });
      formData.append('file', file);

      await axios.post(upload_url, formData, {
        withCredentials: false,
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la copie du fichier:', error);
      throw error;
    }
  };

  // Copier (dupliquer) un dossier récursivement
  const copyFolder = async (sourceFolderPath, destPath, newFolderName) => {
    try {
      // Créer le dossier de destination
      const newFolderPath = destPath + newFolderName + '/';
      
      await axios.post(
        `${API_BASE_URL}/create-folder/`,
        {
          parent_path: destPath,
          folder_name: newFolderName,
        },
        {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
        }
      );

      // Lister le contenu du dossier source
      const contentResponse = await axios.get(`${API_BASE_URL}/list-content/`, {
        params: { folder_path: sourceFolderPath },
        withCredentials: true,
      });

      const { files = [], folders = [] } = contentResponse.data;

      // Copier tous les fichiers
      for (const file of files) {
        await copyFile(file.path, newFolderPath, file.name);
      }

      // Copier tous les sous-dossiers récursivement
      for (const folder of folders) {
        await copyFolder(folder.path, newFolderPath, folder.name);
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la copie du dossier:', error);
      throw error;
    }
  };

  // Coller les éléments copiés
  const pasteItems = useCallback(async (destinationPath) => {
    if (copiedItems.length === 0) {
      throw new Error('Aucun élément à coller');
    }

    setIsCopying(true);

    try {
      const results = [];

      for (const item of copiedItems) {
        try {
          if (item.type === 'folder') {
            // Copier le dossier
            await copyFolder(item.path, destinationPath, item.name);
            results.push({ success: true, item });
          } else {
            // Copier le fichier
            await copyFile(item.path, destinationPath, item.name);
            results.push({ success: true, item });
          }
        } catch (error) {
          console.error(`Erreur lors de la copie de ${item.name}:`, error);
          results.push({ success: false, item, error });
        }
      }

      // Compter les succès et échecs
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;

      return {
        success: successCount,
        error: errorCount,
        total: copiedItems.length,
        results,
      };
    } finally {
      setIsCopying(false);
    }
  }, [copiedItems]);

  // Écouter les raccourcis clavier Ctrl+C et Ctrl+V
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ignorer si on est dans un champ de texte
      const activeElement = document.activeElement;
      const isInputField = 
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.isContentEditable ||
        activeElement.getAttribute('contenteditable') === 'true';

      if (isInputField) {
        return;
      }

      // Ctrl+C ou Cmd+C pour copier (sera géré par le composant)
      if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
        // Ne rien faire ici, le composant DriveExplorer gérera la copie
        // On garde juste l'info qu'on a des éléments copiés
      }

      // Ctrl+V ou Cmd+V pour coller (sera géré par le composant)
      if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
        // Ne rien faire ici, le composant DriveV2 gérera le paste
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [copiedItems]);

  return {
    copiedItems,
    copyItems,
    pasteItems,
    clearCopiedItems,
    isCopying,
    hasCopiedItems: copiedItems.length > 0,
  };
};

export default useDriveCopy;

