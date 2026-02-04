/**
 * DevisCostPieChart - Composant de visualisation des coûts du devis
 * Affiche un graphique en camembert avec la répartition des coûts
 * - Vue globale : affiche les totaux de toutes les lignes
 * - Vue détail : affiche les détails d'une ligne spécifique au clic
 */
import React, { useState, useMemo } from 'react';
import { ResponsivePie } from '@nivo/pie';
import { Box, Typography, IconButton, Collapse, Paper } from '@mui/material';
import { FiChevronUp, FiChevronDown, FiX } from 'react-icons/fi';
import { COLORS as APP_COLORS, CHART_COLORS } from '../../constants/colors';

// Constantes de style
const CHART_SIZE = 220; // Taille du graphique (agrandie)
const PANEL_WIDTH = 320;

// Couleurs par catégorie (utilisant les constantes centralisées)
const COLORS = {
  mainOeuvre: CHART_COLORS.mainOeuvre,    // Bleu
  materiel: CHART_COLORS.materiel,         // Orange
  tauxFixe: CHART_COLORS.tauxFixe,         // Violet
  margePositive: CHART_COLORS.margePositive,  // Vert (marge ≥ 20%)
  margeNegative: CHART_COLORS.margeNegative,  // Rouge (marge < 10%)
};

/**
 * Calcule les données pour le PieChart à partir des lignes de détail
 */
