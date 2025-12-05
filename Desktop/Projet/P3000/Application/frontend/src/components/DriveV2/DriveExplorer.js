/**
 * Drive Explorer - Affichage du contenu du drive
 */

import React, { useState, useEffect, useCallback } from 'react';
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
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { usePreload } from './hooks/usePreload';

const ExplorerContainer = styled(Box)(({ theme, isDragOver }) => ({
  flex: 1,
  overflow: 'auto',
  backgroundColor: isDragOver ? theme.palette.primary.light + '10' : '#fff',
  borderRadius: theme.spacing(1),
  border: isDragOver ? `2px dashed ${theme.palette.primary.main}` : 'none',
  transition: 'all 0.2s ease-in-out',
}));

const ListHeader = styled(Paper)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 100px 150px 100px',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.grey[100],
  fontWeight: 'bold',
  borderRadius: 0,
  position: 'sticky',
  top: 0,
  zIndex: 1,
}));

const StyledListItem = styled(ListItem)(({ theme }) => ({
  display: 'grid',
  gridTemplateColumns: '1fr 100px 150px 100px',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
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
}) => {
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const { preloadOfficeFiles, isOfficeFile } = usePreload();

  // Précharger les fichiers Office dès l'affichage
  useEffect(() => {
    if (files.length > 0) {
      preloadOfficeFiles(files, 15); // Précharger les 15 premiers fichiers Office
    }
  }, [files]);

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

  const handleDownload = async () => {
    if (!selectedItem) return;

    try {
      const response = await fetch(
        `/api/drive-v2/download-url/?file_path=${encodeURIComponent(selectedItem.path)}`
      );
      const data = await response.json();

      // Ouvrir l'URL de téléchargement
      window.open(data.download_url, '_blank');
    } catch (error) {
      // Erreur silencieuse
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

  return (
    <ExplorerContainer
      isDragOver={isDragOver}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* En-tête */}
      <ListHeader elevation={0}>
        <Typography variant="subtitle2">Nom</Typography>
        <Typography variant="subtitle2">Taille</Typography>
        <Typography variant="subtitle2">Date</Typography>
        <Typography variant="subtitle2">Actions</Typography>
      </ListHeader>

      {/* Liste */}
      <List sx={{ p: 0 }}>
        {/* Dossiers */}
        {folders.map((folder) => (
          <StyledListItem
            key={folder.path}
            onClick={() => onNavigateToFolder(folder.path)}
            onContextMenu={(e) => handleContextMenu(e, folder)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FolderIcon color="primary" />
              <Typography variant="body2">{folder.name}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              --
            </Typography>
            <Typography variant="body2" color="text.secondary">
              --
            </Typography>
            <Box>
              <Tooltip title="Supprimer">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleContextMenu(e, folder);
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </StyledListItem>
        ))}

        {/* Fichiers */}
        {files.map((file) => (
          <StyledListItem
            key={file.path}
            onContextMenu={(e) => handleContextMenu(e, file)}
            onDoubleClick={() => handleFileDoubleClick(file)}
            sx={{ cursor: 'pointer' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getFileIcon(file.name)}
              <Typography variant="body2">{file.name}</Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              {formatFileSize(file.size)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(file.last_modified)}
            </Typography>
            <Box>
              <Tooltip title="Télécharger">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem(file);
                    handleDownload();
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
                    handleContextMenu(e, file);
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </StyledListItem>
        ))}
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
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>Supprimer</ListItemText>
        </MenuItem>
      </Menu>
    </ExplorerContainer>
  );
};

export default DriveExplorer;
