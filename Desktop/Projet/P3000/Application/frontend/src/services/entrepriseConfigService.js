import axios from "../utils/axios";

/**
 * Service pour récupérer la configuration de l'entreprise (multi-client).
 * Les données sont mises en cache pour éviter des appels API répétés.
 */
class EntrepriseConfigService {
  constructor() {
    this._config = null;
    this._promise = null;
  }

  /**
   * Récupère la configuration entreprise (avec cache).
   * @returns {Promise<Object>} Configuration entreprise
   */
  async getConfig() {
    // Si déjà en cache, retourner directement
    if (this._config) {
      return this._config;
    }

    // Si un appel est déjà en cours, attendre le même
    if (this._promise) {
      return this._promise;
    }

    this._promise = axios
      .get("/entreprise-config/")
      .then((response) => {
        this._config = response.data;
        this._promise = null;
        return this._config;
      })
      .catch((error) => {
        console.warn("Impossible de charger la config entreprise:", error);
        this._promise = null;
        // Valeurs par défaut si l'API échoue
        return {
          nom: "",
          nom_application: "Webapplication P3000",
          domaine_public: "",
        };
      });

    return this._promise;
  }

  /**
   * Retourne la config en cache (synchrone). Null si pas encore chargée.
   */
  getCachedConfig() {
    return this._config;
  }

  /**
   * Invalide le cache pour forcer un rechargement.
   */
  clearCache() {
    this._config = null;
    this._promise = null;
  }
}

const entrepriseConfigService = new EntrepriseConfigService();
export default entrepriseConfigService;
