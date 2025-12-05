/**
 * usePreload Hook - Préchargement intelligent des fichiers Office uniquement
 */

import { useEffect, useRef } from 'react';

const URL_CACHE = new Map();
const CACHE_DURATION = 7200000; // 2h en ms

export const usePreload = () => {
  const preloadingRef = useRef(new Set());

  // Vérifier si c'est un fichier Office
  const isOfficeFile = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    return ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension);
  };

  // Précharger l'URL OnlyOffice d'un fichier
  const preloadOfficeUrl = async (filePath) => {
    if (preloadingRef.current.has(filePath)) return;
    
    const cached = URL_CACHE.get(filePath);
    if (cached && Date.now() < cached.expires) {
      return cached.url;
    }

    preloadingRef.current.add(filePath);

    try {
      const response = await fetch(
        `/api/drive-v2/display-url/?file_path=${encodeURIComponent(filePath)}`
      );

      if (response.ok) {
        const data = await response.json();
        URL_CACHE.set(filePath, {
          url: data.display_url,
          expires: Date.now() + CACHE_DURATION,
        });
        return data.display_url;
      }
    } catch (error) {
      // Silencieux
    } finally {
      preloadingRef.current.delete(filePath);
    }

    return null;
  };

  // Précharger les fichiers Office visibles
  const preloadOfficeFiles = async (files, limit = 10) => {
    // Filtrer uniquement les fichiers Office
    const officeFiles = files
      .filter(file => isOfficeFile(file.name))
      .slice(0, limit);
    
    // Précharger en arrière-plan
    await Promise.all(
      officeFiles.map(file => preloadOfficeUrl(file.path))
    );
  };

  // Récupérer une URL du cache
  const getCachedUrl = (filePath) => {
    const cached = URL_CACHE.get(filePath);
    if (cached && Date.now() < cached.expires) {
      return cached.url;
    }
    return null;
  };

  // Nettoyer le cache expiré
  const cleanCache = () => {
    const now = Date.now();
    for (const [key, value] of URL_CACHE.entries()) {
      if (now >= value.expires) {
        URL_CACHE.delete(key);
      }
    }
  };

  useEffect(() => {
    const interval = setInterval(cleanCache, 300000);
    return () => clearInterval(interval);
  }, []);

  return {
    preloadOfficeFiles,
    getCachedUrl,
    isOfficeFile,
  };
};
