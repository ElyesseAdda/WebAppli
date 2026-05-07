/**
 * DriveMobileLayout - Version mobile optimisée du Drive V2
 * Interface tactile épurée pour la navigation dans les fichiers
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  CircularProgress,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Snackbar,
  Alert,
  Chip,
  Divider,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Home as HomeIcon,
  Logout as LogoutIcon,
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  PictureAsPdf as PdfIcon,
  Image as ImageIcon,
  Description as DescriptionIcon,
  CloudUpload as UploadIcon,
  CreateNewFolder as CreateFolderIcon,
  ArrowBack as ArrowBackIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  MoreVert as MoreVertIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useDrive } from './hooks/useDrive';
import { useUpload } from './hooks/useUpload';
import { displayFilename } from './DriveExplorer';

// ── Utilitaires ──────────────────────────────────────────────────────────────

const getFileIcon = (filename) => {
  if (!filename) return <FileIcon />;
  const ext = filename.split('.').pop()?.toLowerCase();
  if (['pdf'].includes(ext)) return <PdfIcon color="error" />;
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return <ImageIcon color="secondary" />;
  if (['doc', 'docx', 'odt'].includes(ext)) return <DescriptionIcon color="primary" />;
  if (['xls', 'xlsx', 'ods'].includes(ext)) return <DescriptionIcon sx={{ color: '#2e7d32' }} />;
  return <FileIcon color="action" />;
};

const formatSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch {
    return '';
  }
};

// ── Composant principal ───────────────────────────────────────────────────────

const DriveMobileLayout = () => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { currentPath, folderContent, loading, error, fetchFolderContent, createFolder, refreshContent } = useDrive();
  const { uploadFiles, uploading } = useUpload();

  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [folderCreating, setFolderCreating] = useState(false);
  const [fileMenuAnchor, setFileMenuAnchor] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const uploadInputRef = useRef(null);

  // Historique de navigation (pile de chemins)
  const [pathHistory, setPathHistory] = useState([]);

  useEffect(() => {
    fetchFolderContent('');
  }, [fetchFolderContent]);

  // ── Navigation ────────────────────────────────────────────────────────────

  const navigateToFolder = useCallback((folderPath) => {
    setPathHistory((prev) => [...prev, currentPath]);
    fetchFolderContent(folderPath);
  }, [currentPath, fetchFolderContent]);

  const navigateBack = useCallback(() => {
    if (pathHistory.length === 0) {
      navigate('/mobile-home');
      return;
    }
    const prev = pathHistory[pathHistory.length - 1];
    setPathHistory((h) => h.slice(0, -1));
    fetchFolderContent(prev);
  }, [pathHistory, fetchFolderContent, navigate]);

  const navigateToBreadcrumb = useCallback((index) => {
    const segments = currentPath.split('/').filter(Boolean);
    const targetPath = segments.slice(0, index + 1).join('/');
    setPathHistory((prev) => [...prev, currentPath]);
    fetchFolderContent(targetPath);
  }, [currentPath, fetchFolderContent]);

  const navigateToRoot = useCallback(() => {
    setPathHistory((prev) => [...prev, currentPath]);
    fetchFolderContent('');
  }, [currentPath, fetchFolderContent]);

  // ── Actions fichier ───────────────────────────────────────────────────────

  const handleDownload = useCallback(async (file) => {
    try {
      const response = await fetch(`/api/drive-v2/download-url/?file_path=${encodeURIComponent(file.path)}`, {
        credentials: 'include',
      });
      const data = await response.json();
      if (data.download_url) {
        const a = document.createElement('a');
        a.href = data.download_url;
        a.download = file.name;
        a.target = '_blank';
        a.click();
      }
    } catch {
      setSnackbar({ open: true, message: 'Impossible de télécharger le fichier.', severity: 'error' });
    }
  }, []);

  const handlePreview = useCallback((file) => {
    navigate(`/drive-v2/preview?file_path=${encodeURIComponent(file.path)}&file_name=${encodeURIComponent(file.name)}&mode=view`);
  }, [navigate]);

  const openFileMenu = (event, file) => {
    event.stopPropagation();
    setSelectedFile(file);
    setFileMenuAnchor(event.currentTarget);
  };

  const closeFileMenu = () => {
    setFileMenuAnchor(null);
    setSelectedFile(null);
  };

  // ── Upload ────────────────────────────────────────────────────────────────

  const handleFileInputChange = useCallback(async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;
    try {
      await uploadFiles(files, currentPath, () => {});
      setSnackbar({ open: true, message: `${files.length} fichier(s) envoyé(s)`, severity: 'success' });
      refreshContent();
    } catch {
      setSnackbar({ open: true, message: 'Erreur lors de l\'envoi.', severity: 'error' });
    }
    event.target.value = '';
  }, [uploadFiles, currentPath, refreshContent]);

  // ── Création dossier ──────────────────────────────────────────────────────

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      setFolderCreating(true);
      await createFolder(currentPath, newFolderName.trim());
      setSnackbar({ open: true, message: 'Dossier créé.', severity: 'success' });
      setCreateFolderOpen(false);
      setNewFolderName('');
      refreshContent();
    } catch (err) {
      setSnackbar({ open: true, message: err.message || 'Erreur lors de la création.', severity: 'error' });
    } finally {
      setFolderCreating(false);
    }
  };

  // ── Rendu breadcrumb ──────────────────────────────────────────────────────

  const renderBreadcrumb = () => {
    const segments = currentPath ? currentPath.split('/').filter(Boolean) : [];
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          gap: 0.5,
          px: 2,
          py: 1,
          bgcolor: 'grey.50',
          borderBottom: '1px solid',
          borderColor: 'divider',
          scrollbarWidth: 'none',
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        <Chip
          label="Racine"
          size="small"
          icon={<HomeIcon fontSize="small" />}
          onClick={navigateToRoot}
          variant={segments.length === 0 ? 'filled' : 'outlined'}
          color={segments.length === 0 ? 'primary' : 'default'}
          sx={{ flexShrink: 0 }}
        />
        {segments.map((seg, idx) => (
          <React.Fragment key={idx}>
            <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>›</Typography>
            <Chip
              label={displayFilename(seg)}
              size="small"
              onClick={() => navigateToBreadcrumb(idx)}
              variant={idx === segments.length - 1 ? 'filled' : 'outlined'}
              color={idx === segments.length - 1 ? 'primary' : 'default'}
              sx={{ flexShrink: 0, maxWidth: 150 }}
            />
          </React.Fragment>
        ))}
      </Box>
    );
  };

  // ── Rendu liste ───────────────────────────────────────────────────────────

  const renderContent = () => {
    if (loading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      );
    }

    const { folders = [], files = [] } = folderContent;
    const isEmpty = folders.length === 0 && files.length === 0;

    if (isEmpty) {
      return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 2, color: 'text.disabled' }}>
          <FolderIcon sx={{ fontSize: 64 }} />
          <Typography variant="body2">Dossier vide</Typography>
        </Box>
      );
    }

    return (
      <List disablePadding>
        {folders.map((folder, idx) => (
          <React.Fragment key={`folder-${idx}`}>
            <ListItem
              button
              onClick={() => navigateToFolder(folder.path)}
              sx={{ py: 1.5, px: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <FolderIcon sx={{ color: '#f9a825' }} />
              </ListItemIcon>
              <ListItemText
                primary={displayFilename(folder.name)}
                primaryTypographyProps={{ variant: 'body1', fontWeight: 500 }}
              />
            </ListItem>
            <Divider component="li" />
          </React.Fragment>
        ))}

        {files.map((file, idx) => (
          <React.Fragment key={`file-${idx}`}>
            <ListItem
              button
              onClick={() => handlePreview(file)}
              sx={{ py: 1.5, px: 2 }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {getFileIcon(file.name)}
              </ListItemIcon>
              <ListItemText
                primary={displayFilename(file.name)}
                primaryTypographyProps={{ variant: 'body1', noWrap: true }}
                secondary={`${formatSize(file.size)}${file.last_modified ? '  ·  ' + formatDate(file.last_modified) : ''}`}
                secondaryTypographyProps={{ variant: 'caption' }}
              />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => openFileMenu(e, file)}
                  aria-label="Options fichier"
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
            <Divider component="li" />
          </React.Fragment>
        ))}
      </List>
    );
  };

  // ── Rendu principal ───────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        width: '100vw',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflow: 'hidden',
        bgcolor: 'background.default',
      }}
    >
      {/* AppBar */}
      <AppBar position="static" sx={{ bgcolor: '#f57c00', flexShrink: 0 }}>
        <Toolbar sx={{ minHeight: 56 }}>
          <IconButton
            color="inherit"
            onClick={navigateBack}
            size="small"
            aria-label="Retour"
            sx={{ mr: 0.5 }}
          >
            <ArrowBackIcon />
          </IconButton>

          <IconButton
            color="inherit"
            onClick={() => navigate('/mobile-home')}
            size="small"
            aria-label="Accueil mobile"
            sx={{ mr: 1 }}
          >
            <HomeIcon />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, fontSize: '1rem', fontWeight: 700 }}>
            Drive
          </Typography>

          <IconButton
            color="inherit"
            onClick={refreshContent}
            size="small"
            aria-label="Rafraîchir"
            disabled={loading}
          >
            <RefreshIcon />
          </IconButton>

          <IconButton
            color="inherit"
            onClick={() => setCreateFolderOpen(true)}
            size="small"
            aria-label="Nouveau dossier"
          >
            <CreateFolderIcon />
          </IconButton>

          {user && (
            <Typography variant="caption" sx={{ mx: 0.5, opacity: 0.85 }}>
              {user.first_name || user.username}
            </Typography>
          )}
          <IconButton color="inherit" onClick={logout} size="small" aria-label="Déconnexion">
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Breadcrumb */}
      {renderBreadcrumb()}

      {/* Contenu scrollable */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          WebkitOverflowScrolling: 'touch',
          pb: '80px',
        }}
      >
        {renderContent()}
      </Box>

      {/* Bouton upload flottant */}
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />
      <Fab
        color="warning"
        aria-label="Envoyer des fichiers"
        onClick={() => uploadInputRef.current?.click()}
        disabled={uploading}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          bgcolor: '#f57c00',
          '&:hover': { bgcolor: '#e65100' },
        }}
      >
        {uploading ? <CircularProgress size={24} color="inherit" /> : <UploadIcon />}
      </Fab>

      {/* Menu contextuel fichier */}
      <Menu
        anchorEl={fileMenuAnchor}
        open={Boolean(fileMenuAnchor)}
        onClose={closeFileMenu}
      >
        <MenuItem
          onClick={() => {
            closeFileMenu();
            if (selectedFile) handlePreview(selectedFile);
          }}
        >
          <ListItemIcon><VisibilityIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Aperçu" />
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeFileMenu();
            if (selectedFile) handleDownload(selectedFile);
          }}
        >
          <ListItemIcon><DownloadIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Télécharger" />
        </MenuItem>
      </Menu>

      {/* Dialog création dossier */}
      <Dialog open={createFolderOpen} onClose={() => setCreateFolderOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Nouveau dossier</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Nom du dossier"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setCreateFolderOpen(false); setNewFolderName(''); }}>Annuler</Button>
          <Button variant="contained" onClick={handleCreateFolder} disabled={folderCreating || !newFolderName.trim()}>
            {folderCreating ? 'Création…' : 'Créer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default DriveMobileLayout;
