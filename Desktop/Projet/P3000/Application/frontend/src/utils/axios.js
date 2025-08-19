import axios from "axios";

// Fonction pour obtenir le token CSRF depuis les cookies
function getCSRFToken() {
  const name = "csrftoken";
  let cookieValue = null;
  if (document.cookie && document.cookie !== "") {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === name + "=") {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

// Fonction pour récupérer le token CSRF depuis le serveur
async function fetchCSRFToken() {
  try {
    // Faire une requête GET vers une URL qui génère un token CSRF
    await axios.get("/api/csrf-token/", { withCredentials: true });
    return getCSRFToken();
  } catch (error) {
    console.warn("Impossible de récupérer le token CSRF:", error);
    return null;
  }
}

// Créer une instance Axios avec configuration par défaut
const axiosInstance = axios.create({
  baseURL: "/api/",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Intercepteur pour ajouter automatiquement le token CSRF
axiosInstance.interceptors.request.use(
  async (config) => {
    let csrfToken = getCSRFToken();

    // Si pas de token CSRF, essayer de le récupérer
    if (!csrfToken) {
      csrfToken = await fetchCSRFToken();
    }

    if (csrfToken) {
      config.headers["X-CSRFToken"] = csrfToken;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // Si erreur 403 CSRF, essayer de récupérer un nouveau token et refaire la requête
    if (
      error.response &&
      error.response.status === 403 &&
      error.response.data &&
      error.response.data.detail &&
      error.response.data.detail.includes("CSRF")
    ) {
      console.log(
        "Erreur CSRF détectée, tentative de récupération du token..."
      );

      try {
        const newToken = await fetchCSRFToken();
        if (newToken) {
          // Refaire la requête avec le nouveau token
          error.config.headers["X-CSRFToken"] = newToken;
          return axiosInstance.request(error.config);
        }
      } catch (retryError) {
        console.error("Échec de la récupération du token CSRF:", retryError);
      }
    }

    console.error("Axios error:", error);
    return Promise.reject(error);
  }
);

export default axiosInstance;
