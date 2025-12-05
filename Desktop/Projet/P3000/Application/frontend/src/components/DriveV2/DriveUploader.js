/**
 * Drive Uploader - Composant d'upload de fichiers
 */

import React, { useState, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Alert,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useUpload } from './hooks/useUpload';

const UploaderContainer = styled(Box)(({ theme }) => ({
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
}));

const UploaderPaper = styled(Paper)(({ theme }) => ({
  width: '90%',
  maxWidth: 600,
  maxHeight: '80vh',
  overflow: 'auto',
  padding: theme.spacing(3),
}));

const DropZone = styled(Box)(({ theme, isDragOver }) => ({
  border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.grey[300]}`,
  borderRadius: theme.spacing(1),
  padding: theme.spacing(4),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: isDragOver ? theme.palette.primary.light + '20' : 'transparent',
  transition: 'all 0.2s ease-in-out',
  marginBottom: theme.spacing(2),
  '&:hover': {
    backgroundColor: theme.palette.grey[50],
    borderColor: theme.palette.primary.main,
  },
}));

const DriveUploader = ({ currentPath, onClose, onUploadComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const { uploadFiles, uploading, progress, errors } = useUpload();

  // Sélection de fichiers
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  // Drag & Drop
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(false);

    const files = Array.from(event.dataTransfer.files);
    setSelectedFiles(files);
  }, []);

  // Upload
  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      await uploadFiles(selectedFiles, currentPath);
      // Attendre un peu pour que l'utilisateur voie le succès
      setTimeout(() => {
        onUploadComplete();
      }, 1000);
    } catch (error) {
      // Erreur silencieuse
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

  // Statut d'un fichier
  const getFileStatus = (file) => {
    const fileProgress = progress[file.name];
    if (!fileProgress) return null;

    if (fileProgress.error) {
      return <ErrorIcon color="error" />;
    }
    if (fileProgress.complete) {
      return <CheckIcon color="success" />;
    }
    return <LinearProgress variant="determinate" value={fileProgress.progress} sx={{ width: 100 }} />;
  };

  return (
    <UploaderContainer onClick={onClose}>
      <UploaderPaper onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Upload de fichiers
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Destination */}
        <Alert severity="info" sx={{ mb: 2 }}>
          Destination: {currentPath || 'Racine'}
        </Alert>

        {/* Drop Zone */}
        <DropZone
          isDragOver={isDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => document.getElementById('file-input').click()}
        >
          <UploadIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Glissez-déposez vos fichiers ici
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ou cliquez pour sélectionner
          </Typography>
        </DropZone>

        {/* Input caché */}
        <input
          type="file"
          id="file-input"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Liste des fichiers sélectionnés */}
        {selectedFiles.length > 0 && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              Fichiers sélectionnés ({selectedFiles.length})
            </Typography>
            <List dense sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
              {selectedFiles.map((file, index) => (
                <ListItem
                  key={index}
                  secondaryAction={getFileStatus(file)}
                >
                  <ListItemIcon>
                    <FileIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={formatFileSize(file.size)}
                  />
                </ListItem>
              ))}
            </List>
          </>
        )}

        {/* Erreurs */}
        {Object.keys(errors).length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {Object.keys(errors).length} fichier(s) en erreur
          </Alert>
        )}

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Button onClick={onClose} disabled={uploading}>
            Annuler
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || uploading}
            startIcon={uploading ? null : <UploadIcon />}
          >
            {uploading ? 'Upload en cours...' : 'Upload'}
          </Button>
        </Box>
      </UploaderPaper>
    </UploaderContainer>
  );
};

export default DriveUploader;
