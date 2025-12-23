/**
 * Service de normalisation des chemins - Point centralisé unique
 * 
 * Ce service garantit que la normalisation des noms de fichiers et dossiers
 * est identique entre le frontend et le backend, évitant ainsi les doublons
 * et les erreurs de chemin lors de l'upload de dossiers avec caractères spéciaux.
 * 
 * RÈGLES DE NORMALISATION (identiques au backend Python):
 * - Remplacer les espaces par des underscores
 * - Ne garder que les caractères alphanumériques, underscores, tirets, points, parenthèses
 * - Éviter les underscores multiples consécutifs
 * - Supprimer les underscores au début et à la fin
 */

/**
 * Normalise un nom de fichier ou dossier
 * Cette fonction doit être STRICTEMENT identique à normalize_filename() du backend Python
 * 
 * RÈGLE : Remplacer UNIQUEMENT les espaces par des underscores
 * AWS S3 accepte tous les caractères spéciaux SAUF les espaces
 * 
 * @param {string} filename - Nom du fichier/dossier à normaliser
 * @returns {string} - Nom normalisé
 */
export const normalizeFilename = (filename) => {
  if (!filename || filename === '') {
    return filename;
  }

  // Remplacer UNIQUEMENT les espaces par des underscores
  // Tous les autres caractères spéciaux (&, @, #, etc.) sont autorisés par AWS S3
  const normalized = filename.replace(/ /g, '_');

  return normalized;
};

/**
 * Normalise tous les segments d'un chemin
 * Cette fonction doit être STRICTEMENT identique à normalize_path_segments() du backend Python
 * 
 * @param {string} path - Chemin à normaliser (ex: "dossier parent/fichier avec espaces.pdf")
 * @returns {string} - Chemin normalisé (ex: "dossier_parent/fichier_avec_espaces.pdf")
 */
export const normalizePathSegments = (path) => {
  if (!path || path === '') {
    return path;
  }

  // Séparer le chemin en segments
  const segments = path.split('/');

  // Normaliser chaque segment
  const normalizedSegments = segments.map(segment => {
    if (segment === '') {
      // Garder les slashes vides (pour les chemins absolus)
      return '';
    }
    // Normaliser le segment
    return normalizeFilename(segment);
  });

  // Rejoindre les segments
  return normalizedSegments.join('/');
};

/**
 * Normalise un chemin complet en préservant les slashes finaux pour les dossiers
 * 
 * @param {string} path - Chemin à normaliser
 * @param {boolean} isFolder - True si c'est un dossier (ajoutera un slash final)
 * @returns {string} - Chemin normalisé
 */
export const normalizePath = (path, isFolder = false) => {
  if (!path || path === '') {
    return isFolder ? '' : '';
  }

  // Normaliser tous les segments
  let normalized = normalizePathSegments(path);

  // Supprimer les slashes au début et à la fin
  normalized = normalized.replace(/^\/+|\/+$/g, '');

  // Ajouter un slash final pour les dossiers si nécessaire
  if (isFolder && normalized !== '' && !normalized.endsWith('/')) {
    normalized += '/';
  }

  return normalized;
};

/**
 * Calcule le chemin de destination normalisé pour un fichier lors de l'upload
 * 
 * @param {File} file - Fichier à uploader
 * @param {string} currentPath - Chemin actuel du navigateur
 * @param {string} rootFolderName - Nom du dossier racine (pour les uploads de dossiers)
 * @returns {string} - Chemin de destination normalisé
 */