const calculateChartData = (lignesDetails, totalHT = 0, hoveredLine = null) => {
  // Si une ligne est sélectionnée (cliquée), calculer ses données spécifiques
  if (hoveredLine) {
    const quantity = parseFloat(hoveredLine.quantity) || 0;
    const coutMainOeuvre = (parseFloat(hoveredLine.cout_main_oeuvre) || 0) * quantity;
    const coutMateriel = (parseFloat(hoveredLine.cout_materiel) || 0) * quantity;
    const tauxFixe = parseFloat(hoveredLine.taux_fixe) || 0;
    
    // Calcul du montant taux fixe
    const base = coutMainOeuvre + coutMateriel;
    const montantTauxFixe = base * (tauxFixe / 100);
    
    // Calcul de la marge
    const marge = hoveredLine.marge_devis !== null && hoveredLine.marge_devis !== undefined 
      ? parseFloat(hoveredLine.marge_devis)
      : parseFloat(hoveredLine.marge) || 0;
    
    const sousTotal = base + montantTauxFixe;
    const montantMarge = sousTotal * (marge / 100);
    
    // Total de la ligne
    const totalLigne = sousTotal + montantMarge;
    
    // Taux de marge appliqué (ce que l'utilisateur a saisi)
    const tauxMargeApplique = marge;
    
    // Pourcentage de marge par rapport au total HT du devis (pour le seuil de 20%)
    const pourcentageMargeVsTotalHT = totalHT > 0 ? (montantMarge / totalHT) * 100 : tauxMargeApplique;
    
    return {
      isHovered: true,
      lineDescription: hoveredLine.designation || hoveredLine.description || 'Ligne',
      quantity,
      data: [
        {
          id: 'mainOeuvre',
          label: 'Main d\'œuvre',
          value: Math.round(coutMainOeuvre * 100) / 100,
          color: COLORS.mainOeuvre,
        },
        {
          id: 'materiel',
          label: 'Matériel',
          value: Math.round(coutMateriel * 100) / 100,
          color: COLORS.materiel,
        },
        {
          id: 'tauxFixe',
          label: 'Taux fixe',
          value: Math.round(montantTauxFixe * 100) / 100,
          color: COLORS.tauxFixe,
        },
        {
          id: 'marge',
          label: 'Marge',
          value: Math.round(montantMarge * 100) / 100,
          color: tauxMargeApplique >= 10 ? COLORS.margePositive : COLORS.margeNegative,
        },
      ].filter(d => d.value > 0),
      totals: {
        mainOeuvre: coutMainOeuvre,
        materiel: coutMateriel,
        tauxFixe: montantTauxFixe,
        marge: montantMarge,
        total: totalLigne,
        tauxMargeApplique,
        pourcentageMarge: tauxMargeApplique, // Afficher le taux appliqué, pas la part dans le total
      }
    };
  }
  
  // Calcul global pour toutes les lignes
  // On calcule les coûts à partir des lignes de détail
  let totalMainOeuvre = 0;
  let totalMateriel = 0;
  let totalTauxFixe = 0;
  
  lignesDetails.forEach(ligne => {
    const quantity = parseFloat(ligne.quantity) || 0;
    const coutMainOeuvre = (parseFloat(ligne.cout_main_oeuvre) || 0) * quantity;
    const coutMateriel = (parseFloat(ligne.cout_materiel) || 0) * quantity;
    const tauxFixe = parseFloat(ligne.taux_fixe) || 0;
    
    const base = coutMainOeuvre + coutMateriel;
    const montantTauxFixe = base * (tauxFixe / 100);
    
    totalMainOeuvre += coutMainOeuvre;
    totalMateriel += coutMateriel;
    totalTauxFixe += montantTauxFixe;
  });
  
  // Calcul de la marge réelle basée sur le totalHT du devis
  // Cela prend en compte les lignes spéciales et les lignes sans coûts
  const coutsAvecTauxFixe = totalMainOeuvre + totalMateriel + totalTauxFixe;
  const margeReelle = totalHT - coutsAvecTauxFixe;
  
  // Taux de marge = marge / coûts avec taux fixe
  const tauxMargeReel = coutsAvecTauxFixe > 0 ? (margeReelle / coutsAvecTauxFixe) * 100 : 0;
  
  // Total pour le camembert (coûts + marge réelle)
  const total = coutsAvecTauxFixe + Math.max(0, margeReelle);
  
  return {
    isHovered: false,
    lineDescription: null,
    quantity: null,
    data: [
      {
        id: 'mainOeuvre',
        label: 'Main d\'œuvre',
        value: Math.round(totalMainOeuvre * 100) / 100,
        color: COLORS.mainOeuvre,
      },
      {
        id: 'materiel',
        label: 'Matériel',
        value: Math.round(totalMateriel * 100) / 100,
        color: COLORS.materiel,
      },
      {
        id: 'tauxFixe',
        label: 'Taux fixe',
        value: Math.round(totalTauxFixe * 100) / 100,
        color: COLORS.tauxFixe,
      },
      {
        id: 'marge',
        label: 'Marge',
        value: Math.round(Math.max(0, margeReelle) * 100) / 100,
        color: tauxMargeReel >= 10 ? COLORS.margePositive : COLORS.margeNegative,
      },
    ].filter(d => d.value > 0),
    totals: {
      mainOeuvre: totalMainOeuvre,
      materiel: totalMateriel,
      tauxFixe: totalTauxFixe,
      marge: margeReelle,
      total: totalHT, // Utiliser le totalHT du devis comme total
      pourcentageMarge: tauxMargeReel, // Taux de marge réel (marge / coûts)
    }
  };
};

/**
 * Formate un montant en euros
 */
const formatMontant = (montant) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(montant);
};

/**
 * Composant principal DevisCostPieChart
 */
