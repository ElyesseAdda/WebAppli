class CacheManager {
  static clearAppCache() {
    // Vider le cache de l'application
    if ("caches" in window) {
      caches.keys().then((names) => {
        names.forEach((name) => caches.delete(name));
      });
    }

    // Vider le localStorage
    localStorage.clear();

    // Vider le sessionStorage
    sessionStorage.clear();
  }

  static setCacheVersion(version) {
    localStorage.setItem("app_version", version);
  }

  static checkForUpdates() {
    const currentVersion = localStorage.getItem("app_version");
    const serverVersion = process.env.REACT_APP_VERSION || "1.0.0";

    if (currentVersion !== serverVersion) {
      this.clearAppCache();
      this.setCacheVersion(serverVersion);
      return true; // Mise à jour détectée
    }
    return false;
  }

  static clearUserData() {
    // Supprimer seulement les données utilisateur, pas tout le cache
    localStorage.removeItem("user");
    sessionStorage.removeItem("user");
  }

  static setLastActivity() {
    localStorage.setItem("last_activity", Date.now().toString());
  }

  static checkInactivity(timeoutMinutes = 60) {
    const lastActivity = localStorage.getItem("last_activity");
    if (lastActivity) {
      const now = Date.now();
      const lastActivityTime = parseInt(lastActivity);
      const inactiveTime = now - lastActivityTime;
      const timeoutMs = timeoutMinutes * 60 * 1000;

      if (inactiveTime > timeoutMs) {
        this.clearUserData();
        return true; // Inactif trop longtemps
      }
    }
    return false;
  }
}

export default CacheManager;
