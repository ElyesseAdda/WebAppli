import React from 'react';
import { Draggable } from 'react-beautiful-dnd';

const DraggableSpecialLine = ({ line, index, onEdit, onRemove, formatMontantEspace, setHoveredSpecialLineId, setHoveredSpecialLinePosition, setIsSpecialLineIconsAnimatingOut, hoverTimeoutRef, isSpecialLineIconsAnimatingOut, hoveredSpecialLineId }) => {
  // Calculer le montant
  const calculateAmount = () => {
    if (line.data.valueType === 'percentage' && line.baseCalculation) {
      const baseAmount = line.baseCalculation.amount || 0;
      const percentage = line.data.value || 0;
      return (baseAmount * percentage) / 100;
    }
    return line.data.value || 0;
  };

  const amount = calculateAmount();

  return (
    <Draggable draggableId={`pending_${line.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          style={{
            ...provided.draggableProps.style,
            marginBottom: '8px'
          }}
        >
          <div 
            style={{ 
              backgroundColor: line.styles?.backgroundColor || 'rgba(27, 120, 188, 1)',
              color: line.styles?.color || 'white',
              fontWeight: line.styles?.fontWeight || 'bold',
              padding: '15px 20px',
              textAlign: 'left',
              fontSize: '16px',
              border: '1px solid',
              borderColor: line.styles?.backgroundColor || 'rgba(27, 120, 188, 1)',
              borderRadius: '4px',
              boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.3)' : '0 2px 4px rgba(0,0,0,0.1)',
              cursor: snapshot.isDragging ? 'grabbing' : 'grab',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              opacity: snapshot.isDragging ? 0.8 : 1,
              position: 'relative',
              borderLeft: line.styles?.borderLeft || 'none',
              fontStyle: line.styles?.fontStyle || 'normal',
              textDecoration: line.styles?.textDecoration || 'none'
            }}
            onMouseEnter={(e) => {
              if (snapshot.isDragging) return;
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
                hoverTimeoutRef.current = null;
              }
              setIsSpecialLineIconsAnimatingOut(false);
              const rect = e.currentTarget.getBoundingClientRect();
              setHoveredSpecialLineId(line.id);
              setHoveredSpecialLinePosition({
                top: rect.top + rect.height / 2 - 12,
                left: rect.right
              });
            }}
            onMouseLeave={() => {
              if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
              }
              hoverTimeoutRef.current = setTimeout(() => {
                setIsSpecialLineIconsAnimatingOut(true);
                setTimeout(() => {
                  setHoveredSpecialLineId(null);
                  setHoveredSpecialLinePosition(null);
                  hoverTimeoutRef.current = null;
                }, 300);
              }, 1000);
            }}
          >
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
              <span>{line.data.description || "Ligne spéciale"}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 'bold',
                marginLeft: '10px',
                color: line.data.type === 'reduction' ? '#d32f2f' : line.data.type === 'addition' ? '#1976d2' : '#9e9e9e'
              }}>
                {formatMontantEspace(amount)} €
              </span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
};

export default DraggableSpecialLine;

