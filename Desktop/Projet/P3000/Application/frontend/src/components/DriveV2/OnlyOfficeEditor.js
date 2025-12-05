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

        // Créer le nouvel éditeur
        docEditorRef.current = new window.DocsAPI.DocEditor('onlyoffice-editor', editorConfig);

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

        {/* Container de l'éditeur OnlyOffice */}
        <div
          id="onlyoffice-editor"
          ref={editorRef}
          style={{
            width: '100%',
            height: '100%',
            visibility: loading || error ? 'hidden' : 'visible',
          }}
        />
      </EditorContent>
    </EditorContainer>
  );
};

export default OnlyOfficeEditor;

