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
  const containerRef = useRef(null); // Référence directe au DOM
  const docEditorRef = useRef(null); // Référence à l'instance OnlyOffice
  const isInitializingRef = useRef(false); // Flag pour éviter les initialisations concurrentes
  const containerReadyRef = useRef(false); // Flag pour indiquer que le conteneur est prêt
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [config, setConfig] = useState(null);
  
  // ID unique et stable pour le conteneur (ne change jamais une fois créé)
  const editorContainerId = useMemo(() => `onlyoffice-editor-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, []);

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

  // Effet pour marquer le conteneur comme prêt une fois monté
  useEffect(() => {
    if (containerRef.current && containerRef.current.isConnected) {
      containerReadyRef.current = true;
    }
    
    return () => {
      containerReadyRef.current = false;
    };
  }, []);

  // Charger la configuration et initialiser l'éditeur
  useEffect(() => {
    // Si l'éditeur existe déjà et fonctionne, ne rien faire
    if (docEditorRef.current && !error) {
      return;
    }

    // Si une initialisation est en cours, ne rien faire (évite les doubles initialisations en Strict Mode)
    if (isInitializingRef.current) {
      console.log('[OnlyOffice Debug] Initialisation déjà en cours, skip...');
      return;
    }

    // Si pas de filePath ou fileName, ne pas initialiser
    if (!filePath || !fileName) {
      return;
    }

    const initEditor = async () => {
      // Marquer que l'initialisation est en cours
      isInitializingRef.current = true;
      setLoading(true);
      setError(null);

      try {
        // Attendre que le conteneur soit monté dans le DOM
        // Utiliser plusieurs cycles de rendu pour s'assurer que React a fini
        let attempts = 0;
        const maxAttempts = 50;
        
        while (!containerRef.current || !containerRef.current.isConnected) {
          if (attempts >= maxAttempts) {
            throw new Error('Le conteneur de l\'éditeur OnlyOffice n\'est pas disponible après plusieurs tentatives');
          }
          await new Promise(resolve => setTimeout(resolve, 50));
          attempts++;
        }

        // Attendre que React ait fini de monter complètement le composant
        // Utiliser requestAnimationFrame pour s'assurer que le DOM est stable
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              setTimeout(resolve, 100); // Délai supplémentaire pour la stabilité
            });
          });
        });

        // Vérifier une dernière fois que le conteneur est toujours disponible
        if (!containerRef.current || !containerRef.current.isConnected) {
          throw new Error('Le conteneur de l\'éditeur OnlyOffice n\'est plus disponible');
        }

        // Vérifier que l'API OnlyOffice est chargée
        if (!window.DocsAPI) {
          throw new Error(
            'OnlyOffice API not loaded. Make sure the OnlyOffice server is running and accessible.'
          );
        }

        // Point 1 du diagnostic : Ne pas modifier le conteneur si OnlyOffice l'a déjà initialisé
        // Vérifier si le conteneur a été marqué comme initialisé ou contient déjà des éléments OnlyOffice
        const isAlreadyInitialized = containerRef.current.getAttribute('data-onlyoffice-initialized') === 'true';
        const hasOnlyOfficeElements = containerRef.current.querySelector('[id^="asc"]') !== null || 
                                       containerRef.current.querySelector('iframe') !== null;
        
        // Ne vider le conteneur QUE s'il n'a pas été initialisé par OnlyOffice
        // Cela empêche React de supprimer des éléments pendant qu'OnlyOffice les manipule
        if (!isAlreadyInitialized && !hasOnlyOfficeElements) {
          containerRef.current.innerHTML = "";
        } else if (isAlreadyInitialized || hasOnlyOfficeElements) {
          console.log('[OnlyOffice Debug] Conteneur déjà initialisé, skip nettoyage');
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

        // Vérifier une dernière fois que le conteneur est toujours disponible après la requête
        if (!containerRef.current || !containerRef.current.isConnected) {
          throw new Error('Le conteneur de l\'éditeur OnlyOffice n\'est plus disponible après le chargement de la configuration');
        }

        // Préparer la configuration pour OnlyOffice
        const editorConfig = {
          ...data.config,
          height: '100%',
          width: '100%',
          type: 'desktop',
          events: {
            onDocumentReady: () => {
              setLoading(false);
              isInitializingRef.current = false;
              // Marquer le conteneur comme "verrouillé" par OnlyOffice
              // Empêcher React de le modifier
              if (containerRef.current) {
                containerRef.current.setAttribute('data-onlyoffice-initialized', 'true');
              }
            },
            onError: (event) => {
              setError(`Erreur lors du chargement du document: ${event.data}`);
              setLoading(false);
              isInitializingRef.current = false;
            },
          },
        };

        // Si JWT est activé, ajouter le token
        if (data.token) {
          editorConfig.token = data.token;
        }

        // Vérifier une dernière fois avant l'initialisation
        if (!containerRef.current || !containerRef.current.isConnected) {
          throw new Error('Le conteneur de l\'éditeur OnlyOffice n\'est plus disponible avant l\'initialisation');
        }

        // Initialiser l'éditeur OnlyOffice avec l'ID du conteneur
        try {
          docEditorRef.current = new window.DocsAPI.DocEditor(editorContainerId, editorConfig);
        } catch (err) {
          console.error('[OnlyOffice Debug] Erreur lors de l\'initialisation:', err);
          isInitializingRef.current = false;
          throw err;
        }

      } catch (err) {
        setError(err.message);
        setLoading(false);
        isInitializingRef.current = false;
      }
    };

    initEditor();

    // FONCTION DE NETTOYAGE (Cruciale) - Détruit l'éditeur lors du démontage
    return () => {
      // Ne pas détruire si une nouvelle initialisation est en cours (Strict Mode)
      // Cela permet d'éviter de détruire l'éditeur pendant qu'une nouvelle instance s'initialise
      const currentEditor = docEditorRef.current;
      const wasInitializing = isInitializingRef.current;
      
      // Si une initialisation est en cours, attendre un peu avant de détruire
      // pour laisser le temps à la nouvelle instance de prendre le relais
      const destroyEditor = async () => {
        // Si une initialisation est en cours, attendre qu'elle se termine
        let attempts = 0;
        while (isInitializingRef.current && attempts < 10) {
          await new Promise(resolve => setTimeout(resolve, 200));
          attempts++;
        }

        // Si l'éditeur a changé (nouvelle instance), ne pas détruire l'ancien
        if (docEditorRef.current !== currentEditor) {
          console.log('[OnlyOffice Debug] Nouvelle instance détectée, skip destruction de l\'ancienne');
          return;
        }

        // Marquer que l'initialisation est terminée seulement si c'était la même instance
        if (docEditorRef.current === currentEditor) {
          isInitializingRef.current = false;
        }

        if (currentEditor) {
          try {
            // Attendre un cycle de rendu supplémentaire pour s'assurer que OnlyOffice a fini
            await new Promise(resolve => {
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  setTimeout(resolve, 100);
                });
              });
            });

            // Vérifier que le conteneur existe encore et qu'on a toujours la même instance
            if (containerRef.current && 
                containerRef.current.isConnected && 
                docEditorRef.current === currentEditor) {
              currentEditor.destroyEditor();
              if (docEditorRef.current === currentEditor) {
                docEditorRef.current = null;
              }
            } else if (docEditorRef.current === currentEditor) {
              // Si le conteneur n'existe plus, juste mettre la ref à null
              docEditorRef.current = null;
            }
          } catch (e) {
            // Ignorer l'erreur de destruction si l'éditeur est déjà détruit
            console.warn('[OnlyOffice Debug] Erreur lors de la destruction de l\'éditeur:', e);
            if (docEditorRef.current === currentEditor) {
              docEditorRef.current = null;
            }
          }
        }
      };

      destroyEditor();
    };
  }, [filePath, fileName, mode, editorContainerId]);  // Dépendances

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
        {/* Point 1 du diagnostic : Le conteneur reste toujours dans le DOM, on cache juste avec CSS */}
        {/* Point 2 du diagnostic : React.memo empêche les re-renders, donc le style reste stable */}
        <div
          id={editorContainerId}
          ref={containerRef}
          key={`onlyoffice-container-${editorContainerId}`}
          data-onlyoffice-container="true"  // Attribut pour identifier le conteneur
          data-file-path={filePath}  // Stocker le filePath pour le debugging
          style={{
            width: '100%',
            height: '100%',
            minWidth: '800px',  // Taille minimale pour éviter les problèmes de rendu
            minHeight: '600px',
            position: 'relative',  // Position relative pour qu'il prenne la taille du parent
            // Point 1 : Utiliser visibility/opacity au lieu de display pour garder le DOM stable
            // React ne retire jamais ce conteneur du DOM, il le cache juste
            visibility: loading || error ? 'hidden' : 'visible',
            opacity: loading || error ? 0 : 1,
            // Empêcher React de modifier le style après que OnlyOffice ait pris le contrôle
            pointerEvents: loading || error ? 'none' : 'auto',
          }}
        />
      </EditorContent>
    </EditorContainer>
  );
};

// Utiliser React.memo avec une condition stricte pour éviter les re-renders inutiles
// Point 2 du diagnostic : Empêcher les re-renders une fois l'éditeur initialisé
// Retourner true = "Ne pas re-render" (props identiques)
// Retourner false = "Re-render" (props différentes)
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

