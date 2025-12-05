/**
 * Drive Explorer - Affichage du contenu du drive
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Convertit un nom de fichier/dossier normalisé (avec underscores) en nom d'affichage (avec espaces)
 * @param {string} normalizedName - Nom normalisé avec underscores
 * @returns {string} - Nom d'affichage avec espaces
 */
export const displayFilename = (normalizedName) => {
  if (!normalizedName) return normalizedName;
  // Remplacer les underscores par des espaces pour l'affichage
  return normalizedName.replace(/_/g, ' ');
};

/**
 * Convertit un chemin normalisé en chemin d'affichage
 * @param {string} normalizedPath - Chemin normalisé avec underscores
 * @returns {string} - Chemin d'affichage avec espaces
 */
export const displayPath = (normalizedPath) => {
  if (!normalizedPath) return normalizedPath;
  // Séparer le chemin en segments et normaliser chacun
  const segments = normalizedPath.split('/');
  return segments.map(segment => displayFilename(segment)).join('/');
};
import {
  Box,
  List,
  ListItem,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Alert,
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  VideoFile as VideoIcon,
  AudioFile as AudioIcon,
  Description as DescriptionIcon,
  Archive as ArchiveIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  CloudUpload as UploadIcon,
  Visibility as VisibilityIcon,
  DriveFileMove as MoveIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { usePreload } from './hooks/usePreload';
import MoveDialog from './MoveDialog';
import { checkFileExists, findAvailableFileName } from './hooks/useUpload';

const ExplorerContainer = styled(Box)(({ theme, isDragOver }) => ({
  flex: 1,
  overflowY: 'auto',
  overflowX: 'hidden',
  backgroundColor: isDragOver ? theme.palette.primary.light + '10' : '#fff',
  borderRadius: theme.spacing(1),
  border: isDragOver ? `2px dashed ${theme.palette.primary.main}` : 'none',
  transition: 'all 0.2s ease-in-out',
  position: 'relative',
  width: '100%',
  maxWidth: '100%',
  // Masquer la barre de scroll verticale
  scrollbarWidth: 'none', // Firefox
  '&::-webkit-scrollbar': {
    display: 'none', // Chrome, Safari, Edge
  },
  msOverflowStyle: 'none', // IE et Edge (ancien)
}));

const SelectionBox = styled(Box)(({ theme }) => ({
  position: 'absolute',
  border: `2px dashed ${theme.palette.primary.main}`,
  backgroundColor: theme.palette.primary.light + '20',
  pointerEvents: 'none',
  zIndex: 10,
}));

const DragIndicator = styled(Box)(({ theme }) => ({
  position: 'fixed',
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  padding: theme.spacing(1, 2),
  borderRadius: theme.spacing(2),
  boxShadow: theme.shadows[4],
  pointerEvents: 'none',
  zIndex: 2000,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  fontSize: '0.875rem',
  fontWeight: 500,
  whiteSpace: 'nowrap',
}));

const ListHeader = styled(Paper)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr minmax(80px, 100px) minmax(120px, 150px) minmax(80px, 100px)',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[100],
  fontWeight: 'bold',
  borderRadius: 0,
  position: 'sticky',
  top: 0,
  zIndex: 1,
  minWidth: 0,
  overflow: 'hidden',
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
}));

const StyledListItem = styled(ListItem)(({ theme, isSelected, isDragOver }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr minmax(80px, 100px) minmax(120px, 150px) minmax(80px, 100px)',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  marginLeft: theme.spacing(2), // Margin à gauche pour la zone de sélection
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  backgroundColor: isDragOver 
    ? theme.palette.success.light + '30' 
    : isSelected 
      ? theme.palette.primary.main + '40' 
      : 'transparent',
  borderLeft: isDragOver 
    ? `3px solid ${theme.palette.success.main}` 
    : isSelected 
      ? `3px solid ${theme.palette.primary.dark}` 
      : 'none',
  minWidth: 0,
  width: '100%',
  maxWidth: '100%',
  boxSizing: 'border-box',
  '&:hover': {
    backgroundColor: isDragOver
      ? theme.palette.success.light + '40'
      : isSelected 
        ? theme.palette.primary.main + '50' 
        : theme.palette.action.hover,
  },
}));

const EmptyState = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '400px',
  color: theme.palette.text.secondary,
}));