export const calculateNormalizedFilePath = (file, currentPath, rootFolderName = null) => {
  // Si le fichier a un chemin relatif (dans un dossier uploadé)
  if (file.webkitRelativePath && file.webkitRelativePath !== '') {
    const relativePath = file.webkitRelativePath;
    const pathParts = relativePath.split('/');
    
    // Si le fichier est dans un sous-dossier, préserver la structure
    if (pathParts.length > 1) {
      // Enlever le nom du fichier pour obtenir le chemin du dossier
      const folderPath = pathParts.slice(0, -1).join('/');
      
      // Normaliser le chemin du dossier
      const normalizedFolderPath = normalizePathSegments(folderPath);
      
      // Combiner avec le chemin actuel
      const normalizedCurrentPath = currentPath ? currentPath.replace(/\/$/, '') + '/' : '';
      return normalizedCurrentPath + normalizedFolderPath + '/';
    } else {
      // Fichier à la racine du dossier sélectionné
      // Utiliser le nom du dossier racine normalisé comme chemin
      if (rootFolderName) {
        const normalizedCurrentPath = currentPath ? currentPath.replace(/\/$/, '') + '/' : '';
        const normalizedRootFolder = normalizeFilename(rootFolderName);
        return normalizedCurrentPath + normalizedRootFolder + '/';
      }
    }
  }
  
  // Sinon, utiliser le chemin actuel normal
  return currentPath || '';
};

/**
 * Extrait le nom du dossier racine depuis les fichiers (normalisé)
 * 
 * @param {File[]} files - Liste de fichiers
 * @returns {string|null} - Nom du dossier racine normalisé
 */
export const extractRootFolderName = (files) => {
  if (!files || files.length === 0) {
    return null;
  }
  
  // Prendre le premier fichier qui a un webkitRelativePath avec au moins un dossier
  const firstFileWithPath = files.find(f => {
    const path = f.webkitRelativePath;
    return path && path !== '' && path.includes('/');
  });
  
  if (!firstFileWithPath) {
    return null;
  }
  
  // Le premier élément du chemin relatif est le nom du dossier racine
  const pathParts = firstFileWithPath.webkitRelativePath.split('/');
  const rootFolderName = pathParts[0];
  
  // Retourner le nom normalisé
  return normalizeFilename(rootFolderName);
};

/**
 * Construit le chemin complet normalisé pour un dossier
 * 
 * @param {string} parentPath - Chemin du dossier parent
 * @param {string} folderName - Nom du dossier
 * @returns {string} - Chemin complet normalisé avec slash final
 */
export const buildFolderPath = (parentPath, folderName) => {
  const normalizedParent = parentPath ? parentPath.replace(/\/$/, '') + '/' : '';
  const normalizedFolderName = normalizeFilename(folderName);
  return normalizedParent + normalizedFolderName + '/';
};

/**
 * Construit le chemin complet normalisé pour un fichier
 * 
 * @param {string} folderPath - Chemin du dossier contenant le fichier
 * @param {string} fileName - Nom du fichier
 * @returns {string} - Chemin complet normalisé
 */
export const buildFilePath = (folderPath, fileName) => {
  const normalizedFolder = folderPath ? folderPath.replace(/\/$/, '') + '/' : '';
  const normalizedFileName = normalizeFilename(fileName);
  return normalizedFolder + normalizedFileName;
};

/**
 * Valide qu'un nom de fichier ou dossier est valide après normalisation
 * 
 * @param {string} name - Nom à valider
 * @returns {boolean} - True si valide
 */
export const isValidName = (name) => {
  if (!name || name === '') {
    return false;
  }
  
  // Après normalisation, le nom ne doit pas être vide
  const normalized = normalizeFilename(name);
  return normalized && normalized !== '';
};

/**
 * Collecte tous les chemins de dossiers uniques depuis une liste de fichiers
 * avec leurs chemins normalisés
 * 
 * @param {File[]} files - Liste de fichiers
 * @param {string} currentPath - Chemin actuel
 * @param {string} rootFolderName - Nom du dossier racine
 * @returns {Set<string>} - Set de chemins de dossiers normalisés
 */
export const collectFolderPaths = (files, currentPath, rootFolderName) => {
  const folderPaths = new Set();
  
  files.forEach((file) => {
    const fileDestinationPath = calculateNormalizedFilePath(file, currentPath, rootFolderName);
    
    if (fileDestinationPath && fileDestinationPath !== (currentPath || '')) {
      folderPaths.add(fileDestinationPath);
    }
  });
  
  return folderPaths;
};

export default {
  normalizeFilename,
  normalizePathSegments,
  normalizePath,
  calculateNormalizedFilePath,
  extractRootFolderName,
  buildFolderPath,
  buildFilePath,
  isValidName,
  collectFolderPaths,
};

