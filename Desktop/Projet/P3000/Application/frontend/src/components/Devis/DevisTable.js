import React from 'react';
import { FiX } from 'react-icons/fi';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import PartieSearch from './PartieSearch';
import SousPartieSearch from './SousPartieSearch';

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
  onSousPartiesReorder
}) => {
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
                                    opacity: snapshot.isDragging ? 0.8 : 1
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
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onPartieEdit && onPartieEdit(partie.id);
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: '28px',
                                          height: '28px',
                                          border: 'none',
                                          backgroundColor: 'rgba(33, 150, 243, 0.8)',
                                          color: 'white',
                                          borderRadius: '50%',
                                          cursor: 'pointer',
                                          fontSize: '14px',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => {
                                          e.target.style.backgroundColor = 'rgba(33, 150, 243, 1)';
                                          e.target.style.transform = 'scale(1.1)';
                                        }}
                                        onMouseOut={(e) => {
                                          e.target.style.backgroundColor = 'rgba(33, 150, 243, 0.8)';
                                          e.target.style.transform = 'scale(1)';
                                        }}
                                        title="Éditer cette partie"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onPartieRemove(partie.id);
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          width: '28px',
                                          height: '28px',
                                          border: 'none',
                                          backgroundColor: 'rgba(244, 67, 54, 0.8)',
                                          color: 'white',
                                          borderRadius: '50%',
                                          cursor: 'pointer',
                                          fontSize: '14px',
                                          transition: 'all 0.2s ease'
                                        }}
                                        onMouseOver={(e) => {
                                          e.target.style.backgroundColor = 'rgba(244, 67, 54, 1)';
                                          e.target.style.transform = 'scale(1.1)';
                                        }}
                                        onMouseOut={(e) => {
                                          e.target.style.backgroundColor = 'rgba(244, 67, 54, 0.8)';
                                          e.target.style.transform = 'scale(1)';
                                        }}
                                        title="Supprimer cette partie"
                                      >
                                        <FiX />
                                      </button>
                                      <span style={{ 
                                        fontSize: '16px', 
                                        fontWeight: 'bold',
                                        marginLeft: '10px'
                                      }}>
                                        {formatMontantEspace(partie.total_partie || 0)} €
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Section des sous-parties */}
                                  <div style={{ 
                                    backgroundColor: '#f8f9fa',
                                    padding: '20px',
                                    border: '1px solid #dee2e6',
                                    borderTop: 'none',
                                    borderRadius: '0 0 4px 4px'
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
                                          onDragEnd={(result) => {
                                            if (result.destination && onSousPartiesReorder) {
                                              onSousPartiesReorder(partie.id, result);
                                            }
                                          }}
                                        >
                                          <Droppable droppableId={`sous-parties-${partie.id}`}>
                                            {(provided) => (
                                              <div {...provided.droppableProps} ref={provided.innerRef}>
                                                {partie.selectedSousParties.map((sousPartie, spIndex) => (
                                                  <Draggable
                                                    key={String(sousPartie.id)}
                                                    draggableId={String(sousPartie.id)}
                                                    index={spIndex}
                                                  >
                                                    {(provided, snapshot) => (
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
                                                          fontWeight: '600'
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
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              onSousPartieEdit && onSousPartieEdit(partie.id, sousPartie.id);
                                                            }}
                                                            style={{
                                                              display: 'flex',
                                                              alignItems: 'center',
                                                              justifyContent: 'center',
                                                              width: '24px',
                                                              height: '24px',
                                                              border: 'none',
                                                              backgroundColor: 'rgba(33, 150, 243, 0.8)',
                                                              color: 'white',
                                                              borderRadius: '50%',
                                                              cursor: 'pointer',
                                                              fontSize: '12px'
                                                            }}
                                                            title="Éditer cette sous-partie"
                                                          >
                                                            ✏️
                                                          </button>
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              onSousPartieRemove && onSousPartieRemove(partie.id, sousPartie.id);
                                                            }}
                                                            style={{
                                                              display: 'flex',
                                                              alignItems: 'center',
                                                              justifyContent: 'center',
                                                              width: '24px',
                                                              height: '24px',
                                                              border: 'none',
                                                              backgroundColor: 'rgba(244, 67, 54, 0.8)',
                                                              color: 'white',
                                                              borderRadius: '50%',
                                                              cursor: 'pointer',
                                                              fontSize: '12px'
                                                            }}
                                                            title="Supprimer cette sous-partie"
                                                          >
                                                            <FiX />
                                                          </button>
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
    </div>
  );
};

export default DevisTable;
