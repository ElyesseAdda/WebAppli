import axios from "axios";

// Récupérer le token CSRF depuis les cookies
function getCookie(name) {
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

// Configurer Axios avec le token CSRF
axios.defaults.headers.common["X-CSRFToken"] = getCookie("csrftoken");
axios.defaults.withCredentials = true;

export default axios;
