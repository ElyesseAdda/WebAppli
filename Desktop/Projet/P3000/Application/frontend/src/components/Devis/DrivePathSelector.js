/**
 * DrivePathSelector - Composant pour sélectionner un chemin dans le drive
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Breadcrumbs,
  Link,
  CircularProgress,
  Alert,
  IconButton,
  Paper,
  TextField,
  InputAdornment,
  Divider,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Check as CheckIcon,
  CreateNewFolder as CreateNewFolderIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';

const API_BASE_URL = '/api/drive-v2';

const StyledListItem = styled(ListItem)(({ theme }) => ({
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

const displayFilename = (filename) => {
  if (!filename) return 'Racine';
  // Remplacer les underscores et tirets par des espaces pour l'affichage
  return filename.replace(/[_-]/g, ' ');
};

const DrivePathSelector = ({ open, onClose, onSelect, defaultPath = '' }) => {
  const [currentPath, setCurrentPath] = useState('');
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  
  // États pour la création de dossier
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  
  // Cache pour les dossiers visités
  const [folderCache, setFolderCache] = useState(new Map());

  // Charger le contenu du dossier actuel avec cache
  const fetchFolderContent = useCallback(async (folderPath = '', forceRefresh = false) => {
    // Vérifier le cache d'abord (sauf si on force le rafraîchissement)
    if (!forceRefresh && folderCache.has(folderPath)) {
      const cachedData = folderCache.get(folderPath);
      setFolders(cachedData);
      setCurrentPath(folderPath);
      return;
    }

    setLoading(true);
    setError(null);
    setCurrentPath(folderPath);

    try {
      const response = await axios.get(`${API_BASE_URL}/list-content/`, {
        params: { folder_path: folderPath },
        withCredentials: true,
      });

      const allFolders = response.data.folders || [];
      
      // Mettre en cache
      setFolderCache(prev => new Map(prev).set(folderPath, allFolders));
      setFolders(allFolders);
      setCurrentPath(folderPath);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, [folderCache]);

  // Charger le contenu initial
  useEffect(() => {
    if (open) {
      const initialPath = defaultPath || '';
      setSelectedPath(initialPath);
      setSearchTerm('');
      setSearchResults([]);
      setShowSearchResults(false);
      setCurrentPath(initialPath);
      setError(null);
      setNewFolderName('');
      setShowCreateFolderDialog(false);
      // Charger le chemin par défaut ou la racine
      fetchFolderContent(initialPath);
    } else {
      // Nettoyer le cache quand le modal se ferme
      setFolderCache(new Map());
      setNewFolderName('');
      setShowCreateFolderDialog(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultPath]);

  // Recherche de dossiers
  const handleSearch = useCallback(async (term) => {
    if (!term || term.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);

    try {
      const response = await axios.get(`${API_BASE_URL}/search/`, {
        params: {
          query: term,
          item_type: 'folder',
        },
        withCredentials: true,
      });

      setSearchResults(response.data.results || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounce pour la recherche
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchTerm) {
        handleSearch(searchTerm);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, handleSearch]);

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

  // Naviguer vers un dossier
  const handleNavigateToFolder = (folderPath) => {
    if (currentPath === folderPath) {
      setSelectedPath(folderPath);
      return;
    }
    
    fetchFolderContent(folderPath);
    setSelectedPath(folderPath);
    setSearchTerm('');
    setShowSearchResults(false);
  };

  // Sélectionner un dossier depuis les résultats de recherche
  const handleSelectFromSearch = (folder) => {
    setSelectedPath(folder.path);
    fetchFolderContent(folder.path);
    setSearchTerm('');
    setShowSearchResults(false);
  };

  // Sélectionner le dossier actuel comme destination
  const handleSelectCurrentFolder = () => {
    setSelectedPath(currentPath);
  };

  // Confirmer la sélection
  const handleConfirm = () => {
    if (selectedPath !== null) {
      onSelect(selectedPath);
      onClose();
    }
  };

  // Réinitialiser au chemin par défaut
  const handleResetToDefault = () => {
    setSelectedPath(defaultPath || '');
    fetchFolderContent(defaultPath || '');
  };

  // Créer un nouveau dossier
  const handleCreateFolder = async () => {
    if (!newFolderName || !newFolderName.trim()) {
      setError('Le nom du dossier ne peut pas être vide');
      return;
    }

    setIsCreatingFolder(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE_URL}/create-folder/`,
        {
          parent_path: currentPath,
          folder_name: newFolderName.trim(),
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        const newFolderPath = response.data.folder_path;
        const folderNameFromAPI = response.data.folder_name_display || response.data.folder_name || newFolderName.trim();
        
        // Invalider le cache du dossier parent pour forcer le rechargement
        setFolderCache(prev => {
          const newCache = new Map(prev);
          newCache.delete(currentPath);
          return newCache;
        });

        // Ajouter immédiatement le nouveau dossier à la liste (optimiste)
        const newFolder = {
          name: folderNameFromAPI,
          path: newFolderPath,
        };
        
        setFolders(prev => {
          // Vérifier si le dossier n'existe pas déjà dans la liste
          const exists = prev.some(f => f.path === newFolderPath);
          if (!exists) {
            return [...prev, newFolder].sort((a, b) => a.name.localeCompare(b.name));
          }
          return prev;
        });

        // Attendre un court délai puis recharger pour s'assurer que tout est synchronisé
        setTimeout(async () => {
          await fetchFolderContent(currentPath, true);
        }, 200);

        // Optionnel : naviguer automatiquement vers le nouveau dossier créé
        // Nettoyer le chemin (retirer le slash final si présent)
        const cleanedPath = newFolderPath.endsWith('/') 
          ? newFolderPath.slice(0, -1) 
          : newFolderPath;
        setSelectedPath(cleanedPath);
        
        // Fermer le dialog de création
        setShowCreateFolderDialog(false);
        setNewFolderName('');
      } else {
        setError('Erreur lors de la création du dossier');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Erreur lors de la création du dossier');
    } finally {
      setIsCreatingFolder(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Sélectionner le chemin du drive
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="Fermer">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Barre de recherche */}
        <TextField
          fullWidth
          size="small"
          placeholder="Rechercher un dossier..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        {/* Résultats de recherche */}
        {showSearchResults && (
          <>
            {isSearching ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 2, gap: 1 }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Recherche en cours...
                </Typography>
              </Box>
            ) : searchResults.length > 0 ? (
              <Paper variant="outlined" sx={{ mb: 2, maxHeight: 200, overflow: 'auto' }}>
                <Typography variant="subtitle2" sx={{ p: 1, fontWeight: 'bold', backgroundColor: 'action.hover' }}>
                  {searchResults.length} dossier{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
                </Typography>
                <List dense>
                  {searchResults.map((folder) => (
                    <StyledListItem
                      key={folder.path}
                      onClick={() => handleSelectFromSearch(folder)}
                      selected={selectedPath === folder.path}
                      sx={{
                        backgroundColor: selectedPath === folder.path ? 'action.selected' : 'transparent',
                      }}
                    >
                      <ListItemIcon>
                        <FolderIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={displayFilename(folder.name)}
                        secondary={folder.path || 'Racine'}
                      />
                      {selectedPath === folder.path && (
                        <CheckIcon color="primary" />
                      )}
                    </StyledListItem>
                  ))}
                </List>
              </Paper>
            ) : (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Aucun dossier trouvé
                </Typography>
              </Paper>
            )}
          </>
        )}

        {/* Breadcrumb */}
        {!showSearchResults && (
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 2 }}
          >
            {buildBreadcrumb().map((item, index) => (
              <Link
                key={index}
                component="button"
                variant="body1"
                onClick={() => handleNavigateToFolder(item.path)}
                sx={{ textDecoration: 'none' }}
              >
                {index === 0 ? <HomeIcon fontSize="small" /> : displayFilename(item.name)}
              </Link>
            ))}
          </Breadcrumbs>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Liste des dossiers */}
        {!showSearchResults && (
          <>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {/* Bouton pour créer un nouveau dossier */}
                <Button
                  variant="outlined"
                  startIcon={<CreateNewFolderIcon />}
                  onClick={() => setShowCreateFolderDialog(true)}
                  fullWidth
                  sx={{ mb: 2 }}
                >
                  Créer un nouveau dossier ici
                </Button>

                {/* Option pour sélectionner le dossier actuel */}
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    mb: 1,
                    cursor: 'pointer',
                    backgroundColor: selectedPath === currentPath ? 'action.selected' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    },
                  }}
                  onClick={handleSelectCurrentFolder}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <FolderIcon color="primary" />
                    <Typography variant="body2" sx={{ flex: 1 }}>
                      {currentPath ? displayFilename(currentPath.split('/').pop()) : 'Racine'}
                    </Typography>
                    {selectedPath === currentPath && (
                      <CheckIcon color="primary" />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                    {currentPath || 'Racine du drive'}
                  </Typography>
                </Paper>

                {/* Liste des sous-dossiers */}
                {folders.length > 0 && (
                  <List dense>
                    {folders.map((folder) => (
                      <StyledListItem
                        key={folder.path}
                        onClick={() => handleNavigateToFolder(folder.path)}
                        selected={selectedPath === folder.path}
                        sx={{
                          backgroundColor: selectedPath === folder.path ? 'action.selected' : 'transparent',
                        }}
                      >
                        <ListItemIcon>
                          <FolderIcon color="primary" />
                        </ListItemIcon>
                        <ListItemText
                          primary={displayFilename(folder.name)}
                          secondary={folder.path}
                        />
                        {selectedPath === folder.path && (
                          <CheckIcon color="primary" />
                        )}
                      </StyledListItem>
                    ))}
                  </List>
                )}
              </>
            )}
          </>
        )}

        {/* Chemin sélectionné */}
        {selectedPath !== null && (
          <Paper variant="outlined" sx={{ p: 2, mt: 2, backgroundColor: 'action.selected' }}>
            <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
              Chemin sélectionné :
            </Typography>
            <Typography variant="body2" color="primary">
              {selectedPath || 'Racine'}
            </Typography>
          </Paper>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleResetToDefault} color="secondary">
          Réinitialiser
        </Button>
        <Button onClick={onClose}>
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={selectedPath === null}
        >
          Confirmer
        </Button>
      </DialogActions>

      {/* Dialog pour créer un nouveau dossier */}
      <Dialog
        open={showCreateFolderDialog}
        onClose={() => {
          if (!isCreatingFolder) {
            setShowCreateFolderDialog(false);
            setNewFolderName('');
            setError(null);
          }
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          Créer un nouveau dossier
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Créer un dossier dans : <strong>{currentPath || 'Racine'}</strong>
          </Typography>
          <TextField
            autoFocus
            fullWidth
            label="Nom du dossier"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newFolderName.trim() && !isCreatingFolder) {
                handleCreateFolder();
              }
            }}
            disabled={isCreatingFolder}
            error={!!error}
            helperText={error || 'Le nom sera automatiquement formaté (espaces remplacés par des tirets)'}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setShowCreateFolderDialog(false);
              setNewFolderName('');
              setError(null);
            }}
            disabled={isCreatingFolder}
          >
            Annuler
          </Button>
          <Button
            onClick={handleCreateFolder}
            variant="contained"
            disabled={!newFolderName.trim() || isCreatingFolder}
            startIcon={isCreatingFolder ? <CircularProgress size={16} /> : <CreateNewFolderIcon />}
          >
            {isCreatingFolder ? 'Création...' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default DrivePathSelector;

