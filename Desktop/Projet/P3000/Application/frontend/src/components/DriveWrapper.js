import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Drive from './Drive';
import MobileDrive from './MobileDrive';

const DriveWrapper = () => {
  const [searchParams] = useSearchParams();
  const [isMobile, setIsMobile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectMobile = () => {
      // Vérifier le paramètre URL
      const mobileParam = searchParams.get('mobile');
      if (mobileParam === 'true') {
        setIsMobile(true);
        setIsLoading(false);
        return;
      }

      // Détection automatique
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
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
      
      const isSmallScreen = window.innerWidth <= 768;
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isMobileDevice = mobilePatterns.some(pattern => pattern.test(userAgent)) || 
                            (isSmallScreen && isTouchDevice);
      
      setIsMobile(isMobileDevice);
      setIsLoading(false);
    };

    detectMobile();
    
    // Réécouter les changements de taille d'écran
    const handleResize = () => {
      detectMobile();
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [searchParams]);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        fontSize: '18px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            width: '50px', 
            height: '50px', 
            border: '3px solid rgba(255,255,255,0.3)',
            borderTop: '3px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }} />
          <div>Détection de l'appareil...</div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  return isMobile ? <MobileDrive /> : <Drive />;
};

export default DriveWrapper;
