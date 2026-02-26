/**
 * MoveDialog - Modal pour déplacer des fichiers/dossiers
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
  Backdrop,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';
import { displayFilename } from './DriveExplorer';

const API_BASE_URL = '/api/drive-v2';

const StyledListItem = styled(ListItem)(({ theme }) => ({
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
}));

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

const MoveDialog = ({ open, onClose, itemsToMove, onMoveComplete, onNavigate }) => {
  const [currentPath, setCurrentPath] = useState('');
  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDestination, setSelectedDestination] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);
  
  // Cache pour les dossiers visités (améliore les performances)
  const [folderCache, setFolderCache] = useState(new Map());

  // Charger le contenu du dossier actuel avec cache
  const fetchFolderContent = useCallback(async (folderPath = '') => {
    // Vérifier le cache d'abord
    if (folderCache.has(folderPath)) {
      const cachedData = folderCache.get(folderPath);
      setFolders(cachedData);
      setCurrentPath(folderPath);
      return;
    }

    setLoading(true);
    setError(null);
    // Définir le chemin immédiatement pour éviter de revenir à la racine
    setCurrentPath(folderPath);

    try {
      const response = await axios.get(`${API_BASE_URL}/list-content/`, {
        params: { folder_path: folderPath },
        withCredentials: true,
      });

      // Filtrer les dossiers pour exclure ceux qui sont dans itemsToMove
      const allFolders = response.data.folders || [];
      const itemsToMovePaths = itemsToMove.map(item => item.path);
      const filteredFolders = allFolders.filter(folder => {
        // Exclure les dossiers qui sont dans itemsToMove
        if (itemsToMovePaths.includes(folder.path)) {
          return false;
        }
        // Exclure les dossiers qui sont des sous-dossiers d'un dossier à déplacer
        return !itemsToMovePaths.some(itemPath => {
          if (itemPath.endsWith('/')) {
            return folder.path.startsWith(itemPath);
          }
          return false;
        });
      });

      // Mettre en cache
      setFolderCache(prev => new Map(prev).set(folderPath, filteredFolders));
      setFolders(filteredFolders);
      // S'assurer que le chemin est bien défini
      setCurrentPath(folderPath);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      // En cas d'erreur, ne pas réinitialiser le chemin
    } finally {
      setLoading(false);
    }
  }, [itemsToMove, folderCache]);

  // Charger le contenu initial
  useEffect(() => {
    if (open) {
      // Réinitialiser seulement à l'ouverture
      setSelectedDestination(null);
      setSearchTerm('');
      setSearchResults([]);
      setShowSearchResults(false);
      setCurrentPath('');
      setError(null);
      // Charger la racine
      fetchFolderContent('');
    } else {
      // Nettoyer le cache quand le modal se ferme
      setFolderCache(new Map());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Retirer fetchFolderContent des dépendances pour éviter les rechargements

  // Recherche de dossiers
  const handleSearch = useCallback(async (term) => {
    if (!term || term.trim() === '') {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);
    setError(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/search/`, {
        params: { 
          search_term: term.trim(),
          max_results: 100 // Augmenter pour trouver plus de résultats
        },
        withCredentials: true,
      });

      const data = response.data;
      
      // Filtrer pour ne garder que les dossiers et exclure ceux dans itemsToMove
      const itemsToMovePaths = itemsToMove.map(item => {
        // Normaliser les chemins des items à déplacer
        return item.path.endsWith('/') ? item.path : item.path + '/';
      });
      const allFolders = data.folders || [];
      
      const filteredFolders = allFolders.filter(folder => {
        // Normaliser le chemin du dossier (s'assurer qu'il se termine par /)
        const folderPath = folder.path.endsWith('/') ? folder.path : folder.path + '/';
        
        // Exclure les dossiers qui sont dans itemsToMove (comparaison normalisée)
        if (itemsToMovePaths.some(itemPath => {
          const normalizedFolderPath = folderPath.endsWith('/') ? folderPath : folderPath + '/';
          return itemPath === normalizedFolderPath || normalizedFolderPath === itemPath;
        })) {
          return false;
        }
        
        // Exclure les dossiers qui sont des sous-dossiers d'un dossier à déplacer
        return !itemsToMovePaths.some(itemPath => {
          return folderPath.startsWith(itemPath);
        });
      });

      setSearchResults(filteredFolders);
    } catch (err) {
      console.error('Erreur de recherche:', err);
      console.error('Détails:', err.response?.data); // Debug
      setError(err.response?.data?.error || err.message || 'Erreur lors de la recherche');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [itemsToMove]);

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
    // Ne pas recharger si on est déjà dans ce dossier
    if (currentPath === folderPath) {
      setSelectedDestination(folderPath);
      return;
    }
    
    fetchFolderContent(folderPath);
    setSelectedDestination(folderPath);
    setSearchTerm('');
    setShowSearchResults(false);
  };

  // Sélectionner un dossier depuis les résultats de recherche
  const handleSelectFromSearch = (folder) => {
    setSelectedDestination(folder.path);
    // Naviguer vers le dossier pour voir son contenu
    fetchFolderContent(folder.path);
    setSearchTerm('');
    setShowSearchResults(false);
  };

  // Sélectionner le dossier actuel comme destination
  const handleSelectCurrentFolder = () => {
    setSelectedDestination(currentPath);
  };

  // Confirmer le déplacement
  const handleConfirmMove = async () => {
    if (selectedDestination === null) {
      setError('Veuillez sélectionner un dossier de destination');
      return;
    }

    setLoading(true);
    setIsTransferring(true);
    setError(null);

    try {
      const movePromises = itemsToMove.map(async (item) => {
        const fileName = item.name;
        const destPath = selectedDestination + fileName + (item.type === 'folder' ? '/' : '');
        
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
      
      // Naviguer vers le dossier de destination
      if (onNavigate && selectedDestination !== null) {
        onNavigate(selectedDestination);
      }
      
      if (onMoveComplete) {
        onMoveComplete(selectedDestination);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors du déplacement');
    } finally {
      setLoading(false);
      setIsTransferring(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        if (!isTransferring) {
          onClose();
        }
      }}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h6">
            Déplacer {itemsToMove.length > 1 ? `${itemsToMove.length} éléments` : displayFilename(itemsToMove[0]?.name)}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <ArrowBackIcon />
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
                      selected={selectedDestination === folder.path}
                      sx={{
                        backgroundColor: selectedDestination === folder.path ? 'action.selected' : 'transparent',
                      }}
                    >
                      <ListItemIcon>
                        <FolderIcon color="primary" />
                      </ListItemIcon>
                      <ListItemText
                        primary={displayFilename(folder.name)}
                        secondary={folder.path || 'Racine'}
                      />
                    </StyledListItem>
                  ))}
                </List>
              </Paper>
            ) : searchTerm.trim() ? (
              <Alert severity="info" sx={{ mb: 2 }}>
                Aucun dossier trouvé pour "{searchTerm}"
              </Alert>
            ) : null}
            {showSearchResults && <Divider sx={{ mb: 2 }} />}
          </>
        )}

        {/* Breadcrumb */}
        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ mb: 2 }}>
          {buildBreadcrumb().map((item, index) => (
            <Link
              key={index}
              component="button"
              variant="body2"
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
              {displayFilename(item.name)}
            </Link>
          ))}
        </Breadcrumbs>

        {/* Liste des dossiers */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper variant="outlined" sx={{ 
            maxHeight: 400, 
            overflow: 'auto',
            scrollbarWidth: 'none', // Firefox
            '&::-webkit-scrollbar': { display: 'none' }, // Chrome, Safari, Edge
            msOverflowStyle: 'none', // IE et Edge (ancien)
          }}>
            <List>
              {/* Option pour sélectionner le dossier actuel */}
              <StyledListItem
                onClick={handleSelectCurrentFolder}
                selected={selectedDestination === currentPath}
                sx={{
                  backgroundColor: selectedDestination === currentPath ? 'action.selected' : 'transparent',
                }}
              >
                <ListItemIcon>
                  {currentPath ? <FolderIcon /> : <HomeIcon />}
                </ListItemIcon>
                <ListItemText
                  primary={currentPath ? 'Dossier actuel' : 'Racine'}
                  secondary={currentPath || 'Sélectionner la racine comme destination'}
                />
              </StyledListItem>

              {/* Liste des sous-dossiers */}
              {folders.map((folder) => (
                <StyledListItem
                  key={folder.path}
                  onClick={() => {
                    // Clic simple : sélectionner
                    setSelectedDestination(folder.path);
                  }}
                  onDoubleClick={() => {
                    // Double-clic : naviguer
                    handleNavigateToFolder(folder.path);
                  }}
                  selected={selectedDestination === folder.path}
                  sx={{
                    backgroundColor: selectedDestination === folder.path ? 'action.selected' : 'transparent',
                  }}
                >
                  <ListItemIcon>
                    <FolderIcon color={selectedDestination === folder.path ? 'primary' : 'inherit'} />
                  </ListItemIcon>
                  <ListItemText
                    primary={displayFilename(folder.name)}
                    secondary={selectedDestination === folder.path ? 'Destination sélectionnée' : 'Clic pour sélectionner, double-clic pour naviguer'}
                  />
                </StyledListItem>
              ))}
            </List>
          </Paper>
        )}

        {folders.length === 0 && !loading && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'center' }}>
            Aucun dossier disponible dans ce répertoire
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Annuler
        </Button>
        <Button
          onClick={handleConfirmMove}
          variant="contained"
          disabled={loading || selectedDestination === null}
        >
          {loading ? <CircularProgress size={20} /> : 'Déplacer'}
        </Button>
      </DialogActions>

      <Backdrop
        open={isTransferring}
        sx={(theme) => ({
          color: '#fff',
          zIndex: theme.zIndex.modal + 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        })}
      >
        <CircularProgress color="inherit" />
        <Typography variant="body1" fontWeight={600}>
          Transfert en cours...
        </Typography>
        <Typography variant="body2">
          Déplacement de {itemsToMove.length} élément{itemsToMove.length > 1 ? 's' : ''} en cours
        </Typography>
      </Backdrop>
    </Dialog>
  );
};

export default MoveDialog;