const DriveExplorer = ({
  folders = [],
  files = [],
  onNavigateToFolder,
  onDeleteItem,
  onRefresh,
  onDropFiles,
  currentPath = '',
  onDraggedItemsChange,
}) => {
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [itemsToMove, setItemsToMove] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [renameConflict, setRenameConflict] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionBox, setSelectionBox] = useState(null);
  const [selectionStartPos, setSelectionStartPos] = useState(null);
  const [wasSelectionBox, setWasSelectionBox] = useState(false);
  const [justFinishedSelection, setJustFinishedSelection] = useState(false);
  const [draggedItems, setDraggedItems] = useState(null);
  const [dragOverFolder, setDragOverFolder] = useState(null);
  const [dragPosition, setDragPosition] = useState(null);
  const [mouseDownPos, setMouseDownPos] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);
  const { preloadOfficeFiles, isOfficeFile } = usePreload();

  // Précharger les fichiers Office dès l'affichage
  useEffect(() => {
    if (files.length > 0) {
      preloadOfficeFiles(files, 15); // Précharger les 15 premiers fichiers Office
    }
  }, [files]);

  // Réinitialiser la sélection quand on change de dossier
  useEffect(() => {
    setSelectedFiles(new Set());
  }, [currentPath]);

  // Gérer la touche Escape pour désélectionner
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && selectedFiles.size > 0) {
        setSelectedFiles(new Set());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedFiles]);

  // Gestion de la sélection multiple avec clic maintenu
  const handleMouseDown = useCallback((event, item) => {
    // Ignorer si c'est un clic droit ou si on clique sur un bouton
    if (event.button !== 0 || event.target.closest('button') || event.target.closest('[role="button"]')) {
      return;
    }

    // Enregistrer la position initiale pour détecter le drag
    setMouseDownPos({ x: event.clientX, y: event.clientY });
    setIsDragging(false);

    // Si on clique sur un élément de liste, ne pas bloquer le drag natif
    if (item) {
      // Ne pas faire preventDefault() ni stopPropagation() pour permettre le drag natif
      // La sélection sera gérée dans onClick si ce n'est pas un drag

      // Ne pas gérer la sélection ici, elle sera gérée dans onClick si ce n'est pas un drag
      // Cela permet au drag natif de fonctionner
      return;
    }

      // Si on clique sur le conteneur (pas sur un élément), démarrer une sélection par zone
    if (containerRef.current && (event.target === containerRef.current || event.target.closest('ul'))) {
      event.preventDefault();
      const rect = containerRef.current.getBoundingClientRect();
      const startX = event.clientX - rect.left;
      const startY = event.clientY - rect.top;
      
      setSelectionStartPos({ x: startX, y: startY });
      setSelectionBox({ x: startX, y: startY, width: 0, height: 0 });
      setIsSelecting(true);
      setWasSelectionBox(true);
    }
  }, [selectedFiles, files, folders]);

  const handleMouseMove = useCallback((event) => {
    // Détecter si on est en train de faire un drag (mouvement significatif)
    if (mouseDownPos && !isDragging) {
      const deltaX = Math.abs(event.clientX - mouseDownPos.x);
      const deltaY = Math.abs(event.clientY - mouseDownPos.y);
      // Si mouvement > 5px, considérer comme un drag
      if (deltaX > 5 || deltaY > 5) {
        setIsDragging(true);
      }
    }

    if (!isSelecting || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const currentY = event.clientY - rect.top;

    // Si on a une position de départ, créer la zone de sélection
    if (selectionStartPos) {
      const x = Math.min(selectionStartPos.x, currentX);
      const y = Math.min(selectionStartPos.y, currentY);
      const width = Math.abs(currentX - selectionStartPos.x);
      const height = Math.abs(currentY - selectionStartPos.y);

      setSelectionBox({ x, y, width, height });

      // Trouver tous les éléments dans la zone de sélection
      const allItems = [...files.map(f => ({ ...f, type: 'file' })), ...folders.map(f => ({ ...f, type: 'folder' }))];
      const selectedPaths = new Set();

      allItems.forEach(item => {
        const listItem = document.querySelector(`[data-item-path="${item.path}"]`);
        if (listItem) {
          const itemRect = listItem.getBoundingClientRect();
          const itemX = itemRect.left - rect.left;
          const itemY = itemRect.top - rect.top;
          const itemWidth = itemRect.width;
          const itemHeight = itemRect.height;

          // Vérifier si l'élément intersecte avec la zone de sélection
          if (
            itemX < x + width &&
            itemX + itemWidth > x &&
            itemY < y + height &&
            itemY + itemHeight > y
          ) {
            selectedPaths.add(item.path);
          }
        }
      });

      setSelectedFiles(selectedPaths);
    }
  }, [isSelecting, selectionStartPos, files, folders, mouseDownPos, isDragging]);

  const handleMouseUp = useCallback((event) => {
    // Ne jamais perdre la sélection au relâchement du clic
    // La sélection sera perdue seulement si on clique ailleurs (géré dans handleContainerClick)
    const hadSelectionBox = selectionBox && (selectionBox.width > 5 || selectionBox.height > 5);
    
    // Si on vient de faire une sélection par zone, marquer qu'on vient de finir une sélection
    if (hadSelectionBox || wasSelectionBox) {
      setJustFinishedSelection(true);
      // Réinitialiser le flag après un court délai pour permettre au onClick de l'ignorer
      setTimeout(() => {
        setJustFinishedSelection(false);
      }, 100);
    }
    
    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionBox(null);
    setSelectionStartPos(null);
    setWasSelectionBox(false);
    // Ne pas réinitialiser mouseDownPos ici, il sera réinitialisé dans onClick
    // Cela permet à onClick d'avoir accès à mouseDownPos pour détecter les clics vs drags
    setIsDragging(false);
  }, [selectionBox, wasSelectionBox]);

  // Ajouter les event listeners pour la sélection et détection du drag
  useEffect(() => {
    if (mouseDownPos || isSelecting) {
      const handleMouseUpGlobal = (event) => {
        handleMouseUp(event);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUpGlobal);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUpGlobal);
      };
    }
  }, [isSelecting, mouseDownPos, handleMouseMove, handleMouseUp]);

  // Gestion du drag des fichiers sélectionnés
  const handleDragStart = useCallback((event, item) => {
    // Marquer qu'un drag est en cours
    setIsDragging(true);
    
    // Si l'élément est sélectionné, on drag tous les éléments sélectionnés
    const itemsToDrag = selectedFiles.has(item.path) && selectedFiles.size > 1
      ? Array.from(selectedFiles).map(path => {
          const file = files.find(f => f.path === path);
          const folder = folders.find(f => f.path === path);
          return file ? { ...file, type: 'file' } : folder ? { ...folder, type: 'folder' } : null;
        }).filter(Boolean)
      : [item];

    setDraggedItems(itemsToDrag);
    
    // Notifier le parent des items dragués pour permettre le drop sur le breadcrumb
    if (onDraggedItemsChange) {
      onDraggedItemsChange(itemsToDrag);
    }
    
    // Position initiale de l'indicateur de drag
    setDragPosition({
      x: event.clientX + 10,
      y: event.clientY + 10,
    });
    
    // Créer un effet visuel de drag
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', ''); // Nécessaire pour Firefox
    }
  }, [selectedFiles, files, folders, onDraggedItemsChange]);

  // Suivre la position du curseur pendant le drag (au niveau global)
  useEffect(() => {
    if (draggedItems && draggedItems.length > 0) {
      const handleDragGlobal = (event) => {
        setDragPosition({
          x: event.clientX + 10,
          y: event.clientY + 10,
        });
      };

      document.addEventListener('dragover', handleDragGlobal);
      return () => {
        document.removeEventListener('dragover', handleDragGlobal);
      };
    }
  }, [draggedItems]);

  // Réinitialiser la position du drag à la fin
  const handleDragEnd = useCallback(() => {
    setDragPosition(null);
    setDraggedItems(null);
    setIsDragging(false);
    
    // Notifier le parent que le drag est terminé
    if (onDraggedItemsChange) {
      // Ne pas réinitialiser immédiatement pour permettre le drop sur le breadcrumb
      // Le breadcrumb réinitialisera après le drop
      setTimeout(() => {
        if (onDraggedItemsChange) {
          onDraggedItemsChange(null);
        }
      }, 100);
    }
    
    // Réinitialiser après un court délai pour permettre au onClick de détecter qu'il n'y a pas eu de drag
    setTimeout(() => {
      setMouseDownPos(null);
    }, 100);
  }, [onDraggedItemsChange]);

  // Gestion du drop sur un dossier
  const handleDropOnFolder = useCallback(async (event, targetFolder) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverFolder(null);

    if (!draggedItems || draggedItems.length === 0) return;

    // Vérifier qu'on ne déplace pas un dossier dans lui-même ou dans un de ses sous-dossiers
    const targetPath = targetFolder.path;
    const invalidPaths = draggedItems.filter(item => {
      if (item.type === 'folder') {
        return targetPath.startsWith(item.path) || item.path === targetPath;
      }
      return false;
    });

    if (invalidPaths.length > 0) {
      alert('Impossible de déplacer un dossier dans lui-même ou dans un de ses sous-dossiers');
      setDraggedItems(null);
      return;
    }

    // Déplacer chaque élément
    try {
      const movePromises = draggedItems.map(async (item) => {
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
      setSelectedFiles(new Set());
      setDraggedItems(null);
      setDragPosition(null);
      
      // Notifier le parent que le drag est terminé
      if (onDraggedItemsChange) {
        onDraggedItemsChange(null);
      }
      
      onRefresh();
    } catch (error) {
      alert(`Erreur lors du déplacement: ${error.message}`);
      setDraggedItems(null);
      setDragPosition(null);
    }
  }, [draggedItems, onRefresh]);

  // Utilitaire pour récupérer le token CSRF
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

  // Fonction récursive pour parcourir l'arborescence d'un dossier
  const traverseFileTree = useCallback((item, path = '', allFiles = []) => {
    return new Promise((resolve) => {
      if (item.isFile) {
        // C'est un fichier
        item.file((file) => {
          // Si le path est vide, c'est un fichier simple (pas dans un dossier)
          // On ne doit PAS ajouter de webkitRelativePath pour les fichiers simples
          if (path === '') {
            // Fichier simple : pas de webkitRelativePath
            allFiles.push(file);
          } else {
            // Fichier dans un dossier : créer un objet File avec webkitRelativePath pour préserver la structure
            const fileWithPath = new File([file], file.name, {
              type: file.type,
              lastModified: file.lastModified,
            });
            // Ajouter le chemin relatif seulement si le fichier est dans un dossier
            Object.defineProperty(fileWithPath, 'webkitRelativePath', {
              value: path + file.name,
              writable: false,
            });
            allFiles.push(fileWithPath);
          }
          resolve();
        }, () => {
          resolve();
        });
      } else if (item.isDirectory) {
        // C'est un dossier, parcourir récursivement
        const dirReader = item.createReader();
        const currentPath = path + item.name + '/';
        
        // Fonction récursive pour lire toutes les entrées (readEntries peut retourner par lots)
        const readAllEntries = () => {
          const entries = [];
          
          const readBatch = () => {
            dirReader.readEntries((batch) => {
              if (batch.length === 0) {
                // Plus d'entrées, traiter toutes les entrées collectées
                if (entries.length === 0) {
                  resolve();
                } else {
                  const promises = entries.map((entry) => traverseFileTree(entry, currentPath, allFiles));
                  Promise.all(promises).then(() => resolve());
                }
              } else {
                // Ajouter ce lot d'entrées
                entries.push(...batch);
                // Lire le lot suivant
                readBatch();
              }
            }, () => {
              // Traiter les entrées déjà collectées
              if (entries.length > 0) {
                const promises = entries.map((entry) => traverseFileTree(entry, currentPath, allFiles));
                Promise.all(promises).then(() => resolve());
              } else {
                resolve();
              }
            });
          };
          
          readBatch();
        };
        
        readAllEntries();
      } else {
        resolve();
      }
    });
  }, []);

  // Gestion du drag and drop
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    // Ne désactiver le drag over que si on quitte vraiment le conteneur
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDragOver(false);
    }
  }, []);

  const handleDrop = useCallback(async (event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);

    if (!onDropFiles) return;

    const items = event.dataTransfer.items;
    
    if (!items || items.length === 0) {
      // Fallback : utiliser les fichiers si items n'est pas disponible
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        onDropFiles(files);
      }
      return;
    }

    // Vérifier si on peut utiliser webkitGetAsEntry (pour les dossiers)
    const allFiles = [];
    const promises = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Vérifier si c'est un fichier ou un dossier
      if (item.webkitGetAsEntry) {
        const entry = item.webkitGetAsEntry();
        if (entry) {
          if (entry.isDirectory) {
            // C'est un dossier, parcourir récursivement avec traverseFileTree
            promises.push(traverseFileTree(entry, '', allFiles));
          } else if (entry.isFile) {
            // C'est un fichier simple : utiliser getAsFile directement (pas traverseFileTree)
            // pour éviter d'ajouter un webkitRelativePath inutile
            const file = item.getAsFile();
            if (file) {
              allFiles.push(file);
            }
          }
        } else {
          // Fallback : utiliser getAsFile
          const file = item.getAsFile();
          if (file) {
            allFiles.push(file);
          }
        }
      } else {
        // Fallback : utiliser getAsFile
        const file = item.getAsFile();
        if (file) {
          allFiles.push(file);
        }
      }
    }

    // Attendre que tous les fichiers soient récupérés
    await Promise.all(promises);
    
    if (allFiles.length > 0) {
      onDropFiles(allFiles);
    } else {
      // Fallback final : utiliser dataTransfer.files
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) {
        onDropFiles(files);
      }
    }
  }, [onDropFiles, traverseFileTree]);

  // Icônes par type de fichier
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'pdf':
        return <PdfIcon color="error" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return <ImageIcon color="primary" />;
      case 'mp4':
      case 'avi':
      case 'mov':
      case 'wmv':
        return <VideoIcon color="secondary" />;
      case 'mp3':
      case 'wav':
      case 'flac':
        return <AudioIcon color="info" />;
      case 'doc':
      case 'docx':
      case 'xls':
      case 'xlsx':
      case 'ppt':
      case 'pptx':
        return <DescriptionIcon color="success" />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return <ArchiveIcon color="warning" />;
      default:
        return <FileIcon />;
    }
  };

  // Formater la taille du fichier
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Formater la date
  const formatDate = (dateString) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Menu contextuel
  const handleContextMenu = (event, item) => {
    event.preventDefault();
    setSelectedItem(item);
    setContextMenu({
      mouseX: event.clientX + 2,
      mouseY: event.clientY - 6,
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleDownload = async (item = null) => {
    const fileToDownload = item || selectedItem;
    if (!fileToDownload) {
      console.error('Aucun fichier sélectionné pour le téléchargement');
      return;
    }

    try {
      const response = await fetch(
        `/api/drive-v2/download-url/?file_path=${encodeURIComponent(fileToDownload.path)}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }
      
      const data = await response.json();

      // Ouvrir l'URL de téléchargement
      if (data.download_url) {
        // Créer un lien temporaire pour forcer le téléchargement
        const link = document.createElement('a');
        link.href = data.download_url;
        link.download = fileToDownload.name;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        throw new Error('URL de téléchargement non disponible dans la réponse');
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      alert(`Erreur lors du téléchargement: ${error.message}`);
    }

    handleCloseContextMenu();
  };

  const handleDelete = async () => {
    if (!selectedItem) return;

    if (window.confirm(`Êtes-vous sûr de vouloir supprimer ${selectedItem.name} ?`)) {
      try {
        await onDeleteItem(selectedItem.path, selectedItem.type === 'folder');
        onRefresh();
      } catch (error) {
        // Erreur silencieuse
      }
    }

    handleCloseContextMenu();
  };

  // Prévisualiser un fichier (ouvrir dans nouvel onglet IMMÉDIATEMENT)
  const handlePreview = (file) => {
    // OPTIMISATION : Ouvrir l'onglet IMMÉDIATEMENT (pas d'attente)
    const params = new URLSearchParams({
      file_path: file.path,
      file_name: file.name,
      file_size: file.size.toString(),
      content_type: file.content_type || '',
    });

    // Ouvrir instantanément (le chargement se fera dans le nouvel onglet)
    window.open(
      `/drive-v2/preview?${params.toString()}`,
      '_blank'
    );

    handleCloseContextMenu();
  };

  // Double-clic sur un fichier
  const handleFileDoubleClick = (file) => {
    handlePreview(file);
  };

  // Ouvrir le dialog de déplacement
  const handleMove = () => {
    handleCloseContextMenu();
    
    // Si des éléments sont sélectionnés, les utiliser
    if (selectedFiles.size > 0) {
      const allItems = [
        ...folders.map(f => ({ ...f, type: 'folder' })),
        ...files.map(f => ({ ...f, type: 'file' }))
      ];
      const itemsToMoveList = allItems.filter(item => selectedFiles.has(item.path));
      setItemsToMove(itemsToMoveList);
    } else if (selectedItem) {
      // Sinon, utiliser l'élément du menu contextuel
      setItemsToMove([selectedItem]);
    } else {
      return;
    }
    
    setMoveDialogOpen(true);
  };

  // Ouvrir le dialog de renommage
  const handleRename = () => {
    if (!selectedItem) return;
    
    // Initialiser le nom avec le nom d'affichage (avec espaces)
    setNewName(displayFilename(selectedItem.name));
    setRenameConflict(null);
    setRenameDialogOpen(true);
    handleCloseContextMenu();
  };

  // Gérer le renommage avec vérification des conflits
  const handleRenameConfirm = async () => {
    if (!selectedItem || !newName.trim()) return;

    const trimmedName = newName.trim();
    
    // Extraire le chemin parent
    const parentPath = selectedItem.path.substring(0, selectedItem.path.lastIndexOf('/') + 1);
    
    // Vérifier si un fichier/dossier avec ce nom existe déjà (sauf si c'est le même élément)
    const isFolder = selectedItem.type === 'folder';
    const normalizedNewName = trimmedName.replace(/ /g, '_');
    
    // Construire le chemin complet du nouveau nom
    const newPath = parentPath + normalizedNewName + (isFolder ? '/' : '');
    
    // Vérifier si le nouveau nom est différent de l'ancien
    if (newPath === selectedItem.path) {
      // Le nom n'a pas changé, juste fermer le dialog
      setRenameDialogOpen(false);
      setNewName('');
      return;
    }

    // Vérifier les conflits
    try {
      const response = await fetch(
        `/api/drive-v2/list-content/?folder_path=${encodeURIComponent(parentPath)}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const items = isFolder ? (data.folders || []) : (data.files || []);
        
        // Vérifier si un élément avec ce nom existe déjà (et ce n'est pas l'élément actuel)
        const conflict = items.find(item => {
          const itemNormalizedName = item.name.replace(/ /g, '_');
          return itemNormalizedName === normalizedNewName && item.path !== selectedItem.path;
        });

        if (conflict) {
          // Conflit détecté
          // Trouver un nom disponible
          let suggestedName;
          if (isFolder) {
            // Pour les dossiers, créer un nom avec numéro entre parenthèses
            const normalizedBaseName = trimmedName.replace(/ /g, '_');
            for (let i = 1; i <= 1000; i++) {
              const candidateName = `${normalizedBaseName}_(${i})`;
              const candidatePath = parentPath + candidateName + '/';
              const exists = (data.folders || []).some(f => f.path === candidatePath);
              if (!exists) {
                suggestedName = `${trimmedName}_(${i})`;
                break;
              }
            }
            if (!suggestedName) {
              const timestamp = Date.now();
              suggestedName = `${trimmedName}_(${timestamp})`;
            }
          } else {
            // Pour les fichiers, utiliser findAvailableFileName
            suggestedName = await findAvailableFileName(trimmedName, parentPath);
          }
          
          setRenameConflict({
            exists: true,
            suggestedName: suggestedName,
          });
          return;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la vérification des conflits:', error);
    }

    // Pas de conflit, procéder au renommage
    await performRename(trimmedName);
  };

  // Effectuer le renommage
  const performRename = async (nameToUse) => {
    if (!selectedItem) return;

    try {
      const response = await fetch('/api/drive-v2/rename-item/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCookie('csrftoken'),
        },
        credentials: 'include',
        body: JSON.stringify({
          old_path: selectedItem.path,
          new_name: nameToUse,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        const errorMessage = errorData.error || `Erreur HTTP ${response.status}`;
        
        // Vérifier si l'erreur indique un conflit de nom
        if (errorMessage.includes('existe déjà') || 
            errorMessage.includes('already exists') ||
            errorMessage.includes('déjà')) {
          // C'est un conflit de nom, afficher le message de conflit
          const parentPath = selectedItem.path.substring(0, selectedItem.path.lastIndexOf('/') + 1);
          const isFolder = selectedItem.type === 'folder';
          let suggestedName;
          
          if (isFolder) {
            // Pour les dossiers, créer un nom avec numéro entre parenthèses
            const normalizedBaseName = nameToUse.replace(/ /g, '_');
            for (let i = 1; i <= 1000; i++) {
              const candidateName = `${normalizedBaseName}_(${i})`;
              const candidatePath = parentPath + candidateName + '/';
              // Vérifier si ce nom existe déjà
              const checkResponse = await fetch(
                `/api/drive-v2/list-content/?folder_path=${encodeURIComponent(parentPath)}`,
                {
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                }
              );
              if (checkResponse.ok) {
                const checkData = await checkResponse.json();
                const exists = (checkData.folders || []).some(f => f.path === candidatePath);
                if (!exists) {
                  suggestedName = `${nameToUse}_(${i})`;
                  break;
                }
              }
            }
            if (!suggestedName) {
              const timestamp = Date.now();
              suggestedName = `${nameToUse}_(${timestamp})`;
            }
          } else {
            // Pour les fichiers, utiliser findAvailableFileName
            suggestedName = await findAvailableFileName(nameToUse, parentPath);
          }
          
          setRenameConflict({
            exists: true,
            suggestedName: suggestedName,
          });
          return;
        }
        
        throw new Error(errorMessage);
      }

      // Succès
      setRenameDialogOpen(false);
      setNewName('');
      setRenameConflict(null);
      onRefresh();
    } catch (error) {
      console.error('Erreur lors du renommage:', error);
      // Ne pas afficher d'alerte si c'est un conflit (déjà géré ci-dessus)
      if (!error.message.includes('existe déjà') && 
          !error.message.includes('already exists') &&
          !error.message.includes('déjà')) {
        alert(`Erreur lors du renommage: ${error.message}`);
      }
    }
  };

  // Gérer "Continuer sans remplacer" (renommer avec un numéro)
  const handleRenameContinue = async () => {
    if (!renameConflict || !renameConflict.suggestedName) return;
    await performRename(renameConflict.suggestedName);
  };

  // Gérer "Remplacer" (supprimer l'ancien et renommer)
  const handleRenameReplace = async () => {
    if (!selectedItem || !newName.trim()) return;

    const trimmedName = newName.trim();
    const parentPath = selectedItem.path.substring(0, selectedItem.path.lastIndexOf('/') + 1);
    const normalizedNewName = trimmedName.replace(/ /g, '_');
    const isFolder = selectedItem.type === 'folder';
    const newPath = parentPath + normalizedNewName + (isFolder ? '/' : '');

    try {
      // Récupérer l'élément en conflit
      const response = await fetch(
        `/api/drive-v2/list-content/?folder_path=${encodeURIComponent(parentPath)}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const items = isFolder ? (data.folders || []) : (data.files || []);
        const conflictItem = items.find(item => {
          const itemNormalizedName = item.name.replace(/ /g, '_');
          return itemNormalizedName === normalizedNewName && item.path !== selectedItem.path;
        });

        if (conflictItem) {
          // Supprimer l'élément en conflit
          await onDeleteItem(conflictItem.path, isFolder);
        }
      }

      // Maintenant renommer
      await performRename(trimmedName);
    } catch (error) {
      console.error('Erreur lors du remplacement:', error);
      alert(`Erreur lors du remplacement: ${error.message}`);
    }
  };

  // Fermer le dialog de déplacement et rafraîchir
  const handleMoveComplete = (destinationPath) => {
    setMoveDialogOpen(false);
    setItemsToMove([]);
    setSelectedFiles(new Set());
    
    // Naviguer vers le dossier de destination
    if (destinationPath !== null && destinationPath !== undefined) {
      onNavigateToFolder(destinationPath);
    } else {
      onRefresh();
    }
  };

  // État vide
  if (folders.length === 0 && files.length === 0) {
    return (
      <ExplorerContainer
        isDragOver={isDragOver}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <EmptyState>
          <UploadIcon sx={{ fontSize: 80, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Ce dossier est vide
          </Typography>
          <Typography variant="body2">
            Glissez-déposez des fichiers ou cliquez sur Upload
          </Typography>
        </EmptyState>
      </ExplorerContainer>
    );
  }

  // Désélectionner en cliquant sur le conteneur vide
  const handleContainerClick = useCallback((event) => {
    // Ignorer si on vient de faire une sélection par zone (pour éviter de réinitialiser la sélection)
    if (justFinishedSelection) {
      return;
    }
    
    // Ne désélectionner que si on clique directement sur le conteneur (pas sur un élément de liste)
    const clickedListItem = event.target.closest('[data-item-path]');
    const clickedList = event.target.closest('ul');
    const clickedButton = event.target.closest('button') || event.target.closest('[role="button"]');
    
    // Si on clique sur un élément de liste, la sélection a déjà été gérée dans handleMouseDown
    // On ne fait rien ici pour les éléments de liste - la propagation a été stoppée
    if (clickedListItem) {
      return;
    }
    
    // Si on clique sur la liste mais pas sur un élément, ou sur le conteneur vide, désélectionner
    // Mais pas si on clique sur un bouton
    if (!clickedButton && ((clickedList && !clickedListItem) || (!clickedList && !clickedListItem))) {
      setSelectedFiles(new Set());
    }
  }, [selectedFiles, justFinishedSelection]);

  return (
    <ExplorerContainer
      ref={containerRef}
      isDragOver={isDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseDown={(e) => {
        // Si on clique sur le conteneur (pas sur un élément), démarrer la sélection
        if (!e.target.closest('[data-item-path]') && !e.target.closest('button')) {
          handleMouseDown(e, null);
        }
      }}
      onClick={(e) => {
        // Ne traiter le clic sur le conteneur que si ce n'est pas sur un élément de liste
        // Les éléments de liste ont déjà leur propre onClick qui stoppe la propagation
        if (!e.target.closest('[data-item-path]')) {
          handleContainerClick(e);
        }
      }}
    >
      {/* Zone de sélection rectangulaire */}
      {selectionBox && (
        <SelectionBox
          sx={{
            left: `${selectionBox.x}px`,
            top: `${selectionBox.y}px`,
            width: `${selectionBox.width}px`,
            height: `${selectionBox.height}px`,
          }}
        />
      )}

      {/* Indicateur de drag avec nombre d'éléments */}
      {dragPosition && draggedItems && draggedItems.length > 0 && (
        <DragIndicator
          sx={{
            left: `${dragPosition.x}px`,
            top: `${dragPosition.y}px`,
          }}
        >
          <FolderIcon sx={{ fontSize: 20 }} />
          <Typography variant="body2">
            {draggedItems.length} élément{draggedItems.length > 1 ? 's' : ''}
          </Typography>
        </DragIndicator>
      )}
      {/* En-tête */}
      <ListHeader elevation={0}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, overflow: 'hidden', width: '100%' }}>
          <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Nom</Typography>
          {selectedFiles.size > 0 && (
            <Chip 
              label={`${selectedFiles.size} sélectionné${selectedFiles.size > 1 ? 's' : ''}`}
              size="small"
              color="primary"
              sx={{ ml: 1, flexShrink: 0 }}
            />
          )}
        </Box>
        <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>Taille</Typography>
        <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>Date</Typography>
        <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>Actions</Typography>
      </ListHeader>

      {/* Liste */}
      <List sx={{ p: 0, width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
        {/* Dossiers */}
        {folders.map((folder) => {
          const folderItem = { ...folder, type: 'folder' };
          const isSelected = selectedFiles.has(folder.path);
          const isDragOverFolder = dragOverFolder === folder.path;
          
          return (
            <StyledListItem
              key={folder.path}
              data-item-path={folder.path}
              isSelected={isSelected}
              isDragOver={isDragOverFolder}
              draggable
              onDragStart={(e) => handleDragStart(e, folderItem)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (draggedItems && draggedItems.length > 0) {
                  setDragOverFolder(folder.path);
                }
              }}
              onDragLeave={(e) => {
                // Ne réinitialiser que si on quitte vraiment l'élément
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setDragOverFolder(null);
                }
              }}
              onDrop={(e) => handleDropOnFolder(e, folderItem)}
              onMouseDown={(e) => {
                handleMouseDown(e, folderItem);
              }}
              onClick={(e) => {
                e.stopPropagation();
                
                // Si on maintient Ctrl/Cmd ou Shift, toujours gérer la sélection (même si isDragging est true)
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                  // Si on maintient Shift, on sélectionne une plage
                  if (e.shiftKey && selectedFiles.size > 0) {
                    const allItems = [...folders.map(f => ({ ...f, type: 'folder' })), ...files.map(f => ({ ...f, type: 'file' }))];
                    const firstSelectedPath = Array.from(selectedFiles)[0];
                    const firstIndex = allItems.findIndex(i => i.path === firstSelectedPath);
                    const currentIndex = allItems.findIndex(i => i.path === folder.path);

                    if (firstIndex !== -1 && currentIndex !== -1) {
                      const minIndex = Math.min(firstIndex, currentIndex);
                      const maxIndex = Math.max(firstIndex, currentIndex);
                      const itemsToSelect = allItems.slice(minIndex, maxIndex + 1).map(i => i.path);
                      setSelectedFiles(new Set(itemsToSelect));
                    }
                  }
                  // Si on maintient Ctrl/Cmd, on toggle la sélection
                  else if (e.ctrlKey || e.metaKey) {
                    setSelectedFiles(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(folder.path)) {
                        newSet.delete(folder.path);
                      } else {
                        newSet.add(folder.path);
                      }
                      return newSet;
                    });
                  }
                }
                // Sinon, gérer la sélection seulement si ce n'était pas un drag
                else if (!isDragging && mouseDownPos) {
                  const deltaX = Math.abs(e.clientX - mouseDownPos.x);
                  const deltaY = Math.abs(e.clientY - mouseDownPos.y);
                  
                  // Si mouvement < 5px, c'est un clic, pas un drag
                  if (deltaX < 5 && deltaY < 5) {
                    // Si l'élément n'est pas déjà sélectionné, on remplace la sélection
                    if (!selectedFiles.has(folder.path)) {
                      setSelectedFiles(new Set([folder.path]));
                    }
                  }
                }
                // Réinitialiser mouseDownPos après le clic
                setMouseDownPos(null);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                // Double-clic pour naviguer dans le dossier
                if (!isSelecting) {
                  onNavigateToFolder(folder.path);
                }
              }}
              onContextMenu={(e) => handleContextMenu(e, folderItem)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, overflow: 'hidden' }}>
                <FolderIcon color="primary" sx={{ flexShrink: 0 }} />
                <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayFilename(folder.name)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                --
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                --
              </Typography>
              <Box sx={{ minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                <Tooltip title="Supprimer">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, folderItem);
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </StyledListItem>
          );
        })}

        {/* Fichiers */}
        {files.map((file) => {
          const fileItem = { ...file, type: 'file' };
          const isSelected = selectedFiles.has(file.path);
          
          return (
            <StyledListItem
              key={file.path}
              data-item-path={file.path}
              isSelected={isSelected}
              draggable
              onDragStart={(e) => handleDragStart(e, fileItem)}
              onDragEnd={handleDragEnd}
              onMouseDown={(e) => {
                handleMouseDown(e, fileItem);
              }}
              onClick={(e) => {
                e.stopPropagation();
                
                // Si on maintient Ctrl/Cmd ou Shift, toujours gérer la sélection (même si isDragging est true)
                if (e.ctrlKey || e.metaKey || e.shiftKey) {
                  // Si on maintient Shift, on sélectionne une plage
                  if (e.shiftKey && selectedFiles.size > 0) {
                    const allItems = [...folders.map(f => ({ ...f, type: 'folder' })), ...files.map(f => ({ ...f, type: 'file' }))];
                    const firstSelectedPath = Array.from(selectedFiles)[0];
                    const firstIndex = allItems.findIndex(i => i.path === firstSelectedPath);
                    const currentIndex = allItems.findIndex(i => i.path === file.path);

                    if (firstIndex !== -1 && currentIndex !== -1) {
                      const minIndex = Math.min(firstIndex, currentIndex);
                      const maxIndex = Math.max(firstIndex, currentIndex);
                      const itemsToSelect = allItems.slice(minIndex, maxIndex + 1).map(i => i.path);
                      setSelectedFiles(new Set(itemsToSelect));
                    }
                  }
                  // Si on maintient Ctrl/Cmd, on toggle la sélection
                  else if (e.ctrlKey || e.metaKey) {
                    setSelectedFiles(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(file.path)) {
                        newSet.delete(file.path);
                      } else {
                        newSet.add(file.path);
                      }
                      return newSet;
                    });
                  }
                }
                // Sinon, gérer la sélection seulement si ce n'était pas un drag
                else if (!isDragging && mouseDownPos) {
                  const deltaX = Math.abs(e.clientX - mouseDownPos.x);
                  const deltaY = Math.abs(e.clientY - mouseDownPos.y);
                  
                  // Si mouvement < 5px, c'est un clic, pas un drag
                  if (deltaX < 5 && deltaY < 5) {
                    // Si l'élément n'est pas déjà sélectionné, on remplace la sélection
                    if (!selectedFiles.has(file.path)) {
                      setSelectedFiles(new Set([file.path]));
                    }
                  }
                }
                // Réinitialiser mouseDownPos après le clic
                setMouseDownPos(null);
              }}
              onContextMenu={(e) => handleContextMenu(e, fileItem)}
              onDoubleClick={(e) => {
                e.stopPropagation();
                // Ne prévisualiser que si on n'est pas en train de sélectionner
                if (!isSelecting) {
                  handleFileDoubleClick(file);
                }
              }}
              sx={{ cursor: 'pointer' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, overflow: 'hidden' }}>
                <Box sx={{ flexShrink: 0 }}>{getFileIcon(file.name)}</Box>
                <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayFilename(file.name)}
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formatFileSize(file.size)}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {formatDate(file.last_modified)}
              </Typography>
              <Box sx={{ minWidth: 0, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5 }}>
                <Tooltip title="Télécharger">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(fileItem);
                    }}
                  >
                    <DownloadIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Plus d'actions">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e, fileItem);
                    }}
                  >
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </StyledListItem>
          );
        })}
      </List>

      {/* Menu contextuel */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        {selectedItem?.type === 'file' && (
          <>
            <MenuItem onClick={() => handlePreview(selectedItem)}>
              <ListItemIcon>
                <VisibilityIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Prévisualiser</ListItemText>
            </MenuItem>
            <MenuItem onClick={handleDownload}>
              <ListItemIcon>
                <DownloadIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText>Télécharger</ListItemText>
            </MenuItem>
          </>
        )}
        <MenuItem onClick={handleRename}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Renommer</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleMove}>
          <ListItemIcon>
            <MoveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>
            Déplacer {selectedFiles.size > 0 ? `(${selectedFiles.size})` : ''}
          </ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Supprimer</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialog de déplacement */}
      <MoveDialog
        open={moveDialogOpen}
        onClose={() => {
          setMoveDialogOpen(false);
          setItemsToMove([]);
        }}
        itemsToMove={itemsToMove}
        onMoveComplete={handleMoveComplete}
        onNavigate={onNavigateToFolder}
      />

      {/* Dialog de renommage */}
      <Dialog
        open={renameDialogOpen}
        onClose={() => {
          setRenameDialogOpen(false);
          setNewName('');
          setRenameConflict(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Renommer {selectedItem?.type === 'folder' ? 'le dossier' : 'le fichier'}
        </DialogTitle>
        <DialogContent>
          {renameConflict && renameConflict.exists && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Un {selectedItem?.type === 'folder' ? 'dossier' : 'fichier'} avec ce nom existe déjà.
            </Alert>
          )}
          <TextField
            autoFocus
            margin="dense"
            label="Nouveau nom"
            fullWidth
            variant="outlined"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setRenameConflict(null);
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !renameConflict) {
                handleRenameConfirm();
              }
            }}
            helperText={
              renameConflict && renameConflict.exists
                ? `Nom suggéré: ${displayFilename(renameConflict.suggestedName)}`
                : 'Les espaces seront automatiquement remplacés par des underscores'
            }
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setRenameDialogOpen(false);
              setNewName('');
              setRenameConflict(null);
            }}
          >
            Annuler
          </Button>
          {renameConflict && renameConflict.exists ? (
            <>
              <Button
                onClick={handleRenameContinue}
                variant="outlined"
              >
                Continuer sans remplacer
              </Button>
              <Button
                onClick={handleRenameReplace}
                variant="contained"
                color="error"
              >
                Remplacer
              </Button>
            </>
          ) : (
            <Button
              onClick={handleRenameConfirm}
              variant="contained"
              disabled={!newName.trim()}
            >
              Renommer
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </ExplorerContainer>
  );
};

export default DriveExplorer;
