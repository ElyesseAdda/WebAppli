/**
 * OnlyOffice Editor Component - Éditeur de documents Office en ligne
 */

import React, { useEffect, useRef, useState } from 'react';
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
  const editorRef = useRef(null);
  const docEditorRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);

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

  // Charger la configuration et initialiser l'éditeur
  useEffect(() => {
    const initEditor = async () => {
      setLoading(true);
      setError(null);

      try {
        // Vérifier que l'API OnlyOffice est chargée
        if (!window.DocsAPI) {
          throw new Error(
            'OnlyOffice API not loaded. Make sure the OnlyOffice server is running and accessible.'
          );
        }

        // Récupérer la configuration depuis Django
        const response = await fetch('/api/drive-v2/onlyoffice-config/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',  // Inclure les cookies de session pour l'authentification
          body: JSON.stringify({
            file_path: filePath,
            file_name: fileName,
            mode: mode,
            use_proxy: true,  // Utiliser le proxy Django au lieu de l'URL S3 directe
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to load document configuration');
        }

        const data = await response.json();
        setConfig(data);

        // Préparer la configuration pour OnlyOffice
        const editorConfig = {
          ...data.config,
          height: '100%',
          width: '100%',
          type: 'desktop',
          events: {
            onDocumentReady: () => {
              setLoading(false);
            },
            onError: (event) => {
              setError(`Erreur lors du chargement du document: ${event.data}`);
              setLoading(false);
            },
          },
        };

        // Si JWT est activé, ajouter le token
        if (data.token) {
          editorConfig.token = data.token;
        }

        // Initialiser l'éditeur OnlyOffice
        
        // Détruire l'éditeur précédent si existant
        if (docEditorRef.current) {
          try {
            docEditorRef.current.destroyEditor();
          } catch (e) {
            // Ignorer l'erreur
          }
        }

        // Attendre que le conteneur DOM soit prêt avant d'initialiser OnlyOffice
        // Utiliser une fonction d'attente récursive pour s'assurer que le conteneur est prêt
        const waitForContainer = (attempts = 0, maxAttempts = 20) => {
          return new Promise((resolve, reject) => {
            const editorElement = document.getElementById('onlyoffice-editor');
            
            if (!editorElement) {
              if (attempts >= maxAttempts) {
                reject(new Error('Le conteneur de l\'éditeur OnlyOffice n\'a pas été trouvé dans le DOM après plusieurs tentatives'));
                return;
              }
              setTimeout(() => waitForContainer(attempts + 1, maxAttempts).then(resolve).catch(reject), 100);
              return;
            }

            // Vérifier que le conteneur est dans le DOM
            if (!editorElement.isConnected) {
              if (attempts >= maxAttempts) {
                reject(new Error('Le conteneur de l\'éditeur OnlyOffice n\'est pas connecté au DOM'));
                return;
              }
              setTimeout(() => waitForContainer(attempts + 1, maxAttempts).then(resolve).catch(reject), 100);
              return;
            }

            // Vérifier que le conteneur a une taille
            // Note: offsetWidth/offsetHeight peuvent être 0 même si le conteneur existe
            // Vérifier aussi avec getBoundingClientRect
            const rect = editorElement.getBoundingClientRect();
            const computedStyle = window.getComputedStyle(editorElement);
            const hasSize = (editorElement.offsetWidth > 0 && editorElement.offsetHeight > 0) ||
                          (rect.width > 0 && rect.height > 0) ||
                          (computedStyle.width !== '0px' && computedStyle.height !== '0px');
            
            // Accepter le conteneur même s'il n'a pas encore de taille après plusieurs tentatives
            // OnlyOffice peut s'initialiser même avec une taille de 0 et s'adapter ensuite
            if (!hasSize) {
              if (attempts >= maxAttempts) {
                console.warn('[OnlyOffice Debug] Le conteneur n\'a pas de taille après plusieurs tentatives, initialisation quand même...');
                resolve(editorElement);
                return;
              }
              console.log(`[OnlyOffice Debug] Attente du conteneur (tentative ${attempts + 1}/${maxAttempts})...`);
              setTimeout(() => waitForContainer(attempts + 1, maxAttempts).then(resolve).catch(reject), 200);
              return;
            }

            resolve(editorElement);
          });
        };

        // Attendre que le conteneur soit prêt
        await waitForContainer();

        // Attendre encore un cycle de rendu pour être sûr que React a fini
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(resolve, 50);
            });
          });
        });

        // Vérifier une dernière fois avant d'initialiser
        const editorElement = document.getElementById('onlyoffice-editor');
        if (!editorElement || !editorElement.isConnected) {
          throw new Error('Le conteneur de l\'éditeur OnlyOffice n\'est plus disponible');
        }

        // Créer l'éditeur OnlyOffice
        try {
          docEditorRef.current = new window.DocsAPI.DocEditor('onlyoffice-editor', editorConfig);
        } catch (err) {
          console.error('[OnlyOffice Debug] Erreur lors de l\'initialisation:', err);
          throw err;
        }

      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    if (filePath && fileName) {
      initEditor();
    }

    // Cleanup
    return () => {
      if (docEditorRef.current) {
        try {
          docEditorRef.current.destroyEditor();
        } catch (e) {
          // Ignorer l'erreur
        }
      }
    };
  }, [filePath, fileName, mode]);

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

        {/* Container de l'éditeur OnlyOffice - Toujours dans le DOM avec une taille */}
        <div
          id="onlyoffice-editor"
          ref={editorRef}
          style={{
            width: '100%',
            height: '100%',
            minWidth: '800px',  // Taille minimale pour éviter les problèmes de rendu
            minHeight: '600px',
            position: 'relative',  // Position relative pour qu'il prenne la taille du parent
            visibility: loading || error ? 'hidden' : 'visible',  // Utiliser visibility au lieu de display pour garder la taille
            opacity: loading || error ? 0 : 1,  // Faire disparaître visuellement mais garder la taille
          }}
        />
      </EditorContent>
    </EditorContainer>
  );
};

export default OnlyOfficeEditor;

