/**
 * DriveRecovery - Interface admin de navigation et récupération de fichiers supprimés (S3 Versioning)
 * Navigation type explorateur de fichiers dans l'arborescence des fichiers supprimés
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  IconButton,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Breadcrumbs,
  Link,
  Divider,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  RestoreFromTrash as RestoreIcon,
  History as HistoryIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Folder as FolderIcon,
  FolderOpen as FolderOpenIcon,
  InsertDriveFile as FileIcon,
  Home as HomeIcon,
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  FilterList as FilterIcon,
  DeleteSweep as DeleteSweepIcon,
  Download as DownloadIcon,
  DriveFileMove as DriveFileMoveIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import axiosInstance from '../../utils/axios';

const RecoveryContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(3),
  maxWidth: 1400,
  margin: '0 auto',
}));

const StatsBox = styled(Box)(({ theme }) => ({
  display: 'flex',
  gap: theme.spacing(2),
  marginBottom: theme.spacing(2),
  flexWrap: 'wrap',
}));

const StatCard = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5, 2),
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  minWidth: 160,
}));

const FolderRow = styled(TableRow)(({ theme }) => ({
  cursor: 'pointer',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '& td': {
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const units = ['B', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

function formatDate(isoString) {
  if (!isoString) return '-';
  const d = new Date(isoString);
  return d.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFileIconEl(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  const colorMap = {
    pdf: '#e53935',
    doc: '#1565c0', docx: '#1565c0',
    xls: '#2e7d32', xlsx: '#2e7d32',
    ppt: '#e65100', pptx: '#e65100',
    jpg: '#6a1b9a', jpeg: '#6a1b9a', png: '#6a1b9a', gif: '#6a1b9a', webp: '#6a1b9a',
    dwg: '#00838f', dxf: '#00838f',
    zip: '#5d4037', rar: '#5d4037',
  };
  return <FileIcon sx={{ fontSize: 22, mr: 1, color: colorMap[ext] || '#757575' }} />;
}

/**
 * Construit une arborescence virtuelle à partir de la liste plate de fichiers supprimés.
 * Retourne pour un chemin donné : les sous-dossiers immédiats et les fichiers directs.
 */
function getItemsAtPath(deletedFiles, currentPath) {
  const folders = {};
  const files = [];

  for (const file of deletedFiles) {
    const key = file.key;
    if (!key.startsWith(currentPath)) continue;

    const relativePath = key.slice(currentPath.length);
    const slashIndex = relativePath.indexOf('/');

    if (slashIndex === -1) {
      files.push(file);
    } else {
      const folderName = relativePath.slice(0, slashIndex);
      const folderFullPath = currentPath + folderName + '/';
      if (!folders[folderFullPath]) {
        folders[folderFullPath] = { name: folderName, path: folderFullPath, fileCount: 0, totalSize: 0, latestDate: null };
      }
      folders[folderFullPath].fileCount += 1;
      folders[folderFullPath].totalSize += file.size || 0;
      const d = file.last_modified;
      if (d && (!folders[folderFullPath].latestDate || d > folders[folderFullPath].latestDate)) {
        folders[folderFullPath].latestDate = d;
      }
    }
  }

  const sortedFolders = Object.values(folders).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const sortedFiles = files.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr'));

  return { folders: sortedFolders, files: sortedFiles };
}

function buildBreadcrumb(path) {
  if (!path) return [{ name: 'Racine', path: '' }];
  const parts = path.replace(/\/$/, '').split('/');
  const crumbs = [{ name: 'Racine', path: '' }];
  let current = '';
  for (const part of parts) {
    if (part) {
      current += part + '/';
      crumbs.push({ name: part, path: current });
    }
  }
  return crumbs;
}

