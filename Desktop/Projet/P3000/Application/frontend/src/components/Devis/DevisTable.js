import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { IconButton, Tooltip } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { FiX } from 'react-icons/fi';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import PartieSearch from './PartieSearch';
import SousPartieSearch from './SousPartieSearch';
import LigneDetailSearch from './LigneDetailSearch';
import LigneDetailEditModal from './LigneDetailEditModal';
import SpecialLinesCreator from './LignesSpeciales/SpecialLinesCreator';
import PendingSpecialLines from './LignesSpeciales/PendingSpecialLines';
import SpecialLineEditModal from './LignesSpeciales/SpecialLineEditModal';
import LigneSpecialeRow from './LignesSpeciales/LigneSpecialeRow';
import { DevisIndexManager } from '../../utils/DevisIndexManager';

// ✅ Constante pour "Lignes directes"
const DIRECT_LINES_DESCRIPTION = "Lignes directes";

// Composant zone de placement pour ligne spéciale (style glass)
const PlacementZone = ({ position, onPlaceLineAt, isActive, lineAwaitingPlacement, displayAs = 'partie' }) => {
  if (!isActive || !lineAwaitingPlacement) return null;
  
  const [isHovered, setIsHovered] = React.useState(false);
  
  // Styles selon le type d'affichage
  const getStyles = () => {
    if (displayAs === 'partie') {
      return {
        padding: '15px 20px',
        fontSize: '18px',
        fontWeight: 'bold',
        borderRadius: '6px',
        minHeight: '60px'
      };
    } else if (displayAs === 'sous_partie') {
      return {
        padding: '10px 15px',
        fontSize: '15px',
        fontWeight: '600',
        borderRadius: '4px',
        minHeight: '50px',
        marginLeft: '20px'
      };
    } else {
      return {
        padding: '8px 12px',
        fontSize: '13px',
        fontWeight: 'normal',
        borderRadius: '4px',
        minHeight: '40px',
        marginLeft: '40px'
      };
    }
  };
  
  const styles = getStyles();
  const description = lineAwaitingPlacement.data?.description || lineAwaitingPlacement.description || 'Ligne spéciale';
  
  return (
    <div
      onClick={() => onPlaceLineAt(position)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles,
        // Glassmorphisme : fond transparent avec blur
        background: isHovered 
          ? 'rgba(255, 255, 255, 0.25)'
          : 'rgba(255, 255, 255, 0.15)',
        backdropFilter: 'blur(10px) saturate(180%)',
        WebkitBackdropFilter: 'blur(10px) saturate(180%)',
        
        // Bordure glassmorphisme
        border: isHovered 
          ? '1px solid rgba(33, 150, 243, 0.5)' 
          : '1px solid rgba(33, 150, 243, 0.2)',
        
        // Shadow pour profondeur
        boxShadow: isHovered 
          ? '0 8px 32px 0 rgba(33, 150, 243, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.3)'
          : '0 4px 16px 0 rgba(33, 150, 243, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.2)',
        
        // Overlay coloré subtil
        position: 'relative',
        overflow: 'hidden',
        
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        margin: '4px 0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isHovered ? 'translateY(-2px) scale(1.01)' : 'translateY(0) scale(1)',
        color: isHovered ? '#1565c0' : '#42a5f5'
      }}
      title="Cliquez pour placer la ligne spéciale ici"
    >
      {/* Overlay de couleur avec gradient */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: isHovered
          ? 'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(100, 181, 246, 0.05) 100%)'
          : 'linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(100, 181, 246, 0.02) 100%)',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      
      {/* Contenu */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', position: 'relative', zIndex: 1 }}>
        <span style={{ fontSize: '20px' }}>📍</span>
        <span style={{ 
          fontStyle: 'italic',
          fontWeight: isHovered ? '600' : 'normal'
        }}>"{description}"</span>
      </div>
      <span style={{ 
        fontWeight: 'bold', 
        fontSize: isHovered ? '14px' : '13px',
        position: 'relative',
        zIndex: 1
      }}>
        Placer ici
      </span>
    </div>
  );
};

const DevisTable = ({ 
  devisData, 
  parties, 
  selectedParties,
  special_lines_global, 
  total_ht, 
  formatMontantEspace,
  onNatureTravauxChange,
  onPartieSelect,
  onPartieCreate,
  onPartieRemove,
  onPartieEdit,
  onPartieNumeroChange,
  onPartiesReorder,
  searchParties,
  isLoadingParties,
  // Props pour les sous-parties
  onSousPartieSelect,
  onSousPartieCreate,
  onSousPartieRemove,
  onSousPartieEdit,
  onSousPartieNumeroChange,
  onSousPartiesReorder,
  onLigneDetailSelect,
  onLigneDetailCreate,
  onLigneDetailQuantityChange,
  onLigneDetailEdit,
  onLigneDetailRemove,
  onLigneDetailMargeChange,
  onLigneDetailPriceChange,
  // Props pour lignes spéciales v2
  pendingSpecialLines,
  onAddPendingSpecialLine,
  onRemovePendingSpecialLine,
  onRemoveSpecialLine,  // Supprimer sans recalculer index_global
  onMoveSpecialLine,    // ✅ TODO 1.3: Déplacer une ligne spéciale existante
  onEditSpecialLine,
  editingSpecialLine,
  showEditModal,
  onCloseEditModal,
  onSaveSpecialLine,
  onSpecialLinesReorder,
  // Fonctions de calcul
  calculateGlobalTotal,
  calculateGlobalTotalExcludingLine,
  calculatePartieTotal,
  calculateSousPartieTotal,
  // Props pour le système unifié
  devisItems = [],
  onDevisItemsReorder,
  // Props pour le placement visuel
  lineAwaitingPlacement,
  onPlaceLineAt,
  onCancelPlacement,
  onRequestReplacement,
  // Props pour la sélection de base
  isSelectingBase,
  onBaseSelected,
  onCancelBaseSelection,
  pendingLineForBase,
  onClearPendingLineForBase,
  // Props pour le tableau option
  isOptionsTable = false,
  onTransferToMain,
  // Props pour filtrer les lignes détails déjà utilisées (pour le tableau option)
  mainDevisItems = [], // Les items du tableau principal pour filtrer les lignes détails
  // Props pour la ligne récurrente
  calculateRecurringLineAmount,
  hasRecurringLine,
  pendingRecurringLine,
  onAutoPlaceRecurringLine,
  pendingRecurringAmount = 0,
  // Props pour le PieChart des coûts
  onLigneDetailHover,
  hoveredLigneDetail
}) => {
  // État pour suivre si une sous-partie est en cours de drag et quelle partie est affectée
  const [draggedPartieId, setDraggedPartieId] = useState(null);
  
  // États pour les clics (boutons d'action) - au lieu de hover
  const [clickedLigneDetailId, setClickedLigneDetailId] = useState(null);
  const [clickedLignePosition, setClickedLignePosition] = useState(null);
  
  // État pour stocker les valeurs de prix en cours de saisie (par ID de ligne)
  const [editingPrices, setEditingPrices] = useState({});
  const [isIconsAnimatingOut, setIsIconsAnimatingOut] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editContext, setEditContext] = useState(null);
  
  const [clickedPartieId, setClickedPartieId] = useState(null);
  const [clickedPartiePosition, setClickedPartiePosition] = useState(null);
  const [isPartieIconsAnimatingOut, setIsPartieIconsAnimatingOut] = useState(false);
  
  const [clickedSousPartieId, setClickedSousPartieId] = useState(null);
  const [clickedSousPartiePosition, setClickedSousPartiePosition] = useState(null);
  const [isSousPartieIconsAnimatingOut, setIsSousPartieIconsAnimatingOut] = useState(false);
  
  // États pour les clics sur les lignes spéciales
  const [clickedSpecialLineId, setClickedSpecialLineId] = useState(null);
  const [clickedSpecialLinePosition, setClickedSpecialLinePosition] = useState(null);
  const [isSpecialLineIconsAnimatingOut, setIsSpecialLineIconsAnimatingOut] = useState(false);
  
  // État pour le modal de création de ligne spéciale
  const [showCreateModal, setShowCreateModal] = useState(false);

  // ✅ Zones de placement : actives si ligne en attente ET (pas récurrente OU en mode déplacement)
  // - Nouvelle ligne récurrente (pas encore placée) → zones désactivées, utiliser la zone en bas
  // - Ligne récurrente qu'on déplace (isMoving=true) → zones activées
  const canUsePlacementZones = Boolean(
    lineAwaitingPlacement && 
    (!lineAwaitingPlacement.isRecurringSpecial || lineAwaitingPlacement.isMoving)
  );
  const placementLine = canUsePlacementZones ? lineAwaitingPlacement : null;
  const hasPendingRecurringLine = Boolean(pendingRecurringLine && pendingRecurringLine.isRecurringSpecial);
  
  // ✅ Helper pour vérifier si une ligne est la ligne récurrente
  const isRecurringLine = (item) => (
    item &&
    item.type === 'ligne_speciale' &&
    (
      item.isRecurringSpecial ||
      item.description === 'Montant global HT des prestations unitaires'
    )
  );
  const handleRecurringBannerClick = React.useCallback(() => {
    if (onAutoPlaceRecurringLine) {
      onAutoPlaceRecurringLine();
    }
  }, [onAutoPlaceRecurringLine]);

  // useEffect vide pour compatibilité (peut être supprimé si non utilisé ailleurs)
  useEffect(() => {
    return () => {
      // Nettoyage si nécessaire
    };
  }, []);

  // Rouvrir le modal quand une base a été sélectionnée
  useEffect(() => {
    if (pendingLineForBase && !isSelectingBase) {
      // La base vient d'être sélectionnée, rouvrir le modal
      setShowCreateModal(true);
    }
  }, [pendingLineForBase, isSelectingBase]);

  // Déclencher l'animation d'entrée quand les icônes apparaissent (au clic)
  useEffect(() => {
    if (clickedLigneDetailId) {
      // Fermer les autres panneaux
      setClickedPartieId(null);
      setClickedSousPartieId(null);
      setClickedSpecialLineId(null);
      // Mettre temporairement l'animation à true pour qu'elle parte de la gauche
      setIsIconsAnimatingOut(true);
      // Puis immédiatement la remettre à false pour qu'elle vienne vers nous
      setTimeout(() => {
        setIsIconsAnimatingOut(false);
      }, 10);
    }
  }, [clickedLigneDetailId]);

  // Déclencher l'animation d'entrée pour les parties (au clic)
  useEffect(() => {
    if (clickedPartieId) {
      // Fermer les autres panneaux
      setClickedLigneDetailId(null);
      setClickedSousPartieId(null);
      setClickedSpecialLineId(null);
      setIsPartieIconsAnimatingOut(true);
      setTimeout(() => {
        setIsPartieIconsAnimatingOut(false);
      }, 10);
    }
  }, [clickedPartieId]);

  // Déclencher l'animation d'entrée pour les sous-parties (au clic)
  useEffect(() => {
    if (clickedSousPartieId) {
      // Fermer les autres panneaux
      setClickedLigneDetailId(null);
      setClickedPartieId(null);
      setClickedSpecialLineId(null);
      setIsSousPartieIconsAnimatingOut(true);
      setTimeout(() => {
        setIsSousPartieIconsAnimatingOut(false);
      }, 10);
    }
  }, [clickedSousPartieId]);

  // Déclencher l'animation d'entrée pour les lignes spéciales (au clic)
  useEffect(() => {
    if (clickedSpecialLineId) {
      // Fermer les autres panneaux
      setClickedLigneDetailId(null);
      setClickedPartieId(null);
      setClickedSousPartieId(null);
      setIsSpecialLineIconsAnimatingOut(true);
      setTimeout(() => {
        setIsSpecialLineIconsAnimatingOut(false);
      }, 10);
    }
  }, [clickedSpecialLineId]);

  // Calculer le prix basé sur les coûts et la marge
  const calculatePrice = (ligne) => {
    // Si un prix_devis existe (prix personnalisé pour ce devis), l'utiliser
    if (ligne.prix_devis !== null && ligne.prix_devis !== undefined) {
      return parseFloat(ligne.prix_devis);
    }
    
    const cout_main_oeuvre = parseFloat(ligne.cout_main_oeuvre) || 0;
    const cout_materiel = parseFloat(ligne.cout_materiel) || 0;
    
    // Si pas de coûts, utiliser le prix de base (prix manuel ou prix du catalogue)
    if (cout_main_oeuvre === 0 && cout_materiel === 0) {
      return parseFloat(ligne.prix) || 0;
    }
    
    // Sinon, calculer avec les coûts
    const marge = ligne.marge_devis !== null && ligne.marge_devis !== undefined 
      ? parseFloat(ligne.marge_devis)
      : parseFloat(ligne.marge) || 0;
    
    const taux_fixe = parseFloat(ligne.taux_fixe) || 0;
    
    const base = cout_main_oeuvre + cout_materiel;
    const montant_taux_fixe = base * (taux_fixe / 100);
    const sous_total = base + montant_taux_fixe;
    const montant_marge = sous_total * (marge / 100);
    const prix = sous_total + montant_marge;
    
    return prix;
  };

  // Fonction pour gérer la fin du drag & drop
  const handleDragEnd = (result) => {
    // Réinitialiser le type de drag
    setDraggingType(null);
    
    if (!result.destination) {
      return;
    }
    
    // ✅ Utiliser le DevisIndexManager pour gérer tout le réordonnancement
    const reordered = DevisIndexManager.reorderAfterDrag(devisItems, result);
    
    // Mettre à jour via le handler unifié
    if (onDevisItemsReorder) {
      onDevisItemsReorder(reordered);
    }
    
    // Mettre à jour selectedParties pour la compatibilité
    if (result.source.droppableId === 'parties-global' && onPartiesReorder) {
      const parties = reordered.filter(i => i.type === 'partie').sort((a, b) => a.index_global - b.index_global);
      const newParties = parties.map(pItem => selectedParties.find(p => p.id === pItem.id)).filter(Boolean);
      onPartiesReorder(newParties);
    }
    
    if (result.source.droppableId.startsWith('sous-parties-') && onSousPartiesReorder) {
      const partieId = parseInt(result.source.droppableId.replace('sous-parties-', ''));
      onSousPartiesReorder(partieId, result);
    }
    
    // Note: L'ancien système de drag & drop des lignes spéciales a été remplacé par :
    // - PlacementZone : pour le placement initial (via handlePlaceLineAt)
    // - Bouton Déplacer : pour le déplacement (via handleMoveSpecialLine)
    
    // ✅ TODO 2.1: ANCIEN CODE SUPPRIMÉ (~150 lignes)
    // Ancien système : Drag & drop des lignes spéciales (depuis pending + déplacement)
    // Nouveau système : PlacementZone (cliquable) + bouton Déplacer (handleMoveSpecialLine)
    // Raison de suppression : Incompatible avec le système hiérarchique décimal
  };

  // État pour suivre le type d'élément en cours de drag
  const [draggingType, setDraggingType] = useState(null);
  
  // Fonction pour gérer le début du drag
  const handleDragStart = (start) => {
    // Déterminer le type d'élément en cours de drag
    if (start.draggableId.startsWith('partie_')) {
      setDraggingType('PARTIE');
    } else if (start.draggableId.startsWith('sp_')) {
      setDraggingType('SOUS_PARTIE');
    } else if (start.draggableId.startsWith('ligne_')) {
      setDraggingType('LIGNE_DETAIL');
    }
  };

  // Fonction pour gérer la mise à jour pendant le drag
  const handleDragUpdate = (update) => {
    // Drag update
  };


  // Fonction pour basculer l'attribution d'un numéro à une partie
  const handleToggleNumber = (partieId) => {
    const partie = selectedParties.find(p => p.id === partieId);
    if (!partie) return;

    if (partie.numero) {
      // Enlever le numéro
      if (onPartieNumeroChange) {
        onPartieNumeroChange(partieId, '');
      }
    } else {
      // Attribuer un numéro automatique : trouver le plus grand numéro existant + 1
      const partiesAvecNumero = selectedParties.filter(p => p.numero && /^\d+$/.test(p.numero));
      let nextNumber = 1;
      
      if (partiesAvecNumero.length > 0) {
        const maxNumber = Math.max(...partiesAvecNumero.map(p => parseInt(p.numero, 10)));
        nextNumber = maxNumber + 1;
      }
      
      if (onPartieNumeroChange) {
        onPartieNumeroChange(partieId, nextNumber.toString());
      }
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #ced4da',
      borderRadius: '6px',
      overflow: 'visible',
      minHeight: 'auto',
      position: 'relative',
      zIndex: 1
    }}>
      {/* Bannière d'aide pendant le drag */}
      {draggingType && (
        <div style={{
          position: 'sticky',
          top: 0,
          zIndex: 101,
          backgroundColor: draggingType === 'PARTIE' ? '#1976d2' : draggingType === 'SOUS_PARTIE' ? '#0288d1' : '#4caf50',
          color: 'white',
          padding: '12px 20px',
          textAlign: 'center',
          fontWeight: 'bold',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px'
        }}>
          {draggingType === 'PARTIE' && (
            <>
              <span>🔵</span>
              <span>Déplacement d'une PARTIE - Vous pouvez la déposer uniquement dans la zone globale (bleue)</span>
            </>
          )}
          {draggingType === 'SOUS_PARTIE' && (
            <>
              <span>🔷</span>
              <span>Déplacement d'une SOUS-PARTIE - Vous pouvez la déposer uniquement dans sa partie parent (bleu ciel)</span>
            </>
          )}
          {draggingType === 'LIGNE_DETAIL' && (
            <>
              <span>🟢</span>
              <span>Déplacement d'une LIGNE DÉTAIL - Vous pouvez la déposer uniquement dans sa sous-partie parent (verte)</span>
            </>
          )}
        </div>
      )}
      
      {/* Overlay sombre pour la sélection de base */}
      {isSelectingBase && (
        <>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 100,
            pointerEvents: 'none'
          }} />
          
          {/* Bannière d'instruction */}
          <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 101,
            backgroundColor: '#1976d2',
            color: 'white',
            padding: '15px 20px',
            textAlign: 'center',
            fontWeight: 'bold',
            fontSize: '16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px'
          }}>
            <span>📊 Cliquez sur le Montant HT total, une partie, sous-partie ou ligne pour définir la base de calcul du pourcentage</span>
            <button
              onClick={onCancelBaseSelection}
              style={{
                backgroundColor: '#d32f2f',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              Annuler
            </button>
          </div>
          
          {/* Ligne Montant HT total cliquable */}
          <div style={{
            position: 'sticky',
            top: '60px',
            zIndex: 102,
            margin: '10px',
            marginBottom: '20px'
          }}>
            <div 
              onClick={() => {
                const globalTotal = calculateGlobalTotal ? calculateGlobalTotal() : (total_ht || 0);
                onBaseSelected({
                  type: 'global',
                  id: null,
                  label: `Montant HT total (${formatMontantEspace(globalTotal)} €)`,
                  amount: globalTotal
                });
              }}
              style={{
                backgroundColor: '#28a745',
                color: 'white',
                padding: '15px 20px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                border: '3px solid #ffeb3b',
                transition: 'all 0.2s ease',
                transform: 'scale(1.02)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '24px' }}>💰</span>
                <span>Montant HT total</span>
              </div>
              <span style={{ fontSize: '18px', fontWeight: 'bold' }}>
                {formatMontantEspace(calculateGlobalTotal ? calculateGlobalTotal() : (total_ht || 0))} €
              </span>
            </div>
          </div>
        </>
      )}
      {/* En-tête du tableau */}
      <div style={{
        backgroundColor: '#1976d2',
        color: 'white',
        padding: '15px 20px',
        fontWeight: 'bold',
        fontSize: '16px'
      }}>
        Détail des prestations
      </div>

      {/* Nature des travaux */}
      <div style={{ overflowX: 'auto', overflowY: 'visible', marginBottom: '0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr style={{ backgroundColor: '#e3f2fd' }}>
              <td colSpan="5" style={{
                padding: '15px 20px',
                border: '1px solid #dee2e6',
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#1976d2'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>📋 Nature des travaux :</span>
                  <input
                    type="text"
                    value={devisData.nature_travaux}
                    onChange={(e) => {
                      if (onNatureTravauxChange) {
                        onNatureTravauxChange(e.target.value);
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      border: '1px solid #1976d2',
                      borderRadius: '4px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      backgroundColor: 'white'
                    }}
                    placeholder="Saisir la nature des travaux..."
                  />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      
      {/* Tableau principal - En-tête */}
      <div style={{ overflowX: 'auto', overflowY: 'visible' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{
                padding: '12px',
                textAlign: 'left',
                border: '1px solid #dee2e6',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#495057',
                width: '50%'
              }}>
                DÉSIGNATION
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'center',
                border: '1px solid #dee2e6',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#495057',
                width: '80px'
              }}>
                U
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'center',
                border: '1px solid #dee2e6',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#495057',
                width: '100px'
              }}>
                QUANTITÉ
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'center',
                border: '1px solid #dee2e6',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#495057',
                width: '120px'
              }}>
                PRIX UNITAIRE
              </th>
              <th style={{
                padding: '12px',
                textAlign: 'center',
                border: '1px solid #dee2e6',
                fontWeight: 'bold',
                fontSize: '14px',
                color: '#495057',
                width: '140px'
              }}>
                TOTAL HT
              </th>
            </tr>
          </thead>
        </table>
      </div>

      {/* Contenu du tableau */}
      <div style={{ overflowX: 'auto', overflowY: 'visible', position: 'relative' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {/* Barre de recherche initiale - Quand aucun élément */}
            {devisItems.length === 0 && (
              <tr style={{ backgroundColor: 'rgba(27, 120, 188, 1)', color: 'white' }}>
                <td colSpan="5" style={{
                  padding: '20px 20px 15px 20px',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  border: '1px solid rgba(27, 120, 188, 1)',
                  backgroundClip: 'content-box',
                  height: '20px',
                  lineHeight: '25px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                      <PartieSearch
                        selectedParties={selectedParties}
                        onPartieSelect={onPartieSelect}
                        onPartieCreate={onPartieCreate}
                        onPartieRemove={onPartieRemove}
                        searchParties={searchParties}
                        isLoadingParties={isLoadingParties}
                      />
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 'bold',
                      marginLeft: '20px',
                      minWidth: '120px',
                      textAlign: 'right'
                    }}>
                      0 €
                    </div>
                  </div>
                </td>
              </tr>
            )}

            {/* Indicateur : ligne en attente de placement */}
            {placementLine && (
              <tr>
                <td colSpan="5" style={{ padding: '0', border: 'none' }}>
                  <div style={{
                    backgroundColor: '#fff3cd',
                    border: '2px solid #ffc107',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    margin: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    fontWeight: 'bold',
                    color: '#856404'
                  }}>
                    <span style={{ fontSize: '24px' }}>📍</span>
                    <div>
                      <div style={{ fontSize: '16px' }}>
                        Ligne en attente : "{placementLine.data?.description || placementLine.description}"
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 'normal', marginTop: '4px' }}>
                        👆 Cliquez sur une <span style={{ 
                          backgroundColor: '#2196f3', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '4px',
                          fontWeight: 'bold'
                        }}>zone bleue</span> pour placer cette ligne
                      </div>
                    </div>
                    <button
                      onClick={onCancelPlacement}
                      style={{
                        marginLeft: 'auto',
                        backgroundColor: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontWeight: 'bold'
                      }}
                      title="Annuler"
                    >
                      ✕ Annuler
                    </button>
                  </div>
                </td>
              </tr>
            )}
            
            {devisItems.length > 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '0', border: 'none' }}>
                  <DragDropContext 
                    onDragEnd={handleDragEnd}
                    onDragStart={handleDragStart}
                    onDragUpdate={handleDragUpdate}
                  >
                    <Droppable droppableId="parties-global" type="PARTIE">
                      {(provided, snapshot) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          style={{
                            backgroundColor: snapshot.isDraggingOver ? 'rgba(27, 120, 188, 0.2)' : 'transparent',
                            padding: '2px 0',
                            minHeight: '50px',
                            border: snapshot.isDraggingOver ? '3px dashed #1976d2' : '3px dashed transparent',
                            borderRadius: '8px',
                            transition: 'all 0.2s ease'
                          }}
                        >
                          {/* Zone de placement au début (style partie) */}
                          <PlacementZone 
                            position="global_start" 
                            onPlaceLineAt={onPlaceLineAt} 
                            isActive={!!placementLine}
                            lineAwaitingPlacement={placementLine}
                            displayAs="partie"
                          />
                          
                          {/* Fusionner PARTIES ET lignes spéciales globales, trier par index_global */}
                          {(() => {
                            const items = devisItems
                              .filter(item => 
                                item.type === 'partie' ||
                                (item.type === 'ligne_speciale' && item.context_type === 'global')
                              )
                              .sort((a, b) => a.index_global - b.index_global);
                            
                            // Compter seulement les parties pour les index drag and drop
                            let partieIndex = 0;
                            
                            return items.map((item, itemIndex) => {
                              
                              // Si c'est une ligne spéciale globale (non draggable)
                              if (item.type === 'ligne_speciale') {
                                return (
                                  <React.Fragment key={`special_global_${item.id}`}>
                                    <div 
                                      style={{ marginBottom: '8px', position: 'relative', cursor: 'pointer' }}
                                      onClick={(e) => {
                                        // Ignorer les clics sur les inputs, textarea, boutons et icônes
                                        const tagName = e.target.tagName.toLowerCase();
                                        if (['input', 'textarea', 'button', 'svg', 'path'].includes(tagName)) {
                                          return;
                                        }
                                        
                                        // Toggle les boutons d'action
                                        if (clickedSpecialLineId === item.id) {
                                          setClickedSpecialLineId(null);
                                          setClickedSpecialLinePosition(null);
                                        } else {
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          setClickedSpecialLineId(item.id);
                                          setClickedSpecialLinePosition({
                                            top: rect.top + rect.height / 2 - 24,
                                            left: rect.right
                                          });
                                        }
                                      }}
                                    >
                                      <LigneSpecialeRow
                                        line={item}
                                        provided={null}
                                        snapshot={{ isDragging: false }}
                                        depth={0}
                                        formatMontantEspace={formatMontantEspace}
                                        displayAs="partie"  // Afficher comme une partie
                                        devisItems={devisItems}
                                        calculatePartieTotal={calculatePartieTotal}
                                        calculateSousPartieTotal={calculateSousPartieTotal}
                                        calculateGlobalTotal={calculateGlobalTotal}
                                        calculateGlobalTotalExcludingLine={calculateGlobalTotalExcludingLine}
                                        calculateRecurringLineAmount={calculateRecurringLineAmount}
                                      />
                                    </div>
                                    
                                    {/* Zone de placement après cette ligne spéciale */}
                                    <PlacementZone 
                                      position={`after_special_${item.id}`} 
                                      onPlaceLineAt={onPlaceLineAt} 
                                      isActive={!!placementLine}
                                      lineAwaitingPlacement={placementLine}
                                      displayAs="partie"
                                    />
                                  </React.Fragment>
                                );
                              }
                              
                              // Sinon, c'est une partie
                              const currentPartieIndex = partieIndex;
                              partieIndex++; // Incrémenter pour la prochaine partie
                              
                              return (
                                <React.Fragment key={`partie_wrapper_${item.id}`}>
                                {/* Zone de placement AVANT cette partie */}
                                <PlacementZone 
                                  position={`before_partie_${item.id}`} 
                                  onPlaceLineAt={onPlaceLineAt} 
                                  isActive={!!placementLine}
                                  lineAwaitingPlacement={placementLine}
                                  displayAs="partie"
                                />
                                
                                <Draggable
                                  key={`partie_${item.id}`}
                                  draggableId={`partie_${item.id}`}
                                  index={currentPartieIndex}
                                  type="PARTIE"
                                >
                                  {(dragProvided, dragSnapshot) => {
                                      // Vérifier si cette partie a des sous-parties
                                      const hasSousParties = item.selectedSousParties && item.selectedSousParties.length > 0;
                                      
                                      return (
                                        <div
                                          ref={dragProvided.innerRef}
                                          {...dragProvided.draggableProps}
                                          style={{
                                            ...dragProvided.draggableProps.style,
                                            marginBottom: '8px'
                                          }}
                                        >
                                          <div 
                                            style={{ 
                                              backgroundColor: 'rgba(27, 120, 188, 1)', 
                                              color: 'white',
                                              fontWeight: 'bold',
                                              padding: '15px 20px',
                                              fontSize: '16px',
                                              borderRadius: '4px',
                                              boxShadow: dragSnapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                                              cursor: isSelectingBase ? 'pointer' : (dragSnapshot.isDragging ? 'grabbing' : 'grab'),
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              opacity: dragSnapshot.isDragging ? 0.8 : 1,
                                              position: 'relative',
                                              zIndex: isSelectingBase ? 102 : 'auto',
                                              transform: isSelectingBase ? 'scale(1.02)' : 'scale(1)',
                                              transition: 'all 0.2s ease',
                                              border: isSelectingBase ? '3px solid #ffeb3b' : 'none'
                                            }}
                                            onClick={(e) => {
                                              // Mode sélection de base
                                              if (isSelectingBase) {
                                                e.stopPropagation();
                                                const partieTotal = calculatePartieTotal(item);
                                                const partieNumero = item.numero || '';
                                                const partieLibelle = item.libelle || item.name || item.designation || 'Partie';
                                                onBaseSelected({
                                                  type: 'partie',
                                                  id: item.id,
                                                  label: `${partieNumero} ${partieLibelle} (${formatMontantEspace(partieTotal)} €)`,
                                                  amount: partieTotal
                                                });
                                                return;
                                              }
                                              
                                              // Ignorer les clics sur les inputs, textarea, boutons et icônes
                                              const tagName = e.target.tagName.toLowerCase();
                                              if (['input', 'textarea', 'button', 'svg', 'path'].includes(tagName)) {
                                                return;
                                              }
                                              
                                              // Toggle les boutons d'action : si on clique sur la partie déjà cliquée, on ferme
                                              if (clickedPartieId === item.id) {
                                                setClickedPartieId(null);
                                                setClickedPartiePosition(null);
                                              } else {
                                                const rect = e.currentTarget.getBoundingClientRect();
                                                setClickedPartieId(item.id);
                                                setClickedPartiePosition({
                                                  top: rect.top + rect.height / 2 - 12,
                                                  left: rect.right
                                                });
                                              }
                                            }}
                                          >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                              <div {...dragProvided.dragHandleProps} style={{ cursor: 'grab', padding: '8px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.2)', minWidth: '32px', height: '32px' }}>
                                                ⋮⋮
                                              </div>
                                              
                                              {/* Bouton de numérotation */}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleToggleNumber(item.id);
                                                }}
                                                style={{
                                                  width: '50px',
                                                  height: '32px',
                                                  padding: '4px 6px',
                                                  border: '1px solid rgba(255,255,255,0.3)',
                                                  borderRadius: '4px',
                                                  backgroundColor: item.numero ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                                                  color: 'white',
                                                  fontSize: '14px',
                                                  fontWeight: 'bold',
                                                  textAlign: 'center',
                                                  cursor: 'pointer',
                                                  transition: 'all 0.2s ease',
                                                  display: 'flex',
                                                  alignItems: 'center',
                                                  justifyContent: 'center'
                                                }}
                                                title={item.numero ? "Cliquer pour enlever le numéro" : "Cliquer pour attribuer un numéro"}
                                              >
                                                {item.numero || 'N°'}
                                              </button>
                                              
                                              <span>{item.titre}</span>
                                            </div>
                                            <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                                              {formatMontantEspace(
                                                calculatePartieTotal ? calculatePartieTotal(item) : 
                                                (item.selectedSousParties || []).reduce((total, sp) => 
                                                  total + (sp.selectedLignesDetails || []).reduce((spSum, ld) => 
                                                    spSum + (calculatePrice(ld) * parseFloat(ld.quantity || 0)), 0
                                                  ), 0
                                                )
                                              )} €
                                            </span>
                                          </div>
                                          
                                          {/* ZONE DES SOUS-PARTIES - Droppable hiérarchique */}
                                          <div style={{ 
                                            backgroundColor: '#f8f9fa',
                                            padding: '12px 20px',
                                            border: '1px solid #dee2e6',
                                            borderTop: 'none',
                                            borderRadius: '0 0 4px 4px',
                                            marginTop: '-4px'
                                          }}>
                                            <Droppable droppableId={`sous-parties-${item.id}`} type="SOUS_PARTIE">
                                              {(spProvided, spSnapshot) => (
                                                <div
                                                  {...spProvided.droppableProps}
                                                  ref={spProvided.innerRef}
                                                  style={{
                                                    backgroundColor: spSnapshot.isDraggingOver ? 'rgba(157, 197, 226, 0.3)' : 'transparent',
                                                    minHeight: '30px',
                                                    padding: '4px 0',
                                                    border: spSnapshot.isDraggingOver ? '2px dashed #1976d2' : '2px dashed transparent',
                                                    borderRadius: '6px',
                                                    transition: 'all 0.2s ease'
                                                  }}
                                                >
                                                  {/* Fusionner sous-parties ET lignes spéciales de cette partie */}
                                                  {(() => {
                                                    const spItems = devisItems
                                                      .filter(spItem => 
                                                        (spItem.type === 'sous_partie' && spItem.partie_id === item.id) ||
                                                        (spItem.type === 'ligne_speciale' && spItem.context_type === 'partie' && spItem.context_id === item.id)
                                                      )
                                                      .sort((a, b) => a.index_global - b.index_global);
                                                    
                                                    
                                                    
                                                    // Compter seulement les sous-parties pour les index drag and drop
                                                    let sousPartieIndex = 0;
                                                    
                                                    return spItems.map((spItem, spIndex) => {
                                                      
                                                      // Si c'est une ligne spéciale (non draggable)
                                                      if (spItem.type === 'ligne_speciale') {
                                                        return (
                                                          <div 
                                                            key={`special_partie_${spItem.id}`} 
                                                            style={{ marginBottom: '8px', position: 'relative', cursor: 'pointer' }}
                                                            onClick={(e) => {
                                                              // Ignorer les clics sur les inputs, textarea, boutons et icônes
                                                              const tagName = e.target.tagName.toLowerCase();
                                                              if (['input', 'textarea', 'button', 'svg', 'path'].includes(tagName)) {
                                                                return;
                                                              }
                                                              
                                                              // Toggle les boutons d'action
                                                              if (clickedSpecialLineId === spItem.id) {
                                                                setClickedSpecialLineId(null);
                                                                setClickedSpecialLinePosition(null);
                                                              } else {
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setClickedSpecialLineId(spItem.id);
                                                                setClickedSpecialLinePosition({
                                                                  top: rect.top + rect.height / 2 - 24,
                                                                  left: rect.right
                                                                });
                                                              }
                                                            }}
                                                          >
                                                            <LigneSpecialeRow
                                                              line={spItem}
                                                              provided={null}
                                                              snapshot={{ isDragging: false }}
                                                              depth={0}
                                                              formatMontantEspace={formatMontantEspace}
                                                              displayAs="sous_partie"  // Afficher comme une sous-partie
                                                              devisItems={devisItems}
                                                              calculatePartieTotal={calculatePartieTotal}
                                                              calculateSousPartieTotal={calculateSousPartieTotal}
                                                              calculateGlobalTotal={calculateGlobalTotal}
                                                              calculateGlobalTotalExcludingLine={calculateGlobalTotalExcludingLine}
                                                            calculateRecurringLineAmount={calculateRecurringLineAmount}
                                                            />
                                                          </div>
                                                        );
                                                      }
                                                      
                                                      // Sinon, c'est une sous-partie
                                                      const sp = spItem;
                                                      const currentSousPartieIndex = sousPartieIndex;
                                                      sousPartieIndex++; // Incrémenter pour la prochaine sous-partie
                                                      
                                                      // ✅ Vérifier si c'est une "Lignes directes" (affichage simplifié sans en-tête)
                                                      const isDirectLines = sp.description === "Lignes directes";
                                                      
                                                      return (
                                                      <React.Fragment key={`sp_wrapper_${sp.id}`}>
                                                      {/* Zone de placement AVANT cette sous-partie */}
                                    <PlacementZone 
                                      position={`before_sp_${sp.id}`} 
                                      onPlaceLineAt={onPlaceLineAt} 
                                      isActive={!!placementLine}
                                      lineAwaitingPlacement={placementLine}
                                      displayAs="sous_partie"
                                    />
                                                      
                                                      <Draggable 
                                                        key={`sp_${sp.id}`} 
                                                        draggableId={`sp_${sp.id}`} 
                                                        index={currentSousPartieIndex}
                                                        type="SOUS_PARTIE"
                                                      >
                                                        {(spDragProvided, spDragSnapshot) => (
                                                          <div
                                                            ref={spDragProvided.innerRef}
                                                            {...spDragProvided.draggableProps}
                                                            style={{
                                                              ...spDragProvided.draggableProps.style,
                                                              marginBottom: '12px'
                                                            }}
                                                          >
                                                            {/* EN-TÊTE DE LA SOUS-PARTIE - Masqué pour "Lignes directes" */}
                                                            {!isDirectLines && (
                                                            <div 
                                                              style={{ 
                                                                backgroundColor: 'rgb(157, 197, 226)',
                                                                color: '#333',
                                                                padding: '10px 15px',
                                                                borderRadius: '4px 4px 0 0',
                                                                boxShadow: spDragSnapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                                                                display: 'flex',
                                                                justifyContent: 'space-between',
                                                                alignItems: 'center',
                                                                fontWeight: '600',
                                                                position: 'relative',
                                                                cursor: isSelectingBase ? 'pointer' : 'auto',
                                                                zIndex: isSelectingBase ? 102 : 'auto',
                                                                transform: isSelectingBase ? 'scale(1.02)' : 'scale(1)',
                                                                transition: 'all 0.2s ease',
                                                                border: isSelectingBase ? '3px solid #ffeb3b' : 'none'
                                                              }}
                                                              onClick={(e) => {
                                                                // Mode sélection de base
                                                                if (isSelectingBase) {
                                                                  e.stopPropagation();
                                                                  const spTotal = calculateSousPartieTotal(sp);
                                                                  const spNumero = sp.numero || '';
                                                                  const spLibelle = sp.libelle || sp.name || sp.designation || 'Sous-partie';
                                                                  onBaseSelected({
                                                                    type: 'sous_partie',
                                                                    id: sp.id,
                                                                    label: `${spNumero} ${spLibelle} (${formatMontantEspace(spTotal)} €)`,
                                                                    amount: spTotal
                                                                  });
                                                                  return;
                                                                }
                                                                
                                                                // Ignorer les clics sur les inputs, textarea, boutons et icônes
                                                                const tagName = e.target.tagName.toLowerCase();
                                                                if (['input', 'textarea', 'button', 'svg', 'path'].includes(tagName)) {
                                                                  return;
                                                                }
                                                                
                                                                // Toggle les boutons d'action
                                                                if (clickedSousPartieId === sp.id) {
                                                                  setClickedSousPartieId(null);
                                                                  setClickedSousPartiePosition(null);
                                                                } else {
                                                                  const rect = e.currentTarget.getBoundingClientRect();
                                                                  setClickedSousPartieId(sp.id);
                                                                  setClickedSousPartiePosition({
                                                                    top: rect.top + rect.height / 2 - 12,
                                                                    left: rect.right
                                                                  });
                                                                }
                                                              }}
                                                            >
                                                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                                <div {...spDragProvided.dragHandleProps} style={{ cursor: 'grab', padding: '4px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                                                                  ⋮⋮
                                                                </div>
                                                                
                                                                {/* Bouton de numérotation pour sous-partie */}
                                                                <button
                                                                  onClick={(e) => { 
                                                                    e.stopPropagation();
                                                                    if (onSousPartieNumeroChange) {
                                                                      const currentNumero = sp.numero;
                                                                      if (currentNumero) {
                                                                        onSousPartieNumeroChange(item.id, sp.id, '');
                                                                      } else {
                                                                        // Attribuer le prochain numéro automatique
                                                                        const parentNumero = item.numero;
                                                                        const isParentNumeric = parentNumero && /^\d+$/.test(parentNumero);

                                                                        if (isParentNumeric) {
                                                                          const regex = new RegExp('^' + parentNumero + '\\.(\\d+)$');
                                                                          const withPrefix = (item.selectedSousParties || []).filter(s => s.numero && regex.test(s.numero));
                                                                          let nextIndex = 1;
                                                                          if (withPrefix.length > 0) {
                                                                            const maxIdx = Math.max(...withPrefix.map(s => {
                                                                              const m = s.numero.match(regex);
                                                                              return m ? parseInt(m[1], 10) : 0;
                                                                            }));
                                                                            nextIndex = maxIdx + 1;
                                                                          }
                                                                          onSousPartieNumeroChange(item.id, sp.id, `${parentNumero}.${nextIndex}`);
                                                                        } else {
                                                                          // Sans préfixe parent
                                                                          const simples = (item.selectedSousParties || []).filter(s => s.numero && /^\d+$/.test(s.numero));
                                                                          let nextSimple = 1;
                                                                          if (simples.length > 0) {
                                                                            const maxSimple = Math.max(...simples.map(s => parseInt(s.numero, 10)));
                                                                            nextSimple = maxSimple + 1;
                                                                          }
                                                                          onSousPartieNumeroChange(item.id, sp.id, String(nextSimple));
                                                                        }
                                                                      }
                                                                    }
                                                                  }}
                                                                  style={{
                                                                    width: '40px',
                                                                    height: '28px',
                                                                    padding: '2px 4px',
                                                                    border: '1px solid rgba(0,0,0,0.2)',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: sp.numero ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                                                                    color: '#333',
                                                                    fontSize: '12px',
                                                                    fontWeight: 'bold',
                                                                    cursor: 'pointer'
                                                                  }}
                                                                >
                                                                  {sp.numero || 'N°'}
                                                                </button>
                                                                
                                                                <span>{sp.description}</span>
                                                              </div>
                                                              <span>
                                                                {formatMontantEspace(
                                                                  calculateSousPartieTotal ? calculateSousPartieTotal(sp) :
                                                                  (sp.selectedLignesDetails || []).reduce((sum, ld) => 
                                                                    sum + (calculatePrice(ld) * parseFloat(ld.quantity || 0)), 0
                                                                  )
                                                                )} €
                                                              </span>
                                                            </div>
                                                            )}
                                                            
                                                            {/* ZONE DES LIGNES DÉTAILS */}
                                                            <div style={{ 
                                                              backgroundColor: '#fff',
                                                              padding: isDirectLines ? '36px 12px 8px 12px' : '8px 12px',
                                                              border: '1px solid #dee2e6',
                                                              borderTop: isDirectLines ? '1px solid #dee2e6' : 'none',
                                                              borderRadius: isDirectLines ? '4px' : '0 0 4px 4px',
                                                              position: 'relative'
                                                            }}>
                                                              {/* ✅ Bouton de suppression discret pour "Lignes directes" */}
                                                              {isDirectLines && onSousPartieRemove && (
                                                                <button
                                                                  onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (window.confirm(`Voulez-vous vraiment supprimer "${DIRECT_LINES_DESCRIPTION}" et toutes ses lignes ?`)) {
                                                                      onSousPartieRemove(item.id, sp.id);
                                                                    }
                                                                  }}
                                                                  style={{
                                                                    position: 'absolute',
                                                                    top: '8px',
                                                                    left: '8px',
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    padding: '0',
                                                                    border: 'none',
                                                                    borderRadius: '4px',
                                                                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                                                    color: '#f44336',
                                                                    cursor: 'pointer',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center',
                                                                    fontSize: '14px',
                                                                    transition: 'all 0.2s ease',
                                                                    zIndex: 10
                                                                  }}
                                                                  onMouseEnter={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'rgba(244, 67, 54, 0.2)';
                                                                    e.currentTarget.style.transform = 'scale(1.1)';
                                                                  }}
                                                                  onMouseLeave={(e) => {
                                                                    e.currentTarget.style.backgroundColor = 'rgba(244, 67, 54, 0.1)';
                                                                    e.currentTarget.style.transform = 'scale(1)';
                                                                  }}
                                                                  title="Supprimer les lignes directes"
                                                                >
                                                                  <FiX />
                                                                </button>
                                                              )}
                                                              
                                                              <Droppable droppableId={`lignes-${sp.id}`} type="LIGNE_DETAIL">
                                                                {(ldProvided, ldSnapshot) => (
                                                                  <div
                                                                    {...ldProvided.droppableProps}
                                                                    ref={ldProvided.innerRef}
                                                                    style={{
                                                                      backgroundColor: ldSnapshot.isDraggingOver ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                                                                      minHeight: '30px',
                                                                      padding: '4px 0',
                                                                      border: ldSnapshot.isDraggingOver ? '2px dashed #4caf50' : '2px dashed transparent',
                                                                      borderRadius: '4px',
                                                                      transition: 'all 0.2s ease'
                                                                    }}
                                                                  >
                                                                    {/* Fusionner lignes détails ET lignes spéciales, trier par index_global */}
                                                                    {(() => {
                                                                      const ldItems = devisItems
                                                                        .filter(item => 
                                                                          (item.type === 'ligne_detail' && item.sous_partie_id === sp.id) ||
                                                                          (item.type === 'ligne_speciale' && item.context_type === 'sous_partie' && item.context_id === sp.id)
                                                                        )
                                                                        .sort((a, b) => a.index_global - b.index_global);
                                                                      
                                                                      // Compter seulement les lignes détails pour les index drag and drop
                                                                      let ligneDetailIndex = 0;
                                                                      
                                                                      return ldItems.map((item, itemIndex) => {
                                                                        
                                                                        // Si c'est une ligne spéciale (non draggable)
                                                                        if (item.type === 'ligne_speciale') {
                                                                          return (
                                                                            <div 
                                                                              key={`special_sp_${item.id}`} 
                                                                              style={{ marginBottom: '4px', position: 'relative', cursor: 'pointer' }}
                                                                              onClick={(e) => {
                                                                                // Ignorer les clics sur les inputs, textarea, boutons et icônes
                                                                                const tagName = e.target.tagName.toLowerCase();
                                                                                if (['input', 'textarea', 'button', 'svg', 'path'].includes(tagName)) {
                                                                                  return;
                                                                                }
                                                                                
                                                                                // Toggle les boutons d'action
                                                                                if (clickedSpecialLineId === item.id) {
                                                                                  setClickedSpecialLineId(null);
                                                                                  setClickedSpecialLinePosition(null);
                                                                                } else {
                                                                                  const rect = e.currentTarget.getBoundingClientRect();
                                                                                  setClickedSpecialLineId(item.id);
                                                                                  setClickedSpecialLinePosition({
                                                                                    top: rect.top + rect.height / 2 - 24,
                                                                                    left: rect.right
                                                                                  });
                                                                                }
                                                                              }}
                                                                            >
                                                                              <LigneSpecialeRow
                                                                                line={item}
                                                                                provided={null}
                                                                                snapshot={{ isDragging: false }}
                                                                                depth={0}
                                                                                formatMontantEspace={formatMontantEspace}
                                                                                displayAs="ligne_detail"  // Afficher comme une ligne de détail
                                                                                devisItems={devisItems}
                                                                                calculatePartieTotal={calculatePartieTotal}
                                                                                calculateSousPartieTotal={calculateSousPartieTotal}
                                                                                calculateGlobalTotal={calculateGlobalTotal}
                                                                                calculateGlobalTotalExcludingLine={calculateGlobalTotalExcludingLine}
                                                                                calculateRecurringLineAmount={calculateRecurringLineAmount}
                                                                              />
                                                                            </div>
                                                                          );
                                                                        }
                                                                        
                                                                        // Sinon, c'est une ligne détail
                                                                        const ligne = item;
                                                                        const prix = calculatePrice(ligne);
                                                                        const total = prix * (ligne.quantity || 0);
                                                                        const currentLigneDetailIndex = ligneDetailIndex;
                                                                        ligneDetailIndex++; // Incrémenter pour la prochaine ligne
                                                                        
                                                                        return (
                                                                          <React.Fragment key={`ligne_wrapper_${ligne.id}`}>
                                                                          {/* Zone de placement AVANT cette ligne */}
                                                      <PlacementZone 
                                                        position={`before_ligne_${ligne.id}`} 
                                                        onPlaceLineAt={onPlaceLineAt} 
                                                        isActive={!!placementLine}
                                                        lineAwaitingPlacement={placementLine}
                                                        displayAs="ligne_detail"
                                                      />
                                                                          
                                                                          <Draggable 
                                                                            key={`ligne_${ligne.id}`} 
                                                                            draggableId={`ligne_${ligne.id}`} 
                                                                            index={currentLigneDetailIndex}
                                                                            type="LIGNE_DETAIL"
                                                                          >
                                                                            {(ldDragProvided, ldDragSnapshot) => (
                                                                              <div
                                                                                ref={ldDragProvided.innerRef}
                                                                                {...ldDragProvided.draggableProps}
                                                                                style={{
                                                                                  ...ldDragProvided.draggableProps.style,
                                                                                  marginBottom: '4px'
                                                                                }}
                                                                              >
                                                                                <div 
                                                                                  style={{ 
                                                                                    backgroundColor: hoveredLigneDetail && hoveredLigneDetail.id === ligne.id ? '#e3f2fd' : '#fff',
                                                                                    border: hoveredLigneDetail && hoveredLigneDetail.id === ligne.id ? '2px solid #1976d2' : '1px solid #dee2e6',
                                                                                    borderRadius: '4px',
                                                                                    padding: '6px 10px',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'space-between',
                                                                                    fontSize: '13px',
                                                                                    position: 'relative',
                                                                                    paddingRight: '58px',
                                                                                    cursor: 'pointer',
                                                                                    transition: 'all 0.2s ease'
                                                                                  }}
                                                                                  onClick={(e) => {
                                                                                    // Ignorer les clics sur les inputs, textarea, boutons et icônes
                                                                                    const tagName = e.target.tagName.toLowerCase();
                                                                                    if (['input', 'textarea', 'button', 'svg', 'path'].includes(tagName)) {
                                                                                      return;
                                                                                    }
                                                                                    
                                                                                    // Toggle PieChart : si on clique sur la ligne déjà sélectionnée, on la désélectionne
                                                                                    if (onLigneDetailHover) {
                                                                                      if (hoveredLigneDetail && hoveredLigneDetail.id === ligne.id) {
                                                                                        onLigneDetailHover(null);
                                                                                      } else {
                                                                                        onLigneDetailHover(ligne);
                                                                                      }
                                                                                    }
                                                                                    
                                                                                    // Toggle boutons d'action
                                                                                    if (clickedLigneDetailId === ligne.id) {
                                                                                      setClickedLigneDetailId(null);
                                                                                      setClickedLignePosition(null);
                                                                                    } else {
                                                                                      const rect = e.currentTarget.getBoundingClientRect();
                                                                                      setClickedLigneDetailId(ligne.id);
                                                                                      setClickedLignePosition({
                                                                                        top: rect.top + rect.height / 2 - 24,
                                                                                        left: rect.right
                                                                                      });
                                                                                    }
                                                                                  }}
                                                                                >
                                                                                  <div {...ldDragProvided.dragHandleProps} style={{ cursor: 'grab', marginRight: '8px' }}>⋮</div>
                                                                                  {/* DÉSIGNATION */}
                                                                                  <div style={{ flex: '0 0 50%', whiteSpace: 'pre-line' }}>{ligne.description}</div>
                                                                                  {/* U */}
                                                                                  <div style={{ flex: '0 0 80px', textAlign: 'center' }}>{ligne.unite}</div>
                                                                                  {/* QUANTITÉ */}
                                                                                  <div style={{ flex: '0 0 100px', textAlign: 'center' }}>
                                                                                    <input
                                                                                      type="number"
                                                                                      min="0"
                                                                                      step="0.01"
                                                                                      value={ligne.quantity || 0}
                                                                                      onChange={(e) => {
                                                                                        if (onLigneDetailQuantityChange) {
                                                                                          // Trouver la partie_id depuis la sous-partie
                                                                                          const sp = devisItems.find(item => item.type === 'sous_partie' && item.id === ligne.sous_partie_id);
                                                                                          const partieId = sp?.partie_id;
                                                                                          onLigneDetailQuantityChange(partieId, ligne.sous_partie_id, ligne.id, parseFloat(e.target.value) || 0);
                                                                                        }
                                                                                      }}
                                                                                      style={{
                                                                                        width: '100%',
                                                                                        border: '1px solid #dee2e6',
                                                                                        borderRadius: '4px',
                                                                                        padding: '2px 4px',
                                                                                        fontSize: '13px',
                                                                                        textAlign: 'center'
                                                                                      }}
                                                                                    />
                                                                                  </div>
                                                                                  {/* PRIX UNITAIRE */}
                                                                                  <div style={{ flex: '0 0 120px', textAlign: 'center' }}>
                                                                                    <input
                                                                                      type="text"
                                                                                      inputMode="decimal"
                                                                                      value={editingPrices[ligne.id] !== undefined 
                                                                                        ? editingPrices[ligne.id] 
                                                                                        : (ligne.prix_devis !== null && ligne.prix_devis !== undefined ? ligne.prix_devis : prix)}
                                                                                      onChange={(e) => {
                                                                                        if (onLigneDetailPriceChange) {
                                                                                          // Trouver la partie_id depuis la sous-partie
                                                                                          const sp = devisItems.find(item => item.type === 'sous_partie' && item.id === ligne.sous_partie_id);
                                                                                          const partieId = sp?.partie_id;
                                                                                          const value = e.target.value;
                                                                                          // Valider le format : autoriser les nombres négatifs, décimaux, et le signe moins seul
                                                                                          if (value === '' || value === '-' || /^-?\d*\.?\d*$/.test(value)) {
                                                                                            // Stocker la valeur en cours de saisie
                                                                                            setEditingPrices(prev => ({ ...prev, [ligne.id]: value }));
                                                                                            
                                                                                            // Si c'est un nombre valide (pas juste "-" ou vide), mettre à jour
                                                                                            if (value !== '' && value !== '-') {
                                                                                              const parsedValue = parseFloat(value);
                                                                                              if (!isNaN(parsedValue)) {
                                                                                                onLigneDetailPriceChange(partieId, ligne.sous_partie_id, ligne.id, parsedValue);
                                                                                              }
                                                                                            }
                                                                                          }
                                                                                        }
                                                                                      }}
                                                                                      onBlur={(e) => {
                                                                                        const value = e.target.value;
                                                                                        // Si le champ est vide ou juste "-" au blur, remettre la valeur précédente
                                                                                        if (value === '' || value === '-') {
                                                                                          // Retirer de l'état d'édition
                                                                                          setEditingPrices(prev => {
                                                                                            const newState = { ...prev };
                                                                                            delete newState[ligne.id];
                                                                                            return newState;
                                                                                          });
                                                                                        } else {
                                                                                          // Valider et mettre à jour si valide
                                                                                          const parsedValue = parseFloat(value);
                                                                                          if (!isNaN(parsedValue) && onLigneDetailPriceChange) {
                                                                                            const sp = devisItems.find(item => item.type === 'sous_partie' && item.id === ligne.sous_partie_id);
                                                                                            const partieId = sp?.partie_id;
                                                                                            onLigneDetailPriceChange(partieId, ligne.sous_partie_id, ligne.id, parsedValue);
                                                                                          }
                                                                                          // Retirer de l'état d'édition après validation
                                                                                          setEditingPrices(prev => {
                                                                                            const newState = { ...prev };
                                                                                            delete newState[ligne.id];
                                                                                            return newState;
                                                                                          });
                                                                                        }
                                                                                      }}
                                                                                      onFocus={(e) => {
                                                                                        // Au focus, initialiser la valeur d'édition si nécessaire
                                                                                        const currentValue = ligne.prix_devis !== null && ligne.prix_devis !== undefined ? ligne.prix_devis : prix;
                                                                                        if (editingPrices[ligne.id] === undefined) {
                                                                                          setEditingPrices(prev => ({ ...prev, [ligne.id]: currentValue }));
                                                                                        }
                                                                                      }}
                                                                                      style={{
                                                                                        width: '100%',
                                                                                        border: '1px solid #dee2e6',
                                                                                        borderRadius: '4px',
                                                                                        padding: '2px 4px',
                                                                                        fontSize: '13px',
                                                                                        textAlign: 'center',
                                                                                        backgroundColor: 'transparent'
                                                                                      }}
                                                                                    />
                                                                                  </div>
                                                                                  {/* TOTAL HT */}
                                                                                  <div style={{ flex: '0 0 140px', textAlign: 'right', fontWeight: 600 }}>{formatMontantEspace(total)} €</div>
                                                                                </div>
                                                                              </div>
                                                                            )}
                                                                          </Draggable>
                                                                          
                                                                          {/* Zone de placement APRÈS cette ligne */}
                                                                          <PlacementZone 
                                                                            position={`after_ligne_${ligne.id}`} 
                                                                            onPlaceLineAt={onPlaceLineAt} 
                                                                            isActive={!!placementLine}
                                                                            lineAwaitingPlacement={placementLine}
                                                                            displayAs="ligne_detail"
                                                                          />
                                                                          </React.Fragment>
                                                                        );
                                                                      });
                                                                    })()}
                                                                    
                                                                    {ldProvided.placeholder}
                                                                  </div>
                                                                )}
                                                              </Droppable>
                                                              
                                                              {/* Barre de recherche ligne détail */}
                                                              <div style={{ marginTop: '8px' }}>
                                                                <LigneDetailSearch
                                                                  sousPartieId={sp.id}
                                                                  partieId={item.id}
                                                                  selectedLignesDetails={sp.selectedLignesDetails || []}
                                                                  onLigneDetailSelect={(ligne) => onLigneDetailSelect && onLigneDetailSelect(item.id, sp.id, ligne)}
                                                                  onLigneDetailCreate={(spId, description) => onLigneDetailCreate && onLigneDetailCreate(spId, description)}
                                                                  mainDevisItems={isOptionsTable ? mainDevisItems : []}
                                                                />
                                                              </div>
                                                            </div>
                                                          </div>
                                                        )}
                                                      </Draggable>
                                                      
                                                      {/* Zone de placement APRÈS cette sous-partie */}
                                                      <PlacementZone 
                                                        position={`after_sp_${sp.id}`} 
                                                        onPlaceLineAt={onPlaceLineAt} 
                                                        isActive={!!placementLine}
                                                        lineAwaitingPlacement={placementLine}
                                                        displayAs="sous_partie"
                                                      />
                                                      </React.Fragment>
                                                    );
                                                    });
                                                  })()}
                                                  
                                                  {spProvided.placeholder}
                                                </div>
                                              )}
                                            </Droppable>
                                            
                                            {/* Barre de recherche sous-partie */}
                                            <div style={{ marginTop: '12px' }}>
                                              <SousPartieSearch
                                                partieId={item.id}
                                                selectedSousParties={item.selectedSousParties || []}
                                                onSousPartieSelect={(sousPartie) => onSousPartieSelect && onSousPartieSelect(item.id, sousPartie)}
                                                onSousPartieCreate={(partieId, description) => onSousPartieCreate && onSousPartieCreate(partieId, description)}
                                              />
                                            </div>
                                          </div>
                                        </div>
                                      );
                                  }}
                                </Draggable>
                                
                                {/* Zone de placement après cette partie */}
                                <PlacementZone 
                                  position={`after_partie_${item.id}`} 
                                  onPlaceLineAt={onPlaceLineAt} 
                                  isActive={!!placementLine}
                                  lineAwaitingPlacement={placementLine}
                                  displayAs="partie"
                                />
                                </React.Fragment>
                              );
                            });
                          })()}
                          
                          {/* Zone de placement à la fin */}
                          <PlacementZone 
                            position="global_end" 
                            onPlaceLineAt={onPlaceLineAt} 
                            isActive={!!placementLine}
                            lineAwaitingPlacement={placementLine}
                            displayAs="partie"
                          />

                          {/* Placeholder translucide (dernière position) */}
                          {hasPendingRecurringLine && (
                            <div
                              onClick={handleRecurringBannerClick}
                              style={{
                                margin: '10px 10px 0 10px',
                                padding: '18px 24px',
                                borderRadius: '8px',
                                border: '2px dashed rgba(255,56,56,0.4)',
                                backgroundColor: 'rgba(251,255,36,0.35)',
                                color: '#ff3838',
                                fontWeight: 'bold',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backdropFilter: 'blur(2px)',
                                transition: 'transform 0.2s ease, box-shadow 0.2s ease'
                              }}
                              onMouseEnter={e => {
                                e.currentTarget.style.transform = 'scale(1.01)';
                                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                              }}
                              onMouseLeave={e => {
                                e.currentTarget.style.transform = 'scale(1)';
                                e.currentTarget.style.boxShadow = 'none';
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '16px' }}>
                                  {pendingRecurringLine.data?.description || pendingRecurringLine.description}
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 'normal', opacity: 0.8 }}>
                                  Cliquez pour l’insérer automatiquement à la suite du devis
                                </div>
                              </div>
                              <div style={{ fontSize: '18px' }}>
                                {formatMontantEspace(pendingRecurringAmount)} €
                              </div>
                            </div>
                          )}
                          
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                    
                    
                    {devisItems.some(item => item.type === 'partie') && (
                      <div style={{ 
                        backgroundColor: 'rgba(27, 120, 188, 1)', 
                        color: 'white',
                        padding: '20px',
                        marginTop: '10px',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <div style={{ flex: 1 }}>
                          <PartieSearch
                            selectedParties={selectedParties}
                            onPartieSelect={onPartieSelect}
                            onPartieCreate={onPartieCreate}
                            onPartieRemove={onPartieRemove}
                            searchParties={searchParties}
                            isLoadingParties={isLoadingParties}
                          />
                        </div>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          marginLeft: '20px',
                          minWidth: '120px',
                          textAlign: 'right'
                        }}>
                          {formatMontantEspace(selectedParties.reduce((total, partie) => total + (partie.total_partie || 0), 0))} €
                        </div>
                      </div>
                    )}
                    
                    
                  </DragDropContext>
                  
                  {/* Portails pour les icônes hover - Rendu Unifié */}
                  
                  {/* Portails Parties */}
                  {devisItems
                    .filter(item => item.type === 'partie')
                    .map(partie => (
                      clickedPartieId === partie.id && createPortal(
                        <div style={{
                          position: 'fixed',
                          top: `${clickedPartiePosition?.top || 0}px`,
                          left: `${(clickedPartiePosition?.left || 0) + 30}px`,
                          transform: `translateY(0) translateX(${isPartieIconsAnimatingOut ? '-100%' : '0'})`,
                          display: 'flex',
                          gap: '4px',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                          padding: '4px',
                          zIndex: 99999,
                          border: '1px solid #e0e0e0',
                          transition: 'transform 0.3s ease, opacity 0.3s ease',
                          opacity: isPartieIconsAnimatingOut ? 0 : 1
                        }}>
                          {isOptionsTable && onTransferToMain && (
                            <Tooltip title="Transférer vers le tableau principal">
                              <IconButton size="small" onClick={() => onTransferToMain(partie)} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(76, 175, 80, 0.8)', color: 'white' }}>
                                <span style={{ fontSize: '14px' }}>→</span>
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Éditer">
                            <IconButton size="small" onClick={() => onPartieEdit && onPartieEdit(partie.id)} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(33, 150, 243, 0.8)', color: 'white' }}>
                              <EditIcon fontSize="small" style={{ fontSize: '14px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton size="small" onClick={() => onPartieRemove && onPartieRemove(partie.id)} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(244, 67, 54, 0.8)', color: 'white' }}>
                              <FiX />
                            </IconButton>
                          </Tooltip>
                        </div>,
                        document.body
                      )
                    ))}
                  
                  {/* Portails Sous-Parties */}
                  {devisItems
                    .filter(item => item.type === 'sous_partie')
                    .map(sp => (
                      clickedSousPartieId === sp.id && createPortal(
                        <div style={{
                          position: 'fixed',
                          top: `${clickedSousPartiePosition?.top || 0}px`,
                          left: `${(clickedSousPartiePosition?.left || 0) + 30}px`,
                          transform: `translateY(0) translateX(${isSousPartieIconsAnimatingOut ? '-100%' : '0'})`,
                          display: 'flex',
                          gap: '4px',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                          padding: '4px',
                          zIndex: 99999,
                          border: '1px solid #e0e0e0',
                          transition: 'transform 0.3s ease, opacity 0.3s ease',
                          opacity: isSousPartieIconsAnimatingOut ? 0 : 1
                        }}>
                          {isOptionsTable && onTransferToMain && (
                            <Tooltip title="Transférer vers le tableau principal">
                              <IconButton size="small" onClick={() => onTransferToMain(sp)} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(76, 175, 80, 0.8)', color: 'white' }}>
                                <span style={{ fontSize: '14px' }}>→</span>
                              </IconButton>
                            </Tooltip>
                          )}
                          <Tooltip title="Éditer">
                            <IconButton size="small" onClick={() => onSousPartieEdit && onSousPartieEdit(sp.partie_id, sp.id)} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(33, 150, 243, 0.8)', color: 'white' }}>
                              <EditIcon fontSize="small" style={{ fontSize: '14px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton size="small" onClick={() => onSousPartieRemove && onSousPartieRemove(sp.partie_id, sp.id)} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(244, 67, 54, 0.8)', color: 'white' }}>
                              <FiX />
                            </IconButton>
                          </Tooltip>
                        </div>,
                        document.body
                      )
                    ))}
                  
                  {/* Portails Lignes Détails */}
                  {devisItems
                    .filter(item => item.type === 'ligne_detail')
                    .map(ligne => (
                      clickedLigneDetailId === ligne.id && createPortal(
                        <div style={{
                          position: 'fixed',
                          top: `${clickedLignePosition?.top || 0}px`,
                          left: `${(clickedLignePosition?.left || 0) + 30}px`,
                          transform: `translateY(30%) translateX(${isIconsAnimatingOut ? '-30px' : '0'})`,
                          display: 'flex',
                          flexDirection: 'row',
                          gap: '8px',
                          alignItems: 'center',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                          padding: '8px',
                          zIndex: 99999,
                          border: '1px solid #e0e0e0',
                          transition: 'transform 0.3s ease, opacity 0.3s ease',
                          opacity: isIconsAnimatingOut ? 0 : 1,
                          minWidth: '320px'
                        }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {isOptionsTable && onTransferToMain && (
                              <Tooltip title="Transférer vers le tableau principal">
                                <IconButton size="small" onClick={() => {
                                  onTransferToMain(ligne);
                                }} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(76, 175, 80, 0.8)', color: 'white' }}>
                                  <span style={{ fontSize: '14px' }}>→</span>
                                </IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Éditer">
                              <IconButton size="small" onClick={() => { 
                                setEditContext({ partieId: ligne.partie_id, sousPartieId: ligne.sous_partie_id, ligne }); 
                                setIsEditOpen(true); 
                              }} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(33, 150, 243, 0.8)', color: 'white' }}>
                                <EditIcon fontSize="small" style={{ fontSize: '14px' }} />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Retirer du devis">
                              <IconButton size="small" onClick={() => {
                                // Trouver la sous-partie parente
                                const sp = devisItems.find(s => s.type === 'sous_partie' && s.id === ligne.sous_partie_id);
                                if (sp && onLigneDetailRemove) {
                                  onLigneDetailRemove(sp.partie_id, sp.id, ligne.id);
                                }
                              }} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(244, 67, 54, 0.8)', color: 'white' }}>
                                <FiX />
                              </IconButton>
                            </Tooltip>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', alignItems: 'center', flex: 1 }}>
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              value={ligne.marge_devis !== null && ligne.marge_devis !== undefined ? ligne.marge_devis : ligne.marge}
                              onChange={(e) => {
                                // Trouver les IDs parents en cherchant dans devisItems
                                const spItem = devisItems.find(s => s.type === 'sous_partie' && s.id === ligne.sous_partie_id);
                                const partieId = spItem ? spItem.partie_id : null;
                                
                                if (partieId && ligne.sous_partie_id && onLigneDetailMargeChange) {
                                  onLigneDetailMargeChange(partieId, ligne.sous_partie_id, ligne.id, parseFloat(e.target.value) || 0);
                                }
                              }}
                              style={{
                                width: 'auto',
                                minWidth: '50px',
                                maxWidth: '100px',
                                padding: '4px 6px',
                                border: '1px solid #dee2e6',
                                borderRadius: '4px',
                                fontSize: '13px',
                                textAlign: 'center',
                                fontWeight: '600'
                              }}
                            />
                            <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>%</div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              step="0.01"
                              value={ligne.marge_devis !== null && ligne.marge_devis !== undefined ? ligne.marge_devis : ligne.marge}
                              onChange={(e) => {
                                // Trouver les IDs parents en cherchant dans devisItems
                                const spItem = devisItems.find(s => s.type === 'sous_partie' && s.id === ligne.sous_partie_id);
                                const partieId = spItem ? spItem.partie_id : null;
                                
                                if (partieId && ligne.sous_partie_id && onLigneDetailMargeChange) {
                                  onLigneDetailMargeChange(partieId, ligne.sous_partie_id, ligne.id, parseFloat(e.target.value));
                                }
                              }}
                              style={{
                                flex: 1,
                                height: '6px',
                                borderRadius: '5px',
                                background: '#dee2e6',
                                outline: 'none',
                                cursor: 'pointer'
                              }}
                            />
                          </div>
                        </div>,
                        document.body
                      )
                    ))}
                    
                    {/* Portails pour les boutons d'action des lignes spéciales */}
                    {pendingSpecialLines && pendingSpecialLines.map(line => (
                      clickedSpecialLineId === line.id && createPortal(
                        <div style={{
                          position: 'fixed',
                          top: `${clickedSpecialLinePosition?.top || 0}px`,
                          left: `${(clickedSpecialLinePosition?.left || 0) + 30}px`,
                          transform: `translateY(0) translateX(${isSpecialLineIconsAnimatingOut ? '-100%' : '0'})`,
                          display: 'flex',
                          gap: '4px',
                          backgroundColor: 'white',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
                          padding: '4px',
                          zIndex: 99999,
                          border: '1px solid #e0e0e0',
                          transition: 'transform 0.3s ease, opacity 0.3s ease',
                          opacity: isSpecialLineIconsAnimatingOut ? 0 : 1
                        }}>
                          <Tooltip title="Éditer">
                            <IconButton size="small" onClick={() => onEditSpecialLine && onEditSpecialLine(line)} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(33, 150, 243, 0.8)', color: 'white' }}>
                              <EditIcon fontSize="small" style={{ fontSize: '14px' }} />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Supprimer">
                            <IconButton size="small" onClick={() => onRemovePendingSpecialLine && onRemovePendingSpecialLine(line.id)} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(244, 67, 54, 0.8)', color: 'white' }}>
                              <FiX />
                            </IconButton>
                          </Tooltip>
                        </div>,
                        document.body
                      )
                    ))}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal d'édition des lignes détails */}
      {isEditOpen && editContext && (
        <LigneDetailEditModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          ligneDetail={editContext.ligne}
          onSuccess={(updated) => {
            if (editContext?.ligne) {
              // Mettre à jour l'objet ligne directement (pour compatibilité)
              Object.assign(editContext.ligne, {
                description: updated.description,
                unite: updated.unite,
                cout_main_oeuvre: updated.cout_main_oeuvre,
                cout_materiel: updated.cout_materiel,
                taux_fixe: updated.taux_fixe,
                marge: updated.marge,
                prix: updated.prix
              });
              
              // ✅ Appeler onLigneDetailEdit pour mettre à jour devisItems via setDevisItems
              // Cela permet de déclencher un re-render dans ModificationDevisV2.js
              if (onLigneDetailEdit) {
                // Créer un objet ligne mis à jour avec toutes les propriétés
                const updatedLigne = {
                  ...editContext.ligne,
                  description: updated.description,
                  unite: updated.unite,
                  cout_main_oeuvre: parseFloat(updated.cout_main_oeuvre) || 0,
                  cout_materiel: parseFloat(updated.cout_materiel) || 0,
                  taux_fixe: parseFloat(updated.taux_fixe) || 0,
                  marge: parseFloat(updated.marge) || 0,
                  marge_devis: parseFloat(updated.marge) || 0,
                  prix: parseFloat(updated.prix) || 0,
                  prix_devis: parseFloat(updated.prix) || 0
                };
                onLigneDetailEdit(updatedLigne);
              }
            }
            setIsEditOpen(false);
          }}
        />
      )}
      
      {/* Zone de création de lignes spéciales */}
      <div>
        {/* Modal de création */}
        <SpecialLinesCreator
          open={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            onClearPendingLineForBase(); // Nettoyer pendingLineForBase à la fermeture
          }}
          onAddPendingLine={onAddPendingSpecialLine}
          formatMontantEspace={formatMontantEspace}
          calculatePartieTotal={calculatePartieTotal}
          calculateSousPartieTotal={calculateSousPartieTotal}
          calculateGlobalTotal={calculateGlobalTotal}
          calculateGlobalTotalExcludingLine={calculateGlobalTotalExcludingLine}
          total_ht={total_ht}
          devisItems={devisItems}
          pendingLineForBase={pendingLineForBase}
          onClearPendingLineForBase={onClearPendingLineForBase}
        />
        
        {/* Modal d'édition */}
        {showEditModal && editingSpecialLine && (
          <SpecialLineEditModal
            open={showEditModal}
            line={editingSpecialLine}
            onClose={onCloseEditModal}
            onSave={onSaveSpecialLine}
            formatMontantEspace={formatMontantEspace}
            selectedParties={selectedParties}
            calculatePartieTotal={calculatePartieTotal}
            calculateSousPartieTotal={calculateSousPartieTotal}
            calculatePrice={calculatePrice}
            calculateGlobalTotal={calculateGlobalTotal}
          />
        )}
      </div>
      
      {/* Bouton flottant pour créer une ligne spéciale */}
      <button
        onClick={() => setShowCreateModal(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '12px 24px',
          borderRadius: '8px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.backgroundColor = '#1565c0';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.backgroundColor = '#1976d2';
        }}
      >
        <span style={{ fontSize: '18px' }}>+</span>
        <span>Créer ligne spéciale</span>
      </button>
      
      {/* Boutons d'action - Lignes spéciales */}
      {clickedSpecialLineId && clickedSpecialLinePosition && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${clickedSpecialLinePosition.top}px`,
            left: `${(clickedSpecialLinePosition.left || 0) + 30}px`,
            transform: `translateY(0) translateX(${isSpecialLineIconsAnimatingOut ? '-100%' : '0'})`,
            display: 'flex',
            gap: '4px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
            padding: '4px',
            zIndex: 99999,
            border: '1px solid #e0e0e0',
            transition: 'transform 0.3s ease, opacity 0.3s ease',
            opacity: isSpecialLineIconsAnimatingOut ? 0 : 1
          }}
        >
          {/* Bouton Modifier */}
          <Tooltip title="Modifier">
            <IconButton 
              size="small" 
              onClick={() => {
                const line = devisItems.find(item => item.type === 'ligne_speciale' && item.id === clickedSpecialLineId);
                if (line && onEditSpecialLine) {
                  onEditSpecialLine(line);
                }
              }}
              style={{ 
                width: '24px', 
                height: '24px', 
                padding: '4px', 
                backgroundColor: 'rgba(33, 150, 243, 0.8)', 
                color: 'white' 
              }}
            >
              <EditIcon fontSize="small" style={{ fontSize: '14px' }} />
            </IconButton>
          </Tooltip>

          {/* Bouton Déplacer */}
          <Tooltip title="Déplacer">
            <IconButton 
              size="small" 
              onClick={() => {
                // ✅ TODO 1.3: Utiliser le nouveau handler handleMoveSpecialLine
                if (onMoveSpecialLine) {
                  onMoveSpecialLine(clickedSpecialLineId);
                }
              }}
              style={{ 
                width: '24px', 
                height: '24px', 
                padding: '4px', 
                backgroundColor: 'rgba(255, 152, 0, 0.8)', 
                color: 'white' 
              }}
            >
              <span style={{ fontSize: '14px' }}>↕</span>
            </IconButton>
          </Tooltip>

          {/* Bouton Supprimer - ✅ Capturer l'ID au moment du clic pour éviter les problèmes de timing */}
          <Tooltip title="Supprimer">
            <IconButton 
              size="small" 
              onClick={() => {
                // ✅ Trouver la ligne avec l'ID actuel au moment du clic
                const lineToDelete = devisItems.find(item => item.type === 'ligne_speciale' && item.id === clickedSpecialLineId);
                
                if (!lineToDelete) {
                  console.warn('Ligne spéciale non trouvée pour ID:', clickedSpecialLineId);
                  return;
                }
                
                const isRecurring = isRecurringLine(lineToDelete);
                const confirmMessage = isRecurring 
                  ? 'Supprimer la ligne récurrente ? Elle pourra être replacée via la zone en bas du devis.'
                  : 'Supprimer cette ligne spéciale ?';
                
                if (window.confirm(confirmMessage)) {
                  if (onRemoveSpecialLine) {
                    onRemoveSpecialLine(lineToDelete.id);
                  }
                }
              }}
              style={{ 
                width: '24px', 
                height: '24px', 
                padding: '4px', 
                backgroundColor: 'rgba(244, 67, 54, 0.8)', 
                color: 'white' 
              }}
            >
              <FiX />
            </IconButton>
          </Tooltip>
        </div>,
        document.body
      )}
      
      <button
        onClick={() => setShowCreateModal(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          padding: '12px 24px',
          borderRadius: '8px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          zIndex: 1000,
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.05)';
          e.target.style.backgroundColor = '#1565c0';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
          e.target.style.backgroundColor = '#1976d2';
        }}
      >
        <span style={{ fontSize: '18px' }}>+</span>
        <span>Créer ligne spéciale</span>
      </button>
    </div>
  );
};

export default DevisTable;

