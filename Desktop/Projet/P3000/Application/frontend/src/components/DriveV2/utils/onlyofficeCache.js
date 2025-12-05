/**
 * OnlyOffice Cache - Cache global pour la disponibilité OnlyOffice
 */

const CACHE_KEY = 'onlyoffice_available';
const CACHE_DURATION = 3600000; // 1h en ms

class OnlyOfficeCache {
  static async checkAvailability() {
    // Vérifier le cache d'abord
    const cached = sessionStorage.getItem(CACHE_KEY);
    const cacheTime = sessionStorage.getItem(`${CACHE_KEY}_time`);
    
    if (cached !== null && cacheTime) {
      const age = Date.now() - parseInt(cacheTime);
      if (age < CACHE_DURATION) {
        return cached === 'true';
      }
    }

    // Vérifier l'API
    try {
      const response = await fetch('/api/drive-v2/check-onlyoffice/');
      const data = await response.json();
      
      // Mettre en cache
      sessionStorage.setItem(CACHE_KEY, data.available);
      sessionStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString());
      
      return data.available;
    } catch (err) {
      sessionStorage.setItem(CACHE_KEY, 'false');
      sessionStorage.setItem(`${CACHE_KEY}_time`, Date.now().toString());
      return false;
    }
  }

  static invalidateCache() {
    sessionStorage.removeItem(CACHE_KEY);
    sessionStorage.removeItem(`${CACHE_KEY}_time`);
  }
}

export default OnlyOfficeCache;
