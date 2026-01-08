/**
 * OnlyOffice Cache - Cache global pour la disponibilité OnlyOffice
 */

const CACHE_KEY = 'onlyoffice_available';
const CACHE_DURATION = 3600000; // 1h en ms

class OnlyOfficeCache {
  static async checkAvailability() {
    // CRITIQUE : Vérifier d'abord si DocsAPI est disponible dans le navigateur
    // C'est la vérification la plus fiable car elle confirme que le script est chargé
    if (window.DocsAPI && window.DocsAPI.DocEditor) {
      console.log('[OnlyOffice Debug] DocsAPI is available in browser');
      // Mettre en cache comme disponible
      sessionStorage.setItem(CACHE_KEY, 'true');
      sessionStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString());
      return true;
    }

    // Vérifier le cache d'abord
    const cached = sessionStorage.getItem(CACHE_KEY);
    const cacheTime = sessionStorage.getItem(`${CACHE_KEY}_time`);
    
    if (cached !== null && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < CACHE_DURATION) {
        return cached === 'true';
      }
    }

    // Vérifier l'API (serveur OnlyOffice)
    try {
      const response = await fetch('/api/drive-v2/check-onlyoffice/');
      const data = await response.json();
      
      // CRITIQUE : Vérifier aussi que DocsAPI est disponible
      // Même si le serveur est disponible, si le script n'est pas chargé, on ne peut pas l'utiliser
      const docsApiAvailable = window.DocsAPI && window.DocsAPI.DocEditor;
      const isAvailable = data.available && docsApiAvailable;
      
      // Mettre en cache
      sessionStorage.setItem(CACHE_KEY, isAvailable.toString());
      sessionStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString());
      
      if (data.available && !docsApiAvailable) {
        console.warn('[OnlyOffice Debug] Serveur OnlyOffice disponible mais script api.js non chargé');
      }
      
      return isAvailable;
    } catch (err) {
      sessionStorage.setItem(CACHE_KEY, 'false');
      sessionStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString());
      return false;
    }
  }
  
  /**
   * Force le chargement du script OnlyOffice si nécessaire
   */
  static async ensureScriptLoaded() {
    // Si DocsAPI est déjà disponible, rien à faire
    if (window.DocsAPI && window.DocsAPI.DocEditor) {
      return Promise.resolve();
    }

    // Vérifier si le script est déjà en cours de chargement
    const existingScript = document.querySelector('script[src*="api.js"]');
    if (existingScript) {
      // Attendre que le script existant se charge
      return new Promise((resolve, reject) => {
        existingScript.onload = () => {
          if (window.DocsAPI && window.DocsAPI.DocEditor) {
            resolve();
          } else {
            reject(new Error('Script chargé mais DocsAPI non disponible'));
          }
        };
        existingScript.onerror = () => reject(new Error('Erreur lors du chargement du script'));
        
        // Timeout après 10 secondes
        setTimeout(() => reject(new Error('Timeout lors du chargement du script')), 10000);
      });
    }

    // Charger le script dynamiquement
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      // Utiliser l'URL du reverse proxy Nginx
      script.src = `${window.location.origin}/onlyoffice/web-apps/apps/api/documents/api.js`;
      script.async = true;
      
      script.onload = () => {
        console.log('[OnlyOffice Debug] Script api.js chargé dynamiquement');
        // Vérifier que DocsAPI est disponible
        if (window.DocsAPI && window.DocsAPI.DocEditor) {
          resolve();
        } else {
          reject(new Error('Script chargé mais DocsAPI non disponible'));
        }
      };
      
      script.onerror = () => {
        reject(new Error('Erreur lors du chargement du script OnlyOffice'));
      };
      
      document.head.appendChild(script);
      
      // Timeout après 10 secondes
      setTimeout(() => reject(new Error('Timeout lors du chargement du script')), 10000);
    });
  }

  static invalidateCache() {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(`${CACHE_KEY}_time`);
  }
}

export default OnlyOfficeCache;
