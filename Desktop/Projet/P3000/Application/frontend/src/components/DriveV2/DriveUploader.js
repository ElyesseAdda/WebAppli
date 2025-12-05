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
  Folder as FolderIcon,
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
  const [uploadMode, setUploadMode] = useState('files'); // 'files' ou 'folder'
  const { uploadFiles, uploading, progress, errors } = useUpload();

  // Sélection de fichiers
  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  // Sélection de dossier
  const handleFolderSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  // Drag & Drop
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    // Activer le drag & drop pour tous les modes maintenant
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    setIsDragOver(false);
  }, []);

  // Fonction récursive pour parcourir l'arborescence d'un dossier
  const traverseFileTree = useCallback((item, path = '', allFiles = []) => {
    return new Promise((resolve) => {
      if (item.isFile) {
        // C'est un fichier
        item.file((file) => {
          // Créer un objet File avec webkitRelativePath pour préserver la structure
          const fileWithPath = new File([file], file.name, {
            type: file.type,
            lastModified: file.lastModified,
          });
          // Ajouter le chemin relatif
          Object.defineProperty(fileWithPath, 'webkitRelativePath', {
            value: path + file.name,
            writable: false,
          });
          allFiles.push(fileWithPath);
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

  const handleDrop = useCallback(async (event) => {
    event.preventDefault();
    setIsDragOver(false);

    const items = event.dataTransfer.items;
    
    if (!items || items.length === 0) {
      // Fallback : utiliser les fichiers si items n'est pas disponible
      const files = Array.from(event.dataTransfer.files);
      setSelectedFiles(files);
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
            // C'est un dossier, parcourir récursivement
            promises.push(traverseFileTree(entry, '', allFiles));
          } else if (entry.isFile) {
            // C'est un fichier
            promises.push(traverseFileTree(entry, '', allFiles));
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
      setSelectedFiles(allFiles);
    } else {
      // Fallback final : utiliser dataTransfer.files
      const files = Array.from(event.dataTransfer.files);
      setSelectedFiles(files);
    }
  }, [traverseFileTree]);

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
    // Utiliser le chemin relatif comme clé si disponible, sinon le nom
    const fileKey = file.webkitRelativePath || file.name;
    const fileProgress = progress[fileKey];
    if (!fileProgress) return null;

    if (fileProgress.error) {
      return <ErrorIcon color="error" />;
    }
    if (fileProgress.complete) {
      return <CheckIcon color="success" />;
    }
    return <LinearProgress variant="determinate" value={fileProgress.progress} sx={{ width: 100 }} />;
  };

  // Obtenir le chemin d'affichage d'un fichier
  const getFileDisplayPath = (file) => {
    if (file.webkitRelativePath) {
      // Pour les fichiers d'un dossier, afficher le chemin relatif
      return file.webkitRelativePath;
    }
    return file.name;
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

        {/* Mode de sélection */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Button
            variant={uploadMode === 'files' ? 'contained' : 'outlined'}
            onClick={() => {
              setUploadMode('files');
              setSelectedFiles([]);
            }}
            size="small"
          >
            Fichiers
          </Button>
          <Button
            variant={uploadMode === 'folder' ? 'contained' : 'outlined'}
            onClick={() => {
              setUploadMode('folder');
              setSelectedFiles([]);
            }}
            size="small"
            startIcon={<FolderIcon />}
          >
            Dossier
          </Button>
        </Box>

        {/* Drop Zone */}
        <DropZone
          isDragOver={isDragOver}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => {
            if (uploadMode === 'folder') {
              document.getElementById('folder-input').click();
            } else {
              document.getElementById('file-input').click();
            }
          }}
        >
          <UploadIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            {uploadMode === 'folder' 
              ? 'Glissez-déposez un dossier ici'
              : 'Glissez-déposez vos fichiers ici'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            ou cliquez pour sélectionner {uploadMode === 'folder' ? 'un dossier' : 'des fichiers'}
          </Typography>
        </DropZone>

        {/* Input caché pour fichiers */}
        <input
          type="file"
          id="file-input"
          multiple
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />

        {/* Input caché pour dossier */}
        <input
          type="file"
          id="folder-input"
          webkitdirectory="true"
          directory=""
          multiple
          onChange={handleFolderSelect}
          style={{ display: 'none' }}
        />

        {/* Liste des fichiers sélectionnés */}
        {selectedFiles.length > 0 && (
          <>
            <Typography variant="subtitle1" gutterBottom>
              {uploadMode === 'folder' ? 'Contenu du dossier' : 'Fichiers sélectionnés'} ({selectedFiles.length})
            </Typography>
            
            {/* Avertissement si mode dossier mais pas de fichiers avec chemin relatif */}
            {uploadMode === 'folder' && selectedFiles.filter(f => f.webkitRelativePath && f.webkitRelativePath !== '').length === 0 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                Aucun fichier détecté dans le dossier. Assurez-vous que le dossier contient des fichiers et réessayez.
              </Alert>
            )}
            
            <List dense sx={{ maxHeight: 300, overflow: 'auto', mb: 2 }}>
              {selectedFiles.map((file, index) => {
                const displayPath = getFileDisplayPath(file);
                const isInSubfolder = displayPath.includes('/');
                const hasRelativePath = file.webkitRelativePath && file.webkitRelativePath !== '';
                
                return (
                  <ListItem
                    key={index}
                    secondaryAction={getFileStatus(file)}
                    sx={{
                      opacity: (!hasRelativePath && uploadMode === 'folder') ? 0.5 : 1,
                    }}
                  >
                    <ListItemIcon>
                      {isInSubfolder ? <FolderIcon color="primary" /> : <FileIcon />}
                    </ListItemIcon>
                    <ListItemText
                      primary={displayPath}
                      secondary={
                        uploadMode === 'folder' && !hasRelativePath 
                          ? '⚠️ Dossier vide ou non détecté' 
                          : formatFileSize(file.size)
                      }
                      primaryTypographyProps={{
                        sx: {
                          fontFamily: isInSubfolder ? 'monospace' : 'inherit',
                          fontSize: isInSubfolder ? '0.875rem' : 'inherit',
                        }
                      }}
                    />
                  </ListItem>
                );
              })}
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