export default function DriveRecovery() {
  const [allDeletedFiles, setAllDeletedFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [versioningStatus, setVersioningStatus] = useState(null);
  const [currentPath, setCurrentPath] = useState('');
  const [filterText, setFilterText] = useState('');
  const [selectedKeys, setSelectedKeys] = useState(new Set());
  const [restoring, setRestoring] = useState(new Set());
  const [restoringFolders, setRestoringFolders] = useState(new Set());
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [versionsDialog, setVersionsDialog] = useState({ open: false, key: '', versions: [] });
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [navigationHistory, setNavigationHistory] = useState([]);

  const checkVersioning = useCallback(async () => {
    try {
      const res = await axiosInstance.get('drive-admin/versioning-status/');
      setVersioningStatus(res.data);
    } catch {
      setVersioningStatus({ status: 'Error', error: 'Impossible de vérifier le statut' });
    }
  }, []);

  const fetchDeletedFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get('drive-admin/deleted-files/', {
        params: { prefix: '', max_results: 1000 },
      });
      setAllDeletedFiles(res.data.deleted_files || []);
      setSelectedKeys(new Set());
    } catch (err) {
      const msg = err.response?.status === 403
        ? 'Accès refusé — vous devez être administrateur.'
        : `Erreur: ${err.response?.data?.error || err.message}`;
      setSnackbar({ open: true, message: msg, severity: 'error' });
      setAllDeletedFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkVersioning();
    fetchDeletedFiles();
  }, []);

  // Navigation
  const navigateTo = useCallback((path) => {
    setNavigationHistory((prev) => [...prev, currentPath]);
    setCurrentPath(path);
    setSelectedKeys(new Set());
    setFilterText('');
  }, [currentPath]);

  const navigateBack = useCallback(() => {
    if (navigationHistory.length > 0) {
      const prev = navigationHistory[navigationHistory.length - 1];
      setNavigationHistory((h) => h.slice(0, -1));
      setCurrentPath(prev);
      setSelectedKeys(new Set());
      setFilterText('');
    }
  }, [navigationHistory]);

  const navigateToBreadcrumb = useCallback((path) => {
    setNavigationHistory((prev) => [...prev, currentPath]);
    setCurrentPath(path);
    setSelectedKeys(new Set());
    setFilterText('');
  }, [currentPath]);

  // Contenu du dossier courant
  const { folders: currentFolders, files: currentFiles } = useMemo(
    () => getItemsAtPath(allDeletedFiles, currentPath),
    [allDeletedFiles, currentPath]
  );

  // Filtre texte local
  const filteredFolders = useMemo(() => {
    if (!filterText) return currentFolders;
    const lower = filterText.toLowerCase();
    return currentFolders.filter((f) => f.name.toLowerCase().includes(lower));
  }, [currentFolders, filterText]);

  const filteredFiles = useMemo(() => {
    if (!filterText) return currentFiles;
    const lower = filterText.toLowerCase();
    return currentFiles.filter((f) => f.name.toLowerCase().includes(lower));
  }, [currentFiles, filterText]);

  const breadcrumb = useMemo(() => buildBreadcrumb(currentPath), [currentPath]);

  const filesInCurrentScope = useMemo(
    () => allDeletedFiles.filter((f) => f.key.startsWith(currentPath)),
    [allDeletedFiles, currentPath]
  );

  // Sélection (fichiers directs uniquement)
  const toggleSelect = (key) => {
    setSelectedKeys((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedKeys.size === filteredFiles.length) {
      setSelectedKeys(new Set());
    } else {
      setSelectedKeys(new Set(filteredFiles.map((f) => f.key)));
    }
  };

  // Restauration d'un fichier
  const handleRestore = async (key) => {
    setRestoring((prev) => new Set(prev).add(key));
    try {
      await axiosInstance.post('drive-admin/restore-file/', { key });
      setSnackbar({ open: true, message: `Fichier restauré : ${key.split('/').pop()}`, severity: 'success' });
      setAllDeletedFiles((prev) => prev.filter((f) => f.key !== key));
      setSelectedKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
    } catch (err) {
      setSnackbar({ open: true, message: `Échec: ${err.response?.data?.error || err.message}`, severity: 'error' });
    } finally {
      setRestoring((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  // Restauration batch (sélection)
  const handleRestoreBatch = async () => {
    const keys = Array.from(selectedKeys);
    if (keys.length === 0) return;
    setRestoring(new Set(keys));
    try {
      const res = await axiosInstance.post('drive-admin/restore-batch/', { keys });
      const { restored_count, total } = res.data;
      setSnackbar({
        open: true,
        message: `${restored_count}/${total} fichiers restaurés`,
        severity: restored_count === total ? 'success' : 'warning',
      });
      const restoredKeys = new Set(res.data.results.filter((r) => r.success).map((r) => r.key));
      setAllDeletedFiles((prev) => prev.filter((f) => !restoredKeys.has(f.key)));
      setSelectedKeys(new Set());
    } catch (err) {
      setSnackbar({ open: true, message: `Échec: ${err.response?.data?.error || err.message}`, severity: 'error' });
    } finally {
      setRestoring(new Set());
    }
  };

  // Restauration d'un dossier complet
  const handleRestoreFolder = async (prefix) => {
    setRestoringFolders((prev) => new Set(prev).add(prefix));
    try {
      const res = await axiosInstance.post('drive-admin/restore-folder/', { prefix });
      const { restored_count, failed_count } = res.data;
      setSnackbar({
        open: true,
        message: `Dossier restauré : ${restored_count} fichier(s)${failed_count > 0 ? `, ${failed_count} échec(s)` : ''}`,
        severity: failed_count > 0 ? 'warning' : 'success',
      });
      setAllDeletedFiles((prev) => prev.filter((f) => !f.key.startsWith(prefix)));
      setSelectedKeys((prev) => {
        const n = new Set(prev);
        prev.forEach((k) => { if (k.startsWith(prefix)) n.delete(k); });
        return n;
      });
    } catch (err) {
      setSnackbar({ open: true, message: `Échec: ${err.response?.data?.error || err.message}`, severity: 'error' });
    } finally {
      setRestoringFolders((prev) => { const n = new Set(prev); n.delete(prefix); return n; });
    }
  };

  // Restaurer tout le dossier courant (y compris sous-dossiers)
  const handleRestoreCurrentFolder = async () => {
    if (!currentPath) {
      setSnackbar({ open: true, message: 'Impossible de restaurer la racine entière. Naviguez dans un dossier.', severity: 'warning' });
      return;
    }
    await handleRestoreFolder(currentPath);
  };

  // Dialog versions
  const handleShowVersions = async (key) => {
    setVersionsDialog({ open: true, key, versions: [] });
    setVersionsLoading(true);
    try {
      const res = await axiosInstance.get('drive-admin/file-versions/', { params: { key } });
      setVersionsDialog({ open: true, key, versions: res.data.versions || [] });
    } catch (err) {
      setSnackbar({ open: true, message: `Erreur: ${err.response?.data?.error || err.message}`, severity: 'error' });
    } finally {
      setVersionsLoading(false);
    }
  };

  const handleRestoreVersion = async (key, versionId) => {
    try {
      await axiosInstance.post('drive-admin/restore-version/', { key, version_id: versionId });
      setSnackbar({ open: true, message: `Version restaurée pour ${key.split('/').pop()}`, severity: 'success' });
      setVersionsDialog({ open: false, key: '', versions: [] });
      fetchDeletedFiles();
    } catch (err) {
      setSnackbar({ open: true, message: `Échec: ${err.response?.data?.error || err.message}`, severity: 'error' });
    }
  };

  // Télécharger un fichier supprimé directement dans le navigateur
  const handleDownload = async (key, versionId) => {
    try {
      const params = { key };
      if (versionId) params.version_id = versionId;
      const res = await axiosInstance.get('drive-admin/download-deleted-file/', { params });
      const downloadUrl = res.data.download_url;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = res.data.file_name || key.split('/').pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setSnackbar({ open: true, message: `Échec du téléchargement: ${err.response?.data?.error || err.message}`, severity: 'error' });
    }
  };

  // Restaurer un fichier dans le Drive (avec gestion des conflits)
  const handleRestoreToDrive = async (key) => {
    setRestoring((prev) => new Set(prev).add(key));
    try {
      const res = await axiosInstance.post('drive-admin/restore-to-drive/', { key });
      const { had_conflict, new_file_name, restored_key } = res.data;
      if (had_conflict) {
        setSnackbar({
          open: true,
          message: `Conflit détecté — fichier restauré sous : ${new_file_name}`,
          severity: 'warning',
        });
      } else {
        setSnackbar({
          open: true,
          message: `Fichier restauré dans le Drive : ${key.split('/').pop()}`,
          severity: 'success',
        });
      }
      setAllDeletedFiles((prev) => prev.filter((f) => f.key !== key));
      setSelectedKeys((prev) => { const n = new Set(prev); n.delete(key); return n; });
    } catch (err) {
      setSnackbar({ open: true, message: `Échec: ${err.response?.data?.error || err.message}`, severity: 'error' });
    } finally {
      setRestoring((prev) => { const n = new Set(prev); n.delete(key); return n; });
    }
  };

  // Restaurer la sélection dans le Drive (batch, avec gestion des conflits)
  const handleRestoreToDriveBatch = async () => {
    const keys = Array.from(selectedKeys);
    if (keys.length === 0) return;
    setRestoring(new Set(keys));
    try {
      const res = await axiosInstance.post('drive-admin/restore-to-drive-batch/', { keys });
      const { restored_count, conflict_count, total } = res.data;
      const conflictMsg = conflict_count > 0 ? ` (${conflict_count} renommé(s) [RÉCUPÉRÉ])` : '';
      setSnackbar({
        open: true,
        message: `${restored_count}/${total} fichiers restaurés dans le Drive${conflictMsg}`,
        severity: restored_count === total ? 'success' : 'warning',
      });
      const restoredKeys = new Set(res.data.results.filter((r) => r.success).map((r) => r.key));
      setAllDeletedFiles((prev) => prev.filter((f) => !restoredKeys.has(f.key)));
      setSelectedKeys(new Set());
    } catch (err) {
      setSnackbar({ open: true, message: `Échec: ${err.response?.data?.error || err.message}`, severity: 'error' });
    } finally {
      setRestoring(new Set());
    }
  };

  const isVersioningEnabled = versioningStatus?.status === 'Enabled';
  const isEmpty = filteredFolders.length === 0 && filteredFiles.length === 0;

  return (
    <RecoveryContainer>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Récupération de fichiers supprimés
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Naviguez dans l'arborescence et restaurez les fichiers ou dossiers supprimés
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {currentPath && filesInCurrentScope.length > 0 && (
            <Button
              variant="contained"
              color="success"
              startIcon={restoringFolders.has(currentPath) ? <CircularProgress size={18} color="inherit" /> : <RestoreIcon />}
              onClick={handleRestoreCurrentFolder}
              disabled={restoringFolders.has(currentPath)}
              sx={{ textTransform: 'none' }}
            >
              Tout restaurer ici ({filesInCurrentScope.length})
            </Button>
          )}
          {selectedKeys.size > 0 && (
            <>
              <Button
                variant="contained"
                color="success"
                startIcon={<DriveFileMoveIcon />}
                onClick={handleRestoreToDriveBatch}
                disabled={restoring.size > 0}
                sx={{ textTransform: 'none' }}
              >
                Remettre dans le Drive ({selectedKeys.size})
              </Button>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<RestoreIcon />}
                onClick={handleRestoreBatch}
                disabled={restoring.size > 0}
                sx={{ textTransform: 'none' }}
              >
                Restaurer simple ({selectedKeys.size})
              </Button>
            </>
          )}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => { checkVersioning(); fetchDeletedFiles(); }}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            Actualiser
          </Button>
        </Box>
      </Box>

      {/* Stats */}
      <StatsBox>
        <StatCard elevation={1}>
          {isVersioningEnabled ? (
            <CheckCircleIcon sx={{ color: 'success.main', fontSize: 24 }} />
          ) : versioningStatus?.status === 'Error' ? (
            <ErrorIcon sx={{ color: 'error.main', fontSize: 24 }} />
          ) : (
            <WarningIcon sx={{ color: 'warning.main', fontSize: 24 }} />
          )}
          <Box>
            <Typography variant="caption" color="text.secondary">Versioning</Typography>
            <Typography variant="body2" fontWeight={600}>
              {isVersioningEnabled ? 'Activé' : versioningStatus?.status === 'Error' ? 'Erreur' : 'Désactivé'}
            </Typography>
          </Box>
        </StatCard>
        <StatCard elevation={1}>
          <DeleteSweepIcon sx={{ color: 'error.main', fontSize: 24 }} />
          <Box>
            <Typography variant="caption" color="text.secondary">Total supprimés</Typography>
            <Typography variant="body2" fontWeight={600}>{allDeletedFiles.length}</Typography>
          </Box>
        </StatCard>
        <StatCard elevation={1}>
          <FolderIcon sx={{ color: '#f9a825', fontSize: 24 }} />
          <Box>
            <Typography variant="caption" color="text.secondary">Ici : dossiers</Typography>
            <Typography variant="body2" fontWeight={600}>{currentFolders.length}</Typography>
          </Box>
        </StatCard>
        <StatCard elevation={1}>
          <FileIcon sx={{ color: 'primary.main', fontSize: 24 }} />
          <Box>
            <Typography variant="caption" color="text.secondary">Ici : fichiers</Typography>
            <Typography variant="body2" fontWeight={600}>{currentFiles.length}</Typography>
          </Box>
        </StatCard>
      </StatsBox>

      {!isVersioningEnabled && versioningStatus && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Le versioning S3 n'est pas activé. Activez-le dans la console AWS pour récupérer les fichiers supprimés à l'avenir.
        </Alert>
      )}

      {/* Breadcrumb + navigation */}
      <Paper sx={{ p: 1.5, mb: 2, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Tooltip title="Retour">
          <span>
            <IconButton
              size="small"
              onClick={navigateBack}
              disabled={navigationHistory.length === 0}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Breadcrumbs separator={<NavigateNextIcon fontSize="small" />} sx={{ flex: 1 }}>
          {breadcrumb.map((crumb, i) => {
            const isLast = i === breadcrumb.length - 1;
            return isLast ? (
              <Typography key={crumb.path} variant="body2" fontWeight={600} color="text.primary">
                {crumb.name}
              </Typography>
            ) : (
              <Link
                key={crumb.path}
                component="button"
                variant="body2"
                underline="hover"
                color="inherit"
                onClick={() => navigateToBreadcrumb(crumb.path)}
                sx={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 0.5 }}
              >
                {i === 0 && <HomeIcon sx={{ fontSize: 16 }} />}
                {crumb.name}
              </Link>
            );
          })}
        </Breadcrumbs>

        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

        <TextField
          size="small"
          placeholder="Filtrer..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          sx={{ width: 200 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <FilterIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Contenu */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : isEmpty && !filterText ? (
        <Paper sx={{ p: 5, textAlign: 'center' }}>
          <RestoreIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
          <Typography variant="h6" color="text.secondary">
            {currentPath ? 'Aucun fichier supprimé dans ce dossier' : 'Aucun fichier supprimé trouvé'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {currentPath
              ? 'Naviguez dans un autre dossier ou remontez dans l\'arborescence.'
              : isVersioningEnabled
                ? 'Tous les fichiers sont intacts.'
                : 'Activez le versioning S3 pour pouvoir récupérer les fichiers à l\'avenir.'}
          </Typography>
          {currentPath && (
            <Button sx={{ mt: 2, textTransform: 'none' }} variant="outlined" startIcon={<ArrowBackIcon />} onClick={navigateBack}>
              Retour
            </Button>
          )}
        </Paper>
      ) : isEmpty && filterText ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">
            Aucun résultat pour "{filterText}"
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 400px)' }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" sx={{ width: 48 }}>
                  {filteredFiles.length > 0 && (
                    <Checkbox
                      indeterminate={selectedKeys.size > 0 && selectedKeys.size < filteredFiles.length}
                      checked={selectedKeys.size === filteredFiles.length && filteredFiles.length > 0}
                      onChange={toggleSelectAll}
                      size="small"
                    />
                  )}
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Nom</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="right">Taille</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Date suppression</TableCell>
                <TableCell sx={{ fontWeight: 700 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {/* Dossiers */}
              {filteredFolders.map((folder) => (
                <FolderRow
                  key={folder.path}
                  onDoubleClick={() => navigateTo(folder.path)}
                  onClick={() => navigateTo(folder.path)}
                >
                  <TableCell padding="checkbox" />
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <FolderOpenIcon sx={{ color: '#f9a825', fontSize: 24 }} />
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {folder.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {folder.fileCount} fichier(s) supprimé(s)
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {formatFileSize(folder.totalSize)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(folder.latestDate)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Tooltip title={`Restaurer tout le dossier "${folder.name}" (${folder.fileCount} fichiers)`}>
                      <span>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={restoringFolders.has(folder.path) ? <CircularProgress size={14} /> : <RestoreIcon />}
                          disabled={restoringFolders.has(folder.path)}
                          onClick={(e) => { e.stopPropagation(); handleRestoreFolder(folder.path); }}
                          sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                        >
                          Restaurer ({folder.fileCount})
                        </Button>
                      </span>
                    </Tooltip>
                  </TableCell>
                </FolderRow>
              ))}

              {/* Séparateur visuel si dossiers ET fichiers */}
              {filteredFolders.length > 0 && filteredFiles.length > 0 && (
                <TableRow>
                  <TableCell colSpan={5} sx={{ py: 0.5, backgroundColor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
                      Fichiers supprimés dans ce dossier
                    </Typography>
                  </TableCell>
                </TableRow>
              )}

              {/* Fichiers */}
              {filteredFiles.map((file) => (
                <TableRow key={file.key} hover selected={selectedKeys.has(file.key)}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedKeys.has(file.key)}
                      onChange={() => toggleSelect(file.key)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getFileIconEl(file.name)}
                      <Tooltip title={file.key} arrow placement="top">
                        <Typography variant="body2" noWrap sx={{ maxWidth: 400 }}>
                          {file.name}
                        </Typography>
                      </Tooltip>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {formatFileSize(file.size)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(file.last_modified)}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                      <Tooltip title="Télécharger ce fichier">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleDownload(file.key, file.version_id)}
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Remettre dans le Drive (gère les conflits de nom)">
                        <span>
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => handleRestoreToDrive(file.key)}
                            disabled={restoring.has(file.key)}
                          >
                            {restoring.has(file.key) ? <CircularProgress size={16} /> : <DriveFileMoveIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Historique des versions">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleShowVersions(file.key)}
                        >
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Dialog : historique des versions */}
      <Dialog
        open={versionsDialog.open}
        onClose={() => setVersionsDialog({ open: false, key: '', versions: [] })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon color="info" />
          Historique des versions
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontFamily: 'monospace', wordBreak: 'break-all' }}>
            {versionsDialog.key}
          </Typography>
          {versionsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : versionsDialog.versions.length === 0 ? (
            <Alert severity="info">Aucune version trouvée.</Alert>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Version ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Taille</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Statut</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {versionsDialog.versions.map((v) => (
                  <TableRow key={v.version_id} hover>
                    <TableCell>{formatDate(v.last_modified)}</TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 11 }} noWrap>
                        {v.version_id}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{v.is_delete_marker ? '-' : formatFileSize(v.size)}</TableCell>
                    <TableCell>
                      {v.is_delete_marker ? (
                        <Chip label="Supprimé" size="small" color="error" variant="outlined" />
                      ) : v.is_latest ? (
                        <Chip label="Actuelle" size="small" color="success" variant="outlined" />
                      ) : (
                        <Chip label="Ancienne" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'center' }}>
                        {!v.is_delete_marker && (
                          <Tooltip title="Télécharger cette version">
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleDownload(versionsDialog.key, v.version_id)}
                            >
                              <DownloadIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {!v.is_delete_marker && !v.is_latest && (
                          <Button
                            size="small"
                            variant="outlined"
                            color="success"
                            startIcon={<RestoreIcon />}
                            onClick={() => handleRestoreVersion(versionsDialog.key, v.version_id)}
                            sx={{ textTransform: 'none' }}
                          >
                            Restaurer
                          </Button>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVersionsDialog({ open: false, key: '', versions: [] })}>
            Fermer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </RecoveryContainer>
  );
}
