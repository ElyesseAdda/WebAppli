/**
 * Drive Uploader - Composant d'upload de fichiers
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Divider,
  Collapse,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon,
  Folder as FolderIcon,
  Close as CloseIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useUpload } from './hooks/useUpload';
import { displayFilename } from './DriveExplorer';
import { normalizeFilename } from './services/pathNormalizationService';

// Helper pour construire l'arborescence
const buildFileTree = (files) => {
  const root = { name: 'root', children: {}, files: [] };

  files.forEach(file => {
    const path = file.webkitRelativePath || '';
    if (!path) {
      root.files.push(file);
      return;
    }

    const parts = path.split('/');
    let current = root;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current.children[part]) {
        current.children[part] = { name: part, children: {}, files: [] };
      }
      current = current.children[part];
    }

    current.files.push(file);
  });

  return root;
};

const FileTreeItem = ({ name, node, level, getFileStatus, formatFileSize, uploading }) => {
  const [open, setOpen] = React.useState(false);
  const hasContent = Object.keys(node.children).length > 0 || node.files.length > 0;

  if (name === 'root') {
    return (
      <>
        {Object.entries(node.children).map(([childName, childNode]) => (
          <FileTreeItem
            key={childName}
            name={childName}
            node={childNode}
            level={0}
            getFileStatus={getFileStatus}
            formatFileSize={formatFileSize}
            uploading={uploading}
          />
        ))}
        {node.files.map((file, idx) => (
          <FileItem
            key={idx}
            file={file}
            level={0}
            getFileStatus={getFileStatus}
            formatFileSize={formatFileSize}
          />
        ))}
      </>
    );
  }

  return (
    <>
      <ListItemButton
        onClick={() => setOpen(!open)}
        sx={{ pl: level * 2 + 2, py: 0.5 }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          <FolderIcon sx={{ color: 'amber.500', fontSize: 20 }} />
        </ListItemIcon>
        <ListItemText 
          primary={name} 
          primaryTypographyProps={{ sx: { fontSize: '0.875rem', fontWeight: 600 } }}
        />
        {hasContent && (open ? <ExpandLess sx={{ fontSize: 18 }} /> : <ExpandMore sx={{ fontSize: 18 }} />)}
      </ListItemButton>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <List component="div" disablePadding>
          {Object.entries(node.children).map(([childName, childNode]) => (
            <FileTreeItem
              key={childName}
              name={childName}
              node={childNode}
              level={level + 1}
              getFileStatus={getFileStatus}
              formatFileSize={formatFileSize}
              uploading={uploading}
            />
          ))}
          {node.files.map((file, idx) => (
            <FileItem
              key={idx}
              file={file}
              level={level + 1}
              getFileStatus={getFileStatus}
              formatFileSize={formatFileSize}
            />
          ))}
        </List>
      </Collapse>
    </>
  );
};

const FileItem = ({ file, level, getFileStatus, formatFileSize }) => {
  return (
    <ListItem
      secondaryAction={getFileStatus(file)}
      sx={{ pl: level * 2 + 2, py: 0.5 }}
    >
      <ListItemIcon sx={{ minWidth: 32 }}>
        <FileIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
      </ListItemIcon>
      <ListItemText
        primary={file.name}
        secondary={formatFileSize(file.size)}
        primaryTypographyProps={{
          sx: {
            fontSize: '0.8125rem',
            fontWeight: 400,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }
        }}
        secondaryTypographyProps={{ sx: { fontSize: '0.7rem' } }}
      />
    </ListItem>
  );
};

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
  maxHeight: '90vh',
  overflow: 'hidden', // On cache l'overflow pour gérer le défilement dans le contenu
  padding: 0, // Le padding sera géré par les sous-blocs
  borderRadius: theme.spacing(2),
  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
  display: 'flex',
  flexDirection: 'column',
}));

const DropZone = styled(Box)(({ theme, isDragOver }) => ({
  border: `2px dashed ${isDragOver ? theme.palette.primary.main : theme.palette.grey[300]}`,
  borderRadius: theme.spacing(1.5),
  padding: theme.spacing(5, 3),
  textAlign: 'center',
  cursor: 'pointer',
  backgroundColor: isDragOver ? theme.palette.primary.light + '10' : theme.palette.grey[50],
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  margin: theme.spacing(2),
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: theme.spacing(1),
  '&:hover': {
    backgroundColor: theme.palette.primary.light + '05',
    borderColor: theme.palette.primary.main,
    transform: 'translateY(-2px)',
  },
}));

const DriveUploader = ({ currentPath, onClose, onUploadComplete, initialFiles = [], onProgress = null, onUploadStart = null, onReopenUploadDialog = null, onCancel = null }) => {
  const [selectedFiles, setSelectedFiles] = useState(initialFiles);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadMode, setUploadMode] = useState('files'); // 'files' ou 'folder'
  const { uploadFiles, detectConflicts, findAvailableFileName, cancelUpload, uploading, progress, errors } = useUpload();
  const cancelAnalysisRef = useRef(false);
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [filesToReplace, setFilesToReplace] = useState(new Set());

  // Calcul du progrès global
  const totalProgress = useMemo(() => {
    if (selectedFiles.length === 0) return 0;
    const progressValues = Object.values(progress);
    if (progressValues.length === 0) return 0;
    
    // Calculer la moyenne du progrès de tous les fichiers sélectionnés
    const sum = progressValues.reduce((acc, curr) => acc + (curr.progress || 0), 0);
    return Math.round(sum / selectedFiles.length);
  }, [progress, selectedFiles]);

  const completedCount = useMemo(() => {
    return Object.values(progress).filter(p => p.complete).length;
  }, [progress]);

  // Calculer les statistiques totales (nombre de fichiers et taille totale)
  const totalStats = useMemo(() => {
    if (selectedFiles.length === 0) {
      return { totalFiles: 0, totalSize: 0 };
    }
    
    // Pour l'upload, on a déjà les fichiers avec leur taille
    const totalSize = selectedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    return {
      totalFiles: selectedFiles.length,
      totalSize: totalSize,
    };
  }, [selectedFiles]);

  // Notifier le début avec les stats totales
  useEffect(() => {
    if (!onProgress || !uploading || selectedFiles.length === 0) return;
    
    // Au début, notifier avec les stats totales
    if (Object.keys(progress).length === 0) {
      onProgress({
        phase: 'upload',
        progress: 0,
        loaded: 0,
        total: totalStats.totalSize,
        currentItem: '',
        currentItemIndex: 0,
        totalItems: totalStats.totalFiles,
      });
      return;
    }
    
    const progressValues = Object.values(progress);
    if (progressValues.length === 0) return;
    
    // Calculer la progression globale basée sur la taille (plus précis)
    const completedFiles = progressValues.filter(p => p.complete).length;
    
    // Calculer la taille uploadée basée sur la progression de chaque fichier
    let uploadedSize = 0;
    selectedFiles.forEach(file => {
      const fileKey = file.webkitRelativePath || file.name;
      const fileProgress = progress[fileKey];
      if (fileProgress) {
        uploadedSize += (file.size || 0) * (fileProgress.progress || 0) / 100;
      }
    });
    
    // Calculer le pourcentage global basé sur la taille
    const globalProgress = totalStats.totalSize > 0 
      ? Math.round((uploadedSize / totalStats.totalSize) * 100)
      : 0;
    
    // Trouver le fichier en cours (non complété)
    const currentFileProgress = progressValues.find(p => !p.complete);
    const currentFileName = currentFileProgress ? 
      Object.keys(progress).find(key => progress[key] === currentFileProgress) : 
      (completedFiles < selectedFiles.length ? selectedFiles[completedFiles]?.name : '');
    
    onProgress({
      phase: 'upload',
      progress: globalProgress,
      loaded: uploadedSize,
      total: totalStats.totalSize,
      currentItem: currentFileName || '',
      currentItemIndex: completedFiles,
      totalItems: totalStats.totalFiles,
    });
  }, [progress, uploading, selectedFiles, onProgress, totalStats]);

  const fileTree = useMemo(() => buildFileTree(selectedFiles), [selectedFiles]);

  // Mettre à jour les fichiers sélectionnés si initialFiles change
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      setSelectedFiles(initialFiles);
      // Déterminer automatiquement le mode en fonction des fichiers
      const hasRelativePath = initialFiles.some(f => f.webkitRelativePath && f.webkitRelativePath !== '');
      if (hasRelativePath) {
        setUploadMode('folder');
      } else {
        // Si aucun fichier n'a de chemin relatif, c'est un upload de fichiers simples
        setUploadMode('files');
      }
    } else {
      // Réinitialiser le mode si pas de fichiers
      setUploadMode('files');
    }
  }, [initialFiles]);

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
          // Note: Le chemin 'path' contient déjà les noms de dossiers originaux
          // La normalisation sera faite lors de l'upload
          const fileWithPath = new File([file], file.name, {
            type: file.type,
            lastModified: file.lastModified,
          });
          // Ajouter le chemin relatif (non normalisé pour l'instant)
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
      // Ouvrir immédiatement le modal de progression AVANT la détection des conflits
      // pour éviter l'effet de "bug" pendant l'analyse des fichiers volumineux
      if (onUploadStart) {
        onUploadStart();
        // Ajouter un petit délai pour garantir que le modal a le temps de se rendre
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Notifier le début de l'analyse
      if (onProgress) {
        onProgress({
          phase: 'upload',
          progress: 0,
          loaded: 0,
          total: totalStats.totalSize,
          currentItem: 'Analyse des fichiers...',
          currentItemIndex: 0,
          totalItems: totalStats.totalFiles,
        });
      }
      
      // Réinitialiser le flag d'annulation
      cancelAnalysisRef.current = false;
      
      // Détecter les conflits (cela peut prendre du temps pour des fichiers volumineux)
      const detectedConflicts = await detectConflicts(selectedFiles, currentPath);
      
      // Vérifier si l'opération a été annulée
      if (cancelAnalysisRef.current) {
        if (onProgress) {
          onProgress(null);
        }
        if (onCancel) {
          onCancel();
        }
        return;
      }
      
      if (detectedConflicts.length > 0) {
        // Fermer le modal de progression et rouvrir le modal d'upload pour gérer les conflits
        if (onProgress) {
          onProgress(null);
        }
        // Rouvrir le modal d'upload pour afficher les conflits
        if (onReopenUploadDialog) {
          onReopenUploadDialog();
        }
        setConflicts(detectedConflicts);
        setConflictDialogOpen(true);
        return;
      }

      // Pas de conflit, procéder à l'upload normal
      await proceedWithUpload([]);
    } catch (error) {
      console.error('Erreur lors de la détection des conflits:', error);
      // En cas d'erreur, procéder quand même à l'upload
      await proceedWithUpload([]);
    }
  };

  // Procéder à l'upload avec les fichiers à remplacer ou renommés
  const proceedWithUpload = async (replaceFiles = [], renamedFilesMap = new Map()) => {
    try {
      // Le modal de progression est déjà ouvert par handleStartUpload
      // On met juste à jour les données pour indiquer le début de l'upload
      if (onProgress) {
        onProgress({
          phase: 'upload',
          progress: 0,
          loaded: 0,
          total: totalStats.totalSize,
          currentItem: '',
          currentItemIndex: 0,
          totalItems: totalStats.totalFiles,
        });
      }
      
      // Créer une nouvelle liste de fichiers avec les noms renommés si nécessaire
      const filesToUpload = selectedFiles.map(file => {
        const fileKey = file.name || file.webkitRelativePath;
        if (renamedFilesMap.has(fileKey)) {
          // Créer un nouveau fichier avec le nom modifié
          const newFileName = renamedFilesMap.get(fileKey);
          const renamedFile = new File([file], newFileName, {
            type: file.type,
            lastModified: file.lastModified,
          });
          // Préserver le webkitRelativePath si présent (avec le nouveau nom normalisé)
          if (file.webkitRelativePath) {
            const pathParts = file.webkitRelativePath.split('/');
            pathParts[pathParts.length - 1] = newFileName;
            const newRelativePath = pathParts.join('/');
            Object.defineProperty(renamedFile, 'webkitRelativePath', {
              value: newRelativePath,
              writable: false,
            });
          }
          return renamedFile;
        }
        return file;
      });
      
      await uploadFiles(filesToUpload, currentPath, replaceFiles, renamedFilesMap, onProgress);
      
      // Notifier la fin de l'upload avec 100% de progression
      if (onProgress) {
        onProgress({
          phase: 'upload',
          progress: 100,
          loaded: totalStats.totalSize,
          total: totalStats.totalSize,
          currentItem: '',
          currentItemIndex: totalStats.totalFiles,
          totalItems: totalStats.totalFiles,
        });
      }
      
      // Attendre un peu pour que l'utilisateur voie le succès
      setTimeout(() => {
        onUploadComplete();
      }, 1000);
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      // Fermer le modal de progression en cas d'erreur
      if (onProgress) {
        onProgress(null);
      }
      // Appeler onUploadComplete pour fermer le modal même en cas d'erreur
      setTimeout(() => {
        onUploadComplete();
      }, 500);
    }
  };

  // Gérer le remplacement de tous les fichiers
  const handleReplaceAll = () => {
    const filesToReplaceList = conflicts.map(conflict => conflict.file);
    
    setConflictDialogOpen(false);
    setConflicts([]);
    setFilesToReplace(new Set());
    
    proceedWithUpload(filesToReplaceList);
  };

  // Gérer la confirmation du remplacement sélectif
  const handleReplaceConfirm = () => {
    const filesToReplaceList = conflicts
      .filter(conflict => filesToReplace.has(conflict.file.name) || filesToReplace.has(conflict.file.webkitRelativePath))
      .map(conflict => conflict.file);
    
    setConflictDialogOpen(false);
    setConflicts([]);
    setFilesToReplace(new Set());
    
    proceedWithUpload(filesToReplaceList);
  };

  // Gérer la continuation sans remplacement (renommer avec numéro)
  const handleContinueWithoutReplace = async () => {
    const renamedFilesMap = new Map();
    
    // Pour TOUS les conflits, trouver un nom disponible (renommer tous les fichiers)
    for (const conflict of conflicts) {
      const fileKey = conflict.file.name || conflict.file.webkitRelativePath;
      const availableName = await findAvailableFileName(conflict.file.name, conflict.destinationPath);
      renamedFilesMap.set(fileKey, availableName);
    }
    
    setConflictDialogOpen(false);
    setConflicts([]);
    setFilesToReplace(new Set());
    
    // Pas de fichiers à remplacer, tous seront renommés
    proceedWithUpload([], renamedFilesMap);
  };

  // Gérer l'annulation
  const handleReplaceCancel = () => {
    setConflictDialogOpen(false);
    setConflicts([]);
    setFilesToReplace(new Set());
  };

  // Toggle le remplacement d'un fichier
  const toggleFileReplace = (conflict) => {
    setFilesToReplace(prev => {
      const newSet = new Set(prev);
      const key = conflict.file.name || conflict.file.webkitRelativePath;
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
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
        <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Upload de fichiers
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Destination : {currentPath || 'Racine'}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" disabled={uploading} sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ overflowY: 'auto', flexGrow: 1, p: 2 }}>
          {/* Mode de sélection */}
          {!uploading && (
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <Button
                variant={uploadMode === 'files' ? 'contained' : 'outlined'}
                onClick={() => {
                  setUploadMode('files');
                  setSelectedFiles([]);
                }}
                size="small"
                sx={{ borderRadius: 2 }}
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
                sx={{ borderRadius: 2 }}
              >
                Dossier
              </Button>
            </Box>
          )}

          {/* Drop Zone */}
          {!uploading && (
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
              <Box sx={{ 
                width: 64, 
                height: 64, 
                borderRadius: '50%', 
                backgroundColor: 'primary.light', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mb: 1,
                opacity: 0.15
              }}>
                <UploadIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              </Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                {uploadMode === 'folder' 
                  ? 'Glissez-déposez un dossier ici'
                  : 'Glissez-déposez vos fichiers ici'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                ou cliquez pour parcourir
              </Typography>
            </DropZone>
          )}

          {/* Progress Global */}
          {uploading && (
            <Box sx={{ mb: 4, mt: 2, px: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 500, color: 'primary.main' }}>
                  {totalProgress === 100 ? 'Traitement final...' : `Upload en cours... ${completedCount}/${selectedFiles.length}`}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main' }}>
                  {totalProgress}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={totalProgress} 
                sx={{ 
                  height: 8, 
                  borderRadius: 4,
                  backgroundColor: 'rgba(0,0,0,0.05)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 4,
                  }
                }} 
              />
            </Box>
          )}

          {/* Input cachés */}
          <input
            type="file"
            id="file-input"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
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
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}>
                {uploadMode === 'folder' ? 'Contenu du dossier' : 'Fichiers sélectionnés'} ({selectedFiles.length})
              </Typography>
              
              {uploadMode === 'folder' && selectedFiles.filter(f => f.webkitRelativePath && f.webkitRelativePath !== '').length === 0 && (
                <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
                  Aucun fichier détecté dans le dossier.
                </Alert>
              )}
              
              <List sx={{ 
                bgcolor: 'grey.50',
                borderRadius: 2,
                maxHeight: 400, 
                overflow: 'auto',
                border: '1px solid',
                borderColor: 'divider',
                p: 0
              }}>
                <FileTreeItem 
                  name="root" 
                  node={fileTree} 
                  level={0} 
                  getFileStatus={getFileStatus} 
                  formatFileSize={formatFileSize}
                  uploading={uploading}
                />
              </List>
            </Box>
          )}

          {/* Erreurs */}
          {Object.keys(errors).length > 0 && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {Object.keys(errors).length} fichier(s) n'ont pas pu être uploadés.
            </Alert>
          )}
        </Box>

        {/* Actions */}
        <Box sx={{ p: 2, display: 'flex', gap: 1.5, justifyContent: 'flex-end', borderTop: 1, borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Button 
            onClick={onClose} 
            disabled={uploading}
            variant="text"
            sx={{ borderRadius: 2, px: 3 }}
          >
            {uploading ? 'Fermer' : 'Annuler'}
          </Button>
          {!uploading && (
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={selectedFiles.length === 0}
              startIcon={<UploadIcon />}
              sx={{ borderRadius: 2, px: 4, boxShadow: 2 }}
            >
              Démarrer l'upload
            </Button>
          )}
        </Box>
      </UploaderPaper>

      {/* Dialog de confirmation pour les conflits */}
      <Dialog
        open={conflictDialogOpen}
        onClose={handleReplaceCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 3, boxShadow: '0 10px 40px rgba(0,0,0,0.2)' }
        }}
      >
        <DialogTitle sx={{ p: 3, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ 
              width: 40, 
              height: 40, 
              borderRadius: '50%', 
              backgroundColor: 'warning.light', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              opacity: 0.2
            }}>
              <WarningIcon sx={{ color: 'warning.main' }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Fichiers existants détectés
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 3 }}>
          <DialogContentText sx={{ mb: 3 }}>
            {conflicts.length} fichier{conflicts.length > 1 ? 's' : ''} existe{conflicts.length > 1 ? 'nt' : ''} déjà dans la destination.
            Sélectionnez ceux que vous souhaitez remplacer ou choisissez une option globale.
          </DialogContentText>
          
          <List sx={{ 
            bgcolor: 'grey.50', 
            borderRadius: 2, 
            border: '1px solid', 
            borderColor: 'divider',
            maxHeight: 300,
            overflow: 'auto'
          }}>
            {conflicts.map((conflict, index) => {
              const fileKey = conflict.file.name || conflict.file.webkitRelativePath;
              const isSelected = filesToReplace.has(fileKey);
              
              return (
                <React.Fragment key={index}>
                  {index > 0 && <Divider />}
                  <ListItem
                    button
                    onClick={() => toggleFileReplace(conflict)}
                    sx={{
                      backgroundColor: isSelected ? 'primary.light' : 'transparent',
                      '&:hover': {
                        backgroundColor: isSelected ? 'primary.light' : 'action.hover',
                      },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <ListItemIcon sx={{ minWidth: 40 }}>
                      <FileIcon sx={{ color: isSelected ? 'primary.main' : 'text.secondary' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={displayFilename(conflict.file.name)}
                      secondary={conflict.destinationPath || currentPath || 'Racine'}
                      primaryTypographyProps={{
                        sx: { fontWeight: isSelected ? 600 : 500, fontSize: '0.875rem' }
                      }}
                      secondaryTypographyProps={{
                        sx: { fontSize: '0.75rem' }
                      }}
                    />
                    {isSelected && (
                      <CheckIcon color="primary" sx={{ fontSize: 20 }} />
                    )}
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        </DialogContent>
        <DialogActions sx={{ p: 3, pt: 1, gap: 1 }}>
          <Button onClick={handleReplaceCancel} variant="text" sx={{ borderRadius: 2 }}>
            Annuler
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Button
            variant="outlined"
            onClick={handleContinueWithoutReplace}
            sx={{ borderRadius: 2 }}
          >
            Conserver les deux
          </Button>
          {filesToReplace.size > 0 ? (
            <Button
              variant="contained"
              onClick={handleReplaceConfirm}
              color="primary"
              sx={{ borderRadius: 2, px: 3 }}
            >
              Remplacer ({filesToReplace.size})
            </Button>
          ) : (
            <Button
              variant="contained"
              onClick={handleReplaceAll}
              color="error"
              sx={{ borderRadius: 2, px: 3 }}
            >
              Tout remplacer
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </UploaderContainer>
  );
};

export default DriveUploader;
