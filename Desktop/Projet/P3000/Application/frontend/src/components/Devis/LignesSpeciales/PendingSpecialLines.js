import React from 'react';
import { Droppable } from 'react-beautiful-dnd';
import DraggableSpecialLine from './DraggableSpecialLine';

const PendingSpecialLines = ({ 
  lines, 
  onEdit, 
  onRemove, 
  formatMontantEspace,
  setHoveredSpecialLineId,
  setHoveredSpecialLinePosition,
  setIsSpecialLineIconsAnimatingOut,
  specialLineHoverTimeoutRef,
  isSpecialLineIconsAnimatingOut,
  hoveredSpecialLineId
}) => {
  return (
    <Droppable droppableId="pending-special-lines">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          style={{
            minHeight: '100px',
            backgroundColor: snapshot.isDraggingOver ? '#fff9e6' : 'transparent',
            borderRadius: '4px',
            transition: 'background-color 0.2s ease'
          }}
        >
          {lines.map((line, index) => (
            <DraggableSpecialLine
              key={line.id}
              line={line}
              index={index}
              onEdit={onEdit}
              onRemove={onRemove}
              formatMontantEspace={formatMontantEspace}
              setHoveredSpecialLineId={setHoveredSpecialLineId}
              setHoveredSpecialLinePosition={setHoveredSpecialLinePosition}
              setIsSpecialLineIconsAnimatingOut={setIsSpecialLineIconsAnimatingOut}
              hoverTimeoutRef={specialLineHoverTimeoutRef}
              isSpecialLineIconsAnimatingOut={isSpecialLineIconsAnimatingOut}
              hoveredSpecialLineId={hoveredSpecialLineId}
            />
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

export default PendingSpecialLines;

