import { useState, useEffect } from "react";

/**
 * Hook pour détecter si l'utilisateur est sur un appareil mobile
 * @returns {boolean} true si mobile, false sinon
 */
export const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      // Détection basée sur la largeur de l'écran (mobile-first)
      const isMobileWidth = window.innerWidth < 768;
      
      // Détection basée sur le User-Agent (optionnel, plus précis)
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      // Combinaison des deux pour plus de précision
      setIsMobile(isMobileWidth || isMobileUserAgent);
    };

    // Vérifier au chargement
    checkMobile();

    // Écouter les changements de taille de fenêtre
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  return isMobile;
};
