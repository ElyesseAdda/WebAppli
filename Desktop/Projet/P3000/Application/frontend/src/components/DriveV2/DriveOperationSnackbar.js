/**
 * Snackbar non bloquant pour les opérations Drive longues (renommage, déplacement).
 */

import React from 'react';
import {
  Snackbar,
  Paper,
  Box,
  Typography,
  LinearProgress,
  IconButton,
} from '@mui/material';
import {
  DriveFileRenameOutline as RenameIcon,
  DriveFileMove as MoveIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

const DriveOperationSnackbar = ({
  open,
  title = 'Opération en cours...',
  currentItem = '',
  processed = 0,
  total = 0,
  progress = 0,
  mode = 'rename',
  onClose,
}) => {
  const percent = total > 0 ? Math.min(100, progress || Math.round((processed / total) * 100)) : 0;
  const determinate = total > 0;

  return (
    <Snackbar
      open={open}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      sx={{ zIndex: 1600 }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 2,
          minWidth: 320,
          maxWidth: 420,
          borderRadius: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
          {mode === 'move' ? <MoveIcon color="primary" /> : <RenameIcon color="primary" />}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="subtitle2" fontWeight={600}>
              {title}
            </Typography>
            {currentItem ? (
              <Typography variant="caption" color="text.secondary" noWrap display="block">
                {currentItem}
              </Typography>
            ) : null}
          </Box>
          {onClose ? (
            <IconButton size="small" onClick={onClose} aria-label="Fermer">
              <CloseIcon fontSize="small" />
            </IconButton>
          ) : null}
        </Box>

        <LinearProgress
          variant={determinate ? 'determinate' : 'indeterminate'}
          value={percent}
          sx={{ height: 8, borderRadius: 4, mb: 1 }}
        />

        <Typography variant="caption" color="text.secondary">
          {determinate
            ? `${processed} / ${total} fichier${total > 1 ? 's' : ''} • ${percent}%`
            : 'Préparation...'}
        </Typography>
      </Paper>
    </Snackbar>
  );
};

export default DriveOperationSnackbar;
