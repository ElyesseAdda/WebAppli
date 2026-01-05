/**
 * PasteProgressModal - Modal de progression pour le collage de fichiers
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  LinearProgress,
  Typography,
  CircularProgress,
  Button,
} from '@mui/material';
import { ContentPaste as PasteIcon } from '@mui/icons-material';

const PasteProgressModal = ({ open, progressData, onCancel }) => {
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState(null);
  const [transferSpeed, setTransferSpeed] = useState(null);
  const previousProgressRef = useRef(null);
  const speedHistoryRef = useRef([]);
  const startTimeRef = useRef(null);
  const elapsedTimeRef = useRef(0);

  // Initialiser le temps de départ
  useEffect(() => {
    if (open && progressData && !startTimeRef.current) {
      startTimeRef.current = Date.now();
      elapsedTimeRef.current = 0;
      setEstimatedTimeRemaining(null);
      setTransferSpeed(null);
    }
    if (!open) {
      startTimeRef.current = null;
      previousProgressRef.current = null;
      speedHistoryRef.current = [];
      elapsedTimeRef.current = 0;
      setEstimatedTimeRemaining(null);
      setTransferSpeed(null);
    }
  }, [open, progressData]);

  // Calculer la vitesse de transfert et le temps restant TOTAL (tous fichiers confondus)
  useEffect(() => {
    // Vérifier que nous avons les données nécessaires
    if (!progressData || 
        progressData.loaded === undefined || 
        !progressData.total || 
        progressData.total === 0) {
      return;
    }

    const now = Date.now();
    const currentProgress = {
      loaded: progressData.loaded,  // Taille totale chargée (tous fichiers)
      total: progressData.total,    // Taille totale à charger (tous fichiers)
      timestamp: now,
    };

    // Si c'est la première mesure, initialiser et ne pas calculer encore
    if (!previousProgressRef.current) {
      previousProgressRef.current = currentProgress;
      return;
    }

    const timeDelta = (now - previousProgressRef.current.timestamp) / 1000; // en secondes
    const bytesDelta = progressData.loaded - previousProgressRef.current.loaded;

    // Ne calculer la vitesse que si on a un delta de temps significatif (au moins 0.3 seconde)
    // et un delta de bytes positif (au moins 1 KB pour éviter les calculs erronés)
    if (timeDelta >= 0.3 && bytesDelta > 0) {
      const currentSpeed = bytesDelta / timeDelta; // bytes par seconde
      
      // Ne garder que les vitesses valides et raisonnables (entre 100 B/s et 10 GB/s)
      const minSpeed = 100; // 100 B/s minimum (très permissif)
      const maxSpeed = 10 * 1024 * 1024 * 1024; // 10 GB/s maximum (sanity check)
      
      if (currentSpeed >= minSpeed && currentSpeed <= maxSpeed) {
        speedHistoryRef.current.push(currentSpeed);

        // Garder seulement les 15 dernières mesures pour une moyenne plus stable
        if (speedHistoryRef.current.length > 15) {
          speedHistoryRef.current.shift();
        }

        // Calculer la vitesse moyenne (au moins 2 mesures pour être fiable)
        if (speedHistoryRef.current.length >= 2) {
          // Utiliser une moyenne pondérée (les mesures récentes ont plus de poids)
          const weights = speedHistoryRef.current.map((_, index) => index + 1);
          const totalWeight = weights.reduce((sum, w) => sum + w, 0);
          const weightedSum = speedHistoryRef.current.reduce((sum, speed, index) => 
            sum + (speed * weights[index]), 0
          );
          const averageSpeed = weightedSum / totalWeight;

          setTransferSpeed(averageSpeed);
        }
      }
    }
    
    // CALCUL DYNAMIQUE DU TEMPS RESTANT (toujours mis à jour à chaque changement de progressData)
    // Utiliser soit la vitesse moyenne calculée, soit une estimation basée sur le temps écoulé
    if (progressData.loaded > 0 && progressData.total > 0 && startTimeRef.current) {
      const elapsed = (now - startTimeRef.current) / 1000; // secondes écoulées
      const remainingBytes = progressData.total - progressData.loaded;
      
      if (remainingBytes > 0 && elapsed > 0) {
        let speedToUse = null;
        
        // Priorité 1 : Utiliser la vitesse moyenne calculée si disponible (plus précise)
        if (speedHistoryRef.current.length >= 2) {
          const weights = speedHistoryRef.current.map((_, index) => index + 1);
          const totalWeight = weights.reduce((sum, w) => sum + w, 0);
          const weightedSum = speedHistoryRef.current.reduce((sum, speed, index) => 
            sum + (speed * weights[index]), 0
          );
          speedToUse = weightedSum / totalWeight;
        }
        // Priorité 2 : Utiliser une estimation basée sur le temps écoulé total (moins précise mais disponible immédiatement)
        else if (elapsed >= 1 && progressData.loaded > 0) {
          speedToUse = progressData.loaded / elapsed;
        }
        
        // Calculer le temps restant avec la vitesse disponible
        if (speedToUse && speedToUse > 0) {
          const secondsRemaining = remainingBytes / speedToUse;
          
          if (secondsRemaining >= 0 && 
              !isNaN(secondsRemaining) && 
              isFinite(secondsRemaining) &&
              secondsRemaining < 86400) { // Max 24 heures
            setEstimatedTimeRemaining(secondsRemaining);
            
            // Mettre à jour aussi la vitesse affichée si on utilise l'estimation
            if (speedHistoryRef.current.length < 2) {
              setTransferSpeed(speedToUse);
            }
          }
        }
      } else if (remainingBytes <= 0) {
        // Tout est terminé
        setEstimatedTimeRemaining(0);
      }
    }
    
    // Toujours mettre à jour la référence pour le prochain calcul
    previousProgressRef.current = currentProgress;
  }, [open, progressData]);

  // Formater la taille en unités lisibles
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Formater le temps restant
  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds === Infinity || isNaN(seconds)) {
      return 'Calcul...';
    }

    if (seconds < 60) {
      return `${Math.ceil(seconds)} seconde${Math.ceil(seconds) > 1 ? 's' : ''}`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = Math.ceil(seconds % 60);
      return `${minutes} min ${secs} s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours} h ${minutes} min`;
    }
  };

  // Formater la vitesse de transfert
  const formatSpeed = (bytesPerSecond) => {
    if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s';
    return formatBytes(bytesPerSecond) + '/s';
  };

  const progress = progressData?.progress || 0;
  const currentItem = progressData?.currentItem || '';
  const currentItemIndex = progressData?.currentItemIndex || 0;
  const totalItems = progressData?.totalItems || 0;
  const phase = progressData?.phase || 'upload';

  return (
    <Dialog
      open={open}
      maxWidth="sm"
      fullWidth
      disableEscapeKeyDown
      sx={{
        zIndex: 1500, // S'assurer que le modal est au-dessus de tout
      }}
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <PasteIcon color="primary" />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6">
              Copie en cours...
            </Typography>
            {totalItems > 1 && (
              <Typography variant="body2" color="text.secondary">
                Fichier {currentItemIndex + 1} sur {totalItems} • {progress}% total
              </Typography>
            )}
            {totalItems === 1 && (
              <Typography variant="body2" color="text.secondary">
                {progress}% complété
              </Typography>
            )}
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          {/* Fichier/dossier en cours */}
          {currentItem && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              📋 Copie : {currentItem}
            </Typography>
          )}

          {/* Barre de progression globale */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Progression globale
              </Typography>
              <Typography variant="body2" fontWeight="medium">
                {progress}% ({currentItemIndex} / {totalItems} fichiers)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
              }}
            />
          </Box>

          {/* Informations de transfert */}
          {progressData?.loaded && progressData?.total && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {formatBytes(progressData.loaded)} / {formatBytes(progressData.total)}
              </Typography>
            </Box>
          )}

          {/* Vitesse de transfert et temps restant TOTAL */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
              mt: 2,
            }}
          >
            {transferSpeed && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Vitesse de transfert
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {formatSpeed(transferSpeed)}
                </Typography>
              </Box>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Temps restant total
              </Typography>
              <Typography variant="body2" color="primary" fontWeight="bold">
                {estimatedTimeRemaining !== null && estimatedTimeRemaining !== undefined
                  ? formatTimeRemaining(estimatedTimeRemaining)
                  : transferSpeed
                    ? 'Calcul...'
                    : 'En attente...'}
              </Typography>
            </Box>
            {totalItems > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Fichiers restants
                </Typography>
                <Typography variant="body2" fontWeight="medium">
                  {totalItems - currentItemIndex} fichier{totalItems - currentItemIndex > 1 ? 's' : ''}
                </Typography>
              </Box>
            )}
          </Box>

          {/* Indicateur de chargement si pas encore de données */}
          {(!progressData || progress === 0) && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 3,
              }}
            >
              <CircularProgress size={40} />
            </Box>
          )}
        </Box>
      </DialogContent>
      {onCancel && (
        <DialogActions>
          <Button onClick={onCancel} color="error" variant="outlined">
            Annuler
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default PasteProgressModal;

