import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Snackbar,
} from '@mui/material';
import {
  Search as SearchIcon,
  ContentCopy as ContentCopyIcon,
  OpenInNew as OpenInNewIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import DrivePathSelector from './Devis/DrivePathSelector';

const ChantiersDrivePaths = () => {
  const [chantiers, setChantiers] = useState([]);
  const [filteredChantiers, setFilteredChantiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedPath, setSelectedPath] = useState(null);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [showPathSelector, setShowPathSelector] = useState(false);

  useEffect(() => {
    fetchChantiersDrivePaths();
  }, []);

  useEffect(() => {
    // Filtrer les chantiers selon le terme de recherche
    if (searchTerm.trim() === '') {
      setFilteredChantiers(chantiers);
    } else {
      const filtered = chantiers.filter(
        (chantier) =>
          chantier.chantier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (chantier.societe_nom && chantier.societe_nom.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (chantier.drive_path && chantier.drive_path.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredChantiers(filtered);
    }
  }, [searchTerm, chantiers]);

  const fetchChantiersDrivePaths = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/chantiers/drive-paths/');
      setChantiers(response.data);
      setFilteredChantiers(response.data);
    } catch (err) {
      console.error('Erreur lors de la récupération des chemins de drive:', err);
      setError('Erreur lors de la récupération des données');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPath = (path) => {
    navigator.clipboard.writeText(path);
  };

  const handleOpenDrive = (path) => {
    if (path) {
      const driveUrl = `/drive?path=${encodeURIComponent(path)}&sidebar=closed`;
      window.open(driveUrl, '_blank', 'width=1200,height=800');
    }
  };

  const handleEditPath = (item) => {
    // Utiliser drive_path_stored (chemin personnalisé stocké) ou drive_path_base (chemin calculé)
    // Si drive_path_stored existe, c'est le chemin personnalisé actuel
    // Sinon, on utilise drive_path_base qui est le chemin calculé
    const currentPath = item.drive_path_stored || item.drive_path_base || '';
    setSelectedItem(item);
    // Initialiser selectedPath avec le chemin actuel (pour permettre de le garder ou le modifier)
    setSelectedPath(item.drive_path_stored || null);
    setEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setEditModalOpen(false);
    setSelectedItem(null);
    setSelectedPath(null);
  };

  const handlePathSelected = (path) => {
    setSelectedPath(path);
    setShowPathSelector(false);
    // Le DrivePathSelector ferme automatiquement son modal
  };

  const handleSavePath = async () => {
    if (!selectedItem) return;

    setSaving(true);
    try {
      const endpoint = selectedItem.type === 'chantier' 
        ? `/api/chantier/${selectedItem.id}/update_drive_path/`
        : `/api/appels-offres/${selectedItem.id}/update_drive_path/`;
      
      // Si selectedPath est défini et différent du chemin actuel, l'utiliser
      // Sinon, garder le chemin actuel (ne pas le modifier)
      const pathToSave = selectedPath !== null ? selectedPath : selectedItem.drive_path_stored;
      
      const response = await axios.patch(endpoint, {
        drive_path: pathToSave || null
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: response.data.message || 'Chemin mis à jour avec succès',
          severity: 'success'
        });
        handleCloseEditModal();
        // Rafraîchir la liste
        fetchChantiersDrivePaths();
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour du chemin:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Erreur lors de la mise à jour du chemin',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleResetPath = async () => {
    if (!selectedItem) return;

    setSaving(true);
    try {
      const endpoint = selectedItem.type === 'chantier' 
        ? `/api/chantier/${selectedItem.id}/update_drive_path/`
        : `/api/appels-offres/${selectedItem.id}/update_drive_path/`;
      
      const response = await axios.patch(endpoint, {
        drive_path: null
      }, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.data.success) {
        setSnackbar({
          open: true,
          message: 'Chemin réinitialisé au chemin par défaut',
          severity: 'success'
        });
        handleCloseEditModal();
        // Rafraîchir la liste
        fetchChantiersDrivePaths();
      }
    } catch (err) {
      console.error('Erreur lors de la réinitialisation du chemin:', err);
      setSnackbar({
        open: true,
        message: err.response?.data?.error || 'Erreur lors de la réinitialisation du chemin',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const getStateColor = (state) => {
    switch (state) {
      case 'Terminé':
        return 'success';
      case 'En Cours':
        return 'primary';
      case 'Facturé':
        return 'info';
      default:
        return 'default';
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={3}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Chemins de Drive par Chantier
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Cette page liste tous les chantiers avec leurs chemins de drive correspondants dans AWS S3.
      </Typography>

      <Box mb={3}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Rechercher par nom de chantier, société ou chemin de drive..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell><strong>ID</strong></TableCell>
              <TableCell><strong>Nom du Chantier</strong></TableCell>
              <TableCell><strong>Société</strong></TableCell>
              <TableCell><strong>État</strong></TableCell>
              <TableCell><strong>Date de Début</strong></TableCell>
              <TableCell><strong>Chemin de Drive</strong></TableCell>
              <TableCell><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredChantiers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="text.secondary" py={3}>
                    {searchTerm ? 'Aucun résultat trouvé' : 'Aucun chantier trouvé'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredChantiers.map((chantier) => (
                <TableRow key={chantier.id} hover>
                  <TableCell>{chantier.id}</TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {chantier.chantier_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {chantier.societe_nom || (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Aucune société
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={chantier.state_chantier}
                      color={getStateColor(chantier.state_chantier)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {chantier.date_debut
                      ? new Date(chantier.date_debut).toLocaleDateString('fr-FR')
                      : '-'}
                  </TableCell>
                  <TableCell>
                    {chantier.drive_path ? (
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            color: 'text.secondary',
                            wordBreak: 'break-all',
                          }}
                        >
                          {chantier.drive_path}
                        </Typography>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary" fontStyle="italic">
                        Aucun chemin disponible
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Box display="flex" gap={1}>
                      <Tooltip title="Modifier le chemin">
                        <IconButton
                          size="small"
                          onClick={() => handleEditPath(chantier)}
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      {chantier.drive_path && (
                        <>
                          <Tooltip title="Copier le chemin">
                            <IconButton
                              size="small"
                              onClick={() => handleCopyPath(chantier.drive_path)}
                              color="primary"
                            >
                              <ContentCopyIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Ouvrir dans le Drive">
                            <IconButton
                              size="small"
                              onClick={() => handleOpenDrive(chantier.drive_path)}
                              color="primary"
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Box mt={2}>
        <Typography variant="body2" color="text.secondary">
          Total: {filteredChantiers.length} chantier(s) affiché(s) sur {chantiers.length}
        </Typography>
      </Box>

      {/* Modal de modification du chemin */}
      <Dialog
        open={editModalOpen}
        onClose={handleCloseEditModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Modifier le chemin du drive
          {selectedItem && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {selectedItem.type === 'chantier' ? 'Chantier' : 'Appel d\'offres'}: {selectedItem.chantier_name}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Chemin actuel: <strong>{selectedItem?.drive_path || 'Calculé automatiquement'}</strong>
            </Typography>
            {selectedItem?.drive_path_stored && (
              <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                (Chemin personnalisé stocké: {selectedItem.drive_path_stored})
              </Typography>
            )}
            {selectedPath && selectedPath !== (selectedItem?.drive_path_stored || selectedItem?.drive_path_base || '') && (
              <Typography variant="body2" color="primary" sx={{ mt: 1 }}>
                Nouveau chemin sélectionné: <strong>{selectedPath}</strong>
              </Typography>
            )}
          </Box>
          <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setShowPathSelector(true)}
              disabled={saving}
            >
              {selectedPath ? 'Modifier le chemin sélectionné' : 'Sélectionner un nouveau chemin'}
            </Button>
            {selectedItem?.drive_path_stored && (
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={handleResetPath}
                disabled={saving}
                color="secondary"
              >
                Réinitialiser au chemin par défaut
              </Button>
            )}
          </Box>
          {!selectedPath && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Cliquez sur "Sélectionner un nouveau chemin" pour choisir un chemin personnalisé, ou utilisez "Réinitialiser" pour revenir au chemin par défaut.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditModal} disabled={saving}>
            Annuler
          </Button>
          <Button
            onClick={handleSavePath}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : null}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* DrivePathSelector modal */}
      <DrivePathSelector
        open={showPathSelector}
        onClose={() => setShowPathSelector(false)}
        onSelect={handlePathSelected}
        defaultPath={selectedPath || selectedItem?.drive_path_stored || selectedItem?.drive_path_base || ''}
      />

      {/* Snackbar pour les notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default ChantiersDrivePaths;

