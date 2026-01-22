/**
 * File Preview Page - Page dédiée à la prévisualisation de fichiers
 */
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box,
  CircularProgress,
  Alert,
  Paper,
  Typography,
  Button,
} from '@mui/material';
import {
  Download as DownloadIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import OnlyOfficeCache from './utils/onlyofficeCache';

const PageContainer = styled(Box)(({ theme }) => ({
  width: '100vw',
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: '#fff',
  overflow: 'hidden',
}));

const PreviewContent = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: '#f5f5f5',
  overflow: 'auto',
  position: 'relative',
  // Masquer la barre de scroll verticale
  scrollbarWidth: 'none', // Firefox
  '&::-webkit-scrollbar': {
    display: 'none', // Chrome, Safari, Edge
  },
  msOverflowStyle: 'none', // IE et Edge (ancien)
}));

const FilePreviewPage = () => {
  const [searchParams] = useSearchParams();
  
  const filePath = searchParams.get('file_path');
  const fileName = searchParams.get('file_name') || 'Fichier';
  const fileSize = searchParams.get('file_size');
  const contentType = searchParams.get('content_type') || '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [displayUrl, setDisplayUrl] = useState(null);
  const [onlyOfficeAvailable, setOnlyOfficeAvailable] = useState(false);
  const [onlyOfficeError, setOnlyOfficeError] = useState(false);

  // Neutraliser le padding du body pour cette page uniquement
  useEffect(() => {
    // Sauvegarder les styles originaux du body
    const originalPadding = document.body.style.paddingLeft;
    const originalMaxWidth = document.body.style.maxWidth;
    
    // Retirer le padding et maxWidth pour la prévisualisation
    document.body.style.paddingLeft = '0';
    document.body.style.maxWidth = 'none';
    
    // Restaurer les styles originaux au démontage du composant
    return () => {
      document.body.style.paddingLeft = originalPadding;
      document.body.style.maxWidth = originalMaxWidth;
    };
  }, []);

  // Vérification simplifiée et forcée - Se base uniquement sur window.DocsAPI
  useEffect(() => {
    const forceOnlyOffice = async () => {
      try {
        // 1. On s'assure que le script est chargé
        await OnlyOfficeCache.ensureScriptLoaded();
        console.log('[OnlyOffice Debug] Script OnlyOffice chargé');
        
        // 2. On vérifie la présence de l'objet global
        if (window.DocsAPI && window.DocsAPI.DocEditor) {
          console.log('[OnlyOffice Debug] DocsAPI détecté, activation de l\'éditeur.');
          setOnlyOfficeAvailable(true);
        } else {
          // Si vraiment pas là, on attend un peu (chargement asynchrone)
          setTimeout(() => {
            if (window.DocsAPI && window.DocsAPI.DocEditor) {
              console.log('[OnlyOffice Debug] DocsAPI détecté après attente, activation de l\'éditeur.');
              setOnlyOfficeAvailable(true);
            } else {
              console.error('[OnlyOffice Debug] DocsAPI introuvable après attente.');
              setOnlyOfficeAvailable(false);
            }
          }, 1000);
        }
      } catch (err) {
        console.error('[OnlyOffice Debug] Erreur lors du chargement du script:', err);
        // En cas d'erreur de chargement, on vérifie quand même window.DocsAPI
        // Le script peut être déjà chargé depuis le template HTML
        if (window.DocsAPI && window.DocsAPI.DocEditor) {
          console.log('[OnlyOffice Debug] DocsAPI disponible malgré l\'erreur de chargement, activation de l\'éditeur.');
          setOnlyOfficeAvailable(true);
        } else {
          setOnlyOfficeAvailable(false);
        }
      }
    };

    forceOnlyOffice();
  }, []);

  // Récupérer l'URL d'affichage (OPTIMISÉ)
  useEffect(() => {
    if (!filePath) {
      setError('Chemin du fichier manquant');
      setLoading(false);
      return;
    }

    const fetchDisplayUrl = async () => {
      setLoading(true);
      setError(null);

      try {
        // OPTIMISATION : Fetch avec timeout court et pas de retry
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s max

        const response = await fetch(
          `/api/drive-v2/display-url/?file_path=${encodeURIComponent(filePath)}`,
          { signal: controller.signal }
        );
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error('Erreur lors de la génération de l\'URL');
        }

        const data = await response.json();
        setDisplayUrl(data.display_url);
      } catch (err) {
        if (err.name === 'AbortError') {
          setError('Timeout : le serveur met trop de temps à répondre');
        } else {
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDisplayUrl();
  }, [filePath]);

  // Déterminer le type de fichier
  const getFileType = () => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const type = contentType?.toLowerCase() || '';

    if (extension === 'pdf' || type.includes('pdf')) return 'pdf';
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension) || type.includes('image')) return 'image';
    if (['mp4', 'webm', 'ogg', 'avi', 'mov'].includes(extension) || type.includes('video')) return 'video';
    if (['mp3', 'wav', 'ogg', 'flac', 'aac'].includes(extension) || type.includes('audio')) return 'audio';
    if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(extension)) return 'office';
    if (['txt', 'json', 'xml', 'csv', 'md'].includes(extension) || type.includes('text')) return 'text';
    return 'unknown';
  };

  const fileType = getFileType();

  // Vérifier si le fichier peut être édité avec OnlyOffice
  const isOfficeEditable = () => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const editableExtensions = [
      'doc', 'docx', 'docm', 'dot', 'dotx', 'dotm',
      'xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'xltm',
      'ppt', 'pptx', 'pptm', 'pot', 'potx', 'potm',
      'odt', 'ods', 'odp', 'rtf', 'txt', 'csv',
      'pdf'  // Support PDF depuis OnlyOffice 8.1+
    ];
    return editableExtensions.includes(extension);
  };

  // Télécharger le fichier
  const handleDownload = async () => {
    try {
      const response = await fetch(
        `/api/drive-v2/download-url/?file_path=${encodeURIComponent(filePath)}`
      );
      const data = await response.json();
      window.open(data.download_url, '_blank');
    } catch (error) {
      // Erreur silencieuse
    }
  };

  // Formater la taille
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Rendu du contenu
  const renderPreview = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={60} />
          <Typography variant="h6">Chargement...</Typography>
        </Box>
      );
    }

    if (error) {
      return (
        <Paper sx={{ p: 4, maxWidth: 600 }}>
          <Alert severity="error">{error}</Alert>
        </Paper>
      );
    }

    switch (fileType) {
      case 'pdf':
        // DÉSACTIVATION DU FALLBACK : Forcer OnlyOffice pour voir les erreurs
        const docsApiAvailablePdf = window.DocsAPI && window.DocsAPI.DocEditor;
        console.log('[OnlyOffice Debug] PDF file - onlyOfficeAvailable:', onlyOfficeAvailable, 'docsApiAvailable:', docsApiAvailablePdf, 'filePath:', filePath);
        
        // TOUJOURS essayer OnlyOffice pour les PDF (même si pas détecté)
        if (onlyOfficeAvailable || docsApiAvailablePdf || true) { // Force true pour toujours essayer
          const editorUrl = `/drive-v2/editor?file_path=${encodeURIComponent(filePath)}&file_name=${encodeURIComponent(fileName)}`;
          console.log('[OnlyOffice Debug] Opening PDF editor at:', editorUrl);
          console.log('[OnlyOffice Debug] DocsAPI status for PDF:', {
            exists: !!window.DocsAPI,
            hasDocEditor: !!(window.DocsAPI && window.DocsAPI.DocEditor),
            onlyOfficeAvailable
          });
          
          return (
            <iframe
              src={editorUrl}
              title={fileName}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              onLoad={() => {
                console.log('[OnlyOffice Debug] PDF Editor iframe loaded');
                setOnlyOfficeError(false);
              }}
              onError={(e) => {
                console.error('[OnlyOffice Debug] PDF Editor iframe error:', e);
                setOnlyOfficeError(true);
              }}
            />
          );
        }
        
        // Si OnlyOffice n'est pas disponible, afficher un message d'erreur
        console.error('[OnlyOffice Debug] OnlyOffice non disponible pour PDF - Fallback désactivé pour debug');
        return (
          <Paper sx={{ p: 4, maxWidth: 600, m: 'auto', mt: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                OnlyOffice non disponible pour PDF
              </Typography>
              <Typography variant="body2" paragraph>
                Le serveur OnlyOffice n'est pas accessible pour ouvrir ce fichier PDF.
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 2 }}>
                <strong>État de détection :</strong>
                <ul style={{ marginTop: 8, marginBottom: 8 }}>
                  <li>onlyOfficeAvailable: {onlyOfficeAvailable ? '✅ true' : '❌ false'}</li>
                  <li>docsApiAvailable: {docsApiAvailablePdf ? '✅ true' : '❌ undefined/false'}</li>
                </ul>
              </Typography>
              <Button
                variant="contained"
                onClick={() => window.location.reload()}
                sx={{ mt: 2 }}
              >
                Recharger la page
              </Button>
            </Alert>
          </Paper>
        );

      case 'image':
        return (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'auto',
              p: 2,
              scrollbarWidth: 'none', // Firefox
              '&::-webkit-scrollbar': { display: 'none' }, // Chrome, Safari, Edge
              msOverflowStyle: 'none', // IE et Edge (ancien)
            }}
          >
            <img
              src={displayUrl}
              alt={fileName}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain',
              }}
            />
          </Box>
        );

      case 'video':
        return (
          <video
            controls
            autoPlay
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
            }}
          >
            <source src={displayUrl} type={contentType} />
            Votre navigateur ne supporte pas la lecture de vidéos.
          </video>
        );

      case 'audio':
        return (
          <Paper sx={{ p: 4, minWidth: 400 }}>
            <Typography variant="h6" gutterBottom align="center">
              {fileName}
            </Typography>
            <audio
              controls
              autoPlay
              style={{ width: '100%', mt: 2 }}
            >
              <source src={displayUrl} type={contentType} />
              Votre navigateur ne supporte pas la lecture audio.
            </audio>
          </Paper>
        );

      case 'office':
        // DÉSACTIVATION DU FALLBACK : Forcer l'utilisation d'OnlyOffice pour voir les erreurs
        const docsApiAvailable = window.DocsAPI && window.DocsAPI.DocEditor;
        const shouldUseOnlyOffice = (onlyOfficeAvailable || docsApiAvailable) && isOfficeEditable() && !onlyOfficeError;
        
        console.log('[OnlyOffice Debug] Office file - onlyOfficeAvailable:', onlyOfficeAvailable, 'docsApiAvailable:', docsApiAvailable, 'isOfficeEditable:', isOfficeEditable(), 'onlyOfficeError:', onlyOfficeError, 'shouldUseOnlyOffice:', shouldUseOnlyOffice, 'filePath:', filePath);
        
        // TOUJOURS essayer OnlyOffice, même si pas détecté (pour voir les erreurs)
        if (shouldUseOnlyOffice || isOfficeEditable()) {
          const editorUrl = `/drive-v2/editor?file_path=${encodeURIComponent(filePath)}&file_name=${encodeURIComponent(fileName)}`;
          console.log('[OnlyOffice Debug] Opening editor at:', editorUrl);
          console.log('[OnlyOffice Debug] DocsAPI status:', {
            exists: !!window.DocsAPI,
            hasDocEditor: !!(window.DocsAPI && window.DocsAPI.DocEditor),
            onlyOfficeAvailable,
            docsApiAvailable
          });
          
          return (
            <iframe
              src={editorUrl}
              title={fileName}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              onLoad={() => {
                console.log('[OnlyOffice Debug] Editor iframe loaded successfully');
                setOnlyOfficeError(false); // Réinitialiser l'erreur si le chargement réussit
              }}
              onError={(e) => {
                console.error('[OnlyOffice Debug] Editor iframe error:', e);
                setOnlyOfficeError(true);
              }}
            />
          );
        }
        
        // Si OnlyOffice n'est pas disponible, afficher un message d'erreur au lieu du fallback
        console.error('[OnlyOffice Debug] OnlyOffice non disponible - Fallback désactivé pour debug');
        return (
          <Paper sx={{ p: 4, maxWidth: 600, m: 'auto', mt: 4 }}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                OnlyOffice non disponible
              </Typography>
              <Typography variant="body2" paragraph>
                Le serveur OnlyOffice n'est pas accessible ou le script n'est pas chargé.
              </Typography>
              <Typography variant="body2" component="div" sx={{ mt: 2 }}>
                <strong>État de détection :</strong>
                <ul style={{ marginTop: 8, marginBottom: 8 }}>
                  <li>onlyOfficeAvailable: {onlyOfficeAvailable ? '✅ true' : '❌ false'}</li>
                  <li>docsApiAvailable: {docsApiAvailable ? '✅ true' : '❌ undefined/false'}</li>
                  <li>isOfficeEditable: {isOfficeEditable() ? '✅ true' : '❌ false'}</li>
                  <li>onlyOfficeError: {onlyOfficeError ? '❌ true' : '✅ false'}</li>
                </ul>
              </Typography>
              <Typography variant="body2" sx={{ mt: 2 }}>
                <strong>Vérifications à effectuer :</strong>
                <ul style={{ marginTop: 8 }}>
                  <li>OnlyOffice est-il démarré sur le port 8080 ?</li>
                  <li>Le script api.js est-il chargé ? (Vérifiez la console)</li>
                  <li>L'URL du serveur OnlyOffice est-elle correcte dans .env ?</li>
                  <li>Y a-t-il des erreurs CORS ou de connexion dans la console ?</li>
                </ul>
              </Typography>
              <Button
                variant="contained"
                onClick={() => window.location.reload()}
                sx={{ mt: 2 }}
              >
                Recharger la page
              </Button>
            </Alert>
          </Paper>
        );

      case 'text':
        return (
          <iframe
            src={displayUrl}
            title={fileName}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              backgroundColor: 'white',
            }}
          />
        );

      default:
        return (
          <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 600 }}>
            <Alert severity="warning" sx={{ mb: 3 }}>
              La prévisualisation n'est pas disponible pour ce type de fichier
            </Alert>
            <Typography variant="h6" gutterBottom>
              {fileName}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Type : {contentType || 'Inconnu'}
            </Typography>
            {fileSize && (
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Taille : {formatFileSize(parseInt(fileSize))}
              </Typography>
            )}
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownload}
              sx={{ mt: 2 }}
            >
              Télécharger le fichier
            </Button>
          </Paper>
        );
    }
  };

  return (
    <PageContainer>
      {/* Contenu en plein écran */}
      <PreviewContent>
        {renderPreview()}
      </PreviewContent>
    </PageContainer>
  );
};

export default FilePreviewPage;
