/**
 * Composant bouton réutilisable pour régénérer un PDF dans le Drive
 * 
 * Ce composant peut être utilisé dans n'importe quelle liste ou interface
 * pour permettre la régénération d'un document PDF avec le nouveau template
 */

import React from 'react';
import { 
  Button, 
  IconButton, 
  Tooltip, 
  CircularProgress 
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { useRegeneratePDF } from '../../hooks/useRegeneratePDF';

/**
 * Composant RegeneratePDFButton
 * 
 * @param {object} props
 * @param {string} props.documentType - Type de document (depuis DOCUMENT_TYPES)
 * @param {object} props.documentData - Données du document à régénérer
 * @param {string} props.variant - Variante du bouton ('icon' | 'button' | 'outlined' | 'text')
 * @param {string} props.size - Taille du bouton ('small' | 'medium' | 'large')
 * @param {string} props.label - Label personnalisé du bouton (si variant='button')
 * @param {boolean} props.showConfirm - Afficher une confirmation avant régénération (défaut: true)
 * @param {function} props.onSuccess - Callback appelé en cas de succès
 * @param {function} props.onError - Callback appelé en cas d'erreur
 * @param {string} props.color - Couleur du bouton (défaut: 'primary')
 * @param {string} props.tooltipPlacement - Position du tooltip (défaut: 'top')
 * @param {boolean} props.disabled - Désactiver le bouton
 * @param {object} props.sx - Styles Material-UI supplémentaires
 */
const RegeneratePDFButton = ({
  documentType,
  documentData,
  variant = 'icon',
  size = 'medium',
  label = null,
  showConfirm = true,
  onSuccess = null,
  onError = null,
  color = 'primary',
  tooltipPlacement = 'top',
  disabled = false,
  sx = {},
}) => {
  const { regenerate, isLoading, config } = useRegeneratePDF(documentType);

  const handleRegenerate = async () => {
    await regenerate(documentData, {
      showConfirm,
      onSuccess,
      onError,
    });
  };

  // Déterminer le label par défaut
  const buttonLabel = label || `Régénérer ${config.label}`;
  const tooltipLabel = `Régénérer dans le Drive avec le nouveau template`;

  // Si variant est 'icon', afficher un IconButton
  if (variant === 'icon') {
    return (
      <Tooltip title={tooltipLabel} placement={tooltipPlacement} arrow>
        <span>
          <IconButton
            onClick={handleRegenerate}
            disabled={disabled || isLoading}
            color={color}
            size={size}
            sx={{
              ...sx,
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
              },
            }}
          >
            {isLoading ? (
              <CircularProgress size={20} />
            ) : (
              <RefreshIcon />
            )}
          </IconButton>
        </span>
      </Tooltip>
    );
  }

  // Si variant est 'button', 'outlined', ou 'text', afficher un Button
  const buttonVariant = variant === 'button' ? 'contained' : variant;

  return (
    <Tooltip title={tooltipLabel} placement={tooltipPlacement} arrow>
      <span>
        <Button
          onClick={handleRegenerate}
          disabled={disabled || isLoading}
          variant={buttonVariant}
          color={color}
          size={size}
          startIcon={isLoading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
          sx={{
            textTransform: 'none',
            ...sx,
          }}
        >
          {isLoading ? 'Régénération...' : buttonLabel}
        </Button>
      </span>
    </Tooltip>
  );
};

export default RegeneratePDFButton;

/**
 * Composant simplifié pour un bouton icône (le plus courant)
 */
export const RegeneratePDFIconButton = (props) => (
  <RegeneratePDFButton {...props} variant="icon" />
);

/**
 * Composant simplifié pour un bouton texte
 */
export const RegeneratePDFTextButton = (props) => (
  <RegeneratePDFButton {...props} variant="outlined" />
);

/**
 * Composant simplifié pour un bouton plein
 */
export const RegeneratePDFFullButton = (props) => (
  <RegeneratePDFButton {...props} variant="button" />
);

