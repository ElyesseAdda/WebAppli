import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const TestDragSimple = () => {
  const [items, setItems] = useState([
    { id: '1', content: 'Partie 1' },
    { id: '2', content: 'Partie 2' },
    { id: '3', content: 'Partie 3' }
  ]);

  const handleDragEnd = (result) => {
    console.log('🎯 Drag end:', result);
    
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    setItems(newItems);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Test Drag & Drop Simple</h2>
      <p>Cliquez et glissez les éléments pour les réorganiser</p>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="list">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={{
                backgroundColor: snapshot.isDraggingOver ? '#f0f8ff' : '#f9f9f9',
                padding: '10px',
                borderRadius: '8px',
                minHeight: '200px'
              }}
            >
              {items.map((item, index) => (
                <Draggable key={item.id} draggableId={item.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={{
                        userSelect: 'none',
                        padding: '16px',
                        margin: '0 0 8px 0',
                        backgroundColor: snapshot.isDragging ? '#e3f2fd' : '#fff',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        boxShadow: snapshot.isDragging ? '0 4px 8px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
                        cursor: 'grab',
                        ...provided.draggableProps.style
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          backgroundColor: '#1976d2',
                          color: 'white',
                          borderRadius: '50%',
                          width: '30px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold'
                        }}>
                          {index + 1}
                        </div>
                        <span>{item.content}</span>
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
    </div>
  );
};

export default TestDragSimple;

