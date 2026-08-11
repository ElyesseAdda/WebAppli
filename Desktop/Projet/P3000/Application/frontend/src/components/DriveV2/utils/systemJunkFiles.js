/**
 * Fichiers / dossiers système à ignorer lors des uploads Drive
 * (ex. .DS_Store créé par macOS Finder, dossier __MACOSX des archives ZIP).
 */

const JUNK_FILE_NAMES = new Set([
  '.ds_store',
  'thumbs.db',
  'desktop.ini',
]);

const JUNK_FOLDER_NAMES = new Set([
  '__macosx',
]);

/**
 * @param {string} name
 * @returns {boolean}
 */
export const isSystemJunkFileName = (name) => {
  if (!name) return false;
  const lower = name.toLowerCase();
  // Fichiers AppleDouble (._nom) souvent générés avec .DS_Store
  if (lower.startsWith('._')) return true;
  return JUNK_FILE_NAMES.has(lower);
};

/**
 * @param {string} name
 * @returns {boolean}
 */
export const isSystemJunkFolderName = (name) => {
  if (!name) return false;
  return JUNK_FOLDER_NAMES.has(name.toLowerCase());
};

/**
 * True si le fichier (ou son chemin relatif) doit être exclu de l'upload.
 * @param {{ name?: string, webkitRelativePath?: string } | File} file
 * @returns {boolean}
 */
export const shouldSkipUploadFile = (file) => {
  if (!file) return true;
  if (isSystemJunkFileName(file.name)) return true;

  const relativePath = file.webkitRelativePath || '';
  if (!relativePath) return false;

  const parts = relativePath.split('/').filter(Boolean);
  if (parts.some((part) => isSystemJunkFolderName(part))) return true;
  if (parts.some((part) => isSystemJunkFileName(part))) return true;
  return false;
};
