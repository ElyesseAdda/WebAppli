# 🚀 Implémentation Rendu Unifié - Solution Rapide

## 📝 **PLAN**

Afficher `devisItems` dans l'ordre de `index_global`, en gardant la même structure visuelle.

---

## 🔧 **CODE À AJOUTER**

### **Dans DevisTable.js, remplacer le rendu des parties par :**

```javascript
{/* Rendu unifié ou legacy selon devisItems */}
{useUnifiedRender ? (
  // RENDU UNIFIÉ : Afficher devisItems dans l'ordre
  <DragDropContext onDragEnd={handleDragEnd}>
    <Droppable droppableId="unified-items">
      {(provided, snapshot) => (
        <div ref={provided.innerRef} {...provided.droppableProps}>
          {devisItems
            .sort((a, b) => a.index_global - b.index_global)
            .map((item, index) => {
              const depth = getItemDepth(item, devisItems);
              
              return (
                <Draggable 
                  key={`${item.type}_${item.id}`} 
                  draggableId={`${item.type}_${item.id}`} 
                  index={index}
                >
                  {(provided, snapshot) => {
                    // Render selon le type
                    if (item.type === 'partie') {
                      return <PartieRowUnified item={item} provided={provided} snapshot={snapshot} />;
                    }
                    if (item.type === 'sous_partie') {
                      return <SousPartieRowUnified item={item} provided={provided} snapshot={snapshot} depth={1} />;
                    }
                    if (item.type === 'ligne_detail') {
                      return <LigneDetailRowUnified item={item} provided={provided} snapshot={snapshot} depth={2} />;
                    }
                    if (item.type === 'ligne_speciale') {
                      return <LigneSpecialeRow line={item} provided={provided} snapshot={snapshot} depth={depth} formatMontantEspace={formatMontantEspace} />;
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
    
    {/* Zone EN ATTENTE des lignes spéciales */}
    <PendingSpecialLines ... />
  </DragDropContext>
) : (
  // ANCIEN RENDU (code actuel)
  ...
)}
```

---

## ⚠️ **PROBLÈME**

Créer tous les composants Row serait long. 

## 💡 **SOLUTION ENCORE PLUS SIMPLE**

Injecter les lignes spéciales **directement dans le rendu actuel** en les affichant au bon endroit selon leur `index_global`.

Je vais implémenter cette solution maintenant.