const DevisCostPieChart = ({ 
  devisItems = [], 
  totalHT = 0,
  hoveredLine = null,
  isVisible = true,
  onClose = null,
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // Replié par défaut, seul le PieChart visible
  const [isLegendExpanded, setIsLegendExpanded] = useState(false); // Légende repliée par défaut
  
  // Extraire les lignes de détail des devisItems
  const lignesDetails = useMemo(() => {
    return devisItems.filter(item => item.type === 'ligne_detail');
  }, [devisItems]);
  
  // Récupérer la version la plus récente de la ligne sélectionnée depuis devisItems
  // Ceci permet de mettre à jour le PieChart quand le slider de marge change
  const currentHoveredLine = useMemo(() => {
    if (!hoveredLine) return null;
    // Chercher la ligne dans devisItems pour avoir les valeurs à jour
    const updatedLine = devisItems.find(
      item => item.type === 'ligne_detail' && item.id === hoveredLine.id
    );
    return updatedLine || hoveredLine;
  }, [hoveredLine, devisItems]);
  
  // Calculer les données du graphique
  const chartData = useMemo(() => {
    return calculateChartData(lignesDetails, totalHT, currentHoveredLine);
  }, [lignesDetails, totalHT, currentHoveredLine]);
  
  // Ne pas afficher si pas de lignes ou si masqué
  if (!isVisible || lignesDetails.length === 0) {
    return null;
  }
  
  // Vérifier si tous les coûts sont à 0
  const hasData = chartData.data.length > 0 && chartData.totals.total > 0;
  
  return (
    <Paper
      elevation={6}
      sx={{
        position: 'fixed',
        top: 80,
        right: 20,
        width: PANEL_WIDTH,
        zIndex: 1000,
        borderRadius: '12px',
        overflow: 'visible',
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none',
        transition: 'all 0.3s ease',
      }}
    >
      {/* Zone du graphique avec boutons */}
      <Box sx={{ position: 'relative' }}>
        {/* Boutons de contrôle en haut à droite */}
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            display: 'flex',
            gap: 0.5,
            zIndex: 10,
          }}
        >
          <IconButton 
            size="small" 
            onClick={() => setIsExpanded(!isExpanded)}
            sx={{ 
              backgroundColor: APP_COLORS.primary,
              color: 'white',
              width: 28,
              height: 28,
              '&:hover': {
                backgroundColor: '#1565c0',
              }
            }}
          >
            {isExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </IconButton>
          {onClose && (
            <IconButton 
              size="small" 
              onClick={onClose}
              sx={{ 
                backgroundColor: APP_COLORS.primary,
                color: 'white',
                width: 28,
                height: 28,
                '&:hover': {
                  backgroundColor: APP_COLORS.error,
                }
              }}
            >
              <FiX size={14} />
            </IconButton>
          )}
        </Box>
        
        {/* Graphique (toujours visible) */}
        {hasData ? (
          <Box sx={{ height: CHART_SIZE, px: 1, pt: 1, pb: 1 }}>
            <ResponsivePie
              data={chartData.data}
              margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              innerRadius={0.5}
              padAngle={2}
              cornerRadius={4}
              activeOuterRadiusOffset={8}
              colors={{ datum: 'data.color' }}
              borderWidth={1}
              borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
              enableArcLinkLabels={false}
              arcLabelsSkipAngle={20}
              arcLabelsTextColor="#ffffff"
              arcLabel={(d) => {
                // Pour la marge, afficher le taux de marge réel, pas la part dans le total
                if (d.id === 'marge') {
                  return `${chartData.totals.pourcentageMarge.toFixed(0)}%`;
                }
                return `${Math.round((d.value / chartData.totals.total) * 100)}%`;
              }}
              tooltip={({ datum }) => (
                <Box
                  sx={{
                    backgroundColor: 'white',
                    padding: '8px 12px',
                    borderRadius: '4px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 'bold', color: datum.color }}>
                    {datum.label}
                  </Typography>
                  <Typography variant="body2">
                    {formatMontant(datum.value)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    {datum.id === 'marge' 
                      ? `Taux de marge : ${chartData.totals.pourcentageMarge.toFixed(1)}%`
                      : `${Math.round((datum.value / chartData.totals.total) * 100)}% du total`
                    }
                  </Typography>
                </Box>
              )}
            />
          </Box>
        ) : (
          <Box sx={{ p: 2, pt: 5, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Aucun coût renseigné
            </Typography>
          </Box>
        )}
      </Box>
      
      <Collapse in={isExpanded}>
        {/* Info ligne sélectionnée (titre seulement) */}
        {chartData.isHovered && currentHoveredLine && (
          <Box sx={{ px: 2, py: 1, mx: 1, mb: 0.5 }}>
            <Typography 
              variant="caption" 
              sx={{ 
                color: '#1565c0',
                fontWeight: 500,
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {chartData.lineDescription}
            </Typography>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Quantité : {chartData.quantity}
            </Typography>
          </Box>
        )}
        
        {/* Total et marge (toujours visible) */}
        <Box sx={{ px: 2, py: 1, mx: 1, mb: 0.5 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#333' }}>
              {chartData.isHovered ? 'Total ligne' : 'Total estimé'}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1976d2' }}>
              {formatMontant(chartData.totals.total)}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Marge
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                fontWeight: 'bold',
                color: chartData.totals.pourcentageMarge >= 10 ? COLORS.margePositive : COLORS.margeNegative,
              }}
            >
              {formatMontant(chartData.totals.marge)} ({chartData.totals.pourcentageMarge.toFixed(1)}%)
            </Typography>
          </Box>
          
          {/* Alerte marge faible */}
          {chartData.totals.pourcentageMarge < 10 && chartData.totals.pourcentageMarge > 0 && (
            <Box 
              sx={{ 
                mt: 1, 
                p: 0.5, 
              }}
            >
              <Typography variant="caption" sx={{ color: APP_COLORS.warningDark, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                ⚠️ Marge inférieure à 10%
              </Typography>
            </Box>
          )}
        </Box>
        
        {/* Bouton dépliage légende */}
        <Box 
          sx={{ 
            display: 'flex',
            justifyContent: 'center',
            py: 0.5,
          }}
        >
          <IconButton 
            size="small" 
            onClick={() => setIsLegendExpanded(!isLegendExpanded)}
            sx={{ 
              backgroundColor: APP_COLORS.primary,
              color: 'white',
              width: 28,
              height: 28,
              '&:hover': {
                backgroundColor: '#1565c0',
              }
            }}
          >
            {isLegendExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
          </IconButton>
        </Box>
        
        {/* Légende dépliable */}
        <Collapse in={isLegendExpanded}>
          <Box sx={{ px: 2, py: 1.5, mx: 1, mb: 1 }}>
            {/* Valeurs brutes de la ligne (si sélectionnée) */}
            {chartData.isHovered && currentHoveredLine && (
              <Box sx={{ mb: 1.5, p: 1 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, color: '#1565c0', display: 'block', mb: 0.5 }}>
                  Valeurs unitaires :
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  <Typography variant="caption" sx={{ color: '#555' }}>
                    <strong>MO:</strong> {currentHoveredLine.cout_main_oeuvre}€
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#555' }}>
                    <strong>Mat:</strong> {currentHoveredLine.cout_materiel}€
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#555' }}>
                    <strong>TF:</strong> {currentHoveredLine.taux_fixe}%
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#555' }}>
                    <strong>Marge:</strong> {currentHoveredLine.marge_devis ?? currentHoveredLine.marge}%
                  </Typography>
                </Box>
              </Box>
            )}
            
            {/* Légende des montants calculés */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <LegendItem 
                color={COLORS.mainOeuvre} 
                label="Main d'œuvre" 
                value={chartData.totals.mainOeuvre}
              />
              <LegendItem 
                color={COLORS.materiel} 
                label="Matériel" 
                value={chartData.totals.materiel}
              />
              <LegendItem 
                color={COLORS.tauxFixe} 
                label="Taux fixe" 
                value={chartData.totals.tauxFixe}
              />
              <LegendItem 
                color={chartData.totals.pourcentageMarge >= 10 ? COLORS.margePositive : COLORS.margeNegative} 
                label="Marge" 
                value={chartData.totals.marge}
                suffix={` (${chartData.totals.pourcentageMarge.toFixed(1)}%)`}
                highlight={chartData.totals.pourcentageMarge < 10}
              />
            </Box>
          </Box>
        </Collapse>
      </Collapse>
    </Paper>
  );
};

/**
 * Composant pour un élément de légende
 */
const LegendItem = ({ color, label, value, suffix = '', highlight = false }) => (
  <Box 
    sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      py: 0.25,
    }}
  >
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box 
        sx={{ 
          width: 12, 
          height: 12, 
          borderRadius: '3px', 
          backgroundColor: color,
        }} 
      />
      <Typography variant="caption" sx={{ color: '#555' }}>
        {label}
      </Typography>
    </Box>
    <Typography 
      variant="caption" 
      sx={{ 
        fontWeight: highlight ? 'bold' : 'normal',
        color: highlight ? '#d32f2f' : '#333',
      }}
    >
      {formatMontant(value)}{suffix}
    </Typography>
  </Box>
);

export default DevisCostPieChart;

