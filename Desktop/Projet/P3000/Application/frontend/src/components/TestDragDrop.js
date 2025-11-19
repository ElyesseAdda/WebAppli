import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const TestDragDrop = () => {
  const [items, setItems] = useState([
    { id: '1', content: 'Partie 1 - Peinture des murs', numero: '1' },
    { id: '2', content: 'Partie 2 - Peinture des plafonds', numero: '2' },
    { id: '3', content: 'Partie 3 - Nettoyage général', numero: '3' },
    { id: '4', content: 'Partie 4 - Finitions', numero: '4' }
  ]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const newItems = Array.from(items);
    const [reorderedItem] = newItems.splice(result.source.index, 1);
    newItems.splice(result.destination.index, 0, reorderedItem);

    // Mise à jour des numéros automatiques
    const updatedItems = newItems.map((item, index) => ({
      ...item,
      numero: (index + 1).toString()
    }));

    setItems(updatedItems);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: '0 auto' }}>
      <h2>Test Drag & Drop - Parties</h2>
      <p>Glissez-déposez les parties pour les réorganiser. Les numéros se mettent à jour automatiquement.</p>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="parties">
          {(provided, snapshot) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              style={{
                backgroundColor: snapshot.isDraggingOver ? '#f0f8ff' : '#f9f9f9',
                padding: '10px',
                borderRadius: '8px',
                border: '2px dashed #ccc',
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
                        display: 'flex',
                        alignItems: 'center',
                        gap: '15px',
                        ...provided.draggableProps.style
                      }}
                    >
                      <div style={{
                        backgroundColor: '#1976d2',
                        color: 'white',
                        borderRadius: '50%',
                        width: '30px',
                        height: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 'bold',
                        fontSize: '14px'
                      }}>
                        {item.numero}
                      </div>
                      
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                          {item.content}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          ID: {item.id} | Position: {index + 1}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#4caf50',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          ✏️
                        </button>
                        <button
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          🗑️
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
      
      <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
        <h4>État actuel :</h4>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(items, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default TestDragDrop;

