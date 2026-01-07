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

  // Charger la configuration et initialiser l'éditeur
  useEffect(() => {
    // Si l'éditeur existe déjà, ne rien faire (ou le détruire d'abord)
    if (docEditorRef.current) {
      return;
    }

    // Si pas de filePath ou fileName, ne pas initialiser
    if (!filePath || !fileName) {
      return;
    }

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

        // Vérifier que le conteneur DOM est disponible
        if (!containerRef.current) {
          throw new Error('Le conteneur de l\'éditeur OnlyOffice n\'est pas disponible');
        }

        // Optionnel : vider explicitement le conteneur
        containerRef.current.innerHTML = "";

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

        // Vérifier une dernière fois que le conteneur est toujours disponible
        if (!containerRef.current || !containerRef.current.isConnected) {
          throw new Error('Le conteneur de l\'éditeur OnlyOffice n\'est plus disponible');
        }

        // Initialiser l'éditeur OnlyOffice avec la ref directe au conteneur
        try {
          docEditorRef.current = new window.DocsAPI.DocEditor(editorContainerId, editorConfig);
        } catch (err) {
          console.error('[OnlyOffice Debug] Erreur lors de l\'initialisation:', err);
          throw err;
        }

      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    initEditor();

    // FONCTION DE NETTOYAGE (Cruciale) - Détruit l'éditeur lors du démontage
    return () => {
      if (docEditorRef.current) {
        try {
          docEditorRef.current.destroyEditor();
          docEditorRef.current = null;
        } catch (e) {
          // Ignorer l'erreur de destruction si l'éditeur est déjà détruit
          console.warn('[OnlyOffice Debug] Erreur lors de la destruction de l\'éditeur:', e);
        }
      }
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
        {/* L'attribut 'key' force React à recréer la div si nécessaire */}
        <div
          id={editorContainerId}
          ref={containerRef}
          key="onlyoffice-container"
          data-onlyoffice-container="true"  // Attribut pour identifier le conteneur
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

// Utiliser React.memo pour éviter les re-renders inutiles
// Cela prévient React de re-rendre le composant pendant qu'OnlyOffice manipule le DOM
export default React.memo(OnlyOfficeEditor, (prevProps, nextProps) => {
  // Ne re-rendre que si filePath, fileName ou mode changent
  return (
    prevProps.filePath === nextProps.filePath &&
    prevProps.fileName === nextProps.fileName &&
    prevProps.mode === nextProps.mode
  );
});

