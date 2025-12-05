/**
 * Drive V2 - Composant principal
 * Système de gestion de fichiers amélioré
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Breadcrumbs,
  Link,
  Chip,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Search as SearchIcon,
  CreateNewFolder as CreateFolderIcon,
  CloudUpload as UploadIcon,
  Home as HomeIcon,
  Folder as FolderIcon,
  NavigateNext as NavigateNextIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import DriveExplorer from './DriveExplorer';
import DriveUploader from './DriveUploader';
import DriveSearch from './DriveSearch';
import { useDrive } from './hooks/useDrive';

// Styles personnalisés
const DriveContainer = styled(Box)(({ theme }) => ({
  height: '100vh',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.grey[50],
  padding: theme.spacing(2),
}));

const DriveHeader = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(2),
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
  borderRadius: theme.spacing(1),
  boxShadow: theme.shadows[2],
}));

const DriveContent = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  borderRadius: theme.spacing(1),
}));

const DriveV2 = () => {
  const {
    currentPath,
    folderContent,
    loading,
    error,
    fetchFolderContent,
    createFolder,
    deleteItem,
    refreshContent,
  } = useDrive();

  const [searchTerm, setSearchTerm] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });

  // Charger le contenu initial
  useEffect(() => {
    fetchFolderContent('');
  }, []);

  // Naviguer vers un dossier
  const handleNavigateToFolder = useCallback((folderPath) => {
    fetchFolderContent(folderPath);
  }, [fetchFolderContent]);

  // Créer un nouveau dossier
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      setSnackbar({
        open: true,
        message: 'Le nom du dossier ne peut pas être vide',
        severity: 'warning',
      });
      return;
    }

    try {
      await createFolder(currentPath, newFolderName.trim());
      setNewFolderName('');
      setCreateFolderDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Dossier créé avec succès',
        severity: 'success',
      });
      refreshContent();
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Erreur: ${error.message}`,
        severity: 'error',
      });
    }
  };

  // Construire le breadcrumb
  const buildBreadcrumb = () => {
    if (!currentPath) {
      return [{ name: 'Racine', path: '' }];
    }

    const parts = currentPath.split('/').filter(part => part);
    const breadcrumb = [{ name: 'Racine', path: '' }];

    let currentPathPart = '';
    parts.forEach((part) => {
      currentPathPart += `${part}/`;
      breadcrumb.push({
        name: part,
        path: currentPathPart,
      });
    });

    return breadcrumb;
  };

  // Recherche
  const handleSearch = () => {
    if (searchTerm.trim()) {
      setShowSearch(true);
    }
  };

  const handleCloseSearch = () => {
    setShowSearch(false);
    setSearchTerm('');
  };

  return (
    <DriveContainer>
      {/* Header */}
      <DriveHeader elevation={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', flex: 1 }}>
          {/* Titre et Badge */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" component="h1">
              Drive V2
            </Typography>
            <Chip label="Beta" color="primary" size="small" />
          </Box>

          {/* Breadcrumb */}
          {!showSearch && (
            <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />}>
              {buildBreadcrumb().map((item, index) => (
                <Link
                  key={index}
                  component="button"
                  variant="body1"
                  onClick={() => handleNavigateToFolder(item.path)}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    cursor: 'pointer',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {index === 0 ? (
                    <HomeIcon fontSize="small" />
                  ) : (
                    <FolderIcon fontSize="small" />
                  )}
                  {item.name}
                </Link>
              ))}
            </Breadcrumbs>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Recherche */}
          <TextField
            size="small"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 200 }}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={handleSearch}
            disabled={!searchTerm.trim()}
          >
            Rechercher
          </Button>

          {/* Actualiser */}
          <IconButton
            onClick={refreshContent}
            disabled={loading}
            title="Actualiser"
          >
            <RefreshIcon />
          </IconButton>

          {/* Nouveau dossier */}
          <Button
            variant="outlined"
            startIcon={<CreateFolderIcon />}
            onClick={() => setCreateFolderDialogOpen(true)}
          >
            Nouveau dossier
          </Button>

          {/* Upload */}
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => setUploadDialogOpen(true)}
          >
            Upload
          </Button>
        </Box>
      </DriveHeader>

      {/* Contenu */}
      <DriveContent>
        {loading ? (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '100%',
            }}
          >
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        ) : showSearch ? (
          <DriveSearch
            searchTerm={searchTerm}
            onClose={handleCloseSearch}
            onNavigate={handleNavigateToFolder}
          />
        ) : (
          <DriveExplorer
            folders={folderContent.folders}
            files={folderContent.files}
            onNavigateToFolder={handleNavigateToFolder}
            onDeleteItem={deleteItem}
            onRefresh={refreshContent}
          />
        )}
      </DriveContent>

      {/* Dialog de création de dossier */}
      {createFolderDialogOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1300,
          }}
          onClick={() => setCreateFolderDialogOpen(false)}
        >
          <Paper
            sx={{ p: 3, minWidth: 400 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Typography variant="h6" gutterBottom>
              Créer un nouveau dossier
            </Typography>
            <TextField
              fullWidth
              autoFocus
              label="Nom du dossier"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreateFolder();
                }
              }}
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreateFolderDialogOpen(false)}>
                Annuler
              </Button>
              <Button
                variant="contained"
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
              >
                Créer
              </Button>
            </Box>
          </Paper>
        </Box>
      )}

      {/* Dialog d'upload */}
      {uploadDialogOpen && (
        <DriveUploader
          currentPath={currentPath}
          onClose={() => setUploadDialogOpen(false)}
          onUploadComplete={() => {
            setUploadDialogOpen(false);
            refreshContent();
          }}
        />
      )}

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </DriveContainer>
  );
};

export default DriveV2;
