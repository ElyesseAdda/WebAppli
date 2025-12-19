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
import DriveExplorer, { displayFilename } from './DriveExplorer';
import DriveUploader from './DriveUploader';
import DriveSearch from './DriveSearch';
import { useDrive } from './hooks/useDrive';

// Styles personnalisés
const DriveContainer = styled(Box)(({ theme }) => ({
  height: '90vh',
  maxHeight: '100%',
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: theme.palette.grey[50],
  padding: theme.spacing(2),
  overflow: 'hidden', // Empêcher le scroll sur le body
  width: '97%',
  maxWidth: '97%',
  boxSizing: 'border-box',
  position: 'relative',
  // Masquer la barre de scroll verticale
  scrollbarWidth: 'none', // Firefox
  '&::-webkit-scrollbar': {
    display: 'none', // Chrome, Safari, Edge
  },
  msOverflowStyle: 'none', // IE et Edge (ancien)
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
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  overflow: 'hidden',
  minWidth: 0,
}));

const DriveContent = styled(Box)(({ theme }) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  borderRadius: theme.spacing(1),
  width: '100%',
  maxWidth: '100%',
  minWidth: 0,
  boxSizing: 'border-box',
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
  const [droppedFiles, setDroppedFiles] = useState([]);
  const [createFolderDialogOpen, setCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info',
  });
  const [draggedItemsFromExplorer, setDraggedItemsFromExplorer] = useState(null);
  const [dragOverBreadcrumbItem, setDragOverBreadcrumbItem] = useState(null);

  // Charger le contenu initial
  useEffect(() => {
    fetchFolderContent('');
  }, []);

  // Empêcher le scroll horizontal sur le body
  useEffect(() => {
    const originalOverflowX = document.body.style.overflowX;
    const originalHtmlOverflowX = document.documentElement.style.overflowX;
    
    document.body.style.overflowX = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    
    return () => {
      document.body.style.overflowX = originalOverflowX;
      document.documentElement.style.overflowX = originalHtmlOverflowX;
    };
  }, []);

  // Gérer le drag end global pour réinitialiser l'état si on ne drop pas sur le breadcrumb
  useEffect(() => {
    const handleDragEndGlobal = (event) => {
      // Réinitialiser après un court délai pour permettre le drop sur le breadcrumb
      setTimeout(() => {
        if (draggedItemsFromExplorer && !event.dataTransfer?.dropEffect) {
          setDraggedItemsFromExplorer(null);
          setDragOverBreadcrumbItem(null);
        }
      }, 100);
    };

    if (draggedItemsFromExplorer) {
      document.addEventListener('dragend', handleDragEndGlobal);
      return () => {
        document.removeEventListener('dragend', handleDragEndGlobal);
      };
    }
  }, [draggedItemsFromExplorer]);

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

  // Gérer le drop de fichiers depuis DriveExplorer
  const handleDropFiles = useCallback((files) => {
    if (files && files.length > 0) {
      setDroppedFiles(files);
      setUploadDialogOpen(true);
    }
  }, []);

  // Fonction utilitaire pour récupérer le token CSRF
  const getCookie = (name) => {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
      const cookies = document.cookie.split(';');
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.substring(0, name.length + 1) === name + '=') {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  };

  // Gérer le drop sur un élément du breadcrumb
  const handleDropOnBreadcrumb = useCallback(async (event, targetPath) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverBreadcrumbItem(null);

    if (!draggedItemsFromExplorer || draggedItemsFromExplorer.length === 0) return;

    // Vérifier qu'on ne déplace pas un dossier dans lui-même ou dans un de ses sous-dossiers
    const invalidPaths = draggedItemsFromExplorer.filter(item => {
      if (item.type === 'folder') {
        return targetPath.startsWith(item.path) || item.path === targetPath;
      }
      return false;
    });

    if (invalidPaths.length > 0) {
      setSnackbar({
        open: true,
        message: 'Impossible de déplacer un dossier dans lui-même ou dans un de ses sous-dossiers',
        severity: 'warning',
      });
      setDraggedItemsFromExplorer(null);
      return;
    }

    // Déplacer chaque élément
    try {
      const movePromises = draggedItemsFromExplorer.map(async (item) => {
        const fileName = item.name;
        const destPath = targetPath + fileName + (item.type === 'folder' ? '/' : '');
        
        const response = await fetch('/api/drive-v2/move-item/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
          },
          credentials: 'include',
          body: JSON.stringify({
            source_path: item.path,
            dest_path: destPath,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Erreur lors du déplacement');
        }

        return response.json();
      });

      await Promise.all(movePromises);
      setDraggedItemsFromExplorer(null);
      setSnackbar({
        open: true,
        message: `${draggedItemsFromExplorer.length} élément(s) déplacé(s) avec succès`,
        severity: 'success',
      });
      refreshContent();
    } catch (error) {
      setSnackbar({
        open: true,
        message: `Erreur lors du déplacement: ${error.message}`,
        severity: 'error',
      });
      setDraggedItemsFromExplorer(null);
    }
  }, [draggedItemsFromExplorer, refreshContent]);

  // Gérer le drag over sur un élément du breadcrumb
  const handleDragOverBreadcrumb = useCallback((event, breadcrumbPath) => {
    event.preventDefault();
    event.stopPropagation();
    if (draggedItemsFromExplorer && draggedItemsFromExplorer.length > 0) {
      setDragOverBreadcrumbItem(breadcrumbPath);
    }
  }, [draggedItemsFromExplorer]);

  // Gérer le drag leave sur un élément du breadcrumb
  const handleDragLeaveBreadcrumb = useCallback((event) => {
    // Ne réinitialiser que si on quitte vraiment l'élément
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setDragOverBreadcrumbItem(null);
    }
  }, []);

  // Réinitialiser les fichiers droppés quand le modal se ferme
  const handleCloseUploadDialog = () => {
    setUploadDialogOpen(false);
    setDroppedFiles([]);
  };

  return (
    <DriveContainer>
      {/* Header */}
      <DriveHeader elevation={2}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap', flex: 1, minWidth: 0, overflow: 'hidden', maxWidth: '100%' }}>
          {/* Titre */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <Typography variant="h5" component="h1">
              Drive
            </Typography>
          </Box>

          {/* Breadcrumb */}
          {!showSearch && (
            <Breadcrumbs 
              separator={<NavigateNextIcon fontSize="small" />}
              sx={{ minWidth: 0, overflow: 'hidden', flex: 1, maxWidth: '100%' }}
            >
              {buildBreadcrumb().map((item, index) => {
                const isDragOver = dragOverBreadcrumbItem === item.path;
                return (
                  <Link
                    key={index}
                    component="button"
                    variant="body1"
                    onClick={() => handleNavigateToFolder(item.path)}
                    onDragOver={(e) => handleDragOverBreadcrumb(e, item.path)}
                    onDragLeave={handleDragLeaveBreadcrumb}
                    onDrop={(e) => handleDropOnBreadcrumb(e, item.path)}
                    sx={(theme) => ({
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      cursor: 'pointer',
                      textDecoration: 'none',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      backgroundColor: isDragOver 
                        ? theme.palette.success.light + '20' 
                        : 'transparent',
                      border: isDragOver 
                        ? `2px solid ${theme.palette.success.main}` 
                        : '2px solid transparent',
                      boxShadow: isDragOver 
                        ? `0 2px 8px ${theme.palette.success.main}40` 
                        : 'none',
                      transform: isDragOver ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.2s ease-in-out',
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%',
                      fontWeight: isDragOver ? 600 : 400,
                      '&:hover': {
                        textDecoration: 'underline',
                        backgroundColor: isDragOver 
                          ? theme.palette.success.light + '30' 
                          : theme.palette.action.hover,
                      },
                    })}
                  >
                    {index === 0 ? (
                      <HomeIcon fontSize="small" />
                    ) : (
                      <FolderIcon fontSize="small" />
                    )}
                    {displayFilename(item.name)}
                  </Link>
                );
              })}
            </Breadcrumbs>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0, minWidth: 0 }}>
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
            sx={{ minWidth: 200, maxWidth: 200, flexShrink: 0 }}
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
            onClick={() => {
              setDroppedFiles([]);
              setUploadDialogOpen(true);
            }}
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
            onDropFiles={handleDropFiles}
            currentPath={currentPath}
            onDraggedItemsChange={setDraggedItemsFromExplorer}
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
          onClose={handleCloseUploadDialog}
          onUploadComplete={() => {
            handleCloseUploadDialog();
            refreshContent();
          }}
          initialFiles={droppedFiles}
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
