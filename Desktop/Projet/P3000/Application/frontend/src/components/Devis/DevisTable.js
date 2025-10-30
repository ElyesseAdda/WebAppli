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
  onLigneDetailPriceChange
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
    };
  }, []);

  // Déclencher l'animation d'entrée quand les icônes apparaissent
  useEffect(() => {
    if (hoveredLigneDetailId) {
      // Fermer les autres panneaux hover
      setHoveredPartieId(null);
      setHoveredSousPartieId(null);
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
      setHoveredPartieId(null);
      setHoveredLigneDetailId(null);
      setIsSousPartieIconsAnimatingOut(true);
      setTimeout(() => {
        setIsSousPartieIconsAnimatingOut(false);
      }, 10);
    }
  }, [hoveredSousPartieId]);

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
    console.log('🎯 Drag end result:', result);
    
    if (!result.destination) {
      console.log('❌ Pas de destination, annulation du drag');
      return;
    }

    if (result.source.index === result.destination.index) {
      console.log('❌ Même position, pas de changement');
      return;
    }

    console.log(`🔄 Déplacement de l'index ${result.source.index} vers ${result.destination.index}`);

    const newParties = Array.from(selectedParties);
    const [reorderedItem] = newParties.splice(result.source.index, 1);
    newParties.splice(result.destination.index, 0, reorderedItem);

    // Mise à jour des numéros automatiques
    // Stratégie : 
    // 1. Si pas de numéro → on ne touche pas (garder vide)
    // 2. Si numéro simple (1, 2, 3...) → numéro automatique selon la position parmi les parties numérotées
    // 3. Si numéro personnalisé (A, 1.1, etc.) → garder le numéro personnalisé
    const updatedParties = newParties.map((partie, index) => {
      // Si pas de numéro, on le garde vide
      if (!partie.numero) {
        return {
          ...partie,
          ordre: index
        };
      }
      
      // Si le numéro est juste un chiffre simple (1, 2, 3...), on le met à jour selon la position
      if (/^\d+$/.test(partie.numero)) {
        // Compter combien de parties AVANT celle-ci ont un numéro simple
        const partiesAvantAvecNumero = newParties.slice(0, index).filter(p => p.numero && /^\d+$/.test(p.numero));
        const newIndex = partiesAvantAvecNumero.length + 1;
        
        return {
          ...partie,
          numero: newIndex.toString(),
          ordre: index
        };
      }
      
      // Sinon, c'est un numéro personnalisé, on le garde
      return {
        ...partie,
        ordre: index
      };
    });

    console.log('✅ Nouvelles parties:', updatedParties);

    // Appeler la fonction de callback pour mettre à jour l'état parent
    if (onPartiesReorder) {
      onPartiesReorder(updatedParties);
    }
  };

  // Fonction pour gérer le début du drag
  const handleDragStart = (start) => {
    console.log('🚀 Drag start:', start);
  };

  // Fonction pour gérer la mise à jour pendant le drag
  const handleDragUpdate = (update) => {
    console.log('🔄 Drag update:', update);
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

      
      {/* Tableau principal */}
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
            {/* Nature des travaux */}
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

              
            {/* Barre de recherche initiale - Quand aucune partie */}
            {selectedParties.length === 0 && (
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


            {/* Parties sélectionnées avec Drag & Drop */}
            {selectedParties.length > 0 && (
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
                                            console.log('🎯 Drag start sous-partie:', start);
                                            setDraggedPartieId(partie.id);
                                          }}
                                          onDragEnd={(result) => {
                                            console.log('🎯 Drag end sous-partie:', result);
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
                                                                      transform: `translateY(30%) translateX(${isIconsAnimatingOut ? '-100%' : '0'})`,
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
                  </DragDropContext>
                </td>
              </tr>
            )}
            
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

            {/* Barre de recherche des parties - En bas des parties (seulement si des parties existent) */}
            {selectedParties.length > 0 && (
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
    </div>
  );
};

export default DevisTable;
