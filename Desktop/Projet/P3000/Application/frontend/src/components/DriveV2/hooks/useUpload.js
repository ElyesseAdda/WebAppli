/**
 * useUpload Hook - Gestion de l'upload de fichiers
 */

import { useState, useCallback } from 'react';
import axios from 'axios';
import {
  normalizeFilename,
  calculateNormalizedFilePath,
  extractRootFolderName,
  buildFilePath,
  collectFolderPaths,
} from '../services/pathNormalizationService';

const API_BASE_URL = '/api/drive-v2';

export const useUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({});
  const [errors, setErrors] = useState({});

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

  // SUPPRIMÉ: extractRootFolderName et calculateFilePath
  // Ces fonctions sont maintenant dans pathNormalizationService.js
  // et sont importées en haut du fichier

  // Vérifier si un fichier existe déjà
  const checkFileExists = async (fileName, filePath) => {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/list-content/`,
        {
          params: { folder_path: filePath },
          withCredentials: true,
        }
      );
      
      const files = response.data.files || [];
      // Normaliser le nom du fichier avec le service centralisé
      const normalizedFileName = normalizeFilename(fileName);
      
      return files.some(f => {
        // Les noms dans le backend sont déjà normalisés
        // Comparer directement
        return f.name === normalizedFileName;
      });
    } catch (error) {
      // En cas d'erreur, considérer que le fichier n'existe pas pour ne pas bloquer l'upload
      console.error('Erreur lors de la vérification du fichier:', error);
      return false;
    }
  };

  // Trouver un nom de fichier disponible en ajoutant un numéro
  const findAvailableFileName = async (originalFileName, filePath) => {
    // Extraire le nom et l'extension
    const lastDotIndex = originalFileName.lastIndexOf('.');
    const hasExtension = lastDotIndex > 0;
    const baseName = hasExtension ? originalFileName.substring(0, lastDotIndex) : originalFileName;
    const extension = hasExtension ? originalFileName.substring(lastDotIndex) : '';
    
    // Essayer avec des numéros incrémentaux entre parenthèses
    for (let i = 1; i <= 1000; i++) {
      const candidateName = `${baseName}_(${i})${extension}`;
      // Normaliser le nom candidat avec le service centralisé
      const normalizedCandidateName = normalizeFilename(candidateName);
      const exists = await checkFileExists(normalizedCandidateName, filePath);
      
      if (!exists) {
        // Retourner le nom original (sera normalisé plus tard)
        return candidateName;
      }
    }
    
    // Si on n'a pas trouvé, retourner avec un timestamp
    const timestamp = Date.now();
    return `${baseName}_(${timestamp})${extension}`;
  };

  // Upload d'un fichier
  const uploadFile = async (file, currentPath, rootFolderName = null, replaceExisting = false, newFileName = null) => {
    try {
      // Calculer le chemin de destination normalisé (peut inclure des sous-dossiers)
      const fileDestinationPath = calculateNormalizedFilePath(file, currentPath, rootFolderName);
      
      // Déterminer le nom du fichier à utiliser (normalisé)
      const fileNameToUse = normalizeFilename(newFileName || file.name);
      
      // Déterminer le Content-Type du fichier
      // S'assurer qu'on utilise un type valide, sinon utiliser application/octet-stream
      let fileContentType = file.type || 'application/octet-stream';
      // Si le type est vide ou invalide, détecter par extension
      if (!fileContentType || fileContentType === '' || fileContentType === 'application/octet-stream') {
        const extension = fileNameToUse.split('.').pop()?.toLowerCase();
        const mimeTypeMap = {
          'dwg': 'application/acad',
          'dxf': 'application/dxf',
          'pdf': 'application/pdf',
          'doc': 'application/msword',
          'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'xls': 'application/vnd.ms-excel',
          'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'ppt': 'application/vnd.ms-powerpoint',
          'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        };
        fileContentType = mimeTypeMap[extension] || 'application/octet-stream';
      }
      
      // Si on doit remplacer un fichier existant, le supprimer d'abord
      if (replaceExisting) {
        try {
          // Construire le chemin complet normalisé avec le service centralisé
          const fullFilePath = buildFilePath(fileDestinationPath, file.name);
          
          await axios.delete(
            `${API_BASE_URL}/delete-item/`,
            {
              params: { 
                item_path: fullFilePath,
                item_type: 'file'
              },
              withCredentials: true,
              headers: {
                'X-CSRFToken': getCookie('csrftoken'),
              },
            }
          );
        } catch (deleteError) {
          // Si la suppression échoue, continuer quand même l'upload
          console.warn('Impossible de supprimer le fichier existant:', deleteError);
        }
      }
      
      // 1. Obtenir l'URL d'upload
      const uploadUrlResponse = await axios.post(
        `${API_BASE_URL}/upload-url/`,
        {
          file_path: fileDestinationPath,
          file_name: fileNameToUse,
          content_type: fileContentType,
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

      // 2. Upload direct vers S3
      const formData = new FormData();
      
      // Ajouter tous les champs de la signature retournés par le backend
      // boto3 generate_presigned_post retourne généralement: key, AWSAccessKeyId, policy, signature, Content-Type, acl
      Object.keys(fields).forEach((key) => {
        formData.append(key, fields[key]);
      });
      
      // Ajouter le fichier EN DERNIER (important pour S3)
      // Le nom du champ doit être 'file' pour S3 presigned POST
      formData.append('file', file);

      // Utiliser le chemin relatif comme clé pour le suivi du progrès
      const progressKey = file.webkitRelativePath || file.name;

      // Upload vers S3 sans credentials (authentification via URL présignée)
      // IMPORTANT : Ne pas définir Content-Type dans les headers, laisser le navigateur le faire automatiquement
      await axios.post(upload_url, formData, {
        withCredentials: false, // Important : S3 n'accepte pas les credentials avec CORS wildcard
        // Ne pas définir de headers - le navigateur définira automatiquement Content-Type avec la boundary
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress((prev) => ({
            ...prev,
            [progressKey]: {
              progress: percentCompleted,
              complete: false,
              error: null,
            },
          }));
        },
      });

      // Marquer comme complété
      setProgress((prev) => ({
        ...prev,
        [progressKey]: {
          progress: 100,
          complete: true,
          error: null,
        },
      }));

      return true;
    } catch (error) {
      const progressKey = file.webkitRelativePath || file.name;
      
      // Extraire un message d'erreur plus détaillé
      let errorMessage = error.message;
      if (error.response) {
        // Erreur de réponse HTTP
        errorMessage = error.response.data?.error || error.response.statusText || error.message;
      } else if (error.request) {
        // Requête envoyée mais pas de réponse
        errorMessage = 'Erreur de connexion au serveur S3';
      }
      
      setProgress((prev) => ({
        ...prev,
        [progressKey]: {
          progress: 0,
          complete: false,
          error: errorMessage,
        },
      }));
      
      setErrors((prev) => ({
        ...prev,
        [progressKey]: errorMessage,
      }));

      return false;
    }
  };

  // Créer les dossiers parents nécessaires de manière récursive
  const ensureFoldersExist = async (folderPath, basePath) => {
    if (!folderPath || folderPath === basePath) {
      return; // Pas de dossiers à créer
    }

    // Normaliser les chemins
    const normalizedBase = basePath ? basePath.replace(/\/$/, '') + '/' : '';
    const normalizedFolder = folderPath.replace(/\/$/, '') + '/';
    
    // Extraire le chemin relatif
    let relativePath = normalizedFolder;
    if (normalizedBase && normalizedFolder.startsWith(normalizedBase)) {
      relativePath = normalizedFolder.slice(normalizedBase.length);
    }

    // Diviser en parties (les noms sont déjà normalisés dans le chemin)
    const parts = relativePath.split('/').filter(part => part);
    
    if (parts.length === 0) {
      return;
    }

    // Créer chaque niveau de dossier récursivement
    let currentParentPath = normalizedBase;
    
    for (const folderName of parts) {
      const fullFolderPath = currentParentPath + folderName + '/';
      
      try {
        // Note: folderName est déjà normalisé car il provient d'un chemin normalisé
        await axios.post(
          `${API_BASE_URL}/create-folder/`,
          {
            parent_path: currentParentPath,
            folder_name: folderName, // Déjà normalisé
          },
          {
            withCredentials: true,
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': getCookie('csrftoken'),
            },
          }
        );
        // Mettre à jour le chemin parent pour le prochain niveau
        currentParentPath = fullFolderPath;
      } catch (error) {
        // Si le dossier existe déjà, continuer quand même
        currentParentPath = fullFolderPath;
      }
    }
  };

  // Détecter les fichiers en conflit
  const detectConflicts = useCallback(async (files, currentPath) => {
    const rootFolderName = extractRootFolderName(files);
    const conflicts = [];

    for (const file of files) {
      const fileDestinationPath = calculateNormalizedFilePath(file, currentPath, rootFolderName);
      const exists = await checkFileExists(file.name, fileDestinationPath);
      
      if (exists) {
        conflicts.push({
          file,
          destinationPath: fileDestinationPath,
        });
      }
    }

    return conflicts;
  }, []);

  // Upload de plusieurs fichiers
  const uploadFiles = useCallback(async (files, currentPath, replaceFiles = [], renamedFilesMap = new Map()) => {
    // Filtrer pour ne garder que les fichiers (pas les dossiers)
    // IMPORTANT : Quand on sélectionne un dossier avec webkitdirectory, le navigateur peut parfois
    // retourner le dossier lui-même comme un "fichier" avec size=0 et webkitRelativePath=''
    const validFiles = files.filter((file) => {
      if (!file || !file.name) {
        console.warn('Fichier rejeté : pas de nom', file);
        return false;
      }
      
      // Si c'est un upload de dossier (webkitRelativePath existe), on doit avoir un chemin relatif
      // Un vrai fichier dans un dossier a toujours un webkitRelativePath non vide
      const hasRelativePath = file.webkitRelativePath && file.webkitRelativePath !== '';
      
      // Si on a un webkitRelativePath, c'est un fichier dans un dossier uploadé
      if (hasRelativePath) {
        // Vérifier que ce n'est pas un dossier (les dossiers ont parfois size=0 mais pas de webkitRelativePath)
        const isValid = file.size !== undefined; // Même les fichiers vides sont valides s'ils ont un chemin relatif
        if (!isValid) {
          console.warn('Fichier rejeté : dossier détecté', file.name);
        }
        return isValid;
      }
      
      // Si pas de webkitRelativePath, c'est un upload de fichier simple
      // Dans ce cas, on accepte les fichiers avec une taille >= 0 (y compris les fichiers vides)
      // MAIS on rejette ceux avec size=0 ET pas de type (probablement un dossier)
      if (file.size === 0 && (!file.type || file.type === '')) {
        console.warn('Fichier rejeté : probablement un dossier (size=0, no type)', file.name);
        return false;
      }
      
      // Fichier simple valide
      return file.size !== undefined;
    });
    
    // Logger les fichiers filtrés
    if (files.length !== validFiles.length) {
      console.log(`Upload: ${validFiles.length} fichiers valides sur ${files.length} sélectionnés`);
      console.log('Fichiers rejetés:', files.length - validFiles.length);
    }
    
    if (validFiles.length === 0) {
      return {
        success: 0,
        error: 0,
        total: 0,
        conflicts: [],
      };
    }
    
    setUploading(true);
    setProgress({});
    setErrors({});

    // Extraire le nom du dossier racine si c'est un upload de dossier (normalisé)
    const rootFolderName = extractRootFolderName(validFiles);

    // Collecter tous les chemins de dossiers uniques nécessaires (normalisés)
    const folderPaths = collectFolderPaths(validFiles, currentPath, rootFolderName);

    // Créer tous les dossiers nécessaires avant l'upload
    if (folderPaths.size > 0) {
      for (const folderPath of folderPaths) {
        await ensureFoldersExist(folderPath, currentPath || '');
      }
    }

    // Créer un Set pour vérifier rapidement si un fichier doit être remplacé
    const replaceSet = new Set(replaceFiles.map(f => {
      // Utiliser le nom original du fichier pour la comparaison
      if (typeof f === 'string') return f;
      return f.name || f.webkitRelativePath;
    }));

    // Uploader tous les fichiers
    const results = await Promise.all(
      validFiles.map(async (file) => {
        const fileKey = file.name || file.webkitRelativePath;
        const shouldReplace = replaceSet.has(file.name) || replaceSet.has(file.webkitRelativePath) || replaceSet.has(file);
        
        // Si on ne remplace pas et qu'un nouveau nom a été généré, l'utiliser
        let newFileName = null;
        if (!shouldReplace && renamedFilesMap && renamedFilesMap.has(fileKey)) {
          newFileName = renamedFilesMap.get(fileKey);
        }
        
        return uploadFile(file, currentPath, rootFolderName, shouldReplace, newFileName);
      })
    );

    setUploading(false);

    const successCount = results.filter((r) => r).length;
    const errorCount = results.filter((r) => !r).length;

    return {
      success: successCount,
      error: errorCount,
      total: validFiles.length,
      conflicts: [],
    };
  }, []);

  return {
    uploadFiles,
    detectConflicts,
    findAvailableFileName,
    uploading,
    progress,
    errors,
  };
};
