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
  const copyFile = async (sourcePath, destPath, newFileName, onProgress = null) => {
    try {
      // Télécharger le fichier source
      const downloadResponse = await axios.get(`${API_BASE_URL}/download-url/`, {
        params: { file_path: sourcePath },
        withCredentials: true,
      });

      const downloadUrl = downloadResponse.data.download_url;

      // Télécharger le contenu avec suivi de progression
      const fileResponse = await axios.get(downloadUrl, {
        responseType: 'blob',
        onDownloadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress({
              phase: 'download',
              progress: percentCompleted,
              loaded: progressEvent.loaded,
              total: progressEvent.total,
            });
          }
        },
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

      // Upload vers S3 avec suivi de progression
      const formData = new FormData();
      Object.keys(fields).forEach((key) => {
        formData.append(key, fields[key]);
      });
      formData.append('file', file);

      await axios.post(upload_url, formData, {
        withCredentials: false,
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            onProgress({
              phase: 'upload',
              progress: percentCompleted,
              loaded: progressEvent.loaded,
              total: progressEvent.total,
            });
          }
        },
      });

      return true;
    } catch (error) {
      console.error('Erreur lors de la copie du fichier:', error);
      throw error;
    }
  };

  // Calculer récursivement le nombre total de fichiers et la taille totale d'un dossier
  const calculateFolderStats = async (folderPath) => {
    try {
      let totalFiles = 0;
      let totalSize = 0;

      // Lister le contenu du dossier
      const contentResponse = await axios.get(`${API_BASE_URL}/list-content/`, {
        params: { folder_path: folderPath },
        withCredentials: true,
      });

      const { files = [], folders = [] } = contentResponse.data;

      // Ajouter les fichiers du dossier actuel
      totalFiles += files.length;
      totalSize += files.reduce((sum, file) => sum + (file.size || 0), 0);

      // Parcourir récursivement les sous-dossiers
      for (const folder of folders) {
        const subStats = await calculateFolderStats(folder.path);
        totalFiles += subStats.totalFiles;
        totalSize += subStats.totalSize;
      }

      return { totalFiles, totalSize };
    } catch (error) {
      console.error('Erreur lors du calcul des statistiques du dossier:', error);
      return { totalFiles: 0, totalSize: 0 };
    }
  };

  // Copier (dupliquer) un dossier récursivement
  const copyFolder = async (sourceFolderPath, destPath, newFolderName, onProgress = null, folderStats = null, folderOffset = { size: 0 }) => {
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
        const fileSize = file.size || 0;
        const fileOffset = { ...folderOffset };
        
        const fileProgressCallback = onProgress && folderStats ? (progressData) => {
          // progressData contient la progression du fichier individuel (0-100%)
          const fileProgress = progressData.progress || 0;
          
          // Calculer la taille chargée de ce fichier
          const fileLoaded = fileSize * fileProgress / 100;
          
          // Progression du dossier = offset (fichiers précédents) + progression de ce fichier
          const folderSizeProcessed = fileOffset.size + fileLoaded;
          const folderProgress = folderStats.size > 0 
            ? Math.round((folderSizeProcessed / folderStats.size) * 100)
            : 0;
          
          // Appeler le callback parent avec la progression du dossier
          onProgress({
            phase: progressData.phase || 'upload',
            progress: folderProgress,
            loaded: folderSizeProcessed,
            total: folderStats.size,
          });
        } : onProgress;

        await copyFile(file.path, newFolderPath, file.name, fileProgressCallback);
        
        // Mettre à jour l'offset pour le prochain fichier
        folderOffset.size += fileSize;
      }

      // Copier tous les sous-dossiers récursivement
      for (const folder of folders) {
        // Calculer les stats du sous-dossier
        const subStats = await calculateFolderStats(folder.path);
        
        // Créer un callback pour le sous-dossier qui adapte sa progression à celle du dossier parent
        const subFolderCallback = onProgress && folderStats ? (progressData) => {
          // progressData contient la progression du sous-dossier (0-100%)
          const subFolderProgress = progressData.progress || 0;
          const subFolderLoaded = subStats.size * subFolderProgress / 100;
          
          // Progression du dossier parent = offset (fichiers et sous-dossiers précédents) + progression du sous-dossier
          const folderSizeProcessed = folderOffset.size + subFolderLoaded;
          const folderProgress = folderStats.size > 0 
            ? Math.round((folderSizeProcessed / folderStats.size) * 100)
            : 0;
          
          onProgress({
            phase: progressData.phase || 'upload',
            progress: folderProgress,
            loaded: folderSizeProcessed,
            total: folderStats.size,
          });
        } : onProgress;
        
        await copyFolder(folder.path, newFolderPath, folder.name, subFolderCallback, subStats, folderOffset);
        
        // Mettre à jour l'offset pour le prochain sous-dossier
        folderOffset.size += subStats.size;
      }

      return true;
    } catch (error) {
      console.error('Erreur lors de la copie du dossier:', error);
      throw error;
    }
  };

  // Coller les éléments copiés
  const pasteItems = useCallback(async (destinationPath, onProgress = null) => {
    if (copiedItems.length === 0) {
      throw new Error('Aucun élément à coller');
    }

    setIsCopying(true);

    try {
      // ÉTAPE 1 : Calculer le nombre total de fichiers et la taille totale AVANT de commencer
      let totalFiles = 0;
      let totalSize = 0;
      const fileStats = [];

      for (const item of copiedItems) {
        if (item.type === 'folder') {
          // Calculer récursivement les stats du dossier
          const stats = await calculateFolderStats(item.path);
          totalFiles += stats.totalFiles;
          totalSize += stats.totalSize;
          fileStats.push({ item, files: stats.totalFiles, size: stats.totalSize });
        } else {
          // Pour un fichier, récupérer sa taille depuis l'API si non disponible
          let fileSize = item.size || 0;
          
          // Si la taille n'est pas disponible, la récupérer depuis l'API
          if (!fileSize) {
            try {
              const contentResponse = await axios.get(`${API_BASE_URL}/list-content/`, {
                params: { 
                  folder_path: item.path.substring(0, item.path.lastIndexOf('/') + 1) 
                },
                withCredentials: true,
              });
              
              const file = contentResponse.data.files?.find(f => f.path === item.path);
              if (file && file.size) {
                fileSize = file.size;
              }
            } catch (error) {
              console.warn(`Impossible de récupérer la taille du fichier ${item.name}:`, error);
            }
          }
          
          totalFiles += 1;
          totalSize += fileSize;
          fileStats.push({ item, files: 1, size: fileSize });
        }
      }

      // Notifier le début avec les stats totales
      if (onProgress) {
        onProgress({
          phase: 'upload',
          progress: 0,
          loaded: 0,
          total: totalSize,
          currentItem: '',
          currentItemIndex: 0,
          totalItems: totalFiles,
        });
      }

      // ÉTAPE 2 : Copier les éléments avec suivi de progression
      const results = [];
      let currentFileIndex = 0;
      let previousItemsSize = 0; // Taille totale des éléments précédents (déjà complétés à 100%)

      for (let itemIndex = 0; itemIndex < copiedItems.length; itemIndex++) {
        const item = copiedItems[itemIndex];
        const stats = fileStats[itemIndex];

        try {
          // Créer un wrapper pour le callback de progression qui calcule la progression globale
          const itemProgressCallback = onProgress ? (progressData) => {
            // progressData contient la progression de l'élément actuel (fichier ou dossier)
            const currentItemProgress = progressData.progress || 0;
            
            // Calculer la taille chargée pour cet élément
            const currentItemLoaded = stats.size * currentItemProgress / 100;
            
            // Taille totale chargée = éléments précédents (100%) + élément actuel (en cours)
            const totalLoaded = previousItemsSize + currentItemLoaded;
            
            // Calculer le pourcentage global basé sur la taille
            const globalProgress = totalSize > 0 
              ? Math.round((totalLoaded / totalSize) * 100)
              : 0;

            onProgress({
              phase: progressData.phase || 'upload',
              progress: globalProgress,
              loaded: totalLoaded,
              total: totalSize,
              currentItem: item.name,
              currentItemIndex: currentFileIndex,
              totalItems: totalFiles,
            });
          } : null;

          if (item.type === 'folder') {
            // Copier le dossier (le callback sera appelé pour chaque fichier dans le dossier)
            // Le callback adaptera la progression de chaque fichier à la progression globale
            await copyFolder(item.path, destinationPath, item.name, itemProgressCallback, stats, { size: 0 });
            currentFileIndex += stats.files;
            previousItemsSize += stats.size; // Ajouter la taille de ce dossier (complété à 100%)
            results.push({ success: true, item });
          } else {
            // Copier le fichier
            await copyFile(item.path, destinationPath, item.name, itemProgressCallback);
            currentFileIndex += 1;
            previousItemsSize += stats.size; // Ajouter la taille de ce fichier (complété à 100%)
            results.push({ success: true, item });
          }
        } catch (error) {
          console.error(`Erreur lors de la copie de ${item.name}:`, error);
          // Même en cas d'erreur, on compte les fichiers comme "traités"
          currentFileIndex += stats.files;
          previousItemsSize += stats.size;
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

