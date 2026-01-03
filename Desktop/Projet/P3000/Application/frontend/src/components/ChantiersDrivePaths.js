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
} from '@mui/material';
import {
  Search as SearchIcon,
  ContentCopy as ContentCopyIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';

const ChantiersDrivePaths = () => {
  const [chantiers, setChantiers] = useState([]);
  const [filteredChantiers, setFilteredChantiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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
    </Box>
  );
};

export default ChantiersDrivePaths;

