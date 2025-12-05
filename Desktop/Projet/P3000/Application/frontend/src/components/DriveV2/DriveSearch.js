/**
 * Drive Search - Composant de recherche
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Close as CloseIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const SearchContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  backgroundColor: '#fff',
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2),
  overflow: 'auto',
  // Masquer la barre de scroll verticale
  scrollbarWidth: 'none', // Firefox
  '&::-webkit-scrollbar': {
    display: 'none', // Chrome, Safari, Edge
  },
  msOverflowStyle: 'none', // IE et Edge (ancien)
}));

const DriveSearch = ({ searchTerm, onClose, onNavigate }) => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ folders: [], files: [] });
  const [error, setError] = useState(null);

  // Effectuer la recherche
  useEffect(() => {
    const performSearch = async () => {
      if (!searchTerm) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/drive-v2/search/?search_term=${encodeURIComponent(searchTerm)}`
        );

        if (!response.ok) {
          throw new Error('Erreur lors de la recherche');
        }

        const data = await response.json();
        setResults(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    performSearch();
  }, [searchTerm]);

  // Icône par type de fichier
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <ImageIcon color="primary" />;
      default:
        return <FileIcon />;
    }
  };

  // Naviguer vers le dossier parent d'un fichier
  const handleFileClick = (filePath) => {
    const folderPath = filePath.substring(0, filePath.lastIndexOf('/') + 1);
    onNavigate(folderPath);
    onClose();
  };

  return (
    <SearchContainer>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Résultats pour "{searchTerm}"
        </Typography>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Contenu */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <>
          {/* Statistiques */}
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {results.folders.length} dossier(s) et {results.files.length} fichier(s) trouvé(s)
          </Typography>

          {/* Résultats vides */}
          {results.folders.length === 0 && results.files.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Aucun résultat trouvé
            </Alert>
          )}

          {/* Dossiers */}
          {results.folders.length > 0 && (
            <>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Dossiers
              </Typography>
              <List dense>
                {results.folders.map((folder) => (
                  <ListItem
                    key={folder.path}
                    button
                    onClick={() => {
                      onNavigate(folder.path);
                      onClose();
                    }}
                  >
                    <ListItemIcon>
                      <FolderIcon color="primary" />
                    </ListItemIcon>
                    <ListItemText
                      primary={folder.name}
                      secondary={folder.path}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}

          {/* Fichiers */}
          {results.files.length > 0 && (
            <>
              <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
                Fichiers
              </Typography>
              <List dense>
                {results.files.map((file) => (
                  <ListItem
                    key={file.path}
                    button
                    onClick={() => handleFileClick(file.path)}
                  >
                    <ListItemIcon>
                      {getFileIcon(file.name)}
                    </ListItemIcon>
                    <ListItemText
                      primary={file.name}
                      secondary={file.path}
                    />
                  </ListItem>
                ))}
              </List>
            </>
          )}
        </>
      )}
    </SearchContainer>
  );
};

export default DriveSearch;
