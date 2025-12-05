/**
 * Drive Explorer - Affichage du contenu du drive
 */

import React, { useState, useEffect } from 'react';
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

const ExplorerContainer = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  backgroundColor: '#fff',
  borderRadius: theme.spacing(1),
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
}) => {
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const { preloadOfficeFiles, isOfficeFile } = usePreload();

  // Précharger les fichiers Office dès l'affichage
  useEffect(() => {
    if (files.length > 0) {
      preloadOfficeFiles(files, 15); // Précharger les 15 premiers fichiers Office
    }
  }, [files]);

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
      <ExplorerContainer>
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
    <ExplorerContainer>
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
