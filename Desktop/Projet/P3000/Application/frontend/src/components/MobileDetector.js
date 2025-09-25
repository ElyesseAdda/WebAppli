import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MobileDetector = ({ children }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const detectMobile = () => {
      // Détection mobile basée sur plusieurs critères
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      
      // Vérifier les patterns mobiles
      const mobilePatterns = [
        /Android/i,
        /webOS/i,
        /iPhone/i,
        /iPad/i,
        /iPod/i,
        /BlackBerry/i,
        /Windows Phone/i,
        /Mobile/i
      ];
      
      // Vérifier la taille d'écran
      const isSmallScreen = window.innerWidth <= 768;
      
      // Vérifier le touch
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Combinaison des critères
      const isMobileDevice = mobilePatterns.some(pattern => pattern.test(userAgent)) || 
                            (isSmallScreen && isTouchDevice);
      
      setIsMobile(isMobileDevice);
      setIsLoading(false);
      
      // Si mobile et pas déjà sur le drive, rediriger
      if (isMobileDevice && !window.location.pathname.includes('/drive')) {
        // Attendre un peu pour éviter les redirections multiples
        setTimeout(() => {
          navigate('/drive?mobile=true');
        }, 100);
      }
    };

    // Détection initiale
    detectMobile();
    
    // Réécouter les changements de taille d'écran
    const handleResize = () => {
      detectMobile();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [navigate]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px'
      }}>
        Détection de l'appareil...
      </div>
    );
  }

  return children;
};

export default MobileDetector;
