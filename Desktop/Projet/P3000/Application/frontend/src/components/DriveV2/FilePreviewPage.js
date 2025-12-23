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
// OnlyOffice désactivé temporairement
// import OnlyOfficeCache from './utils/onlyofficeCache';

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
  // OnlyOffice désactivé temporairement
  const [onlyOfficeAvailable] = useState(false);
  const [onlyOfficeError] = useState(false);

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

  // OnlyOffice désactivé temporairement - Pas de vérification
  // useEffect(() => {
  //   const checkOnlyOffice = async () => {
  //     const available = await OnlyOfficeCache.checkAvailability();
  //     setOnlyOfficeAvailable(available);
  //   };
  //   checkOnlyOffice();
  // }, []);

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

  // OnlyOffice désactivé temporairement
  // const isOfficeEditable = () => {
  //   const extension = fileName.split('.').pop()?.toLowerCase();
  //   const editableExtensions = [
  //     'doc', 'docx', 'docm', 'dot', 'dotx', 'dotm',
  //     'xls', 'xlsx', 'xlsm', 'xlt', 'xltx', 'xltm',
  //     'ppt', 'pptx', 'pptm', 'pot', 'potx', 'potm',
  //     'odt', 'ods', 'odp', 'rtf', 'txt', 'csv',
  //     'pdf'  // Support PDF depuis OnlyOffice 8.1+
  //   ];
  //   return editableExtensions.includes(extension);
  // };

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
        // OnlyOffice désactivé - Utilisation de la preview native du navigateur
        return (
          <iframe
            src={displayUrl}
            title={fileName}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
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
        // OnlyOffice désactivé - Utilisation de Office Online pour la prévisualisation
        return (
          <iframe
            src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(displayUrl)}`}
            title={fileName}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
            }}
          />
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
