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
  Card,
  CardContent,
  Chip,
  Fade,
  Slide,
  Collapse,
  alpha,
  Stack,
} from '@mui/material';
import {
  Folder as FolderIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Check as CheckIcon,
  CreateNewFolder as CreateNewFolderIcon,
  FolderOpen as FolderOpenIcon,
  CheckCircle as CheckCircleIcon,
  DriveFileMove as DriveFileMoveIcon,
  Construction as ConstructionIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axios from 'axios';

const API_BASE_URL = '/api/drive-v2';

const StyledListItem = styled(ListItem)(({ theme, selected }) => ({
  cursor: 'pointer',
  borderRadius: theme.shape.borderRadius,
  marginBottom: theme.spacing(0.5),
  transition: theme.transitions.create(['background-color', 'transform', 'box-shadow'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    backgroundColor: alpha(theme.palette.primary.main, 0.08),
    transform: 'translateX(4px)',
    boxShadow: theme.shadows[1],
  },
  ...(selected && {
    backgroundColor: alpha(theme.palette.primary.main, 0.12),
    borderLeft: `3px solid ${theme.palette.primary.main}`,
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.16),
    },
  }),
}));

const StyledBreadcrumbLink = styled(Link)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(0.5),
  padding: theme.spacing(0.5, 1),
  borderRadius: theme.shape.borderRadius,
  textDecoration: 'none',
  transition: theme.transitions.create(['background-color', 'color'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
    color: theme.palette.primary.main,
  },
}));

const StyledCard = styled(Card)(({ theme, selected }) => ({
  cursor: 'pointer',
  transition: theme.transitions.create(['transform', 'box-shadow', 'border-color'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[4],
  },
  ...(selected && {
    border: `2px solid ${theme.palette.primary.main}`,
    backgroundColor: alpha(theme.palette.primary.main, 0.04),
  }),
}));

const StyledSearchField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    borderRadius: theme.shape.borderRadius * 2,
    backgroundColor: alpha(theme.palette.background.paper, 0.8),
    transition: theme.transitions.create(['background-color', 'box-shadow'], {
      duration: theme.transitions.duration.short,
    }),
    '&:hover': {
      backgroundColor: theme.palette.background.paper,
    },
    '&.Mui-focused': {
      backgroundColor: theme.palette.background.paper,
      boxShadow: theme.shadows[2],
    },
  },
}));

