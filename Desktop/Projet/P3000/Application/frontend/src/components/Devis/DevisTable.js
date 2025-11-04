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
  onEditSpecialLine,
  editingSpecialLine,
  showEditModal,
  onCloseEditModal,
  onSaveSpecialLine,
  onSpecialLinesReorder,
  // Fonctions de calcul
  calculateGlobalTotal,
  calculatePartieTotal,
  calculateSousPartieTotal,
  // Props pour le système unifié
  devisItems = [],
  onDevisItemsReorder
}) => {
  // État pour suivre si une sous-partie est en cours de drag et quelle partie est affectée
  const [draggedPartieId, setDraggedPartieId] = useState(null);
  const [hoveredLigneDetailId, setHoveredLigneDetailId] = useState(null);
  const [hoveredLignePosition, setHoveredLignePosition] = useState(null);
  const [isIconsAnimatingOut, setIsIconsAnimatingOut] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editContext, setEditContext] = useState(null);
  const hoverTimeoutRef = React.useRef(null);
  
  // États pour les hover des parties et sous-parties
  const [hoveredPartieId, setHoveredPartieId] = useState(null);
  const [hoveredPartiePosition, setHoveredPartiePosition] = useState(null);
  const [isPartieIconsAnimatingOut, setIsPartieIconsAnimatingOut] = useState(false);
  const partieHoverTimeoutRef = React.useRef(null);
  
  const [hoveredSousPartieId, setHoveredSousPartieId] = useState(null);
  const [hoveredSousPartiePosition, setHoveredSousPartiePosition] = useState(null);
  const [isSousPartieIconsAnimatingOut, setIsSousPartieIconsAnimatingOut] = useState(false);
  const sousPartieHoverTimeoutRef = React.useRef(null);
  
  // États pour le hover des lignes spéciales
  const [hoveredSpecialLineId, setHoveredSpecialLineId] = useState(null);
  const [hoveredSpecialLinePosition, setHoveredSpecialLinePosition] = useState(null);
  const [isSpecialLineIconsAnimatingOut, setIsSpecialLineIconsAnimatingOut] = useState(false);
  const specialLineHoverTimeoutRef = React.useRef(null);
  
  // État pour le modal de création de ligne spéciale
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Nettoyer les timeouts quand le composant est démonté
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (partieHoverTimeoutRef.current) {
        clearTimeout(partieHoverTimeoutRef.current);
      }
      if (sousPartieHoverTimeoutRef.current) {
        clearTimeout(sousPartieHoverTimeoutRef.current);
      }
      if (specialLineHoverTimeoutRef.current) {
        clearTimeout(specialLineHoverTimeoutRef.current);
      }
    };
  }, []);

  // Déclencher l'animation d'entrée quand les icônes apparaissent
  useEffect(() => {
    if (hoveredLigneDetailId) {
      // Fermer les autres panneaux hover
      setHoveredPartieId(null);
      setHoveredSousPartieId(null);
      setHoveredSpecialLineId(null);
      // Mettre temporairement l'animation à true pour qu'elle parte de la gauche
      setIsIconsAnimatingOut(true);
      // Puis immédiatement la remettre à false pour qu'elle vienne vers nous
      setTimeout(() => {
        setIsIconsAnimatingOut(false);
      }, 10);
    }
  }, [hoveredLigneDetailId]);

  // Déclencher l'animation d'entrée pour les parties
  useEffect(() => {
    if (hoveredPartieId) {
      // Fermer les autres panneaux hover
      setHoveredLigneDetailId(null);
      setHoveredSousPartieId(null);
      setHoveredSpecialLineId(null);
      setIsPartieIconsAnimatingOut(true);
      setTimeout(() => {
        setIsPartieIconsAnimatingOut(false);
      }, 10);
    }
  }, [hoveredPartieId]);

  // Déclencher l'animation d'entrée pour les sous-parties
  useEffect(() => {
    if (hoveredSousPartieId) {
      // Fermer les autres panneaux hover
      setHoveredLigneDetailId(null);
      setHoveredPartieId(null);
      setHoveredSpecialLineId(null);
      setIsSousPartieIconsAnimatingOut(true);
      setTimeout(() => {
        setIsSousPartieIconsAnimatingOut(false);
      }, 10);
    }
  }, [hoveredSousPartieId]);

  // Déclencher l'animation d'entrée pour les lignes spéciales
  useEffect(() => {
    if (hoveredSpecialLineId) {
      // Fermer les autres panneaux hover
      setHoveredLigneDetailId(null);
      setHoveredPartieId(null);
      setHoveredSousPartieId(null);
      setIsSpecialLineIconsAnimatingOut(true);
      setTimeout(() => {
        setIsSpecialLineIconsAnimatingOut(false);
      }, 10);
    }
  }, [hoveredSpecialLineId]);

  // Calculer le prix basé sur les coûts et la marge
  const calculatePrice = (ligne) => {
    // Si un prix_devis existe (prix personnalisé pour ce devis), l'utiliser
    if (ligne.prix_devis !== null && ligne.prix_devis !== undefined) {
      return parseFloat(ligne.prix_devis);
    }
    
    // Sinon, utiliser la marge du devis si elle existe, sinon la marge de base
    const marge = ligne.marge_devis !== null && ligne.marge_devis !== undefined 
      ? parseFloat(ligne.marge_devis)
      : parseFloat(ligne.marge) || 0;
    
    const cout_main_oeuvre = parseFloat(ligne.cout_main_oeuvre) || 0;
    const cout_materiel = parseFloat(ligne.cout_materiel) || 0;
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
    if (!result.destination) {
      return;
    }

    // ========================================
    // GESTION DU DRAG DANS LE SYSTÈME UNIFIÉ
    // ========================================
    
    // ===== RÉORDONNANCEMENT DES PARTIES =====
    if (result.source.droppableId === 'parties-global' && result.destination.droppableId === 'parties-global') {
      if (result.source.index === result.destination.index) return;
      
      // Réordonner via onPartiesReorder (qui met à jour selectedParties)
      const newParties = Array.from(selectedParties);
      const [moved] = newParties.splice(result.source.index, 1);
      newParties.splice(result.destination.index, 0, moved);
      
      if (onPartiesReorder) {
        onPartiesReorder(newParties);
      }
      
      return;
    }
    
    // ===== RÉORDONNANCEMENT DES SOUS-PARTIES =====
    if (result.source.droppableId.startsWith('sous-parties-') && result.destination.droppableId.startsWith('sous-parties-')) {
      // Vérifier que c'est dans la même partie
      if (result.source.droppableId !== result.destination.droppableId) {
        return;
      }
      
      const partieId = parseInt(result.source.droppableId.replace('sous-parties-', ''));
      
      if (onSousPartiesReorder) {
        onSousPartiesReorder(partieId, result);
      }
      
      return;
    }
    
    // ===== RÉORDONNANCEMENT DES LIGNES DÉTAILS =====
    if (result.source.droppableId.startsWith('lignes-') && result.destination.droppableId.startsWith('lignes-')) {
      // Vérifier que c'est dans la même sous-partie
      if (result.source.droppableId !== result.destination.droppableId) {
        return;
      }
      
      // Pour l'instant, pas de handler spécifique pour les lignes détails
      // Elles restent dans leur ordre actuel
      
      return;
    }
    
    // Placement d'une ligne spéciale depuis pending vers n'importe quel droppable
    if (result.source.droppableId === 'pending-special-lines') {
      if (onDevisItemsReorder && onRemovePendingSpecialLine) {
        const lineId = result.draggableId;
        const line = pendingSpecialLines.find(l => String(l.id) === String(lineId));
        
        if (line) {
          // Déterminer le contexte selon le droppableId
          let context_type = 'global';
          let context_id = null;
          
          if (result.destination.droppableId === 'parties-global') {
            context_type = 'global';
          } else if (result.destination.droppableId.startsWith('sous-parties-')) {
            context_type = 'partie';
            context_id = parseInt(result.destination.droppableId.replace('sous-parties-', ''));
          } else if (result.destination.droppableId.startsWith('lignes-')) {
            context_type = 'sous_partie';
            context_id = parseInt(result.destination.droppableId.replace('lignes-', ''));
          }
          
          // Retirer de pending
          onRemovePendingSpecialLine(line.id);
          
          // Ajouter dans devisItems avec le contexte
          const newItems = [...devisItems];
          newItems.splice(result.destination.index, 0, {
            ...line,
            type: 'ligne_speciale',
            index_global: result.destination.index + 1,
            context_type,
            context_id,
            position_in_context: result.destination.index
          });
          
          // Réindexer tout
          const reindexed = newItems.map((item, idx) => ({
            ...item,
            index_global: idx + 1
          }));
          
          onDevisItemsReorder(reindexed);
        }
        
        return;
      }
    }

    // ========================================
    // GESTION DU DRAG DANS LE SYSTÈME LEGACY
    // ========================================
    
    // Gestion du drag des parties
    if (result.source.droppableId === 'parties' && result.destination.droppableId === 'parties') {
      if (result.source.index === result.destination.index) {
        return;
      }

      const newParties = Array.from(selectedParties);
      const [reorderedItem] = newParties.splice(result.source.index, 1);
      newParties.splice(result.destination.index, 0, reorderedItem);

      // Mise à jour des numéros automatiques
      const updatedParties = newParties.map((partie, index) => {
        if (!partie.numero) {
          return {
            ...partie,
            ordre: index
          };
        }
        
        if (/^\d+$/.test(partie.numero)) {
          const partiesAvantAvecNumero = newParties.slice(0, index).filter(p => p.numero && /^\d+$/.test(p.numero));
          const newIndex = partiesAvantAvecNumero.length + 1;
          
          return {
            ...partie,
            numero: newIndex.toString(),
            ordre: index
          };
        }
        
        return {
          ...partie,
          ordre: index
        };
      });

      if (onPartiesReorder) {
        onPartiesReorder(updatedParties);
      }
      return;
    }

    // Gestion du drag des lignes spéciales
    if (result.source.droppableId === 'pending-special-lines' && result.destination.droppableId === 'pending-special-lines') {
      if (result.source.index === result.destination.index) {
        return;
      }

      const newLines = Array.from(pendingSpecialLines);
      const [reorderedLine] = newLines.splice(result.source.index, 1);
      newLines.splice(result.destination.index, 0, reorderedLine);

      // Mettre à jour l'état via callback
      if (onSpecialLinesReorder) {
        onSpecialLinesReorder(newLines);
      }
      
      return;
    }

    // Gestion du drag depuis pending-special-lines vers le tableau principal
    if (result.source.droppableId === 'pending-special-lines' && result.destination.droppableId === 'parties') {
      // DevisAvance utilise toujours le système unifié
      if (onDevisItemsReorder && onRemovePendingSpecialLine) {
        // Le draggableId contient le préfixe 'pending_', cherchons avec l'ID complet
        const lineId = result.draggableId; // Garder l'ID complet: "pending_1762247156414"
        
        // Chercher la ligne avec l'ID complet
        const line = pendingSpecialLines.find(l => String(l.id) === String(lineId));
        
        if (line) {
          // Retirer de pending (utiliser l'ID original de la ligne)
          onRemovePendingSpecialLine(line.id);
          
          // Ajouter dans devisItems à la position destination
          const newItems = [...devisItems];
          newItems.splice(result.destination.index, 0, {
            ...line,
            type: 'ligne_speciale',
            index_global: result.destination.index + 1
          });
          
          // Mettre à jour les index_global
          const reindexed = newItems.map((item, idx) => ({
            ...item,
            index_global: idx + 1
          }));
          
          onDevisItemsReorder(reindexed);
        } else {
          console.error('❌ Ligne spéciale non trouvée:', lineId);
          console.error('❌ Lignes disponibles:', pendingSpecialLines);
        }
        
        return;
      }
      
      return;
    }
  };

  // Fonction pour gérer le début du drag
  const handleDragStart = (start) => {
    // Drag start
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

  // Calculer la profondeur d'un item pour l'indentation
  const getItemDepth = (item, allItems) => {
    if (item.type === 'partie') return 0;
    if (item.type === 'sous_partie') return 1;
    if (item.type === 'ligne_detail') return 2;
    
    if (item.type === 'ligne_speciale') {
      // Trouver l'élément précédent pour déterminer la profondeur
      const index = allItems.findIndex(i => i.id === item.id && i.type === item.type);
      if (index <= 0) return 0;
      
      const previousItems = allItems.slice(0, index);
      
      // Chercher le dernier élément non-ligne-spéciale
      for (let i = previousItems.length - 1; i >= 0; i--) {
        if (previousItems[i].type === 'ligne_detail') return 2;
        if (previousItems[i].type === 'sous_partie') return 1;
        if (previousItems[i].type === 'partie') return 0;
      }
      
      return 0; // Par défaut au niveau des parties
    }
    
    return 0;
  };

  // Vérifier si on doit utiliser le render unifié
  // Utiliser le rendu unifié si devisItems contient au moins une partie/sous-partie/ligne (pas seulement des lignes spéciales)
  const hasNonSpecialItems = devisItems && devisItems.some(item => item.type !== 'ligne_speciale');
  const useUnifiedRender = hasNonSpecialItems;

  // Obtenir les lignes spéciales qui doivent apparaître après un certain index_global
  const getSpecialLinesAfterIndex = (afterIndex) => {
    if (!devisItems) return [];
    
    return devisItems
      .filter(item => 
        item.type === 'ligne_speciale' && 
        item.index_global > afterIndex &&
        (devisItems.findIndex(i => i.index_global === afterIndex) >= 0)
      )
      .sort((a, b) => a.index_global - b.index_global);
  };
  
  // Obtenir l'index_global d'un élément
  const getIndexGlobal = (type, id) => {
    if (!devisItems) return 0;
    
    const item = devisItems.find(i => i.type === type && i.id === id);
    return item ? item.index_global : 0;
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

              
            {/* Barre de recherche initiale - Quand aucune partie ET pas de rendu unifié */}
            {selectedParties.length === 0 && !useUnifiedRender && (
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
                      {formatMontantEspace(selectedParties.reduce((total, partie) => total + (partie.total_partie || 0), 0))} €
                    </div>
                  </div>
                </td>
              </tr>
            )}


            {/* RENDU UNIFIÉ : Affichage par index_global si devisItems existe */}
            {useUnifiedRender && devisItems.length > 0 ? (
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
                            backgroundColor: snapshot.isDraggingOver ? 'rgba(27, 120, 188, 0.05)' : 'transparent',
                            padding: '2px 0',
                            minHeight: '50px'
                          }}
                        >
                          {/* Afficher uniquement les PARTIES (pas les sous-parties ni lignes) */}
                          {devisItems
                            .filter(item => item.type === 'partie')
                            .sort((a, b) => a.index_global - b.index_global)
                            .map((item, partieIndex) => {
                              
                              return (
                                <Draggable
                                  key={`partie_${item.id}`}
                                  draggableId={`partie_${item.id}`}
                                  index={partieIndex}
                                >
                                  {(dragProvided, dragSnapshot) => {
                                    // PARTIE
                                    if (item.type === 'partie') {
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
                                              cursor: dragSnapshot.isDragging ? 'grabbing' : 'grab',
                                              display: 'flex',
                                              justifyContent: 'space-between',
                                              alignItems: 'center',
                                              opacity: dragSnapshot.isDragging ? 0.8 : 1,
                                              position: 'relative'
                                            }}
                                            onMouseEnter={(e) => {
                                              if (dragSnapshot.isDragging) return;
                                              if (partieHoverTimeoutRef.current) {
                                                clearTimeout(partieHoverTimeoutRef.current);
                                                partieHoverTimeoutRef.current = null;
                                              }
                                              setIsPartieIconsAnimatingOut(false);
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setHoveredPartieId(item.id);
                                              setHoveredPartiePosition({
                                                top: rect.top + rect.height / 2 - 12,
                                                left: rect.right
                                              });
                                            }}
                                            onMouseLeave={() => {
                                              if (partieHoverTimeoutRef.current) {
                                                clearTimeout(partieHoverTimeoutRef.current);
                                              }
                                              partieHoverTimeoutRef.current = setTimeout(() => {
                                                setIsPartieIconsAnimatingOut(true);
                                                setTimeout(() => {
                                                  setHoveredPartieId(null);
                                                  setHoveredPartiePosition(null);
                                                  partieHoverTimeoutRef.current = null;
                                                }, 300);
                                              }, 1000);
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
                                                    backgroundColor: spSnapshot.isDraggingOver ? 'rgba(157, 197, 226, 0.1)' : 'transparent',
                                                    minHeight: '30px',
                                                    padding: '4px 0'
                                                  }}
                                                >
                                                  {/* Afficher les sous-parties de cette partie */}
                                                  {devisItems
                                                    .filter(sp => sp.type === 'sous_partie' && sp.partie_id === item.id)
                                                    .sort((a, b) => a.index_global - b.index_global)
                                                    .map((sp, spIndex) => (
                                                      <Draggable 
                                                        key={`sp_${sp.id}`} 
                                                        draggableId={`sp_${sp.id}`} 
                                                        index={spIndex}
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
                                                            {/* EN-TÊTE DE LA SOUS-PARTIE */}
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
                                                                position: 'relative'
                                                              }}
                                                              onMouseEnter={(e) => {
                                                                if (spDragSnapshot.isDragging) return;
                                                                if (sousPartieHoverTimeoutRef.current) clearTimeout(sousPartieHoverTimeoutRef.current);
                                                                setIsSousPartieIconsAnimatingOut(false);
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setHoveredSousPartieId(sp.id);
                                                                setHoveredSousPartiePosition({
                                                                  top: rect.top + rect.height / 2 - 12,
                                                                  left: rect.right
                                                                });
                                                              }}
                                                              onMouseLeave={() => {
                                                                if (sousPartieHoverTimeoutRef.current) clearTimeout(sousPartieHoverTimeoutRef.current);
                                                                sousPartieHoverTimeoutRef.current = setTimeout(() => {
                                                                  setIsSousPartieIconsAnimatingOut(true);
                                                                  setTimeout(() => {
                                                                    setHoveredSousPartieId(null);
                                                                    setHoveredSousPartiePosition(null);
                                                                  }, 300);
                                                                }, 1000);
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
                                                            
                                                            {/* ZONE DES LIGNES DÉTAILS */}
                                                            <div style={{ 
                                                              backgroundColor: '#fff',
                                                              padding: '8px 12px',
                                                              border: '1px solid #dee2e6',
                                                              borderTop: 'none',
                                                              borderRadius: '0 0 4px 4px'
                                                            }}>
                                                              <Droppable droppableId={`lignes-${sp.id}`} type="LIGNE_DETAIL">
                                                                {(ldProvided, ldSnapshot) => (
                                                                  <div
                                                                    {...ldProvided.droppableProps}
                                                                    ref={ldProvided.innerRef}
                                                                    style={{
                                                                      backgroundColor: ldSnapshot.isDraggingOver ? 'rgba(230, 230, 230, 0.3)' : 'transparent',
                                                                      minHeight: '30px',
                                                                      padding: '4px 0'
                                                                    }}
                                                                  >
                                                                    {/* Afficher les lignes détails de cette sous-partie */}
                                                                    {devisItems
                                                                      .filter(ld => ld.type === 'ligne_detail' && ld.sous_partie_id === sp.id)
                                                                      .sort((a, b) => a.index_global - b.index_global)
                                                                      .map((ligne, ligneIndex) => {
                                                                        const prix = calculatePrice(ligne);
                                                                        const total = prix * (ligne.quantity || 0);
                                                                        
                                                                        return (
                                                                          <Draggable 
                                                                            key={`ligne_${ligne.id}`} 
                                                                            draggableId={`ligne_${ligne.id}`} 
                                                                            index={ligneIndex}
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
                                                                                    backgroundColor: '#fff',
                                                                                    border: '1px solid #dee2e6',
                                                                                    borderRadius: '4px',
                                                                                    padding: '6px 10px',
                                                                                    display: 'flex',
                                                                                    alignItems: 'center',
                                                                                    justifyContent: 'space-between',
                                                                                    fontSize: '13px',
                                                                                    position: 'relative',
                                                                                    paddingRight: '58px'
                                                                                  }}
                                                                                  onMouseEnter={(e) => {
                                                                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                                                    setIsIconsAnimatingOut(false);
                                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                                    setHoveredLigneDetailId(ligne.id);
                                                                                    setHoveredLignePosition({
                                                                                      top: rect.top + rect.height / 2 - 24,
                                                                                      left: rect.right
                                                                                    });
                                                                                  }}
                                                                                  onMouseLeave={() => {
                                                                                    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                                                                                    hoverTimeoutRef.current = setTimeout(() => {
                                                                                      setIsIconsAnimatingOut(true);
                                                                                      setTimeout(() => {
                                                                                        setHoveredLigneDetailId(null);
                                                                                        setHoveredLignePosition(null);
                                                                                      }, 300);
                                                                                    }, 1000);
                                                                                  }}
                                                                                >
                                                                                  <div {...ldDragProvided.dragHandleProps} style={{ cursor: 'grab', marginRight: '8px' }}>⋮</div>
                                                                                  {/* DÉSIGNATION */}
                                                                                  <div style={{ flex: '0 0 50%' }}>{ligne.description}</div>
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
                                                                                          onLigneDetailQuantityChange(item.id, sp.id, ligne.id, parseFloat(e.target.value) || 0);
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
                                                                                      type="number"
                                                                                      step="0.01"
                                                                                      min="0"
                                                                                      value={ligne.prix_devis !== null && ligne.prix_devis !== undefined ? ligne.prix_devis : prix}
                                                                                      onChange={(e) => {
                                                                                        if (onLigneDetailPriceChange) {
                                                                                          onLigneDetailPriceChange(item.id, sp.id, ligne.id, parseFloat(e.target.value) || 0);
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
                                                                        );
                                                                      })}
                                                                    
                                                                    {/* Lignes spéciales dans cette sous-partie */}
                                                                    {devisItems
                                                                      .filter(ls => ls.type === 'ligne_speciale' && ls.context_type === 'sous_partie' && ls.context_id === sp.id)
                                                                      .map((line) => (
                                                                        <Draggable 
                                                                          key={`special_${line.id}`} 
                                                                          draggableId={`special_${line.id}`} 
                                                                          index={999}
                                                                        >
                                                                          {(lsDragProvided, lsDragSnapshot) => (
                                                                            <LigneSpecialeRow
                                                                              line={line}
                                                                              provided={lsDragProvided}
                                                                              snapshot={lsDragSnapshot}
                                                                              depth={0}
                                                                              formatMontantEspace={formatMontantEspace}
                                                                            />
                                                                          )}
                                                                        </Draggable>
                                                                      ))}
                                                                    
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
                                                                />
                                                              </div>
                                                            </div>
                                                          </div>
                                                        )}
                                                      </Draggable>
                                                    ))}
                                                  
                                                  {/* Lignes spéciales dans cette partie (hors sous-parties) */}
                                                  {devisItems
                                                    .filter(ls => ls.type === 'ligne_speciale' && ls.context_type === 'partie' && ls.context_id === item.id)
                                                    .map((line) => (
                                                      <Draggable 
                                                        key={`special_${line.id}`} 
                                                        draggableId={`special_${line.id}`} 
                                                        index={999}
                                                      >
                                                        {(lsDragProvided, lsDragSnapshot) => (
                                                          <div style={{ marginBottom: '8px' }}>
                                                            <LigneSpecialeRow
                                                              line={line}
                                                              provided={lsDragProvided}
                                                              snapshot={lsDragSnapshot}
                                                              depth={0}
                                                              formatMontantEspace={formatMontantEspace}
                                                            />
                                                          </div>
                                                        )}
                                                      </Draggable>
                                                    ))}
                                                  
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
                                    }
                                    
                                    return null;
                                  }}
                                </Draggable>
                              );
                            })}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                    
                    {/* Barre de recherche partie en bas pour ajouter d'autres parties */}
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
                    
                    {/* Zone EN ATTENTE */}
                    {pendingSpecialLines && pendingSpecialLines.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#ffa500', marginBottom: '5px' }}>
                          📦 EN ATTENTE
                        </div>
                        <PendingSpecialLines
                          lines={pendingSpecialLines}
                          onEdit={onEditSpecialLine}
                          onRemove={onRemovePendingSpecialLine}
                          formatMontantEspace={formatMontantEspace}
                          setHoveredSpecialLineId={setHoveredSpecialLineId}
                          setHoveredSpecialLinePosition={setHoveredSpecialLinePosition}
                          setIsSpecialLineIconsAnimatingOut={setIsSpecialLineIconsAnimatingOut}
                          specialLineHoverTimeoutRef={specialLineHoverTimeoutRef}
                          isSpecialLineIconsAnimatingOut={isSpecialLineIconsAnimatingOut}
                          hoveredSpecialLineId={hoveredSpecialLineId}
                        />
                      </div>
                    )}
                  </DragDropContext>
                  
                  {/* Portails pour les icônes hover - Rendu Unifié */}
                  
                  {/* Portails Parties */}
                  {devisItems
                    .filter(item => item.type === 'partie')
                    .map(partie => (
                      hoveredPartieId === partie.id && createPortal(
                        <div style={{
                          position: 'fixed',
                          top: `${hoveredPartiePosition?.top || 0}px`,
                          left: `${(hoveredPartiePosition?.left || 0) + 30}px`,
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
                        }}
                        onMouseEnter={() => {
                          if (partieHoverTimeoutRef.current) {
                            clearTimeout(partieHoverTimeoutRef.current);
                            partieHoverTimeoutRef.current = null;
                          }
                          setIsPartieIconsAnimatingOut(false);
                        }}
                        onMouseLeave={() => {
                          if (partieHoverTimeoutRef.current) {
                            clearTimeout(partieHoverTimeoutRef.current);
                          }
                          partieHoverTimeoutRef.current = setTimeout(() => {
                            setIsPartieIconsAnimatingOut(true);
                            setTimeout(() => {
                              setHoveredPartieId(null);
                              setHoveredPartiePosition(null);
                              partieHoverTimeoutRef.current = null;
                            }, 300);
                          }, 1000);
                        }}>
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
                      hoveredSousPartieId === sp.id && createPortal(
                        <div style={{
                          position: 'fixed',
                          top: `${hoveredSousPartiePosition?.top || 0}px`,
                          left: `${(hoveredSousPartiePosition?.left || 0) + 30}px`,
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
                        }}
                        onMouseEnter={() => {
                          if (sousPartieHoverTimeoutRef.current) clearTimeout(sousPartieHoverTimeoutRef.current);
                          setIsSousPartieIconsAnimatingOut(false);
                        }}
                        onMouseLeave={() => {
                          if (sousPartieHoverTimeoutRef.current) clearTimeout(sousPartieHoverTimeoutRef.current);
                          sousPartieHoverTimeoutRef.current = setTimeout(() => {
                            setIsSousPartieIconsAnimatingOut(true);
                            setTimeout(() => {
                              setHoveredSousPartieId(null);
                              setHoveredSousPartiePosition(null);
                            }, 300);
                          }, 1000);
                        }}>
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
                      hoveredLigneDetailId === ligne.id && createPortal(
                        <div style={{
                          position: 'fixed',
                          top: `${hoveredLignePosition?.top || 0}px`,
                          left: `${(hoveredLignePosition?.left || 0) + 30}px`,
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
                        }}
                        onMouseEnter={() => {
                          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                          setIsIconsAnimatingOut(false);
                        }}
                        onMouseLeave={() => {
                          if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
                          hoverTimeoutRef.current = setTimeout(() => {
                            setIsIconsAnimatingOut(true);
                            setTimeout(() => {
                              setHoveredLigneDetailId(null);
                              setHoveredLignePosition(null);
                            }, 300);
                          }, 1000);
                        }}>
                          <div style={{ display: 'flex', gap: '4px' }}>
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
                </td>
              </tr>
            ) : selectedParties.length > 0 && (
              <tr>
                <td colSpan="5" style={{ padding: '0', border: 'none' }}>
                  <DragDropContext 
                    onDragEnd={handleDragEnd}
                    onDragStart={handleDragStart}
                    onDragUpdate={handleDragUpdate}
                  >
                    <Droppable droppableId="parties">
                      {(provided, snapshot) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          style={{
                            backgroundColor: snapshot.isDraggingOver ? 'rgba(27, 120, 188, 0.05)' : 'transparent',
                            padding: '2px 0'
                          }}
                        >
                          {selectedParties.map((partie, index) => (
                            <Draggable key={String(partie.id)} draggableId={String(partie.id)} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  style={{
                                    ...provided.draggableProps.style,
                                    marginBottom: '8px'
                                  }}
                                >
                                  <div style={{ 
                                    backgroundColor: 'rgba(27, 120, 188, 1)', 
                                    color: 'white',
                                    fontWeight: 'bold',
                                    padding: '15px 20px',
                                    textAlign: 'left',
                                    fontSize: '16px',
                                    border: '1px solid rgba(27, 120, 188, 1)',
                                    borderRadius: '4px',
                                    boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
                                    cursor: snapshot.isDragging ? 'grabbing' : 'grab',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    opacity: snapshot.isDragging ? 0.8 : 1,
                                    position: 'relative'
                                  }}
                                  onMouseEnter={(e) => {
                                    if (snapshot.isDragging) return;
                                    if (partieHoverTimeoutRef.current) {
                                      clearTimeout(partieHoverTimeoutRef.current);
                                      partieHoverTimeoutRef.current = null;
                                    }
                                    setIsPartieIconsAnimatingOut(false);
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setHoveredPartieId(partie.id);
                                    setHoveredPartiePosition({
                                      top: rect.top + rect.height / 2 - 12,
                                      left: rect.right
                                    });
                                  }}
                                  onMouseLeave={() => {
                                    if (partieHoverTimeoutRef.current) {
                                      clearTimeout(partieHoverTimeoutRef.current);
                                    }
                                    partieHoverTimeoutRef.current = setTimeout(() => {
                                      setIsPartieIconsAnimatingOut(true);
                                      setTimeout(() => {
                                        setHoveredPartieId(null);
                                        setHoveredPartiePosition(null);
                                        partieHoverTimeoutRef.current = null;
                                      }, 300);
                                    }, 1000);
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div
                                        {...provided.dragHandleProps}
                                        style={{
                                          cursor: 'grab',
                                          padding: '8px 6px',
                                          borderRadius: '4px',
                                          backgroundColor: 'rgba(255,255,255,0.2)',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          minWidth: '32px',
                                          height: '32px',
                                          userSelect: 'none',
                                          touchAction: 'none'
                                        }}
                                        title="Glisser pour réorganiser"
                                      >
                                        <div style={{ 
                                          display: 'flex', 
                                          flexDirection: 'column', 
                                          gap: '3px',
                                          fontSize: '14px',
                                          lineHeight: '1',
                                          color: 'white'
                                        }}>
                                          <div>⋮</div>
                                          <div>⋮</div>
                                        </div>
                                      </div>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleToggleNumber(partie.id);
                                        }}
                                        style={{
                                          width: '50px',
                                          height: '32px',
                                          padding: '4px 6px',
                                          border: '1px solid rgba(255,255,255,0.3)',
                                          borderRadius: '4px',
                                          backgroundColor: partie.numero ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
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
                                        onMouseOver={(e) => {
                                          e.target.style.backgroundColor = 'rgba(255,255,255,0.3)';
                                        }}
                                        onMouseOut={(e) => {
                                          e.target.style.backgroundColor = partie.numero ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)';
                                        }}
                                        title={partie.numero ? "Cliquer pour enlever le numéro" : "Cliquer pour attribuer un numéro"}
                                      >
                                        {partie.numero || 'N°'}
                                      </button>
                                      <span>{partie.titre}</span>
                                      {partie.isNew && (
                                        <span style={{
                                          fontSize: '10px',
                                          backgroundColor: '#4caf50',
                                          color: 'white',
                                          padding: '1px 6px',
                                          borderRadius: '10px',
                                          fontWeight: '500'
                                        }}>
                                          NOUVEAU
                                        </span>
                                      )}
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ 
                                        fontSize: '16px', 
                                        fontWeight: 'bold',
                                        marginLeft: '10px'
                                      }}>
                                        {formatMontantEspace(
                                          (partie.selectedSousParties || []).reduce((partieSum, sp) => 
                                            partieSum + (sp.selectedLignesDetails || []).reduce((spSum, ld) => 
                                              spSum + (calculatePrice(ld) * parseFloat(ld.quantity || 0)), 0
                                            ), 0
                                          )
                                        )} €
                                      </span>
                                      {hoveredPartieId === partie.id && createPortal(
                                        <div style={{
                                          position: 'fixed',
                                          top: `${hoveredPartiePosition?.top || 0}px`,
                                          left: `${(hoveredPartiePosition?.left || 0) + 30}px`,
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
                                        }}
                                        onMouseEnter={() => {
                                          if (partieHoverTimeoutRef.current) {
                                            clearTimeout(partieHoverTimeoutRef.current);
                                            partieHoverTimeoutRef.current = null;
                                          }
                                          setIsPartieIconsAnimatingOut(false);
                                        }}
                                        onMouseLeave={() => {
                                          if (partieHoverTimeoutRef.current) {
                                            clearTimeout(partieHoverTimeoutRef.current);
                                          }
                                          partieHoverTimeoutRef.current = setTimeout(() => {
                                            setIsPartieIconsAnimatingOut(true);
                                            setTimeout(() => {
                                              setHoveredPartieId(null);
                                              setHoveredPartiePosition(null);
                                              partieHoverTimeoutRef.current = null;
                                            }, 300);
                                          }, 1000);
                                        }}>
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
                                      )}
                                    </div>
                                  </div>
                                  
                                  {/* Section des sous-parties */}
                                  <div style={{ 
                                    backgroundColor: '#f8f9fa',
                                    padding: '20px',
                                    border: '1px solid #dee2e6',
                                    borderTop: 'none',
                                    borderRadius: '0 0 4px 4px',
                                    overflow: 'visible',
                                    position: 'relative'
                                  }}>
                                    {/* Barre de recherche de sous-partie en haut si aucune sous-partie */}
                                    {(!partie.selectedSousParties || partie.selectedSousParties.length === 0) && (
                                      <div style={{ marginBottom: '12px' }}>
                                        <SousPartieSearch
                                          partieId={partie.id}
                                          selectedSousParties={partie.selectedSousParties || []}
                                          onSousPartieSelect={(sousPartie) => onSousPartieSelect && onSousPartieSelect(partie.id, sousPartie)}
                                          onSousPartieCreate={(partieId, description) => onSousPartieCreate && onSousPartieCreate(partieId, description)}
                                        />
                                      </div>
                                    )}
                                    
                                    {/* Liste des sous-parties avec drag & drop */}
                                    {partie.selectedSousParties && partie.selectedSousParties.length > 0 && (
                                      <div>
                                        <DragDropContext
                                          onDragStart={(start) => {
                                            setDraggedPartieId(partie.id);
                                          }}
                                          onDragEnd={(result) => {
                                            if (result.destination && onSousPartiesReorder) {
                                              onSousPartiesReorder(partie.id, result);
                                            }
                                            // Attendre que la fin du drag soit complète avant de réafficher les lignes
                                            setTimeout(() => {
                                              setDraggedPartieId(null);
                                            }, 150);
                                          }}
                                        >
                                          <Droppable droppableId={`sous-parties-${partie.id}`}>
                                            {(provided) => (
                                              <div {...provided.droppableProps} ref={provided.innerRef}>
                                                {partie.selectedSousParties.map((sousPartie, spIndex) => (
                                                  <React.Fragment key={String(sousPartie.id)}>
                                                    <Draggable
                                                      draggableId={String(sousPartie.id)}
                                                      index={spIndex}
                                                    >
                                                      {(provided, snapshot) => (
                                                        <div>
                                                          <div
                                                            ref={provided.innerRef}
                                                            {...provided.draggableProps}
                                                            style={{
                                                              ...provided.draggableProps.style,
                                                              backgroundColor: 'rgb(157, 197, 226)',
                                                              color: '#333',
                                                              padding: '10px 15px',
                                                              marginBottom: '8px',
                                                              borderRadius: '4px',
                                                              boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                                                              display: 'flex',
                                                              justifyContent: 'space-between',
                                                              alignItems: 'center',
                                                              fontWeight: '600',
                                                              position: 'relative'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                              if (snapshot.isDragging) return;
                                                              if (sousPartieHoverTimeoutRef.current) {
                                                                clearTimeout(sousPartieHoverTimeoutRef.current);
                                                                sousPartieHoverTimeoutRef.current = null;
                                                              }
                                                              setIsSousPartieIconsAnimatingOut(false);
                                                              const rect = e.currentTarget.getBoundingClientRect();
                                                              setHoveredSousPartieId(sousPartie.id);
                                                              setHoveredSousPartiePosition({
                                                                top: rect.top + rect.height / 2 - 12,
                                                                left: rect.right
                                                              });
                                                            }}
                                                            onMouseLeave={() => {
                                                              if (sousPartieHoverTimeoutRef.current) {
                                                                clearTimeout(sousPartieHoverTimeoutRef.current);
                                                              }
                                                              sousPartieHoverTimeoutRef.current = setTimeout(() => {
                                                                setIsSousPartieIconsAnimatingOut(true);
                                                                setTimeout(() => {
                                                                  setHoveredSousPartieId(null);
                                                                  setHoveredSousPartiePosition(null);
                                                                  sousPartieHoverTimeoutRef.current = null;
                                                                }, 300);
                                                              }, 1000);
                                                            }}
                                                          >
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                              <div
                                                                {...provided.dragHandleProps}
                                                                style={{
                                                                  cursor: 'grab',
                                                                  padding: '4px',
                                                                  borderRadius: '4px',
                                                                  backgroundColor: 'rgba(0,0,0,0.1)',
                                                                  userSelect: 'none'
                                                                }}
                                                              >
                                                                ⋮⋮
                                                              </div>
                                                              <button
                                                                onClick={(e) => { 
                                                                  e.stopPropagation();
                                                                  if (onSousPartieNumeroChange) {
                                                                    const currentNumero = sousPartie.numero;
                                                                    if (currentNumero) {
                                                                      onSousPartieNumeroChange(partie.id, sousPartie.id, '');
                                                                    } else {
                                                                      // Attribuer le prochain numéro automatique
                                                                      const parentNumero = partie.numero;
                                                                      const isParentNumeric = parentNumero && /^\d+$/.test(parentNumero);

                                                                      if (isParentNumeric) {
                                                                        // Filtrer les sous-parties déjà numérotées avec le même préfixe
                                                                        const regex = new RegExp('^' + parentNumero + '\\.(\\d+)$');
                                                                        const withPrefix = (partie.selectedSousParties || []).filter(sp => sp.numero && regex.test(sp.numero));
                                                                        let nextIndex = 1;
                                                                        if (withPrefix.length > 0) {
                                                                          const maxIdx = Math.max(
                                                                            ...withPrefix.map(sp => {
                                                                              const m = sp.numero.match(regex);
                                                                              return m ? parseInt(m[1], 10) : 0;
                                                                            })
                                                                          );
                                                                          nextIndex = maxIdx + 1;
                                                                        }
                                                                        onSousPartieNumeroChange(partie.id, sousPartie.id, `${parentNumero}.${nextIndex}`);
                                                                      } else {
                                                                        // Comportement fallback: numérotation simple 1,2,3 (sans préfixe)
                                                                        const simples = (partie.selectedSousParties || []).filter(sp => sp.numero && /^\d+$/.test(sp.numero));
                                                                        let nextSimple = 1;
                                                                        if (simples.length > 0) {
                                                                          const maxSimple = Math.max(...simples.map(sp => parseInt(sp.numero, 10)));
                                                                          nextSimple = maxSimple + 1;
                                                                        }
                                                                        onSousPartieNumeroChange(partie.id, sousPartie.id, String(nextSimple));
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
                                                                  backgroundColor: sousPartie.numero ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.5)',
                                                                  color: '#333',
                                                                  fontSize: '12px',
                                                                  fontWeight: 'bold',
                                                                  cursor: 'pointer'
                                                                }}
                                                              >
                                                                {sousPartie.numero || 'N°'}
                                                              </button>
                                                              <span style={{ fontSize: '15px' }}>{sousPartie.description}</span>
                                                            </div>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                              {/* Total des lignes de détails de la sous-partie */}
                                                              <span style={{ 
                                                                fontSize: '14px', 
                                                                fontWeight: 'bold',
                                                                marginLeft: '8px',
                                                                color: '#333'
                                                              }}>
                                                                {formatMontantEspace(
                                                                  (sousPartie.selectedLignesDetails || []).reduce((sum, ld) => 
                                                                    sum + (calculatePrice(ld) * parseFloat(ld.quantity || 0)), 0
                                                                  )
                                                                )} €
                                                              </span>
                                                              {hoveredSousPartieId === sousPartie.id && createPortal(
                                                                <div style={{
                                                                  position: 'fixed',
                                                                  top: `${hoveredSousPartiePosition?.top || 0}px`,
                                                                  left: `${(hoveredSousPartiePosition?.left || 0) + 30}px`,
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
                                                                }}
                                                                onMouseEnter={() => {
                                                                  if (sousPartieHoverTimeoutRef.current) {
                                                                    clearTimeout(sousPartieHoverTimeoutRef.current);
                                                                    sousPartieHoverTimeoutRef.current = null;
                                                                  }
                                                                  setIsSousPartieIconsAnimatingOut(false);
                                                                }}
                                                                onMouseLeave={() => {
                                                                  if (sousPartieHoverTimeoutRef.current) {
                                                                    clearTimeout(sousPartieHoverTimeoutRef.current);
                                                                  }
                                                                  sousPartieHoverTimeoutRef.current = setTimeout(() => {
                                                                    setIsSousPartieIconsAnimatingOut(true);
                                                                    setTimeout(() => {
                                                                      setHoveredSousPartieId(null);
                                                                      setHoveredSousPartiePosition(null);
                                                                      sousPartieHoverTimeoutRef.current = null;
                                                                    }, 300);
                                                                  }, 1000);
                                                                }}>
                                                                  <Tooltip title="Éditer">
                                                                    <IconButton size="small" onClick={() => onSousPartieEdit && onSousPartieEdit(partie.id, sousPartie.id)} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(33, 150, 243, 0.8)', color: 'white' }}>
                                                                      <EditIcon fontSize="small" style={{ fontSize: '14px' }} />
                                                                    </IconButton>
                                                                  </Tooltip>
                                                                  <Tooltip title="Supprimer">
                                                                    <IconButton size="small" onClick={() => onSousPartieRemove && onSousPartieRemove(partie.id, sousPartie.id)} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(244, 67, 54, 0.8)', color: 'white' }}>
                                                                      <FiX />
                                                                    </IconButton>
                                                                  </Tooltip>
                                                                </div>,
                                                                document.body
                                                              )}
                                                            </div>
                                                          </div>
                                                          
                                                          {/* Barre de recherche des lignes de détails (en dessous de la sous-partie) */}
                                                          {(!sousPartie.selectedLignesDetails || sousPartie.selectedLignesDetails.length === 0) && (
                                                            <div style={{ 
                                                              marginBottom: '8px', 
                                                              marginLeft: '20px',
                                                              maxHeight: draggedPartieId === partie.id ? '0' : '1000px',
                                                              opacity: draggedPartieId === partie.id ? 0 : 1,
                                                              overflow: 'hidden',
                                                              transition: 'max-height 0.3s ease, opacity 0.3s ease',
                                                              transform: draggedPartieId === partie.id ? 'scale(0.95)' : 'scale(1)'
                                                            }}>
                                                              <LigneDetailSearch
                                                                sousPartieId={sousPartie.id}
                                                                partieId={partie.id}
                                                                selectedLignesDetails={sousPartie.selectedLignesDetails || []}
                                                                onLigneDetailSelect={(ligne) => onLigneDetailSelect && onLigneDetailSelect(partie.id, sousPartie.id, ligne)}
                                                                onLigneDetailCreate={(spId, description) => onLigneDetailCreate && onLigneDetailCreate(spId, description)}
                                                              />
                                                            </div>
                                                          )}

                                                          {/* Lignes de détails sélectionnées par l'utilisateur */}
                                                          {sousPartie.selectedLignesDetails && sousPartie.selectedLignesDetails.length > 0 && (
                                                            <div style={{
                                                              maxHeight: draggedPartieId === partie.id ? '0' : '1000px',
                                                              opacity: draggedPartieId === partie.id ? 0 : 1,
                                                              overflow: draggedPartieId === partie.id ? 'hidden' : 'visible',
                                                              transition: 'max-height 0.3s ease, opacity 0.3s ease',
                                                              transform: draggedPartieId === partie.id ? 'scale(0.95)' : 'scale(1)'
                                                            }}>
                                                              {sousPartie.selectedLignesDetails.map((ligne, index) => (
                                                                <div
                                                                  key={`ld-sel-${sousPartie.id}-${ligne.id}-${index}`}
                                                                  style={{
                                                                    backgroundColor: '#fff',
                                                                    border: '1px solid #dee2e6',
                                                                    borderRadius: '4px',
                                                                    marginBottom: '4px',
                                                                    marginLeft: '20px',
                                                                    padding: '6px 10px',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    fontSize: '13px',
                                                                    position: 'relative',
                                                                    paddingRight: '58px'
                                                                  }}
                                                                  onMouseEnter={(e) => {
                                                                    // Annuler le timeout précédent si il existe
                                                                    if (hoverTimeoutRef.current) {
                                                                      clearTimeout(hoverTimeoutRef.current);
                                                                      hoverTimeoutRef.current = null;
                                                                    }
                                                                    setIsIconsAnimatingOut(false);
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setHoveredLigneDetailId(ligne.id);
                                                                    setHoveredLignePosition({
                                                                      top: rect.top + rect.height / 2 - 24,
                                                                      left: rect.right
                                                                    });
                                                                  }}
                                                                  onMouseLeave={() => {
                                                                    // Démarrer un timer de 1 seconde avant de cacher les icônes
                                                                    if (hoverTimeoutRef.current) {
                                                                      clearTimeout(hoverTimeoutRef.current);
                                                                    }
                                                                    hoverTimeoutRef.current = setTimeout(() => {
                                                                      setIsIconsAnimatingOut(true);
                                                                      setTimeout(() => {
                                                                        setHoveredLigneDetailId(null);
                                                                        setHoveredLignePosition(null);
                                                                        hoverTimeoutRef.current = null;
                                                                      }, 300); // Attendre la fin de l'animation
                                                                    }, 1000);
                                                                  }}
                                                                >
                                                                  {/* Désignation */}
                                                                  <div style={{ 
                                                                    flex: '0 0 50%', 
                                                                    paddingLeft: '22px', 
                                                                    textAlign: 'left',
                                                                    borderRight: '1px solid #e9ecef',
                                                                    paddingRight: '10px'
                                                                  }}>
                                                                    {ligne.description}
                                                                  </div>
                                                                  {/* U */}
                                                                  <div style={{ 
                                                                    flex: '0 0 80px', 
                                                                    textAlign: 'center',
                                                                    borderRight: '1px solid #e9ecef',
                                                                    paddingRight: '8px',
                                                                    color: '#6c757d'
                                                                  }}>
                                                                    {ligne.unite || ''}
                                                                  </div>
                                                                  {/* Quantité */}
                                                                  <div style={{ 
                                                                    flex: '0 0 100px', 
                                                                    textAlign: 'center',
                                                                    borderRight: '1px solid #e9ecef',
                                                                    paddingRight: '8px'
                                                                  }}>
                                                                    <input
                                                                      type="number"
                                                                      min="0"
                                                                      step="0.01"
                                                                      value={ligne.quantity !== undefined ? ligne.quantity.toString() : '0'}
                                                                      onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        // Si vide ou juste un point, ne pas changer la valeur
                                                                        if (value === '' || value === '.') {
                                                                          return;
                                                                        }
                                                                        const newQuantity = parseFloat(value) || 0;
                                                                        if (onLigneDetailQuantityChange) {
                                                                          onLigneDetailQuantityChange(partie.id, sousPartie.id, ligne.id, newQuantity);
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
                                                                  {/* Prix unitaire */}
                                                                  <div style={{ 
                                                                    flex: '0 0 120px', 
                                                                    textAlign: 'center',
                                                                    borderRight: '1px solid #e9ecef',
                                                                    paddingRight: '8px',
                                                                    fontWeight: 500
                                                                  }}>
                                                                    <input
                                                                      type="number"
                                                                      step="0.01"
                                                                      min="0"
                                                                      value={ligne.prix_devis !== null && ligne.prix_devis !== undefined ? ligne.prix_devis : calculatePrice(ligne)}
                                                                      onChange={(e) => {
                                                                        const value = e.target.value;
                                                                        // Si vide ou juste un point, ne pas changer la valeur
                                                                        if (value === '' || value === '.') {
                                                                          return;
                                                                        }
                                                                        const newPrice = parseFloat(value) || 0;
                                                                        if (onLigneDetailPriceChange) {
                                                                          onLigneDetailPriceChange(partie.id, sousPartie.id, ligne.id, newPrice);
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
                                                                  {/* Total HT */}
                                                                  <div style={{ 
                                                                    flex: '0 0 140px', 
                                                                    textAlign: 'right',
                                                                    fontWeight: 600,
                                                                    paddingRight: '10px'
                                                                  }}>
                                                                    {formatMontantEspace ? formatMontantEspace(calculatePrice(ligne) * (ligne.quantity || 0)) : (calculatePrice(ligne) * (ligne.quantity || 0)).toFixed(2)}
                                                                  </div>
                                                                    {hoveredLigneDetailId === ligne.id && createPortal(
                                                                    <div style={{
                                                                      position: 'fixed',
                                                                      top: `${hoveredLignePosition?.top || 0}px`,
                                                                      left: `${(hoveredLignePosition?.left || 0) + 30}px`,
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
                                                                    }}
                                                                    onMouseEnter={() => {
                                                                      // Annuler le timeout quand on survole les icônes
                                                                      if (hoverTimeoutRef.current) {
                                                                        clearTimeout(hoverTimeoutRef.current);
                                                                        hoverTimeoutRef.current = null;
                                                                      }
                                                                      setIsIconsAnimatingOut(false);
                                                                    }}
                                                                    onMouseLeave={() => {
                                                                      // Redémarrer le timer quand on quitte les icônes
                                                                      if (hoverTimeoutRef.current) {
                                                                        clearTimeout(hoverTimeoutRef.current);
                                                                      }
                                                                      hoverTimeoutRef.current = setTimeout(() => {
                                                                        setIsIconsAnimatingOut(true);
                                                                        setTimeout(() => {
                                                                          setHoveredLigneDetailId(null);
                                                                          setHoveredLignePosition(null);
                                                                          hoverTimeoutRef.current = null;
                                                                        }, 300); // Attendre la fin de l'animation
                                                                      }, 1000);
                                                                    }}>
                                                                      {/* Boutons d'action */}
                                                                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                                                                      <Tooltip title="Éditer">
                                                                        <IconButton size="small" onClick={() => { setEditContext({ partieId: partie.id, sousPartieId: sousPartie.id, ligne }); setIsEditOpen(true); }} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(33, 150, 243, 0.8)', color: 'white' }}>
                                                                          <EditIcon fontSize="small" style={{ fontSize: '14px' }} />
                                                                        </IconButton>
                                                                      </Tooltip>
                                                                      <Tooltip title="Retirer du devis">
                                                                        <IconButton size="small" onClick={() => onLigneDetailRemove && onLigneDetailRemove(partie.id, sousPartie.id, ligne.id)} style={{ width: '24px', height: '24px', padding: '4px', backgroundColor: 'rgba(244, 67, 54, 0.8)', color: 'white' }}>
                                                                          <FiX />
                                                                        </IconButton>
                                                                      </Tooltip>
                                                                    </div>
                                                                    {/* Contrôles de marge */}
                                                                    <div style={{ display: 'flex', flexDirection: 'row', gap: '6px', alignItems: 'center', flex: 1 }}>
                                                                      <input
                                                                        type="number"
                                                                        step="0.01"
                                                                        min="0"
                                                                        max="100"
                                                                        value={ligne.marge_devis !== null && ligne.marge_devis !== undefined ? ligne.marge_devis : ligne.marge}
                                                                        onChange={(e) => {
                                                                          if (onLigneDetailMargeChange) {
                                                                            onLigneDetailMargeChange(partie.id, sousPartie.id, ligne.id, parseFloat(e.target.value) || 0);
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
                                                                      <div style={{ fontSize: '12px', color: '#666', fontWeight: '600' }}>
                                                                        %
                                                                      </div>
                                                                      <input
                                                                        type="range"
                                                                        min="0"
                                                                        max="100"
                                                                        step="0.01"
                                                                        value={ligne.marge_devis !== null && ligne.marge_devis !== undefined ? ligne.marge_devis : ligne.marge}
                                                                        onChange={(e) => {
                                                                          if (onLigneDetailMargeChange) {
                                                                            onLigneDetailMargeChange(partie.id, sousPartie.id, ligne.id, parseFloat(e.target.value));
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
                                                                  )}
                                                                </div>
                                                              ))}
                                                          </div>
                                                        )}
                                                        
                                                        {/* Barre de recherche en bas si des lignes sont déjà sélectionnées */}
                                                        {sousPartie.selectedLignesDetails && sousPartie.selectedLignesDetails.length > 0 && (
                                                          <div style={{ 
                                                            maxHeight: draggedPartieId === partie.id ? '0' : '1000px',
                                                            opacity: draggedPartieId === partie.id ? 0 : 1,
                                                            overflow: 'hidden',
                                                            transition: 'max-height 0.3s ease, opacity 0.3s ease',
                                                            transform: draggedPartieId === partie.id ? 'scale(0.95)' : 'scale(1)'
                                                          }}>
                                                            <div style={{ marginBottom: '8px', marginLeft: '20px' }}>
                                                              <LigneDetailSearch
                                                                sousPartieId={sousPartie.id}
                                                                partieId={partie.id}
                                                                selectedLignesDetails={sousPartie.selectedLignesDetails || []}
                                                                onLigneDetailSelect={(ligne) => onLigneDetailSelect && onLigneDetailSelect(partie.id, sousPartie.id, ligne)}
                                                                onLigneDetailCreate={(spId, description) => onLigneDetailCreate && onLigneDetailCreate(spId, description)}
                                                              />
                                                            </div>
                                                          </div>
                                                        )}
                                                      </div>
                                                    )}
                                                  </Draggable>
                                                  </React.Fragment>
                                                ))}
                                                {provided.placeholder}
                                              </div>
                                            )}
                                          </Droppable>
                                        </DragDropContext>
                                        
                                        {/* Barre de recherche en bas de la liste */}
                                        <div style={{ marginTop: '12px' }}>
                                          <SousPartieSearch
                                            partieId={partie.id}
                                            selectedSousParties={partie.selectedSousParties || []}
                                            onSousPartieSelect={(sousPartie) => onSousPartieSelect && onSousPartieSelect(partie.id, sousPartie)}
                                            onSousPartieCreate={(partieId, description) => onSousPartieCreate && onSousPartieCreate(partieId, description)}
                                          />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                    
                    {/* Lignes spéciales placées (système unifié) - Dans le même DragDropContext */}
                    {devisItems && devisItems.filter(item => item.type === 'ligne_speciale').length > 0 && (
                      <div style={{ marginTop: '15px', marginBottom: '15px', paddingLeft: '0' }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: 'bold', 
                          color: '#1976d2', 
                          marginBottom: '8px',
                          paddingLeft: '0'
                        }}>
                          ✨ LIGNES SPÉCIALES PLACÉES
                        </div>
                        <Droppable droppableId="placed-special-lines">
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              style={{
                                backgroundColor: snapshot.isDraggingOver ? 'rgba(27, 120, 188, 0.05)' : 'transparent',
                                padding: '5px 0',
                                minHeight: '50px'
                              }}
                            >
                              {devisItems
                                .filter(item => item.type === 'ligne_speciale')
                                .sort((a, b) => a.index_global - b.index_global)
                                .map((line, index) => (
                                  <Draggable
                                    key={`placed_${line.id}`}
                                    draggableId={`placed_${line.id}`}
                                    index={index}
                                  >
                                    {(provided, snapshot) => (
                                      <LigneSpecialeRow
                                        line={line}
                                        provided={provided}
                                        snapshot={snapshot}
                                        depth={0}
                                        formatMontantEspace={formatMontantEspace}
                                      />
                                    )}
                                  </Draggable>
                                ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    )}
                    
                    {/* PendingSpecialLines dans le même DragDropContext */}
                    {pendingSpecialLines && pendingSpecialLines.length > 0 && (
                      <div style={{ marginTop: '10px' }}>
                        <div style={{ 
                          fontSize: '14px', 
                          fontWeight: 'bold', 
                          color: '#ffa500', 
                          marginBottom: '5px' 
                        }}>
                          📦 EN ATTENTE
                        </div>
                        <PendingSpecialLines
                          lines={pendingSpecialLines}
                          onEdit={onEditSpecialLine}
                          onRemove={onRemovePendingSpecialLine}
                          formatMontantEspace={formatMontantEspace}
                          setHoveredSpecialLineId={setHoveredSpecialLineId}
                          setHoveredSpecialLinePosition={setHoveredSpecialLinePosition}
                          setIsSpecialLineIconsAnimatingOut={setIsSpecialLineIconsAnimatingOut}
                          specialLineHoverTimeoutRef={specialLineHoverTimeoutRef}
                          isSpecialLineIconsAnimatingOut={isSpecialLineIconsAnimatingOut}
                          hoveredSpecialLineId={hoveredSpecialLineId}
                        />
                      </div>
                    )}
                  </DragDropContext>
                </td>
              </tr>
            )}
            
            {/* Portails pour les icônes de hover des lignes spéciales */}
            {pendingSpecialLines && pendingSpecialLines.map(line => (
              hoveredSpecialLineId === line.id && createPortal(
                <div style={{
                  position: 'fixed',
                  top: `${hoveredSpecialLinePosition?.top || 0}px`,
                  left: `${(hoveredSpecialLinePosition?.left || 0) + 30}px`,
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
                onMouseEnter={() => {
                  if (specialLineHoverTimeoutRef.current) {
                    clearTimeout(specialLineHoverTimeoutRef.current);
                    specialLineHoverTimeoutRef.current = null;
                  }
                  setIsSpecialLineIconsAnimatingOut(false);
                }}
                onMouseLeave={() => {
                  if (specialLineHoverTimeoutRef.current) {
                    clearTimeout(specialLineHoverTimeoutRef.current);
                  }
                  specialLineHoverTimeoutRef.current = setTimeout(() => {
                    setIsSpecialLineIconsAnimatingOut(true);
                    setTimeout(() => {
                      setHoveredSpecialLineId(null);
                      setHoveredSpecialLinePosition(null);
                      specialLineHoverTimeoutRef.current = null;
                    }, 300);
                  }, 1000);
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
            
            {selectedParties.length === 0 && (
                <tr>
                  <td colSpan="5" style={{
                    padding: '40px 20px',
                    textAlign: 'center',
                    color: '#6c757d',
                    fontStyle: 'italic',
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{ fontSize: '16px', marginBottom: '8px' }}>
                      🔍 Aucune partie sélectionnée
                    </div>
                    <div style={{ fontSize: '14px' }}>
                      Utilisez la barre de recherche ci-dessous pour ajouter des parties
                    </div>
                  </td>
                </tr>
              )}
              
              {/* Lignes spéciales globales */}
              {special_lines_global.map((special_line, index) => (
                <React.Fragment key={index}>
                  <tr className="special-line-spacer"><td colSpan="5"></td></tr>
                  <tr className={`${special_line.isHighlighted ? 'highlighted' : ''} ${special_line.type === 'display' ? 'display-only' : ''}`}>
                    <td colSpan="4" className={`special-line ${special_line.type === 'display' ? 'display-line' : ''}`}>
                      <span style={{ maxWidth: '430px', wordWrap: 'break-word', wordBreak: 'break-word', display: 'inline-block' }}>
                        {special_line.description}
                      </span>
                    </td>
                    <td className="totalHttableau">
                      {special_line.type === 'reduction' && '-'}
                      {special_line.type !== 'display' ? formatMontantEspace(special_line.montant) : formatMontantEspace(special_line.value)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}

            {/* Montant global HT */}
            <tr style={{ backgroundColor: '#f8f9fa', borderTop: '2px solid #1976d2' }}>
              <td colSpan="4" style={{
                padding: '15px 20px',
                fontWeight: 'bold',
                fontSize: '16px',
                color: '#1976d2',
                border: '1px solid #dee2e6'
              }}>
                💰 MONTANT GLOBAL HT
              </td>
              <td style={{
                padding: '15px',
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: '18px',
                color: '#1976d2',
                border: '1px solid #dee2e6'
              }}>
                {formatMontantEspace(total_ht)} €
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {isEditOpen && editContext && (
        <LigneDetailEditModal
          isOpen={isEditOpen}
          onClose={() => setIsEditOpen(false)}
          ligneDetail={editContext.ligne}
          onSuccess={(updated) => {
            if (editContext?.ligne) {
              Object.assign(editContext.ligne, {
                description: updated.description,
                unite: updated.unite,
                cout_main_oeuvre: updated.cout_main_oeuvre,
                cout_materiel: updated.cout_materiel,
                taux_fixe: updated.taux_fixe,
                marge: updated.marge,
                prix: updated.prix
              });
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
          onClose={() => setShowCreateModal(false)}
          onAddPendingLine={onAddPendingSpecialLine}
          formatMontantEspace={formatMontantEspace}
          selectedParties={selectedParties}
          calculatePartieTotal={calculatePartieTotal}
          calculateSousPartieTotal={calculateSousPartieTotal}
          calculatePrice={calculatePrice}
          calculateGlobalTotal={calculateGlobalTotal}
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
    </div>
  );
};

export default DevisTable;
