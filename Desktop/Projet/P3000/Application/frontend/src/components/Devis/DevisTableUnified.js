import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { Tooltip, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { FiX } from 'react-icons/fi';
import SousPartieSearch from './SousPartieSearch';
import LigneDetailSearch from './LigneDetailSearch';
import LigneSpecialeRow from './LignesSpeciales/LigneSpecialeRow';
import { COLORS } from '../../constants/colors';

/**
 * Rendu unifié avec Droppables hiérarchiques
 * Permet de respecter la hiérarchie tout en plaçant les lignes spéciales n'importe où
 */
const DevisTableUnified = ({
  devisItems,
  selectedParties,
  formatMontantEspace,
  calculatePrice,
  onPartieEdit,
  onPartieRemove,
  onSousPartieSelect,
  onSousPartieCreate,
  onSousPartieEdit,
  onSousPartieRemove,
  onLigneDetailSelect,
  onLigneDetailCreate,
  onLigneDetailEdit,
  onLigneDetailRemove,
  onLigneDetailQuantityChange,
  onLigneDetailPriceChange,
  onLigneDetailMargeChange,
  handleToggleNumber,
  // États hover
  hoveredPartieId,
  setHoveredPartieId,
  hoveredPartiePosition,
  setHoveredPartiePosition,
  isPartieIconsAnimatingOut,
  setIsPartieIconsAnimatingOut,
  partieHoverTimeoutRef,
  hoveredSousPartieId,
  setHoveredSousPartieId,
  hoveredSousPartiePosition,
  setHoveredSousPartiePosition,
  isSousPartieIconsAnimatingOut,
  setIsSousPartieIconsAnimatingOut,
  sousPartieHoverTimeoutRef,
  hoveredLigneDetailId,
  setHoveredLigneDetailId,
  hoveredLignePosition,
  setHoveredLignePosition,
  isIconsAnimatingOut,
  setIsIconsAnimatingOut,
  hoverTimeoutRef,
  setIsEditOpen,
  setEditContext
}) => {
  
  // Filtrer les éléments par type et contexte
  const getPartiesGlobales = () => devisItems.filter(item => item.type === 'partie');
  
  const getSousPartiesDansPartie = (partieId) => 
    devisItems.filter(item => item.type === 'sous_partie' && item.partie_id === partieId);
  
  const getLignesDetailsDansSousPartie = (spId) => 
    devisItems.filter(item => item.type === 'ligne_detail' && item.sous_partie_id === spId);
  
  const getLignesSpecialesGlobales = () => 
    devisItems.filter(item => item.type === 'ligne_speciale' && item.context_type === 'global');
  
  const getLignesSpecialesDansPartie = (partieId) => 
    devisItems.filter(item => item.type === 'ligne_speciale' && item.context_type === 'partie' && item.context_id === partieId);
  
  const getLignesSpecialesDansSousPartie = (spId) => 
    devisItems.filter(item => item.type === 'ligne_speciale' && item.context_type === 'sous_partie' && item.context_id === spId);

  const parties = getPartiesGlobales();

  return (
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
          {/* Lignes spéciales globales (avant les parties) */}
          {getLignesSpecialesGlobales()
            .filter(ls => ls.position_in_context === 0)
            .map((line) => (
              <div key={`special-global-${line.id}`} style={{ marginBottom: '8px' }}>
                <LigneSpecialeRow
                  line={line}
                  provided={{ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }}
                  snapshot={{ isDragging: false }}
                  depth={0}
                  formatMontantEspace={formatMontantEspace}
                />
              </div>
            ))}
          
          {parties.map((partie, partieIndex) => (
            <Draggable 
              key={`partie_${partie.id}`} 
              draggableId={`partie_${partie.id}`} 
              index={partieIndex}
            >
              {(dragProvided, dragSnapshot) => (
                <div
                  ref={dragProvided.innerRef}
                  {...dragProvided.draggableProps}
                  style={{
                    ...dragProvided.draggableProps.style,
                    marginBottom: '12px'
                  }}
                >
                  {/* EN-TÊTE DE LA PARTIE */}
                  <div 
                    style={{ 
                      backgroundColor: 'rgba(27, 120, 188, 1)', 
                      color: 'white',
                      fontWeight: 'bold',
                      padding: '15px 20px',
                      fontSize: '16px',
                      borderRadius: '4px 4px 0 0',
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
                      if (partieHoverTimeoutRef.current) clearTimeout(partieHoverTimeoutRef.current);
                      setIsPartieIconsAnimatingOut(false);
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredPartieId(partie.id);
                      setHoveredPartiePosition({
                        top: rect.top + rect.height / 2 - 12,
                        left: rect.right
                      });
                    }}
                    onMouseLeave={() => {
                      if (partieHoverTimeoutRef.current) clearTimeout(partieHoverTimeoutRef.current);
                      partieHoverTimeoutRef.current = setTimeout(() => {
                        setIsPartieIconsAnimatingOut(true);
                        setTimeout(() => {
                          setHoveredPartieId(null);
                          setHoveredPartiePosition(null);
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
                          handleToggleNumber(partie.id);
                        }}
                        style={{
                          width: '50px',
                          height: '32px',
                          border: '1px solid rgba(255,255,255,0.3)',
                          borderRadius: '4px',
                          backgroundColor: partie.numero ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
                        title={partie.numero ? "Enlever le numéro" : "Attribuer un numéro"}
                      >
                        {partie.numero || 'N°'}
                      </button>
                      
                      <span>{partie.titre}</span>
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                      {formatMontantEspace(0)} €
                    </span>
                  </div>
                  
                  {/* ZONE DES SOUS-PARTIES */}
                  <div style={{ 
                    backgroundColor: COLORS.backgroundAlt,
                    padding: '12px 20px',
                    border: '1px solid #dee2e6',
                    borderTop: 'none',
                    borderRadius: '0 0 4px 4px'
                  }}>
                    <Droppable droppableId={`sous-parties-${partie.id}`} type="SOUS_PARTIE">
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
                          {getSousPartiesDansPartie(partie.id).map((sp, spIndex) => (
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
                                  <div style={{ 
                                    backgroundColor: 'rgb(157, 197, 226)',
                                    color: '#333',
                                    padding: '10px 15px',
                                    borderRadius: '4px 4px 0 0',
                                    boxShadow: spDragSnapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.1)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    fontWeight: '600'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div {...spDragProvided.dragHandleProps} style={{ cursor: 'grab', padding: '4px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.1)' }}>
                                        ⋮⋮
                                      </div>
                                      {sp.numero && <span>{sp.numero}</span>}
                                      <span>{sp.description}</span>
                                    </div>
                                    <span>{formatMontantEspace(0)} €</span>
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
                                          {getLignesDetailsDansSousPartie(sp.id).map((ligne, ligneIndex) => {
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
                                                    <div style={{ 
                                                      backgroundColor: '#fff',
                                                      border: '1px solid #dee2e6',
                                                      borderRadius: '4px',
                                                      padding: '6px 10px',
                                                      display: 'flex',
                                                      alignItems: 'center',
                                                      justifyContent: 'space-between',
                                                      fontSize: '13px'
                                                    }}>
                                                      <div {...ldDragProvided.dragHandleProps} style={{ cursor: 'grab', marginRight: '8px' }}>⋮</div>
                                                      <div style={{ flex: '0 0 50%' }}>{ligne.description}</div>
                                                      <div style={{ flex: '0 0 80px', textAlign: 'center' }}>{ligne.unite}</div>
                                                      <div style={{ flex: '0 0 100px', textAlign: 'center' }}>
                                                        <input
                                                          type="number"
                                                          min="0"
                                                          step="0.01"
                                                          value={ligne.quantity || 0}
                                                          onChange={(e) => {
                                                            if (onLigneDetailQuantityChange) {
                                                              onLigneDetailQuantityChange(partie.id, sp.id, ligne.id, parseFloat(e.target.value) || 0);
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
                                                      <div style={{ flex: '0 0 120px', textAlign: 'center' }}>{formatMontantEspace(prix)} €</div>
                                                      <div style={{ flex: '0 0 140px', textAlign: 'right', fontWeight: 600 }}>{formatMontantEspace(total)} €</div>
                                                    </div>
                                                  </div>
                                                )}
                                              </Draggable>
                                            );
                                          })}
                                          
                                          {/* Lignes spéciales dans cette sous-partie */}
                                          {getLignesSpecialesDansSousPartie(sp.id).map((line) => (
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
                                        partieId={partie.id}
                                        selectedLignesDetails={sp.selectedLignesDetails || []}
                                        onLigneDetailSelect={(ligne) => onLigneDetailSelect && onLigneDetailSelect(partie.id, sp.id, ligne)}
                                        onLigneDetailCreate={(spId, description) => onLigneDetailCreate && onLigneDetailCreate(spId, description)}
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          
                          {/* Lignes spéciales dans cette partie (mais pas dans une sous-partie) */}
                          {getLignesSpecialesDansPartie(partie.id).map((line) => (
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
                        partieId={partie.id}
                        selectedSousParties={partie.selectedSousParties || []}
                        onSousPartieSelect={(sousPartie) => onSousPartieSelect && onSousPartieSelect(partie.id, sousPartie)}
                        onSousPartieCreate={(partieId, description) => onSousPartieCreate && onSousPartieCreate(partieId, description)}
                      />
                    </div>
                  </div>
                </div>
              )}
            </Draggable>
          ))}
          
          {/* Lignes spéciales globales (après les parties) */}
          {getLignesSpecialesGlobales()
            .filter(ls => ls.position_in_context > 0)
            .map((line) => (
              <div key={`special-global-end-${line.id}`} style={{ marginBottom: '8px' }}>
                <LigneSpecialeRow
                  line={line}
                  provided={{ innerRef: () => {}, draggableProps: {}, dragHandleProps: {} }}
                  snapshot={{ isDragging: false }}
                  depth={0}
                  formatMontantEspace={formatMontantEspace}
                />
              </div>
            ))}
          
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

export default DevisTableUnified;

