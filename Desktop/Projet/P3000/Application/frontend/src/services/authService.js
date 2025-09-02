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

  // Déconnexion
  async logout() {
    try {
      await axios.post("/auth/logout/");
      this.isAuthenticated = false;
      this.user = null;
      this.notifyListeners();
      return { success: true };
    } catch (error) {
      return { success: false, error: "Erreur de déconnexion" };
    }
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
