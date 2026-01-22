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
      console.log('[OnlyOffice Debug] DocsAPI déjà disponible');
      return Promise.resolve();
    }

    // Vérifier si le script est déjà chargé dans le DOM (depuis le template HTML)
    const existingScript = document.querySelector('script[src*="api.js"]');
    if (existingScript) {
      console.log('[OnlyOffice Debug] Script api.js trouvé dans le DOM, attente du chargement...');
      
      // Si le script est déjà chargé (onload a déjà été appelé)
      if (window.DocsAPI && window.DocsAPI.DocEditor) {
        console.log('[OnlyOffice Debug] DocsAPI disponible depuis le script existant');
        return Promise.resolve();
      }
      
      // Attendre que le script existant se charge
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout lors du chargement du script (10s) - Vérifiez que OnlyOffice est démarré et accessible'));
        }, 10000);
        
        // Vérifier périodiquement si DocsAPI est disponible
        const checkInterval = setInterval(() => {
          if (window.DocsAPI && window.DocsAPI.DocEditor) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            console.log('[OnlyOffice Debug] DocsAPI disponible après attente');
            resolve();
          }
        }, 100);
        
        existingScript.onload = () => {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          if (window.DocsAPI && window.DocsAPI.DocEditor) {
            console.log('[OnlyOffice Debug] Script chargé, DocsAPI disponible');
            resolve();
          } else {
            reject(new Error('Script chargé mais DocsAPI non disponible - Vérifiez la console pour les erreurs'));
          }
        };
        
        existingScript.onerror = () => {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          const scriptUrl = existingScript.src;
          reject(new Error(`Erreur lors du chargement du script OnlyOffice depuis ${scriptUrl} - Vérifiez que OnlyOffice est démarré`));
        };
      });
    }

    // Charger le script dynamiquement si pas déjà dans le DOM
    // Récupérer l'URL depuis le script existant ou utiliser une URL par défaut
    let onlyofficeUrl = 'http://localhost:8080'; // Par défaut en local
    
    // Chercher l'URL dans un script existant ou dans une variable globale
    const existingOnlyOfficeScript = document.querySelector('script[src*="onlyoffice"], script[src*="api.js"]');
    if (existingOnlyOfficeScript) {
      const src = existingOnlyOfficeScript.src;
      // Extraire l'URL de base (ex: http://localhost:8080 depuis http://localhost:8080/web-apps/apps/api/documents/api.js)
      const match = src.match(/^(https?:\/\/[^\/]+)/);
      if (match) {
        onlyofficeUrl = match[1];
      }
    } else if (window.ONLYOFFICE_SERVER_URL) {
      // Si une variable globale existe
      onlyofficeUrl = window.ONLYOFFICE_SERVER_URL;
    }
    
    const scriptUrl = `${onlyofficeUrl}/web-apps/apps/api/documents/api.js`;
    console.log(`[OnlyOffice Debug] Chargement dynamique du script depuis: ${scriptUrl}`);
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout lors du chargement du script depuis ${scriptUrl} (10s) - Vérifiez que OnlyOffice est démarré sur ${onlyofficeUrl}`));
      }, 10000);
      
      script.onload = () => {
        clearTimeout(timeout);
        console.log('[OnlyOffice Debug] Script api.js chargé dynamiquement');
        // Attendre un peu pour que DocsAPI soit initialisé
        setTimeout(() => {
          if (window.DocsAPI && window.DocsAPI.DocEditor) {
            resolve();
          } else {
            reject(new Error('Script chargé mais DocsAPI non disponible - Vérifiez la console pour les erreurs'));
          }
        }, 500);
      };
      
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error(`Erreur lors du chargement du script OnlyOffice depuis ${scriptUrl} - Vérifiez que OnlyOffice est démarré et accessible`));
      };
      
      document.head.appendChild(script);
    });
  }

  static invalidateCache() {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(`${CACHE_KEY}_time`);
  }
}

export default OnlyOfficeCache;
