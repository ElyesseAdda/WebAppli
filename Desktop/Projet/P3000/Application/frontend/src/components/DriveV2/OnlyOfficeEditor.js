/**
 * OnlyOffice Editor Component - Éditeur de documents Office en ligne
 */

import React, { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Typography,
  Button,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const EditorContainer = styled(Box)(({ theme }) => ({
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#fff',
  overflow: 'hidden',
}));

const EditorContent = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  minWidth: '800px',  // Taille minimale garantie
  minHeight: '600px',  // Taille minimale garantie
  position: 'relative',
  backgroundColor: '#fff',
}));

const OnlyOfficeEditor = ({ filePath, fileName, mode = 'edit', onClose }) => {
  // Solution "Bunker" : wrapper React simple (React le gère)
  const wrapperRef = useRef(null); // Référence au wrapper React
  const innerDivRef = useRef(null); // Référence à la div OnlyOffice créée manuellement (React ne la voit pas)
  const docEditorRef = useRef(null); // Référence à l'instance OnlyOffice
  const isInitializingRef = useRef(false); // Flag pour éviter les initialisations concurrentes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  
  // ID unique et stable pour le conteneur OnlyOffice (créé manuellement)
  const editorContainerId = useMemo(() => `onlyoffice-inner-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, []);

  // Neutraliser le padding du body
  useEffect(() => {
    const originalPadding = document.body.style.paddingLeft;
    const originalMaxWidth = document.body.style.maxWidth;
    
    document.body.style.paddingLeft = '0';
    document.body.style.maxWidth = 'none';
    
    return () => {
      document.body.style.paddingLeft = originalPadding;
      document.body.style.maxWidth = originalMaxWidth;
    };
  }, []);

  // Solution SSL : Intercepter et ignorer silencieusement les erreurs Service Worker SSL
  useEffect(() => {
    // Intercepter les erreurs de Service Worker pour éviter les erreurs SSL
    const originalConsoleError = console.error;
    const handleServiceWorkerError = (message) => {
      // Ignorer silencieusement les erreurs SSL du Service Worker OnlyOffice
      if (typeof message === 'string' && 
          (message.includes('ServiceWorker') || message.includes('service_worker')) &&
          (message.includes('SSL') || message.includes('certificate') || message.includes('ERR_CERT'))) {
        console.warn('[OnlyOffice Debug] Erreur SSL Service Worker ignorée (certificat auto-signé)');
        return;
      }
      // Pour les autres erreurs, utiliser la console.error normale
      originalConsoleError.apply(console, arguments);
    };

    // Intercepter window.onerror pour capturer les erreurs non catchées
    const originalOnError = window.onerror;
    window.onerror = function(message, source, lineno, colno, error) {
      if (message && typeof message === 'string' && 
          (message.includes('ServiceWorker') || message.includes('service_worker')) &&
          (message.includes('SSL') || message.includes('certificate') || message.includes('ERR_CERT'))) {
        console.warn('[OnlyOffice Debug] Erreur SSL Service Worker ignorée (certificat auto-signé)');
        return true; // Empêcher l'affichage de l'erreur dans la console
      }
      if (originalOnError) {
        return originalOnError.apply(window, arguments);
      }
      return false;
    };

    return () => {
      console.error = originalConsoleError;
      window.onerror = originalOnError;
    };
  }, []);

  // Solution "Bunker" : Initialisation avec div créée manuellement en JS pur
  // React ne voit jamais cette div dans son Virtual DOM, donc il ne peut pas planter dessus
  useEffect(() => {
    // Sécurité : si pas de wrapper ou si DocsAPI absent, on sort
    if (!wrapperRef.current || !window.DocsAPI) {
      return;
    }

    // Si une initialisation est en cours, ne rien faire
    if (isInitializingRef.current) {
      console.log('[OnlyOffice Debug] Initialisation déjà en cours, skip...');
      return;
    }

    // Si pas de filePath ou fileName, ne pas initialiser
    if (!filePath || !fileName) {
      return;
    }

    // Si l'éditeur existe déjà, ne rien faire
    if (docEditorRef.current) {
      return;
    }

    const initEditor = async () => {
      isInitializingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        // LA MAGIE "Bunker" : Créer la div OnlyOffice MANUELLEMENT en JS pur
        // React ne "voit" pas cette div dans son Virtual DOM, donc il ne peut pas planter dessus
        const innerDiv = document.createElement('div');
        innerDiv.id = editorContainerId;
        innerDiv.style.width = "100%";
        innerDiv.style.height = "100%";
        innerDiv.style.minWidth = "800px";
        innerDiv.style.minHeight = "600px";
        innerDiv.style.position = "relative";
        
        // Stocker la référence pour le nettoyage
        innerDivRef.current = innerDiv;

        // Ajouter cette div manuelle dans le wrapper React
        wrapperRef.current.appendChild(innerDiv);

        // Récupérer la configuration depuis Django
        const response = await fetch('/api/drive-v2/onlyoffice-config/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            file_path: filePath,
            file_name: fileName,
            mode: mode,
            // Solution 2 : Utiliser le proxy Django avec authentification par token
            // OnlyOffice ne peut pas accéder directement à S3 depuis Docker (problème réseau)
            // Le proxy Django utilise un token temporaire au lieu de cookies/session
            use_proxy: true,  // true = proxy Django avec token, false = URL S3 directe (ne fonctionne pas avec Docker)
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load document configuration');
        }

        const data = await response.json();
        setConfig(data);

        // DEBUG : Afficher l'URL du fichier pour vérifier que c'est bien une URL S3
        console.log('[OnlyOffice Debug] File URL:', data.config?.document?.url);
        console.log('[OnlyOffice Debug] Full config:', JSON.stringify(data.config, null, 2));

        // Préparer la configuration pour OnlyOffice avec callbacks sécurisés
        // Solution "Bunker" : Envelopper tous les callbacks dans setTimeout(..., 0)
        // Cela sort l'exécution du cycle de rendu React actuel
        const editorConfig = {
          ...data.config,
          height: '100%',
          width: '100%',
          type: 'desktop',
          events: {
            // Solution "Bunker" : setTimeout(0) sort l'exécution du cycle de rendu React
            // Cela brise la boucle "Event -> setState -> Re-render -> Crash"
            onDocumentReady: (e) => {
              console.log('[OnlyOffice Debug] Document ready');
              // setTimeout(0) pour sortir du cycle de rendu React actuel
              setTimeout(() => {
                setLoading(false);
                isInitializingRef.current = false;
              }, 0);
            },
            onError: (event) => {
              console.error('[OnlyOffice Debug] Error:', event.data);
              // setTimeout(0) pour sortir du cycle de rendu React actuel
              setTimeout(() => {
                setError(`Erreur lors du chargement du document: ${event.data}`);
                setLoading(false);
                isInitializingRef.current = false;
              }, 0);
            },
            // Si la config Django contient d'autres événements, les envelopper aussi
            ...(data.config.events && Object.keys(data.config.events).reduce((acc, key) => {
              const originalCallback = data.config.events[key];
              if (typeof originalCallback === 'function') {
                acc[key] = (...args) => {
                  setTimeout(() => originalCallback(...args), 0);
                };
              }
              return acc;
            }, {})),
          },
        };

        // Si JWT est activé, ajouter le token
        if (data.token) {
          editorConfig.token = data.token;
        }

        // Initialiser l'éditeur OnlyOffice sur la div manuelle
        try {
          docEditorRef.current = new window.DocsAPI.DocEditor(editorContainerId, editorConfig);
        } catch (err) {
          console.error('[OnlyOffice Debug] Erreur lors de l\'initialisation:', err);
          throw err;
        }

      } catch (err) {
        setError(err.message);
        setLoading(false);
        isInitializingRef.current = false;
      }
    };

    initEditor();

    // FONCTION DE NETTOYAGE (Cruciale) - Détruit l'éditeur et retire la div manuelle
    return () => {
      const destroyEditor = async () => {
        // Détruire l'éditeur OnlyOffice
        if (docEditorRef.current) {
          try {
            docEditorRef.current.destroyEditor();
            docEditorRef.current = null;
          } catch (e) {
            console.warn('[OnlyOffice Debug] Erreur lors de la destruction de l\'éditeur:', e);
            docEditorRef.current = null;
          }
        }

        // Retirer manuellement la div qu'on a créée (Solution "Bunker")
        if (wrapperRef.current && innerDivRef.current) {
          // Vérification de sécurité avant de retirer
          if (wrapperRef.current.contains(innerDivRef.current)) {
            wrapperRef.current.removeChild(innerDivRef.current);
          }
          innerDivRef.current = null;
        }

        isInitializingRef.current = false;
      };

      destroyEditor();
    };
  }, [filePath, fileName, mode, editorContainerId]);  // Dépendances minimales

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <EditorContainer>
      <EditorContent>
        {/* Message de chargement */}
        {loading && !error && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              zIndex: 1000,
            }}
          >
            <CircularProgress size={60} />
            <Typography variant="h6">Chargement du document...</Typography>
            <Typography variant="body2" color="text.secondary">
              Initialisation de l'éditeur OnlyOffice
            </Typography>
          </Box>
        )}

        {/* Message d'erreur */}
        {error && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              maxWidth: 600,
              p: 4,
            }}
          >
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
            <Typography variant="body2" color="text.secondary" paragraph>
              Vérifications à effectuer :
            </Typography>
            <ul style={{ marginLeft: 20 }}>
              <li>Le serveur OnlyOffice est-il démarré ?</li>
              <li>L'URL du serveur est-elle correcte ?</li>
              <li>Le fichier est-il accessible ?</li>
              <li>Le JWT secret est-il correct ?</li>
            </ul>
            <Button
              variant="contained"
              onClick={handleRefresh}
              startIcon={<RefreshIcon />}
              sx={{ mt: 2 }}
            >
              Réessayer
            </Button>
          </Box>
        )}

        {/* Solution "Bunker" : Wrapper React simple */}
        {/* React ne gère que cette div vide. La div OnlyOffice est créée manuellement en JS pur */}
        {/* React ne "voit" jamais la div OnlyOffice dans son Virtual DOM, donc il ne peut pas planter dessus */}
        <div
          ref={wrapperRef}
          style={{
            width: '100%',
            height: '100%',
            minWidth: '800px',
            minHeight: '600px',
            position: 'relative',
          }}
        />
      </EditorContent>
    </EditorContainer>
  );
};

// Solution "Bunker" : React.memo pour éviter les re-renders inutiles
// Même avec la solution "Bunker" qui isole la div OnlyOffice du Virtual DOM,
// on empêche encore les re-renders pour optimiser les performances
export default React.memo(OnlyOfficeEditor, (prevProps, nextProps) => {
  // Re-render UNIQUEMENT si filePath, fileName ou mode changent réellement
  // Cela empêche React de re-render pour d'autres raisons (state parent, etc.)
  const propsChanged = 
    prevProps.filePath !== nextProps.filePath ||
    prevProps.fileName !== nextProps.fileName ||
    prevProps.mode !== nextProps.mode;
  
  // Si les props n'ont pas changé, empêcher le re-render (retourner true)
  // Si les props ont changé, permettre le re-render (retourner false)
  return !propsChanged;
});

