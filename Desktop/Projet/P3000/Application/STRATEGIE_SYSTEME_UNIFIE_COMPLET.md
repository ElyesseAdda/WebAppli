# 🎯 Stratégie Système Unifié Complet - Option 1

## 📋 **OBJECTIF**

Afficher **tous les éléments** (parties, sous-parties, lignes détails, lignes spéciales) dans **l'ordre de leur `index_global`**, de manière intercalée.

---

## 🔄 **APPROCHE**

### **Étape 1 : Convertir `selectedParties` en `devisItems`**

Au chargement ou à chaque modification, convertir la structure hiérarchique `selectedParties` en une liste plate avec `index_global` :

```javascript
// DevisAvance.js
useEffect(() => {
  if (selectedParties.length > 0) {
    const converted = convertSelectedPartiesToDevisItems(selectedParties);
    setDevisItems(converted);
  }
}, [selectedParties]);

const convertSelectedPartiesToDevisItems = (parties) => {
  const items = [];
  let globalIndex = 1;
  
  parties.forEach(partie => {
    // Ajouter la partie
    items.push({
      type: 'partie',
      id: partie.id,
      index_global: globalIndex++,
      ...partie
    });
    
    // Ajouter les sous-parties
    (partie.selectedSousParties || []).forEach(sp => {
      items.push({
        type: 'sous_partie',
        id: sp.id,
        index_global: globalIndex++,
        partie_id: partie.id,
        ...sp
      });
      
      // Ajouter les lignes détails
      (sp.selectedLignesDetails || []).forEach(ld => {
        items.push({
          type: 'ligne_detail',
          id: ld.id,
          index_global: globalIndex++,
          sous_partie_id: sp.id,
          ...ld
        });
      });
    });
  });
  
  return items;
};
```

---

### **Étape 2 : Fusionner avec les lignes spéciales**

Les lignes spéciales placées sont déjà dans `devisItems`, il suffit de **fusionner et trier** :

```javascript
const allItems = [...convertedItems, ...devisItems.filter(item => item.type === 'ligne_speciale')];
const sorted = allItems.sort((a, b) => a.index_global - b.index_global);
```

---

### **Étape 3 : Render unifié dans DevisTable**

Au lieu de rendre `selectedParties`, rendre directement `devisItems` :

```javascript
<DragDropContext onDragEnd={handleDragEndUnified}>
  <Droppable droppableId="unified-items">
    {(provided) => (
      <div ref={provided.innerRef} {...provided.droppableProps}>
        {devisItems.map((item, index) => (
          <Draggable key={`${item.type}_${item.id}`} draggableId={`${item.type}_${item.id}`} index={index}>
            {(provided, snapshot) => {
              const depth = getItemDepth(item, devisItems);
              
              switch (item.type) {
                case 'partie':
                  return <PartieRow partie={item} provided={provided} snapshot={snapshot} />;
                case 'sous_partie':
                  return <SousPartieRow sp={item} provided={provided} snapshot={snapshot} depth={1} />;
                case 'ligne_detail':
                  return <LigneDetailRow ligne={item} provided={provided} snapshot={snapshot} depth={2} />;
                case 'ligne_speciale':
                  return <LigneSpecialeRow line={item} provided={provided} snapshot={snapshot} depth={depth} />;
                default:
                  return null;
              }
            }}
          </Draggable>
        ))}
        {provided.placeholder}
      </div>
    )}
  </Droppable>
</DragDropContext>
```

---

### **Étape 4 : Calculer la profondeur dynamiquement**

Pour l'indentation, calculer la profondeur selon le contexte :

```javascript
const getItemDepth = (item, allItems) => {
  if (item.type === 'partie') return 0;
  if (item.type === 'sous_partie') return 1;
  if (item.type === 'ligne_detail') return 2;
  
  if (item.type === 'ligne_speciale') {
    // Trouver l'élément précédent
    const index = allItems.findIndex(i => i.id === item.id && i.type === item.type);
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
```

---

## 🚀 **PLAN D'IMPLÉMENTATION**

1. ✅ Créer `convertSelectedPartiesToDevisItems()` dans DevisAvance.js
2. ✅ Fusionner les items convertis avec les lignes spéciales
3. ✅ Créer les composants Row (PartieRow, SousPartieRow, LigneDetailRow)
4. ✅ Créer la fonction `getItemDepth()`
5. ✅ Remplacer le render actuel par le render unifié
6. ✅ Adapter `handleDragEndUnified` pour le nouvel ordre

---

## 💡 **AVANTAGE**

✅ Les lignes spéciales sont placées **exactement** où l'utilisateur les dépose  
✅ Tout est dans le même `Droppable`, pas de problème de contexte  
✅ Drag & drop fluide et intuitif  
✅ Numérotation hiérarchique automatique  

**Voulez-vous que je commence l'implémentation ?** 🚀

