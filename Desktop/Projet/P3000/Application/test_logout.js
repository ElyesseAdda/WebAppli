// Script de test pour vérifier la déconnexion
// Ce script peut être exécuté dans la console du navigateur pour tester la déconnexion

async function testLogout() {
  console.log("Test de déconnexion...");

  try {
    // Test de la route de déconnexion
    const response = await fetch("/api/auth/logout/", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
    });

    const data = await response.json();
    console.log("Réponse de déconnexion:", data);

    if (response.ok) {
      console.log("✅ Déconnexion réussie");

      // Vérifier que les cookies ont été supprimés
      const sessionCookie = getCookie("sessionid");
      const csrfCookie = getCookie("csrftoken");

      console.log("Cookie sessionid:", sessionCookie);
      console.log("Cookie csrftoken:", csrfCookie);

      if (!sessionCookie) {
        console.log("✅ Cookie de session supprimé");
      } else {
        console.log("❌ Cookie de session toujours présent");
      }
    } else {
      console.log("❌ Erreur lors de la déconnexion");
    }
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

// Fonction utilitaire pour récupérer un cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

// Fonction pour tester la vérification d'authentification
async function testAuthCheck() {
  console.log("Test de vérification d'authentification...");

  try {
    const response = await fetch("/api/auth/check/", {
      credentials: "include",
    });

    const data = await response.json();
    console.log("Statut d'authentification:", data);

    if (data.authenticated) {
      console.log("✅ Utilisateur connecté");
    } else {
      console.log("❌ Utilisateur non connecté");
    }
  } catch (error) {
    console.error("❌ Erreur:", error);
  }
}

// Exporter les fonctions pour utilisation dans la console
window.testLogout = testLogout;
window.testAuthCheck = testAuthCheck;

console.log("Script de test chargé. Utilisez:");
console.log("- testLogout() pour tester la déconnexion");
console.log("- testAuthCheck() pour vérifier l'authentification");