const displayFilename = (filename) => {
  if (!filename) return 'Racine';
  // Décoder le caractère "∕" (U+2215) en "/" pour l'affichage
  // Puis remplacer les underscores par des espaces
  return filename.replace(/\u2215/g, '/').replace(/_/g, ' ');
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
  
  // Cache pour les résultats de recherche
  const [searchCache, setSearchCache] = useState(new Map());

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
      // ✅ Remplacer Appels_Offres/ par Chantiers/ dans le defaultPath pour l'affichage uniquement
      let displayPath = defaultPath || '';
      if (displayPath && displayPath.startsWith('Appels_Offres/')) {
        displayPath = displayPath.replace('Appels_Offres/', 'Chantiers/');
      }
      
      setSelectedPath(displayPath);
      setSearchTerm('');
      setSearchResults([]);
      setShowSearchResults(false);
      setCurrentPath(displayPath);
      setError(null);
      setNewFolderName('');
      setShowCreateFolderDialog(false);
      // Charger le chemin par défaut ou la racine (avec le préfixe remplacé pour l'affichage)
      fetchFolderContent(displayPath);
    } else {
      // Nettoyer le cache quand le modal se ferme
      setFolderCache(new Map());
      setNewFolderName('');
      setShowCreateFolderDialog(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultPath]);

  // Fonction helper pour calculer la profondeur d'un chemin
  const getDepth = useCallback((path) => {
    if (!path) return 0;
    return path.split('/').filter(p => p).length;
  }, []);

  // Fonction helper pour trier et limiter les résultats par profondeur
  const sortAndLimitResults = useCallback((folders, maxResults = 100) => {
    // Ajouter la profondeur si elle n'existe pas
    const foldersWithDepth = folders.map(f => ({
      ...f,
      depth: f.depth !== undefined ? f.depth : getDepth(f.path || '')
    }));
    
    const sorted = foldersWithDepth.sort((a, b) => {
      const pathA = (a.path || '').toLowerCase();
      const pathB = (b.path || '').toLowerCase();
      
      // Prioriser les dossiers contenant "chantier" dans leur chemin
      const aInChantier = pathA.includes('chantier');
      const bInChantier = pathB.includes('chantier');
      
      if (aInChantier && !bInChantier) return -1;
      if (!aInChantier && bInChantier) return 1;
      
      // Trier par profondeur d'abord (niveaux moins profonds en premier)
      if (a.depth !== b.depth) {
        return a.depth - b.depth;
      }
      
      // Si même profondeur, trier par nom
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
    
    return sorted.slice(0, maxResults);
  }, [getDepth]);

  // Recherche de dossiers optimisée avec affichage progressif
  const handleSearch = useCallback(async (term) => {
    const trimmedTerm = term.trim();
    
    if (!trimmedTerm || trimmedTerm.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    // Vérifier le cache d'abord
    const cacheKey = trimmedTerm.toLowerCase();
    if (searchCache.has(cacheKey)) {
      const cachedResults = searchCache.get(cacheKey);
      setSearchResults(cachedResults);
      setShowSearchResults(true);
      return;
    }

    setIsSearching(true);
    setShowSearchResults(true);
    setSearchResults([]); // Réinitialiser les résultats

    try {
      const maxResultsPerSearch = 50;
      const allFolders = [];
      const existingPaths = new Set();
      
      // 1. Recherche prioritaire dans Chantiers/ - Afficher IMMÉDIATEMENT chaque résultat
      try {
        const chantierResponse = await axios.get(`${API_BASE_URL}/search/`, {
          params: {
            search_term: trimmedTerm,
            folder_path: 'Chantiers/',
            max_results: maxResultsPerSearch,
          },
          withCredentials: true,
        });
        
        const chantierFolders = chantierResponse.data.folders || [];
        
        // Afficher chaque résultat IMMÉDIATEMENT dès qu'il est reçu
        for (const folder of chantierFolders) {
          if (!existingPaths.has(folder.path)) {
            existingPaths.add(folder.path);
            allFolders.push(folder);
            
            // Ajouter immédiatement à l'affichage
            setSearchResults(prev => {
              const updated = [...prev, folder];
              return sortAndLimitResults(updated);
            });
            
            // Petit délai pour que l'utilisateur voie la progression (optionnel, peut être réduit)
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        
      } catch (err) {
        console.warn('Erreur lors de la recherche dans Chantiers:', err);
      }

      // 2. Recherche globale en parallèle - Afficher IMMÉDIATEMENT chaque résultat
      const globalSearchPromise = axios.get(`${API_BASE_URL}/search/`, {
        params: {
          search_term: trimmedTerm,
          folder_path: '', // Recherche globale
          max_results: maxResultsPerSearch,
        },
        withCredentials: true,
      }).then(async (globalResponse) => {
        const globalFolders = globalResponse.data.folders || [];
        
        // Filtrer pour éviter les doublons et exclure ceux déjà dans Chantiers/
        const additionalFolders = globalFolders.filter(f => 
          !existingPaths.has(f.path) && 
          !(f.path || '').toLowerCase().startsWith('chantiers/')
        );
        
        // Afficher chaque résultat IMMÉDIATEMENT dès qu'il est reçu
        for (const folder of additionalFolders) {
          if (!existingPaths.has(folder.path)) {
            existingPaths.add(folder.path);
            allFolders.push(folder);
            
            // Ajouter immédiatement à l'affichage
            setSearchResults(prev => {
              const updated = [...prev, folder];
              return sortAndLimitResults(updated);
            });
            
            // Petit délai pour que l'utilisateur voie la progression (optionnel, peut être réduit)
            await new Promise(resolve => setTimeout(resolve, 10));
          }
        }
        
        return additionalFolders;
      }).catch(err => {
        console.warn('Erreur lors de la recherche globale:', err);
        return [];
      });

      // Attendre la fin de la recherche globale (mais les résultats sont déjà affichés)
      await globalSearchPromise;
      
      // Trier et limiter les résultats finaux pour le cache
      const finalResults = sortAndLimitResults(allFolders);
      
      // Mettre en cache les résultats finaux
      setSearchCache(prev => {
        const newCache = new Map(prev);
        if (newCache.size >= 20) {
          const firstKey = newCache.keys().next().value;
          newCache.delete(firstKey);
        }
        newCache.set(cacheKey, finalResults);
        return newCache;
      });

      // Les résultats sont déjà affichés progressivement, on peut juste s'assurer qu'ils sont bien triés
      setSearchResults(prev => sortAndLimitResults(prev));
      
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchCache, sortAndLimitResults]);

  // Gestionnaire pour lancer la recherche avec Entrée
  const handleSearchKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (searchTerm && searchTerm.trim().length >= 2) {
        handleSearch(searchTerm);
      } else {
        setSearchResults([]);
        setShowSearchResults(false);
      }
    }
  }, [searchTerm, handleSearch]);
  
  // Nettoyer le cache de recherche quand le modal se ferme
  useEffect(() => {
    if (!open) {
      setSearchCache(new Map());
    }
  }, [open]);

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
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 300 }}
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: (theme) => theme.shadows[10],
        },
      }}
    >
      <DialogTitle
        sx={{
          background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.main}05 100%)`,
          borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <DriveFileMoveIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Sélectionner le chemin du drive
            </Typography>
          </Box>
          <IconButton 
            onClick={onClose} 
            size="small" 
            aria-label="Fermer"
            sx={{
              '&:hover': {
                backgroundColor: (theme) => alpha(theme.palette.error.main, 0.1),
                color: 'error.main',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Fade in={!!error} timeout={300}>
          <Box>
            {error && (
              <Alert 
                severity="error" 
                sx={{ mb: 2 }} 
                onClose={() => setError(null)}
                variant="filled"
              >
                {error}
              </Alert>
            )}
          </Box>
        </Fade>

        {/* Barre de recherche */}
        <Box sx={{ mb: 3 }}>
          <StyledSearchField
            fullWidth
            size="medium"
            placeholder="Rechercher un dossier (min. 2 caractères, puis appuyez sur Entrée)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={handleSearchKeyPress}
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: searchTerm && searchTerm.trim().length >= 2 && (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => handleSearch(searchTerm)}
                    edge="end"
                    color="primary"
                    size="small"
                    aria-label="Lancer la recherche"
                  >
                    <SearchIcon />
                  </IconButton>
                </InputAdornment>
              ),
            }}
            helperText={
              searchTerm && searchTerm.trim().length < 2 
                ? 'Tapez au moins 2 caractères puis appuyez sur Entrée' 
                : searchTerm && searchTerm.trim().length >= 2
                ? 'Appuyez sur Entrée ou cliquez sur l\'icône pour rechercher'
                : ''
            }
          />
        </Box>

        {/* Résultats de recherche */}
        <Slide direction="down" in={showSearchResults} mountOnEnter unmountOnExit>
          <Box>
            {showSearchResults && (
              <>
                {searchResults.length === 0 && isSearching ? (
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'center', 
                      alignItems: 'center', 
                      p: 4, 
                      gap: 2,
                      borderRadius: 2,
                      backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
                    }}
                  >
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary">
                      Recherche en cours...
                    </Typography>
                  </Box>
                ) : searchResults.length > 0 ? (
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      mb: 3, 
                      maxHeight: 300, 
                      overflow: 'auto',
                      boxShadow: (theme) => theme.shadows[2],
                    }}
                  >
                    <Box
                      sx={{
                        p: 1.5,
                        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
                        borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                        {searchResults.length} dossier{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
                      </Typography>
                      {isSearching && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={16} />
                          <Typography variant="caption" color="text.secondary">
                            Recherche en cours...
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    <List>
                      {searchResults.map((folder, index) => {
                        const isInChantier = (folder.path || '').toLowerCase().includes('chantier');
                        return (
                          <Fade in timeout={300} key={folder.path} style={{ transitionDelay: `${index * 50}ms` }}>
                            <StyledListItem
                              onClick={() => handleSelectFromSearch(folder)}
                              selected={selectedPath === folder.path}
                              sx={{
                                ...(isInChantier && {
                                  borderLeft: (theme) => `3px solid ${theme.palette.warning.main}`,
                                  backgroundColor: (theme) => alpha(theme.palette.warning.main, 0.05),
                                }),
                              }}
                            >
                              <ListItemIcon>
                                <FolderIcon color={selectedPath === folder.path ? 'primary' : 'action'} />
                              </ListItemIcon>
                              <ListItemText
                                primary={
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography variant="body1" sx={{ fontWeight: selectedPath === folder.path ? 600 : 400 }}>
                                      {displayFilename(folder.name)}
                                    </Typography>
                                    {isInChantier && (
                                      <Chip
                                        icon={<ConstructionIcon />}
                                        label="Chantier"
                                        size="small"
                                        color="warning"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '0.65rem' }}
                                      />
                                    )}
                                  </Box>
                                }
                                secondary={folder.path || 'Racine'}
                              />
                              {selectedPath === folder.path && (
                                <CheckCircleIcon color="primary" />
                              )}
                            </StyledListItem>
                          </Fade>
                        );
                      })}
                    </List>
                  </Card>
                ) : (
                  <Card 
                    variant="outlined" 
                    sx={{ 
                      p: 4, 
                      mb: 3, 
                      textAlign: 'center',
                      backgroundColor: (theme) => alpha(theme.palette.grey[500], 0.04),
                    }}
                  >
                    <SearchIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Aucun dossier trouvé
                    </Typography>
                  </Card>
                )}
              </>
            )}
          </Box>
        </Slide>

        {/* Breadcrumb */}
        {!showSearchResults && (
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              mb: 3,
              borderRadius: 2,
              backgroundColor: (theme) => alpha(theme.palette.background.default, 0.5),
            }}
          >
            <Breadcrumbs
              separator={<NavigateNextIcon fontSize="small" color="action" />}
              sx={{ display: 'flex', flexWrap: 'wrap' }}
            >
              {buildBreadcrumb().map((item, index) => (
                <StyledBreadcrumbLink
                  key={index}
                  component="button"
                  variant="body2"
                  onClick={() => handleNavigateToFolder(item.path)}
                >
                  {index === 0 ? (
                    <HomeIcon fontSize="small" color="primary" />
                  ) : (
                    <Chip
                      label={displayFilename(item.name)}
                      size="small"
                      variant={index === buildBreadcrumb().length - 1 ? 'filled' : 'outlined'}
                      color={index === buildBreadcrumb().length - 1 ? 'primary' : 'default'}
                      sx={{ height: 24 }}
                    />
                  )}
                </StyledBreadcrumbLink>
              ))}
            </Breadcrumbs>
          </Paper>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Liste des dossiers */}
        {!showSearchResults && (
          <>
            {loading ? (
              <Box 
                sx={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  p: 6, 
                  gap: 2,
                }}
              >
                <CircularProgress size={40} />
                <Typography variant="body2" color="text.secondary">
                  Chargement des dossiers...
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {/* Bouton pour créer un nouveau dossier */}
                <Button
                  variant="contained"
                  startIcon={<CreateNewFolderIcon />}
                  onClick={() => setShowCreateFolderDialog(true)}
                  fullWidth
                  sx={{
                    py: 1.5,
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 600,
                    boxShadow: (theme) => theme.shadows[2],
                    '&:hover': {
                      boxShadow: (theme) => theme.shadows[4],
                    },
                  }}
                >
                  Créer un nouveau dossier ici
                </Button>

                {/* Option pour sélectionner le dossier actuel */}
                <StyledCard
                  variant="outlined"
                  selected={selectedPath === currentPath}
                  onClick={handleSelectCurrentFolder}
                >
                  <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                      {selectedPath === currentPath ? (
                        <FolderOpenIcon color="primary" fontSize="large" />
                      ) : (
                        <FolderIcon color="action" fontSize="large" />
                      )}
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          {currentPath ? displayFilename(currentPath.split('/').pop()) : 'Racine'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {currentPath || 'Racine du drive'}
                        </Typography>
                      </Box>
                      {selectedPath === currentPath && (
                        <CheckCircleIcon color="primary" />
                      )}
                    </Box>
                  </CardContent>
                </StyledCard>

                {/* Liste des sous-dossiers */}
                {folders.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5, px: 1 }}>
                      Sous-dossiers ({folders.length})
                    </Typography>
                    <List>
                      {folders.map((folder, index) => (
                        <Fade in timeout={300} key={folder.path} style={{ transitionDelay: `${index * 30}ms` }}>
                          <StyledListItem
                            onClick={() => handleNavigateToFolder(folder.path)}
                            selected={selectedPath === folder.path}
                          >
                            <ListItemIcon>
                              {selectedPath === folder.path ? (
                                <FolderOpenIcon color="primary" />
                              ) : (
                                <FolderIcon color="action" />
                              )}
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography variant="body1" sx={{ fontWeight: selectedPath === folder.path ? 600 : 400 }}>
                                  {displayFilename(folder.name)}
                                </Typography>
                              }
                              secondary={
                                <Typography variant="caption" color="text.secondary">
                                  {folder.path}
                                </Typography>
                              }
                            />
                            {selectedPath === folder.path && (
                              <CheckCircleIcon color="primary" />
                            )}
                          </StyledListItem>
                        </Fade>
                      ))}
                    </List>
                  </Box>
                )}
                {folders.length === 0 && !loading && (
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 4,
                      textAlign: 'center',
                      backgroundColor: (theme) => alpha(theme.palette.grey[500], 0.04),
                    }}
                  >
                    <FolderIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      Aucun sous-dossier dans ce répertoire
                    </Typography>
                  </Paper>
                )}
              </Stack>
            )}
          </>
        )}

        {/* Chemin sélectionné */}
        <Collapse in={selectedPath !== null} timeout={300}>
          <Card
            variant="outlined"
            sx={{
              mt: 3,
              p: 2,
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.08),
              border: (theme) => `2px solid ${theme.palette.primary.main}`,
              borderRadius: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CheckCircleIcon color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                Chemin sélectionné
              </Typography>
            </Box>
            <Chip
              label={selectedPath || 'Racine'}
              color="primary"
              variant="filled"
              sx={{ fontWeight: 500 }}
            />
          </Card>
        </Collapse>
      </DialogContent>
      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: (theme) => `1px solid ${theme.palette.divider}`,
          gap: 1,
        }}
      >
        <Button 
          onClick={handleResetToDefault} 
          color="secondary"
          sx={{ textTransform: 'none' }}
        >
          Réinitialiser
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button 
          onClick={onClose}
          sx={{ textTransform: 'none' }}
        >
          Annuler
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={selectedPath === null}
          startIcon={selectedPath !== null && <CheckIcon />}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            boxShadow: (theme) => theme.shadows[2],
            '&:hover': {
              boxShadow: (theme) => theme.shadows[4],
            },
          }}
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
        TransitionComponent={Fade}
        TransitionProps={{ timeout: 300 }}
        PaperProps={{
          sx: {
            borderRadius: 2,
          },
        }}
      >
        <DialogTitle
          sx={{
            background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.main}05 100%)`,
            borderBottom: (theme) => `1px solid ${theme.palette.divider}`,
            pb: 2,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <CreateNewFolderIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Créer un nouveau dossier
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              mb: 3,
              backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.04),
              borderRadius: 2,
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              Emplacement :
            </Typography>
            <Chip
              label={currentPath || 'Racine'}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Paper>
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
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </DialogContent>
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: (theme) => `1px solid ${theme.palette.divider}`,
            gap: 1,
          }}
        >
          <Button
            onClick={() => {
              setShowCreateFolderDialog(false);
              setNewFolderName('');
              setError(null);
            }}
            disabled={isCreatingFolder}
            sx={{ textTransform: 'none' }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleCreateFolder}
            variant="contained"
            disabled={!newFolderName.trim() || isCreatingFolder}
            startIcon={isCreatingFolder ? <CircularProgress size={16} /> : <CreateNewFolderIcon />}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              boxShadow: (theme) => theme.shadows[2],
              '&:hover': {
                boxShadow: (theme) => theme.shadows[4],
              },
            }}
          >
            {isCreatingFolder ? 'Création...' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
};

export default DrivePathSelector;

