import axios from "../utils/axios";

class AuthService {
  constructor() {
    this.isAuthenticated = false;
    this.user = null;
    this.listeners = [];
  }

  // Vérifier l'authentification
  async checkAuth() {
    try {
      // Vérifier d'abord la version de l'application
      const versionResponse = await axios.get("/app-version/");
      const currentVersion = versionResponse.data.version;
      const storedVersion = localStorage.getItem("app_version");

      // Si la version a changé, forcer la déconnexion
      if (storedVersion && storedVersion !== currentVersion) {
        console.log(
          `Version de l'application mise à jour: ${storedVersion} → ${currentVersion}`
        );
        await this.forceLogout();
        return false;
      }

      // Mettre à jour la version stockée
      localStorage.setItem("app_version", currentVersion);

      const response = await axios.get("/auth/check/");
      if (response.data.authenticated) {
        this.isAuthenticated = true;
        this.user = response.data.user;
        this.notifyListeners();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Erreur vérification auth:", error);
      return false;
    }
  }

  // Connexion
  async login(credentials) {
    try {
      const response = await axios.post("/auth/login/", credentials);
      if (response.data.success) {
        this.isAuthenticated = true;
        this.user = response.data.user;
        this.notifyListeners();
        return { success: true, user: response.data.user };
      }
      return { success: false, error: response.data.error };
    } catch (error) {
      return { success: false, error: "Erreur de connexion" };
    }
  }

  // Déconnexion normale
  async logout() {
    try {
      await axios.post("/auth/logout/");
      return await this.cleanupAfterLogout();
    } catch (error) {
      console.error("Erreur lors de la déconnexion:", error);
      return await this.cleanupAfterLogout();
    }
  }

  // Déconnexion forcée (pour les mises à jour)
  async forceLogout() {
    console.log("Déconnexion forcée suite à une mise à jour de l'application");
    return await this.cleanupAfterLogout();
  }

  // Nettoyage après déconnexion
  async cleanupAfterLogout() {
    // Nettoyer l'état local
    this.isAuthenticated = false;
    this.user = null;

    // Nettoyer le localStorage
    localStorage.removeItem("user");
    localStorage.removeItem("chantier_history");

    // Nettoyer les cookies côté client
    document.cookie.split(";").forEach(function (c) {
      document.cookie = c
        .replace(/^ +/, "")
        .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
    });

    this.notifyListeners();
    return { success: true };
  }

  // Gestion des listeners pour les changements d'état
  addListener(callback) {
    this.listeners.push(callback);
    return () =>
      (this.listeners = this.listeners.filter((l) => l !== callback));
  }

  notifyListeners() {
    this.listeners.forEach((callback) =>
      callback(this.isAuthenticated, this.user)
    );
  }

  // Getters
  getAuthStatus() {
    return { isAuthenticated: this.isAuthenticated, user: this.user };
  }
}

export default new AuthService();
